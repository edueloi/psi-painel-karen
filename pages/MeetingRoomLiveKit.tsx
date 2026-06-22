import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
  AudioTrack,
  ConnectionStateToast,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, LocalParticipant, RemoteParticipant } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff,
  MessageSquare, X, Send, Copy, Check, UserPlus, Clock, Shield, Link as LinkIcon,
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

// ── Lobby ─────────────────────────────────────────────────────────────────────
const Lobby: React.FC<{
  roomCode: string; isGuest: boolean; guestName: string;
  setGuestName: (v: string) => void; onJoin: () => void;
  joining: boolean; error: string | null; isDark: boolean;
  clinicName?: string;
}> = ({ roomCode, isGuest, guestName, setGuestName, onJoin, joining, error, isDark, clinicName }) => (
  <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0f14", padding: "16px" }}>
    <div style={{ width: "100%", maxWidth: 420, background: "#161920", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 40, boxShadow: "0 32px 80px rgba(0,0,0,0.5)" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
        <img src={isDark ? logoDarkUrl : logoUrl} alt="PsiFlux" style={{ height: 40, objectFit: "contain" }} />
      </div>

      {clinicName && (
        <p style={{ textAlign: "center", color: "#6366f1", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{clinicName}</p>
      )}
      <h1 style={{ textAlign: "center", color: "#fff", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Sala Virtual</h1>
      <p style={{ textAlign: "center", color: "#64748b", fontSize: 13, marginBottom: 32, fontFamily: "monospace" }}>{roomCode}</p>

      {isGuest && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Seu nome completo
          </label>
          <input
            type="text"
            value={guestName}
            onChange={e => setGuestName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && guestName.trim() && onJoin()}
            placeholder="Ex: Ana Lima"
            autoFocus
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "12px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color .2s" }}
            onFocus={e => e.target.style.borderColor = "#6366f1"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.1)"}
          />
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#f87171", fontSize: 13 }}>
          {error}
        </div>
      )}

      <button
        onClick={onJoin}
        disabled={joining || (isGuest && !guestName.trim())}
        style={{ width: "100%", height: 48, borderRadius: 12, fontWeight: 700, fontSize: 15, color: "#fff", background: joining || (isGuest && !guestName.trim()) ? "#4338ca88" : "#4f46e5", border: "none", cursor: joining || (isGuest && !guestName.trim()) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "background .2s" }}
        onMouseEnter={e => { if (!joining && !(isGuest && !guestName.trim())) (e.target as HTMLButtonElement).style.background = "#4338ca"; }}
        onMouseLeave={e => { if (!joining && !(isGuest && !guestName.trim())) (e.target as HTMLButtonElement).style.background = "#4f46e5"; }}
      >
        {joining ? <><Spinner /> Conectando...</> : "Entrar na Sala"}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}>
        <Shield size={12} color="#475569" />
        <span style={{ fontSize: 12, color: "#475569" }}>Conexão segura e criptografada</span>
      </div>
    </div>
  </div>
);

// ── Tile de vídeo ─────────────────────────────────────────────────────────────
const VideoTile: React.FC<{
  participant: LocalParticipant | RemoteParticipant;
  isLocal?: boolean;
  isFocused?: boolean;
  onClick?: () => void;
}> = ({ participant, isLocal, isFocused, onClick }) => {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false }
  );
  const videoTrack = tracks.find(t => t.participant.identity === participant.identity && t.source === Track.Source.Camera);
  const isCamOn = videoTrack?.publication?.isEnabled ?? false;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative", borderRadius: 16, overflow: "hidden",
        background: "#1e2130", cursor: onClick ? "pointer" : "default",
        border: isFocused ? "2px solid #6366f1" : "2px solid transparent",
        transition: "border-color .2s",
        aspectRatio: "16/9",
        width: "100%",
      }}
    >
      {isCamOn && videoTrack ? (
        <VideoTrack trackRef={videoTrack} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(135deg, #1e2130, #161920)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff" }}>
            {participant.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <span style={{ fontSize: 12, color: "#64748b" }}>Câmera desligada</span>
        </div>
      )}

      {/* Nome */}
      <div style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 8, padding: "3px 10px", fontSize: 12, fontWeight: 600, color: "#fff" }}>
        {participant.name || participant.identity}{isLocal ? " (Você)" : ""}
      </div>

      {/* Mic off indicator */}
      {!participant.isMicrophoneEnabled && (
        <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(239,68,68,0.8)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MicOff size={14} color="#fff" />
        </div>
      )}
    </div>
  );
};

