const PDFDocument = require('pdfkit');

function formatMoney(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function formatCpfCnpj(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v || '';
}

/**
 * Comprovante de pagamento de assinatura da plataforma (não é nota fiscal —
 * é só um recibo interno para o tenant guardar/prestar contas).
 */
async function generateReceiptPdf(invoice) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 96;
    const colorPrimary = '#5b21b6';
    const colorText = '#1e293b';
    const colorMuted = '#64748b';
    const colorBorder = '#e2e8f0';

    doc.font('Helvetica-Bold').fontSize(18).fillColor(colorPrimary).text('PsiFlux', 48, 48);
    doc.font('Helvetica').fontSize(9).fillColor(colorMuted).text('Comprovante de pagamento de assinatura', 48, doc.y + 2);

    doc.moveTo(48, doc.y + 14).lineTo(doc.page.width - 48, doc.y + 14).strokeColor(colorBorder).lineWidth(1).stroke();
    doc.moveDown(1.5);

    doc.font('Helvetica-Bold').fontSize(13).fillColor(colorText).text('Pagamento confirmado', 48, doc.y);
    doc.moveDown(0.8);

    function row(label, value) {
      const y = doc.y;
      doc.font('Helvetica').fontSize(8).fillColor(colorMuted).text(label.toUpperCase(), 48, y, { characterSpacing: 0.3 });
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colorText).text(value || '—', 48, doc.y + 2, { width: pageWidth });
      doc.moveDown(0.7);
    }

    row('Clínica', invoice.tenant_name);
    if (invoice.tenant_document) row('CNPJ/CPF', formatCpfCnpj(invoice.tenant_document));
    row('Plano', `${invoice.plan_name || '—'} (${invoice.period === 'annual' ? 'Anual' : 'Mensal'})`);
    row('Método de pagamento', invoice.method === 'pix' ? 'Pix' : invoice.method === 'card' ? 'Cartão de crédito' : '—');
    row('Data do pagamento', invoice.paid_at ? new Date(invoice.paid_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
    if (invoice.mp_payment_id) row('ID da transação (Mercado Pago)', invoice.mp_payment_id);

    doc.moveDown(0.5);
    const boxY = doc.y;
    doc.roundedRect(48, boxY, pageWidth, 60, 8).fillAndStroke('#f5f3ff', colorBorder);
    doc.font('Helvetica').fontSize(8).fillColor(colorMuted).text('VALOR PAGO', 48 + 16, boxY + 14, { characterSpacing: 0.3 });
    doc.font('Helvetica-Bold').fontSize(22).fillColor(colorPrimary).text(formatMoney(invoice.amount), 48 + 16, boxY + 26);
    doc.y = boxY + 76;

    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(colorMuted)
      .text('Este documento é um comprovante interno de pagamento da assinatura da plataforma PsiFlux — não é uma nota fiscal.',
        48, doc.page.height - 70, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

module.exports = { generateReceiptPdf };
