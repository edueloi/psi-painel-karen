/** Monta o DocumentModel (PDF/pré-visualização) a partir de um modelo do emissor já com variáveis substituídas. */
import type { ClinicInfo, ProfessionalInfo, LogoImage } from '../Records/pdf/clinicalDocument';
import { signatureBox, type DocumentModel } from './renderDocumentPdf';
import type { SignatureImage } from './signatureImage';
import { fmtDateTimeBR } from '../Records/pdf/clinicalDocument';
import { htmlToBlocks, stripTrailingClosing, type DocBlock, type Run } from './htmlToBlocks';
import {
  amountToWords, formatMoney, longDatePt, monthNamePt, parseMoney, shortDatePt,
} from './documentVariables';

const TYPE_TITLES: Record<string, string> = {
  atestado: 'Atestado', declaracao: 'Declaração', encaminhamento: 'Encaminhamento', recibo: 'Recibo',
  prontuario: 'Evolução de Prontuário', ficha: 'Ficha de Anamnese', laudo: 'Laudo',
};

/** "Recibo (Valor)" -> "Recibo". Sem tipo conhecido usa o título do modelo (sem parênteses). */
export function documentTitle(templateTitle: string, docType?: string | null): string {
  const base = (templateTitle || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  if (base) return base;
  return TYPE_TITLES[(docType || '').toLowerCase()] || 'Documento';
}

/** Documentos em que o corpo já cita nome/CPF: não repete a tabela de identificação. */
const NO_IDENTIFICATION = new Set(['recibo', 'atestado', 'declaracao']);

export interface VariableInput {
  patientName: string; patientCpf?: string; patientAddress?: string; patientAge?: string | number;
  professionalName: string; professionalRegistry: string;
  docDate: Date; timeStart?: string; timeEnd?: string;
  amount?: string; amountText?: string; period?: string; serviceName?: string;
  city: string; state?: string; cityUf?: string;
  clinic: ClinicInfo;
  signatureName?: string; signatureRegistry?: string;
  extras?: Record<string, string>;
}

/** Valores de todas as variáveis conhecidas (chaves canônicas). Valor por extenso é calculado a partir do valor. */
export function buildVariableValues(i: VariableInput): Record<string, string> {
  const amountNum = parseMoney(i.amount);
  const amount = amountNum !== null ? formatMoney(amountNum) : (i.amount || '').trim();
  const amountText = (i.amountText || '').trim() || (amountNum !== null ? amountToWords(amountNum) : '');
  return {
    patient_name: (i.patientName || '').trim(),
    patient_cpf: (i.patientCpf || '').trim(),
    patient_address: (i.patientAddress || '').trim(),
    patient_age: i.patientAge !== undefined && i.patientAge !== null ? String(i.patientAge) : '',
    professional_name: (i.professionalName || '').trim(),
    professional_crp: (i.professionalRegistry || '').trim(),
    date: shortDatePt(i.docDate),
    date_long: longDatePt(i.docDate),
    time_start: (i.timeStart || '').trim(),
    time_end: (i.timeEnd || '').trim(),
    amount, amount_text: amountText,
    period: (i.period || '').trim(),
    service_name: (i.serviceName || '').trim(),
    city: (i.city || '').trim(),
    state: (i.state || '').trim(),
    city_uf: (i.cityUf || '').trim(),
    year: String(i.docDate.getFullYear()),
    month_name: monthNamePt(i.docDate),
    clinic_name: i.clinic.name || '',
    clinic_cnpj: i.clinic.cnpj || '',
    clinic_phone: i.clinic.phone || '',
    clinic_email: i.clinic.email || '',
    clinic_address: i.clinic.address || '',
    signature_name: (i.signatureName || i.professionalName || '').trim(),
    signature_crp: (i.signatureRegistry || i.professionalRegistry || '').trim(),
    ...(i.extras || {}),
  };
}

export interface BuildDocumentInput {
  title: string;
  docType?: string | null;
  /** HTML (ou texto) do corpo, JÁ com variáveis substituídas. */
  bodyHtml?: string;
  /** Alternativa ao HTML: blocos prontos. */
  blocks?: DocBlock[];
  clinic: ClinicInfo;
  professional: ProfessionalInfo;
  patient?: { name?: string; cpf?: string; birth?: string };
  identification?: { label: string; value: string; full?: boolean }[];
  identificationTitle?: string;
  subtitle?: string;
  docDate: Date;
  place?: string;
  emittedAt?: Date;
  signatureName?: string;
  signatureRegistry?: string;
  footerLogo?: LogoImage | null;
  /** Força mostrar/ocultar a tabela de identificação (padrão: depende do tipo). */
  showIdentification?: boolean;
  /** Assinatura eletrônica simples (imagem) a inserir acima da linha de assinatura. */
  signatureImage?: SignatureImage | null;
  signedAt?: Date | null;
}

export function buildDocumentModel(i: BuildDocumentInput): DocumentModel {
  const parsed = i.blocks ? i.blocks : htmlToBlocks(i.bodyHtml || '');
  // local/data e linha de assinatura do modelo são removidos: o gerador imprime ambos (sem duplicar)
  const { blocks } = i.blocks ? { blocks: parsed } : stripTrailingClosing(parsed);
  const type = (i.docType || '').toLowerCase();
  const show = i.showIdentification ?? !NO_IDENTIFICATION.has(type);
  let identification = i.identification;
  if (!identification) {
    identification = show && i.patient?.name ? [
      { label: 'Paciente', value: i.patient.name, full: !(i.patient.cpf || i.patient.birth) },
      ...(i.patient.cpf ? [{ label: 'CPF', value: i.patient.cpf }] : []),
      ...(i.patient.birth ? [{ label: 'Nascimento', value: i.patient.birth }] : []),
    ] : [];
  }
  return {
    title: documentTitle(i.title, i.docType),
    subtitle: i.subtitle,
    clinic: i.clinic, professional: i.professional,
    identification, identificationTitle: i.identificationTitle,
    blocks, place: i.place, docDate: i.docDate, emittedAt: i.emittedAt || new Date(),
    signature: { name: i.signatureName || undefined, registry: i.signatureRegistry || undefined },
    footerLogo: i.footerLogo || null,
    signatureImage: i.signatureImage || null,
    signedAt: i.signatureImage ? (i.signedAt || i.emittedAt || new Date()) : null,
  };
}

/** HTML autossuficiente (Times, sem cores) guardado no histórico/portal: corpo + local/data + assinatura. */
export function blocksToHtml(blocks: DocBlock[]): string {
  const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const runs = (rs: Run[]) => rs.map(r => {
    let t = esc(r.text).replace(/\n/g, '<br/>');
    if (r.u) t = `<u>${t}</u>`; if (r.i) t = `<em>${t}</em>`; if (r.b) t = `<strong>${t}</strong>`;
    return t;
  }).join('');
  return blocks.map(b => {
    if (b.t === 'spacer') return '<p>&nbsp;</p>';
    if (b.t === 'para') return `<p style="margin:0 0 6px;text-align:${b.align};">${runs(b.runs)}</p>`;
    if (b.t === 'heading') return `<p style="margin:8px 0 6px;font-weight:bold;text-align:${b.align};">${runs(b.runs)}</p>`;
    const tag = b.ordered ? 'ol' : 'ul';
    return `<${tag} style="margin:0 0 6px;padding-left:24px;list-style:${b.ordered ? 'decimal' : 'disc'};">${b.items.map(it => `<li>${runs(it)}</li>`).join('')}</${tag}>`;
  }).join('');
}

export function buildStoredHtml(model: DocumentModel): string {
  const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const bodyHtml = blocksToHtml(model.blocks);
  const sig = model.signature || {};
  const reg = sig && sig.registry !== undefined ? sig.registry : model.professional.registry;
  const place = model.place ? `${esc(model.place)}, ` : '';
  return `<div style="font-family:'Times New Roman',Times,serif;color:#141414;font-size:11pt;line-height:1.5;text-align:justify;">` +
    `<h2 style="text-align:center;font-size:15pt;margin:0 0 14px;">${esc(model.title.toUpperCase())}</h2>` +
    `<div>${bodyHtml}</div>` +
    `<p style="text-align:center;margin-top:28px;">${place}${esc(longDatePt(model.docDate))}.</p>` +
    `<div style="text-align:center;margin-top:36px;">` +
    (model.signatureImage ? (() => { const b = signatureBox(model.signatureImage); return `<img src="${model.signatureImage.dataUrl}" alt="Assinatura" style="display:block;margin:0 auto -4px;width:${Math.round(b.w * 3.78)}px;height:${Math.round(b.h * 3.78)}px;"/>`; })() : '') +
    `<div style="width:240px;border-top:1px solid #141414;margin:0 auto 6px;"></div>` +
    `<strong>${esc((sig && sig.name) || model.professional.name)}</strong>` +
    `${reg ? `<br/><span style="font-size:9.5pt;">${esc(reg)}</span>` : ''}` +
    `${model.professional.specialty ? `<br/><span style="font-size:9.5pt;">${esc(model.professional.specialty)}</span>` : ''}` +
    (model.signatureImage ? `<br/><span style="font-family:Helvetica,Arial,sans-serif;font-size:7.5pt;color:#5f5f5f;">Documento assinado eletronicamente por ${esc((sig && sig.name) || model.professional.name)} em ${esc(fmtDateTimeBR(model.signedAt || model.emittedAt))}</span>` : '') +
    `</div></div>`;
}
