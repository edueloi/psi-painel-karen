/** Rótulos e regras de exibição do status de assinatura e da trilha de entrega (sem DOM). */
export type SignatureMode = 'none' | 'simple' | 'external';

export const SIGNATURE_SEAL: Record<SignatureMode, { label: string; color: 'default' | 'info' | 'success'; hint: string }> = {
  none: { label: 'Sem assinatura', color: 'default', hint: 'Documento emitido sem assinatura.' },
  simple: { label: 'Assinatura eletrônica simples', color: 'info', hint: 'Imagem da assinatura inserida pelo sistema. Não é assinatura digital qualificada.' },
  external: { label: 'Assinado digitalmente (externo)', color: 'success', hint: 'PDF assinado com certificado ICP-Brasil ou Gov.br e anexado ao documento.' },
};
export const sealOf = (mode?: string | null) => SIGNATURE_SEAL[(mode as SignatureMode) in SIGNATURE_SEAL ? (mode as SignatureMode) : 'none'];

export const CHANNEL_LABEL: Record<string, string> = { link: 'link seguro', whatsapp: 'WhatsApp (link seguro)', email: 'e-mail (link seguro)', portal: 'portal do paciente' };

export interface DeliveryRow {
  id: number; channel: string; created_at: string; expires_at: string | null;
  first_viewed_at: string | null; last_viewed_at: string | null; view_count: number;
  first_downloaded_at: string | null; download_count: number; created_by_name: string | null;
}

const dt = (v: string | Date) => new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Linhas da trilha: "Enviado em… por… via…", "Visualizado pelo paciente em… (N vezes)", "Baixado em…". */
export function trailLines(d: DeliveryRow): string[] {
  const out = [`Enviado em ${dt(d.created_at)}${d.created_by_name ? ` por ${d.created_by_name}` : ''} via ${CHANNEL_LABEL[d.channel] || d.channel}.`];
  if (d.first_viewed_at) out.push(`Visualizado pelo paciente em ${dt(d.first_viewed_at)} (${d.view_count} ${d.view_count === 1 ? 'vez' : 'vezes'}).`);
  else out.push('Ainda não visualizado pelo paciente.');
  if (d.first_downloaded_at) out.push(`Baixado em ${dt(d.first_downloaded_at)} (${d.download_count} ${d.download_count === 1 ? 'download' : 'downloads'}).`);
  return out;
}
export const fmtDateTime = dt;
