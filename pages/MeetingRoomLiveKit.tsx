import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  ConnectionStateToast,
  useChat,
  useParticipantTracks,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent, ConnectionQuality, type LocalParticipant, type RemoteParticipant, type RemoteTrack, type RemoteTrackPublication, type Participant } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff,
  MessageSquare, X, Send, Copy, Check, UserPlus, Clock, Shield, Link as LinkIcon,
  ChevronDown, Settings, Circle, Loader2, FileText, SwitchCamera,
  Sparkles, Receipt, NotebookPen, CalendarPlus, FileOutput, PenTool, Eraser, Trash2,
  FileSignature, Upload, ClipboardList, ExternalLink,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { api, API_BASE_URL } from "../services/api";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import logoUrl from '../images/logo-sistema/logo.png';
import { PUBLIC_BASE_URL } from '@/src/lib/publicLinks';
import { PaymentModal } from '../components/UI/PaymentModal';
import { DatePicker } from '../components/UI/DatePicker';
import { AuroraAssistant } from '../components/AI/AuroraAssistant';

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface MeetingRoomLiveKitProps { isGuest?: boolean; }

type RoomMessage = {
  id: number;
  sender_role: "host" | "guest" | "system";
  sender_name: string;
  message: string;
  created_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
  </svg>
);

