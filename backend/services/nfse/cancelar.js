const db = require('../../db');
const { buildCancelamentoXml } = require('./eventoXmlBuilder');
const { loadPfx, assinarEvento } = require('./signer');
const { callNfseEventoRest } = require('./restClient');
const { decryptCertPassword } = require('./certCrypto');

const NFSE_TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 30000;

// Regra do Sistema Nacional NFS-e: cancelamento pelo emissor só é aceito até o dia 15
// do mês seguinte ao da autorização. Checamos isso ANTES de chamar a API porque o
// serviço do governo, quando rejeita por prazo vencido, não devolve uma mensagem de
// validação clara — só um erro genérico interno ("An error has occurred."), sem detalhe.
function prazoCancelamentoExpirado(authorizedAt) {
  const autorizado = new Date(authorizedAt);
  const prazo = new Date(autorizado.getFullYear(), autorizado.getMonth() + 1, 15, 23, 59, 59, 999);
  return { expirado: new Date() > prazo, prazo };
}

// Cancela uma NFS-e já autorizada junto ao Sistema Nacional NFS-e (evento e101101),
// espelhando o fluxo de emitirNfse: monta o XML do evento, assina com o certificado
// A1 do emissor e envia via mTLS. Só pode ser chamada para invoices com status
// 'authorized' e chave_acesso preenchida — validado pela rota antes de invocar.
async function cancelarNfse(invoiceId, motivo) {
  const [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [invoiceId]);
  if (!invoice) throw new Error('NFS-e não encontrada.');
  if (invoice.status !== 'authorized') throw new Error('Só é possível cancelar uma NFS-e autorizada.');
  if (!invoice.chave_acesso) throw new Error('NFS-e sem chave de acesso — não é possível cancelar.');

  if (invoice.authorized_at) {
    const { expirado, prazo } = prazoCancelamentoExpirado(invoice.authorized_at);
    if (expirado) {
      const prazoStr = prazo.toLocaleDateString('pt-BR');
      throw new Error(`O prazo para cancelar esta NFS-e pelo sistema (até ${prazoStr}) já expirou. Não é mais possível cancelar por aqui — consulte seu contador sobre nota de substituição/carta de correção ou entre em contato com a prefeitura.`);
    }
  }

  const [[emitter]] = await db.query('SELECT * FROM users WHERE id = ?', [invoice.user_id]);
  if (!emitter) throw new Error('Profissional emissor não encontrado.');
  if (!emitter.nfse_cert_path || !emitter.nfse_cert_password_enc) {
    throw new Error('Certificado digital A1 não configurado (Configurações > Dados Fiscais).');
  }

  const certPassword = decryptCertPassword(emitter.nfse_cert_password_enc);
  const environment = emitter.nfse_environment === 'producao' ? 'producao' : 'homologacao';

  const { xml, idPedido } = buildCancelamentoXml({
    emitter,
    chaveAcesso: invoice.chave_acesso,
    motivo,
  });

  const cert = loadPfx(emitter.nfse_cert_path, certPassword);
  const signedXml = assinarEvento(xml, idPedido, cert);

  const result = await callNfseEventoRest({
    environment,
    chaveAcesso: invoice.chave_acesso,
    signedXml,
    pfxPath: emitter.nfse_cert_path,
    pfxPassword: certPassword,
    timeoutMs: NFSE_TIMEOUT_MS,
  });

  if (!result.ok) {
    const data = result.data || {};
    const erros = Array.isArray(data.erros) ? data.erros : [];
    const primeiro = erros[0];
    const descricao = primeiro?.Descricao ?? primeiro?.descricao;
    const complemento = primeiro?.Complemento ?? primeiro?.complemento;
    console.error(`[NFS-e] Falha ao registrar evento de cancelamento (chave ${invoice.chave_acesso}): status=${result.statusCode} raw=${result.raw}`);

    let mensagem;
    if (descricao) {
      mensagem = [descricao, complemento].filter(Boolean).join(' — ');
    } else if (!result.error && data.message === 'An error has occurred.') {
      // O Sistema Nacional NFS-e devolve esse fallback genérico (sem detalhar o motivo real)
      // quando o pedido de evento é rejeitado internamente. Já validamos o prazo antes de
      // chegar aqui, então essa mensagem é um erro do lado do governo mesmo, sem detalhe
      // disponível -- ficam registrados status/raw acima nos logs para investigação.
      mensagem = 'O Sistema Nacional NFS-e recusou o cancelamento sem detalhar o motivo. Tente novamente em alguns minutos; se persistir, contate o suporte com o número desta nota.';
    } else {
      mensagem = result.error || result.raw || 'Falha na comunicação com o Sistema Nacional NFS-e';
    }
    throw new Error(mensagem);
  }

  await db.query(
    "UPDATE nfse_invoices SET status = 'cancelled', cancel_reason = ?, cancelled_at = UTC_TIMESTAMP() WHERE id = ?",
    [motivo || null, invoiceId]
  );

  return true;
}

module.exports = { cancelarNfse };
