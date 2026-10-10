import React, { useEffect, useState } from 'react';
import { Button, IconButton } from '../UI';
import { Download, X, Smartphone, Share, PlusSquare, Bell } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import logoUrl from '../../images/logo-sistema/logo.png';

const INSTALL_DISMISS_KEY = 'plaelo_portal_install_dismissed_at';
const NOTIFY_DISMISS_KEY = 'plaelo_portal_notify_dismissed_at';
const DISMISS_DAYS = 14;
const SESSION_KEY = 'psi_portal_session';

// Espelha o portalFetch privado de pages/PatientPortal.tsx — duplicado aqui
// de propósito (função pequena) em vez de exportar/reestruturar aquele
// arquivo (3200+ linhas) só para isso.
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
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true; // iOS Safari
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function wasDismissedRecently(key: string): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const days = (Date.now() - Number(raw)) / (1000 * 60 * 60 * 24);
  return days < DISMISS_DAYS;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// Convite de instalação (Android via prompt nativo, iPhone via instrução
// manual — iOS Safari nunca dispara beforeinstallprompt) + opt-in de
// notificações push, específicos do Portal do Paciente.
export const PortalInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installVisible, setInstallVisible] = useState(false);
  const [notifyVisible, setNotifyVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    if (isIos()) {
      if (!wasDismissedRecently(INSTALL_DISMISS_KEY)) {
        setShowIosHint(true);
        setInstallVisible(true);
      }
      return;
    }

    if (wasDismissedRecently(INSTALL_DISMISS_KEY)) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setInstallVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Opt-in de notificações — só oferece depois que a pessoa já decidiu sobre
  // instalar (evita empilhar dois banners de uma vez), e só quando o browser
  // suporta Push API e o paciente ainda não decidiu (permission === 'default').
  useEffect(() => {
    if (installVisible) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission !== 'default') return;
    if (wasDismissedRecently(NOTIFY_DISMISS_KEY)) return;
    setNotifyVisible(true);
  }, [installVisible]);

  const dismissInstall = () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    setInstallVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'accepted') localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    setInstallVisible(false);
    setDeferredPrompt(null);
  };

  const dismissNotify = () => {
    localStorage.setItem(NOTIFY_DISMISS_KEY, String(Date.now()));
    setNotifyVisible(false);
  };

  const handleEnableNotifications = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { dismissNotify(); return; }

      const keyRes = await portalFetch('/push/vapid-public-key');
      const { publicKey } = await keyRes.json();
      if (!publicKey) { setNotifyVisible(false); return; }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await portalFetch('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      setNotifyVisible(false);
    } catch {
      dismissNotify();
    } finally {
      setSubscribing(false);
    }
  };

  if (installVisible) {
    return (
      <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[9998] animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start gap-3.5 bg-white border border-slate-200 rounded-lg shadow-md p-3">
          <img src={logoUrl} alt="Plaelo" className="w-11 h-11 rounded-lg object-contain shrink-0 border border-slate-100" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-slate-800 flex items-center gap-1.5">
              <Smartphone size={14} className="text-primary-600" /> Instale o Portal
            </p>
            {showIosHint ? (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Toque em <Share size={12} className="inline -mt-0.5" /> <strong>Compartilhar</strong> e depois em{' '}
                <PlusSquare size={12} className="inline -mt-0.5" /> <strong>Adicionar à Tela de Início</strong>.
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Acesso rápido às suas consultas, direto da tela inicial do seu celular.
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {!showIosHint && (
                <Button size="sm" variant="primary" onClick={handleInstall} iconLeft={<Download size={14} />}>
                  Instalar
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={dismissInstall}>
                {showIosHint ? 'Entendi' : 'Agora não'}
              </Button>
            </div>
          </div>
          <IconButton variant="ghost" size="sm" onClick={dismissInstall} aria-label="Fechar" className="shrink-0">
            <X size={14} />
          </IconButton>
        </div>
      </div>
    );
  }

  if (notifyVisible) {
    return (
      <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-[9998] animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start gap-3.5 bg-white border border-slate-200 rounded-lg shadow-md p-3">
          <div className="w-11 h-11 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center shrink-0">
            <Bell size={18} className="text-primary-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-slate-800">Ativar notificações</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Receba avisos de lembrete de sessão e confirmações direto no seu celular.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button size="sm" variant="primary" onClick={handleEnableNotifications} loading={subscribing} iconLeft={<Bell size={14} />}>
                {subscribing ? 'Ativando...' : 'Ativar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissNotify}>
                Agora não
              </Button>
            </div>
          </div>
          <IconButton variant="ghost" size="sm" onClick={dismissNotify} aria-label="Fechar" className="shrink-0">
            <X size={14} />
          </IconButton>
        </div>
      </div>
    );
  }

  return null;
};
