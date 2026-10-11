/**
 * Emissão de documento (congela conteúdo + PDF no servidor), anexo de PDF assinado externamente e envio ao paciente.
 * O servidor calcula os hashes SHA-256; documento emitido não é editável (corrigir = nova versão com replaces_id).
 */
import type { jsPDF } from 'jspdf';
import { api } from '../../services/api';
import { renderDocumentPdf, type DocumentModel } from './renderDocumentPdf';
import { buildStoredHtml } from './buildDocument';
import type { SignatureMode } from './documentStatus';

export interface IssueArgs {
  model: DocumentModel;
  templateId?: string | null;
  patientId?: string | null;
  docType?: string | null;
  /** Emite como nova versão que substitui este documento (o anterior é mantido). */
  replacesId?: number | null;
  meta?: Record<string, unknown>;
}
export interface IssueResult { id: number; version: number; contentHash: string; pdfHash: string | null; pdf: jsPDF }

export function bytesToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function issueDocument(a: IssueArgs): Promise<IssueResult> {
  const model: DocumentModel = { ...a.model, emittedAt: new Date() };
  const pdf = renderDocumentPdf(model);
  const mode: SignatureMode = model.signatureImage ? 'simple' : 'none';
  const resp = await api.post<{ id: number; version: number; content_hash: string; pdf_hash: string | null }>('/doc-generator/doc-instances', {
    template_id: a.templateId || null,
    patient_id: a.patientId || null,
    title: model.title,
    doc_type: a.docType || null,
    rendered_html: buildStoredHtml(model),
    pdf_base64: bytesToBase64(pdf.output('arraybuffer') as ArrayBuffer),
    signature_mode: mode,
    replaces_id: a.replacesId || null,
    meta: {
      professional_name: model.signature && model.signature.name ? model.signature.name : model.professional.name,
      professional_registry: model.signature && model.signature.registry !== undefined ? model.signature.registry : model.professional.registry,
      signed_at: model.signatureImage ? (model.signedAt || model.emittedAt).toISOString() : null,
      ...(a.meta || {}),
    },
  });
  return { id: resp.id, version: resp.version, contentHash: resp.content_hash, pdfHash: resp.pdf_hash, pdf };
}

/** Lê um PDF escolhido pelo usuário (somente application/pdf, até 5 MB) e anexa como versão oficial assinada. */
export async function attachSignedPdf(docId: number, file: File): Promise<{ sha256: string; size: number }> {
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Envie um arquivo PDF.');
  if (file.size > 5 * 1024 * 1024) throw new Error('O PDF deve ter no máximo 5 MB.');
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...head) !== '%PDF-') throw new Error('O arquivo enviado não é um PDF válido.');
  const b64 = bytesToBase64(await file.arrayBuffer());
  return api.post(`/doc-generator/doc-instances/${docId}/signed-pdf`, { pdf_base64: b64, file_name: file.name });
}

export interface DeliveryResult { id: number; channel: string; expires_at: string; url: string | null }
export const createDelivery = (docId: number, channel: 'link' | 'whatsapp' | 'email' | 'portal', expiresDays = 30) =>
  api.post<DeliveryResult>(`/doc-generator/doc-instances/${docId}/deliveries`, { channel, expires_days: expiresDays });
