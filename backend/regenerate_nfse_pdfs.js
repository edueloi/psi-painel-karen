// Regenera o PDF (documento auxiliar) das NFS-e já autorizadas, lendo o XML oficial
// já salvo em disco — não reemite nada no Sistema Nacional, só corrige a
// representação em PDF (ex: alíquota do Simples Nacional que saía fixa em 5%
// antes do fix em emitir.js). Rodar uma vez após o deploy do fix.
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { generateNfsePdf } = require('./services/nfse/pdf');

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1] : null;
}

function titleCase(v) {
  if (!v) return v;
  return v.toLowerCase().replace(/\b([a-zà-ú])/gi, (c) => c.toUpperCase())
    .replace(/\b(Ltda|Me|Epp|Sp|Rj|Mg|Pr|Rs|Sc|Ba|Pe|Ce|Go|Df|Es)\b/gi, (m) => m.toUpperCase());
}

function extractEnderecoFromNfseXml(nfseXml) {
  const xLgr = extractTag(nfseXml, 'xLgr');
  if (!xLgr) return null;
  const nro = extractTag(nfseXml, 'nro');
  const xBairro = extractTag(nfseXml, 'xBairro');
  const uf = extractTag(nfseXml, 'UF');
  const cep = extractTag(nfseXml, 'CEP');
  const xLocEmi = extractTag(nfseXml, 'xLocEmi');
  const cepFmt = cep ? cep.replace(/(\d{5})(\d{3})/, '$1-$2') : null;
  return [
    [xLgr, nro].filter(Boolean).join(', '),
    xBairro,
    [xLocEmi, uf].filter(Boolean).join('/'),
    cepFmt ? `CEP ${cepFmt}` : null,
  ].filter(Boolean).join(' — ');
}

// Mesma resolução de tomador usada na emissão original (payer > beneficiary > paciente)
async function resolveTomador(transaction) {
  if (transaction.payer_name || transaction.payer_cpf) {
    return { nome: transaction.payer_name, cpf: transaction.payer_cpf };
  }
  if (transaction.beneficiary_name || transaction.beneficiary_cpf) {
    return { nome: transaction.beneficiary_name, cpf: transaction.beneficiary_cpf };
  }
  if (transaction.patient_id) {
    const [[patient]] = await db.query(
      'SELECT name, cpf, is_payer, payer_name, payer_cpf FROM patients WHERE id = ?',
      [transaction.patient_id]
    );
    if (patient) {
      if (!patient.is_payer && (patient.payer_name || patient.payer_cpf)) {
        return { nome: patient.payer_name, cpf: patient.payer_cpf };
      }
      return { nome: patient.name, cpf: patient.cpf };
    }
  }
  return null;
}

async function run() {
  const [invoices] = await db.query(
    `SELECT * FROM nfse_invoices WHERE status = 'authorized' AND nfse_xml_path IS NOT NULL AND nfse_pdf_path IS NOT NULL`
  );

  console.log(`Encontradas ${invoices.length} NFS-e autorizadas para regenerar o PDF.`);

  let ok = 0, skip = 0, fail = 0;

  for (const invoice of invoices) {
    try {
      if (!fs.existsSync(invoice.nfse_xml_path)) {
        console.log(`[skip] invoice ${invoice.id}: XML não encontrado em ${invoice.nfse_xml_path}`);
        skip++;
        continue;
      }
      const nfseXml = fs.readFileSync(invoice.nfse_xml_path, 'utf-8');

      const [[emitter]] = await db.query('SELECT * FROM users WHERE id = ?', [invoice.user_id]);
      if (!emitter) { console.log(`[skip] invoice ${invoice.id}: emissor não encontrado`); skip++; continue; }

      const [[transaction]] = await db.query('SELECT * FROM financial_transactions WHERE id = ?', [invoice.financial_transaction_id]);
      if (!transaction) { console.log(`[skip] invoice ${invoice.id}: lançamento não encontrado`); skip++; continue; }

      const tomador = await resolveTomador(transaction);

      let logoBuffer = null;
      if (emitter.clinic_logo_url) {
        try {
          const logoPath = path.join(__dirname, 'public', emitter.clinic_logo_url.replace('/uploads-static/', 'uploads/'));
          if (fs.existsSync(logoPath)) logoBuffer = fs.readFileSync(logoPath);
        } catch { /* segue sem logo */ }
      }

      const xTribNac = extractTag(nfseXml, 'xTribNac');
      const codigoVerificacao = extractTag(nfseXml, 'nDFSe');
      const emitterEnderecoNfse = extractEnderecoFromNfseXml(nfseXml);

      const pdfBuffer = await generateNfsePdf({
        logoBuffer,
        emitterName: emitter.nfse_razao_social || emitter.company_name || emitter.name,
        emitterDocument: emitter.cnpj || emitter.cpf || '',
        emitterIM: emitter.nfse_inscricao_municipal || null,
        emitterRegime: emitter.nfse_regime_tributario === 'simples_nacional' ? 'Simples Nacional (ME/EPP)' : 'Não optante do Simples Nacional',
        emitterAddress: emitterEnderecoNfse ? titleCase(emitterEnderecoNfse) : (emitter.address || ''),
        emitterEmail: emitter.email || null,
        emitterPhone: emitter.whatsapp || emitter.phone || null,
        tomadorNome: tomador?.nome,
        tomadorDocumento: tomador?.cpf || tomador?.cnpj,
        numero: invoice.numero,
        serie: invoice.serie,
        environment: invoice.environment,
        chaveAcesso: invoice.chave_acesso,
        authorizedAt: invoice.authorized_at,
        codigoVerificacao,
        codigoTributacao: invoice.codigo_tributacao_nacional,
        descricaoTributacao: xTribNac ? xTribNac.replace(/\.$/, '') : null,
        descricaoServico: invoice.descricao_servico,
        valorServico: Number(invoice.valor_servico),
        aliquotaIss: emitter.nfse_regime_tributario === 'simples_nacional' ? null : (extractTag(nfseXml, 'pAliq') ? Number(extractTag(nfseXml, 'pAliq')) : 5),
        valorIss: null,
      });

      fs.writeFileSync(invoice.nfse_pdf_path, pdfBuffer);
      console.log(`[ok] invoice ${invoice.id} (nº ${invoice.numero}) regenerado`);
      ok++;
    } catch (e) {
      console.error(`[fail] invoice ${invoice.id}:`, e.message);
      fail++;
    }
  }

  console.log(`\nConcluído. ok=${ok} skip=${skip} fail=${fail}`);
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
