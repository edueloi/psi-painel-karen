import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  TrackLoop,
  TrackRefContext,
  VideoTrack,
  AudioTrack,
  ParticipantTile,
  ControlBar,
  GridLayout,
  FocusLayout,
  FocusLayoutContainer,
  CarouselLayout,
  ConnectionStateToast,
  DisconnectButton,
  Chat,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, RoomEvent } from "livekit-client";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare,
  MessageSquare, PenTool, X, Send, Copy, Check,
  UserPlus, QrCode, Share2, Settings, ChevronDown,
  Smile, Clock, User, MonitorUp,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { api, API_BASE_URL } from "../services/api";
import { Button } from "../components/UI/Button";
import logoUrl from '../images/logo-psiflux.png';
import logoDarkUrl from '../images/logopsiflux-para-fundo-escuro.png';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type RoomMessage = {
  id: number;
  sender_role: "host" | "guest" | "system";
  sender_name: string;
  message: string;
  created_at: string;
};

type WaitingEntry = {
  id: number;
  guest_name: string;
  status: "waiting" | "approved" | "denied";
  created_at?: string;
};

interface MeetingRoomLiveKitProps {
  isGuest?: boolean;
}

// ── Lobby (tela antes de entrar) ──────────────────────────────────────────────
const Lobby: React.FC<{
  roomName: string;
  isGuest: boolean;
  guestName: string;
  setGuestName: (v: string) => void;
  onJoin: () => void;
  joining: boolean;
  error: string | null;
  isDark: boolean;
}> = ({ roomName, isGuest, guestName, setGuestName, onJoin, joining, error, isDark }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f14] px-4">
      <div className="w-full max-w-md bg-[#161920] border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex justify-center mb-6">
          <img src={isDark ? logoDarkUrl : logoUrl} alt="PsiFlux" className="h-10 object-contain" />
        </div>
        <h1 className="text-xl font-bold text-white text-center mb-1">Sala Virtual</h1>
        <p className="text-slate-400 text-sm text-center mb-8">{roomName}</p>

        {isGuest && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
              Seu nome
            </label>
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && guestName.trim() && onJoin()}
              placeholder="Digite seu nome..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={onJoin}
          disabled={joining || (isGuest && !guestName.trim())}
          className="w-full h-12 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {joining ? (
            <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Conectando...</>
          ) : (
            "Entrar na Sala"
          )}
        </button>

        <p className="text-center text-xs text-slate-500 mt-4">
          Conexão segura e criptografada
        </p>
      </div>
    </div>
  );
};

