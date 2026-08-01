const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const LOGO_PATH = path.join(__dirname, '..', '..', 'public', 'images', 'logo-psiflux.png');

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
 * é um recibo interno para o tenant guardar/prestar contas).
 */
async function generateReceiptPdf(invoice) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 80;
    const colorPrimary = '#5b21b6';
    const colorPrimaryLight = '#f5f3ff';
    const colorText = '#1e293b';
    const colorMuted = '#64748b';
    const colorBorder = '#e2e8f0';
    const colorSuccess = '#059669';
    const colorSuccessLight = '#ecfdf5';

    const paidDate = invoice.paid_at ? new Date(invoice.paid_at) : null;
    const dateStr = paidDate ? paidDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }) : '—';
    const timeStr = paidDate ? paidDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—';
    const receiptCode = `PSI-${String(invoice.id).padStart(6, '0')}`;

    // ── Cabeçalho: logo + identificação da plataforma ─────────────────────
    const headerTop = doc.y;
    let textX = 40;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 40, headerTop, { fit: [56, 56] });
      textX = 40 + 56 + 14;
    }
    doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(17).text('PsiFlux', textX, headerTop + 4);
    doc.fillColor(colorMuted).font('Helvetica').fontSize(8.5).text('Onde o seu consultório flui', textX, doc.y + 1);

    // Badge no canto direito
    const badgeW = 170;
    const badgeX = doc.page.width - 40 - badgeW;
    doc.roundedRect(badgeX, headerTop, badgeW, 56, 8).fillAndStroke(colorSuccessLight, colorBorder);
    // Círculo com check desenhado (evita depender de glyph unicode ausente na fonte)
    const dotCx = badgeX + 16, dotCy = headerTop + 18, dotR = 6;
    doc.circle(dotCx, dotCy, dotR).fill(colorSuccess);
    doc.save();
    doc.strokeColor('#ffffff').lineWidth(1.4).lineJoin('round').lineCap('round');
    doc.moveTo(dotCx - 2.6, dotCy + 0.2).lineTo(dotCx - 0.6, dotCy + 2.4).lineTo(dotCx + 2.8, dotCy - 2.6).stroke();
    doc.restore();
    doc.fillColor(colorSuccess).font('Helvetica-Bold').fontSize(9)
      .text('PAGAMENTO CONFIRMADO', dotCx + 10, headerTop + 13, { width: badgeW - 26 });
    doc.fillColor(colorMuted).font('Helvetica').fontSize(7.5)
      .text(`Comprovante ${receiptCode}`, badgeX, headerTop + 32, { width: badgeW, align: 'center' });

    doc.y = headerTop + 68;
    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).lineWidth(1.5).strokeColor(colorPrimary).stroke();
    doc.moveDown(1);

    function sectionTitle(label) {
      doc.moveDown(0.5);
      const y = doc.y;
      doc.rect(40, y, 3, 12).fill(colorPrimary);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colorPrimary)
        .text(label.toUpperCase(), 48, y, { characterSpacing: 0.5 });
      doc.moveDown(0.4);
      doc.fillColor(colorText);
    }

    function fieldRow(fields) {
      const colWidth = pageWidth / fields.length;
      const y = doc.y;
      fields.forEach((f, i) => {
        const x = 40 + i * colWidth;
        doc.font('Helvetica').fontSize(7).fillColor(colorMuted).text(f.label.toUpperCase(), x, y, { width: colWidth - 10, characterSpacing: 0.3 });
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(colorText).text(f.value || '—', x, doc.y + 1, { width: colWidth - 10 });
      });
      doc.moveDown(0.9);
    }

    // ── Clínica / assinante ────────────────────────────────────────────────
    sectionTitle('Assinante');
    fieldRow([
      { label: 'Clínica', value: invoice.tenant_name },
      { label: 'CNPJ/CPF', value: invoice.tenant_document ? formatCpfCnpj(invoice.tenant_document) : 'Não informado' },
    ]);

    // ── Detalhes do plano ──────────────────────────────────────────────────
    sectionTitle('Plano assinado');
    fieldRow([
      { label: 'Plano', value: invoice.plan_name || '—' },
      { label: 'Periodicidade', value: invoice.period === 'annual' ? 'Anual' : 'Mensal' },
    ]);

    // ── Detalhes do pagamento: dia, horário, método ────────────────────────
    sectionTitle('Detalhes do pagamento');
    fieldRow([
      { label: 'Data', value: dateStr },
      { label: 'Horário', value: timeStr },
    ]);
    fieldRow([
      { label: 'Método', value: invoice.method === 'pix' ? 'Pix' : invoice.method === 'card' ? 'Cartão de crédito' : 'Não informado' },
      { label: 'ID da transação (Mercado Pago)', value: invoice.mp_payment_id || '—' },
    ]);

    // ── Valor em destaque ────────────────────────────────────────────────
    doc.moveDown(0.3);
    const boxY = doc.y;
    const boxH = 56;
    doc.roundedRect(40, boxY, pageWidth, boxH, 8).fillAndStroke(colorPrimaryLight, colorBorder);
    doc.font('Helvetica').fontSize(8).fillColor(colorMuted).text('VALOR PAGO', 40 + 18, boxY + 12, { characterSpacing: 0.3 });
    doc.font('Helvetica-Bold').fontSize(24).fillColor(colorPrimary).text(formatMoney(invoice.amount), 40 + 18, boxY + 24);
    doc.y = boxY + boxH + 14;

    // ── Rodapé ─────────────────────────────────────────────────────────────
    const footerY = doc.y;
    doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY).strokeColor(colorBorder).lineWidth(1).stroke();
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(colorMuted)
      .text('Este documento é um comprovante interno de pagamento da assinatura da plataforma PsiFlux — não é uma nota fiscal e não possui valor fiscal.',
        40, footerY + 10, { width: pageWidth, align: 'center' });
    doc.font('Helvetica').fontSize(7).fillColor(colorMuted)
      .text('suporte@psiflux.com.br · psiflux.com.br', 40, doc.y + 4, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

module.exports = { generateReceiptPdf };
