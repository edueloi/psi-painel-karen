/**
 * Atestado psicológico com campos estruturados (conforme a orientação do CFP informada pelo usuário):
 * identificação (paciente e psicólogo com registro), solicitante, finalidade, conclusão (fato psicológico constatado)
 * e, somente com autorização formal do paciente ou dever legal, o CID/DSM. Sem DOM: roda em Node (testes).
 */
import { shortDatePt } from './documentVariables';

export const REQUESTERS = ['Paciente', 'Empresa', 'Escola', 'Justiça', 'Outro'] as const;
export type Requester = typeof REQUESTERS[number];
export type CidBasis = 'autorizacao_paciente' | 'dever_legal';

export const CID_BASIS_LABEL: Record<CidBasis, string> = {
  autorizacao_paciente: 'Autorização do paciente',
  dever_legal: 'Dever legal',
};

export interface AtestadoFields {
  requester: Requester;
  /** Nome da empresa/escola/órgão (obrigatório quando o solicitante não é o próprio paciente). */
  requesterName: string;
  purpose: string;
  conclusion: string;
  /** "dd/mm/aaaa a dd/mm/aaaa" (opcional). */
  period: string;
  timeStart: string;
  timeEnd: string;
  includeCid: boolean;
  cid: string;
  cidAuthorized: boolean;
  cidBasis: CidBasis;
}

export const emptyAtestado = (): AtestadoFields => ({
  requester: 'Paciente', requesterName: '', purpose: '', conclusion: '', period: '', timeStart: '', timeEnd: '',
  includeCid: false, cid: '', cidAuthorized: false, cidBasis: 'autorizacao_paciente',
});

export interface AtestadoContext {
  patientName: string;
  patientCpf?: string;
  professionalName: string;
  /** Já com o rótulo (ex.: "CRP 06/172315"). */
  professionalRegistry: string;
  docDate: Date;
}

/** Regra do CID/DSM: só consta com o aceite explícito + fundamento. Espelha backend/utils/documentIntegrity.js. */
export function cidError(f: Pick<AtestadoFields, 'includeCid' | 'cid' | 'cidAuthorized' | 'cidBasis'>): string | null {
  if (!f.includeCid) return null;
  if (!f.cid.trim()) return 'Informe o código CID/DSM.';
  if (!f.cidAuthorized) return 'Confirme a autorização formal do paciente ou o dever legal para informar o CID/DSM.';
  if (f.cidBasis !== 'autorizacao_paciente' && f.cidBasis !== 'dever_legal') return 'Informe o fundamento do CID/DSM.';
  return null;
}

/** Lista de pendências que bloqueiam a emissão (vazia = pode emitir). */
export function atestadoErrors(f: AtestadoFields, ctx: AtestadoContext): string[] {
  const errs: string[] = [];
  if (!ctx.patientName.trim()) errs.push('Informe o paciente.');
  if (!ctx.professionalName.trim()) errs.push('Informe o nome do profissional.');
  if (!ctx.professionalRegistry.trim()) errs.push('Cadastre seu CRP no perfil.');
  if (f.requester !== 'Paciente' && !f.requesterName.trim()) errs.push(`Informe o nome do solicitante (${f.requester}).`);
  if (!f.purpose.trim()) errs.push('Informe a finalidade.');
  if (!f.conclusion.trim()) errs.push('Informe a conclusão (fato psicológico constatado).');
  const c = cidError(f);
  if (c) errs.push(c);
  return errs;
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim();
const endDot = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);

/** Texto do atestado (parágrafos separados por linha em branco). O profissional pode editá-lo livremente. */
export function buildAtestadoText(f: AtestadoFields, ctx: AtestadoContext): string {
  const patient = tidy(ctx.patientName) || '__________';
  const cpf = tidy(ctx.patientCpf || '');
  const reg = tidy(ctx.professionalRegistry);
  const paras: string[] = [];
  paras.push(
    `Atesto, para os devidos fins, que ${patient}${cpf ? `, portador(a) do CPF ${cpf}` : ''}, está em atendimento psicológico com ${tidy(ctx.professionalName) || '__________'}${reg ? `, ${reg}` : ''}` +
    `, tendo sido atendido(a) em ${shortDatePt(ctx.docDate)}${f.timeStart.trim() ? `, a partir das ${f.timeStart.trim()}${f.timeEnd.trim() ? ` às ${f.timeEnd.trim()}` : ''}` : ''}.`
  );
  const requester = f.requester === 'Paciente' ? 'O próprio paciente' : `${f.requester}${f.requesterName.trim() ? ` - ${tidy(f.requesterName)}` : ''}`;
  paras.push(`Solicitante: ${endDot(requester)}`);
  paras.push(`Finalidade: ${endDot(tidy(f.purpose) || '__________')}`);
  paras.push(`Conclusão: ${endDot(tidy(f.conclusion) || '__________')}`);
  if (f.period.trim()) paras.push(`Período de afastamento: ${endDot(tidy(f.period))}`);
  if (f.includeCid && !cidError(f)) {
    paras.push(`CID/DSM: ${tidy(f.cid)}, informado ${f.cidBasis === 'dever_legal' ? 'em cumprimento de dever legal' : 'mediante autorização formal do paciente'}.`);
  }
  return paras.join('\n\n');
}

/** Metadados congelados com o documento (sem dados clínicos além do necessário). */
export const atestadoMeta = (f: AtestadoFields) => ({
  requester: f.requester === 'Paciente' ? 'Paciente' : `${f.requester}${f.requesterName.trim() ? ` - ${tidy(f.requesterName)}` : ''}`,
  purpose: tidy(f.purpose).slice(0, 255),
  cid_included: f.includeCid && !cidError(f),
  cid_basis: f.includeCid && !cidError(f) ? f.cidBasis : null,
});

export const isAtestadoType = (docType?: string | null, title?: string | null) =>
  (docType || '').toLowerCase() === 'atestado' || /atestado/i.test(title || '');
