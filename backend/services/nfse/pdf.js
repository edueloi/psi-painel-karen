const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');

function formatMoney(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

function formatCpfCnpj(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return v || '';
}

function formatPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return v || '';
}

/**
 * Gera o PDF de representação da NFS-e (não é um DANFE — NFS-e não tem documento
 * auxiliar padronizado nesse formato; aqui é um documento A4 completo com os dados
 * da nota, logo da clínica, QR Code e código de barras da chave de acesso, para o
 * paciente/prestador imprimir ou guardar).
 */
async function generateNfsePdf({
  logoBuffer,
  emitterName, emitterDisplayName, emitterDocument, emitterIM, emitterRegime,
  emitterAddress, emitterEmail, emitterPhone,
  tomadorNome, tomadorDocumento, tomadorEndereco,
  numero, serie, environment,
  chaveAcesso, authorizedAt, codigoVerificacao,
  codigoTributacao, descricaoTributacao,
  descricaoServico, valorServico, aliquotaIss, valorIss,
  substitutedChaveAcesso, substitutionReason,
}) {
  // O QR code aponta para a consulta pública oficial já com a chave preenchida —
  // um texto solto com a chave não abre nada ao ser escaneado pela câmera do celular.
  // URL no padrão da NT 008/2026 do Sistema Nacional NFS-e (ConsultaPublica?tpc=1&chave=...).
  const qrUrl = chaveAcesso
    ? `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${chaveAcesso}`
    : 'https://www.nfse.gov.br/consultapublica';
  const qrPng = await QRCode.toBuffer(qrUrl, { margin: 1, scale: 6 });
  const barcodePng = await bwipjs.toBuffer({
    bcid: 'code128',
    text: chaveAcesso || '00000000000000000000000000000000000000000000000',
    scale: 2,
    height: 12,
    includetext: false,
  });

  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 72;
    // Paleta na cor de marca do PsiFlux (mesmo verde do logo/tema padrão), no lugar
    // do roxo genérico usado antes.
    const colorPrimary = '#0f6e46';      // --c-600
    const colorPrimaryLight = '#ecfdf5'; // --c-50
    const colorPrimaryBorder = '#a3e8c4'; // --c-200
    const colorText = '#1e293b';   // slate-800
    const colorMuted = '#64748b';  // slate-500
    const colorBorder = '#e2e8f0'; // slate-200
    const colorSoftBg = '#f8fafc'; // slate-50

    // ── Cabeçalho ──────────────────────────────────────────────────────────
    const headerTop = doc.y;
    const headerName = emitterDisplayName || emitterName;
    if (logoBuffer) {
      doc.image(logoBuffer, 36, headerTop, { fit: [64, 64] });
    } else {
      doc.roundedRect(36, headerTop, 64, 64, 8).fill(colorPrimaryLight);
      doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(22)
        .text((headerName || '?').charAt(0).toUpperCase(), 36, headerTop + 18, { width: 64, align: 'center' });
    }

    const textX = 36 + 64 + 14;
    const textWidth = pageWidth - 64 - 14 - 170;
    doc.fillColor(colorText).font('Helvetica-Bold').fontSize(13)
      .text(headerName || '', textX, headerTop, { width: textWidth });
    doc.font('Helvetica').fontSize(8.5).fillColor(colorMuted);
    doc.text(`CNPJ/CPF: ${formatCpfCnpj(emitterDocument)}${emitterIM ? `   IM: ${emitterIM}` : ''}`, textX, doc.y + 2, { width: textWidth });
    if (emitterAddress) doc.text(emitterAddress, textX, doc.y + 1, { width: textWidth });
    const contactLine = [emitterPhone ? formatPhone(emitterPhone) : null, emitterEmail].filter(Boolean).join('   ');
    if (contactLine) doc.text(contactLine, textX, doc.y + 1, { width: textWidth });

    // Badge no canto direito
    const badgeX = doc.page.width - 36 - 160;
    doc.roundedRect(badgeX, headerTop, 160, 64, 8).fillAndStroke(colorPrimaryLight, colorPrimaryBorder);
    doc.fillColor(colorPrimary).font('Helvetica-Bold').fontSize(9)
      .text('NFS-e', badgeX, headerTop + 10, { width: 160, align: 'center' });
    doc.fontSize(7.5).font('Helvetica').fillColor(colorMuted)
      .text('Nota Fiscal de Serviço Eletrônica', badgeX, doc.y + 1, { width: 160, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(11).fillColor(colorText)
      .text(`Nº ${numero}  •  Série ${serie}`, badgeX, headerTop + 38, { width: 160, align: 'center' });
    if (environment !== 'producao') {
      doc.font('Helvetica-Bold').fontSize(7).fillColor('#b45309')
        .text('HOMOLOGAÇÃO — SEM VALOR FISCAL', badgeX, headerTop + 52, { width: 160, align: 'center' });
    }

    doc.y = headerTop + 70;
    doc.moveTo(36, doc.y).lineTo(doc.page.width - 36, doc.y).lineWidth(1.5).strokeColor(colorPrimary).stroke();
    doc.moveDown(0.5);

    function sectionTitle(label) {
      doc.moveDown(0.45);
      const y = doc.y;
      doc.rect(36, y, 3, 11).fill(colorPrimary);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colorPrimary)
        .text(label.toUpperCase(), 44, y, { characterSpacing: 0.5 });
      doc.moveDown(0.22);
      doc.fillColor(colorText);
    }

    // Cartão genérico usado por toda a nota (Prestador, Tomador, Identificação etc.):
    // mede a altura de cada linha antes de desenhar (linhas de texto longo, como
    // razão social/endereço, podem quebrar em várias linhas) para a caixa nunca
    // ficar cortada nem sobrando espaço em branco.
    const cardPad = 9;
    function drawCard(lines) {
      const contentWidth = pageWidth - cardPad * 2;
      const measured = lines.map(line => {
        if (line.type === 'text') {
          doc.font('Helvetica-Bold').fontSize(9.5);
          const h = doc.heightOfString(line.value || '—', { width: contentWidth, lineGap: 1 }) + 9;
          return { ...line, height: h };
        }
        return { ...line, height: 21 };
      });
      const contentH = measured.reduce((s, l) => s + l.height, 0) + (measured.length - 1) * 4;
      const boxH = contentH + cardPad * 2;

      const y0 = doc.y;
      doc.roundedRect(36, y0, pageWidth, boxH, 8).fillAndStroke(colorSoftBg, colorBorder);

      let cy = y0 + cardPad;
      measured.forEach(line => {
        if (line.type === 'text') {
          doc.font('Helvetica').fontSize(7).fillColor(colorMuted).text(line.label.toUpperCase(), 36 + cardPad, cy, { characterSpacing: 0.3 });
          doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colorText)
            .text(line.value || '—', 36 + cardPad, cy + 9, { width: contentWidth, lineGap: 1 });
        } else {
          const colWidth = contentWidth / line.fields.length;
          line.fields.forEach((f, i) => {
            const x = 36 + cardPad + i * colWidth;
            doc.font('Helvetica').fontSize(7).fillColor(colorMuted).text(f.label.toUpperCase(), x, cy, { width: colWidth - 10, characterSpacing: 0.3 });
            doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colorText).text(f.value || '—', x, cy + 9, { width: colWidth - 10 });
          });
        }
        cy += line.height + 4;
      });

      doc.y = y0 + boxH + 7;
    }

    // ── Prestador ──────────────────────────────────────────────────────────
    sectionTitle('Prestador do serviço');
    drawCard([
      { type: 'text', label: 'Razão social', value: emitterName },
      { type: 'row', fields: [
        { label: 'CNPJ/CPF', value: formatCpfCnpj(emitterDocument) },
        { label: 'Inscrição municipal', value: emitterIM || 'Não informada' },
        { label: 'Regime tributário', value: emitterRegime },
      ] },
      ...(emitterAddress ? [{ type: 'text', label: 'Endereço', value: emitterAddress }] : []),
    ]);

    // ── Tomador ────────────────────────────────────────────────────────────
    sectionTitle('Tomador do serviço');
    drawCard([
      { type: 'text', label: 'Nome / Razão social', value: tomadorNome || 'Consumidor final' },
      { type: 'row', fields: [
        { label: 'CPF/CNPJ', value: tomadorDocumento ? formatCpfCnpj(tomadorDocumento) : 'Não informado' },
      ] },
      ...(tomadorEndereco ? [{ type: 'text', label: 'Endereço', value: tomadorEndereco }] : []),
    ]);

    // ── Discriminação do serviço ───────────────────────────────────────────
    sectionTitle('Discriminação do serviço');
    drawCard([
      { type: 'text', label: 'Código de tributação (LC 116/03)', value: `${codigoTributacao}${descricaoTributacao ? ` — ${descricaoTributacao}` : ''}` },
      { type: 'text', label: 'Descrição', value: (descricaoServico || '').trim() },
    ]);

    // ── Valores ────────────────────────────────────────────────────────────
    sectionTitle('Valores');
    const boxPad = 14;
    const valCols = [
      { label: 'Valor do serviço', value: formatMoney(valorServico), emphasis: true },
      { label: 'Alíquota ISS', value: aliquotaIss != null ? `${Number(aliquotaIss).toFixed(2)}%` : 'Simples Nacional' },
      { label: 'Valor aprox. ISS', value: valorIss != null ? formatMoney(valorIss) : '—' },
    ];
    const vw = pageWidth / valCols.length;
    const valColWidth = vw - boxPad * 2;

    // Encolhe a fonte até caber numa linha só (em vez de tamanho fixo, que fazia um
    // valor curto tipo "R$ 250,00" e um texto longo tipo "Apurado pelo Simples
    // Nacional" saírem do mesmo tamanho gigante e quebrarem em várias linhas).
    function fitFontSize(text, maxWidth, max, min) {
      let size = max;
      doc.font('Helvetica-Bold');
      while (size > min && doc.fontSize(size).widthOfString(text) > maxWidth) size -= 0.5;
      return size;
    }
    const valSizes = valCols.map(v => fitFontSize(String(v.value), valColWidth, v.emphasis ? 15 : 12, 8));
    const boxH = 48;

    const boxY = doc.y;
    doc.roundedRect(36, boxY, pageWidth, boxH, 8).fillAndStroke(colorSoftBg, colorBorder);
    valCols.forEach((v, i) => {
      const x = 36 + i * vw;
      doc.font('Helvetica').fontSize(7.5).fillColor(colorMuted).text(v.label.toUpperCase(), x + boxPad, boxY + 9, { width: valColWidth, characterSpacing: 0.3 });
      doc.font('Helvetica-Bold').fontSize(valSizes[i]).fillColor(v.emphasis ? colorPrimary : colorText)
        .text(v.value, x + boxPad, boxY + 24, { width: valColWidth, lineBreak: false });
    });
    doc.y = boxY + boxH + 7;

    // ── Identificação da NFS-e ─────────────────────────────────────────────
    sectionTitle('Identificação da NFS-e');
    drawCard([
      { type: 'row', fields: [
        { label: 'Data/hora de autorização', value: authorizedAt ? new Date(authorizedAt).toLocaleString('pt-BR') : '—' },
        { label: 'Código de verificação', value: codigoVerificacao || '—' },
      ] },
      { type: 'text', label: 'Chave de acesso', value: chaveAcesso || '' },
    ]);

    // ── Substituição (só aparece quando esta NFS-e substitui outra já autorizada) ──
    if (substitutedChaveAcesso) {
      sectionTitle('Substituição de NFS-e');
      const substBoxY = doc.y;
      const substBoxH = substitutionReason ? 40 : 28;
      doc.roundedRect(36, substBoxY, pageWidth, substBoxH, 8).fillAndStroke('#fffbeb', '#fde68a');
      doc.font('Helvetica').fontSize(7).fillColor('#92400e').text('NFS-E SUBSTITUÍDA (CHAVE DE ACESSO)', 36 + 12, substBoxY + 7, { width: pageWidth - 24, characterSpacing: 0.3 });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(colorText).text(substitutedChaveAcesso, 36 + 12, doc.y + 1, { width: pageWidth - 24 });
      if (substitutionReason) {
        doc.font('Helvetica').fontSize(7).fillColor('#92400e').text('MOTIVO DA SUBSTITUIÇÃO', 36 + 12, doc.y + 4, { characterSpacing: 0.3 });
        doc.font('Helvetica-Bold').fontSize(9).fillColor(colorText).text(substitutionReason, 36 + 12, doc.y + 1, { width: pageWidth - 24 });
      }
      doc.y = substBoxY + substBoxH + 7;
    }

    // ── Rodapé: QR Code + código de barras ─────────────────────────────────
    const footerY = doc.y + 4;
    doc.moveTo(36, footerY).lineTo(doc.page.width - 36, footerY).strokeColor(colorBorder).lineWidth(1).stroke();

    const qrSize = 70;
    doc.image(qrPng, 36, footerY + 10, { width: qrSize, height: qrSize });

    const barcodeX = 36 + qrSize + 16;
    const barcodeWidth = pageWidth - qrSize - 16;
    doc.image(barcodePng, barcodeX, footerY + 20, { width: barcodeWidth, height: 28 });
    doc.font('Helvetica').fontSize(6.5).fillColor(colorMuted)
      .text(chaveAcesso || '', barcodeX, footerY + 50, { width: barcodeWidth, align: 'center' });

    doc.font('Helvetica').fontSize(7).fillColor(colorMuted)
      .text('Consulte a autenticidade desta NFS-e no portal do Sistema Nacional NFS-e (nfse.gov.br) utilizando a chave de acesso acima.',
        barcodeX, footerY + 60, { width: barcodeWidth });

    doc.font('Helvetica-Oblique').fontSize(6.5).fillColor(colorMuted)
      .text('Documento gerado a partir dos dados da DPS/NFS-e do Sistema Nacional NFS-e. Não substitui a consulta oficial pela chave de acesso.',
        36, doc.page.height - 50, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

module.exports = { generateNfsePdf };