// ── Painel de Chat ────────────────────────────────────────────────────────────
const ChatPanel: React.FC<{
  roomId: string;
  participantName: string;
  isHost: boolean;
  onClose: () => void;
}> = ({ roomId, participantName, isHost, onClose }) => {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [lastId, setLastId] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const endpoint = isHost
        ? `/virtual-rooms/${roomId}/messages?since=${lastId}`
        : `/virtual-rooms/guest/${roomId}/messages?since=${lastId}`;
      const res = await api.get(endpoint);
      const newMsgs: RoomMessage[] = res.data?.messages || [];
      if (newMsgs.length > 0) {
        setMessages(prev => [...prev, ...newMsgs]);
        setLastId(newMsgs[newMsgs.length - 1].id);
      }
    } catch {}
  }, [roomId, lastId, isHost]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage("");
    try {
      const endpoint = isHost
        ? `/virtual-rooms/${roomId}/messages`
        : `/virtual-rooms/guest/${roomId}/messages`;
      await api.post(endpoint, { message: text, sender_name: participantName });
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-[#161920] border-l border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          <MessageSquare size={16} className="text-indigo-400" /> Chat
        </span>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs text-center mt-8">Nenhuma mensagem ainda</p>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.sender_role === "system" ? "items-center" : "items-start"}`}>
            {msg.sender_role === "system" ? (
              <span className="text-[10px] text-slate-500 bg-white/5 px-3 py-1 rounded-full">{msg.message}</span>
            ) : (
              <div className="max-w-[85%]">
                <span className="text-[10px] text-slate-400 mb-1 block">{msg.sender_name}</span>
                <div className={`px-3 py-2 rounded-2xl text-sm ${msg.sender_name === participantName ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white/10 text-slate-200 rounded-tl-sm"}`}>
                  {msg.message}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/10 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage()}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

// ── Componente de controles customizados ──────────────────────────────────────
const CustomControls: React.FC<{
  onToggleChat: () => void;
  onLeave: () => void;
  chatOpen: boolean;
  elapsedTime: number;
  isHost: boolean;
}> = ({ onToggleChat, onLeave, chatOpen, elapsedTime, isHost }) => {
  const { localParticipant } = useLocalParticipant();

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[#0d0f14]/90 backdrop-blur border-t border-white/10">
      {/* Timer */}
      <div className="flex items-center gap-2 text-slate-400 text-sm min-w-[80px]">
        <Clock size={14} className="text-indigo-400" />
        <span className="font-mono">{formatTime(elapsedTime)}</span>
      </div>

      {/* Controles centrais — usa o ControlBar nativo do LiveKit */}
      <div className="flex items-center gap-2">
        <ControlBar
          variation="minimal"
          controls={{
            microphone: true,
            camera: true,
            screenShare: true,
            leave: false,
            chat: false,
          }}
          className="lk-control-bar"
        />

        {/* Chat toggle */}
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${chatOpen ? "bg-indigo-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}
        >
          <MessageSquare size={16} />
          <span className="hidden sm:inline">Chat</span>
        </button>
      </div>

      {/* Encerrar */}
      <div className="min-w-[80px] flex justify-end">
        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-all"
        >
          <PhoneOff size={16} />
          <span className="hidden sm:inline">{isHost ? "Encerrar" : "Sair"}</span>
        </button>
      </div>
    </div>
  );
};

// ── Sala principal (dentro do LiveKitRoom) ────────────────────────────────────
const RoomInner: React.FC<{
  roomId: string;
  participantName: string;
  isHost: boolean;
  onLeave: () => void;
}> = ({ roomId, participantName, isHost, onLeave }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsedTime(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-[#0d0f14] overflow-hidden">
      {/* Área de vídeo */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-hidden">
          <VideoConference
            chatMessageFormatter={undefined}
            SettingsComponent={undefined}
          />
        </div>

        <CustomControls
          onToggleChat={() => setChatOpen(o => !o)}
          onLeave={onLeave}
          chatOpen={chatOpen}
          elapsedTime={elapsedTime}
          isHost={isHost}
        />
      </div>

      {/* Painel lateral de chat */}
      {chatOpen && (
        <div className="w-80 shrink-0 border-l border-white/10">
          <ChatPanel
            roomId={roomId}
            participantName={participantName}
            isHost={isHost}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}

      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export const MeetingRoomLiveKit: React.FC<MeetingRoomLiveKitProps> = ({
  isGuest: isGuestProp = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === "dark";

  const hasAuthToken = Boolean(localStorage.getItem("psi_token"));
  const isGuest = isGuestProp || searchParams.get("guest") === "true" || !hasAuthToken;

  const [guestName, setGuestName] = useState(() => {
    return id ? localStorage.getItem(`psi_room_guest_name_${id}`) || "" : "";
  });
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomName, setRoomName] = useState(id || "sala");

  const participantName = isGuest
    ? guestName
    : user?.name || user?.email || "Profissional";

  const lkRoomName = `psiflux-${id}`;

  const handleJoin = async () => {
    if (isGuest && !guestName.trim()) return;
    setJoining(true);
    setError(null);

    try {
      if (isGuest) {
        // Guest: token público
        const res = await fetch(
          `${API_BASE_URL}/livekit/token-guest?roomName=${encodeURIComponent(lkRoomName)}&participantName=${encodeURIComponent(guestName.trim())}&token=${id}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao entrar na sala");
        setToken(data.token);
        setLivekitUrl(data.url || import.meta.env.VITE_LIVEKIT_URL);
        if (id) localStorage.setItem(`psi_room_guest_name_${id}`, guestName.trim());
      } else {
        // Host/profissional autenticado
        const res = await api.post("/livekit/token", {
          roomName: lkRoomName,
          participantName,
          isHost: true,
        });
        setToken(res.data.token);
        setLivekitUrl(res.data.url || import.meta.env.VITE_LIVEKIT_URL);
      }
      setJoined(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Erro ao conectar");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    setJoined(false);
    setToken(null);
    navigate(-1);
  };

  if (!joined || !token) {
    return (
      <Lobby
        roomName={roomName}
        isGuest={isGuest}
        guestName={guestName}
        setGuestName={setGuestName}
        onJoin={handleJoin}
        joining={joining}
        error={error}
        isDark={isDark}
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
      />
    </LiveKitRoom>
  );
};

export default MeetingRoomLiveKit;
