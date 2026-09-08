import React, { useEffect, useState } from 'react';
import { Download, X, Monitor } from 'lucide-react';
import logoUrl from '../../images/logo-sistema/logo.png';

const DISMISS_KEY = 'plaelo_pwa_install_dismissed_at';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true; // iOS Safari
}

function wasDismissedRecently(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!dismissedAt) return false;
  const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return days < DISMISS_DAYS;
}

// Convite para instalar o painel como app (PWA) na área de trabalho —
// captura o prompt nativo do Chrome/Edge (beforeinstallprompt) em vez de
// deixar o browser mostrar o próprio mini-infobar, pra manter a identidade
// visual do Plaelo. Não aparece se o app já estiver instalado (modo
// standalone) nem se a pessoa já tiver dispensado o convite recentemente.
export const InstallPWAPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay() || wasDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome !== 'accepted') {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
    setDeferredPrompt(null);
  };

  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[9998] max-w-sm animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start gap-3.5 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4">
        <img src={logoUrl} alt="Plaelo" className="w-11 h-11 rounded-xl object-contain shrink-0 border border-slate-100" />
        <div className="min-w-0 flex-1">
          <p className="font-black text-sm text-slate-800 flex items-center gap-1.5">
            <Monitor size={14} className="text-indigo-500" /> Instale a Plaelo
          </p>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Acesso rápido, em tela cheia, sem a barra do navegador.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black transition-colors"
            >
              <Download size={13} /> Instalar
            </button>
            <button
              onClick={dismiss}
              className="px-3.5 py-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
