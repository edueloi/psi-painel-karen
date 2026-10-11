/**
 * Assinatura do usuário logado, em memória (nunca em localStorage/logs).
 * Origem: GET /profile/signature (rota autenticada). Os geradores de PDF (documentos, modais e prontuário)
 * leem daqui; o carregamento é compartilhado e fica em cache até `invalidateSignature()`.
 */
import { api } from '../../services/api';
import { getToken } from '../../services/tokenStorage';
import { toSignatureImage, type SignatureImage } from './signatureImage';

export interface SignatureInfo {
  image: SignatureImage | null;
  /** Preferência do perfil: inserir automaticamente nos documentos e PDFs. */
  auto: boolean;
  updatedAt: string | null;
}

const EMPTY: SignatureInfo = { image: null, auto: true, updatedAt: null };
let current: SignatureInfo | null = null;
let pending: Promise<SignatureInfo> | null = null;
let loadedAt = 0;
const STALE_MS = 5 * 60 * 1000;

export function infoFromResponse(r: any): SignatureInfo {
  return {
    image: toSignatureImage(r?.signature_image),
    auto: r?.signature_auto === undefined || r?.signature_auto === null ? true : !!r.signature_auto,
    updatedAt: r?.signature_updated_at ? String(r.signature_updated_at) : null,
  };
}

export function loadSignature(force = false): Promise<SignatureInfo> {
  if (!force && current && Date.now() - loadedAt < STALE_MS) return Promise.resolve(current);
  if (pending) return pending;
  pending = api.get<any>('/profile/signature')
    .then(r => { current = infoFromResponse(r); loadedAt = Date.now(); return current; })
    .catch(() => current || EMPTY)
    .finally(() => { pending = null; });
  return pending;
}

export const getCachedSignature = (): SignatureInfo | null => current;
export function setSignatureCache(info: SignatureInfo): void { current = info; loadedAt = Date.now(); }
export function invalidateSignature(): void { current = null; loadedAt = 0; }

/**
 * Leitura síncrona para geradores de PDF sem async (prontuário). Dispara um carregamento em segundo plano se o
 * cache estiver vazio/antigo; devolve a imagem só quando a preferência automática está ligada.
 */
export function autoSignatureSync(): SignatureImage | null {
  if (!current || Date.now() - loadedAt > STALE_MS) { if (getToken()) void loadSignature(); }
  return current && current.auto && current.image ? current.image : null;
}
