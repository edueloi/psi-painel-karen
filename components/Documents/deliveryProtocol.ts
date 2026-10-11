/** Protocolo de entrega (PDF sóbrio) — comprova envio, visualização e download pelo paciente. */
import type { jsPDF } from 'jspdf';
import { fetchIdentity, buildIdentity } from './clinicIdentity';
import { renderDocumentPdf } from './renderDocumentPdf';
import { textToBlocks } from './htmlToBlocks';
import { CHANNEL_LABEL, fmtDateTime, sealOf, trailLines, type DeliveryRow } from './documentStatus';

export interface ProtocolDoc {
  id: number; title: string; version: number; patient_name: string | null; issuer_name: string | null; issued_at: string;
  signature_mode: string; content_hash: string | null; pdf_hash: string | null; signed_file_hash: string | null; retention_until: string;
}

export async function buildProtocolPdf(doc: ProtocolDoc, deliveries: DeliveryRow[]): Promise<jsPDF> {
  let identity;
  try { identity = await fetchIdentity(); } catch { identity = buildIdentity({}, null); }
  const official = doc.signed_file_hash || doc.pdf_hash;
  const rows = [
    { label: 'Documento', value: `${doc.title}${doc.version > 1 ? ` (versão ${doc.version})` : ''}`, full: true },
    { label: 'Paciente', value: doc.patient_name || '-', full: true },
    { label: 'Emitido em', value: fmtDateTime(doc.issued_at) },
    { label: 'Emitido por', value: doc.issuer_name || '-' },
    { label: 'Assinatura', value: sealOf(doc.signature_mode).label, full: true },
    { label: 'Hash do conteúdo', value: doc.content_hash || '-', full: true },
    { label: 'Hash do PDF', value: official ? `${official}${doc.signed_file_hash ? ' (arquivo assinado externamente)' : ''}` : '-', full: true },
    { label: 'Guarda até', value: new Date(doc.retention_until).toLocaleDateString('pt-BR'), full: true },
  ];
  const lines: string[] = [];
  if (!deliveries.length) lines.push('Este documento ainda não foi enviado ao paciente.');
  deliveries.forEach((d, i) => {
    lines.push(`Envio ${i + 1} - canal: ${CHANNEL_LABEL[d.channel] || d.channel}`);
    lines.push(trailLines(d).join('\n'));
    if (d.expires_at && d.channel !== 'portal') lines.push(`Link válido até ${fmtDateTime(d.expires_at)}.`);
  });
  lines.push('A primeira visualização e os downloads são registrados automaticamente quando o paciente abre o link seguro ou o portal, e servem como confirmação de recebimento. Os registros não podem ser editados.');
  const model = {
    title: 'Protocolo de entrega de documento',
    clinic: identity.clinic, professional: identity.professional,
    identification: rows, identificationTitle: 'DADOS DO DOCUMENTO',
    blocks: textToBlocks(lines.join('\n\n')),
    place: identity.cityUf, docDate: new Date(), emittedAt: new Date(),
    signature: false as const,
  };
  return renderDocumentPdf(model);
}