// ── DeviceSelect ──────────────────────────────────────────────────────────────
const DeviceSelect: React.FC<{
  label: string; devices: MediaDeviceInfo[]; value: string;
  onChange: (id: string) => void; icon: React.ReactNode;
}> = ({ label, devices, value, onChange, icon }) => {
  const [open, setOpen] = useState(false);
  const selected = devices.find(d => d.deviceId === value);
  return (
    <div style={{ position: "relative" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
        {icon} {label}
      </p>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", gap: 8 }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
          {selected?.label || "Padrão do sistema"}
        </span>
        <ChevronDown size={14} color="#64748b" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#1e2535", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", marginTop: 4, overflow: "hidden" }}>
          {devices.map(d => (
            <button key={d.deviceId} onClick={() => { onChange(d.deviceId); setOpen(false); }}
              style={{ width: "100%", padding: "10px 12px", background: d.deviceId === value ? "rgba(99,102,241,0.2)" : "none", border: "none", cursor: "pointer", color: d.deviceId === value ? "#a5b4fc" : "#cbd5e1", fontSize: 13, textAlign: "left" }}>
              {d.label || `Dispositivo ${d.deviceId.slice(0, 8)}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Lobby ─────────────────────────────────────────────────────────────────────
type RoomInfo = { host_name?: string; company_name?: string; clinic_logo_url?: string; crp?: string; specialty?: string; avatar_url?: string; scheduled_start?: string | null; waiting_room_message?: string | null; };

// Traduz erros de getUserMedia/LiveKit em mensagens que a pessoa entende —
// sem isso, um clique em "ligar câmera" que falha (permissão negada, câmera
// em uso por outro app, dispositivo removido) parece simplesmente não fazer nada.
const mediaErrorMessage = (err: any): string => {
  const name = err?.name || '';
  if (name === 'NotAllowedError') return 'Permissão negada. Verifique as permissões de câmera/microfone do navegador para este site e tente novamente.';
  if (name === 'NotFoundError') return 'Nenhuma câmera ou microfone foi encontrado neste dispositivo.';
  if (name === 'NotReadableError') return 'A câmera ou microfone já está em uso por outro aplicativo ou aba.';
  if (name === 'OverconstrainedError') return 'O dispositivo selecionado não está mais disponível. Escolha outro em Configurações.';
  return 'Não foi possível ativar. Verifique as permissões do navegador e tente novamente.';
};

const Toggle: React.FC<{ on: boolean; onChange: (v: boolean) => void }> = ({ on, onChange }) => (
  <button
    onClick={() => onChange(!on)}
    style={{ position: "relative", width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: on ? "#6366f1" : "rgba(255,255,255,0.12)", transition: "background .2s", flexShrink: 0 }}
  >
    <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
  </button>
);

const Lobby: React.FC<{
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

  const guestUrl = `${PUBLIC_BASE_URL}/sala/${roomCode}`;

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

  const sectionBtn = (id: typeof activeSection, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveSection(activeSection === id ? null : id)}
      style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 9, border: `1px solid ${activeSection === id ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.07)"}`, background: activeSection === id ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.04)", cursor: "pointer", color: activeSection === id ? "#a5b4fc" : "#64748b", fontSize: 12, fontWeight: 600, transition: "all .15s", whiteSpace: "nowrap" }}
    >
      {icon}{label}
    </button>
  );

  /* ── Lobby do profissional: layout tela cheia com câmera em destaque ── */
  if (!isGuest) {
    return (
      <div style={{ minHeight: "100vh", background: "#070910", display: "flex", flexDirection: "column", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>

        {/* Barra superior */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", position: "relative", zIndex: 10, flexShrink: 0 }}>
          <img src={logoUrl} alt="Plaelo" style={{ height: 32, objectFit: "contain", opacity: 0.9, background: "#fff", borderRadius: 8, padding: 3 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Sala pronta</span>
          </div>
        </div>

        {/* Corpo principal */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 28px 28px", gap: 28, minHeight: 0 }} className="host-lobby-body">

          {/* ── Câmera grande ── */}
          <div style={{ flex: "0 0 auto", width: "min(520px, 55vw)", aspectRatio: "16/10", borderRadius: 20, overflow: "hidden", background: "#0d0f18", position: "relative", boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)" }} className="host-cam-wrap">
            <video ref={videoRef} autoPlay muted playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover", display: camOn && !deviceError ? "block" : "none", transform: "scaleX(-1)" }} />
            {deviceError ? (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
                <Shield size={36} color="#f87171" />
                <span style={{ fontSize: 13, color: "#fca5a5", fontWeight: 600, maxWidth: 320 }}>{deviceError}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Você ainda pode entrar na sala sem câmera/microfone.</span>
              </div>
            ) : !camOn && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, color: "#fff", boxShadow: "0 12px 32px rgba(99,102,241,0.4)" }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>Câmera desligada</span>
              </div>
            )}
            {/* Gradiente inferior */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100, background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", pointerEvents: "none" }} />
            {/* Badge nome */}
            <div style={{ position: "absolute", bottom: 52, left: 16, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(10px)", borderRadius: 8, padding: "4px 12px", fontSize: 13, fontWeight: 700, color: "#e2e8f0", letterSpacing: "-.1px" }}>
              {displayName}
            </div>
            {/* Controles mic/cam */}
            <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 12 }}>
              <button onClick={togglePreviewMic} title={micOn ? "Desligar microfone" : "Ligar microfone"}
                style={{ width: 46, height: 46, borderRadius: "50%", border: micOn ? "none" : "1.5px solid rgba(239,68,68,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: micOn ? "rgba(255,255,255,0.15)" : "rgba(220,38,38,0.85)", backdropFilter: "blur(12px)", color: "#fff", transition: "all .15s", flexShrink: 0 }}>
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </button>
              <button onClick={togglePreviewCam} title={camOn ? "Desligar câmera" : "Ligar câmera"}
                style={{ width: 46, height: 46, borderRadius: "50%", border: camOn ? "none" : "1.5px solid rgba(239,68,68,0.6)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: camOn ? "rgba(255,255,255,0.15)" : "rgba(220,38,38,0.85)", backdropFilter: "blur(12px)", color: "#fff", transition: "all .15s", flexShrink: 0 }}>
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              </button>
              {isMobile && camOn && (
                <button onClick={flipCamera} title="Virar câmera"
                  style={{ width: 46, height: 46, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)", color: "#fff", transition: "all .15s", flexShrink: 0 }}>
                  <SwitchCamera size={18} />
                </button>
              )}
            </div>
          </div>

          {/* ── Painel direito ── */}
          <div style={{ flex: "0 0 auto", width: "min(340px, 38vw)", display: "flex", flexDirection: "column", gap: 6 }} className="host-panel">

            {/* Título */}
            <div style={{ marginBottom: 10 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "#f1f5f9", margin: 0, letterSpacing: "-.5px", lineHeight: 1.2 }}>
                Sua sala<br />virtual
              </h1>
              <p style={{ fontSize: 13, color: "#334155", marginTop: 6, margin: "6px 0 0" }}>Pronto para iniciar a sessão?</p>
            </div>

            {/* Tabs de seção */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              {sectionBtn("link", "Convidar", <LinkIcon size={11} />)}
              {sectionBtn("devices", "Dispositivos", <Settings size={11} />)}
              {sectionBtn("recording", "Gravação", <Circle size={11} />)}
            </div>

            {/* Seção: Link */}
            {activeSection === "link" && (
              <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>Link do paciente</p>
                <div style={{ background: "rgba(0,0,0,0.35)", borderRadius: 9, padding: "9px 12px", fontSize: 11, color: "#4b5563", fontFamily: "monospace", wordBreak: "break-all", lineHeight: 1.6, userSelect: "all" }}>
                  {guestUrl}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={copyLink} style={{ flex: 1, height: 40, borderRadius: 10, background: copied ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.06)", border: `1px solid ${copied ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.1)"}`, color: copied ? "#86efac" : "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all .15s" }}>
                    {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
                  </button>
                  <button onClick={sendWhatsApp} style={{ flex: 1, height: 40, borderRadius: 10, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#86efac", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#86efac"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Seção: Dispositivos */}
            {activeSection === "devices" && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>Dispositivos</p>
                {videoDevices.length > 0 && <DeviceSelect label="Câmera" devices={videoDevices} value={selectedVideo} onChange={handleVideoDevice} icon={<Video size={11} />} />}
                {audioDevices.length > 0 && <DeviceSelect label="Microfone" devices={audioDevices} value={selectedAudio} onChange={handleAudioDevice} icon={<Mic size={11} />} />}
                {audioOutDevices.length > 0 && <DeviceSelect label="Alto-falante" devices={audioOutDevices} value={selectedAudioOut} onChange={setSelectedAudioOut} icon={<Shield size={11} />} />}
              </div>
            )}

            {/* Seção: Gravação */}
            {activeSection === "recording" && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: ".06em", margin: 0 }}>Gravação da sessão</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", margin: 0 }}>Gravar automaticamente</p>
                      <p style={{ fontSize: 11, color: "#334155", margin: "2px 0 0" }}>Inicia ao entrar na sala</p>
                    </div>
                    <Toggle on={preferences.sessions?.autoRecord ?? false} onChange={v => updatePreference('sessions', { autoRecord: v })} />
                  </div>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#cbd5e1", margin: 0 }}>Transcrever ao encerrar</p>
                      <p style={{ fontSize: 11, color: "#334155", margin: "2px 0 0" }}>Gera transcrição automática</p>
                    </div>
                    <Toggle on={preferences.sessions?.autoTranscribe ?? false} onChange={v => updatePreference('sessions', { autoTranscribe: v })} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            {/* Botão iniciar */}
            <button onClick={onJoin} disabled={!canJoin}
              style={{ marginTop: 8, width: "100%", height: 54, borderRadius: 14, fontWeight: 900, fontSize: 16, color: "#fff", background: canJoin ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(99,102,241,0.2)", border: "none", cursor: canJoin ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: canJoin ? "0 8px 28px rgba(99,102,241,0.5)" : "none", transition: "all .2s", letterSpacing: "-.2px" }}>
              {joining ? <><Spinner /> Conectando...</> : <><Video size={18} /> Iniciar sessão</>}
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 2 }}>
              <Shield size={11} color="#1e3a4c" />
              <span style={{ fontSize: 11, color: "#1e3a4c" }}>Conexão segura e criptografada</span>
            </div>
          </div>
        </div>

        <style>{`
          @media(max-width:768px){
            .host-lobby-body { flex-direction: column !important; padding: 0 16px 20px !important; gap: 16px !important; }
            .host-cam-wrap { width: 100% !important; aspect-ratio: 4/3 !important; }
            .host-panel { width: 100% !important; }
          }
        `}</style>
      </div>
    );
  }

  /* ── Lobby do paciente (guest): layout card compacto ── */
  return (
    <div style={{ minHeight: "100vh", background: "#080a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 16px 24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      <div style={{ marginBottom: 16 }} className="lobby-logo">
        <img src={roomInfo.clinic_logo_url || logoUrl} alt={roomInfo.company_name || "Plaelo"} style={{ height: 28, objectFit: "contain", opacity: 0.9, background: "#fff", borderRadius: 8, padding: 3 }} />
      </div>

      <div style={{ width: "100%", maxWidth: 760, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: "#12151e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 22, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.75)" }} className="lobby-grid lobby-guest">

        {/* ── Câmera ── */}
        <div style={{ position: "relative", background: "#0a0c12", minHeight: 320, display: "flex", flexDirection: "column" }} className="lobby-cam-col">
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", flex: 1, display: camOn && !deviceError ? "block" : "none", minHeight: 320, transform: "scaleX(-1)" }} className="lobby-cam-video" />
          {deviceError ? (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "#0a0c12", padding: 20, textAlign: "center" }}>
              <Shield size={30} color="#f87171" />
              <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 600, maxWidth: 260 }}>{deviceError}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>Você ainda pode entrar na sala sem câmera/microfone.</span>
            </div>
          ) : !camOn && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: "#0a0c12" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#0284c7,#0369a1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800, color: "#fff", boxShadow: "0 8px 24px rgba(2,132,199,0.35)" }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: "#334155" }}>Câmera desligada</span>
            </div>
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 50, left: 12, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", borderRadius: 7, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>
            {displayName}
          </div>
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10 }}>
            <button onClick={togglePreviewMic} title={micOn ? "Desligar microfone" : "Ligar microfone"}
              style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: micOn ? "rgba(255,255,255,0.18)" : "rgba(220,38,38,0.9)", backdropFilter: "blur(8px)", color: "#fff", transition: "all .15s" }}>
              {micOn ? <Mic size={17} /> : <MicOff size={17} />}
            </button>
            <button onClick={togglePreviewCam} title={camOn ? "Desligar câmera" : "Ligar câmera"}
              style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: camOn ? "rgba(255,255,255,0.18)" : "rgba(220,38,38,0.9)", backdropFilter: "blur(8px)", color: "#fff", transition: "all .15s" }}>
              {camOn ? <Video size={17} /> : <VideoOff size={17} />}
            </button>
            {isMobile && camOn && (
              <button onClick={flipCamera} title="Virar câmera"
                style={{ width: 42, height: 42, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", color: "#fff", transition: "all .15s" }}>
                <SwitchCamera size={17} />
              </button>
            )}
          </div>
        </div>

        {/* ── Formulário guest ── */}
        <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", maxHeight: "90vh" }}>
          <div style={{ padding: "22px 22px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(roomInfo.host_name || roomInfo.company_name) && (
              <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 16, padding: "10px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)" }}>
                {roomInfo.avatar_url
                  ? <img src={roomInfo.avatar_url} alt="" style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 42, height: 42, borderRadius: "50%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{(roomInfo.host_name || "P").charAt(0).toUpperCase()}</div>
                }
                <div style={{ minWidth: 0 }}>
                  {roomInfo.host_name && <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0 }}>{roomInfo.host_name}</p>}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 2 }}>
                    {roomInfo.specialty && <span style={{ fontSize: 11, color: "#94a3b8" }}>{roomInfo.specialty}</span>}
                    {roomInfo.crp && <span style={{ fontSize: 11, color: "#818cf8", background: "rgba(99,102,241,0.12)", padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>CRP {roomInfo.crp}</span>}
                    {roomInfo.company_name && <span style={{ fontSize: 11, color: "#475569" }}>· {roomInfo.company_name}</span>}
                  </div>
                </div>
              </div>
            )}
            {scheduledLabel && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "4px 10px", borderRadius: 99, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.22)" }}>
                <Clock size={11} color="#818cf8" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc" }}>Consulta agendada para {scheduledLabel}</span>
              </div>
            )}
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-.3px" }}>Entrar na consulta</h1>
            <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0" }}>Informe seu nome para aguardar aprovação</p>
          </div>

          <div style={{ flex: 1, padding: "16px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Seu nome completo</label>
              <input type="text" value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canJoin && onJoin()}
                placeholder="Ex: Ana Lima" autoFocus
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#6366f1")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {onGuestRoleChange && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Seu papel nesta sessão (opcional)</label>
                <input type="text" value={guestRole || ""}
                  onChange={e => onGuestRoleChange(e.target.value)}
                  placeholder="Ex: Paciente, Mãe, Pai, Acompanhante"
                  style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#6366f1")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
                />
                <p style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Ajuda o profissional a identificar quem é quem, se mais de uma pessoa entrar na sessão.</p>
              </div>
            )}

            {(videoDevices.length > 0 || audioDevices.length > 0 || audioOutDevices.length > 0) && (
              <div>
                <button onClick={() => setGuestDevicesOpen(v => !v)}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 12, fontWeight: 600, padding: "4px 0" }}>
                  <Settings size={13} />
                  Configurar dispositivos
                  <ChevronDown size={13} style={{ transform: guestDevicesOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                </button>
                {guestDevicesOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                    {videoDevices.length > 0 && <DeviceSelect label="Câmera" devices={videoDevices} value={selectedVideo} onChange={handleVideoDevice} icon={<Video size={11} />} />}
                    {audioDevices.length > 0 && <DeviceSelect label="Microfone" devices={audioDevices} value={selectedAudio} onChange={handleAudioDevice} icon={<Mic size={11} />} />}
                    {audioOutDevices.length > 0 && <DeviceSelect label="Alto-falante" devices={audioOutDevices} value={selectedAudioOut} onChange={setSelectedAudioOut} icon={<Shield size={11} />} />}
                  </div>
                )}
              </div>
            )}

            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                style={{ marginTop: 2, width: 15, height: 15, flexShrink: 0, accentColor: "#6366f1" }}
              />
              <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                Li e concordo com os{" "}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", textDecoration: "underline" }}>termos de atendimento online</a>
                {" "}e a{" "}
                <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" style={{ color: "#a5b4fc", textDecoration: "underline" }}>política de privacidade</a>.
              </span>
            </label>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ padding: "16px 22px 20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={onJoin} disabled={!canJoin}
              style={{ width: "100%", height: 50, borderRadius: 13, fontWeight: 800, fontSize: 15, color: "#fff", background: canJoin ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "rgba(99,102,241,0.25)", border: "none", cursor: canJoin ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, boxShadow: canJoin ? "0 4px 20px rgba(99,102,241,0.4)" : "none", transition: "all .2s" }}>
              {joining ? <><Spinner /> Conectando...</> : "Solicitar entrada"}
            </button>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10 }}>
              <Shield size={11} color="#1e3a4c" />
              <span style={{ fontSize: 11, color: "#1e3a4c" }}>Conexão segura e criptografada</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .lobby-grid { grid-template-columns: 1fr 1fr !important; }
        @media(max-width:600px){
          .lobby-logo { margin-bottom: 10px !important; }
          .lobby-grid { grid-template-columns: 1fr !important; border-radius: 16px !important; }
          .lobby-guest .lobby-cam-col { min-height: 0 !important; max-height: 180px !important; height: 180px !important; }
          .lobby-guest .lobby-cam-video { min-height: 0 !important; }
          .lobby-guest > div:last-child { max-height: none !important; overflow-y: auto !important; }
        }
      `}</style>
    </div>
  );
};


// ── Painel de Convidar ────────────────────────────────────────────────────────
const InvitePanel: React.FC<{ roomCode: string; onClose: () => void }> = ({ roomCode, onClose }) => {
  const [copied, setCopied] = useState(false);
  const guestUrl = `${PUBLIC_BASE_URL}/sala/${roomCode}`;

  const copy = () => {
    navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsapp = () => {
    const msg = `Olá! Sua consulta vai começar em breve.\n\nAcesse sua sala virtual pelo link abaixo:\n${guestUrl}\n\n_Você não precisa de login para entrar._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <UserPlus size={16} color="#6366f1" /> Convidar Paciente
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6 }}>
          Compartilhe o link abaixo com seu paciente. Ele entrará diretamente na sala sem precisar de login.
        </p>

        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
          <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Link da sala</p>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1, fontSize: 12, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>{guestUrl}</span>
            <button onClick={copy} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, background: copied ? "#16a34a" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", gap: 4, transition: "background .2s" }}>
              {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
            </button>
          </div>
        </div>

        <button onClick={whatsapp} style={{ width: "100%", height: 44, borderRadius: 12, background: "#16a34a", border: "none", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Enviar via WhatsApp
        </button>

        <div style={{ padding: 12, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12 }}>
          <p style={{ fontSize: 12, color: "#818cf8", lineHeight: 1.6 }}>
            O paciente verá uma tela pedindo seu nome antes de entrar. Você verá quando ele conectar.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── Painel de dados do paciente vinculado à sala (só host) ────────────────────
type RoomSummaryData = {
  patient: { id: number; name: string; birth_date?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; diagnosis?: string | null };
  records: { id: number; date: string; content: string; type: string; professional_name?: string | null }[];
  tools: { id: number; date: string; tool_type: string; data: any }[];
  comandas: { id: number; date: string; amount: number; sessions_total: number; sessions_used: number; description?: string | null }[];
};

const calcAge = (birthDate?: string | null) => {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
};

const PatientInfoPanel: React.FC<{ patientId: number; onClose: () => void }> = ({ patientId, onClose }) => {
  const [tab, setTab] = useState<"dados" | "prontuario" | "testes" | "pacotes">("dados");
  const [data, setData] = useState<RoomSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<RoomSummaryData>(`/patients/${patientId}/room-summary`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [patientId]);

  const age = calcAge(data?.patient?.birth_date);
  const sectionStyle: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 };
  const tabBtn = (key: typeof tab, label: string) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1, padding: "8px 6px", borderRadius: 8, border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 700, letterSpacing: ".2px",
        background: tab === key ? "rgba(99,102,241,0.2)" : "transparent",
        color: tab === key ? "#a5b4fc" : "#64748b",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={16} color="#6366f1" /> {data?.patient?.name || "Paciente"}
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "10px 12px 0" }}>
        {tabBtn("dados", "Dados")}
        {tabBtn("prontuario", "Prontuário")}
        {tabBtn("testes", "Testes")}
        {tabBtn("pacotes", "Pacotes")}
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} color="#64748b" style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : !data ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>Não foi possível carregar os dados do paciente.</p>
        ) : tab === "dados" ? (
          <div style={sectionStyle}>
            <p style={labelStyle}>Dados cadastrais</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#cbd5e1" }}>
              {age != null && <span>Idade: {age} anos</span>}
              {data.patient.phone && <span>Telefone: {data.patient.phone}</span>}
              {data.patient.whatsapp && <span>WhatsApp: {data.patient.whatsapp}</span>}
              {data.patient.email && <span>E-mail: {data.patient.email}</span>}
              {data.patient.diagnosis && <span>Diagnóstico/Hipótese: {data.patient.diagnosis}</span>}
            </div>
          </div>
        ) : tab === "prontuario" ? (
          data.records.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Nenhuma anotação de prontuário registrada.</p>
          ) : data.records.map(r => (
            <div key={r.id} style={sectionStyle}>
              <p style={labelStyle}>{new Date(r.date).toLocaleDateString('pt-BR')}{r.professional_name ? ` · ${r.professional_name}` : ''}</p>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{String(r.content).slice(0, 300)}</p>
            </div>
          ))
        ) : tab === "testes" ? (
          data.tools.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Nenhum teste clínico registrado.</p>
          ) : data.tools.map(t => (
            <div key={t.id} style={sectionStyle}>
              <p style={labelStyle}>{new Date(t.date).toLocaleDateString('pt-BR')}</p>
              <p style={{ fontSize: 13, color: "#cbd5e1" }}>{t.tool_type}</p>
            </div>
          ))
        ) : (
          data.comandas.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Nenhum pacote em aberto.</p>
          ) : data.comandas.map(c => (
            <div key={c.id} style={sectionStyle}>
              <p style={labelStyle}>{c.description || `Comanda #${c.id}`}</p>
              <p style={{ fontSize: 13, color: "#cbd5e1" }}>
                {c.sessions_used}/{c.sessions_total} sessões · R$ {Number(c.amount || 0).toFixed(2)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Painel de anotações rápidas da sessão ─────────────────────────────────────
type QuickNote = { id: number | string; content: string; created_at: string };

const NotesPanel: React.FC<{ patientId: number; appointmentId: number | null; onClose: () => void }> = ({ patientId, appointmentId, onClose }) => {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotes, setSavedNotes] = useState<QuickNote[]>([]);
  const { success: toastSuccess, error: toastError } = useToast();

  const handleSave = async () => {
    const text = content.trim();
    if (!text) return;
    setSaving(true);
    try {
      const res = await api.post<any>('/medical-records', {
        patient_id: patientId,
        appointment_id: appointmentId || undefined,
        content: text,
        record_type: 'Evolucao',
        status: 'Rascunho',
      });
      setSavedNotes(prev => [{ id: res?.id ?? `${Date.now()}`, content: text, created_at: new Date().toISOString() }, ...prev]);
      setContent("");
      toastSuccess('Anotação salva', 'Ficou registrada como rascunho de evolução no prontuário.');
    } catch (err: any) {
      toastError('Erro ao salvar anotação', err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <NotebookPen size={16} color="#6366f1" /> Anotações da sessão
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Anote pontos importantes da sessão..."
          rows={8}
          style={{ width: "100%", resize: "vertical", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, color: "#e2e8f0", fontSize: 13, lineHeight: 1.5, outline: "none" }}
        />
        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", cursor: saving || !content.trim() ? "not-allowed" : "pointer", background: saving || !content.trim() ? "rgba(99,102,241,0.25)" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700 }}
        >
          {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <NotebookPen size={16} />}
          Salvar como rascunho
        </button>
        <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
          Salva direto no prontuário como rascunho de evolução — revise e finalize depois na ficha do paciente.
        </p>

        {savedNotes.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
            <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Salvas nesta sessão</p>
            {savedNotes.map(n => (
              <div key={n.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: 11, color: "#475569", marginBottom: 4 }}>{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Painel de cobrança da sessão ──────────────────────────────────────────────
type ComandaSummary = {
  id: number; total: number | string; paid_value?: number | string; paidValue?: number | string;
  sessions_total?: number; sessions_used?: number; description?: string; status: string;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = { cash: 'Dinheiro', card: 'Cartão', pix: 'Pix', mixed: 'Misto' };

const BillingPanel: React.FC<{ patientId: number; patientName?: string; onClose: () => void }> = ({ patientId, patientName, onClose }) => {
  const [comandas, setComandas] = useState<ComandaSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<ComandaSummary | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  const load = () => {
    setLoading(true);
    api.get<ComandaSummary[]>(`/finance/comandas/patient/${patientId}`)
      .then(rows => setComandas(rows || []))
      .catch(() => setComandas([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [patientId]);

  const handleConfirmPayment = async (method: string, details: any) => {
    if (!paying) return;
    const entries = details.mode === 'mixed' ? details.entries : [{ method, amount: details.amount }];
    for (const entry of entries) {
      await api.post(`/finance/comandas/${paying.id}/payments`, {
        amount: entry.amount,
        payment_method: PAYMENT_METHOD_LABEL[entry.method] || PAYMENT_METHOD_LABEL[method] || 'Pix',
        notes: 'Pagamento registrado durante o atendimento',
      });
    }
    toastSuccess('Pagamento registrado', 'O pagamento foi lançado na comanda do paciente.');
    setPaying(null);
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <Receipt size={16} color="#6366f1" /> Cobrança
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} color="#64748b" style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : comandas.length === 0 ? (
          <p style={{ fontSize: 13, color: "#64748b" }}>Nenhuma comanda em aberto para este paciente.</p>
        ) : (
          comandas.map(c => {
            const total = Number(c.total || 0);
            const paid = Number(c.paidValue ?? c.paid_value ?? 0);
            const remaining = Math.max(0, total - paid);
            return (
              <div key={c.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{c.description || `Comanda #${c.id}`}</p>
                <p style={{ fontSize: 12, color: "#94a3b8" }}>
                  Total R$ {total.toFixed(2)} · Pago R$ {paid.toFixed(2)} · Pendente <strong style={{ color: remaining > 0 ? "#f87171" : "#4ade80" }}>R$ {remaining.toFixed(2)}</strong>
                </p>
                {remaining > 0 && (
                  <button
                    onClick={() => setPaying(c)}
                    style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700 }}
                  >
                    <Receipt size={14} /> Cobrar agora
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {paying && (
        <PaymentModal
          isOpen
          onClose={() => setPaying(null)}
          comanda={{ ...paying, paidAmount: Number(paying.paidValue ?? paying.paid_value ?? 0) }}
          onConfirm={handleConfirmPayment}
          patientName={patientName}
        />
      )}
    </div>
  );
};

// ── Painel de assinatura de contrato ──────────────────────────────────────────
// Reaproveita o fluxo de contract-send já existente no sistema (envio de link
// seguro, assinatura simples com nome+CPF+traço, rastreio enviado/aberto/assinado)
// — não é um sistema de assinatura genérica de qualquer documento nem assinatura
// com certificado ICP-Brasil, é o mesmo contrato de prestação de serviço que já
// existe em Pacientes > Contrato.
type ContractStatus = {
  id: number; status: 'sent' | 'viewed' | 'signed' | 'expired' | 'cancelled'; contract_type: 'online' | 'presencial';
  sent_at?: string; viewed_at?: string; public_link?: string | null;
  signature?: { signer_name: string; signed_at: string } | null;
} | null;

const CONTRACT_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  sent: { label: 'Enviado — aguardando abertura', color: '#facc15' },
  viewed: { label: 'Paciente abriu — aguardando assinatura', color: '#818cf8' },
  signed: { label: 'Assinado', color: '#4ade80' },
  expired: { label: 'Expirado', color: '#f87171' },
  cancelled: { label: 'Cancelado', color: '#64748b' },
};

const SignaturePanel: React.FC<{ patientId: number; onClose: () => void }> = ({ patientId, onClose }) => {
  const [contract, setContract] = useState<ContractStatus>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contractType, setContractType] = useState<'online' | 'presencial'>('online');
  const [copied, setCopied] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const load = () => {
    setLoading(true);
    api.get<ContractStatus>(`/contract-send/${patientId}`)
      .then(setContract)
      .catch(() => setContract(null))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [patientId]);

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post('/contract-send', { patient_id: patientId, contract_type: contractType });
      toastSuccess('Contrato enviado', 'O paciente recebeu o link para assinar.');
      load();
    } catch (err: any) {
      toastError('Erro ao enviar contrato', err?.message || '');
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (!contract) return;
    setSending(true);
    try {
      await api.post(`/contract-send/${contract.id}/resend`, {});
      toastSuccess('Link renovado', 'Um novo link de assinatura foi gerado.');
      load();
    } catch (err: any) {
      toastError('Erro ao reenviar', err?.message || '');
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (!contract?.public_link) return;
    navigator.clipboard.writeText(contract.public_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const status = contract ? CONTRACT_STATUS_LABEL[contract.status] : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <FileSignature size={16} color="#6366f1" /> Contrato / Assinatura
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} color="#64748b" style={{ animation: "spin 1s linear infinite" }} /></div>
        ) : !contract ? (
          <>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>Nenhum contrato enviado a este paciente ainda.</p>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Modalidade</label>
              <select value={contractType} onChange={(e) => setContractType(e.target.value as 'online' | 'presencial')}
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 13, outline: "none" }}>
                <option value="online">Atendimento online</option>
                <option value="presencial">Atendimento presencial</option>
              </select>
            </div>
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", cursor: sending ? "not-allowed" : "pointer", background: sending ? "rgba(99,102,241,0.25)" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700 }}
            >
              {sending ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <FileSignature size={16} />}
              Enviar para assinatura
            </button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Circle size={8} style={{ fill: status?.color, color: status?.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: status?.color }}>{status?.label}</span>
            </div>

            {contract.status === 'signed' && contract.signature ? (
              <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: 13, color: "#cbd5e1" }}>Assinado por <strong>{contract.signature.signer_name}</strong></p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{new Date(contract.signature.signed_at).toLocaleString('pt-BR')}</p>
              </div>
            ) : (
              <>
                {contract.public_link && (
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12 }}>
                    <p style={{ fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Link de assinatura</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ flex: 1, fontSize: 12, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all" }}>{contract.public_link}</span>
                      <button onClick={copyLink} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, background: copied ? "#16a34a" : "rgba(255,255,255,0.08)", border: "none", cursor: "pointer", color: "#fff", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                        {copied ? <><Check size={13} /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleResend}
                  disabled={sending}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", cursor: sending ? "not-allowed" : "pointer", background: "rgba(255,255,255,0.04)", color: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                >
                  {sending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={14} />}
                  Gerar novo link
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Painel de arquivos compartilhados na sessão ───────────────────────────────
// Reaproveita o upload autenticado que já existe (POST /uploads, vinculado ao
// paciente) e só avisa o outro lado do link via canal de dados do LiveKit —
// /uploads-static é servido publicamente, então o paciente (sem login) abre
// o arquivo direto pelo link, sem precisar de nenhuma rota nova no backend.
type SharedFile = { id: string; name: string; url: string; size?: number; sender: string; ts: number };

type LibraryDoc = { id: number; title: string; file_name: string; file_url: string; type: string };

const FilesPanel: React.FC<{ patientId: number | null; isHost: boolean; participantName: string; onClose: () => void }> = ({ patientId, isHost, participantName, onClose }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  // Aba "Biblioteca" — reaproveita os materiais já cadastrados em Documentos
  // (uploads sem paciente vinculado), sem precisar subir arquivo de novo a cada sessão.
  const [tab, setTab] = useState<"send" | "library">("send");
  const [library, setLibrary] = useState<LibraryDoc[] | null>(null);
  useEffect(() => {
    if (tab !== 'library' || library !== null || !isHost) return;
    api.get<LibraryDoc[]>('/uploads')
      .then(docs => setLibrary(docs || []))
      .catch(() => setLibrary([]));
  }, [tab, library, isHost]);

  const shareLibraryDoc = (doc: LibraryDoc) => {
    const rawUrl = doc.file_url || '';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL.replace('/api', '')}${rawUrl}`;
    const entry: SharedFile = { id: `lib-${doc.id}-${Date.now()}`, name: doc.title || doc.file_name, url: fullUrl, sender: participantName, ts: Date.now() };
    setFiles(prev => [entry, ...prev]);
    try {
      localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'psi-file', ...entry })), { reliable: true });
    } catch {}
    toastSuccess('Material compartilhado', `${entry.name} foi enviado na chamada.`);
  };

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-file') return;
      setFiles(prev => [{ id: msg.id, name: msg.name, url: msg.url, size: msg.size, sender: msg.sender, ts: msg.ts }, ...prev]);
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);

  const handleUpload = async (file: File) => {
    if (!patientId) {
      toastError('Sem paciente vinculado', 'Esta sala não tem um paciente vinculado para arquivar o envio.');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('patient_id', String(patientId));
      formData.append('category', 'Sessão de vídeo');
      const res = await api.post<any>('/uploads', formData);
      const rawUrl: string = res?.file_url || res?.url || '';
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL.replace('/api', '')}${rawUrl}`;
      const entry: SharedFile = { id: String(res?.id ?? Date.now()), name: res?.file_name || file.name, url: fullUrl, size: file.size, sender: participantName, ts: Date.now() };
      setFiles(prev => [entry, ...prev]);
      try {
        localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'psi-file', ...entry })), { reliable: true });
      } catch {}
      toastSuccess('Arquivo enviado', `${file.name} foi compartilhado e salvo na ficha do paciente.`);
    } catch (err: any) {
      toastError('Erro ao enviar arquivo', err?.message || '');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <Upload size={16} color="#6366f1" /> Arquivos
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      {isHost && (
        <div style={{ display: "flex", gap: 4, padding: "10px 16px 0" }}>
          <button onClick={() => setTab("send")} style={{ flex: 1, padding: "7px 6px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: tab === "send" ? "rgba(99,102,241,0.2)" : "transparent", color: tab === "send" ? "#a5b4fc" : "#64748b" }}>Enviar</button>
          <button onClick={() => setTab("library")} style={{ flex: 1, padding: "7px 6px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: tab === "library" ? "rgba(99,102,241,0.2)" : "transparent", color: tab === "library" ? "#a5b4fc" : "#64748b" }}>Biblioteca</button>
        </div>
      )}

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {isHost && tab === "send" && (
          <>
            <input ref={fileInputRef} type="file" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", cursor: uploading ? "not-allowed" : "pointer", background: uploading ? "rgba(99,102,241,0.25)" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700 }}
            >
              {uploading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
              Enviar arquivo
            </button>
          </>
        )}

        {isHost && tab === "library" && (
          library === null ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} color="#64748b" style={{ animation: "spin 1s linear infinite" }} /></div>
          ) : library.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Nenhum material cadastrado ainda. Adicione em Documentos, na tela principal do sistema.</p>
          ) : (
            library.map(doc => (
              <button key={doc.id} onClick={() => shareLibraryDoc(doc)}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, textAlign: "left", cursor: "pointer" }}>
                <FileText size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.title || doc.file_name}</span>
              </button>
            ))
          )
        )}

        {(!isHost || tab === "send") && (
          files.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>Nenhum arquivo compartilhado nesta sessão ainda.</p>
          ) : (
            files.map(f => (
              <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, textDecoration: "none" }}>
                <FileText size={18} color="#6366f1" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>{f.sender} · {new Date(f.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </a>
            ))
          )
        )}
      </div>
    </div>
  );
};

// ── Painel de aplicação de instrumento/teste clínico durante a chamada ────────
// Reaproveita o sistema de Formulários que já existe (mesmo backend que a sala
// antiga usava, endpoint /forms/public/by-id já tinha o comentário "usada pela
// sala virtual") — o paciente responde na página pública já pronta, em vez de
// eu reimplementar a renderização de formulário aqui dentro.
type FormListItem = { id: number; title: string; description?: string; category?: string; hash: string };

const InstrumentPanel: React.FC<{ patientId: number | null; isHost: boolean; onClose: () => void }> = ({ patientId, isHost, onClose }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [forms, setForms] = useState<FormListItem[] | null>(null);
  const [sentForm, setSentForm] = useState<{ title: string; url: string } | null>(null);
  const [received, setReceived] = useState<{ title: string; url: string } | null>(null);
  const { success: toastSuccess } = useToast();

  useEffect(() => {
    if (!isHost) return;
    api.get<FormListItem[]>('/forms').then(setForms).catch(() => setForms([]));
  }, [isHost]);

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-instrument') return;
      setReceived({ title: msg.title, url: msg.url });
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room]);

  const handleSend = (form: FormListItem) => {
    const base = `${PUBLIC_BASE_URL}/f/${form.hash}`;
    const url = patientId ? `${base}?p=${patientId}` : base;
    try {
      localParticipant.publishData(new TextEncoder().encode(JSON.stringify({ type: 'psi-instrument', title: form.title, url })), { reliable: true });
    } catch {}
    setSentForm({ title: form.title, url });
    toastSuccess('Instrumento enviado', `${form.title} foi enviado — o paciente responde numa página própria.`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardList size={16} color="#6366f1" /> Aplicar teste
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        {isHost ? (
          <>
            <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
              O paciente responde numa página própria, fora da chamada — ele recebe o link agora mesmo.
            </p>
            {forms === null ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Loader2 size={20} color="#64748b" style={{ animation: "spin 1s linear infinite" }} /></div>
            ) : forms.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b" }}>Nenhum formulário cadastrado. Crie um em Formulários, na tela principal do sistema.</p>
            ) : (
              forms.map(f => (
                <button key={f.id} onClick={() => handleSend(f)}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, textAlign: "left", cursor: "pointer" }}>
                  <ClipboardList size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{f.title}</span>
                </button>
              ))
            )}
            {sentForm && (
              <div style={{ marginTop: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 12, padding: 12 }}>
                <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>{sentForm.title} enviado ✓</p>
                <a href={sentForm.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#94a3b8" }}>Ver a página do paciente</a>
              </div>
            )}
          </>
        ) : received ? (
          <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontSize: 13, color: "#e2e8f0" }}>Seu profissional pediu que você responda: <strong>{received.title}</strong></p>
            <a href={received.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
              Responder agora <ExternalLink size={14} />
            </a>
            <p style={{ fontSize: 11, color: "#64748b" }}>Abre em outra aba — você pode voltar pra chamada quando terminar.</p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: "#64748b" }}>Nenhum teste enviado nesta sessão ainda.</p>
        )}
      </div>
    </div>
  );
};

// ── Sala privada temporária (breakout) ────────────────────────────────────────
// Em vez de manter duas conexões LiveKit simultâneas na mesma aba (arriscado e
// difícil de validar sem testar em dispositivo real), cria uma sala normal nova
// via POST /virtual-rooms — a mesma rota que a tela de Salas Virtuais usa — e
// navega o host e o participante convidado pra lá, com um link de volta.
const BreakoutPanel: React.FC<{
  roomId: string; roomCode: string; remoteParticipants: (LocalParticipant | RemoteParticipant)[]; onClose: () => void;
}> = ({ roomId, roomCode, remoteParticipants, onClose }) => {
  const { localParticipant } = useLocalParticipant();
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const [creating, setCreating] = useState<string | null>(null);

  const handleInvite = async (participant: LocalParticipant | RemoteParticipant) => {
    setCreating(participant.identity);
    try {
      const res = await api.post<any>('/virtual-rooms', {
        title: `Conversa privada — ${participant.name || 'participante'}`,
        code: `${roomCode}-priv-${Math.random().toString(36).slice(2, 8)}`,
      });
      const newCode = res?.code || `${roomCode}-priv-${Date.now()}`;
      const payload = new TextEncoder().encode(JSON.stringify({
        type: 'psi-breakout-invite', roomCode: newCode, targetIdentity: participant.identity, fromName: localParticipant.name || 'Profissional',
      }));
      localParticipant.publishData(payload, { reliable: true });
      navigate(`/sala/${newCode}?returnTo=${encodeURIComponent(roomId)}`);
    } catch (err: any) {
      toastError('Erro ao criar sala privada', err?.message || '');
      setCreating(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={16} color="#6366f1" /> Conversa privada
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 10, overflowY: "auto" }}>
        <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>
          Escolha com quem conversar em particular. Vocês dois vão pra uma sala separada; os demais continuam na sala principal. Dá pra voltar quando quiser.
        </p>
        {remoteParticipants.map(p => {
          let role: string | undefined;
          try { role = JSON.parse(p.metadata || '{}')?.role; } catch {}
          return (
            <button key={p.identity} onClick={() => handleInvite(p)} disabled={!!creating}
              style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, textAlign: "left", cursor: creating ? "not-allowed" : "pointer" }}>
              {creating === p.identity ? <Loader2 size={16} color="#6366f1" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }} /> : <UserPlus size={16} color="#6366f1" style={{ flexShrink: 0 }} />}
              <span style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.name || p.identity}{role ? ` · ${role}` : ""}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ── Painel de agendamento de retorno ──────────────────────────────────────────
const SchedulePanel: React.FC<{ patientId: number; professionalId?: number | null; onClose: () => void }> = ({ patientId, professionalId, onClose }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const localDateISO = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  const [date, setDate] = useState(() => localDateISO(tomorrow));
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(50);
  const [saving, setSaving] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [manualTime, setManualTime] = useState(false);
  const [profileSchedule, setProfileSchedule] = useState<any[]>([]);
  const [closedDates, setClosedDates] = useState<{ date: string; label?: string }[]>([]);
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<{ date: string; time: string } | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    api.get<any>('/profile/me').then(profile => {
      const parse = (value: any, fallback: any[]) => {
        if (Array.isArray(value)) return value;
        try { return JSON.parse(value || '[]'); } catch { return fallback; }
      };
      setProfileSchedule(parse(profile?.schedule, []));
      setClosedDates(parse(profile?.closed_dates, []));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!date) return;
    setLoadingSlots(true);
    setTime('');
    api.get<any[]>('/appointments', professionalId ? {
      professional_id: String(professionalId),
    } : undefined).then(rows => setDayAppointments(rows || []))
      .catch(() => setDayAppointments([]))
      .finally(() => setLoadingSlots(false));
  }, [date, professionalId]);

  const availableSlots = useMemo(() => {
    if (!date) return [] as string[];
    if (closedDates.some(item => String(item.date).slice(0, 10) === date)) return [] as string[];
    const selectedDate = new Date(`${date}T12:00:00`);
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const workDay = profileSchedule.find(item => item.dayKey === dayKeys[selectedDate.getDay()]);
    if (!workDay?.active || !workDay.start || !workDay.end) return [] as string[];
    const toMinutes = (value: string) => {
      const [hours, minutes] = value.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const formatMinutes = (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
    const breaks = (workDay.breaks || (workDay.lunchStart ? [{ start: workDay.lunchStart, end: workDay.lunchEnd }] : []))
      .filter((item: any) => item.start && item.end)
      .map((item: any) => ({ start: toMinutes(item.start), end: toMinutes(item.end) }));
    const occupied = dayAppointments
      .filter(item => !['cancelled', 'rescheduled'].includes(item.status))
      .map(item => {
        const raw = String(item.start_time || item.appointment_date || '').replace(' ', 'T');
        const start = new Date(raw && !raw.endsWith('Z') && !raw.includes('+') ? `${raw}Z` : raw);
        return { start, end: new Date(start.getTime() + (Number(item.duration_minutes) || 50) * 60000) };
      });
    const slots: string[] = [];
    const now = new Date();
    for (let minute = toMinutes(workDay.start); minute + duration <= toMinutes(workDay.end); minute += 30) {
      const slotTime = formatMinutes(minute);
      const slotStart = new Date(`${date}T${slotTime}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60000);
      const inBreak = breaks.some((pause: any) => minute < pause.end && minute + duration > pause.start);
      const conflict = occupied.some(item => slotStart < item.end && slotEnd > item.start);
      if (!inBreak && !conflict && slotStart > now) slots.push(slotTime);
    }
    return slots;
  }, [date, duration, profileSchedule, closedDates, dayAppointments]);

  const openFullAgenda = () => {
    const params = new URLSearchParams({ newAppointment: '1', patientId: String(patientId) });
    if (professionalId) params.set('professionalId', String(professionalId));
    if (date) params.set('date', `${date}T${time || '08:00'}`);
    window.open(`/agenda?${params.toString()}`, '_blank', 'noopener,noreferrer');
  };

  const handleSchedule = async () => {
    if (!date || !time) return;
    setSaving(true);
    try {
      await api.post('/appointments', {
        patient_id: patientId,
        professional_id: professionalId || undefined,
        start_time: `${date}T${time}:00`,
        duration_minutes: duration,
        title: 'Retorno',
        status: 'scheduled',
      });
      setScheduled({ date, time });
      toastSuccess('Retorno agendado', 'A próxima sessão já está na agenda.');
    } catch (err: any) {
      toastError('Erro ao agendar retorno', err?.message || '');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#475569", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <CalendarPlus size={16} color="#6366f1" /> Agendar retorno
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, padding: 16, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        {scheduled ? (
          <div style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#4ade80" }}>Retorno agendado ✓</p>
            <p style={{ fontSize: 13, color: "#cbd5e1" }}>{new Date(`${scheduled.date}T${scheduled.time}`).toLocaleDateString('pt-BR')} às {scheduled.time}</p>
            <button onClick={() => setScheduled(null)} style={{ alignSelf: "flex-start", marginTop: 6, background: "none", border: "none", color: "#a5b4fc", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Agendar outra data</button>
          </div>
        ) : (
          <>
            <div>
              <label style={labelStyle}>Data</label>
              <DatePicker value={date} onChange={value => { setDate(value || ''); setManualTime(false); }} min={localDateISO(new Date())} />
            </div>
            <div>
              <label style={labelStyle}>Horários disponíveis</label>
              {loadingSlots ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#94a3b8', fontSize: 12 }}><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Consultando agenda…</div>
              ) : availableSlots.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
                  {availableSlots.map(slot => <button key={slot} onClick={() => { setTime(slot); setManualTime(false); }} style={{ padding: '8px 4px', borderRadius: 9, border: `1px solid ${time === slot && !manualTime ? '#6366f1' : 'rgba(255,255,255,.1)'}`, background: time === slot && !manualTime ? '#4f46e5' : 'rgba(255,255,255,.04)', color: '#e2e8f0', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{slot}</button>)}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#f59e0b', lineHeight: 1.5 }}>Não há horários livres configurados nesta data.</p>
              )}
              <button onClick={() => { setManualTime(true); setTime(''); }} style={{ marginTop: 9, background: 'none', border: 'none', padding: 0, color: '#a5b4fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Criar horário fora da disponibilidade</button>
              {manualTime && <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, marginTop: 8 }} />}
            </div>
            <div>
              <label style={labelStyle}>Duração (minutos)</label>
              <input type="number" min={10} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 50)} style={inputStyle} />
            </div>
            <button
              onClick={handleSchedule}
              disabled={saving || !date || !time}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 14px", borderRadius: 10, border: "none", cursor: saving || !date || !time ? "not-allowed" : "pointer", background: saving || !date || !time ? "rgba(99,102,241,0.25)" : "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700 }}
            >
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CalendarPlus size={16} />}
              Agendar retorno
            </button>
            <button onClick={openFullAgenda} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(99,102,241,.45)', background: 'rgba(99,102,241,.1)', color: '#a5b4fc', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              <ExternalLink size={14} /> Agenda completa · comandas e repetições
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Quadro branco compartilhado (canvas + canal de dados do LiveKit) ─────────
// Sem persistência: quem entra depois ou reabre o painel não vê traços antigos —
// é um recurso "ao vivo" pra desenhar junto durante a conversa, não um documento.
type WBStroke = { x0: number; y0: number; x1: number; y1: number; color: string; width: number; erase?: boolean };

const WHITEBOARD_COLORS = ['#f43f5e', '#6366f1', '#22c55e', '#f59e0b', '#0ea5e9', '#1e293b'];

const WhiteboardPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(WHITEBOARD_COLORS[0]);
  const [eraser, setEraser] = useState(false);

  const drawSegment = useCallback((s: WBStroke) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = s.erase ? 'destination-out' : 'source-over';
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.beginPath();
    ctx.moveTo(s.x0 * canvas.width, s.y0 * canvas.height);
    ctx.lineTo(s.x1 * canvas.width, s.y1 * canvas.height);
    ctx.stroke();
  }, []);

  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-whiteboard') return;
      if (msg.action === 'stroke' && msg.stroke) drawSegment(msg.stroke);
      else if (msg.action === 'clear') {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room, drawSegment]);

  // Ajusta a resolução do canvas ao tamanho real do elemento, senão o traço fica borrado
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  };

  const broadcast = (msg: any) => {
    try {
      localParticipant.publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true });
    } catch {}
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !lastPointRef.current) return;
    const point = getPoint(e);
    const stroke: WBStroke = { x0: lastPointRef.current.x, y0: lastPointRef.current.y, x1: point.x, y1: point.y, color, width: eraser ? 18 : 3, erase: eraser };
    drawSegment(stroke);
    broadcast({ type: 'psi-whiteboard', action: 'stroke', stroke });
    lastPointRef.current = point;
  };
  const handlePointerUp = () => { drawingRef.current = false; lastPointRef.current = null; };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    broadcast({ type: 'psi-whiteboard', action: 'clear' });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <PenTool size={16} color="#6366f1" /> Quadro branco
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {WHITEBOARD_COLORS.map(c => (
          <button key={c} onClick={() => { setColor(c); setEraser(false); }}
            style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: !eraser && color === c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer", padding: 0 }} />
        ))}
        <button onClick={() => setEraser(v => !v)} title="Borracha"
          style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: eraser ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)", color: eraser ? "#a5b4fc" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Eraser size={14} />
        </button>
        <button onClick={handleClear} title="Limpar tudo"
          style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.08)", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Trash2 size={14} />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ flex: 1, width: "100%", background: "#fff", touchAction: "none", cursor: "crosshair" }}
      />
    </div>
  );
};

// ── Tile de vídeo usando useParticipantTracks (um hook por participante) ──────
const ParticipantVideo: React.FC<{
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  style?: React.CSSProperties;
  objectFit?: "cover" | "contain";
  hideName?: boolean;
  forceSource?: Track.Source.Camera | Track.Source.ScreenShare;
  isFrontCamera?: boolean;
}> = ({ participant, isLocal, style, objectFit = "cover", hideName = false, forceSource, isFrontCamera = true }) => {
  const tracks = useParticipantTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    participant.identity
  );
  const camTrack = tracks.find(t => t.source === Track.Source.Camera);
  const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  // forceSource permite exibir câmera mesmo quando há screen share ativo
  const activeTrack = forceSource
    ? (forceSource === Track.Source.Camera ? camTrack : screenTrack)
    : (screenTrack || camTrack);
  const isCamOn = !!activeTrack;
  const initials = (participant.name || participant.identity)?.charAt(0).toUpperCase() || "?";
  const avatarSize = objectFit === "contain" ? 80 : 52;

  // Espelha só a própria câmera local (convenção de todo app de chamada — a
  // pessoa se vê como num espelho); nunca a câmera remota nem screen share,
  // que trocaria a lateralidade de quem aponta pra algo ou viraria texto ilegível.
  const shouldMirror = isLocal && isFrontCamera && activeTrack?.source === Track.Source.Camera;

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#111827", ...style }}>
      {isCamOn && activeTrack
        ? <VideoTrack trackRef={activeTrack} style={{ width: "100%", height: "100%", objectFit, transform: shouldMirror ? "scaleX(-1)" : undefined }} />
        : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", background: isLocal ? "#4f46e5" : "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: avatarSize * 0.4, fontWeight: 800, color: "#fff" }}>
              {initials}
            </div>
            {objectFit !== "cover" && <span style={{ fontSize: 12, color: "#475569" }}>Câmera desligada</span>}
          </div>
        )
      }
      {!hideName && (() => {
        let role: string | undefined;
        try { role = JSON.parse(participant.metadata || '{}')?.role; } catch {}
        return (
          <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: "#fff", maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {participant.name || participant.identity}{isLocal ? " (Você)" : ""}{role ? ` · ${role}` : ""}
          </div>
        );
      })()}
      {!participant.isMicrophoneEnabled && !hideName && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(220,38,38,0.9)", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MicOff size={12} color="#fff" />
        </div>
      )}
    </div>
  );
};

// ── Grade de participantes (atendimento em grupo — família, casal) ────────────
// Ativa só quando há 2+ participantes remotos; sessão individual (o caso comum)
// continua usando o layout principal+PiP acima, sem nenhuma mudança de risco.
const GroupGrid: React.FC<{
  participants: (LocalParticipant | RemoteParticipant)[]; localIdentity: string; isFrontCamera: boolean;
}> = ({ participants, localIdentity, isFrontCamera }) => {
  const count = participants.length;
  const cols = count <= 2 ? 1 : count <= 4 ? 2 : 3;
  return (
    <div style={{ width: "100%", height: "100%", display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, padding: 4, boxSizing: "border-box" }}>
      {participants.map(p => (
        <ParticipantVideo
          key={p.identity}
          participant={p}
          isLocal={p.identity === localIdentity}
          isFrontCamera={isFrontCamera}
          style={{ width: "100%", height: "100%", borderRadius: 10 }}
          objectFit="cover"
        />
      ))}
    </div>
  );
};

// ── Chat via LiveKit data channel ─────────────────────────────────────────────
type CachedChatMessage = { id: string; sender: string; senderName?: string; message: string; timestamp: number };
// Mantém cada envio muito abaixo do limite de 25 MB da API de transcrição,
// inclusive em celulares que gravam Opus com bitrate mais alto.
const TRANSCRIPTION_SEGMENT_MS = 8 * 60 * 1000;

const LiveKitChatPanel: React.FC<{
  participantName: string; roomId: string; localIdentity: string; onClose: () => void;
  chatMessages: ReturnType<typeof useChat>['chatMessages'];
  send: ReturnType<typeof useChat>['send'];
  isSending: boolean;
}> = ({ participantName, roomId, localIdentity, onClose, chatMessages, send, isSending }) => {
  const [newMessage, setNewMessage] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const storageKey = `psi_room_chat_${roomId}`;
  const [cachedMessages, setCachedMessages] = useState<CachedChatMessage[]>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });

  const messageId = (sender: string, timestamp: number, message: string) => `${sender}:${timestamp}:${message}`;
  const visibleMessages = (() => {
    const all = new Map<string, CachedChatMessage>();
    cachedMessages.forEach(message => all.set(message.id, message));
    chatMessages.forEach(message => {
      const sender = message.from?.identity || "participante";
      const timestamp = message.timestamp || Date.now();
      const id = messageId(sender, timestamp, message.message);
      all.set(id, { id, sender, senderName: message.from?.name, message: message.message, timestamp });
    });
    return [...all.values()].sort((a, b) => a.timestamp - b.timestamp);
  })();

  useEffect(() => {
    if (!chatMessages.length) return;
    setCachedMessages(previous => {
      const next = new Map(previous.map(message => [message.id, message]));
      chatMessages.forEach(message => {
        const sender = message.from?.identity || "participante";
        const timestamp = message.timestamp || Date.now();
        const id = messageId(sender, timestamp, message.message);
        next.set(id, { id, sender, senderName: message.from?.name, message: message.message, timestamp });
      });
      return [...next.values()].slice(-200);
    });
  }, [chatMessages]);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(cachedMessages)); } catch {}
  }, [cachedMessages, storageKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [visibleMessages.length]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text || isSending) return;
    setSendError(null);
    try {
      await send(text);
      setNewMessage("");
    } catch (err: any) {
      setSendError(err?.message || 'Não foi possível enviar a mensagem. Verifique a conexão e tente novamente.');
    }
  };

  const fmtTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={16} color="#6366f1" /> Chat
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {visibleMessages.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 20 }}>Nenhuma mensagem ainda</p>
        )}
        {visibleMessages.map((msg) => {
          const isMe = msg.sender === localIdentity || msg.sender === participantName;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {!isMe && <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>{msg.senderName || msg.sender}</span>}
              <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: isMe ? "#4f46e5" : "rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>
                {msg.message}
              </div>
              <span style={{ fontSize: 10, color: isMe ? "#818cf8" : "#334155", marginTop: 2 }}>
                {fmtTime(msg.timestamp)}{isMe ? " · Enviada" : ""}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {sendError && <p style={{ margin: "0 12px 8px", color: "#f87171", fontSize: 11 }}>{sendError}</p>}
      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          type="text" value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSend(); } }}
          placeholder="Mensagem..."
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <button onClick={() => { void handleSend(); }} disabled={!newMessage.trim() || isSending}
          style={{ padding: 8, borderRadius: 10, background: newMessage.trim() ? "#4f46e5" : "rgba(255,255,255,0.05)", border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

// ── Hook para detectar screen share de um participante ──────────────────────
const useHasScreenShare = (identity: string) => {
  const tracks = useParticipantTracks([Track.Source.ScreenShare], identity);
  return tracks.length > 0;
};

// ── Painel de configurações de dispositivos ──────────────────────────────────
const QUALITY_LABEL: Record<string, { label: string; color: string }> = {
  [ConnectionQuality.Excellent]: { label: "Excelente", color: "#4ade80" },
  [ConnectionQuality.Good]: { label: "Boa", color: "#facc15" },
  [ConnectionQuality.Poor]: { label: "Instável", color: "#f87171" },
  [ConnectionQuality.Unknown]: { label: "Desconhecida", color: "#64748b" },
};

const SettingsPanel: React.FC<{
  onClose: () => void; connectionQuality?: ConnectionQuality; remoteConnectionQuality?: ConnectionQuality;
  hasRemote?: boolean; isHost?: boolean; livekitRoomName?: string;
}> = ({ onClose, connectionQuality, remoteConnectionQuality, hasRemote, isHost, livekitRoomName }) => {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagData, setDiagData] = useState<any[] | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const loadDiag = async () => {
    if (!livekitRoomName) return;
    setDiagOpen(true);
    setDiagLoading(true);
    try {
      const data = await api.get<any[]>(`/livekit/diag/${livekitRoomName}`);
      setDiagData(data || []);
    } catch {
      setDiagData([]);
    }
    setDiagLoading(false);
  };
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selCam, setSelCam] = useState("");
  const [selMic, setSelMic] = useState("");
  const [selSpk, setSelSpk] = useState("");
  const [micLevel, setMicLevel] = useState(0);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Teste de microfone usa o track já publicado: não abre um segundo acesso ao
  // microfone e funciona também enquanto a profissional está em atendimento.
  useEffect(() => {
    const track = localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack;
    if (!track) return;
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;
    const update = () => {
      analyser.getByteTimeDomainData(data);
      const volume = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length;
      setMicLevel(Math.min(100, Math.round(volume * 3.2)));
      frame = requestAnimationFrame(update);
    };
    update();
    return () => { cancelAnimationFrame(frame); void context.close(); };
  }, [localParticipant]);

  useEffect(() => {
    let active = true;
    const updateLatency = async () => {
      try {
        const manager = (room as any).engine?.pcManager;
        const reports = await Promise.all([manager?.publisher?.getStats?.(), manager?.subscriber?.getStats?.()]);
        let roundTrip: number | null = null;
        for (const report of reports) {
          if (!report) continue;
          report.forEach((stat: any) => {
            if (roundTrip !== null) return;
            if (stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded' && typeof stat.currentRoundTripTime === 'number') {
              roundTrip = Math.round(stat.currentRoundTripTime * 1000);
            }
            if (stat.type === 'remote-inbound-rtp' && typeof stat.roundTripTime === 'number') {
              roundTrip = Math.round(stat.roundTripTime * 1000);
            }
          });
        }
        if (active) setLatencyMs(roundTrip);
      } catch {}
    };
    void updateLatency();
    const interval = window.setInterval(updateLatency, 2000);
    return () => { active = false; window.clearInterval(interval); };
  }, [room]);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      setCameras(devs.filter(d => d.kind === "videoinput"));
      setMics(devs.filter(d => d.kind === "audioinput"));
      setSpeakers(devs.filter(d => d.kind === "audiooutput"));
    });
  }, []);

  const applyCamera = async (deviceId: string) => {
    setSelCam(deviceId);
    try { await room.switchActiveDevice("videoinput", deviceId); } catch {}
  };
  const applyMic = async (deviceId: string) => {
    setSelMic(deviceId);
    try { await room.switchActiveDevice("audioinput", deviceId); } catch {}
  };
  const applySpk = async (deviceId: string) => {
    setSelSpk(deviceId);
    try { await room.switchActiveDevice("audiooutput", deviceId); } catch {}
  };

  const selStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8, padding: "8px 10px", color: "#e2e8f0", fontSize: 13, outline: "none", cursor: "pointer",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: ".5px", textTransform: "uppercase", marginBottom: 6 };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <Settings size={16} color="#6366f1" /> Configurações
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, display: "flex" }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 20 }}>
        {(connectionQuality !== undefined || hasRemote) && (
          <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ margin: "0 0 10px", fontSize: 11, color: "#94a3b8", fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase" }}>Qualidade da chamada</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasRemote ? 6 : 0 }}>
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>Sua conexão</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: QUALITY_LABEL[connectionQuality ?? ConnectionQuality.Unknown].color, display: "flex", alignItems: "center", gap: 6 }}>
                <Circle size={7} style={{ fill: "currentColor" }} /> {QUALITY_LABEL[connectionQuality ?? ConnectionQuality.Unknown].label}
              </span>
            </div>
            {hasRemote && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "#cbd5e1" }}>{isHost ? "Paciente" : "Profissional"}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: QUALITY_LABEL[remoteConnectionQuality ?? ConnectionQuality.Unknown].color, display: "flex", alignItems: "center", gap: 6 }}>
                  <Circle size={7} style={{ fill: "currentColor" }} /> {QUALITY_LABEL[remoteConnectionQuality ?? ConnectionQuality.Unknown].label}
                </span>
              </div>
            )}
            {isHost && livekitRoomName && (
              <>
                <button onClick={loadDiag} style={{ marginTop: 10, background: "none", border: "none", cursor: "pointer", color: "#818cf8", fontSize: 11, fontWeight: 700, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <ChevronDown size={12} style={{ transform: diagOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} /> Detalhes técnicos
                </button>
                {diagOpen && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {diagLoading ? (
                      <Loader2 size={14} color="#64748b" style={{ animation: "spin 1s linear infinite" }} />
                    ) : !diagData?.length ? (
                      <p style={{ fontSize: 11, color: "#64748b" }}>Sem dados de participantes conectados.</p>
                    ) : (
                      diagData.map((p: any) => (
                        <div key={p.identity} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: 8 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>{p.name || p.identity}</p>
                          {(p.tracks || []).map((t: any) => (
                            <p key={t.sid} style={{ fontSize: 10, color: "#64748b", margin: 0 }}>
                              {t.type === 1 ? "Vídeo" : t.type === 0 ? "Áudio" : "Dados"}
                              {t.width ? ` · ${t.width}x${t.height}` : ""}{t.muted ? " · mudo" : ""}
                            </p>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div style={{ padding: 12, borderRadius: 10, background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.22)" }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, color: "#c7d2fe", fontWeight: 800, letterSpacing: ".5px", textTransform: "uppercase" }}>Teste de áudio e conexão</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>Microfone</span>
            <div style={{ width: 120, height: 7, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,.12)" }}>
              <div style={{ width: `${micLevel}%`, height: "100%", transition: "width .08s", background: micLevel > 75 ? "#f59e0b" : "#22c55e" }} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>Latência</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: latencyMs === null ? "#94a3b8" : latencyMs > 250 ? "#fbbf24" : "#86efac" }}>
              {latencyMs === null ? "Medindo…" : `${latencyMs} ms`}
            </span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>
            {latencyMs !== null && latencyMs > 250 ? "Latência alta: prefira Wi‑Fi estável ou aproximação do roteador." : "Fale para confirmar que a barra do microfone responde."}
          </p>
        </div>
        {cameras.length > 0 && (
          <div>
            <p style={labelStyle}>Câmera</p>
            <select value={selCam} onChange={e => applyCamera(e.target.value)} style={selStyle}>
              {cameras.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Câmera " + d.deviceId.slice(0,6)}</option>)}
            </select>
          </div>
        )}
        {mics.length > 0 && (
          <div>
            <p style={labelStyle}>Microfone</p>
            <select value={selMic} onChange={e => applyMic(e.target.value)} style={selStyle}>
              {mics.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Microfone " + d.deviceId.slice(0,6)}</option>)}
            </select>
          </div>
        )}
        {speakers.length > 0 && (
          <div>
            <p style={labelStyle}>Alto-falante</p>
            <select value={selSpk} onChange={e => applySpk(e.target.value)} style={selStyle}>
              {speakers.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || "Alto-falante " + d.deviceId.slice(0,6)}</option>)}
            </select>
          </div>
        )}
        {cameras.length === 0 && mics.length === 0 && (
          <p style={{ fontSize: 13, color: "#475569", textAlign: "center", marginTop: 20 }}>Nenhum dispositivo encontrado.<br/>Verifique as permissões do navegador.</p>
        )}
      </div>
    </div>
  );
};

// ── Sala principal ────────────────────────────────────────────────────────────
const RoomInner: React.FC<{
  roomId: string; participantName: string; isHost: boolean; onLeave: (handoff?: { transcript?: string; patientId?: number | null }) => void; roomCode: string;
  initialCam: boolean; initialMic: boolean; videoDeviceId?: string; audioDeviceId?: string;
  lobbyStream?: MediaStream | null; onOpenAurora?: () => void; returnTo?: string | null;
}> = ({ roomId, participantName, isHost, onLeave, roomCode, initialCam, initialMic, videoDeviceId, audioDeviceId, lobbyStream, onOpenAurora, returnTo }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const room = useRoomContext();
  // Fica montado durante toda a chamada. Se fosse criado apenas dentro do painel,
  // mensagens recebidas enquanto o chat estivesse fechado seriam perdidas.
  const roomChat = useChat();
  const { preferences } = useUserPreferences();
  const { user, hasPermission } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const navigate = useNavigate();

  // Sala privada temporária — convite recebido (só relevante pra quem for convidado)
  const [breakoutInvite, setBreakoutInvite] = useState<{ roomCode: string; fromName: string } | null>(null);
  useEffect(() => {
    if (!room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-breakout-invite') return;
      if (msg.targetIdentity !== localParticipant.identity) return;
      setBreakoutInvite({ roomCode: msg.roomCode, fromName: msg.fromName || 'O profissional' });
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [room, localParticipant.identity]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sidePanel, setSidePanel] = useState<"chat" | "invite" | "settings" | "patient" | "notes" | "billing" | "schedule" | "whiteboard" | "signature" | "files" | "instrument" | "breakout" | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const previousChatCountRef = useRef(0);
  useEffect(() => {
    const previousCount = previousChatCountRef.current;
    const newMessages = roomChat.chatMessages.slice(previousCount);
    previousChatCountRef.current = roomChat.chatMessages.length;
    if (sidePanel === 'chat') {
      setUnreadChatCount(0);
      return;
    }
    const remoteNewMessages = newMessages.filter(message => message.from?.identity !== localParticipant.identity);
    if (remoteNewMessages.length) {
      setUnreadChatCount(count => count + remoteNewMessages.length);
      toastSuccess('Nova mensagem no chat', remoteNewMessages[remoteNewMessages.length - 1].message);
    }
  }, [roomChat.chatMessages, sidePanel, localParticipant.identity, toastSuccess]);

  const toggleChatPanel = useCallback(() => {
    setSidePanel(current => {
      const next = current === 'chat' ? null : 'chat';
      if (next === 'chat') setUnreadChatCount(0);
      return next;
    });
  }, []);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [appointmentId, setAppointmentId] = useState<number | null>(null);

  // Descobre se a sala tem paciente/agendamento vinculado, só para o host — os
  // botões de prontuário/anotações/cobrança/agenda só aparecem quando há paciente.
  useEffect(() => {
    if (!isHost || !roomId) return;
    api.get<any>(`/virtual-rooms/${roomId}`)
      .then(room => {
        setPatientId(room?.patient_id || null);
        setAppointmentId(room?.appointment_id || null);
      })
      .catch(() => {});
  }, [isHost, roomId]);
  const [pinned, setPinned] = useState<"remote" | "local">("remote");
  const [roomNotice, setRoomNotice] = useState<{ msg: string; type: 'enter' | 'leave' } | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);
  const [remoteConnectionQuality, setRemoteConnectionQuality] = useState<ConnectionQuality>(ConnectionQuality.Excellent);
  const roomNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevRemoteCountRef = useRef(0);

  const showRoomNotice = useCallback((msg: string, type: 'enter' | 'leave') => {
    if (roomNoticeTimerRef.current) clearTimeout(roomNoticeTimerRef.current);
    setRoomNotice({ msg, type });
    roomNoticeTimerRef.current = setTimeout(() => setRoomNotice(null), 4000);
  }, []);

  useEffect(() => {
    const prev = prevRemoteCountRef.current;
    const curr = remoteParticipants.length;
    if (curr > prev) {
      const name = remoteParticipants[curr - 1]?.name || 'Participante';
      showRoomNotice(`${name} entrou na sala.`, 'enter');
    } else if (curr < prev && prev > 0) {
      showRoomNotice('O participante saiu da sala.', 'leave');
    }
    prevRemoteCountRef.current = curr;
  }, [remoteParticipants, showRoomNotice]);

  // Exibe a instabilidade para os dois lados da sessão. O LiveKit atualiza essa
  // métrica continuamente a partir de perda de pacotes, latência e bitrate.
  useEffect(() => {
    const onQualityChanged = (quality: ConnectionQuality, participant: Participant) => {
      if (participant.identity === localParticipant.identity) setConnectionQuality(quality);
      else setRemoteConnectionQuality(quality);
    };
    room.on(RoomEvent.ConnectionQualityChanged, onQualityChanged);
    return () => { room.off(RoomEvent.ConnectionQualityChanged, onQualityChanged); };
  }, [room, localParticipant.identity]);

  // ── Gravação de áudio ──────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptDone, setTranscriptDone] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionKeyRef = useRef<string>(`sess-${Date.now()}`);
  const recordingAudioCtxRef = useRef<AudioContext | null>(null);
  const localMicStreamRef = useRef<MediaStream | null>(null);
  const recordingDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const connectedRemoteTrackIdsRef = useRef<Set<string>>(new Set());
  const recordingStoppingRef = useRef(false);
  const transcriptPartsRef = useRef<string[]>([]);
  const segmentRotationRef = useRef(false);

  const connectRemoteTrackToRecording = useCallback((mediaTrack: MediaStreamTrack) => {
    const ctx = recordingAudioCtxRef.current;
    const destination = recordingDestinationRef.current;
    if (!ctx || !destination || connectedRemoteTrackIdsRef.current.has(mediaTrack.id)) return;
    connectedRemoteTrackIdsRef.current.add(mediaTrack.id);
    ctx.createMediaStreamSource(new MediaStream([mediaTrack])).connect(destination);
  }, []);

  // Conecta qualquer áudio remoto que chegue DURANTE a gravação (participante
  // entrou depois de já estar gravando, ou a subscrição do track demorou).
  useEffect(() => {
    if (!room) return;
    const onSubscribed = (track: RemoteTrack, _pub: RemoteTrackPublication, _participant: Participant) => {
      if (track.kind === Track.Kind.Audio && recording) connectRemoteTrackToRecording(track.mediaStreamTrack);
    };
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    return () => { room.off(RoomEvent.TrackSubscribed, onSubscribed); };
  }, [room, recording, connectRemoteTrackToRecording]);

  // getUserMedia só captura o microfone local — sem mixar os tracks de áudio
  // remotos (LiveKit) a gravação nunca incluía a voz do paciente. Aqui os dois
  // são somados num destino comum via Web Audio API antes de gravar, incluindo
  // participantes que ainda vão entrar (ver listener de TrackSubscribed acima).
  const startRecording = useCallback(async () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      await ctx.resume();
      recordingAudioCtxRef.current = ctx;
      const destination = ctx.createMediaStreamDestination();
      recordingDestinationRef.current = destination;
      connectedRemoteTrackIdsRef.current = new Set();

      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localMicStreamRef.current = localStream;
      ctx.createMediaStreamSource(localStream).connect(destination);

      for (const participant of remoteParticipants) {
        participant.audioTrackPublications.forEach(pub => {
          const mediaTrack = pub.track?.mediaStreamTrack;
          if (mediaTrack) connectRemoteTrackToRecording(mediaTrack);
        });
      }

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(destination.stream, { mimeType });
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setRecordingError(null);
      setRecording(true);
    } catch {
      setRecordingError('Não foi possível iniciar a gravação. Verifique a permissão do microfone.');
    }
  }, [remoteParticipants]);

  // Só salva o arquivo de áudio misturado (host+paciente) para o prontuário —
  // a transcrição NÃO sai mais daqui. Transcrever o áudio misturado produzia um
  // texto correto, mas rotulado inteiro como uma pessoa só (quem gravou), porque
  // o Whisper não faz diarização. O texto correto vem do pipeline separado
  // abaixo (startMicOnlyCapture/stopMicOnlyCaptureAndUpload), que roda nos dois
  // lados captando só o próprio microfone de cada um.
  const stopAudioRecordingFile = useCallback(async () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive' || recordingStoppingRef.current) return;
    recordingStoppingRef.current = true;
    // O último chunk chega apenas após o evento "stop". Antes, o upload podia
    // receber um arquivo incompleto, sem a voz remota.
    await new Promise<void>((resolve) => {
      mr.addEventListener('stop', () => resolve(), { once: true });
      mr.stop();
    });
    mr.stream.getTracks().forEach(t => t.stop());
    localMicStreamRef.current?.getTracks().forEach(t => t.stop());
    localMicStreamRef.current = null;
    recordingAudioCtxRef.current?.close().catch(() => {});
    recordingAudioCtxRef.current = null;
    recordingDestinationRef.current = null;
    connectedRemoteTrackIdsRef.current = new Set();
    setRecording(false);

    const chunks = audioChunksRef.current;
    if (!chunks.length) {
      recordingStoppingRef.current = false;
      return;
    }

    const actualMime = mr.mimeType || 'audio/webm';
    const recordExt = actualMime.includes('ogg') ? 'ogg' : actualMime.includes('mp4') ? 'mp4' : 'webm';
    const blob = new Blob(chunks, { type: actualMime || 'audio/webm' });
    const sk = sessionKeyRef.current;
    if (preferences.sessions?.saveAudioRecording) {
      const formData = new FormData();
      formData.append('audio', blob, `recording-${sk}.${recordExt}`);
      formData.append('speaker_role', isHost ? 'host' : 'guest');
      formData.append('speaker_name', participantName);
      formData.append('duration_seconds', String(Math.round(elapsedTime)));
      try {
        await api.post<any>(`/virtual-rooms/${roomId}/sessions/${sk}/recordings`, formData);
      } catch {
        setRecordingError('Não foi possível salvar a gravação.');
      }
    }
    recordingStoppingRef.current = false;
  }, [preferences.sessions?.saveAudioRecording, isHost, participantName, roomId, elapsedTime]);

  // ── Transcrição diarizada: cada lado grava e transcreve só o próprio microfone ──
  const micOnlyRecorderRef = useRef<MediaRecorder | null>(null);
  const micOnlyStreamRef = useRef<MediaStream | null>(null);
  const micOnlyChunksRef = useRef<Blob[]>([]);
  const micRotationRef = useRef(false);
  const [localMicCapturing, setLocalMicCapturing] = useState(false);

  const startMicOnlyCapture = useCallback(async () => {
    if (micOnlyRecorderRef.current && micOnlyRecorderRef.current.state !== 'inactive') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micOnlyStreamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      micOnlyChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) micOnlyChunksRef.current.push(e.data); };
      mr.start(1000);
      micOnlyRecorderRef.current = mr;
      setLocalMicCapturing(true);
    } catch {
      // Sem permissão de microfone deste lado — só não haverá texto desta pessoa.
    }
  }, []);

  const stopMicOnlyCaptureAndUpload = useCallback(async () => {
    const mr = micOnlyRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    await new Promise<void>((resolve) => {
      mr.addEventListener('stop', () => resolve(), { once: true });
      mr.stop();
    });
    micOnlyStreamRef.current?.getTracks().forEach(t => t.stop());
    micOnlyStreamRef.current = null;
    micOnlyRecorderRef.current = null;
    setLocalMicCapturing(false);

    const chunks = micOnlyChunksRef.current;
    micOnlyChunksRef.current = [];
    if (!chunks.length) return;

    setTranscribing(true);
    try {
      const actualMime = mr.mimeType || 'audio/webm';
      const ext = actualMime.includes('ogg') ? 'ogg' : actualMime.includes('mp4') ? 'mp4' : 'webm';
      const blob = new Blob(chunks, { type: actualMime });
      const tf = new FormData();
      tf.append('audio', blob, `mic.${ext}`);
      tf.append('language', 'pt');
      const res = await api.post<any>('/ai/transcribe-audio', tf);
      const text: string = res?.text || '';
      if (text) {
        await api.post<any>(`/virtual-rooms/${roomId}/transcripts`, {
          session_key: sessionKeyRef.current,
          speaker_role: isHost ? 'host' : 'guest',
          speaker_name: participantName,
          text,
        });
        transcriptPartsRef.current.push(`${participantName}: ${text}`);
        setTranscriptDone(true);
        setTimeout(() => setTranscriptDone(false), 5000);
      }
    } catch {
      // Falha pontual de transcrição de um segmento não interrompe a sessão.
    }
    setTranscribing(false);
  }, [roomId, isHost, participantName]);

  // Sinaliza início/parada de transcrição pro outro lado via canal de dados do
  // LiveKit — reaproveita a conexão já existente, sem depender do backend antigo.
  const broadcastRecordSignal = useCallback((action: 'start' | 'stop') => {
    try {
      const payload = new TextEncoder().encode(JSON.stringify({ type: 'psi-record', action }));
      localParticipant.publishData(payload, { reliable: true });
    } catch {}
  }, [localParticipant]);

  const handleStartRecording = useCallback(async () => {
    await startRecording();
    await startMicOnlyCapture();
    if (isHost) broadcastRecordSignal('start');
  }, [startRecording, startMicOnlyCapture, isHost, broadcastRecordSignal]);

  const handleStopRecording = useCallback(async () => {
    await stopAudioRecordingFile();
    await stopMicOnlyCaptureAndUpload();
    if (isHost) broadcastRecordSignal('stop');
  }, [stopAudioRecordingFile, stopMicOnlyCaptureAndUpload, isHost, broadcastRecordSignal]);

  // Consentimentos do paciente, lidos do metadata anexado ao token LiveKit no
  // momento da entrada (ver Lobby/handleJoin) — evita round-trip com o backend.
  const myConsent = useMemo(() => {
    try { return JSON.parse(localParticipant.metadata || '{}'); } catch { return {}; }
  }, [localParticipant.metadata]);

  // Paciente: obedece ao sinal do host, só se tiver consentido gravação/transcrição.
  useEffect(() => {
    if (isHost || !room) return;
    const onData = (payload: Uint8Array) => {
      let msg: any;
      try { msg = JSON.parse(new TextDecoder().decode(payload)); } catch { return; }
      if (msg?.type !== 'psi-record') return;
      if (msg.action === 'start' && myConsent.recordingConsent) startMicOnlyCapture();
      else if (msg.action === 'stop') stopMicOnlyCaptureAndUpload();
    };
    room.on(RoomEvent.DataReceived, onData);
    return () => { room.off(RoomEvent.DataReceived, onData); };
  }, [isHost, room, myConsent, startMicOnlyCapture, stopMicOnlyCaptureAndUpload]);

  // Uma gravação longa é dividida em segmentos independentes, todos com a mesma
  // chave de sessão, pra nenhum upload exceder 25 MB — limite da OpenAI Whisper.
  useEffect(() => {
    if (!recording || !isHost) return;
    const timer = window.setTimeout(async () => {
      if (segmentRotationRef.current || recordingStoppingRef.current) return;
      segmentRotationRef.current = true;
      try {
        await stopAudioRecordingFile();
        await startRecording();
      } finally {
        segmentRotationRef.current = false;
      }
    }, TRANSCRIPTION_SEGMENT_MS);
    return () => window.clearTimeout(timer);
  }, [recording, isHost, startRecording, stopAudioRecordingFile]);

  // Mesma rotação por segmento, só que pro pipeline de transcrição própria —
  // roda nos dois lados (host e paciente), não só no host.
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!micOnlyRecorderRef.current || micOnlyRecorderRef.current.state === 'inactive' || micRotationRef.current) return;
      micRotationRef.current = true;
      try {
        await stopMicOnlyCaptureAndUpload();
        await startMicOnlyCapture();
      } finally {
        micRotationRef.current = false;
      }
    }, TRANSCRIPTION_SEGMENT_MS);
    return () => window.clearInterval(timer);
  }, [stopMicOnlyCaptureAndUpload, startMicOnlyCapture]);

  // Auto-inicia gravação se configurado
  useEffect(() => {
    if (isHost && preferences.sessions?.autoRecord) {
      handleStartRecording();
    }
    return () => {
      // Para gravação ao desmontar sem subir a última transcrição.
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      micOnlyRecorderRef.current?.stop();
      micOnlyRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const micOn = isMicrophoneEnabled;
  const camOn = isCameraEnabled;

  // Publica as próprias tracks do lobby. No Android, parar a câmera e chamar
  // getUserMedia novamente logo em seguida pode falhar com NotReadableError,
  // mesmo que seja esta página que ainda esteja liberando o dispositivo.
  const publishedLobbyStreamRef = useRef(false);
  const initialMediaPublishingRef = useRef(false);
  useEffect(() => {
    const apply = async () => {
      if (publishedLobbyStreamRef.current) return;
      publishedLobbyStreamRef.current = true;
      initialMediaPublishingRef.current = true;

      try {
        if (initialCam) {
          const lobbyVideoTrack = lobbyStream?.getVideoTracks()
            .find(track => track.readyState === 'live');
          if (lobbyVideoTrack) {
            lobbyVideoTrack.enabled = true;
            await localParticipant.publishTrack(lobbyVideoTrack, { source: Track.Source.Camera });
          } else {
            const camOpts = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
            await localParticipant.setCameraEnabled(true, camOpts);
          }
        } else if (!initialCam && localParticipant.isCameraEnabled) {
          await localParticipant.setCameraEnabled(false);
        } else {
          lobbyStream?.getVideoTracks().forEach(track => track.stop());
        }

        if (initialMic) {
          const lobbyAudioTrack = lobbyStream?.getAudioTracks()
            .find(track => track.readyState === 'live');
          if (lobbyAudioTrack) {
            lobbyAudioTrack.enabled = true;
            await localParticipant.publishTrack(lobbyAudioTrack, { source: Track.Source.Microphone });
          } else if (!localParticipant.isMicrophoneEnabled) {
            const micOpts = audioDeviceId ? { deviceId: audioDeviceId } : undefined;
            await localParticipant.setMicrophoneEnabled(true, micOpts);
          }
        } else if (!initialMic && localParticipant.isMicrophoneEnabled) {
          await localParticipant.setMicrophoneEnabled(false);
        } else {
          lobbyStream?.getAudioTracks().forEach(track => track.stop());
        }
      } catch (err) {
        // Se a publicação da track existente falhar, só então libera a track do
        // lobby e deixa o LiveKit criar outra. Um pequeno intervalo dá tempo para
        // o driver da câmera móvel realmente liberar o hardware.
        try {
          if (initialCam && !localParticipant.isCameraEnabled) {
            lobbyStream?.getVideoTracks().forEach(track => track.stop());
            await new Promise(resolve => setTimeout(resolve, 350));
            const camOpts = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
            await localParticipant.setCameraEnabled(true, camOpts);
          }
          if (initialMic && !localParticipant.isMicrophoneEnabled) {
            lobbyStream?.getAudioTracks().forEach(track => track.stop());
            const micOpts = audioDeviceId ? { deviceId: audioDeviceId } : undefined;
            await localParticipant.setMicrophoneEnabled(true, micOpts);
          }
        } catch {}
      } finally {
        initialMediaPublishingRef.current = false;
      }
    };

    // Pequeno delay para garantir que o Room está conectado
    const timer = setTimeout(apply, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog: se a câmera deveria estar ligada mas ficou desligada após conexão,
  // tenta religar automaticamente por até 15s (a cada 3s).
  const camWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const camWatchdogAttemptsRef = useRef(0);
  useEffect(() => {
    if (!initialCam) return;
    if (isCameraEnabled) {
      if (camWatchdogRef.current) {
        clearInterval(camWatchdogRef.current);
        camWatchdogRef.current = null;
        camWatchdogAttemptsRef.current = 0;
      }
      return;
    }
    if (camWatchdogRef.current) return;
    let lastCamError: any = null;
    camWatchdogRef.current = setInterval(async () => {
      camWatchdogAttemptsRef.current += 1;
      if (camWatchdogAttemptsRef.current > 5) {
        clearInterval(camWatchdogRef.current!);
        camWatchdogRef.current = null;
        // Desistiu depois de 15s tentando religar sozinho — sem isso a câmera
        // some ao entrar na sala (comum em celulares) e a pessoa não sabe por quê.
        if (!localParticipant.isCameraEnabled) {
          toastError('Não foi possível ligar sua câmera', lastCamError ? mediaErrorMessage(lastCamError) : 'Toque no botão de câmera na barra abaixo para tentar novamente, ou verifique as permissões do navegador.');
        }
        return;
      }
      if (!initialMediaPublishingRef.current && !localParticipant.isCameraEnabled && !camTogglingRef.current) {
        camTogglingRef.current = true;
        const camOpts = videoDeviceId ? { deviceId: videoDeviceId } : undefined;
        try {
          await localParticipant.setCameraEnabled(true, camOpts);
        } catch (err) { lastCamError = err; }
        finally { camTogglingRef.current = false; }
      }
    }, 3000);
    return () => {
      if (camWatchdogRef.current) clearInterval(camWatchdogRef.current);
    };
  }, [isCameraEnabled, initialCam, localParticipant, videoDeviceId, toastError]);

  // Detecta screen share ativo (local ou remoto) — hooks sempre chamados
  const localHasScreen = useHasScreenShare(localParticipant.identity);
  const remoteIdentity = remoteParticipants[0]?.identity ?? "";
  const remoteHasScreen = useHasScreenShare(remoteIdentity);
  const screenShareActive = localHasScreen || (remoteParticipants.length > 0 && remoteHasScreen);
  const screenSharer = localHasScreen ? localParticipant : (remoteParticipants.length > 0 && remoteHasScreen ? remoteParticipants[0] : null);

  const camTogglingRef = useRef(false);
  const micTogglingRef = useRef(false);

  const toggleMic = useCallback(async () => {
    if (micTogglingRef.current) return;
    micTogglingRef.current = true;
    try {
      await localParticipant.setMicrophoneEnabled(!micOn);
    } catch (err: any) {
      toastError('Não foi possível ativar o microfone', mediaErrorMessage(err));
    }
    finally { micTogglingRef.current = false; }
  }, [localParticipant, micOn, toastError]);

  const toggleCam = useCallback(async () => {
    if (camTogglingRef.current) return;
    camTogglingRef.current = true;
    const camOpts = (!camOn && videoDeviceId) ? { deviceId: videoDeviceId } : undefined;
    try {
      await localParticipant.setCameraEnabled(!camOn, camOpts);
    } catch (err: any) {
      toastError('Não foi possível ativar a câmera', mediaErrorMessage(err));
    }
    finally { camTogglingRef.current = false; }
  }, [localParticipant, camOn, videoDeviceId, toastError]);

  // Em celulares, uma ligação pode colocar o navegador em segundo plano e o
  // sistema operacional encerrar somente os tracks de envio. A sala continua
  // conectada, mas a outra pessoa deixa de ver/ouvir quem recebeu a ligação.
  // Ao voltar ao app ou após uma reconexão, republicamos apenas os dispositivos
  // que estavam ligados, respeitando as escolhas de microfone e câmera da pessoa.
  const mediaRecoveryInProgressRef = useRef(false);
  const recoverPublishedMedia = useCallback(async () => {
    if (mediaRecoveryInProgressRef.current) return;
    const camPublication = localParticipant.getTrackPublication(Track.Source.Camera);
    const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
    const cameraNeedsRecovery = localParticipant.isCameraEnabled
      && (!camPublication?.track || camPublication.track.mediaStreamTrack.readyState !== 'live');
    const microphoneNeedsRecovery = localParticipant.isMicrophoneEnabled
      && (!micPublication?.track || micPublication.track.mediaStreamTrack.readyState !== 'live');
    if (!cameraNeedsRecovery && !microphoneNeedsRecovery) return;

    mediaRecoveryInProgressRef.current = true;
    try {
      if (microphoneNeedsRecovery) {
        await localParticipant.setMicrophoneEnabled(false);
        await localParticipant.setMicrophoneEnabled(true, audioDeviceId ? { deviceId: audioDeviceId } : undefined);
      }
      if (cameraNeedsRecovery) {
        await localParticipant.setCameraEnabled(false);
        await localParticipant.setCameraEnabled(true, videoDeviceId ? { deviceId: videoDeviceId } : undefined);
      }
    } catch {
      // Caso o SO ainda esteja liberando o dispositivo, a próxima retomada ou
      // reconexão tentará novamente, sem desligar a chamada para a outra pessoa.
    } finally {
      mediaRecoveryInProgressRef.current = false;
    }
  }, [localParticipant, audioDeviceId, videoDeviceId]);

  useEffect(() => {
    let wasHidden = document.hidden;
    const onVisibilityChange = () => {
      if (document.hidden) { wasHidden = true; return; }
      if (wasHidden) {
        wasHidden = false;
        window.setTimeout(() => { void recoverPublishedMedia(); }, 800);
      }
    };
    const onFocus = () => window.setTimeout(() => { void recoverPublishedMedia(); }, 800);
    const onReconnected = () => window.setTimeout(() => { void recoverPublishedMedia(); }, 500);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', onFocus);
    room.on(RoomEvent.Reconnected, onReconnected);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      room.off(RoomEvent.Reconnected, onReconnected);
    };
  }, [room, recoverPublishedMedia]);

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const cameraFlipInProgressRef = useRef(false);
  const flipCamera = useCallback(async () => {
    if (cameraFlipInProgressRef.current) return;
    cameraFlipInProgressRef.current = true;
    const next = facingMode === "user" ? "environment" : "user";
    const currentPublication = localParticipant.getTrackPublication(Track.Source.Camera);
    try {
      // Em vários Androids, enumerateDevices retorna lentes internas com deviceId
      // que não podem ser abertas diretamente (OverconstrainedError). facingMode é
      // a forma portátil de pedir frontal/traseira sem escolher uma lente inválida.
      const publishedTrack = currentPublication?.track;
      if (!publishedTrack) throw new Error('A câmera publicada não está disponível.');
      await publishedTrack.restartTrack({ facingMode: next } as any);
      const pub = localParticipant.getTrackPublication(Track.Source.Camera);
      const settings = pub?.track?.mediaStreamTrack?.getSettings();
      const actualFacing = settings?.facingMode;
      setFacingMode(actualFacing === 'environment' || actualFacing === 'user' ? actualFacing : next);
    } catch (err: any) {
      // restartTrack encerra a captura anterior antes de abrir a nova. Se a nova
      // falhar, restaura pela orientação anterior (não pelo deviceId problemático).
      try {
        const publishedTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (publishedTrack) {
          await new Promise(resolve => setTimeout(resolve, 350));
          await publishedTrack.restartTrack({ facingMode } as any);
        }
      } catch {
        // Último recurso: remove apenas a track já encerrada e cria uma captura
        // limpa da câmera anterior, após o driver móvel liberar o hardware.
        try {
          const failedTrack = localParticipant.getTrackPublication(Track.Source.Camera)?.track;
          if (failedTrack) await localParticipant.unpublishTrack(failedTrack, true);
          await new Promise(resolve => setTimeout(resolve, 500));
          await localParticipant.setCameraEnabled(true, { facingMode } as any);
        } catch {}
      }
      toastError('Não foi possível virar a câmera', mediaErrorMessage(err));
    } finally {
      cameraFlipInProgressRef.current = false;
    }
  }, [localParticipant, facingMode, toastError]);

  const toggleScreen = useCallback(async () => {
    try { await localParticipant.setScreenShareEnabled(!localHasScreen); } catch {}
  }, [localParticipant, localHasScreen]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePanel = (panel: "chat" | "invite" | "settings" | "patient" | "notes" | "billing" | "schedule" | "whiteboard" | "signature" | "files" | "instrument" | "breakout") => setSidePanel(prev => prev === panel ? null : panel);

  const hasRemote = remoteParticipants.length > 0;
  const poorConnection = connectionQuality === ConnectionQuality.Poor || connectionQuality === ConnectionQuality.Lost
    || remoteConnectionQuality === ConnectionQuality.Poor || remoteConnectionQuality === ConnectionQuality.Lost;
  // Quem fica na tela principal
  const mainParticipant = !hasRemote
    ? localParticipant
    : (pinned === "remote" ? remoteParticipants[0] : localParticipant);
  const pipParticipant = !hasRemote
    ? null
    : (pinned === "remote" ? localParticipant : remoteParticipants[0]);
  const mainIsLocal = mainParticipant.identity === localParticipant.identity;
  const showPip = hasRemote;

  // Estilo base dos botões de controle — tamanho maior para toque fácil
  const BTN = 56;
  const btn = (on: boolean): React.CSSProperties => ({
    width: BTN, height: BTN, borderRadius: "50%", border: on ? "none" : "1px solid rgba(239,68,68,0.5)",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
    background: on ? "rgba(255,255,255,0.13)" : "rgba(239,68,68,0.18)",
    color: on ? "#e2e8f0" : "#f87171", flexShrink: 0,
  });
  const btnActive = (active: boolean): React.CSSProperties => ({
    width: BTN, height: BTN, borderRadius: "50%", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
    background: active ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.13)",
    color: active ? "#a5b4fc" : "#e2e8f0", flexShrink: 0,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0f14", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Notificação de entrada/saída */}
      {roomNotice && (
        <div style={{
          position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 9999, pointerEvents: "none",
          background: roomNotice.type === 'leave' ? "rgba(245,158,11,0.15)" : "rgba(34,197,94,0.15)",
          border: `1px solid ${roomNotice.type === 'leave' ? "rgba(245,158,11,0.4)" : "rgba(34,197,94,0.4)"}`,
          color: roomNotice.type === 'leave' ? "#fcd34d" : "#86efac",
          padding: "8px 20px", borderRadius: 12, fontSize: 13, fontWeight: 600,
          whiteSpace: "nowrap", backdropFilter: "blur(8px)",
        }}>
          {roomNotice.msg}
        </div>
      )}

      {/* Área de vídeo */}
      <div style={{ flex: 1, position: "relative", minHeight: 0, background: "#0d0f14" }}>

        {/* Atendimento em grupo (2+ participantes remotos) — grade, sem PiP */}
        {remoteParticipants.length >= 2 ? (
          <GroupGrid
            participants={[localParticipant, ...remoteParticipants]}
            localIdentity={localParticipant.identity}
            isFrontCamera={facingMode === "user"}
          />
        ) : screenShareActive && screenSharer ? (
          <>
            {/* Tela compartilhada em full */}
            <ParticipantVideo
              participant={screenSharer}
              isLocal={screenSharer.identity === localParticipant.identity}
              style={{ width: "100%", height: "100%", borderRadius: 0 }}
              objectFit="contain"
              forceSource={Track.Source.ScreenShare}
              hideName
            />
            {/* Strip de câmeras no canto inferior direito */}
            <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Câmera local */}
              <div style={{ width: 110, height: 80, borderRadius: 10, overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                <ParticipantVideo
                  participant={localParticipant}
                  isLocal={true}
                  isFrontCamera={facingMode === "user"}
                  style={{ width: "100%", height: "100%", borderRadius: 0 }}
                  objectFit="cover"
                  forceSource={Track.Source.Camera}
                  hideName
                />
              </div>
              {/* Câmera remota se houver */}
              {remoteParticipants.length > 0 && (
                <div style={{ width: 110, height: 80, borderRadius: 10, overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)", boxShadow: "0 4px 16px rgba(0,0,0,0.5)" }}>
                  <ParticipantVideo
                    participant={remoteParticipants[0]}
                    isLocal={false}
                    style={{ width: "100%", height: "100%", borderRadius: 0 }}
                    objectFit="cover"
                    forceSource={Track.Source.Camera}
                    hideName
                  />
                </div>
              )}
            </div>
            {/* Badge "Tela sendo compartilhada" */}
            <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", background: "rgba(99,102,241,0.9)", borderRadius: 20, padding: "4px 14px", fontSize: 12, color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              <ScreenShare size={13} /> {screenSharer.name || screenSharer.identity} está compartilhando
            </div>
          </>
        ) : (
          /* Modo normal: câmera principal + PiP */
          <>
            <ParticipantVideo
              participant={mainParticipant}
              isLocal={mainIsLocal}
              isFrontCamera={facingMode === "user"}
              style={{ width: "100%", height: "100%", borderRadius: 0 }}
              objectFit="contain"
            />
            {/* PiP — clica para trocar quem é o principal (igual Google Meet) */}
            {showPip && pipParticipant && (
              <div
                onClick={() => setPinned(p => p === "remote" ? "local" : "remote")}
                title="Clique para trocar"
                style={{
                  position: "absolute", bottom: 16, right: 16,
                  width: 120, height: 90,
                  borderRadius: 12, overflow: "hidden",
                  border: "2px solid rgba(255,255,255,0.25)",
                  cursor: "pointer", boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  transition: "transform .15s, border-color .15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#6366f1"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1.04)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
              >
                <ParticipantVideo
                  participant={pipParticipant}
                  isLocal={pipParticipant.identity === localParticipant.identity}
                  isFrontCamera={facingMode === "user"}
                  style={{ width: "100%", height: "100%", borderRadius: 0 }}
                  objectFit="cover"
                  hideName
                />
                <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", borderRadius: 6, padding: "2px 4px", display: "flex", alignItems: "center", gap: 3 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                </div>
              </div>
            )}
          </>
        )}

        {/* Header flutuante */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)", pointerEvents: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoUrl} alt="Plaelo" style={{ height: 22, objectFit: "contain", opacity: 0.9, background: "#fff", borderRadius: 6, padding: 2 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color="#6366f1" />
            <span style={{ fontSize: 12, color: "#fff", fontFamily: "monospace", fontWeight: 700 }}>{formatTime(elapsedTime)}</span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: hasRemote ? "#22c55e" : "#f59e0b" }} />
            <span style={{ fontSize: 11, color: hasRemote ? "#86efac" : "#fcd34d" }}>{hasRemote ? "Conectado" : "Aguardando"}</span>
          </div>
        </div>

        {poorConnection && (
          <div style={{ position: "absolute", top: 46, left: "50%", transform: "translateX(-50%)", zIndex: 5, maxWidth: "calc(100% - 32px)", padding: "7px 12px", borderRadius: 10, background: "rgba(180,83,9,0.92)", color: "#fff", fontSize: 12, fontWeight: 700, textAlign: "center" }}>
            Conexão instável. Áudio ou vídeo podem oscilar; verifique sua internet.
          </div>
        )}

        {returnTo && (
          <div style={{ position: "absolute", top: 46, right: 12, zIndex: 6 }}>
            <button
              onClick={() => navigate(`/sala/${returnTo}`)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(30,33,48,0.92)", backdropFilter: "blur(8px)", color: "#a5b4fc", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              ← Voltar à sala principal
            </button>
          </div>
        )}

        {breakoutInvite && (
          <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e2130", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, padding: "16px 20px", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", gap: 12, minWidth: 280, maxWidth: 340 }}>
            <p style={{ fontSize: 13, color: "#e2e8f0", margin: 0 }}>
              <strong>{breakoutInvite.fromName}</strong> quer conversar em particular com você por um momento.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setBreakoutInvite(null)} style={{ flex: 1, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Agora não
              </button>
              <button
                onClick={() => navigate(`/sala/${breakoutInvite.roomCode}?returnTo=${encodeURIComponent(roomId)}`)}
                style={{ flex: 1, height: 36, borderRadius: 10, background: "#4f46e5", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                Aceitar
              </button>
            </div>
          </div>
        )}

        {!isHost && localMicCapturing && (
          <div style={{ position: "absolute", top: poorConnection ? 82 : 46, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 99, background: "rgba(220,38,38,0.85)", color: "#fff", fontSize: 11, fontWeight: 700 }}>
            <Circle size={8} style={{ fill: "#fff" }} /> Esta sessão está sendo transcrita
          </div>
        )}

        {/* Painel lateral */}
        {sidePanel && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: sidePanel === "patient" || sidePanel === "billing" || sidePanel === "whiteboard" ? "min(420px, 100%)" : "min(320px, 100%)", zIndex: 10 }}>
            {sidePanel === "chat"
              ? <LiveKitChatPanel
                  participantName={participantName}
                  roomId={roomId}
                  localIdentity={localParticipant.identity}
                  chatMessages={roomChat.chatMessages}
                  send={roomChat.send}
                  isSending={roomChat.isSending}
                  onClose={() => setSidePanel(null)}
                />
              : sidePanel === "settings"
              ? <SettingsPanel
                  onClose={() => setSidePanel(null)}
                  connectionQuality={connectionQuality}
                  remoteConnectionQuality={remoteConnectionQuality}
                  hasRemote={remoteParticipants.length > 0}
                  isHost={isHost}
                  livekitRoomName={`psiflux-${roomId}`}
                />
              : sidePanel === "patient"
              ? <PatientInfoPanel patientId={patientId!} onClose={() => setSidePanel(null)} />
              : sidePanel === "notes"
              ? <NotesPanel patientId={patientId!} appointmentId={appointmentId} onClose={() => setSidePanel(null)} />
              : sidePanel === "billing"
              ? <BillingPanel patientId={patientId!} onClose={() => setSidePanel(null)} />
              : sidePanel === "schedule"
              ? <SchedulePanel patientId={patientId!} professionalId={user?.id} onClose={() => setSidePanel(null)} />
              : sidePanel === "whiteboard"
              ? <WhiteboardPanel onClose={() => setSidePanel(null)} />
              : sidePanel === "signature"
              ? <SignaturePanel patientId={patientId!} onClose={() => setSidePanel(null)} />
              : sidePanel === "files"
              ? <FilesPanel patientId={patientId} isHost={isHost} participantName={participantName} onClose={() => setSidePanel(null)} />
              : sidePanel === "instrument"
              ? <InstrumentPanel patientId={patientId} isHost={isHost} onClose={() => setSidePanel(null)} />
              : sidePanel === "breakout"
              ? <BreakoutPanel roomId={roomId} roomCode={roomCode} remoteParticipants={remoteParticipants} onClose={() => setSidePanel(null)} />
              : <InvitePanel roomCode={roomCode} onClose={() => setSidePanel(null)} />
            }
          </div>
        )}
      </div>

      {/* Barra de controles */}
      <div style={{ flexShrink: 0, background: "rgba(13,15,20,0.97)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "12px 16px", paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>

          {/* Mic */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button onClick={toggleMic} style={btn(micOn)}>
              {micOn ? <Mic size={22} /> : <MicOff size={22} />}
            </button>
            <span style={{ fontSize: 10, color: micOn ? "#94a3b8" : "#f87171", letterSpacing: ".3px" }}>{micOn ? "Mic" : "Mudo"}</span>
          </div>

          {/* Câmera */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button onClick={toggleCam} style={btn(camOn)}>
              {camOn ? <Video size={22} /> : <VideoOff size={22} />}
            </button>
            <span style={{ fontSize: 10, color: camOn ? "#94a3b8" : "#f87171", letterSpacing: ".3px" }}>{camOn ? "Câmera" : "Deslig."}</span>
          </div>

          {/* Virar câmera (só mobile, câmera ligada) */}
          {isMobile && camOn && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button onClick={flipCamera} style={btn(true)}>
                <SwitchCamera size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Virar</span>
            </div>
          )}

          {/* Compartilhar tela — esconde em mobile */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
            <button onClick={toggleScreen} style={btnActive(localHasScreen)}>
              {localHasScreen ? <ScreenShareOff size={22} /> : <ScreenShare size={22} />}
            </button>
            <span style={{ fontSize: 10, color: localHasScreen ? "#a5b4fc" : "#94a3b8", letterSpacing: ".3px" }}>{localHasScreen ? "Parar" : "Tela"}</span>
          </div>

          {/* Chat */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button onClick={toggleChatPanel} style={{ ...btnActive(sidePanel === "chat"), position: "relative" }}>
              <MessageSquare size={22} />
              {unreadChatCount > 0 && (
                <span style={{ position: "absolute", top: -5, right: -5, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9, background: "#ef4444", color: "#fff", border: "2px solid #0d0f14", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              )}
            </button>
            <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Chat</span>
          </div>

          {/* Convidar (só host) */}
          {isHost && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button onClick={() => togglePanel("invite")} style={btnActive(sidePanel === "invite")}>
                <UserPlus size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Convidar</span>
            </div>
          )}

          {/* Dados do paciente (só host, só quando a sala tem paciente vinculado) */}
          {isHost && patientId && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button onClick={() => togglePanel("patient")} style={btnActive(sidePanel === "patient")}>
                <FileText size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Paciente</span>
            </div>
          )}

          {/* Anotações da sessão (só host, só com paciente vinculado) */}
          {isHost && patientId && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={() => togglePanel("notes")} style={btnActive(sidePanel === "notes")}>
                <NotebookPen size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Notas</span>
            </div>
          )}

          {/* Cobrança (só host, só com paciente vinculado) */}
          {isHost && patientId && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={() => togglePanel("billing")} style={btnActive(sidePanel === "billing")}>
                <Receipt size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Cobrança</span>
            </div>
          )}

          {/* Agendar retorno (só host, só com paciente vinculado) */}
          {isHost && patientId && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={() => togglePanel("schedule")} style={btnActive(sidePanel === "schedule")}>
                <CalendarPlus size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Retorno</span>
            </div>
          )}

          {/* Gerar documento (só host, só com paciente vinculado) — abre o gerador em nova aba, prefiltrado */}
          {isHost && patientId && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={() => window.open(`/gerador-documentos?patient_id=${patientId}`, '_blank')} style={btnActive(false)}>
                <FileOutput size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Doc.</span>
            </div>
          )}

          {/* Contrato/assinatura (só host, só com paciente vinculado) */}
          {isHost && patientId && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={() => togglePanel("signature")} style={btnActive(sidePanel === "signature")}>
                <FileSignature size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Contrato</span>
            </div>
          )}

          {/* Quadro branco (host e paciente) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
            <button onClick={() => togglePanel("whiteboard")} style={btnActive(sidePanel === "whiteboard")}>
              <PenTool size={22} />
            </button>
            <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Quadro</span>
          </div>

          {/* Arquivos (host e paciente — host envia, paciente só recebe) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
            <button onClick={() => togglePanel("files")} style={btnActive(sidePanel === "files")}>
              <Upload size={22} />
            </button>
            <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Arquivos</span>
          </div>

          {/* Conversa privada (só host, só quando há 2+ participantes pra escolher) */}
          {isHost && remoteParticipants.length >= 2 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={() => togglePanel("breakout")} style={btnActive(sidePanel === "breakout")}>
                <Shield size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Privado</span>
            </div>
          )}

          {/* Aplicar teste (host e paciente — host escolhe e envia, paciente só recebe) */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
            <button onClick={() => togglePanel("instrument")} style={btnActive(sidePanel === "instrument")}>
              <ClipboardList size={22} />
            </button>
            <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Teste</span>
          </div>

          {/* Aurora IA (só host, só quando o plano/permite) */}
          {isHost && onOpenAurora && user?.plan_features?.includes('aurora_ai') && hasPermission('access_ai_features') && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }} className="hide-mobile">
              <button onClick={onOpenAurora} style={btnActive(false)}>
                <Sparkles size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Aurora</span>
            </div>
          )}

          {/* Configurações (só host) */}
          {isHost && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button onClick={() => togglePanel("settings")} style={btnActive(sidePanel === "settings")}>
                <Settings size={22} />
              </button>
              <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: ".3px" }}>Config.</span>
            </div>
          )}

          {/* Gravar (só host) */}
          {isHost && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <button
                onClick={() => recording ? handleStopRecording() : handleStartRecording()}
                style={{ ...btnActive(recording), ...(recording ? { background: "rgba(239,68,68,0.25)", color: "#f87171" } : {}) }}
                title={recording ? "Parar gravação" : "Iniciar gravação"}
              >
                {transcribing
                  ? <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
                  : transcriptDone
                  ? <FileText size={22} style={{ color: "#22c55e" }} />
                  : <Circle size={22} style={recording ? { fill: "#ef4444", color: "#ef4444" } : {}} />
                }
              </button>
              <span style={{ fontSize: 10, color: recording ? "#f87171" : transcribing ? "#fbbf24" : "#94a3b8", letterSpacing: ".3px" }}>
                {transcribing ? "Transcrev." : transcriptDone ? "Salvo!" : recording ? "Grav." : "Gravar"}
              </span>
            </div>
          )}

          {/* Encerrar */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <button
              onClick={async () => {
                await handleStopRecording();
                let transcript = '';
                if (isHost) {
                  try {
                    const rows = await api.get<any[]>(`/virtual-rooms/${roomId}/sessions/${sessionKeyRef.current}/transcript`);
                    transcript = (rows || [])
                      .map(r => `${r.speaker_name || (r.speaker_role === 'host' ? 'Profissional' : 'Paciente')}: ${r.text}`)
                      .join('\n');
                  } catch {}
                }
                onLeave({ transcript, patientId });
              }}
              style={{ width: BTN, height: BTN, borderRadius: "50%", background: "#dc2626", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}
            >
              <PhoneOff size={22} />
            </button>
            <span style={{ fontSize: 10, color: "#f87171", letterSpacing: ".3px" }}>{isHost ? "Encerrar" : "Sair"}</span>
          </div>
        </div>
      </div>

      <RoomAudioRenderer />
      <ConnectionStateToast />

      {recordingError && (
        <div role="alert" style={{ position: "fixed", right: 16, bottom: 96, zIndex: 30, maxWidth: 340, background: "rgba(185, 28, 28, 0.96)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
          {recordingError}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media(max-width:480px){ .hide-mobile{ display:none !important } }
        .lk-button { all: unset !important; }
      `}</style>
    </div>
  );
};

// ── Toast de sala de espera (para o host) ────────────────────────────────────
const WaitingToastHost: React.FC<{
  entry: { id: string; guest_name: string };
  onApprove: (id: string) => void;
  onDeny: (id: string) => void;
  index?: number;
}> = ({ entry, onApprove, onDeny, index = 0 }) => (
  <div style={{ position: "fixed", top: 20 + index * 150, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e2130", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, padding: "16px 20px", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", gap: 12, minWidth: 280, maxWidth: 340 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
        {entry.guest_name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", margin: 0 }}>{entry.guest_name}</p>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>quer entrar na sala</p>
      </div>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => onDeny(entry.id)} style={{ flex: 1, height: 36, borderRadius: 10, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Recusar
      </button>
      <button onClick={() => onApprove(entry.id)} style={{ flex: 1, height: 36, borderRadius: 10, background: "#4f46e5", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Admitir
      </button>
    </div>
  </div>
);

// ── Encerramento inteligente (host, sessão com paciente vinculado) ───────────
// Depois de sair da chamada, em vez de simplesmente navegar embora, resume o
// que falta fazer — evolução, próxima consulta, cobrança — tudo já ligado nas
// mesmas rotas que os painéis da sala usam, sem precisar do contexto LiveKit
// (a chamada já foi encerrada nesse ponto).
const EndSummaryScreen: React.FC<{
  patientId: number; transcript: string; onDone: () => void;
}> = ({ patientId, transcript, onDone }) => {
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError } = useToast();

  const [comandas, setComandas] = useState<ComandaSummary[] | null>(null);
  const [paying, setPaying] = useState<ComandaSummary | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [scheduled, setScheduled] = useState(false);

  useEffect(() => {
    api.get<ComandaSummary[]>(`/finance/comandas/patient/${patientId}`)
      .then(rows => setComandas(rows || []))
      .catch(() => setComandas([]));
  }, [patientId]);

  const pendingComanda = (comandas || []).find(c => {
    const total = Number(c.total || 0);
    const paid = Number(c.paidValue ?? c.paid_value ?? 0);
    return total - paid > 0;
  });

  const handleSchedule = async () => {
    if (!date || !time) return;
    setScheduling(true);
    try {
      await api.post('/appointments', {
        patient_id: patientId,
        start_time: `${date}T${time}:00`,
        duration_minutes: 50,
        title: 'Retorno',
        status: 'scheduled',
      });
      setScheduled(true);
      toastSuccess('Retorno agendado', 'A próxima sessão já está na agenda.');
    } catch (err: any) {
      toastError('Erro ao agendar', err?.message || '');
    } finally {
      setScheduling(false);
    }
  };

  const handleConfirmPayment = async (method: string, details: any) => {
    if (!paying) return;
    const entries = details.mode === 'mixed' ? details.entries : [{ method, amount: details.amount }];
    for (const entry of entries) {
      await api.post(`/finance/comandas/${paying.id}/payments`, {
        amount: entry.amount,
        payment_method: PAYMENT_METHOD_LABEL[entry.method] || PAYMENT_METHOD_LABEL[method] || 'Pix',
        notes: 'Pagamento registrado no encerramento do atendimento',
      });
    }
    toastSuccess('Pagamento registrado', 'O pagamento foi lançado na comanda.');
    setPaying(null);
    api.get<ComandaSummary[]>(`/finance/comandas/patient/${patientId}`).then(rows => setComandas(rows || [])).catch(() => {});
  };

  const cardStyle: React.CSSProperties = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 };
  const titleStyle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#e2e8f0", display: "flex", alignItems: "center", gap: 8, margin: 0 };
  const inputStyle: React.CSSProperties = { flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#080a0f", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.35)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Check size={26} color="#4ade80" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>Atendimento finalizado</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Videochamada encerrada. Confira o que falta antes de sair.</p>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}><NotebookPen size={16} color="#6366f1" /> Evolução</p>
          <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, maxHeight: 90, overflowY: "auto" }}>
            {transcript ? transcript.slice(0, 400) + (transcript.length > 400 ? '…' : '') : 'Sem transcrição registrada nesta sessão.'}
          </p>
          <button
            onClick={() => navigate(`/prontuario?patient_id=${patientId}&new_session=1`)}
            style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700 }}
          >
            Revisar e gerar evolução com Aurora
          </button>
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}><CalendarPlus size={16} color="#6366f1" /> Próxima consulta</p>
          {scheduled ? (
            <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>Retorno agendado ✓</p>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
              <button
                onClick={handleSchedule}
                disabled={scheduling || !date || !time}
                style={{ padding: "9px 16px", borderRadius: 10, border: "none", cursor: scheduling || !date || !time ? "not-allowed" : "pointer", background: scheduling || !date || !time ? "rgba(99,102,241,0.25)" : "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700 }}
              >
                Agendar
              </button>
            </div>
          )}
        </div>

        <div style={cardStyle}>
          <p style={titleStyle}><Receipt size={16} color="#6366f1" /> Pagamento</p>
          {comandas === null ? (
            <Loader2 size={16} color="#64748b" style={{ animation: "spin 1s linear infinite" }} />
          ) : !pendingComanda ? (
            <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>Sem pendências</p>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <p style={{ fontSize: 13, color: "#fbbf24" }}>
                Pendente: R$ {(Number(pendingComanda.total || 0) - Number(pendingComanda.paidValue ?? pendingComanda.paid_value ?? 0)).toFixed(2)}
              </p>
              <button
                onClick={() => setPaying(pendingComanda)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer", background: "#6366f1", color: "#fff", fontSize: 12, fontWeight: 700 }}
              >
                Cobrar agora
              </button>
            </div>
          )}
        </div>

        <button
          onClick={onDone}
          style={{ marginTop: 8, width: "100%", height: 48, borderRadius: 13, fontWeight: 800, fontSize: 14, color: "#fff", background: "linear-gradient(135deg, #6366f1, #4f46e5)", border: "none", cursor: "pointer" }}
        >
          Concluir atendimento
        </button>
      </div>

      {paying && (
        <PaymentModal
          isOpen
          onClose={() => setPaying(null)}
          comanda={{ ...paying, paidAmount: Number(paying.paidValue ?? paying.paid_value ?? 0) }}
          onConfirm={handleConfirmPayment}
        />
      )}
    </div>
  );
};

// ── Pós-consulta do paciente ──────────────────────────────────────────────────
// Sem prontuário/transcrição/notas internas — só o que o paciente pode ver:
// obrigado pela presença, avaliação da experiência técnica e um atalho pro
// Portal do Paciente pra ele mesmo acompanhar próxima consulta/pagamento/docs
// (não reimplementei essas telas aqui — elas já existem, prontas, no portal).
const PatientPostCallScreen: React.FC<{ roomId: string; roomInfo?: RoomInfo }> = ({ roomId, roomInfo }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const submitFeedback = async (stars: number) => {
    setRating(stars);
    try {
      await fetch(`${API_BASE_URL}/virtual-rooms/public/${roomId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: stars, comment }),
      });
      setSent(true);
    } catch {}
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 18, alignItems: "center", textAlign: "center" }}>
        {roomInfo?.clinic_logo_url && <img src={roomInfo.clinic_logo_url} alt="" style={{ height: 32, background: "#fff", borderRadius: 8, padding: 4 }} />}
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "2px solid rgba(34,197,94,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Check size={28} color="#4ade80" />
        </div>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 900, color: "#f1f5f9", margin: 0 }}>Consulta finalizada</h1>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
            Obrigado{roomInfo?.host_name ? ` por sua sessão com ${roomInfo.host_name}` : ' pela sua presença'}.
          </p>
        </div>

        <div style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {sent ? (
            <p style={{ fontSize: 13, color: "#4ade80", fontWeight: 700 }}>Obrigado pela avaliação! ✓</p>
          ) : (
            <>
              <p style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>Como foi a qualidade da sua chamada?</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => submitFeedback(n)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: n <= rating ? "#fbbf24" : "#334155", fontSize: 26, lineHeight: 1 }}>
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário (opcional)"
                rows={2}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 10, color: "#e2e8f0", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box" }}
              />
            </>
          )}
        </div>

        <a href="/portal" style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", borderRadius: 12, background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
          Acessar Portal do Paciente <ExternalLink size={14} />
        </a>
        <p style={{ fontSize: 11, color: "#475569" }}>Lá você acompanha próxima consulta, pagamentos e documentos enviados.</p>
      </div>
    </div>
  );
};

// ── Tela de espera (para o guest) ────────────────────────────────────────────
const WaitingScreen: React.FC<{ guestName: string; onCancel: () => void; keepStream?: MediaStream | null; roomInfo?: RoomInfo }> = ({ guestName, onCancel, keepStream, roomInfo }) => {
  // Mantém o stream do lobby vivo enquanto aguarda aprovação,
  // impedindo que o Android libere o dispositivo de câmera antes do LiveKit conectar.
  const streamHolderRef = useRef(keepStream);
  streamHolderRef.current = keepStream;

  const [waitSeconds, setWaitSeconds] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setWaitSeconds(s => s + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const waitLabel = `${String(Math.floor(waitSeconds / 60)).padStart(2, "0")}:${String(waitSeconds % 60).padStart(2, "0")}`;

  const [micTestLevel, setMicTestLevel] = useState<number | null>(null);
  const testAudioAgain = async () => {
    setMicTestLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const stopAt = Date.now() + 3000;
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        const volume = data.reduce((sum, v) => sum + Math.abs(v - 128), 0) / data.length;
        setMicTestLevel(Math.min(100, Math.round(volume * 3.2)));
        if (Date.now() < stopAt) requestAnimationFrame(tick);
        else {
          stream.getTracks().forEach(t => t.stop());
          void ctx.close();
          setMicTestLevel(null);
        }
      };
      tick();
    } catch {
      setMicTestLevel(null);
    }
  };

  return (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#0d0f14", padding: 16 }}>
    {(roomInfo?.clinic_logo_url || roomInfo?.company_name) && (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
        {roomInfo?.clinic_logo_url && <img src={roomInfo.clinic_logo_url} alt={roomInfo.company_name || ""} style={{ height: 24, objectFit: "contain", background: "#fff", borderRadius: 6, padding: 2 }} />}
        {roomInfo?.company_name && <span style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{roomInfo.company_name}</span>}
      </div>
    )}
    <div style={{ textAlign: "center", maxWidth: 360 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "2px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", animation: "pulse 2s infinite" }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Aguardando aprovação</h2>
      <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 12 }}>
        Olá, <strong style={{ color: "#e2e8f0" }}>{guestName}</strong>!<br />
        {roomInfo?.waiting_room_message || `${roomInfo?.host_name ? `${roomInfo.host_name} foi notificado(a)` : "O profissional foi notificado"} da sua chegada. Aguarde um momento.`}
      </p>
      <p style={{ fontSize: 12, color: "#475569", marginBottom: 20 }}>Tempo de espera: <strong style={{ color: "#94a3b8" }}>{waitLabel}</strong></p>

      {micTestLevel !== null ? (
        <div style={{ width: 160, height: 7, borderRadius: 99, overflow: "hidden", background: "rgba(255,255,255,.12)", margin: "0 auto 20px" }}>
          <div style={{ width: `${micTestLevel}%`, height: "100%", transition: "width .08s", background: micTestLevel > 75 ? "#f59e0b" : "#22c55e" }} />
        </div>
      ) : (
        <button onClick={testAudioAgain} style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 auto 20px", background: "none", border: "none", cursor: "pointer", color: "#818cf8", fontSize: 12, fontWeight: 700 }}>
          <Mic size={13} /> Testar áudio novamente
        </button>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 32 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#4f46e5", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 20px", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
        Cancelar
      </button>
    </div>
    <style>{`
      @keyframes bounce { 0%,80%,100%{transform:scale(0.8);opacity:.5} 40%{transform:scale(1.2);opacity:1} }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    `}</style>
  </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const MeetingRoomLiveKit: React.FC<MeetingRoomLiveKitProps> = ({ isGuest: isGuestProp = false }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  const hasAuthToken = Boolean(localStorage.getItem("psi_token"));
  const isGuest = isGuestProp || searchParams.get("guest") === "true" || !hasAuthToken;
  const returnTo = searchParams.get("returnTo");

  const [guestName, setGuestName] = useState(() => id ? localStorage.getItem(`psi_room_guest_name_${id}`) || "" : "");
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lobbyCamOn, setLobbyCamOn] = useState(true);
  const [lobbyMicOn, setLobbyMicOn] = useState(true);
  const lobbyVideoDeviceRef = useRef<string>("");
  const lobbyAudioDeviceRef = useRef<string>("");
  const lobbyStreamRef = useRef<MediaStream | null>(null);

  // Sala de espera — guest
  const [waitingToken, setWaitingToken] = useState<string | null>(null);
  const [waitingStatus, setWaitingStatus] = useState<"idle" | "waiting" | "approved" | "denied">("idle");
  const [guestRoomInfo, setGuestRoomInfo] = useState<RoomInfo>({});

  // Consentimento de gravação/transcrição e uso de IA é implícito (não exibido
  // como checkbox pro paciente) — ambos vão sempre habilitados no metadata do
  // token LiveKit, que é o que a sala usa pra decidir se transcreve o lado dele.
  const recordingConsent = true;
  const aiConsent = true;
  const [guestRole, setGuestRole] = useState("");

  // Tela de encerramento inteligente — só pra host com paciente vinculado
  const [endSummary, setEndSummary] = useState<{ patientId: number; transcript: string } | null>(null);
  // Pós-consulta do paciente — só quando ele de fato participou da chamada
  // (não quando cancela ainda na sala de espera, sem ter entrado)
  const [showPostCall, setShowPostCall] = useState(false);
  const callConnectedRef = useRef(false);
  useEffect(() => {
    if (!isGuest || !id) return;
    fetch(`${API_BASE_URL}/virtual-rooms/public/${id}/info`)
      .then(r => r.json()).then(setGuestRoomInfo).catch(() => {});
  }, [isGuest, id]);
  const waitingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sala de espera — host
  const [pendingGuests, setPendingGuests] = useState<{ id: string; guest_name: string }[]>([]);
  const hostPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  // Aurora IA: widget global carrega seu próprio FAB fixo — só montamos quando o
  // host abre pela primeira vez, pra não sobrepor a barra de controles da chamada.
  const [auroraMounted, setAuroraMounted] = useState(false);
  const openAurora = useCallback(() => {
    setAuroraMounted(true);
    setTimeout(() => (window as any).openAuroraChat?.(), 50);
  }, []);

  const participantName = isGuest ? guestName : (user?.name || user?.email || "Profissional");
  const lkRoomName = `psiflux-${id}`;

  // Toca som de notificação usando Web Audio API (sem arquivo externo)
  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Dois beeps curtos tipo "ding ding"
      const playBeep = (startTime: number, freq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      };
      playBeep(ctx.currentTime, 880);
      playBeep(ctx.currentTime + 0.2, 1100);
    } catch {}
  }, []);

  // Host: polling da sala de espera
  useEffect(() => {
    if (isGuest || !joined) return;
    const poll = async () => {
      try {
        const res = await api.get<any>(`/virtual-rooms/${id}/waiting`);
        const waiting = (Array.isArray(res) ? res : []).filter((e: any) => e.status === "waiting");
        // Toca som para novos que ainda não foram notificados
        waiting.forEach((entry: any) => {
          if (!notifiedIdsRef.current.has(entry.id)) {
            notifiedIdsRef.current.add(entry.id);
            playNotificationSound();
          }
        });
        setPendingGuests(waiting);
      } catch {}
    };
    poll();
    hostPollRef.current = setInterval(poll, 3000);
    return () => { if (hostPollRef.current) clearInterval(hostPollRef.current); };
  }, [isGuest, joined, id, playNotificationSound]);

  const approveGuest = async (entryId: string) => {
    try {
      await api.post<any>(`/virtual-rooms/${id}/waiting/${entryId}/approve`, {});
      setPendingGuests(prev => prev.filter(g => g.id !== entryId));
    } catch {}
  };

  const denyGuest = async (entryId: string) => {
    try {
      await api.post<any>(`/virtual-rooms/${id}/waiting/${entryId}/deny`, {});
      setPendingGuests(prev => prev.filter(g => g.id !== entryId));
    } catch {}
  };

  // Guest: entra na fila e fica polling
  const enterWaitingRoom = async (name: string) => {
    const res = await fetch(`${API_BASE_URL}/virtual-rooms/public/${id}/waiting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao entrar na fila");
    return data.token as string;
  };

  const pollWaitingStatus = (wToken: string) => {
    waitingPollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/virtual-rooms/public/waiting/${wToken}`);
        const data = await res.json();
        if (data.status === "approved") {
          clearInterval(waitingPollRef.current!);
          setWaitingStatus("approved");
          // Pega token LiveKit e entra
          const guestMetadata = JSON.stringify({ recordingConsent, aiConsent, role: guestRole.trim() || undefined });
          const lkRes = await fetch(`${API_BASE_URL}/livekit/token-guest?roomName=${encodeURIComponent(lkRoomName)}&participantName=${encodeURIComponent(guestName.trim())}&token=${id}&metadata=${encodeURIComponent(guestMetadata)}`);
          const lkData = await lkRes.json();
          if (!lkRes.ok) throw new Error(lkData.error);
          setToken(lkData.token);
          setLivekitUrl(lkData.url || import.meta.env.VITE_LIVEKIT_URL);
          setJoined(true);
        } else if (data.status === "denied") {
          clearInterval(waitingPollRef.current!);
          setWaitingStatus("denied");
          setError("O profissional recusou sua entrada na sala.");
          setWaitingToken(null);
        }
      } catch {}
    }, 2000);
  };

  const handleJoin = async () => {
    if (isGuest && !guestName.trim()) return;
    setJoining(true);
    setError(null);
    try {
      if (isGuest) {
        // Guest entra na sala de espera primeiro
        if (id) localStorage.setItem(`psi_room_guest_name_${id}`, guestName.trim());
        const wToken = await enterWaitingRoom(guestName.trim());
        setWaitingToken(wToken);
        setWaitingStatus("waiting");
        pollWaitingStatus(wToken);
      } else {
        // Host entra direto
        const res = await api.post<any>("/livekit/token", { roomName: lkRoomName, participantName, isHost: true });
        setToken(res.token);
        setLivekitUrl(res.url || import.meta.env.VITE_LIVEKIT_URL);
        setJoined(true);
      }
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (handoff?: { transcript?: string; patientId?: number | null }) => {
    if (waitingPollRef.current) clearInterval(waitingPollRef.current);
    if (hostPollRef.current) clearInterval(hostPollRef.current);

    // Host encerra a sala no LiveKit — expulsa todos os participantes
    if (!isGuest && id) {
      try {
        await api.delete<any>(`/livekit/room/psiflux-${id}`);
      } catch {}
    }

    setJoined(false);
    setToken(null);
    setWaitingToken(null);
    setWaitingStatus("idle");
    // Ao encerrar uma sessão vinculada, entrega a transcrição ao editor de
    // prontuário como rascunho (a profissional ainda revisa e aciona a Aurora)
    // e mostra a tela de encerramento com o que falta fazer antes de sair.
    if (!isGuest && handoff?.patientId) {
      try {
        sessionStorage.setItem('psi_session_record_draft', JSON.stringify({
          patientId: handoff.patientId,
          draft: handoff.transcript || '',
          createdAt: new Date().toISOString(),
        }));
      } catch {}
      setEndSummary({ patientId: handoff.patientId, transcript: handoff.transcript || '' });
      return;
    }
    // Paciente saindo de uma chamada em que de fato participou — mostra o
    // resumo pós-consulta. handoff só existe quando vem do botão "Sair" da
    // sala (não no cancelamento ainda na sala de espera).
    if (isGuest && handoff) {
      setShowPostCall(true);
      return;
    }
    navigate(-1);
  };

  const handleLiveKitConnected = useCallback(() => {
    callConnectedRef.current = true;
    setError(null);
  }, []);

  const handleLiveKitDisconnected = useCallback(() => {
    // Quando o profissional exclui a sala no LiveKit, o paciente recebe uma
    // desconexão definitiva. Desmonta a chamada em vez de deixá-lo preso na tela
    // com o aviso genérico "Disconnected".
    lobbyStreamRef.current?.getTracks().forEach(track => track.stop());
    lobbyStreamRef.current = null;
    setToken(null);
    setJoined(false);
    setWaitingToken(null);
    setWaitingStatus('idle');

    if (isGuest && callConnectedRef.current) {
      setShowPostCall(true);
    } else if (!isGuest) {
      setError('A chamada foi encerrada.');
    } else {
      setError('Não foi possível conectar à chamada. Tente novamente.');
    }
    callConnectedRef.current = false;
  }, [isGuest]);

  // Encerramento inteligente — host revisa evolução/agenda/pagamento antes de sair
  if (endSummary) {
    return (
      <EndSummaryScreen
        patientId={endSummary.patientId}
        transcript={endSummary.transcript}
        onDone={() => navigate('/agenda')}
      />
    );
  }

  // Pós-consulta do paciente
  if (showPostCall) {
    return <PatientPostCallScreen roomId={id || ""} roomInfo={guestRoomInfo} />;
  }

  // Guest aguardando aprovação — mantém referência ao stream do lobby para não perder o dispositivo
  if (isGuest && waitingStatus === "waiting") {
    return <WaitingScreen guestName={guestName} onCancel={() => handleLeave()} keepStream={lobbyStreamRef.current} roomInfo={guestRoomInfo} />;
  }

  // Lobby
  if (!joined || !token) {
    return (
      <Lobby
        roomCode={id || ""}
        isGuest={isGuest}
        guestName={guestName}
        setGuestName={setGuestName}
        onJoin={handleJoin}
        joining={joining}
        error={error}
        isDark={isDark}
        userName={participantName}
        onCamChange={setLobbyCamOn}
        onMicChange={setLobbyMicOn}
        onDeviceChange={(vid, aid) => { lobbyVideoDeviceRef.current = vid; lobbyAudioDeviceRef.current = aid; }}
        onStreamReady={stream => { lobbyStreamRef.current = stream; }}
        guestRole={guestRole}
        onGuestRoleChange={setGuestRole}
      />
    );
  }

  return (
    <>
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={false}
        audio={false}
        // onDisconnected só ocorre quando a sala foi efetivamente encerrada ou
        // quando o LiveKit desistiu de reconectar; quedas temporárias são tratadas
        // internamente sem desmontar a tela.
        onConnected={handleLiveKitConnected}
        onDisconnected={handleLiveKitDisconnected}
        style={{ height: "100vh" }}
        data-lk-theme="default"
      >
        <RoomInner
          roomId={id || ""}
          participantName={participantName}
          isHost={!isGuest}
          onLeave={handleLeave}
          roomCode={id || ""}
          initialCam={lobbyCamOn}
          initialMic={lobbyMicOn}
          videoDeviceId={lobbyVideoDeviceRef.current}
          audioDeviceId={lobbyAudioDeviceRef.current}
          lobbyStream={lobbyStreamRef.current}
          onOpenAurora={!isGuest ? openAurora : undefined}
          returnTo={returnTo}
        />
      </LiveKitRoom>
      {auroraMounted && !isGuest && <AuroraAssistant />}

      {/* Notificações de sala de espera para o host — uma por pessoa aguardando,
          empilhadas (ex: mãe e filho chegando juntos numa sessão familiar) */}
      {!isGuest && pendingGuests.map((guest, index) => (
        <WaitingToastHost
          key={guest.id}
          entry={guest}
          onApprove={approveGuest}
          onDeny={denyGuest}
          index={index}
        />
      ))}
    </>
  );
};

export default MeetingRoomLiveKit;
