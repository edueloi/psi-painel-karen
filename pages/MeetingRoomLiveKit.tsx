import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  ConnectionStateToast,
  TrackToggle,
  useChat,
  useParticipantTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, type LocalParticipant, type RemoteParticipant } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff,
  MessageSquare, X, Send, Copy, Check, UserPlus, Clock, Shield, Link as LinkIcon,
  ChevronDown, Settings,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { api, API_BASE_URL } from "../services/api";
import logoDarkUrl from '../images/logopsiflux-para-fundo-escuro.png';
import logoUrl from '../images/logo-psiflux.png';

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
type RoomInfo = { host_name?: string; company_name?: string; clinic_logo_url?: string; crp?: string; specialty?: string; avatar_url?: string; };

const Lobby: React.FC<{
  roomCode: string; isGuest: boolean; guestName: string;
  setGuestName: (v: string) => void; onJoin: () => void;
  joining: boolean; error: string | null; isDark: boolean;
  userName?: string;
}> = ({ roomCode, isGuest, guestName, setGuestName, onJoin, joining, error, isDark, userName }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({});

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioOutDevices, setAudioOutDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedAudioOut, setSelectedAudioOut] = useState("");

  const guestUrl = `${window.location.origin}/sala/${roomCode}`;

  // Busca info da sala (nome do profissional, CRP, clínica)
  useEffect(() => {
    if (!roomCode) return;
    fetch(`${API_BASE_URL}/virtual-rooms/public/${roomCode}/info`)
      .then(r => r.json())
      .then(d => setRoomInfo(d))
      .catch(() => {});
  }, [roomCode]);

  const startPreview = useCallback(async (audioId?: string, videoId?: string) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks().forEach(t => { t.enabled = camOn; });
      stream.getAudioTracks().forEach(t => { t.enabled = micOn; });
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      await startPreview();
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter(d => d.kind === "audioinput"));
      setVideoDevices(devices.filter(d => d.kind === "videoinput"));
      setAudioOutDevices(devices.filter(d => d.kind === "audiooutput"));
    };
    init();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const togglePreviewMic = () => { const n = !micOn; setMicOn(n); streamRef.current?.getAudioTracks().forEach(t => { t.enabled = n; }); };
  const togglePreviewCam = () => { const n = !camOn; setCamOn(n); streamRef.current?.getVideoTracks().forEach(t => { t.enabled = n; }); };
  const handleVideoDevice = (id: string) => { setSelectedVideo(id); startPreview(selectedAudio || undefined, id); };
  const handleAudioDevice = (id: string) => { setSelectedAudio(id); startPreview(id, selectedVideo || undefined); };
  const copyLink = () => { navigator.clipboard.writeText(guestUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const sendWhatsApp = () => {
    const msg = `Olá! Sua consulta vai começar em breve.\n\nAcesse sua sala virtual pelo link:\n${guestUrl}\n\n_Não é necessário login._`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const canJoin = !joining && (!isGuest || guestName.trim().length > 0);
  const displayName = isGuest ? (guestName || "Você") : (userName || "Você");

  return (
    <div style={{ minHeight: "100vh", background: "#080a0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 16px 24px", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Logo pequeno no topo */}
      <div style={{ marginBottom: 20 }}>
        <img src={logoDarkUrl} alt="PsiFlux" style={{ height: 28, objectFit: "contain", opacity: 0.7 }} />
      </div>

      {/* Card principal — duas colunas no desktop, empilhado no mobile */}
      <div style={{ width: "100%", maxWidth: 820, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: "#12151e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }} className="lobby-grid">

        {/* Coluna esquerda — preview câmera */}
        <div style={{ position: "relative", background: "#0d0f14", minHeight: 300, display: "flex", flexDirection: "column" }}>
          <video ref={videoRef} autoPlay muted playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", flex: 1, display: camOn ? "block" : "none", minHeight: 300 }} />
          {!camOn && (
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <div style={{ width: 68, height: 68, borderRadius: "50%", background: isGuest ? "#0284c7" : "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#fff" }}>
                {displayName.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: "#475569" }}>Câmera desligada</span>
            </div>
          )}
          {/* Nome badge */}
          <div style={{ position: "absolute", bottom: 52, left: 10, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", borderRadius: 7, padding: "2px 9px", fontSize: 12, fontWeight: 600, color: "#fff" }}>
            {displayName}
          </div>
          {/* Botões mic/cam */}
          <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 10 }}>
            <button onClick={togglePreviewMic} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: micOn ? "rgba(255,255,255,0.18)" : "rgba(220,38,38,0.85)", backdropFilter: "blur(8px)", color: "#fff" }}>
              {micOn ? <Mic size={15} /> : <MicOff size={15} />}
            </button>
            <button onClick={togglePreviewCam} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: camOn ? "rgba(255,255,255,0.18)" : "rgba(220,38,38,0.85)", backdropFilter: "blur(8px)", color: "#fff" }}>
              {camOn ? <Video size={15} /> : <VideoOff size={15} />}
            </button>
          </div>
        </div>

        {/* Coluna direita — formulário */}
        <div style={{ padding: "24px 22px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: "85vh" }}>

          {/* Card profissional — visível para guest */}
          {isGuest && (roomInfo.host_name || roomInfo.company_name) && (
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              {roomInfo.avatar_url
                ? <img src={roomInfo.avatar_url} alt="" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : (
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                    {(roomInfo.host_name || "P").charAt(0).toUpperCase()}
                  </div>
                )
              }
              <div style={{ minWidth: 0 }}>
                {roomInfo.host_name && <p style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roomInfo.host_name}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 3 }}>
                  {roomInfo.specialty && <span style={{ fontSize: 11, color: "#94a3b8" }}>{roomInfo.specialty}</span>}
                  {roomInfo.crp && <span style={{ fontSize: 11, color: "#6366f1", background: "rgba(99,102,241,0.12)", padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>CRP {roomInfo.crp}</span>}
                  {roomInfo.company_name && <span style={{ fontSize: 11, color: "#64748b" }}>· {roomInfo.company_name}</span>}
                </div>
              </div>
            </div>
          )}

          {/* Título */}
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
              {isGuest ? "Entrar na consulta" : "Sua sala virtual"}
            </h1>
            <p style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
              {isGuest ? "Informe seu nome para aguardar aprovação" : "Configure e inicie a sessão"}
            </p>
          </div>

          {/* Nome — guest */}
          {isGuest && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Seu nome completo</label>
              <input type="text" value={guestName}
                onChange={e => setGuestName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canJoin && onJoin()}
                placeholder="Ex: Ana Lima" autoFocus
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={e => (e.target.style.borderColor = "#6366f1")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>
          )}

          {/* Configurações de dispositivos */}
          <div>
            <button onClick={() => setShowDevices(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", fontSize: 12, display: "flex", alignItems: "center", gap: 5, padding: 0 }}>
              <Settings size={12} />
              Configurações de áudio e vídeo
              <ChevronDown size={12} style={{ transform: showDevices ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {showDevices && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                {videoDevices.length > 0 && <DeviceSelect label="Câmera" devices={videoDevices} value={selectedVideo} onChange={handleVideoDevice} icon={<Video size={11} />} />}
                {audioDevices.length > 0 && <DeviceSelect label="Microfone" devices={audioDevices} value={selectedAudio} onChange={handleAudioDevice} icon={<Mic size={11} />} />}
                {audioOutDevices.length > 0 && <DeviceSelect label="Alto-falante" devices={audioOutDevices} value={selectedAudioOut} onChange={setSelectedAudioOut} icon={<Shield size={11} />} />}
              </div>
            )}
          </div>

          {/* Link do paciente — só host */}
          {!isGuest && (
            <div style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 12, padding: "12px 14px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <LinkIcon size={11} /> Link do paciente
              </p>
              <div style={{ background: "rgba(0,0,0,0.25)", borderRadius: 7, padding: "7px 10px", fontSize: 11, color: "#94a3b8", fontFamily: "monospace", wordBreak: "break-all", marginBottom: 8 }}>
                {guestUrl}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <button onClick={copyLink} style={{ flex: 1, height: 34, borderRadius: 8, background: copied ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.07)", border: `1px solid ${copied ? "rgba(34,197,94,0.35)" : "rgba(255,255,255,0.09)"}`, color: copied ? "#86efac" : "#cbd5e1", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  {copied ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                </button>
                <button onClick={sendWhatsApp} style={{ flex: 1, height: 34, borderRadius: 8, background: "rgba(34,197,94,0.13)", border: "1px solid rgba(34,197,94,0.25)", color: "#86efac", fontWeight: 600, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#86efac"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "9px 13px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.22)", borderRadius: 9, color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <button onClick={onJoin} disabled={!canJoin}
            style={{ width: "100%", height: 48, borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", background: canJoin ? "#4f46e5" : "#4338ca44", border: "none", cursor: canJoin ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "auto" }}>
            {joining ? <><Spinner /> Conectando...</> : isGuest ? "Solicitar entrada" : "Iniciar sessão"}
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
            <Shield size={11} color="#1e293b" />
            <span style={{ fontSize: 11, color: "#1e293b" }}>Conexão segura e criptografada</span>
          </div>
        </div>
      </div>

      <style>{`
        .lobby-grid { grid-template-columns: 1fr 1fr !important; }
        @media(max-width:580px){
          .lobby-grid { grid-template-columns: 1fr !important; }
          .lobby-grid > div:first-child { min-height: 220px !important; max-height: 260px; }
        }
      `}</style>
    </div>
  );
};


// ── Painel de Convidar ────────────────────────────────────────────────────────
const InvitePanel: React.FC<{ roomCode: string; onClose: () => void }> = ({ roomCode, onClose }) => {
  const [copied, setCopied] = useState(false);
  const guestUrl = `${window.location.origin}/sala/${roomCode}`;

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

// ── Tile de vídeo usando useParticipantTracks (um hook por participante) ──────
const ParticipantVideo: React.FC<{
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  style?: React.CSSProperties;
}> = ({ participant, isLocal, style }) => {
  const tracks = useParticipantTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    participant.identity
  );
  const camTrack = tracks.find(t => t.source === Track.Source.Camera);
  const screenTrack = tracks.find(t => t.source === Track.Source.ScreenShare);
  const activeTrack = screenTrack || camTrack;
  const isCamOn = !!activeTrack;
  const initials = (participant.name || participant.identity)?.charAt(0).toUpperCase() || "?";

  return (
    <div style={{ position: "relative", overflow: "hidden", background: "#1a1d2e", ...style }}>
      {isCamOn && activeTrack
        ? <VideoTrack trackRef={activeTrack} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : (
          <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: isLocal ? "#4f46e5" : "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff" }}>
              {initials}
            </div>
            <span style={{ fontSize: 12, color: "#475569" }}>Câmera desligada</span>
          </div>
        )
      }
      <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: "#fff" }}>
        {participant.name || participant.identity}{isLocal ? " (Você)" : ""}
      </div>
      {!participant.isMicrophoneEnabled && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(220,38,38,0.9)", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MicOff size={12} color="#fff" />
        </div>
      )}
    </div>
  );
};

// ── Chat via LiveKit data channel ─────────────────────────────────────────────
const LiveKitChatPanel: React.FC<{ participantName: string; onClose: () => void }> = ({ participantName, onClose }) => {
  const { chatMessages, send, isSending } = useChat();
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleSend = () => {
    const text = newMessage.trim();
    if (!text || isSending) return;
    setNewMessage("");
    send(text);
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
        {chatMessages.length === 0 && (
          <p style={{ textAlign: "center", fontSize: 12, color: "#334155", marginTop: 20 }}>Nenhuma mensagem ainda</p>
        )}
        {chatMessages.map((msg, i) => {
          const isMe = msg.from?.identity === participantName;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start" }}>
              {!isMe && <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>{msg.from?.name || msg.from?.identity}</span>}
              <div style={{ maxWidth: "85%", padding: "8px 12px", borderRadius: isMe ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: isMe ? "#4f46e5" : "rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>
                {msg.message}
              </div>
              <span style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>{fmtTime(msg.timestamp)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 12, borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          type="text" value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="Mensagem..."
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <button onClick={handleSend} disabled={!newMessage.trim() || isSending}
          style={{ padding: 8, borderRadius: 10, background: newMessage.trim() ? "#4f46e5" : "rgba(255,255,255,0.05)", border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <Send size={15} />
        </button>
      </div>
    </div>
  );
};

// ── Sala principal ────────────────────────────────────────────────────────────
const RoomInner: React.FC<{
  roomId: string; participantName: string; isHost: boolean; onLeave: () => void; roomCode: string;
}> = ({ roomId, participantName, isHost, onLeave, roomCode }) => {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sidePanel, setSidePanel] = useState<"chat" | "invite" | null>(null);
  const [showMiniature, setShowMiniature] = useState(true);

  const micOn = isMicrophoneEnabled;
  const camOn = isCameraEnabled;

  useEffect(() => {
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePanel = (panel: "chat" | "invite") => setSidePanel(prev => prev === panel ? null : panel);

  const mainParticipant = remoteParticipants.length > 0 ? remoteParticipants[0] : localParticipant;
  const mainIsLocal = mainParticipant.identity === localParticipant.identity;
  const showPip = remoteParticipants.length > 0 && !mainIsLocal;

  // Estilo base dos botões de controle
  const btn = (on: boolean): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: "50%", border: on ? "none" : "1px solid rgba(239,68,68,0.5)",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
    background: on ? "rgba(255,255,255,0.12)" : "rgba(239,68,68,0.15)",
    color: on ? "#e2e8f0" : "#f87171", flexShrink: 0,
  });
  const btnActive = (active: boolean): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
    background: active ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.12)",
    color: active ? "#a5b4fc" : "#e2e8f0", flexShrink: 0,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0f14", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Área de vídeo */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <ParticipantVideo participant={mainParticipant} isLocal={mainIsLocal} style={{ width: "100%", height: "100%", borderRadius: 0 }} />

        {/* Header flutuante */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={logoDarkUrl} alt="PsiFlux" style={{ height: 24, objectFit: "contain" }} />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>{roomCode}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Clock size={12} color="#6366f1" />
            <span style={{ fontSize: 12, color: "#fff", fontFamily: "monospace", fontWeight: 700 }}>{formatTime(elapsedTime)}</span>
            <span style={{ width: 1, height: 14, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
            <span style={{ fontSize: 11, color: "#86efac" }}>{remoteParticipants.length > 0 ? "Conectado" : "Aguardando"}</span>
          </div>
        </div>

        {/* PiP miniatura local */}
        {showPip && showMiniature && (
          <div onClick={() => setShowMiniature(false)}
            style={{ position: "absolute", bottom: 16, right: 16, width: 100, height: 140, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(99,102,241,0.6)", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
            <ParticipantVideo participant={localParticipant} isLocal={true} style={{ width: "100%", height: "100%", borderRadius: 0 }} />
          </div>
        )}
        {showPip && !showMiniature && (
          <button onClick={() => setShowMiniature(true)} style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 11, cursor: "pointer" }}>
            Mostrar você
          </button>
        )}

        {/* Painel lateral */}
        {sidePanel && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 100%)", zIndex: 10 }}>
            {sidePanel === "chat"
              ? <LiveKitChatPanel participantName={participantName} onClose={() => setSidePanel(null)} />
              : <InvitePanel roomCode={roomCode} onClose={() => setSidePanel(null)} />
            }
          </div>
        )}
      </div>

      {/* Barra de controles */}
      <div style={{ flexShrink: 0, background: "rgba(13,15,20,0.97)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>

          {/* Mic — TrackToggle nativo do LiveKit */}
          <TrackToggle source={Track.Source.Microphone} style={btn(micOn)} showIcon={false}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </TrackToggle>

          {/* Câmera — TrackToggle nativo */}
          <TrackToggle source={Track.Source.Camera} style={btn(camOn)} showIcon={false}>
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </TrackToggle>

          {/* Compartilhar tela — TrackToggle nativo, esconde em mobile */}
          <TrackToggle source={Track.Source.ScreenShare} style={btnActive(false)} showIcon={false} className="hide-mobile">
            <ScreenShare size={20} />
          </TrackToggle>

          {/* Chat */}
          <button onClick={() => togglePanel("chat")} style={btnActive(sidePanel === "chat")}>
            <MessageSquare size={20} />
          </button>

          {/* Convidar (só host) */}
          {isHost && (
            <button onClick={() => togglePanel("invite")} style={btnActive(sidePanel === "invite")}>
              <UserPlus size={20} />
            </button>
          )}

          {/* Encerrar */}
          <button onClick={onLeave} style={{ height: 48, padding: "0 22px", borderRadius: 24, background: "#dc2626", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
            <PhoneOff size={18} />
            <span>{isHost ? "Encerrar" : "Sair"}</span>
          </button>
        </div>
      </div>

      <RoomAudioRenderer />
      <ConnectionStateToast />

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
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
}> = ({ entry, onApprove, onDeny }) => (
  <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1e2130", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 16, padding: "16px 20px", boxShadow: "0 16px 48px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", gap: 12, minWidth: 280, maxWidth: 340 }}>
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

// ── Tela de espera (para o guest) ────────────────────────────────────────────
const WaitingScreen: React.FC<{ guestName: string; onCancel: () => void }> = ({ guestName, onCancel }) => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0f14", padding: 16 }}>
    <div style={{ textAlign: "center", maxWidth: 360 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(99,102,241,0.15)", border: "2px solid rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", animation: "pulse 2s infinite" }}>
        <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#818cf8" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"/></svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Aguardando aprovação</h2>
      <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 32 }}>
        Olá, <strong style={{ color: "#e2e8f0" }}>{guestName}</strong>!<br />
        O profissional foi notificado da sua chegada. Aguarde um momento.
      </p>
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

  const [guestName, setGuestName] = useState(() => id ? localStorage.getItem(`psi_room_guest_name_${id}`) || "" : "");
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sala de espera — guest
  const [waitingToken, setWaitingToken] = useState<string | null>(null);
  const [waitingStatus, setWaitingStatus] = useState<"idle" | "waiting" | "approved" | "denied">("idle");
  const waitingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sala de espera — host
  const [pendingGuests, setPendingGuests] = useState<{ id: string; guest_name: string }[]>([]);
  const hostPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

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
          const lkRes = await fetch(`${API_BASE_URL}/livekit/token-guest?roomName=${encodeURIComponent(lkRoomName)}&participantName=${encodeURIComponent(guestName.trim())}&token=${id}`);
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

  const handleLeave = async () => {
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
    navigate(-1);
  };

  // Guest aguardando aprovação
  if (isGuest && waitingStatus === "waiting") {
    return <WaitingScreen guestName={guestName} onCancel={handleLeave} />;
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
      />
    );
  }

  return (
    <>
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleLeave}
        style={{ height: "100vh" }}
        data-lk-theme="default"
      >
        <RoomInner
          roomId={id || ""}
          participantName={participantName}
          isHost={!isGuest}
          onLeave={handleLeave}
          roomCode={id || ""}
        />
      </LiveKitRoom>

      {/* Notificações de sala de espera para o host */}
      {!isGuest && pendingGuests.length > 0 && (
        <WaitingToastHost
          entry={pendingGuests[0]}
          onApprove={approveGuest}
          onDeny={denyGuest}
        />
      )}
    </>
  );
};

export default MeetingRoomLiveKit;