// ── Painel de Chat ────────────────────────────────────────────────────────────
const ChatPanel: React.FC<{
  roomId: string; participantName: string; isHost: boolean; onClose: () => void;
}> = ({ roomId, participantName, isHost, onClose }) => {
  const [messages, setMessages] = useState<RoomMessage[]>([{ id: 0, sender_role: "system", sender_name: "Sistema", message: "Sala segura criada. Bem-vindo!", created_at: new Date().toISOString() }]);
  const [newMessage, setNewMessage] = useState("");
  const [lastId, setLastId] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<any>(`/virtual-rooms/${roomId}/messages?since=${lastIdRef.current}`);
      const newMsgs: RoomMessage[] = res?.messages || [];
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        lastIdRef.current = newMsgs[newMsgs.length - 1].id;
        setLastId(lastIdRef.current);
      }
    } catch {}
  }, [roomId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage("");
    try {
      await api.post<any>(`/virtual-rooms/${roomId}/messages`, { message: text, sender_name: participantName, sender_role: isHost ? "host" : "guest" });
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#161920", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
          <MessageSquare size={16} color="#6366f1" /> Chat
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4, borderRadius: 8, display: "flex" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={msg.id || i} style={{ display: "flex", flexDirection: "column", alignItems: msg.sender_role === "system" ? "center" : msg.sender_name === participantName ? "flex-end" : "flex-start" }}>
            {msg.sender_role === "system" ? (
              <span style={{ fontSize: 11, color: "#475569", background: "rgba(255,255,255,0.04)", padding: "3px 12px", borderRadius: 999 }}>{msg.message}</span>
            ) : (
              <div style={{ maxWidth: "85%" }}>
                {msg.sender_name !== participantName && (
                  <span style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, display: "block" }}>{msg.sender_name}</span>
                )}
                <div style={{ padding: "8px 12px", borderRadius: msg.sender_name === participantName ? "16px 4px 16px 16px" : "4px 16px 16px 16px", background: msg.sender_name === participantName ? "#4f46e5" : "rgba(255,255,255,0.08)", color: "#e2e8f0", fontSize: 13, lineHeight: 1.5 }}>
                  {msg.message}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 8 }}>
        <input
          type="text" value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Mensagem..."
          style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <button onClick={sendMessage} disabled={!newMessage.trim()} style={{ padding: 8, borderRadius: 10, background: newMessage.trim() ? "#4f46e5" : "rgba(255,255,255,0.05)", border: "none", cursor: newMessage.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          <Send size={15} />
        </button>
      </div>
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

// ── Sala principal ────────────────────────────────────────────────────────────
const RoomInner: React.FC<{
  roomId: string; participantName: string; isHost: boolean; onLeave: () => void; roomCode: string;
}> = ({ roomId, participantName, isHost, onLeave, roomCode }) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [sidePanel, setSidePanel] = useState<"chat" | "invite" | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [showMiniature, setShowMiniature] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleMic = () => { localParticipant.setMicrophoneEnabled(!micOn); setMicOn(v => !v); };
  const toggleCam = () => { localParticipant.setCameraEnabled(!camOn); setCamOn(v => !v); };
  const toggleScreen = async () => { try { await localParticipant.setScreenShareEnabled(!screenOn); setScreenOn(v => !v); } catch {} };
  const togglePanel = (panel: "chat" | "invite") => setSidePanel(prev => prev === panel ? null : panel);

  const allTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false, updateOnlyOn: [] }
  );
  // Deduplica: pega só o primeiro track por identity+source
  const seenTracks = new Set<string>();
  const dedupedTracks = allTracks.filter(t => {
    const key = `${t.participant.identity}-${t.source}`;
    if (seenTracks.has(key)) return false;
    seenTracks.add(key);
    return true;
  });
  const getTrack = (identity: string) =>
    dedupedTracks.find(t => t.participant.identity === identity && t.source === Track.Source.Camera);

  const renderVideo = (
    participant: LocalParticipant | RemoteParticipant,
    isLocal: boolean,
    style: React.CSSProperties
  ) => {
    const track = getTrack(participant.identity);
    const isCamOn = track?.publication?.isEnabled ?? false;
    const initials = (participant.name || participant.identity)?.charAt(0).toUpperCase();
    return (
      <div style={{ position: "relative", overflow: "hidden", background: "#1a1d2e", ...style }}>
        {isCamOn && track
          ? <VideoTrack trackRef={track} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: isLocal ? "#4f46e5" : "#0ea5e9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#fff" }}>{initials}</div>
              <span style={{ fontSize: 12, color: "#475569" }}>Câmera desligada</span>
            </div>
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

  // Vídeo principal: remoto se existir, senão local
  const mainParticipant = remoteParticipants.length > 0 ? remoteParticipants[0] : localParticipant;
  const mainIsLocal = mainParticipant.identity === localParticipant.identity;
  // PiP só aparece quando há participante remoto (mostra o local no cantinho)
  const showPip = remoteParticipants.length > 0 && !mainIsLocal;

  const btnStyle = (active: boolean, danger = false): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: "50%", border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
    background: danger ? "#dc2626" : active ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.12)",
    color: danger ? "#fff" : active ? "#a5b4fc" : "#e2e8f0",
    flexShrink: 0,
  });

  const btnOffStyle = (): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(239,68,68,0.5)", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s",
    background: "rgba(239,68,68,0.15)", color: "#f87171", flexShrink: 0,
  });

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0d0f14", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Vídeo principal — ocupa tudo menos o header e footer */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {renderVideo(mainParticipant, mainIsLocal, { width: "100%", height: "100%", borderRadius: 0 })}

        {/* Header flutuante sobre o vídeo */}
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

        {/* PiP — miniatura local flutuante no canto */}
        {showPip && showMiniature && (
          <div
            onClick={() => setShowMiniature(false)}
            style={{ position: "absolute", bottom: 16, right: 16, width: 100, height: 140, borderRadius: 12, overflow: "hidden", border: "2px solid rgba(99,102,241,0.6)", cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}
          >
            {renderVideo(localParticipant, true, { width: "100%", height: "100%", borderRadius: 0 })}
          </div>
        )}
        {showPip && !showMiniature && (
          <button onClick={() => setShowMiniature(true)} style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "6px 10px", color: "#fff", fontSize: 11, cursor: "pointer" }}>
            Mostrar você
          </button>
        )}

        {/* Painel lateral — sobrepõe em mobile, lateral em desktop */}
        {sidePanel && (
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 100%)", zIndex: 10 }}>
            {sidePanel === "chat"
              ? <ChatPanel roomId={roomId} participantName={participantName} isHost={isHost} onClose={() => setSidePanel(null)} />
              : <InvitePanel roomCode={roomCode} onClose={() => setSidePanel(null)} />
            }
          </div>
        )}
      </div>

      {/* Barra de controles fixa na base */}
      <div style={{ flexShrink: 0, background: "rgba(13,15,20,0.97)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 16px", paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>

          {/* Mic */}
          <button onClick={toggleMic} style={micOn ? btnStyle(false) : btnOffStyle()}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
          </button>

          {/* Câmera */}
          <button onClick={toggleCam} style={camOn ? btnStyle(false) : btnOffStyle()}>
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
          </button>

          {/* Compartilhar tela — esconde em mobile */}
          <button onClick={toggleScreen} style={btnStyle(screenOn)} className="hide-mobile">
            {screenOn ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
          </button>

          {/* Chat */}
          <button onClick={() => togglePanel("chat")} style={btnStyle(sidePanel === "chat")}>
            <MessageSquare size={20} />
          </button>

          {/* Convidar (só host) */}
          {isHost && (
            <button onClick={() => togglePanel("invite")} style={btnStyle(sidePanel === "invite")}>
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

  const [guestName, setGuestName] = useState(() => id ? localStorage.getItem(`psi_room_guest_name_${id}`) || "" : "");
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participantName = isGuest ? guestName : (user?.name || user?.email || "Profissional");
  const lkRoomName = `psiflux-${id}`;

  const handleJoin = async () => {
    if (isGuest && !guestName.trim()) return;
    setJoining(true);
    setError(null);
    try {
      if (isGuest) {
        const res = await fetch(`${API_BASE_URL}/livekit/token-guest?roomName=${encodeURIComponent(lkRoomName)}&participantName=${encodeURIComponent(guestName.trim())}&token=${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao entrar na sala");
        setToken(data.token);
        setLivekitUrl(data.url || import.meta.env.VITE_LIVEKIT_URL);
        if (id) localStorage.setItem(`psi_room_guest_name_${id}`, guestName.trim());
      } else {
        const res = await api.post<any>("/livekit/token", { roomName: lkRoomName, participantName, isHost: true });
        setToken(res.token);
        setLivekitUrl(res.url || import.meta.env.VITE_LIVEKIT_URL);
      }
      setJoined(true);
    } catch (err: any) {
      setError(err?.message || "Erro ao conectar. Tente novamente.");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => { setJoined(false); setToken(null); navigate(-1); };

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
        clinicName={!isGuest ? undefined : undefined}
      />
    );
  }

  return (
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
  );
};

export default MeetingRoomLiveKit;
