/** PDF dos modais de documento do prontuário (Relatório, Encaminhamento, Atestado) na estrutura padrão. */
import { fetchIdentity, buildIdentity, withRegistryLabel } from './clinicIdentity';
import { buildDocumentModel } from './buildDocument';
import { renderDocumentPdf, pdfFileName } from './renderDocumentPdf';
import { textToBlocks, type DocBlock } from './htmlToBlocks';
import { parseIsoDate } from './documentVariables';

export interface ModalPdfProfessional { name?: string; crp?: string; specialty?: string; address?: string; phone?: string; companyName?: string }

export interface ModalPdfSpec {
  title: string;
  docType: string;
  patient: { full_name: string; cpf?: string; birth_date?: string };
  /** Data do documento (yyyy-mm-dd). */
  date: string;
  professional?: ModalPdfProfessional;
  identification?: { label: string; value: string; full?: boolean }[];
  blocks: DocBlock[];
}

export const sectionBlocks = (heading: string, text: string): DocBlock[] =>
  text.trim() ? [{ t: 'heading', runs: [{ text: heading }], align: 'left' }, ...textToBlocks(text)] : [];

export async function downloadModalPdf(spec: ModalPdfSpec): Promise<void> {
  let identity;
  try { identity = await fetchIdentity(); } catch {
    // sem perfil: usa o que o modal conhece do profissional
    const p = spec.professional || {};
    identity = buildIdentity({ name: p.name, crp: p.crp, specialty: p.specialty, company_name: p.companyName, address: p.address, phone: p.phone }, null);
  }
  const p = spec.professional || {};
  const professional = {
    ...identity.professional,
    name: identity.professional.name !== 'Profissional' ? identity.professional.name : (p.name || identity.professional.name),
    registry: identity.professional.registry || withRegistryLabel('CRP', p.crp || ''),
    specialty: identity.professional.specialty || p.specialty || '',
  };
  const birth = parseIsoDate(spec.patient.birth_date ? String(spec.patient.birth_date).slice(0, 10) : '');
  const docDate = parseIsoDate(spec.date) || new Date();
  const model = buildDocumentModel({
    title: spec.title, docType: spec.docType,
    blocks: spec.blocks,
    clinic: identity.clinic, professional,
    patient: { name: spec.patient.full_name, cpf: spec.patient.cpf, birth: birth ? birth.toLocaleDateString('pt-BR') : '' },
    identification: spec.identification, showIdentification: true,
    docDate, place: identity.cityUf, emittedAt: new Date(),
  });
  renderDocumentPdf(model).save(pdfFileName(model.title, spec.patient.full_name));
}
