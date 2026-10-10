import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, Shield, Link as LinkIcon, Settings, Circle, ChevronDown, Copy, Check, Clock, SwitchCamera,
} from 'lucide-react';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { API_BASE_URL } from '../../services/api';
import logoUrl from '../../images/logo-sistema/logo.png';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { DarkBadge, DarkButton, DarkCard, DarkIconButton, DarkInput, DarkTabs } from './Dark';
import { DevicesPanel } from './DevicesPanel';

export type RoomInfo = { host_name?: string; company_name?: string; clinic_logo_url?: string; crp?: string; specialty?: string; avatar_url?: string; scheduled_start?: string | null; waiting_room_message?: string | null; };

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void; label?: string }> = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 ${on ? "bg-primary-600" : "bg-white/15"}`}
  >
    <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[21px]" : "left-[3px]"}`} />
  </button>
);

const LOBBY_TABS = [
  { id: "link", label: "Convidar", icon: <LinkIcon size={12} /> },
  { id: "devices", label: "Dispositivos", icon: <Settings size={12} /> },
  { id: "recording", label: "Gravação", icon: <Circle size={12} /> },
] as const;

export const Lobby: React.FC<{
  roomCode: string; isGuest: boolean; guestName: string;
  setGuestName: (v: string) => void; onJoin: () => void;
  joining: boolean; error: string | null; isDark: boolean;
  userName?: string; onCamChange?: (v: boolean) => void; onMicChange?: (v: boolean) => void;
  onDeviceChange?: (videoId: string, audioId: string) => void;
  onStreamReady?: (stream: MediaStream | null) => void;
  guestRole?: string; onGuestRoleChange?: (v: string) => void;
}> = ({ roomCode, isGuest, guestName, setGuestName, onJoin, joining, error, isDark, userName, onCamChange, onMicChange, onDeviceChange, onStreamReady, guestRole, onGuestRoleChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { preferences, updatePreference } = useUserPreferences();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"link" | "devices" | "recording" | null>("link");
  const [guestDevicesOpen, setGuestDevicesOpen] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({});
  const [consentAccepted, setConsentAccepted] = useState(false);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutDevices, setAudioOutDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedAudioOut, setSelectedAudioOut] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const guestUrl = `${getPublicBaseUrl()}/sala/${roomCode}`;

  useEffect(() => {
    if (!roomCode) return;
    fetch(`${API_BASE_URL}/virtual-rooms/public/${roomCode}/info`)
      .then(r => r.json()).then(d => setRoomInfo(d)).catch(() => {});
  }, [roomCode]);

  const startPreview = useCallback(async (audioId?: string, videoId?: string, facing?: "user" | "environment") => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (!navigator.mediaDevices?.getUserMedia) {
      setDeviceError("Este navegador não tem suporte a câmera/microfone. Use uma versão recente de Chrome, Firefox, Edge ou Safari, acessando por HTTPS.");
      return;
    }
    // "exact" força falha explícita se o dispositivo não tiver a câmera pedida,
    // em vez do navegador devolver a frontal silenciosamente (o que fazia o
    // botão "Virar" nunca trocar de fato, só reespelhar a mesma câmera).
    const videoConstraint = videoId ? { deviceId: { exact: videoId } } : { facingMode: { exact: facing || "user" } };
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks().forEach(t => { t.enabled = camOn; });
      stream.getAudioTracks().forEach(t => { t.enabled = micOn; });
      const actualFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
      if (actualFacing === 'environment' || actualFacing === 'user') setFacingMode(actualFacing);
      onStreamReady?.(stream);
      setDeviceError(null);
    } catch (err: any) {
      // "exact" no facingMode falhou (dispositivo só tem 1 câmera, ou navegador
      // não reporta facingMode) — tenta de novo sem "exact" antes de desistir.
      if (!videoId && facing) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: audioId ? { deviceId: { exact: audioId } } : true,
          });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          stream.getVideoTracks().forEach(t => { t.enabled = camOn; });
          stream.getAudioTracks().forEach(t => { t.enabled = micOn; });
          onStreamReady?.(stream);
          setDeviceError(null);
          return;
        } catch {}
      }
      const name = err?.name || '';
      const msg = name === 'NotAllowedError'
        ? 'Permissão de câmera/microfone negada. Verifique as permissões do site nas configurações do navegador e recarregue a página.'
        : name === 'NotFoundError'
        ? 'Nenhuma câmera ou microfone foi encontrado neste dispositivo.'
        : name === 'NotReadableError'
        ? 'A câmera/microfone já está em uso por outro programa ou aba.'
        : 'Não foi possível acessar a câmera/microfone. Tente outro navegador ou dispositivo.';
      setDeviceError(msg);
    }
  }, []);

  // No celular alterna entre câmera frontal/traseira; troca o device explícito
  // do LiveKit quando já publicado (mesmo padrão usado pela lista de dispositivos).
  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setSelectedVideo("");
    onDeviceChange?.("", selectedAudio);
    startPreview(selectedAudio || undefined, undefined, next);
  };

  useEffect(() => {
    const init = async () => {
      await startPreview();
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === "audioinput"));
      setVideoDevices(devices.filter(d => d.kind === "videoinput"));
      setAudioOutDevices(devices.filter(d => d.kind === "audiooutput"));
    };
    init();
    // Não para o stream aqui — o LiveKit reutiliza o dispositivo ao entrar na sala.
    // Parar o stream antes do LiveKit conectar causa atraso na publicação da câmera.
    return () => {};
  }, []);

  const togglePreviewMic = () => { const n = !micOn; setMicOn(n); onMicChange?.(n); streamRef.current?.getAudioTracks().forEach(t => { t.enabled = n; }); };
  const togglePreviewCam = () => { const n = !camOn; setCamOn(n); onCamChange?.(n); streamRef.current?.getVideoTracks().forEach(t => { t.enabled = n; }); };
  const handleVideoDevice = (id: string) => { setSelectedVideo(id); onDeviceChange?.(id, selectedAudio); startPreview(selectedAudio || undefined, id); };
  const handleAudioDevice = (id: string) => { setSelectedAudio(id); onDeviceChange?.(selectedVideo, id); startPreview(id, selectedVideo || undefined); };
  const copyLink = () => { navigator.clipboard.writeText(guestUrl); setCopied(true); setTimeout(() => setCopied(false), 2500); };
  const sendWhatsApp = () => {
    const msg = `Olá! Sua consulta vai começar em breve.\n\nAcesse sua sala virtual pelo link:\n${guestUrl}\n\n_Não é necessário login._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const canJoin = !joining && (!isGuest || (guestName.trim().length > 0 && consentAccepted));
  const scheduledLabel = roomInfo.scheduled_start
    ? new Date(roomInfo.scheduled_start).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null;
  const displayName = isGuest ? (guestName || "Você") : (userName || "Você");

  /* ── Lobby do profissional: layout tela cheia com câmera em destaque ── */
  if (!isGuest) {
    const previewBtn = (off: boolean) =>
      `!h-11 !w-11 !rounded-full !border-transparent backdrop-blur-md ${off ? "!bg-red-600/85 !text-white hover:!bg-red-600" : "!bg-white/15 !text-white hover:!bg-white/25"}`;
    return (
      <div className="flex min-h-screen flex-col overflow-hidden bg-slate-950">

        {/* Barra superior */}
        <div className="relative z-10 flex shrink-0 items-center justify-between px-4 py-4 sm:px-7">
          <img src={logoUrl} alt="Plaelo" className="h-8 rounded-lg bg-white object-contain p-[3px] opacity-90" />
          <DarkBadge tone="success" className="!px-3 !py-1.5 !text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Sala pronta
          </DarkBadge>
        </div>

        {/* Corpo principal */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-5 md:flex-row md:gap-7 md:px-7 md:pb-7">

          {/* ── Câmera grande ── */}
          <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-white/10 md:aspect-[16/10] md:w-[min(520px,55vw)]">
            <video ref={videoRef} autoPlay muted playsInline
              className="h-full w-full -scale-x-100 object-cover" style={{ display: camOn && !deviceError ? "block" : "none" }} />
            {deviceError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-6 text-center">
                <Shield size={36} className="text-red-400" />
                <span className="max-w-xs text-[13px] font-medium text-red-300">{deviceError}</span>
                <span className="text-xs text-slate-500">Você ainda pode entrar na sala sem câmera/microfone.</span>
              </div>
            ) : !camOn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3.5">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-600 text-3xl font-semibold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-[13px] text-slate-500">Câmera desligada</span>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-[60px] left-4 rounded-lg bg-black/65 px-3 py-1 text-[13px] font-medium text-slate-100 backdrop-blur-md">
              {displayName}
            </div>
            {/* Controles mic/cam */}
            <div className="absolute bottom-3.5 left-1/2 flex -translate-x-1/2 gap-3">
              <DarkIconButton aria-label={micOn ? "Desligar microfone" : "Ligar microfone"} aria-pressed={micOn} title={micOn ? "Desligar microfone" : "Ligar microfone"} size="lg" onClick={togglePreviewMic} className={previewBtn(!micOn)}>
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </DarkIconButton>
              <DarkIconButton aria-label={camOn ? "Desligar câmera" : "Ligar câmera"} aria-pressed={camOn} title={camOn ? "Desligar câmera" : "Ligar câmera"} size="lg" onClick={togglePreviewCam} className={previewBtn(!camOn)}>
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              </DarkIconButton>
              {isMobile && camOn && (
                <DarkIconButton aria-label="Virar câmera" title="Virar câmera" size="lg" onClick={flipCamera} className={previewBtn(false)}>
                  <SwitchCamera size={18} />
                </DarkIconButton>
              )}
            </div>
          </div>

          {/* ── Painel direito ── */}
          <div className="flex w-full flex-col gap-3 md:w-[min(340px,38vw)] md:shrink-0">

            {/* Título */}
            <div>
              <h1 className="text-lg font-medium leading-tight text-slate-100 sm:text-xl">Sua sala virtual</h1>
              <p className="mt-1 text-xs text-slate-500">Pronto para iniciar a sessão?</p>
            </div>

            {/* Abas de seção */}
            <DarkTabs<"link" | "devices" | "recording"> label="Preparar sessão" items={LOBBY_TABS} value={activeSection || "link"} onChange={setActiveSection} />

            {/* Seção: Link */}
            {activeSection === "link" && (
              <DarkCard className="flex flex-col gap-2.5 !border-primary-500/20 !bg-primary-500/[0.07]">
                <p className="text-xs font-medium text-slate-300">Link do paciente</p>
                <div className="select-all break-all rounded-lg bg-black/35 px-3 py-2 font-mono text-[11px] leading-relaxed text-slate-400">
                  {guestUrl}
                </div>
                <div className="flex gap-2">
                  <DarkButton fullWidth size="lg" onClick={copyLink} iconLeft={copied ? <Check size={14} /> : <Copy size={14} />} className={copied ? "!border-emerald-500/35 !bg-emerald-500/15 !text-emerald-300" : ""}>
                    {copied ? "Copiado!" : "Copiar"}
                  </DarkButton>
                  <DarkButton fullWidth size="lg" onClick={sendWhatsApp} iconLeft={(<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>)} className="!border-emerald-500/25 !bg-emerald-500/10 !text-emerald-300 hover:!bg-emerald-500/20">
                    WhatsApp
                  </DarkButton>
                </div>
              </DarkCard>
            )}

            {/* Seção: Dispositivos */}
            {activeSection === "devices" && (
              <DarkCard className="flex flex-col gap-2.5">
                <p className="text-xs font-medium text-slate-300">Dispositivos</p>
                <DevicesPanel className="contents" videoDevices={videoDevices} audioDevices={audioDevices} audioOutDevices={audioOutDevices} selectedVideo={selectedVideo} selectedAudio={selectedAudio} selectedAudioOut={selectedAudioOut} onVideo={handleVideoDevice} onAudio={handleAudioDevice} onAudioOut={setSelectedAudioOut} />
              </DarkCard>
            )}

            {/* Seção: Gravação */}
            {activeSection === "recording" && (
              <DarkCard className="flex flex-col gap-3">
                <p className="text-xs font-medium text-slate-300">Gravação da sessão</p>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-slate-200">Gravar automaticamente</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Inicia ao entrar na sala</p>
                  </div>
                  <Toggle label="Gravar automaticamente" on={preferences.sessions?.autoRecord ?? false} onChange={v => updatePreference('sessions', { autoRecord: v })} />
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-slate-200">Transcrever ao encerrar</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Gera transcrição automática</p>
                  </div>
                  <Toggle label="Transcrever ao encerrar" on={preferences.sessions?.autoTranscribe ?? false} onChange={v => updatePreference('sessions', { autoTranscribe: v })} />
                </div>
              </DarkCard>
            )}

            {error && (
              <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
                {error}
              </div>
            )}

            {/* Botão iniciar */}
            <DarkButton variant="primary" size="lg" fullWidth onClick={onJoin} disabled={!canJoin} loading={joining} loadingText="Conectando..." iconLeft={<Video size={16} />} className="!h-11 !text-sm">
              Iniciar sessão
            </DarkButton>

            <div className="flex items-center justify-center gap-1.5">
              <Shield size={11} className="text-slate-600" />
              <span className="text-[11px] text-slate-600">Conexão segura e criptografada</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── Lobby do paciente (guest): layout card compacto ── */
  const guestPreviewBtn = (off: boolean) =>
    `!h-11 !w-11 !rounded-full !border-transparent backdrop-blur-md ${off ? "!bg-red-600/90 !text-white hover:!bg-red-600" : "!bg-white/20 !text-white hover:!bg-white/30"}`;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 pb-6 pt-3">

      <div className="mb-3 sm:mb-4">
        <img src={roomInfo.clinic_logo_url || logoUrl} alt={roomInfo.company_name || "Plaelo"} className="h-7 rounded-lg bg-white object-contain p-[3px] opacity-90" />
      </div>

      <div className="grid w-full max-w-[760px] grid-cols-1 overflow-hidden rounded-xl border border-white/10 bg-slate-900 sm:grid-cols-2">

        {/* ── Câmera ── */}
        <div className="relative flex h-[180px] flex-col bg-slate-950 sm:h-auto sm:min-h-[320px]">
          <video ref={videoRef} autoPlay muted playsInline
            className="h-full w-full flex-1 -scale-x-100 object-cover" style={{ display: camOn && !deviceError ? "block" : "none" }} />
          {deviceError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-slate-950 p-5 text-center">
              <Shield size={30} className="text-red-400" />
              <span className="max-w-[260px] text-xs font-medium text-red-300">{deviceError}</span>
              <span className="text-[11px] text-slate-500">Você ainda pode entrar na sala sem câmera/microfone.</span>
            </div>
          ) : !camOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950">
              <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-600 text-3xl font-semibold text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-slate-500">Câmera desligada</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-14 left-3 rounded-md bg-black/70 px-2.5 py-[3px] text-xs font-medium text-slate-100 backdrop-blur-md">
            {displayName}
          </div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-2.5 sm:bottom-3">
            <DarkIconButton aria-label={micOn ? "Desligar microfone" : "Ligar microfone"} aria-pressed={micOn} title={micOn ? "Desligar microfone" : "Ligar microfone"} size="lg" onClick={togglePreviewMic} className={guestPreviewBtn(!micOn)}>
              {micOn ? <Mic size={17} /> : <MicOff size={17} />}
            </DarkIconButton>
            <DarkIconButton aria-label={camOn ? "Desligar câmera" : "Ligar câmera"} aria-pressed={camOn} title={camOn ? "Desligar câmera" : "Ligar câmera"} size="lg" onClick={togglePreviewCam} className={guestPreviewBtn(!camOn)}>
              {camOn ? <Video size={17} /> : <VideoOff size={17} />}
            </DarkIconButton>
            {isMobile && camOn && (
              <DarkIconButton aria-label="Virar câmera" title="Virar câmera" size="lg" onClick={flipCamera} className={guestPreviewBtn(false)}>
                <SwitchCamera size={17} />
              </DarkIconButton>
            )}
          </div>
        </div>

        {/* ── Formulário guest ── */}
        <div className="flex flex-col sm:max-h-[90vh] sm:overflow-y-auto">
          <div className="border-b border-white/10 px-5 pb-4 pt-5">
            {(roomInfo.host_name || roomInfo.company_name) && (
              <DarkCard className="mb-4 flex items-center gap-3 !p-2.5">
                {roomInfo.avatar_url
                  ? <img src={roomInfo.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-base font-semibold text-white">{(roomInfo.host_name || "P").charAt(0).toUpperCase()}</div>
                }
                <div className="min-w-0">
                  {roomInfo.host_name && <p className="text-sm font-medium text-slate-100">{roomInfo.host_name}</p>}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {roomInfo.specialty && <span className="text-[11px] text-slate-400">{roomInfo.specialty}</span>}
                    {roomInfo.crp && <DarkBadge tone="primary">CRP {roomInfo.crp}</DarkBadge>}
                    {roomInfo.company_name && <span className="text-[11px] text-slate-500">· {roomInfo.company_name}</span>}
                  </div>
                </div>
              </DarkCard>
            )}
            {scheduledLabel && (
              <DarkBadge tone="primary" className="mb-3 !px-2.5 !py-1">
                <Clock size={11} /> Consulta agendada para {scheduledLabel}
              </DarkBadge>
            )}
            <h1 className="text-lg font-medium text-slate-100">Entrar na consulta</h1>
            <p className="mt-1 text-xs text-slate-500">Informe seu nome para aguardar aprovação</p>
          </div>

          <div className="flex flex-1 flex-col gap-3.5 px-5 py-4">
            <DarkInput
              label="Seu nome completo"
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && canJoin && onJoin()}
              placeholder="Ex: Ana Lima"
              autoFocus
            />

            {onGuestRoleChange && (
              <DarkInput
                label="Seu papel nesta sessão (opcional)"
                type="text"
                value={guestRole || ""}
                onChange={e => onGuestRoleChange(e.target.value)}
                placeholder="Ex: Paciente, Mãe, Pai, Acompanhante"
                hint="Ajuda o profissional a identificar quem é quem, se mais de uma pessoa entrar na sessão."
              />
            )}

            {(videoDevices.length > 0 || audioDevices.length > 0 || audioOutDevices.length > 0) && (
              <div>
                <DarkButton variant="ghost" size="sm" aria-expanded={guestDevicesOpen} onClick={() => setGuestDevicesOpen(v => !v)}
                  iconLeft={<Settings size={13} />} iconRight={<ChevronDown size={13} className={`transition-transform ${guestDevicesOpen ? "rotate-180" : ""}`} />}>
                  Configurar dispositivos
                </DarkButton>
                {guestDevicesOpen && (
                  <div className="mt-2.5 flex flex-col gap-2">
                    <DevicesPanel className="contents" videoDevices={videoDevices} audioDevices={audioDevices} audioOutDevices={audioOutDevices} selectedVideo={selectedVideo} selectedAudio={selectedAudio} selectedAudioOut={selectedAudioOut} onVideo={handleVideoDevice} onAudio={handleAudioDevice} onAudioOut={setSelectedAudioOut} />
                  </div>
                )}
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary-600"
              />
              <span className="text-xs leading-relaxed text-slate-400">
                Li e concordo com os{" "}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-primary-300 underline">termos de atendimento online</a>
                {" "}e a{" "}
                <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-primary-300 underline">política de privacidade</a>.
              </span>
            </label>

            {error && (
              <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 px-5 pb-5 pt-4">
            <DarkButton variant="primary" size="lg" fullWidth onClick={onJoin} disabled={!canJoin} loading={joining} loadingText="Conectando..." className="!h-11 !text-sm">
              Solicitar entrada
            </DarkButton>
            <div className="mt-2.5 flex items-center justify-center gap-1.5">
              <Shield size={11} className="text-slate-600" />
              <span className="text-[11px] text-slate-600">Conexão segura e criptografada</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


