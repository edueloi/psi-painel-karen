const PDFDocument = require('pdfkit');

function formatMoney(v) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
}

/**
 * Gera um PDF simples de representação da NFS-e (não é um DANFE — NFS-e não tem
 * documento auxiliar padronizado nesse formato; aqui é um recibo A4 legível com
 * os dados da nota, para o paciente imprimir/guardar).
 */
function generateNfsePdf({
  emitterName, emitterDocument, emitterAddress,
  tomadorNome, tomadorDocumento,
  numero, serie, environment,
  chaveAcesso, authorizedAt,
  descricaoServico, valorServico, aliquotaIss,
}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('Helvetica-Bold').fontSize(14).text('Nota Fiscal de Serviços Eletrônica (NFS-e)', { align: 'center' });
    doc.moveDown(0.3);
    if (environment !== 'producao') {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('red')
        .text('EMISSÃO EM AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL', { align: 'center' });
      doc.fillColor('black');
    }
    doc.moveDown();

    doc.font('Helvetica-Bold').fontSize(10).text('Prestador do serviço');
    doc.font('Helvetica').fontSize(10).text(emitterName || '');
    if (emitterDocument) doc.text(emitterDocument);
    if (emitterAddress) doc.text(emitterAddress);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Tomador do serviço');
    doc.font('Helvetica').text(tomadorNome || 'Consumidor final');
    if (tomadorDocumento) doc.text(tomadorDocumento);
    doc.moveDown();

    doc.font('Helvetica-Bold').text(`NFS-e nº ${numero}  Série ${serie}`);
    if (chaveAcesso) doc.font('Helvetica').text(`Chave de acesso: ${chaveAcesso}`);
    if (authorizedAt) doc.text(`Autorizada em: ${new Date(authorizedAt).toLocaleString('pt-BR')}`);
    doc.moveDown();

    doc.font('Helvetica-Bold').text('Discriminação do serviço');
    doc.font('Helvetica').text(descricaoServico || '');
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text(`Valor do serviço: ${formatMoney(valorServico)}`);
    if (aliquotaIss != null) doc.font('Helvetica').text(`Alíquota ISS: ${Number(aliquotaIss).toFixed(2)}%`);
    doc.moveDown(2);

    doc.fontSize(8).fillColor('gray').text(
      'Documento gerado a partir dos dados da DPS/NFS-e do Sistema Nacional NFS-e. Não substitui a consulta oficial pela chave de acesso.',
      { align: 'center' }
    );

    doc.end();
  });
}

module.exports = { generateNfsePdf };
