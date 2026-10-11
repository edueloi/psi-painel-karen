/**
 * Identidade institucional (clínica + profissional + local) usada no cabeçalho dos documentos.
 * Mesma origem de dados do PDF do prontuário: GET /profile/me.
 */
import { api, getStaticUrl } from '../../services/api';
import { loadLogoImage, type ClinicInfo, type ProfessionalInfo, type LogoImage } from '../Records/pdf/clinicalDocument';
import { extractCityUf, joinCityUf } from './documentVariables';
import { loadSignature, type SignatureInfo } from './signatureStore';

export interface Identity {
  clinic: ClinicInfo;
  professional: ProfessionalInfo;
  city: string;
  state: string;
  /** "Tatuí/SP" */
  cityUf: string;
  registryLabel: string;
  registryNumber: string;
  /** Assinatura (imagem) do usuário e preferência de inserção automática. Só preenchida por fetchIdentity. */
  signature?: SignatureInfo;
}

const pick = (...vals: any[]) => {
  for (const v of vals) if (v !== undefined && v !== null && String(v).trim() !== '' && String(v) !== 'undefined' && String(v) !== 'null') return String(v).trim();
  return '';
};
const fmtDoc = (s: string) => {
  const d = s.replace(/\D/g, '');
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return s;
};

const logoCache = new Map<string, Promise<LogoImage | null>>();
/** Carrega (e guarda em cache) uma imagem como logo para o PDF. */
export function loadLogoCached(url?: string | null): Promise<LogoImage | null> {
  if (!url) return Promise.resolve(null);
  let p = logoCache.get(url);
  if (!p) { p = loadLogoImage(url); logoCache.set(url, p); p.then(v => { if (!v) logoCache.delete(url); }); }
  return p;
}

export const withRegistryLabel = (label: string, number: string) => {
  const n = (number || '').trim();
  if (!n) return '';
  return n.toUpperCase().startsWith(label.toUpperCase()) ? n : `${label} ${n}`;
};

export function buildIdentity(profile: any, logo: LogoImage | null): Identity {
  const pf = profile || {};
  const registryLabel = pick(pf.registry_label) || 'CRP';
  const registryNumber = pick(pf.registry_number, pf.crp);
  const addr = pick(pf.address);
  const loc = extractCityUf(addr, pick(pf.city), pick(pf.state));
  const zip = pick(pf.zip_code, pf.address_zip);
  const clinic: ClinicInfo = {
    name: pick(pf.company_name, pf.name) || 'Clínica',
    legalName: pick(pf.legal_name, pf.razao_social, pf.corporate_name),
    cnpj: pick(pf.cnpj) ? fmtDoc(pick(pf.cnpj)) : '',
    phone: pick(pf.phone),
    email: pick(pf.email),
    address: [addr, zip && !addr.includes(zip) ? `CEP ${zip}` : ''].filter(Boolean).join(', '),
    website: pick(pf.website, pf.site),
    logo,
  };
  const professional: ProfessionalInfo = {
    name: pick(pf.name) || 'Profissional',
    registry: withRegistryLabel(registryLabel, registryNumber),
    specialty: pick(pf.area_name, pf.specialty),
  };
  return { clinic, professional, city: loc.city, state: loc.state, cityUf: joinCityUf(loc.city, loc.state), registryLabel, registryNumber };
}

/** Busca o perfil e monta a identidade (logo opcional sobrescreve a da clínica). */
export async function fetchIdentity(logoOverrideUrl?: string | null): Promise<Identity> {
  const [profile, signature] = await Promise.all([api.get<any>('/profile/me'), loadSignature().catch(() => undefined)]);
  const logoPath = logoOverrideUrl || pick(profile?.clinic_logo_url, profile?.clinicLogoUrl);
  const logo = logoPath ? await loadLogoCached(logoPath.startsWith('data:') || /^https?:/i.test(logoPath) ? logoPath : getStaticUrl(logoPath)) : null;
  const idt = buildIdentity(profile, logo);
  if (signature) idt.signature = signature;
  return idt;
}

/** Registro profissional obrigatório nos documentos: sem ele a emissão é bloqueada. */
export const REGISTRY_REQUIRED_MESSAGE = 'Cadastre seu CRP no perfil para emitir documentos.';
export const hasRegistry = (registryNumber: string | undefined | null) => !!String(registryNumber || '').replace(/[^0-9A-Za-z]/g, '');
