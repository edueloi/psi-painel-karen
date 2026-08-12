const db = require('../../db');
const { buildCancelamentoXml } = require('./eventoXmlBuilder');
const { loadPfx, assinarEvento } = require('./signer');
const { callNfseEventoRest } = require('./restClient');
const { decryptCertPassword } = require('./certCrypto');

const NFSE_TIMEOUT_MS = Number(process.env.NFSE_TIMEOUT_MS) || 30000;

// Cancela uma NFS-e já autorizada junto ao Sistema Nacional NFS-e (evento e101101),
// espelhando o fluxo de emitirNfse: monta o XML do evento, assina com o certificado
// A1 do emissor e envia via mTLS. Só pode ser chamada para invoices com status
// 'authorized' e chave_acesso preenchida — validado pela rota antes de invocar.
async function cancelarNfse(invoiceId, motivo) {
  const [[invoice]] = await db.query('SELECT * FROM nfse_invoices WHERE id = ?', [invoiceId]);
  if (!invoice) throw new Error('NFS-e não encontrada.');
  if (invoice.status !== 'authorized') throw new Error('Só é possível cancelar uma NFS-e autorizada.');
  if (!invoice.chave_acesso) throw new Error('NFS-e sem chave de acesso — não é possível cancelar.');

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
    const mensagem = descricao
      ? [descricao, complemento].filter(Boolean).join(' — ')
      : (result.error || result.raw || 'Falha na comunicação com o Sistema Nacional NFS-e');
    throw new Error(mensagem);
  }

  await db.query(
    "UPDATE nfse_invoices SET status = 'cancelled', cancel_reason = ?, cancelled_at = UTC_TIMESTAMP() WHERE id = ?",
    [motivo || null, invoiceId]
  );

  return true;
}

module.exports = { cancelarNfse };
