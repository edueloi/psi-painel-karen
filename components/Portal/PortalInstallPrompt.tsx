import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Button, IconButton } from '../UI';
import { Download, X, Smartphone, Share, PlusSquare, Bell, MoreVertical, Check } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import logoUrl from '../../images/logo-sistema/logo.png';

const INSTALL_DISMISS_KEY = 'plaelo_portal_install_dismissed_at';
const NOTIFY_DISMISS_KEY = 'plaelo_portal_notify_dismissed_at';
const DISMISS_DAYS = 14;
const SESSION_KEY = 'psi_portal_session';

// Espelha o portalFetch privado de pages/PatientPortal.tsx — duplicado aqui
// de propósito (função pequena) em vez de exportar/reestruturar aquele
// arquivo (3000+ linhas) só para isso.
function getPortalSession(): { token: string } | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

async function portalFetch(path: string, options: RequestInit = {}) {
  const session = getPortalSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as any) };
  if (session) headers['X-Portal-Token'] = session.token;
  return fetch(`${API_BASE_URL}/patient-portal${path}`, { ...options, headers });
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true; // iOS Safari
  } catch { return false; }
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isMobileUa(): boolean {
  return /android|iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasDismissedRecently(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    return (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24) < DISMISS_DAYS;
  } catch { return false; }
}

function markDismissed(key: string) {
  try { localStorage.setItem(key, String(Date.now())); } catch { /* ignora */ }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ─── Bottom-sheet do portal (celular) / diálogo centralizado (desktop) ───────
export const PortalSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center bg-slate-900/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full md:max-w-md bg-white rounded-t-xl md:rounded-lg border border-slate-200 max-h-[88dvh] flex flex-col overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="md:hidden mx-auto mt-2 h-1 w-9 rounded-full bg-slate-200 shrink-0" />
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 shrink-0">
          <div className="text-sm font-medium text-slate-800 min-w-0">{title}</div>
          <IconButton variant="ghost" size="sm" onClick={onClose} aria-label="Fechar"><X size={16} /></IconButton>
        </div>
        <div className="overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
};

// ─── Contexto compartilhado (instalação + notificações) ──────────────────────
interface PortalInstallCtx {
  installed: boolean;
  ios: boolean;
  /** Pode oferecer instalação (celular ou navegador com prompt nativo). */
  canOfferInstall: boolean;
  bannerVisible: boolean;
  dismissBanner: () => void;
  /** Android/Chrome: dispara o prompt nativo; demais casos: abre o passo a passo. */
  install: () => Promise<void>;
  openGuide: () => void;
  notifyVisible: boolean;
  subscribing: boolean;
  enableNotifications: () => Promise<void>;
  dismissNotify: () => void;
}

const Ctx = createContext<PortalInstallCtx | null>(null);

export function usePortalInstall(): PortalInstallCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePortalInstall fora do PortalInstallProvider');
  return v;
}

const Step: React.FC<{ n: number; icon: React.ReactNode; children: React.ReactNode }> = ({ n, icon, children }) => (
  <li className="flex items-center gap-3">
    <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-[11px] font-medium flex items-center justify-center shrink-0">{n}</span>
    <span className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 text-primary-600 flex items-center justify-center shrink-0">{icon}</span>
    <span className="text-xs text-slate-700 leading-relaxed">{children}</span>
  </li>
);

