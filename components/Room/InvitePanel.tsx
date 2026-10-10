import React, { useEffect, useState } from 'react';
import { Check, Copy, Send, UserPlus } from 'lucide-react';
import { api } from '../../services/api';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { DarkButton, DarkCard, DarkPanel } from './Dark';

// ── Painel de Convidar ────────────────────────────────────────────────────────
export const InvitePanel: React.FC<{ roomId: string; roomCode: string; patientId?: number | null; onClose: () => void }> = ({ roomId, roomCode, patientId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [botStatus, setBotStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'checking'>('checking');
  const [sendingBotMsg, setSendingBotMsg] = useState(false);
  const [botMsgSent, setBotMsgSent] = useState(false);
  const [botMsgError, setBotMsgError] = useState<string | null>(null);
  const guestUrl = `${getPublicBaseUrl()}/sala/${roomCode}`;

  useEffect(() => {
    api.get<{ status?: string }>('/whatsapp/status')
      .then((data) => setBotStatus((data?.status as any) || 'disconnected'))
      .catch(() => setBotStatus('disconnected'));
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsapp = () => {
    const msg = `Olá! Sua consulta vai começar em breve.\n\nAcesse sua sala virtual pelo link abaixo:\n${guestUrl}\n\n_Você não precisa de login para entrar._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const sendViaBot = async () => {
    setSendingBotMsg(true);
    setBotMsgError(null);
    try {
      await api.post(`/virtual-rooms/${roomId}/notify-patient`, {});
      setBotMsgSent(true);
      setTimeout(() => setBotMsgSent(false), 4000);
    } catch (err: any) {
      setBotMsgError(err?.message || 'Não foi possível enviar a mensagem.');
    } finally {
      setSendingBotMsg(false);
    }
  };

  const canSendViaBot = botStatus === 'connected' && !!patientId;

  return (
    <DarkPanel title="Convidar paciente" icon={<UserPlus size={16} />} onClose={onClose} bodyClassName="gap-4 p-5">
      <p className="text-[13px] leading-relaxed text-slate-400">
        Compartilhe o link abaixo com seu paciente. Ele entrará diretamente na sala sem precisar de login.
      </p>

      <DarkCard>
        <p className="mb-2 text-xs font-medium text-slate-400">Link da sala</p>
        <div className="flex items-center gap-2">
          <span className="flex-1 break-all font-mono text-xs text-slate-400">{guestUrl}</span>
          <DarkButton size="sm" onClick={copy} iconLeft={copied ? <Check size={13} /> : <Copy size={13} />} className={copied ? '!border-emerald-600 !bg-emerald-600 !text-white' : ''}>
            {copied ? 'Copiado!' : 'Copiar'}
          </DarkButton>
        </div>
      </DarkCard>

      {canSendViaBot && (
        <DarkButton
          variant="primary"
          size="lg"
          fullWidth
          onClick={sendViaBot}
          loading={sendingBotMsg}
          loadingText="Enviando…"
          iconLeft={botMsgSent ? <Check size={14} /> : <Send size={14} />}
          className={botMsgSent ? '!border-emerald-500/40 !bg-emerald-500/20 !text-emerald-300' : ''}
        >
          {botMsgSent ? 'Enviado ao paciente!' : 'Enviar link automaticamente (bot da clínica)'}
        </DarkButton>
      )}
      {botMsgError && <p role="alert" className="text-xs text-red-400">{botMsgError}</p>}

      <DarkButton size="lg" fullWidth onClick={whatsapp} className="!border-emerald-600 !bg-emerald-600 !text-white hover:!bg-emerald-500">
        Enviar pelo meu WhatsApp
      </DarkButton>
      {botStatus !== 'checking' && !canSendViaBot && (
        <p className="text-[11px] leading-snug text-slate-500">
          {botStatus !== 'connected'
            ? 'Conecte o bot de WhatsApp da clínica em Configurações para enviar o link automaticamente.'
            : 'Esta sala não tem um paciente vinculado, então o envio automático não está disponível.'}
        </p>
      )}

      <DarkCard className="!border-primary-500/20 !bg-primary-500/[0.08]">
        <p className="text-xs leading-relaxed text-primary-300">
          O paciente verá uma tela pedindo seu nome antes de entrar. Você verá quando ele conectar.
        </p>
      </DarkCard>
    </DarkPanel>
  );
};
