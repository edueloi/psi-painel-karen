import { parseStructured } from './specialtyTemplates';

/** Regra do prontuário vivo: Anamnese/Avaliação/Plano únicos por paciente; Evolução uma por data de consulta. */

export const OCORRENCIAS = ['Sessão realizada', 'Falta do paciente', 'Falta justificada', 'Cancelada pelo profissional', 'Remarcada'] as const;
export const FALTA_MOTIVOS = [
  'Doença', 'Imprevisto / emergência', 'Esquecimento', 'Sem aviso', 'Trabalho / estudos', 'Financeiro', 'Transporte / logística', 'Outro',
] as const;
export const COBRAR_OPTIONS = ['Sim', 'Não', 'Conforme contrato'] as const;

export const isAbsenceOc = (oc?: string | null) => !!oc && oc !== 'Sessão realizada';
export const isFaltaOc = (oc?: string | null) => !!oc && oc.startsWith('Falta');

/** Ocorrência da evolução (a partir do JSON salvo em ai_organized_content). */
export function ocorrenciaOf(aiRaw?: string | null): string {
  const s = parseStructured(aiRaw);
  return String(s?.values?.ocorrencia || s?.meta?.ocorrencia || 'Sessão realizada');
}
/** Falta registrada, mas o motivo ainda não foi preenchido. */
export function faltaPending(aiRaw?: string | null): boolean {
  const s = parseStructured(aiRaw);
  const oc = String(s?.values?.ocorrencia || s?.meta?.ocorrencia || '');
  return isFaltaOc(oc) && !String(s?.values?.falta_motivo || '').trim();
}
export const occurrenceBadgeLabel = (oc: string) => (isFaltaOc(oc) ? 'Falta' : oc);

const pad = (n: number) => String(n).padStart(2, '0');
/** Dia local (AAAA-MM-DD) de um timestamp do servidor. */
export function dayOfStamp(v?: string | null): string {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v).split('T')[0];
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fmtDay = (ymd?: string | null) => (ymd ? ymd.slice(0, 10).split('-').reverse().join('/') : '—');

export function addMonthsStr(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, (m - 1) + months, 1);
  const last = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
  dt.setDate(Math.min(d, last));
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}
export function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T12:00:00`).getTime();
  const b = new Date(`${toYmd}T12:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

/** Próxima reavaliação prevista: última avaliação + 6 meses (ou data editada manualmente). */
export function dueOverrideOf(aiRaw?: string | null): string | null {
  const s = parseStructured(aiRaw) as any;
  const v = s?.meta?.proxima_reavaliacao;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  try { const o = aiRaw ? JSON.parse(aiRaw) : null; if (o && /^\d{4}-\d{2}-\d{2}$/.test(String(o._proxima_reavaliacao || ''))) return o._proxima_reavaliacao; } catch { /* ignora */ }
  return null;
}
export function reassessInfo(refDay: string, override?: string | null) {
  const due = override || addMonthsStr(refDay, 6);
  const days = daysBetween(localToday(), due);
  const state: 'ok' | 'soon' | 'late' = days < 0 ? 'late' : days <= 30 ? 'soon' : 'ok';
  const label = state === 'late' ? 'Reavaliação atrasada' : state === 'soon' ? `Reavaliação em ${days} dia${days === 1 ? '' : 's'}` : 'Em dia';
  return { due, days, state, label };
}