export const PortalInstallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandaloneDisplay());
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => wasDismissedRecently(INSTALL_DISMISS_KEY));
  const [notifyDismissed, setNotifyDismissed] = useState<boolean>(() => wasDismissedRecently(NOTIFY_DISMISS_KEY));
  const [notifyEligible, setNotifyEligible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferredPrompt(null); setGuideOpen(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Opt-in de notificações — só quando o browser suporta Push API e o paciente
  // ainda não decidiu (permission === 'default').
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setNotifyEligible(Notification.permission === 'default');
  }, []);

  const canOfferInstall = !installed && (ios || isMobileUa() || !!deferredPrompt);
  const bannerVisible = canOfferInstall && !bannerDismissed;
  const notifyVisible = notifyEligible && !notifyDismissed;

  const dismissBanner = useCallback(() => { markDismissed(INSTALL_DISMISS_KEY); setBannerDismissed(true); }, []);
  const openGuide = useCallback(() => setGuideOpen(true), []);

  const install = useCallback(async () => {
    if (!deferredPrompt) { setGuideOpen(true); return; }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome !== 'accepted') markDismissed(INSTALL_DISMISS_KEY);
    } catch { /* ignora */ }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismissNotify = useCallback(() => { markDismissed(NOTIFY_DISMISS_KEY); setNotifyDismissed(true); }, []);

  const enableNotifications = useCallback(async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { dismissNotify(); return; }

      const keyRes = await portalFetch('/push/vapid-public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) { setNotifyEligible(false); return; }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await portalFetch('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setNotifyEligible(false);
    } catch {
      dismissNotify();
    } finally {
      setSubscribing(false);
    }
  }, [dismissNotify]);

  const value: PortalInstallCtx = {
    installed, ios, canOfferInstall, bannerVisible, dismissBanner, install, openGuide,
    notifyVisible, subscribing, enableNotifications, dismissNotify,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <PortalSheet open={guideOpen} onClose={() => setGuideOpen(false)} title="Instalar aplicativo">
        <div className="flex items-center gap-3 mb-4">
          <img src={logoUrl} alt="Portal do Paciente" className="w-12 h-12 rounded-lg object-contain border border-slate-100 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Portal do Paciente</p>
            <p className="text-xs text-slate-500">Abre em tela cheia, como um app, direto da sua tela inicial.</p>
          </div>
        </div>
        {ios ? (
          <ol className="space-y-3">
            <Step n={1} icon={<Smartphone size={18} />}>Abra este portal no <strong>Safari</strong> (no iPhone, outros navegadores não instalam apps).</Step>
            <Step n={2} icon={<Share size={18} />}>Toque no botão <strong>Compartilhar</strong>, na barra inferior do Safari.</Step>
            <Step n={3} icon={<PlusSquare size={18} />}>Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.</Step>
            <Step n={4} icon={<Check size={18} />}>Toque em <strong>Adicionar</strong>. O ícone do portal aparece na sua tela inicial.</Step>
          </ol>
        ) : (
          <ol className="space-y-3">
            <Step n={1} icon={<MoreVertical size={18} />}>Toque no menu do navegador (<strong>⋮</strong>, no canto superior).</Step>
            <Step n={2} icon={<Download size={18} />}>Escolha <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</Step>
            <Step n={3} icon={<Check size={18} />}>Confirme em <strong>Instalar</strong>. O ícone do portal aparece na sua tela inicial.</Step>
          </ol>
        )}
        <Button className="mt-4" variant="outline" size="lg" fullWidth onClick={() => setGuideOpen(false)}>Entendi</Button>
      </PortalSheet>
    </Ctx.Provider>
  );
};

// ─── Cartão "Instalar app" (Início) ──────────────────────────────────────────
export const PortalInstallCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { bannerVisible, install, dismissBanner, ios } = usePortalInstall();
  if (!bannerVisible) return null;
  return (
    <div className={`flex items-start gap-3 bg-white border border-primary-100 rounded-lg p-3 ${className}`}>
      <img src={logoUrl} alt="" className="w-11 h-11 rounded-lg object-contain shrink-0 border border-slate-100" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-slate-800">Instalar app</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          {ios
            ? 'Adicione o portal à tela inicial do iPhone e acesse como um app.'
            : 'Acesso rápido às suas consultas, em tela cheia, direto da tela inicial.'}
        </p>
        <div className="flex items-center gap-2 mt-2.5">
          <Button size="md" variant="primary" onClick={install} iconLeft={<Download size={14} />}>
            {ios ? 'Como instalar' : 'Instalar'}
          </Button>
          <Button size="md" variant="ghost" onClick={dismissBanner}>Agora não</Button>
        </div>
      </div>
      <IconButton variant="ghost" size="sm" onClick={dismissBanner} aria-label="Fechar" className="shrink-0">
        <X size={14} />
      </IconButton>
    </div>
  );
};

// ─── Cartão discreto "Ativar notificações" (Início / Perfil) ─────────────────
export const PortalNotifyCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { notifyVisible, enableNotifications, dismissNotify, subscribing } = usePortalInstall();
  if (!notifyVisible) return null;
  return (
    <div className={`flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3 ${className}`}>
      <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
        <Bell size={16} className="text-primary-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm text-slate-800">Ativar notificações</p>
        <p className="text-[11px] text-slate-500 leading-snug">Lembretes de sessão e confirmações no seu celular.</p>
      </div>
      <Button size="md" variant="primary" onClick={enableNotifications} loading={subscribing} className="shrink-0">
        {subscribing ? 'Ativando...' : 'Ativar'}
      </Button>
      <IconButton variant="ghost" size="sm" onClick={dismissNotify} aria-label="Fechar" className="shrink-0">
        <X size={14} />
      </IconButton>
    </div>
  );
};
