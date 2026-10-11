import { api } from '../../../services/api';
import type { InstrumentId } from './instruments';
import type { AnswerValue, Answers } from './scoring';

export type AppStatus = 'pending' | 'in_progress' | 'completed';
export type AnsweredBy = 'patient' | 'professional' | null;

export interface SchemaApplication {
  id: number;
  patient_id: number;
  instrument_id: InstrumentId;
  link_id: number | null;
  status: AppStatus;
  answers: Answers;
  answered_count: number;
  total_count: number;
  answered_by: AnsweredBy;
  last_saved_by: AnsweredBy;
  attached_record_id: number | null;
  started_at: string | null;
  last_saved_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export type LinkState = 'active' | 'completed' | 'expired' | 'revoked';
export interface SchemaLink {
  id: number;
  instruments: InstrumentId[];
  message: string | null;
  expires_at: string | null;
  state: LinkState;
  opened_at: string | null;
  last_activity_at: string | null;
  completed_at: string | null;
  created_at: string;
  url: string | null;
}

export interface PatientInventories { applications: SchemaApplication[]; links: SchemaLink[] }

/** Patch de respostas: valor null remove a resposta. */
export type AnswerPatch = Record<string, AnswerValue | null>;

const base = '/schema-inventories';

export const inventoriesApi = {
  forPatient: (patientId: string | number) => api.get<PatientInventories>(`${base}/patient/${patientId}`),
  create: (patientId: string | number, instrumentId: InstrumentId) =>
    api.post<SchemaApplication>(`${base}/applications`, { patient_id: Number(patientId), instrument_id: instrumentId }),
  get: (id: number) => api.get<SchemaApplication>(`${base}/applications/${id}`),
  saveAnswers: (id: number, answers: AnswerPatch) =>
    api.put<{ ok: boolean; answered_count: number; total_count: number; complete: boolean }>(`${base}/applications/${id}/answers`, { answers }),
  complete: (id: number) => api.post<{ ok: boolean }>(`${base}/applications/${id}/complete`, {}),
  reopen: (id: number) => api.post<{ ok: boolean }>(`${base}/applications/${id}/reopen`, {}),
  remove: (id: number) => api.delete<{ ok: boolean }>(`${base}/applications/${id}`),
  attachRecord: (id: number, title: string, content: string) =>
    api.post<{ ok: boolean; record_id: number }>(`${base}/applications/${id}/attach-record`, { title, content }),
  createLink: (patientId: string | number, instruments: InstrumentId[], expiresDays: number, message: string) =>
    api.post<{ id: number; url: string; expires_at: string }>(`${base}/links`, {
      patient_id: Number(patientId), instruments, expires_days: expiresDays, message,
    }),
  revokeLink: (id: number) => api.post<{ ok: boolean }>(`${base}/links/${id}/revoke`, {}),
  extendLink: (id: number, days: number) => api.post<{ ok: boolean; expires_at: string }>(`${base}/links/${id}/extend`, { days }),
};

/* ───────────── Público (paciente) ───────────── */
export interface PublicInstrumentState {
  instrument_id: InstrumentId;
  status: AppStatus;
  answers: Answers;
  answered_count: number;
  total_count: number;
  completed_at: string | null;
}
export interface PublicLinkData {
  message: string | null;
  expires_at: string | null;
  professional: { name: string; specialty?: string; crp?: string; clinic_name?: string; clinic_logo_url?: string } | null;
  patient_first_name: string | null;
  instruments: PublicInstrumentState[];
  all_completed: boolean;
}
export const publicInventoriesApi = {
  open: (token: string) => api.get<PublicLinkData>(`${base}/public/${encodeURIComponent(token)}`),
  saveAnswers: (token: string, instrumentId: InstrumentId, answers: AnswerPatch) =>
    api.put<{ ok: boolean; answered_count: number; total_count: number; complete: boolean }>(
      `${base}/public/${encodeURIComponent(token)}/${instrumentId}/answers`, { answers }),
  complete: (token: string, instrumentId: InstrumentId) =>
    api.post<{ ok: boolean; all_completed?: boolean }>(`${base}/public/${encodeURIComponent(token)}/${instrumentId}/complete`, {}),
};

/** Aplica um patch (null remove) em um conjunto de respostas, sem mutar. */
export function mergeAnswers(current: Answers, patch: AnswerPatch): Answers {
  const next: Answers = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === '' || v === undefined) delete next[k]; else next[k] = v;
  }
  return next;
}
