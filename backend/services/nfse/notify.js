const fs = require('fs');
const axios = require('axios');
const db = require('../../db');

const BOT_URL = 'http://127.0.0.1:3014/bot-api';

function nfsePublicUrl(invoice) {
  return invoice?.chave_acesso ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${encodeURIComponent(invoice.chave_acesso)}` : null;
}

// Envia a NFS-e recém-autorizada (emissão normal ou substituição) por WhatsApp
// automaticamente, sem depender de clique manual — espelha a mensagem da rota
// POST /:transactionId/send-whatsapp. Nunca lança: qualquer falha fica registrada em
// whatsapp_send_error para diagnóstico, e o botão manual na tela continua disponível
// para reenviar.
async function notificarNfseWhatsapp(tenantId, invoiceId) {
  try {
    const [[row]] = await db.query(
      `SELECT ni.*, COALESCE(p.whatsapp, p.phone) AS patient_whatsapp,
              COALESCE(p.name, ft.beneficiary_name, ft.payer_name) AS patient_name
         FROM nfse_invoices ni
         LEFT JOIN financial_transactions ft ON ft.id = ni.financial_transaction_id
         LEFT JOIN patients p ON p.tenant_id = ft.tenant_id
              AND (p.id = ft.patient_id OR (ft.patient_id IS NULL AND p.name = ft.payer_name))
        WHERE ni.id = ?`,
      [invoiceId]
    );
    if (!row) return;

    if (!row.patient_whatsapp) {
      await db.query('UPDATE nfse_invoices SET whatsapp_send_error = ? WHERE id = ?', ['Paciente sem WhatsApp cadastrado.', invoiceId]);
      return;
    }
    if (!row.nfse_pdf_path || !fs.existsSync(row.nfse_pdf_path)) {
      await db.query('UPDATE nfse_invoices SET whatsapp_send_error = ? WHERE id = ?', ['PDF da nota não disponível para envio automático.', invoiceId]);
      return;
    }

    const url = nfsePublicUrl(row);
    const message = `Olá, ${row.patient_name || ''}! Sua Nota Fiscal de Serviço${row.numero ? ` nº ${row.numero}` : ''} está disponível.${url ? `\n\nConsulte a nota oficial: ${url}` : ''}`.trim();

    const response = await axios.post(`${BOT_URL}/document/${tenantId}`, {
      phone: row.patient_whatsapp,
      filePath: row.nfse_pdf_path,
      fileName: `nota-fiscal-${row.chave_acesso || row.numero}.pdf`,
      caption: message,
    }, { timeout: 30000 });

    if (response.data?.success === false) throw new Error(response.data?.error || 'Falha no WhatsApp');

    await db.query('UPDATE nfse_invoices SET whatsapp_sent_at = UTC_TIMESTAMP(), whatsapp_send_error = NULL WHERE id = ?', [invoiceId]);
  } catch (err) {
    const message = err.response?.data?.error || err.message || 'Falha ao enviar por WhatsApp';
    console.error('[NFS-e] Erro ao notificar paciente por WhatsApp automaticamente:', message);
    try {
      await db.query('UPDATE nfse_invoices SET whatsapp_send_error = ? WHERE id = ?', [message, invoiceId]);
    } catch { /* melhor esforço -- não deixa o erro de log derrubar o fluxo de emissão */ }
  }
}

module.exports = { notificarNfseWhatsapp, nfsePublicUrl };
