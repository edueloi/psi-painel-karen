import React, { useState, useEffect, useRef, useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  ScreenShare,
  MessageSquare,
  PenTool,
  X,
  Send,
  Paperclip,
  Eraser,
  Download,
  Clock,
  User,
  Subtitles,
  MonitorUp,
  Layout,
  Mic as MicIcon,
  FileText,
  Smartphone,
  QrCode,
  Share2,
  Tablet,
  Settings,
  Copy,
  Check,
  Info,
  ChevronDown,
  Volume2,
  Link as LinkIcon,
  UserPlus,
  ShieldAlert,
  ClipboardCheck,
  Play,
  PieChart,
  ArrowLeft,
  Save,
  LogIn,
  Smile,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useUserPreferences } from "../contexts/UserPreferencesContext";
import logoUrl from '../images/logo-psiflux.png';
import logoDarkUrl from '../images/logopsiflux-para-fundo-escuro.png';
import { ClinicalForm, FormQuestion } from "../types";
import { api, API_BASE_URL } from "../services/api";
import { Button } from "../components/UI/Button";
import { Input } from "../components/UI/Input";
import { PanelCard } from "../components/UI/PanelCard";
import { VideoTile, RemoteVideoTile } from "../components/MeetingRoom/VideoTile";
import { WaitingToast } from "../components/MeetingRoom/WaitingToast";
import { RoomModal, RoomModalHeader, RoomModalBody, RoomModalFooter } from "../components/MeetingRoom/RoomModal";
import { RoomFooterBtn } from "../components/MeetingRoom/RoomFooterBtn";

interface MeetingRoomProps {
  isGuest?: boolean;
}

type ConnectionStatus = "idle" | "waiting_approval" | "connected";

// Helper for coordinates
type Point = { x: number; y: number };
type RoomMessage = {
  id: number;
  sender_role: "host" | "guest" | "system";
  sender_name: string;
  message: string;
  created_at: string;
};
type RoomEvent = {
  id: number;
  event_type: string;
  payload_json: string | null;
  created_at: string;
};
type TranscriptEntry = {
  id: number;
  speaker_role: "host" | "guest" | "system";
  speaker_name: string;
  text: string;
  created_at: string;
};
type AssessmentEvent = {
  id: number;
  event_type: "start" | "answer" | "finish";
  assessment_id: string;
  question_id: string | null;
  payload_json: string | null;
  created_at: string;
};
type WaitingEntry = {
  id: number;
  guest_name: string;
  status: "waiting" | "approved" | "denied";
  created_at?: string;
};

const iceServers: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
];

const turnUrls = (import.meta.env.VITE_TURN_URL || "")
  .split(",")
  .map((value: string) => value.trim())
  .filter(Boolean);

if (turnUrls.length) {
  iceServers.push({
    urls: turnUrls,
    username: import.meta.env.VITE_TURN_USERNAME,
    credential: import.meta.env.VITE_TURN_CREDENTIAL,
  });
}

const ICE_CONFIG: RTCConfiguration = {
  iceServers,
  iceCandidatePoolSize: 10,
};

interface ReactionItem { id: string; emoji: string; sender: string; x: number; }

const ReactionsOverlay: React.FC<{ reactions: ReactionItem[] }> = ({ reactions }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
    {reactions.map((r) => (
      <div
        key={r.id}
        style={{
          position: "absolute",
          left: `${r.x}%`,
          bottom: "72px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4px",
          animation: "rxRise 3.5s ease-out forwards",
          willChange: "transform, opacity",
        }}
      >
        <span style={{ fontSize: "clamp(2.5rem,8vw,3.5rem)", lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))" }}>
          {r.emoji}
        </span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "white", background: "rgba(0,0,0,0.55)", padding: "2px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>
          {r.sender}
        </span>
      </div>
    ))}
  </div>
);

export const MeetingRoom: React.FC<MeetingRoomProps> = ({
  isGuest: isGuestProp = false,
}) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { resolvedMode } = useTheme();
  const { preferences, updatePreference } = useUserPreferences();
  const isDark = resolvedMode === 'dark';
  const hasAuthToken = Boolean(localStorage.getItem("psi_token"));
  const isGuest =
    isGuestProp || searchParams.get("guest") === "true" || !hasAuthToken;

  // --- Mode Check ---
  const isCompanionMode = searchParams.get("companion") === "true";
  const guestWaitingKey = id ? `psi_room_waiting_${id}` : null;
  const guestNameKey = id ? `psi_room_guest_name_${id}` : null;

  // --- States ---
  const [hasJoined, setHasJoined] = useState(isCompanionMode);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    isCompanionMode ? "connected" : "idle"
  );

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<
    "chat" | "whiteboard" | "assessments" | "none"
  >(isCompanionMode ? "whiteboard" : "none");

  // Host: Simulation State for Incoming Request
  const [incomingRequest, setIncomingRequest] = useState<{
    name: string;
    id: string;
  } | null>(null);
  const [remoteUserConnected, setRemoteUserConnected] = useState(false);
  const [remoteParticipantName, setRemoteParticipantName] = useState<
    string | null
  >(null);
  const [layoutMode, setLayoutMode] = useState<
    "focus" | "side-by-side" | "stacked"
  >("side-by-side");
  const [entryNotice, setEntryNotice] = useState<string | null>(null);
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
  const [waitingToken, setWaitingToken] = useState<string | null>(null);
  const [remoteWhiteboardActive, setRemoteWhiteboardActive] = useState(false);
  const [allowGuestDraw, setAllowGuestDraw] = useState(false);
  const [remoteAllowGuestDraw, setRemoteAllowGuestDraw] = useState(false);

  const [messages, setMessages] = useState<
    {
      sender: string;
      text: string;
      time: string;
      role?: "host" | "guest" | "system";
      isLocal?: boolean;
    }[]
  >([
    {
      sender: "Sistema",
      text: "Sala segura criada (Criptografia ponta-a-ponta).",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      role: "system",
      isLocal: false,
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [lastMessageId, setLastMessageId] = useState(0);
  const [lastEventId, setLastEventId] = useState(0);
  const [lastAssessmentId, setLastAssessmentId] = useState(0);
  const [lastTranscriptId, setLastTranscriptId] = useState(0);
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLinkDeviceModal, setShowLinkDeviceModal] = useState(false);
  const [linkDeviceTab, setLinkDeviceTab] = useState<"qr" | "link">("qr");
  const [companionConnected, setCompanionConnected] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [lobbyTab, setLobbyTab] = useState<"info" | "companion">("info");
  const [copied, setCopied] = useState(false);
  const [copiedCompanionLink, setCopiedCompanionLink] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [remoteScreenShareActive, setRemoteScreenShareActive] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [suppressMessageHistory, setSuppressMessageHistory] = useState(false);
  const [suppressEventHistory, setSuppressEventHistory] = useState(false);
  const [suppressAssessmentHistory, setSuppressAssessmentHistory] =
    useState(false);
  const [suppressTranscriptHistory, setSuppressTranscriptHistory] =
    useState(false);
  const [remoteTranscriptionRequested, setRemoteTranscriptionRequested] =
    useState(false);
  const [transcriptionActive, setTranscriptionActive] = useState(false);
  const [remoteStreamActive, setRemoteStreamActive] = useState(false);

  // Room public info (shown in guest lobby)
  const [roomInfo, setRoomInfo] = useState<{
    title: string | null;
    host_name: string | null;
    company_name: string | null;
    clinic_logo_url: string | null;
  } | null>(null);

  // Guest: session ended by host
  const [sessionEndedByHost, setSessionEndedByHost] = useState(false);

  useEffect(() => {
    if (!isGuest || !id) return;
    if (guestNameKey && !guestName) {
      const savedName = localStorage.getItem(guestNameKey);
      if (savedName) setGuestName(savedName);
    }
    if (guestWaitingKey && !waitingToken && !hasJoined) {
      const savedToken = localStorage.getItem(guestWaitingKey);
      if (savedToken) {
        setWaitingToken(savedToken);
        setParticipantToken(savedToken);
        setHasJoined(true);
        setConnectionStatus("waiting_approval");
      }
    }
  }, [
    isGuest,
    id,
    guestName,
    guestNameKey,
    waitingToken,
    hasJoined,
    guestWaitingKey,
  ]);

  useEffect(() => {
    if (!isGuest || !id || !guestNameKey) return;
    if (guestName.trim()) {
      localStorage.setItem(guestNameKey, guestName.trim());
    }
  }, [isGuest, id, guestName, guestNameKey]);

  // Assessment States
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(
    null
  );
  const [activeAssessmentHash, setActiveAssessmentHash] = useState<
    string | null
  >(null);
  const [assessmentForms, setAssessmentForms] = useState<ClinicalForm[]>([]);
  const [assessmentDetails, setAssessmentDetails] = useState<
    Record<string, ClinicalForm>
  >({});
  const [remoteAnswers, setRemoteAnswers] = useState<
    Record<string, { value: any; score: number }>
  >({});
  const [assessmentStatus, setAssessmentStatus] = useState<
    "idle" | "active" | "completed"
  >("idle");

  // Captions
  const [captionsOn, setCaptionsOn] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(true);
  const [guestTranscriptionEnabled, setGuestTranscriptionEnabled] =
    useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Gemini transcription
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>("");
  const [geminiKeySaved, setGeminiKeySaved] = useState(false);
  const [geminiRecording, setGeminiRecording] = useState(false);

  // Session key — identifica unicamente esta sessão para persistência
  const [sessionKey] = useState<string>(() => {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 7);
    return `${ts}-${rand}`;
  });
  const sessionStartRef = useRef<number>(Date.now());
  // ID numérico da sala resolvido do banco (id da URL pode ser hash/código)
  const [numericRoomId, setNumericRoomId] = useState<number | null>(null);
  const numericRoomIdRef = useRef<number | null>(null);

  // Gravação contínua do áudio local para upload ao encerrar
  const fullRecorderRef = useRef<MediaRecorder | null>(null);
  const fullAudioChunksRef = useRef<Blob[]>([]);
  const geminiStopResolveRef = useRef<(() => void) | null>(null);
  const [isUploadingRecording, setIsUploadingRecording] = useState(false);

  // Emoji reactions
  const [reactions, setReactions] = useState<Array<{ id: string; emoji: string; sender: string; x: number }>>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Mobile spotlight layout — split é o padrão no mobile
  const [mobileSwapped, setMobileSwapped] = useState(false);
  const [mobileSplit, setMobileSplit] = useState(() => window.innerWidth < 1024);
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 1024);

  // --- Refs ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pipLocalVideoRef = useRef<HTMLVideoElement | null>(null);
  const pipRemoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Aguarda o stream local ficar disponível (máx 8s) antes de processar WebRTC
  const waitForLocalStream = (): Promise<MediaStream | null> =>
    new Promise((resolve) => {
      if (localStreamRef.current) { resolve(localStreamRef.current); return; }
      const start = Date.now();
      const iv = setInterval(() => {
        if (localStreamRef.current) { clearInterval(iv); resolve(localStreamRef.current); return; }
        if (Date.now() - start > 8000) { clearInterval(iv); resolve(null); }
      }, 100);
    });
  const screenStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastMessageIdRef = useRef(0);
  const lastEventIdRef = useRef(0);
  const lastAssessmentIdRef = useRef(0);
  const lastTranscriptIdRef = useRef(0);
  const suppressMessageHistoryRef = useRef(false);
  const suppressEventHistoryRef = useRef(false);
  const suppressAssessmentHistoryRef = useRef(false);
  const suppressTranscriptHistoryRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const recognitionActiveRef = useRef(false);
  const geminiMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const geminiChunksRef = useRef<Blob[]>([]);
  const participantsRef = useRef<string[]>([]);
  const clientIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  // WebRTC
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);
  const sendRoomEventRef = useRef<((type: string, payload?: Record<string, any>) => Promise<void>) | null>(null);
  const participantTokenRef = useRef<string | null>(null);

  // Audio Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waitingAudioRef = useRef<HTMLAudioElement | null>(null);
  const entryAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordingMixerContextRef = useRef<AudioContext | null>(null);
  const recordingDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recordingLocalSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingRemoteSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recordingLocalTrackIdRef = useRef<string | null>(null);
  const recordingRemoteTrackIdRef = useRef<string | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState("#000000");
  const [drawSize, setDrawSize] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const lastPointRef = useRef<Point | null>(null);

  const meetingUrl = window.location.href.split("?")[0];
  const appointment = null as { title?: string; patientName?: string; psychologistName?: string } | null;
  const roomLabel = id ? `Sala ${id}` : "Sala";
  const hostDisplayName = appointment?.psychologistName || "Profissional";
  const patientDisplayName =
    remoteParticipantName || appointment?.patientName || "Paciente";
  const remoteDisplayName = isGuest ? hostDisplayName : patientDisplayName;
  const remoteInitial = remoteDisplayName?.charAt(0)?.toUpperCase() || "?";
  const localDisplayName = isGuest ? guestName || "Paciente" : "Você";
  const localInitial = localDisplayName.charAt(0).toUpperCase();
  const useGridLayout = !screenShare && layoutMode !== "focus";
  const waitingEntries = waitingList.length
    ? waitingList
    : incomingRequest
    ? [{ id: 0, guest_name: incomingRequest.name, status: "waiting" as const }]
    : [];
  const guestCanDraw = isCompanionMode ? true : (isGuest ? remoteAllowGuestDraw : allowGuestDraw);
  const hasSpeechSupport =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition);
  const transcriptText = transcriptLog
    .map((entry) => `[${entry.speaker_name}] ${entry.text}`)
    .join("\n");
  const activeAssessmentForm = activeAssessmentId
    ? assessmentDetails[activeAssessmentId]
    : null;
  const formatAnswerValue = (value: any) => {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };
  const formatAnswerDisplay = (question: FormQuestion, value: any) => {
    if (value === null || value === undefined) return "-";
    if (question.options && question.options.length) {
      if (Array.isArray(value)) {
        return value
          .map((item) => {
            const option = question.options?.find(
              (opt) => String(opt.value) === String(item)
            );
            return option ? option.label : String(item);
          })
          .join(", ");
      }
      const option = question.options.find(
        (opt) => String(opt.value) === String(value)
      );
      return option ? option.label : String(value);
    }
    return formatAnswerValue(value);
  };
  const buildAnswerPayload = (question: FormQuestion, rawValue: any) => {
    if (question.type === "checkbox") {
      const selected = Array.isArray(rawValue) ? rawValue : [];
      const score = (question.options || []).reduce((sum, opt) => {
        const optionScore = Number(opt.value);
        if (selected.includes(String(opt.value))) {
          return (
            sum + (Number.isFinite(optionScore) ? optionScore : 0)
          );
        }
        return sum;
      }, 0);
      return { value: selected, score };
    }
    if (question.type === "radio" || question.type === "select") {
      const option = question.options?.find(
        (opt) => String(opt.value) === String(rawValue)
      );
      const optionScore = Number(option?.value ?? 0);
      return {
        value: rawValue,
        score: Number.isFinite(optionScore) ? optionScore : 0,
      };
    }
    if (question.type === "number") {
      const score = Number(rawValue);
      return { value: rawValue, score: Number.isFinite(score) ? score : 0 };
    }
    return { value: rawValue, score: 0 };
  };

  // --- RESPONSIVE BREAKPOINT DETECTION ---
  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 1024);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // --- BROADCAST CHANNEL (Real-time Sync between tabs) ---
  useEffect(() => {
    // Unique channel per meeting ID
    const channel = new BroadcastChannel(`meeting_room_${id}`);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data;

      switch (type) {
        case "REQUEST_ENTRY":
          // Only host listens to this
          if (!isGuest && !isCompanionMode) {
            setIncomingRequest({ name: payload.name, id: payload.id });
            setRemoteParticipantName(payload.name || null);
          }
          break;

        case "ADMIT_GUEST":
          if (isGuest && connectionStatus === "waiting_approval") {
            setConnectionStatus("connected");
            setRemoteUserConnected(true);
          }
          if (!isGuest) {
            setIncomingRequest(null);
            setRemoteUserConnected(true);
          }
          break;

        case "DENY_GUEST":
          if (isGuest) {
            alert("Sua entrada foi negada pelo anfitrião.");
            setConnectionStatus("idle");
            setHasJoined(false);
          }
          if (!isGuest) setIncomingRequest(null);
          break;

        case "COMPANION_JOINED":
          if (!isGuest || hasAuthToken) {
            setShowLinkDeviceModal(false);
            setActiveSidePanel("whiteboard");
            setCompanionConnected(true);
            setTimeout(() => setCompanionConnected(false), 3000);
          }
          break;

        case "DRAW_START":
          remoteDrawStart(payload);
          break;

        case "DRAW_MOVE":
          remoteDrawMove(payload);
          break;

        case "CLEAR_BOARD":
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }
          break;

        // --- ASSESSMENT SYNC ---
        case "START_ASSESSMENT":
          if (isGuest) {
            setActiveAssessmentId(payload.id);
            setActiveAssessmentHash(payload.hash || null);
            setAssessmentStatus("active");
            setActiveSidePanel("assessments"); // Force open panel for guest
            setRemoteAnswers({});
          }
          break;

        case "UPDATE_ANSWER":
          if (!isGuest) {
            setRemoteAnswers((prev) => ({
              ...prev,
              [payload.questionId]: {
                value: payload.value,
                score: payload.score ?? 0,
              },
            }));
          }
          break;

        case "FINISH_ASSESSMENT":
          setAssessmentStatus("completed");
          break;
        case "CANCEL_ASSESSMENT":
          setRemoteAnswers({});
          setActiveAssessmentId(null);
          setActiveAssessmentHash(null);
          setAssessmentStatus("idle");
          if (isGuest) setActiveSidePanel("none");
          break;

        case "COMPANION_CONNECTED":
          if (!isGuest && !isCompanionMode) {
            setShowLinkDeviceModal(false);
            setActiveSidePanel("whiteboard");
            setCompanionConnected(true);
            setTimeout(() => setCompanionConnected(false), 4000);
          }
          break;
      }
    };

    if (isCompanionMode) {
      channel.postMessage({ type: "COMPANION_CONNECTED" });
    }

    return () => {
      channel.close();
    };
  }, [id, isGuest, isCompanionMode, connectionStatus]);

  // Companion mode: announce connection to host tab via BroadcastChannel
  useEffect(() => {
    if (!isCompanionMode || !id) return;
    const channel = new BroadcastChannel(`meeting_room_${id}`);
    channel.postMessage({ type: "COMPANION_CONNECTED" });
    channel.close();
  }, [isCompanionMode, id]);

  useEffect(() => {
    const handleGesture = () => {
      remoteVideoRef.current?.play().catch(() => {});
      localVideoRef.current?.play().catch(() => {});
      lobbyVideoRef.current?.play().catch(() => {});
      if (waitingAudioRef.current) {
        // Play and immediately pause to "unlock" the audio element for the browser
        waitingAudioRef.current.play()
          .then(() => {
            if (waitingList.length === 0) {
              waitingAudioRef.current?.pause();
              waitingAudioRef.current!.currentTime = 0;
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener("click", handleGesture, { once: true });
    return () => window.removeEventListener("click", handleGesture);
  }, [waitingList.length]);

  useEffect(() => {
    if (isGuest || !hasAuthToken) return;
    let active = true;
    const fetchForms = async () => {
      try {
        const formsData = await api.get<any[]>("/forms");
        if (!active) return;
        const mapped = (formsData || []).map((f) => ({
          id: String(f.id),
          title: f.title,
          hash: f.hash,
          description: f.description || "",
          questions: [],
          interpretations: [],
          responseCount: f.response_count ?? 0,
          isGlobal: Boolean(f.is_global),
        })) as ClinicalForm[];
        setAssessmentForms(mapped);
      } catch {
        if (active) setAssessmentForms([]);
      }
    };
    fetchForms();
    return () => {
      active = false;
    };
  }, [isGuest, hasAuthToken]);

  useEffect(() => {
    if (!activeAssessmentId) return;
    loadAssessmentForm(activeAssessmentId, activeAssessmentHash);
  }, [activeAssessmentId, activeAssessmentHash, assessmentDetails]);

  useEffect(() => {
    if (isGuest || !id || !hasAuthToken) return;
    let active = true;
    const fetchWaiting = async () => {
      try {
        const data = await api.get<WaitingEntry[]>(
          `/virtual-rooms/${id}/waiting`
        );
        if (!active) return;
        const list = Array.isArray(data) ? data : [];
        const filtered = list.filter((entry) => entry.status === "waiting");
        setWaitingList(filtered);
        if (filtered.length) {
          setRemoteParticipantName(filtered[0].guest_name);
        } else if (!remoteUserConnected) {
          setRemoteParticipantName(null);
        }
      } catch (err) {
        if (active) setWaitingList([]);
      }
    };
    fetchWaiting();
    const interval = setInterval(fetchWaiting, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isGuest, id, hasAuthToken, remoteUserConnected]);

  useEffect(() => {
    if (isGuest) return;
    if (waitingList.length > 0) {
      if (!waitingAudioRef.current) {
        waitingAudioRef.current = new Audio("/som/video-chamada.mp3");
        waitingAudioRef.current.loop = true;
      }
      waitingAudioRef.current.play().catch(() => {
        // Silent catch: Browser will block until first interaction
      });
    } else {
      if (waitingAudioRef.current) {
        waitingAudioRef.current.pause();
        waitingAudioRef.current.currentTime = 0;
      }
    }
    return () => {
      if (waitingAudioRef.current) {
        waitingAudioRef.current.pause();
      }
    };
  }, [waitingList.length, isGuest]);

  useEffect(() => {
    if (!isGuest || !waitingToken) return;
    let active = true;
    const pollStatus = async () => {
      try {
        const data = await api.get<{ status: string }>(
          `/virtual-rooms/public/waiting/${waitingToken}`
        );
        if (!active) return;
        if (data.status === "approved") {
          try {
            if (id) {
              await api.post(`/virtual-rooms/public/${id}/join`, {
                token: waitingToken,
                name: guestName,
              });
            }
            setConnectionStatus("connected");
            setRemoteUserConnected(true);
            setWaitingToken(null);
            if (guestWaitingKey) localStorage.removeItem(guestWaitingKey);
          } catch (err) {
            alert("Nao foi possivel entrar na sala.");
            setConnectionStatus("idle");
            setHasJoined(false);
            setWaitingToken(null);
            if (guestWaitingKey) localStorage.removeItem(guestWaitingKey);
          }
        } else if (data.status === "denied") {
          alert("Sua entrada foi negada.");
          setConnectionStatus("idle");
          setHasJoined(false);
          setWaitingToken(null);
          if (guestWaitingKey) localStorage.removeItem(guestWaitingKey);
        }
      } catch (err) {
        // keep polling
      }
    };
    pollStatus();
    const interval = setInterval(pollStatus, 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isGuest, waitingToken, id, guestName]);

  // --- ASSESSMENT HANDLERS ---
  const handleStartAssessment = async (assessId: string) => {
    // Garante que os detalhes (incluindo hash) estão carregados antes de iniciar
    let freshMapped: ClinicalForm | null = null;
    if (!assessmentDetails[assessId]) {
      try {
        const formData = await api.get<any>(`/forms/${assessId}`);
        freshMapped = normalizeForm(formData);
        setAssessmentDetails((prev) => ({ ...prev, [assessId]: freshMapped! }));
      } catch { /* segue mesmo sem detalhes */ }
    }
    const selected = freshMapped || assessmentDetails[assessId] || assessmentForms.find((form) => form.id === assessId);
    const formHash = selected?.hash || null;
    setActiveAssessmentId(assessId);
    setActiveAssessmentHash(formHash);
    setAssessmentStatus("active");
    setRemoteAnswers({});
    loadAssessmentForm(assessId, formHash);
    broadcastChannelRef.current?.postMessage({
      type: "START_ASSESSMENT",
      payload: { id: assessId, hash: formHash, title: selected?.title },
    });
    if (id) {
      api
        .post(`/virtual-rooms/${id}/assessments`, {
          event_type: "start",
          assessment_id: assessId,
          payload: {
            client_id: clientIdRef.current,
            form_hash: formHash,
            form_title: selected?.title,
          },
        })
        .catch(() => {});
    }
  };

  const handleRemoteAnswer = (qId: string, value: any, score: number = 0) => {
    // Called by Guest
    setRemoteAnswers((prev) => ({ ...prev, [qId]: { value, score } }));
    broadcastChannelRef.current?.postMessage({
      type: "UPDATE_ANSWER",
      payload: { questionId: qId, value, score },
    });
    if (id && activeAssessmentId) {
      if (isGuest && participantToken) {
        api
          .post(`/virtual-rooms/public/${id}/assessments`, {
            token: participantToken,
            event_type: "answer",
            assessment_id: activeAssessmentId,
            question_id: qId,
            payload: { value, score, client_id: clientIdRef.current },
          })
          .catch(() => {});
      }
    }
  };

  const handleFinishAssessment = () => {
    // Called by Guest
    setAssessmentStatus("completed");
    broadcastChannelRef.current?.postMessage({
      type: "FINISH_ASSESSMENT",
    });
    if (id) {
      if (isGuest && participantToken && activeAssessmentId) {
        api
          .post(`/virtual-rooms/public/${id}/assessments`, {
            token: participantToken,
            event_type: "finish",
            assessment_id: activeAssessmentId,
            payload: { client_id: clientIdRef.current },
          })
          .catch(() => {});
      }
    }
  };

  const handleCancelAssessment = () => {
    setActiveAssessmentId(null);
    setActiveAssessmentHash(null);
    setAssessmentStatus("idle");
    setRemoteAnswers({});
    broadcastChannelRef.current?.postMessage({
      type: "CANCEL_ASSESSMENT",
    });
  };

  const calculateHostResult = () => {
    if (!activeAssessmentId) return null;
    const data = assessmentDetails[activeAssessmentId];
    if (!data) return null;
    const values = Object.values(remoteAnswers) as Array<{ score?: number }>;
    return values.reduce((sum, entry) => sum + (entry?.score || 0), 0);
  };
  const getInterpretationForScore = (score: number | null) => {
    if (score === null || !activeAssessmentForm?.interpretations) return null;
    return activeAssessmentForm.interpretations.find(
      (rule) => score >= rule.minScore && score <= rule.maxScore
    );
  };

  const handleGuestAnswerChange = (
    question: FormQuestion,
    rawValue: any
  ) => {
    const payload = buildAnswerPayload(question, rawValue);
    handleRemoteAnswer(question.id, payload.value, payload.score);
  };

  const getQuestionText = (assessmentId: string, questionId: string) => {
    const data = assessmentDetails[assessmentId];
    if (!data) return "";
    const q = data.questions.find((item) => item.id === questionId);
    return q ? q.text : "";
  };

  const getAssessmentName = (assessmentId: string) => {
    const data = assessmentDetails[assessmentId];
    if (data) return data.title;
    const fallback = assessmentForms.find((form) => form.id === assessmentId);
    return fallback?.title || "Formulario";
  };

  const parsePayload = (payload: any) => {
    if (payload === null || payload === undefined) return null;
    if (typeof payload === "object") return payload;
    if (typeof payload === "string") {
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    }
    try {
      return JSON.parse(String(payload));
    } catch {
      return null;
    }
  };

  const normalizeForm = (formData: any): ClinicalForm => {
    return {
      id: String(formData.id),
      title: formData.title || "Formulario",
      hash: formData.hash || "",
      description: formData.description || "",
      questions: (formData.questions || []).map((q: any) => ({
        id: String(q.id ?? q.question_id),
        type: q.question_type || q.type || "text",
        text: q.question_text || q.text || "",
        required: Boolean(q.is_required ?? q.required),
        options: q.options_json
          ? typeof q.options_json === "string"
            ? JSON.parse(q.options_json)
            : q.options_json
          : q.options || [],
      })),
      interpretations: (formData.interpretations || []).map((r: any) => ({
        id: String(r.id),
        minScore: r.min_score ?? r.minScore,
        maxScore: r.max_score ?? r.maxScore,
        resultTitle: r.result_title ?? r.resultTitle,
        description: r.description || "",
        color: r.color || "bg-slate-100 text-slate-800",
      })),
      responseCount: formData.response_count ?? 0,
      isGlobal: Boolean(formData.is_global),
    };
  };

  const loadAssessmentForm = async (
    assessmentId: string,
    hash?: string | null
  ) => {
    if (!assessmentId || assessmentDetails[assessmentId]) return;
    try {
      if (isGuest || !hasAuthToken) {
        if (!hash) return;
        const formData = await api.get<any>(`/forms/public/${hash}`);
        const mapped = normalizeForm(formData);
        setAssessmentDetails((prev) => ({ ...prev, [assessmentId]: mapped }));
      } else {
        const formData = await api.get<any>(`/forms/${assessmentId}`);
        const mapped = normalizeForm(formData);
        setAssessmentDetails((prev) => ({ ...prev, [assessmentId]: mapped }));
      }
    } catch {
      // ignore load errors
    }
  };

  useEffect(() => {
    if (!id || !hasJoined) return;
    if (isGuest && connectionStatus !== "connected") return;
    let active = true;
    const fetchMessages = async () => {
      try {
        const endpoint = isGuest
          ? `/virtual-rooms/public/${id}/messages`
          : `/virtual-rooms/${id}/messages`;
        const rows = await api.get<RoomMessage[]>(endpoint, {
          since: String(lastMessageIdRef.current),
        });
        if (!active || !rows.length) return;
        if (suppressMessageHistoryRef.current) {
          const last = rows[rows.length - 1];
          lastMessageIdRef.current = last.id;
          setLastMessageId(last.id);
          suppressMessageHistoryRef.current = false;
          setSuppressMessageHistory(false);
          return;
        }
        const mapped = rows.map((msg) => {
          const isLocal = isGuest
            ? msg.sender_role === "guest"
            : msg.sender_role === "host";
          return {
            sender: msg.sender_name,
            text: msg.message || (msg as any).content || '',
            time: new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            role: msg.sender_role,
            isLocal,
          };
        });
        setMessages((prev) => [...prev, ...mapped]);
        const last = rows[rows.length - 1];
        lastMessageIdRef.current = last.id;
        setLastMessageId(last.id);
      } catch (err) {
        // ignore polling errors
      }
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 2500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, hasJoined, isGuest, connectionStatus, suppressMessageHistory]);

  useEffect(() => {
    if (isGuest) return;
    if (activeSidePanel === "whiteboard") {
      setRemoteWhiteboardActive(true);
      sendRoomEvent("whiteboard_open");
    } else if (remoteWhiteboardActive) {
      setRemoteWhiteboardActive(false);
      sendRoomEvent("whiteboard_close");
    }
  }, [activeSidePanel, isGuest, remoteWhiteboardActive]);

  useEffect(() => {
    if (isGuest) return;
    sendRoomEvent("whiteboard_permission", { allowed: allowGuestDraw });
  }, [allowGuestDraw, isGuest]);

  useEffect(() => {
    if (isGuest) return;
    if (transcriptionEnabled) {
      sendRoomEvent("transcription_on");
    } else {
      sendRoomEvent("transcription_off");
    }
  }, [transcriptionEnabled, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    if (!remoteTranscriptionRequested) {
      setGuestTranscriptionEnabled(false);
    }
  }, [isGuest, remoteTranscriptionRequested]);

  useEffect(() => {
    if (!isGuest) return;
    if (!remoteWhiteboardActive && activeSidePanel === "whiteboard") {
      setActiveSidePanel("none");
    }
  }, [isGuest, remoteWhiteboardActive, activeSidePanel]);

  const addReaction = useCallback((emoji: string, sender: string) => {
    const id_r = `${Date.now()}-${Math.random()}`;
    const x = 10 + Math.random() * 80;
    setReactions(prev => [...prev, { id: id_r, emoji, sender, x }]);
    setTimeout(() => setReactions(prev => prev.filter(r => r.id !== id_r)), 4000);
  }, []);

  useEffect(() => {
    if (!id || !hasJoined) return;
    if (isGuest && connectionStatus !== "connected") return;
    let active = true;
    const fetchEvents = async () => {
      try {
        const endpoint = isGuest
          ? `/virtual-rooms/public/${id}/events`
          : `/virtual-rooms/${id}/events`;
        const rows = await api.get<RoomEvent[]>(endpoint, {
          since: String(lastEventIdRef.current),
        });
        if (!active || !rows.length) return;
        if (suppressEventHistoryRef.current) {
          const last = rows[rows.length - 1];
          lastEventIdRef.current = last.id;
          setLastEventId(last.id);
          suppressEventHistoryRef.current = false;
          setSuppressEventHistory(false);
          // Even in suppress mode, still process WebRTC signaling events
          // so the guest doesn't miss an offer that was sent before they started polling
          // Collect ICE candidates from this batch to apply after offer is processed
          const iceCandidatesInBatch: RTCIceCandidateInit[] = [];
          rows.forEach((evt) => {
            if (!evt.event_type.startsWith('webrtc_')) return;
            const payload = parsePayload(evt.payload_json);
            if (evt.event_type === 'webrtc_ice' && payload?.candidate && !isCompanionMode) {
              iceCandidatesInBatch.push(payload.candidate);
            }
          });
          rows.forEach((evt) => {
            if (!evt.event_type.startsWith('webrtc_')) return;
            const payload = parsePayload(evt.payload_json);
            if (evt.event_type === 'webrtc_offer' && isGuest && !isCompanionMode && payload?.sdp) {
              (async () => {
                if (peerConnectionRef.current) {
                  peerConnectionRef.current.close();
                  peerConnectionRef.current = null;
                }
                setRemoteStreamActive(false);
                resetRecordingSource("remote");
                const stream = await waitForLocalStream();
                const pc = new RTCPeerConnection(ICE_CONFIG);
                peerConnectionRef.current = pc;
                if (stream) {
                  stream.getTracks().forEach(t => pc.addTrack(t, stream));
                }
                pc.onicecandidate = (e) => {
                  if (e.candidate) sendRoomEventRef.current?.('webrtc_ice', { candidate: e.candidate.toJSON() });
                };
                pc.ontrack = (e) => {
                  assignRemoteMediaStream(e.streams[0] || new MediaStream([e.track]));
                };
                let batchIceRestartTimer: ReturnType<typeof setTimeout> | null = null;
                pc.oniceconnectionstatechange = () => {
                  if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    if (batchIceRestartTimer) clearTimeout(batchIceRestartTimer);
                    batchIceRestartTimer = setTimeout(() => {
                      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        sendRoomEventRef.current?.('request_renegotiation', {});
                      }
                    }, 2000);
                  } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    if (batchIceRestartTimer) { clearTimeout(batchIceRestartTimer); batchIceRestartTimer = null; }
                  }
                };
                await pc.setRemoteDescription(new RTCSessionDescription({ type: payload.type, sdp: payload.sdp }));
                // Apply any ICE candidates that arrived with or before the offer
                for (const c of [...pendingIceCandidates.current, ...iceCandidatesInBatch]) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingIceCandidates.current = [];
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendRoomEventRef.current?.('webrtc_answer', { sdp: answer.sdp, type: answer.type });
              })().catch(() => {});
            }
          });
          return;
        }
        rows.forEach((evt) => {
          const payload = parsePayload(evt.payload_json);
          if (payload?.client_id && payload.client_id === clientIdRef.current)
            return;
          if (evt.event_type === "whiteboard_start") {
            remoteDrawStart(payload);
          } else if (evt.event_type === "whiteboard_move") {
            remoteDrawMove(payload);
          } else if (evt.event_type === "whiteboard_clear") {
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx && canvasRef.current) {
              ctx.clearRect(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
              );
            }
          } else if (evt.event_type === "whiteboard_open") {
            if (isGuest) {
              setRemoteWhiteboardActive(true);
              setActiveSidePanel("whiteboard");
            }
          } else if (evt.event_type === "whiteboard_close") {
            if (isGuest) {
              setRemoteWhiteboardActive(false);
              if (activeSidePanel === "whiteboard") setActiveSidePanel("none");
            }
          } else if (evt.event_type === "whiteboard_permission") {
            if (isGuest) {
              setRemoteAllowGuestDraw(Boolean(payload?.allowed));
            }
          } else if (evt.event_type === "transcription_on") {
            if (isGuest) {
              setRemoteTranscriptionRequested(true);
            }
          } else if (evt.event_type === "transcription_off") {
            if (isGuest) {
              setRemoteTranscriptionRequested(false);
            }
          } else if (evt.event_type === "screen_share_on") {
            setRemoteScreenShareActive(true);
          } else if (evt.event_type === "screen_share_off") {
            setRemoteScreenShareActive(false);
          } else if (evt.event_type === "webrtc_offer") {
            // Guest receives offer → create answer
            if (isGuest && !isCompanionMode && payload?.sdp) {
              (async () => {
                if (peerConnectionRef.current) {
                  peerConnectionRef.current.close();
                  peerConnectionRef.current = null;
                }
                setRemoteStreamActive(false);
                const stream = await waitForLocalStream();
                const pc = new RTCPeerConnection(ICE_CONFIG);
                peerConnectionRef.current = pc;
                if (stream) {
                  stream.getTracks().forEach(t => pc.addTrack(t, stream));
                }
                pc.onicecandidate = (e) => {
                  if (e.candidate) {
                    sendRoomEventRef.current?.('webrtc_ice', { candidate: e.candidate.toJSON() });
                  }
                };
                pc.onconnectionstatechange = () => {
                  console.log("Guest Connection State:", pc.connectionState);
                  if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                    setRemoteStreamActive(false);
                    resetRecordingSource("remote");
                  }
                };
                let guestIceRestartTimer: ReturnType<typeof setTimeout> | null = null;
                pc.oniceconnectionstatechange = () => {
                  console.log("Guest ICE State:", pc.iceConnectionState);
                  if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                    // Guest pede ao host para reenviar offer
                    if (guestIceRestartTimer) clearTimeout(guestIceRestartTimer);
                    guestIceRestartTimer = setTimeout(() => {
                      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        console.log("Guest: solicitando renegociação ao host...");
                        sendRoomEventRef.current?.('request_renegotiation', {});
                      }
                    }, 2000);
                  } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                    if (guestIceRestartTimer) { clearTimeout(guestIceRestartTimer); guestIceRestartTimer = null; }
                  }
                };
                pc.ontrack = (e) => {
                  assignRemoteMediaStream(e.streams[0] || new MediaStream([e.track]));
                };
                await pc.setRemoteDescription(new RTCSessionDescription({ type: payload.type, sdp: payload.sdp }));
                for (const c of pendingIceCandidates.current) {
                  await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingIceCandidates.current = [];
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendRoomEventRef.current?.('webrtc_answer', { sdp: answer.sdp, type: answer.type });
              })().catch(() => {});
            }
          } else if (evt.event_type === "webrtc_answer") {
            // Host receives answer
            if (!isGuest && peerConnectionRef.current && payload?.sdp) {
              peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription({ type: payload.type, sdp: payload.sdp })
              ).then(async () => {
                for (const c of pendingIceCandidates.current) {
                  await peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
                }
                pendingIceCandidates.current = [];
              }).catch(() => {});
            }
          } else if (evt.event_type === "webrtc_ice") {
            // Both sides receive ICE candidates
            if (payload?.candidate && !isCompanionMode) {
              const pc = peerConnectionRef.current;
              if (pc && pc.remoteDescription) {
                pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(() => {});
              } else {
                pendingIceCandidates.current.push(payload.candidate);
              }
            }
          } else if (evt.event_type === "request_renegotiation") {
            if (!isGuest && !isCompanionMode) {
              const trigger = remoteUserConnected;
              setRemoteUserConnected(false);
              setTimeout(() => setRemoteUserConnected(trigger), 100);
            }
          } else if (evt.event_type === "session_ended") {
            if (isGuest) {
              setSessionEndedByHost(true);
              cleanupMedia();
              const token = participantTokenRef.current;
              if (token && id) {
                api.post(`/virtual-rooms/public/${id}/leave`, { token }).catch(() => {});
              }
              if (guestWaitingKey) localStorage.removeItem(guestWaitingKey);
            }
          } else if (evt.event_type === "reaction") {
            addReaction(payload?.emoji || "👍", payload?.sender || "Participante");
          }
        });
        const last = rows[rows.length - 1];
        lastEventIdRef.current = last.id;
        setLastEventId(last.id);
      } catch (err) {
        // ignore polling errors
      }
    };
    fetchEvents();
    const interval = setInterval(fetchEvents, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, hasJoined, isGuest, connectionStatus, suppressEventHistory, addReaction]);

  useEffect(() => {
    if (!id || !hasJoined) return;
    if (isGuest && connectionStatus !== "connected") return;
    let active = true;
    const fetchAssessments = async () => {
      try {
        const endpoint = isGuest
          ? `/virtual-rooms/public/${id}/assessments`
          : `/virtual-rooms/${id}/assessments`;
        const rows = await api.get<AssessmentEvent[]>(endpoint, {
          since: String(lastAssessmentIdRef.current),
        });
        if (!active || !rows.length) return;
        if (suppressAssessmentHistoryRef.current) {
          const last = rows[rows.length - 1];
          lastAssessmentIdRef.current = last.id;
          setLastAssessmentId(last.id);
          suppressAssessmentHistoryRef.current = false;
          setSuppressAssessmentHistory(false);
          return;
        }
        rows.forEach((evt) => {
          const payload = parsePayload(evt.payload_json);
          if (payload?.client_id && payload.client_id === clientIdRef.current)
            return;
          if (evt.event_type === "start") {
            if (isGuest) {
              const formHash = payload?.form_hash || null;
              setActiveAssessmentId(evt.assessment_id);
              setActiveAssessmentHash(formHash);
              setAssessmentStatus("active");
              setActiveSidePanel("assessments");
              setRemoteAnswers({});
              loadAssessmentForm(evt.assessment_id, formHash);
            } else {
              setMessages((prev) => [
                ...prev,
                {
                  sender: "Sistema",
                  text: `Formulario iniciado: ${getAssessmentName(
                    evt.assessment_id
                  )}`,
                  time: new Date(evt.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  role: "system",
                  isLocal: false,
                },
              ]);
            }
          } else if (evt.event_type === "answer") {
            if (!isGuest && evt.question_id) {
              const answerValue = payload?.value ?? payload;
              const answerScore =
                typeof payload?.score === "number" ? payload.score : 0;
              setRemoteAnswers((prev) => ({
                ...prev,
                [evt.question_id as string]: {
                  value: answerValue,
                  score: answerScore,
                },
              }));
              const questionText = getQuestionText(
                evt.assessment_id,
                evt.question_id
              );
              const displayValue = Array.isArray(answerValue)
                ? answerValue.join(", ")
                : answerValue;
              const label = questionText
                ? `${questionText}: ${displayValue}`
                : `Resposta: ${displayValue}`;
              setMessages((prev) => [
                ...prev,
                {
                  sender: remoteDisplayName,
                  text: label,
                  time: new Date(evt.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  role: "guest",
                  isLocal: false,
                },
              ]);
            }
          } else if (evt.event_type === "finish") {
            if (!isGuest) {
              setAssessmentStatus("completed");
              setMessages((prev) => [
                ...prev,
                {
                  sender: "Sistema",
                  text: `Formulario finalizado: ${getAssessmentName(
                    evt.assessment_id
                  )}`,
                  time: new Date(evt.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  role: "system",
                  isLocal: false,
                },
              ]);
            }
          }
        });
        const last = rows[rows.length - 1];
        lastAssessmentIdRef.current = last.id;
        setLastAssessmentId(last.id);
      } catch (err) {
        // ignore polling errors
      }
    };
    fetchAssessments();
    const interval = setInterval(fetchAssessments, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, hasJoined, isGuest, connectionStatus, suppressAssessmentHistory]);

  useEffect(() => {
    if (!id || !hasJoined || isGuest) return;
    let active = true;
    const fetchTranscripts = async () => {
      try {
        const rows = await api.get<TranscriptEntry[]>(
          `/virtual-rooms/${id}/transcripts`,
          { since: String(lastTranscriptIdRef.current) }
        );
        if (!active || !rows.length) return;
        if (suppressTranscriptHistoryRef.current) {
          const last = rows[rows.length - 1];
          lastTranscriptIdRef.current = last.id;
          setLastTranscriptId(last.id);
          suppressTranscriptHistoryRef.current = false;
          setSuppressTranscriptHistory(false);
          return;
        }
        setTranscriptLog((prev) => [...prev, ...rows]);
        const last = rows[rows.length - 1];
        lastTranscriptIdRef.current = last.id;
        setLastTranscriptId(last.id);
      } catch (err) {
        // ignore polling errors
      }
    };
    fetchTranscripts();
    const interval = setInterval(fetchTranscripts, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, hasJoined, isGuest, suppressTranscriptHistory]);

  // Carrega info pública da sala (para lobby do guest)
  useEffect(() => {
    if (!id) return;
    api.get<{
      title: string | null;
      host_name: string | null;
      company_name: string | null;
      clinic_logo_url: string | null;
    }>(`/virtual-rooms/public/${id}/info`)
      .then((info) => setRoomInfo(info))
      .catch(() => {});
  }, [id]);

  // Resolve o ID numérico da sala imediatamente ao montar (URL pode ter hash)
  useEffect(() => {
    if (!id || !hasAuthToken) return;
    api.get<{ id: number }>(`/virtual-rooms/${id}`)
      .then((room) => {
        if (room?.id) {
          numericRoomIdRef.current = room.id;
          setNumericRoomId(room.id);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hasAuthToken]);

  useEffect(() => {
    if (!id || !hasAuthToken) return;
    let active = true;
    const fetchParticipants = async () => {
      try {
        const rows = await api.get<{ name: string }[]>(
          `/virtual-rooms/${id}/participants`
        );
        if (!active) return;
        const names = rows.map((r) => r.name);
        const prev = participantsRef.current;
        if (!prev.length && names.length) {
          if (!entryAudioRef.current) {
            entryAudioRef.current = new Audio("/som/video-chamada.mp3");
          }
          entryAudioRef.current.currentTime = 0;
          entryAudioRef.current.play().catch(() => {});
        }
        if (prev.length && names.length === 0) {
          setEntryNotice(`${prev[0]} saiu da sala.`);
          setRemoteUserConnected(false);
          setRemoteParticipantName(null);
        }
        if (!prev.length && names.length) {
          setRemoteUserConnected(true);
          setRemoteParticipantName(names[0]);
        }
        participantsRef.current = names;
        setParticipants(names);
      } catch (err) {
        // ignore polling errors
      }
    };
    fetchParticipants();
    const interval = setInterval(fetchParticipants, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [id, hasAuthToken]);

  useEffect(() => {
    if (!isGuest || !participantToken || !id) return;
    const leavePayload = JSON.stringify({ token: participantToken });
    const leaveUrl = `${API_BASE_URL}/virtual-rooms/public/${id}/leave`;
    const handleUnload = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(leaveUrl, leavePayload);
      } else {
        fetch(leaveUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: leavePayload,
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [isGuest, participantToken, id]);

  // --- Initialize Media (once, not on hasJoined changes) ---
  useEffect(() => {
    if (isCompanionMode) return;
    let mounted = true;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        localStreamRef.current = stream;
        attachRecordingStream(stream, "local");

        // Assign to both video refs immediately — the visible one will display it
        if (lobbyVideoRef.current) lobbyVideoRef.current.srcObject = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        setupAudioAnalysis(stream);

        // Inicia gravação de áudio desde a sala de espera (host only)
        if (!isGuest && !isCompanionMode && !fullRecorderRef.current) {
          sessionStartRef.current = Date.now();
          // startFullRecording usa localStreamRef internamente, já disponível
          setTimeout(() => {
            if (mounted && !fullRecorderRef.current) startFullRecording();
          }, 200);
        }

        // Inicia transcrição assim que o stream estiver disponível
        // (o useEffect de transcriptionEnabled roda antes do stream estar pronto)
        if (!isGuest && !isCompanionMode) {
          setTimeout(() => {
            if (!mounted) return;
            if (transcriptionEnabled && !recognitionActiveRef.current && !geminiMediaRecorderRef.current) {
              const hasGemini = (preferences.gemini.apiKeys?.some((k: string) => k.trim())) || preferences.gemini.apiKey.trim();
              if (hasGemini) {
                // Inicia o indicador de gravação em segundo plano para transcrição detalhada no final
                setTranscriptionActive(true);
              } else {
                startRecognition();
              }
            }
          }, 500);
        }
      } catch (err) {
        console.error("Error accessing media:", err);
        if (!mounted) return;
        setCameraOn(false);
        setMicOn(false);
      }
    };

    initMedia();

    return () => {
      mounted = false;
      cleanupMedia();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompanionMode]);

  // Re-assign stream to correct video element when join state changes
  useEffect(() => {
    if (isCompanionMode || !localStreamRef.current) return;
    if (hasJoined && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    } else if (!hasJoined && lobbyVideoRef.current) {
      lobbyVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [hasJoined, connectionStatus, isCompanionMode]);

  useEffect(() => {
    if (!remoteUserConnected) return;
    const message = `${remoteDisplayName} entrou na sala.`;
    setEntryNotice(message);
    const timeout = setTimeout(() => setEntryNotice(null), 3000);
    return () => clearTimeout(timeout);
  }, [remoteUserConnected, remoteDisplayName]);

  // WebRTC: host creates offer when remote user connects
  useEffect(() => {
    if (!remoteUserConnected || isGuest || isCompanionMode) return;
    const timer = setTimeout(async () => {
      if (!localStreamRef.current) return;
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      setRemoteStreamActive(false);
      const pc = new RTCPeerConnection(ICE_CONFIG);
      peerConnectionRef.current = pc;
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
      pc.ontrack = (e) => {
        assignRemoteMediaStream(e.streams[0] || new MediaStream([e.track]));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendRoomEventRef.current?.('webrtc_ice', { candidate: e.candidate.toJSON() });
        }
      };
      let iceRestartTimer: ReturnType<typeof setTimeout> | null = null;
      pc.oniceconnectionstatechange = () => {
        console.log("Host ICE State:", pc.iceConnectionState);
        if (pc.iceConnectionState === 'disconnected') {
          // Tenta ICE restart após 2s se ainda desconectado
          iceRestartTimer = setTimeout(async () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
              console.log("Host: tentando ICE restart...");
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                await sendRoomEventRef.current?.('webrtc_offer', { sdp: offer.sdp, type: offer.type });
              } catch (err) {
                console.warn("ICE restart falhou, reagendando reconexão completa", err);
                setRemoteUserConnected(false);
                setTimeout(() => setRemoteUserConnected(true), 500);
              }
            }
          }, 2000);
        } else if (pc.iceConnectionState === 'failed') {
          console.log("Host: ICE failed, forçando reconexão completa...");
          if (iceRestartTimer) clearTimeout(iceRestartTimer);
          setRemoteUserConnected(false);
          setTimeout(() => setRemoteUserConnected(true), 500);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          if (iceRestartTimer) { clearTimeout(iceRestartTimer); iceRestartTimer = null; }
        }
      };
      pc.onconnectionstatechange = () => {
        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          setRemoteStreamActive(false);
          resetRecordingSource("remote");
        }
      };
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendRoomEventRef.current?.('webrtc_offer', { sdp: offer.sdp, type: offer.type });
      } catch (err) {
        console.error('WebRTC offer error:', err);
      }
    }, 800);
    return () => { clearTimeout(timer); };
  }, [remoteUserConnected, isGuest, isCompanionMode, hasJoined]);

  const restartRoomConnection = () => {
    if (!remoteUserConnected) return;
    setRemoteStreamActive(false);
    resetRecordingSource("remote");
    if (isGuest) {
      // Guest sends a signal to host to re-offer
      sendRoomEvent('request_renegotiation');
    } else {
      // Host forced offer
      const trigger = remoteUserConnected;
      setRemoteUserConnected(false);
      setTimeout(() => setRemoteUserConnected(trigger), 100);
    }
  };

  useEffect(() => {
    if (isGuest && hasJoined) {
      // Logic to handle renegotiation request from host or manual
    }
  }, [isGuest, hasJoined]);

  const handleAdmitGuest = async (entry?: WaitingEntry) => {
    const name =
      entry?.guest_name ||
      incomingRequest?.name ||
      remoteParticipantName ||
      "Paciente";
    if (entry && entry.id > 0 && id) {
      try {
        await api.post(`/virtual-rooms/${id}/waiting/${entry.id}/approve`, {});
      } catch (err) {
        // keep flow
      }
    } else {
      broadcastChannelRef.current?.postMessage({ type: "ADMIT_GUEST" });
    }
    setRemoteUserConnected(true);
    setRemoteParticipantName(name);
    setIncomingRequest(null);
    if (entry && entry.id > 0) {
      setWaitingList((prev) => prev.filter((item) => item.id !== entry.id));
    }
    if (!isGuest) {
      setHasJoined(true);
      setConnectionStatus("connected");
    }
    setMessages((prev) => [
      ...prev,
      {
        sender: "System",
        text: `${name} entrou na sala.`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const handleDenyGuest = async (entry?: WaitingEntry) => {
    if (entry && entry.id > 0 && id) {
      try {
        await api.post(`/virtual-rooms/${id}/waiting/${entry.id}/deny`, {});
      } catch (err) {
        // keep flow
      }
      setWaitingList((prev) => prev.filter((item) => item.id !== entry.id));
    } else {
      broadcastChannelRef.current?.postMessage({ type: "DENY_GUEST" });
    }
    setIncomingRequest(null);
    setRemoteParticipantName(null);
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      source.connect(analyser);
      analyser.fftSize = 256;

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      visualizeAudio();
    } catch (e) {
      console.error("Audio Context Error", e);
    }
  };

  const resetRecordingSource = (kind: "local" | "remote") => {
    const sourceRef =
      kind === "local" ? recordingLocalSourceRef : recordingRemoteSourceRef;
    const trackIdRef =
      kind === "local" ? recordingLocalTrackIdRef : recordingRemoteTrackIdRef;
    try {
      sourceRef.current?.disconnect();
    } catch {
      // ignore
    }
    sourceRef.current = null;
    trackIdRef.current = null;
  };

  const ensureRecordingMixer = () => {
    const AudioContextCtor =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return null;

    if (
      !recordingMixerContextRef.current ||
      recordingMixerContextRef.current.state === "closed"
    ) {
      const context = new AudioContextCtor();
      recordingMixerContextRef.current = context;
      recordingDestinationRef.current = context.createMediaStreamDestination();
    }

    if (recordingMixerContextRef.current.state === "suspended") {
      recordingMixerContextRef.current.resume().catch(() => {});
    }

    return {
      context: recordingMixerContextRef.current,
      destination: recordingDestinationRef.current!,
    };
  };

  const attachRecordingStream = (
    stream: MediaStream | null,
    kind: "local" | "remote"
  ) => {
    const audioTrack = stream?.getAudioTracks?.()[0];
    if (!audioTrack) {
      resetRecordingSource(kind);
      return recordingDestinationRef.current?.stream ?? null;
    }

    const trackIdRef =
      kind === "local" ? recordingLocalTrackIdRef : recordingRemoteTrackIdRef;
    const sourceRef =
      kind === "local" ? recordingLocalSourceRef : recordingRemoteSourceRef;

    if (trackIdRef.current === audioTrack.id && sourceRef.current) {
      return recordingDestinationRef.current?.stream ?? null;
    }

    const mixer = ensureRecordingMixer();
    if (!mixer) return null;

    resetRecordingSource(kind);
    const sourceNode = mixer.context.createMediaStreamSource(
      new MediaStream([audioTrack])
    );
    sourceNode.connect(mixer.destination);
    sourceRef.current = sourceNode;
    trackIdRef.current = audioTrack.id;

    audioTrack.addEventListener(
      "ended",
      () => {
        if (trackIdRef.current === audioTrack.id) {
          resetRecordingSource(kind);
        }
      },
      { once: true }
    );

    return mixer.destination.stream;
  };

  const getRecordingStream = () => {
    attachRecordingStream(localStreamRef.current, "local");
    const remoteStream =
      remoteVideoRef.current?.srcObject instanceof MediaStream
        ? remoteVideoRef.current.srcObject
        : null;
    if (remoteStream) {
      attachRecordingStream(remoteStream, "remote");
    }
    return recordingDestinationRef.current?.stream ?? localStreamRef.current;
  };

  const assignRemoteMediaStream = (stream: MediaStream | null) => {
    if (!stream) return;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = stream;
      remoteVideoRef.current.play().catch(() => {});
    }
    // Sincroniza o PiP remoto se estiver montado
    if (pipRemoteVideoRef.current) {
      pipRemoteVideoRef.current.srcObject = stream;
      pipRemoteVideoRef.current.play().catch(() => {});
    }
    attachRecordingStream(stream, "remote");
    setRemoteStreamActive(true);
  };

  const cleanupRecordingMixer = () => {
    resetRecordingSource("local");
    resetRecordingSource("remote");
    recordingDestinationRef.current = null;
    const context = recordingMixerContextRef.current;
    recordingMixerContextRef.current = null;
    context?.close().catch(() => {});
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    setAudioLevel(average);

    animationFrameRef.current = requestAnimationFrame(visualizeAudio);
  };

  const cleanupMedia = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    if (animationFrameRef.current)
      cancelAnimationFrame(animationFrameRef.current);
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    screenStreamRef.current = null;
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    cleanupRecordingMixer();
    setRemoteStreamActive(false);
  };

  // --- Toggle Functions ---

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
        setCameraOn(!cameraOn);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (screenShare) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setScreenShare(false);
      sendRoomEvent("screen_share_off");
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = stream;
        setScreenShare(true);
        sendRoomEvent("screen_share_on");
        stream.getVideoTracks()[0].onended = () => {
          setScreenShare(false);
          screenStreamRef.current = null;
          sendRoomEvent("screen_share_off");
        };
      } catch (err) {
        console.error("Error sharing screen:", err);
      }
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(meetingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (screenShare && screenShareRef.current && screenStreamRef.current) {
      screenShareRef.current.srcObject = screenStreamRef.current;
    }
  }, [screenShare]);

  useEffect(() => {
    if (hasJoined && !isCompanionMode && connectionStatus === "connected") {
      const timer = setInterval(() => setElapsedTime((prev) => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [hasJoined, isCompanionMode, connectionStatus]);

  // Inicia gravação assim que o stream local estiver disponível (sala de espera)
  // Assim o áudio desde o início da sessão é capturado, mesmo antes de entrar
  useEffect(() => {
    if (!isGuest && !isCompanionMode && localStreamRef.current && !fullRecorderRef.current) {
      sessionStartRef.current = Date.now();
      startFullRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, isGuest, isCompanionMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // --- Whiteboard Logic ---

  // Helpers
  const getCoordinates = (
    e: React.MouseEvent | React.TouchEvent,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const sendRoomEvent = async (
    eventType: string,
    payload?: Record<string, any>
  ) => {
    if (!id) return;
    if (isGuest && !guestCanDraw && eventType.startsWith("whiteboard_")) return;
    if (
      isGuest &&
      (eventType === "whiteboard_open" ||
        eventType === "whiteboard_close" ||
        eventType === "whiteboard_permission")
    )
      return;
    const body = {
      event_type: eventType,
      payload: payload
        ? { ...payload, client_id: clientIdRef.current }
        : { client_id: clientIdRef.current },
    };
    try {
      if (isGuest) {
        if (!participantToken) return;
        await api.post(`/virtual-rooms/public/${id}/events`, {
          token: participantToken,
          ...body,
        });
      } else {
        await api.post(`/virtual-rooms/${id}/events`, body);
      }
    } catch (err) {
      // ignore event errors
    }
  };

  // Always keep ref pointing to latest sendRoomEvent closure
  sendRoomEventRef.current = sendRoomEvent;
  participantTokenRef.current = participantToken;

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (isGuest && !guestCanDraw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getCoordinates(e, canvas);
    lastPointRef.current = pos;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);

    // Broadcast
    broadcastChannelRef.current?.postMessage({
      type: "DRAW_START",
      payload: { x: pos.x, y: pos.y, color: drawColor },
    });
    sendRoomEvent("whiteboard_start", { x: pos.x, y: pos.y, color: drawColor });
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (isGuest && !guestCanDraw) return;
    if (!isDrawing || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getCoordinates(e, canvas);

    const activeColor = isEraser ? "#ffffff" : drawColor;
    const activeSize = isEraser ? drawSize * 4 : drawSize;
    ctx.lineWidth = activeSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = activeColor;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Broadcast
    broadcastChannelRef.current?.postMessage({
      type: "DRAW_MOVE",
      payload: {
        startX: lastPointRef.current.x,
        startY: lastPointRef.current.y,
        endX: pos.x,
        endY: pos.y,
        color: activeColor,
        size: activeSize,
      },
    });
    sendRoomEvent("whiteboard_move", {
      startX: lastPointRef.current.x,
      startY: lastPointRef.current.y,
      endX: pos.x,
      endY: pos.y,
      color: activeColor,
      size: activeSize,
    });

    lastPointRef.current = pos;
  };

  const stopDrawing = () => {
    if (isGuest && !guestCanDraw) return;
    setIsDrawing(false);
    lastPointRef.current = null;
  };

  // Remote Drawing Handlers
  const remoteDrawStart = (data: { x: number; y: number; color: string }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(data.x, data.y);
  };

  const remoteDrawMove = (data: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    color: string;
    size?: number;
  }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineWidth = data.size || 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = data.color;

    ctx.beginPath();
    ctx.moveTo(data.startX, data.startY);
    ctx.lineTo(data.endX, data.endY);
    ctx.stroke();
  };

  const clearCanvas = () => {
    if (isGuest && !guestCanDraw) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      broadcastChannelRef.current?.postMessage({ type: "CLEAR_BOARD" });
      sendRoomEvent("whiteboard_clear");
    }
  };

  const sendCompanionLinkToChat = async () => {
    if (!id) return;
    const link = getCompanionUrl();
    const message = `📋 Link da Lousa Interativa: ${link}`;
    try {
      await api.post(`/virtual-rooms/${id}/messages`, {
        sender_name: hostDisplayName,
        message,
      });
      setMessages((prev) => [
        ...prev,
        {
          sender: hostDisplayName,
          text: message,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          isLocal: true,
        },
      ]);
      setActiveSidePanel("chat");
      setShowLinkDeviceModal(false);
    } catch {}
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    const message = newMessage.trim();
    setNewMessage("");
    try {
      if (isGuest) {
        if (!participantToken) return;
        await api.post(`/virtual-rooms/public/${id}/messages`, {
          token: participantToken,
          sender_name: guestName || "Paciente",
          message,
        });
      } else {
        await api.post(`/virtual-rooms/${id}/messages`, {
          sender_name: hostDisplayName,
          message,
        });
      }
    } catch (err) {
      // ignore send errors; polling will keep UI consistent
    }
  };

  const sendReaction = (emoji: string) => {
    sendRoomEventRef.current?.("reaction", { emoji, sender: localDisplayName, client_id: clientIdRef.current });
    addReaction(emoji, localDisplayName);
  };

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcriptText);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch {
      // ignore
    }
  };

  const persistTranscriptText = async (
    text: string,
    options?: {
      speakerName?: string;
      speakerRole?: TranscriptEntry["speaker_role"];
    }
  ) => {
    if (!text || !id) return;

    const payload = {
      room_id: numericRoomIdRef.current ?? numericRoomId ?? undefined,
      speaker_name:
        options?.speakerName ??
        (isGuest ? guestName || "Paciente" : hostDisplayName),
      speaker_role:
        options?.speakerRole ??
        (isGuest ? "guest" as const : "host" as const),
      session_key: sessionKey,
      text,
    };

    if (isGuest) {
      if (!participantToken) return;
      await api.post(`/virtual-rooms/public/${id}/transcripts`, {
        token: participantToken,
        ...payload,
      });
      return;
    }

    await api.post(`/virtual-rooms/${id}/transcripts`, payload);
  };

  const stopRecognition = () => {
    if (recognitionRef.current && recognitionActiveRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    recognitionActiveRef.current = false;
    setTranscriptionActive(false);
  };

  const startRecognition = async () => {
    if (!hasSpeechSupport || recognitionActiveRef.current) return;
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      const text = finalText.trim();
      if (!text) return;
      persistTranscriptText(text).catch(() => {});
    };
    recognition.onend = () => {
      if (recognitionActiveRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore
        }
      }
    };
    recognition.onerror = () => {
      // ignore errors, allow retry
    };
    recognitionRef.current = recognition;
    recognitionActiveRef.current = true;
    setTranscriptionActive(true);
    try {
      recognition.start();
    } catch {
      recognitionActiveRef.current = false;
      setTranscriptionActive(false);
    }
  };

  useEffect(() => {
    if (isGuest) return;
    if (!transcriptionEnabled) {
      stopRecognition();
      stopGeminiRecording();
      return;
    }
    const hasGemini = (preferences.gemini.apiKeys?.some(k => k.trim())) || preferences.gemini.apiKey.trim();
    if (hasGemini) {
      // Inicia o indicador de gravação em segundo plano para transcrição detalhada no final
      setTranscriptionActive(true);
    } else {
      startRecognition();
    }
    return () => { stopRecognition(); stopGeminiRecording(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcriptionEnabled, isGuest]);

  useEffect(() => {
    if (!isGuest) return;
    if (!guestTranscriptionEnabled) {
      stopRecognition();
      stopGeminiRecording();
      return;
    }
    const hasGemini = (preferences.gemini.apiKeys?.some(k => k.trim())) || preferences.gemini.apiKey.trim();
    if (hasGemini) {
      // Inicia o indicador de gravação em segundo plano para transcrição detalhada no final
      setTranscriptionActive(true);
    } else {
      startRecognition();
    }
    return () => { stopRecognition(); stopGeminiRecording(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestTranscriptionEnabled, isGuest]);

  const saveGeminiKey = () => {
    const key = geminiKeyInput.trim();
    updatePreference('gemini', { apiKey: key });
    setGeminiKeySaved(true);
    setTimeout(() => setGeminiKeySaved(false), 2000);
  };

  // sync input when preferences load
  useEffect(() => {
    if (preferences.gemini.apiKey && !geminiKeyInput) {
      setGeminiKeyInput(preferences.gemini.apiKey);
    }
  }, [preferences.gemini.apiKey]);

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const normalizeGeminiAudioMimeType = (mimeType?: string) => {
    const normalized = (mimeType || "").toLowerCase();
    if (normalized.includes("webm")) return "audio/webm";
    if (normalized.includes("ogg")) return "audio/ogg";
    if (normalized.includes("wav")) return "audio/wav";
    if (normalized.includes("mp4")) return "audio/mp4";
    if (normalized.includes("mpeg") || normalized.includes("mp3")) {
      return "audio/mpeg";
    }
    return "audio/webm";
  };

  const transcribeWithGemini = async (audioBlob: Blob, prompt: string) => {
    const keys = (preferences.gemini.apiKeys?.filter(k => k.trim()) ?? []);
    if (keys.length === 0 && preferences.gemini.apiKey.trim()) {
      keys.push(preferences.gemini.apiKey.trim());
    }
    if (keys.length === 0 || !id) return "";

    const base64Audio = await blobToBase64(audioBlob);
    const mimeType = normalizeGeminiAudioMimeType(audioBlob.type);

    const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-2.5-pro"];
    for (const key of keys) {
      for (const model of GEMINI_MODELS) {
        try {
          const ai = new GoogleGenAI({ apiKey: key });
          const response = await ai.models.generateContent({
            model,
            contents: [
              {
                parts: [
                  { inlineData: { mimeType, data: base64Audio } },
                  { text: prompt },
                ],
              },
            ],
          });
          const text = response.text?.trim() || "";
          if (text) return text;
        } catch (error: any) {
          const is429 = error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('RESOURCE_EXHAUSTED');
          console.warn(`Erro Gemini na transcricao [${model}]`, is429 ? '429/quota' : error);
          if (!is429) break;
        }
      }
    }

    return "";
  };

  const transcribeChunkWithGemini = async (audioBlob: Blob) => {
    try {
      const transcribed = await transcribeWithGemini(
        audioBlob,
        "Transcreva este áudio em português brasileiro. Retorne apenas o texto transcrito, sem explicações ou formatação adicional."
      );
      if (!transcribed) return;
      await persistTranscriptText(transcribed);
    } catch {
      // ignore
    }
  };

  const transcribeChunkWithGeminiNormalized = async (audioBlob: Blob) => {
    try {
      const transcribed = await transcribeWithGemini(
        audioBlob,
        "Transcreva este áudio em português brasileiro. Retorne apenas o texto transcrito, sem explicações ou formatação adicional."
      );
      if (!transcribed) return false;
      await persistTranscriptText(transcribed);
      return true;
    } catch {
      return false;
    }
  };

  const transcribeFullSessionWithGemini = async (audioBlob: Blob) => {
    try {
      const transcribed = await transcribeWithGemini(
        audioBlob,
        "Transcreva este áudio completo em português brasileiro. Identifique os falantes quando possível como Profissional e Paciente. Retorne apenas a transcrição final, sem explicações adicionais."
      );
      if (!transcribed) return false;
      await persistTranscriptText(transcribed, {
        speakerName: "Transcrição da sessão",
        speakerRole: "system",
      });
      return true;
    } catch {
      return false;
    }
  };

  const startGeminiRecording = () => {
    const stream = getRecordingStream();
    if (!stream || geminiMediaRecorderRef.current) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    const audioStream = new MediaStream([audioTrack]);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/ogg";
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(audioStream, { mimeType });
    } catch {
      return;
    }
    geminiChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        geminiChunksRef.current.push(e.data);
      }
    };
    recorder.onstop = async () => {
      // 1. Captura os pedaços de áudio imediatamente para podermos reiniciar o gravador sem perder áudio
      const chunks = geminiChunksRef.current;
      geminiChunksRef.current = [];

      // 2. Reinicia o gravador imediatamente, eliminando o delay/buraco de gravação
      if (geminiMediaRecorderRef.current) {
        try {
          geminiMediaRecorderRef.current.start();
          setTimeout(() => {
            if (geminiMediaRecorderRef.current?.state === "recording") {
              geminiMediaRecorderRef.current.stop();
            }
          }, 6000);
        } catch {
          // ignore
        }
      } else if (geminiStopResolveRef.current) {
        const resolve = geminiStopResolveRef.current;
        geminiStopResolveRef.current = null;
        resolve();
      }

      // 3. Envia o áudio para transcrição em segundo plano (sem bloquear a gravação atual)
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: mimeType });
        transcribeChunkWithGeminiNormalized(blob).catch(() => {});
      }
    };
    geminiMediaRecorderRef.current = recorder;
    setGeminiRecording(true);
    setTranscriptionActive(true);
    recorder.start();
    setTimeout(() => {
      if (geminiMediaRecorderRef.current?.state === "recording") {
        geminiMediaRecorderRef.current.stop();
      }
    }, 6000);
  };

  const stopGeminiRecording = (): Promise<void> => {
    const recorder = geminiMediaRecorderRef.current;
    if (!recorder) return Promise.resolve();
    geminiMediaRecorderRef.current = null;
    setGeminiRecording(false);
    setTranscriptionActive(false);
    if (recorder.state === "inactive") return Promise.resolve();
    return new Promise((resolve) => {
      geminiStopResolveRef.current = resolve;
      try {
        recorder.stop();
      } catch {
        geminiStopResolveRef.current = null;
        resolve();
      }
    });
  };

  const startFullRecording = () => {
    if (!id || isGuest) return; // only host records
    const stream = getRecordingStream();
    if (!stream || fullRecorderRef.current) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;
    const audioStream = new MediaStream([audioTrack]);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
      ? "audio/ogg;codecs=opus"
      : "";
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined);
    } catch {
      return;
    }
    fullAudioChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) fullAudioChunksRef.current.push(e.data);
    };
    fullRecorderRef.current = recorder;
    recorder.start(5000); // collect chunks every 5s
  };

  const stopAndUploadRecording = (): Promise<void> => {
    return new Promise((resolve) => {
      const recorder = fullRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.onstop = async () => {
        fullRecorderRef.current = null;
        const chunks = fullAudioChunksRef.current;
        fullAudioChunksRef.current = [];
        if (!id || chunks.length === 0) { resolve(); return; }
        const mimeType = chunks[0].type || "audio/webm";
        const ext = mimeType.includes("ogg") ? "ogg" : "webm";
        const blob = new Blob(chunks, { type: mimeType });
        const formData = new FormData();
        formData.append("audio", blob, `recording-${sessionKey}.${ext}`);
        formData.append("speaker_role", "mixed");
        formData.append("speaker_name", hostDisplayName);
        if (numericRoomIdRef.current ?? numericRoomId) {
          formData.append("room_id", String(numericRoomIdRef.current ?? numericRoomId));
        }
        setIsUploadingRecording(true);
        try {
          let hasExistingTranscript = false;
          try {
            const existing = await api.get<TranscriptEntry[]>(
              `/virtual-rooms/${id}/transcripts`,
              { since: "0" }
            );
            hasExistingTranscript = Array.isArray(existing) && existing.length > 0;
          } catch {
            hasExistingTranscript = transcriptLog.length > 0;
          }

          if (!hasExistingTranscript && transcriptionEnabled) {
            await transcribeFullSessionWithGemini(blob);
          }

          await api.post(`/virtual-rooms/${id}/sessions/${sessionKey}/recordings`, formData);
        } catch {
          // non-critical
        } finally {
          setIsUploadingRecording(false);
        }
        resolve();
      };
      try {
        recorder.stop();
      } catch {
        fullRecorderRef.current = null;
        resolve();
      }
    });
  };

  const handleEndCall = async () => {
    await stopGeminiRecording();
    if (!isGuest && id) {
      const durationSeconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
      // Upload gravação de áudio se houver
      if (fullRecorderRef.current) {
        setIsUploadingRecording(true);
        await stopAndUploadRecording();
        setIsUploadingRecording(false);
      }
      // Sempre marca sessão como encerrada no banco (registra transcrições)
      try {
        await api.post(`/virtual-rooms/${id}/sessions/${sessionKey}/end`, {
          duration_seconds: durationSeconds,
          room_id: numericRoomIdRef.current ?? numericRoomId ?? undefined,
        });
      } catch {
        // non-critical
      }
    }
    // Notifica o guest que a sessão foi encerrada pelo host
    if (!isGuest && id) {
      try {
        await api.post(`/virtual-rooms/${id}/events`, {
          event_type: "session_ended",
          payload: { client_id: clientIdRef.current },
        });
      } catch {
        // non-critical
      }
    }
    cleanupMedia();
    if (isGuest && participantToken && id) {
      try {
        await api.post(`/virtual-rooms/public/${id}/leave`, {
          token: participantToken,
        });
      } catch (err) {
        // ignore leave errors
      }
    }
    if (isGuest && guestWaitingKey) {
      localStorage.removeItem(guestWaitingKey);
    }
    navigate(isGuest ? "/" : "/salas-virtuais");
  };

  const getCompanionUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("companion", "true");
    return url.toString();
  };

  const handleJoin = async () => {
    if (isGuest && !guestName.trim()) {
      alert("Por favor, digite seu nome para entrar.");
      return;
    }

    // reset state per session (no chat cache)
    setMessages([
      {
        sender: "Sistema",
        text: "Sala segura criada (Criptografia ponta-a-ponta).",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        role: "system",
        isLocal: false,
      },
    ]);
    setRemoteAnswers({});
    setActiveAssessmentId(null);
    setAssessmentStatus("idle");
    setLastMessageId(0);
    setLastEventId(0);
    setLastAssessmentId(0);
    setLastTranscriptId(0);
    setTranscriptLog([]);
    lastMessageIdRef.current = 0;
    lastEventIdRef.current = 0;
    lastAssessmentIdRef.current = 0;
    lastTranscriptIdRef.current = 0;
    suppressMessageHistoryRef.current = true;
    suppressEventHistoryRef.current = true;
    suppressAssessmentHistoryRef.current = true;
    suppressTranscriptHistoryRef.current = true;
    setSuppressMessageHistory(true);
    setSuppressEventHistory(true);
    setSuppressAssessmentHistory(true);
    setSuppressTranscriptHistory(true);

    // Garante que o ID numérico está resolvido antes de entrar na sala
    if (!numericRoomIdRef.current && id && hasAuthToken) {
      try {
        const room = await api.get<{ id: number }>(`/virtual-rooms/${id}`);
        if (room?.id) { numericRoomIdRef.current = room.id; setNumericRoomId(room.id); }
      } catch { /* non-critical */ }
    }

    setHasJoined(true);

    if (isGuest) {
      setConnectionStatus("waiting_approval");
      if (id) {
        try {
          const data = await api.post<{ token: string }>(
            `/virtual-rooms/public/${id}/waiting`,
            { name: guestName }
          );
          setWaitingToken(data.token);
          setParticipantToken(data.token);
          if (guestWaitingKey) {
            localStorage.setItem(guestWaitingKey, data.token);
          }
        } catch (err) {
          alert("Nao foi possivel entrar na fila.");
          setConnectionStatus("idle");
          setHasJoined(false);
          return;
        }
      }
      // Optional: keep local broadcast for same-browser sessions
      broadcastChannelRef.current?.postMessage({
        type: "REQUEST_ENTRY",
        payload: { name: guestName, id: "guest-" + Date.now() },
      });
    } else {
      setConnectionStatus("connected");
    }
  };

  // --- RENDER: COMPANION MODE (TABLET/PHONE) ---
  if (isCompanionMode) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col font-sans">
        <div className="h-14 bg-slate-900 flex items-center justify-between px-4 text-white shrink-0">
          <div className="flex items-center gap-2">
            <Tablet size={20} />
            <span className="font-bold text-sm">Lousa Companion</span>
          </div>
          <button
            onClick={clearCanvas}
            className="p-2 hover:bg-white/10 rounded-full"
          >
            <Eraser size={20} />
          </button>
        </div>
        <div className="flex-1 relative overflow-hidden bg-white" style={{ backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={900}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`touch-none block ${
              isGuest && !guestCanDraw
                ? "cursor-default pointer-events-none"
                : isEraser ? "cursor-cell" : "cursor-crosshair"
            }`}
          />
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 bg-white/95 p-2 rounded-2xl border border-slate-200 shadow-lg backdrop-blur-sm">
            {["#000000", "#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#ffffff"].map(
                (color) => (
                  <button
                    key={color}
                    onClick={() => { setDrawColor(color); setIsEraser(false); }}
                    className={`w-8 h-8 rounded-full transition-all ${
                      !isEraser && drawColor === color
                        ? "ring-2 ring-slate-800 ring-offset-1 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color, border: color === "#ffffff" ? "1px solid #e2e8f0" : "none" }}
                  />
                )
              )}
              <div className="w-full h-px bg-slate-200 my-1" />
              {[2, 5, 10].map((size) => (
                <button
                  key={size}
                  onClick={() => { setDrawSize(size); setIsEraser(false); }}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    !isEraser && drawSize === size ? "bg-slate-200" : "hover:bg-slate-100"
                  }`}
                >
                  <div className="rounded-full bg-slate-800" style={{ width: Math.min(size * 2, 20), height: Math.min(size * 2, 20) }} />
                </button>
              ))}
              <div className="w-full h-px bg-slate-200 my-1" />
              <button
                onClick={() => setIsEraser(!isEraser)}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  isEraser ? "bg-amber-100 text-amber-700" : "hover:bg-slate-100 text-slate-500"
                }`}
                title="Borracha"
              >
                <Eraser size={16} />
              </button>
            </div>
        </div>
      </div>
    );
  }

  // --- RENDER: SESSION ENDED BY HOST (GUEST) ---
  if (sessionEndedByHost) {
    return (
      <div className="fixed inset-0 bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-6 text-center font-sans">
        {/* Clinic header */}
        {(roomInfo?.clinic_logo_url || roomInfo?.company_name) && (
          <div className="flex items-center gap-3 mb-8">
            {roomInfo.clinic_logo_url && (
              <img
                src={roomInfo.clinic_logo_url}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain border border-slate-200 bg-white p-1"
              />
            )}
            <div className="text-left">
              <div className="font-bold text-slate-800 text-sm">{roomInfo.company_name || roomInfo.host_name}</div>
              {roomInfo.host_name && roomInfo.company_name && (
                <div className="text-xs text-slate-500">{roomInfo.host_name}</div>
              )}
            </div>
          </div>
        )}
        <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-6">
          <PhoneOff size={36} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Sessão encerrada</h2>
        <p className="text-slate-500 max-w-sm mb-8">
          O profissional encerrou a sessão. Obrigado pela sua presença.
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-4 py-2 rounded-full">
          <ShieldAlert size={13} />
          <span>Conexão encerrada com segurança</span>
        </div>
      </div>
    );
  }

  // --- RENDER: WAITING ROOM (GUEST) ---
  if (hasJoined && connectionStatus === "waiting_approval") {
    return (
      <div className="fixed inset-0 bg-[#0f1115] text-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        {/* Clinic info top */}
        {(roomInfo?.clinic_logo_url || roomInfo?.company_name) && (
          <div className="absolute top-6 flex items-center gap-2.5">
            {roomInfo.clinic_logo_url && (
              <img
                src={roomInfo.clinic_logo_url}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-contain border border-white/10 bg-white/5 p-1"
              />
            )}
            <div className="text-left">
              <div className="text-sm font-bold text-white">{roomInfo.company_name || roomInfo.host_name}</div>
              {roomInfo.host_name && roomInfo.company_name && (
                <div className="text-xs text-slate-400">{roomInfo.host_name}</div>
              )}
            </div>
          </div>
        )}
        <div className="relative w-28 h-28 mb-8">
          <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
          <div className="relative w-full h-full bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700">
            <User size={56} className="text-slate-400" />
          </div>
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          Aguardando permissão
        </h2>
        <p className="text-slate-400 text-base max-w-sm mb-6">
          Você está na sala de espera.{" "}
          {roomInfo?.host_name ? (
            <><strong className="text-slate-300">{roomInfo.host_name}</strong> irá permitir sua entrada em breve.</>
          ) : "O profissional irá permitir sua entrada em breve."}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">
          <ShieldAlert size={14} />
          <span>Conexão Segura Criptografada</span>
        </div>
      </div>
    );
  }

  // --- RENDER: LOBBY (PRE-FLIGHT) ---
  if (!hasJoined) {
    return (
      <div className="fixed inset-0 bg-slate-50 text-slate-800 flex flex-col font-sans overflow-y-auto">
        {!isGuest && (
          <WaitingToast
            entries={waitingEntries}
            onAdmit={handleAdmitGuest}
            onDeny={handleDenyGuest}
            dark={false}
          />
        )}

        {/* Mobile header */}
        <div className="lg:hidden px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900">Sala de Espera</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {isGuest ? "Você foi convidado para uma reunião" : `${appointment?.title || "Consulta"} · ${patientDisplayName}`}
            </p>
          </div>
          <div className="flex gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${micOn ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {micOn ? <Mic size={10} /> : <MicOff size={10} />}
            </span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cameraOn ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
              {cameraOn ? <Video size={10} /> : <VideoOff size={10} />}
            </span>
          </div>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center p-3 lg:p-6">
          <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 lg:gap-6">
          {/* Left Column: Video Preview */}
          <div className="flex flex-col justify-center animate-[fadeIn_0.5s_ease-out]">
            <div className="hidden lg:block mb-5">
              <h1 className="text-3xl font-display font-bold text-slate-900">Sala de Espera</h1>
              <p className="text-slate-500 mt-1 text-sm">
                {isGuest
                  ? "Você foi convidado para uma reunião"
                  : `${appointment?.title || "Consulta"} · ${patientDisplayName}`}
              </p>
            </div>

            <div className="relative w-full bg-slate-900 rounded-2xl overflow-hidden shadow-xl ring-2 ring-white mb-3" style={{ aspectRatio: "16/9", maxHeight: "40vh" }}>
              <video
                ref={lobbyVideoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover scale-x-[-1] ${cameraOn ? '' : 'hidden'}`}
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                    <VideoOff size={22} />
                  </div>
                  <span className="text-slate-500 text-xs font-medium">Câmera desativada</span>
                </div>
              )}

              {/* Audio level bars */}
              <div className="absolute bottom-3 left-3 sm:bottom-5 sm:left-5 flex gap-1 h-4 items-end">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-75 ${micOn ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-red-500"}`}
                    style={{ height: micOn ? `${Math.max(20, audioLevel * (i * 0.8))}%` : "3px" }}
                  />
                ))}
              </div>

              {/* Media controls */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-white/10">
                <button
                  onClick={toggleMic}
                  title={micOn ? "Desativar microfone" : "Ativar microfone"}
                  className={`p-2 rounded-xl transition-all ${micOn ? "bg-white/90 text-slate-900 hover:bg-white" : "bg-red-500/90 text-white hover:bg-red-500"}`}
                >
                  {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button
                  onClick={toggleCam}
                  title={cameraOn ? "Desativar câmera" : "Ativar câmera"}
                  className={`p-2 rounded-xl transition-all ${cameraOn ? "bg-white/90 text-slate-900 hover:bg-white" : "bg-red-500/90 text-white hover:bg-red-500"}`}
                >
                  {cameraOn ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                <button
                  onClick={() => setShowSettingsModal(true)}
                  title="Configurações de áudio/vídeo"
                  className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-all"
                >
                  <Settings size={16} />
                </button>
              </div>
            </div>

            {/* Status badges — desktop only (mobile shows in header) */}
            <div className="hidden lg:flex gap-2 flex-wrap items-center">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${micOn ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {micOn ? <Mic size={11} /> : <MicOff size={11} />}
                {micOn ? "Microfone ativo" : "Microfone desativado"}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cameraOn ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {cameraOn ? <Video size={11} /> : <VideoOff size={11} />}
                {cameraOn ? "Câmera ativa" : "Câmera desativada"}
              </span>
              {!isGuest && (
                <button
                  onClick={() => setTranscriptionEnabled(v => !v)}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${
                    transcriptionEnabled
                      ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                  title="Clique para ativar/desativar transcrição automática"
                >
                  <Subtitles size={11} />
                  {transcriptionEnabled ? "Transcrição ativa" : "Transcrição desativada"}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Controls & Info */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col animate-[slideUpFade_0.5s_ease-out] overflow-hidden">
            {isGuest ? (
              <div className="flex flex-col flex-1 overflow-y-auto">
                {/* Clinic / Professional header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    {roomInfo?.clinic_logo_url ? (
                      <img
                        src={roomInfo.clinic_logo_url}
                        alt="Logo"
                        className="w-12 h-12 rounded-xl object-contain border border-slate-200 bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#2a74ac]/10 text-[#2a74ac] flex items-center justify-center shrink-0">
                        <Video size={22} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 text-sm truncate leading-tight">
                        {roomInfo?.company_name || roomInfo?.host_name || "Consultório"}
                      </div>
                      {roomInfo?.host_name && roomInfo?.company_name && (
                        <div className="text-xs text-slate-500 truncate">
                          {roomInfo.host_name}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {roomInfo?.title || "Sala de Atendimento Virtual"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Segurança info */}
                <div className="mx-6 mt-4 mb-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
                  <ShieldAlert size={15} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-emerald-700">Ambiente Seguro</div>
                    <div className="text-[11px] text-emerald-600">Criptografia ponta-a-ponta ativada</div>
                  </div>
                </div>

                {/* Name form */}
                <div className="px-6 py-4 space-y-3 flex-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sua Identificação</div>
                  <Input
                    label="Como você prefere ser chamado?"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Digite seu nome..."
                    iconLeft={<User size={15} />}
                    onKeyDown={(e) => e.key === "Enter" && guestName.trim() && handleJoin()}
                  />
                </div>

                <div className="px-6 pb-6">
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleJoin}
                    disabled={!guestName.trim()}
                    iconLeft={<LogIn size={16} />}
                  >
                    Pedir para Entrar
                  </Button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Você ficará na sala de espera até o profissional permitir sua entrada.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Tab bar */}
                <div className="flex border-b border-slate-100">
                  <button
                    onClick={() => setLobbyTab("info")}
                    className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                      lobbyTab === "info"
                        ? "border-[#2a74ac] text-[#2a74ac]"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Info size={14} /> Detalhes
                  </button>
                  <button
                    onClick={() => setLobbyTab("companion")}
                    className={`flex-1 py-3.5 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                      lobbyTab === "companion"
                        ? "border-purple-500 text-purple-600"
                        : "border-transparent text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    <Tablet size={14} /> Lousa
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {lobbyTab === "info" ? (
                    <div className="space-y-4">
                      {/* Room info card */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2a74ac]/10 text-[#2a74ac] flex items-center justify-center shrink-0">
                          <Video size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sala</div>
                          <div className="font-bold text-slate-800 text-sm truncate">{roomLabel}</div>
                          <div className="text-xs text-slate-400 truncate">Código: {id}</div>
                        </div>
                      </div>

                      {/* Link */}
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Link da Sala</div>
                        <Input
                          readOnly
                          value={meetingUrl}
                          iconRight={
                            <button onClick={handleCopyLink} className="text-slate-400 hover:text-[#2a74ac] transition-colors">
                              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                            </button>
                          }
                        />
                        <p className="text-[11px] text-slate-400 mt-1">Compartilhe este link com o paciente.</p>
                      </div>

                      {/* Participants */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Paciente</div>
                          <div className="text-sm font-bold text-slate-800 truncate">{patientDisplayName}</div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Profissional</div>
                          <div className="text-sm font-bold text-slate-800 truncate">{hostDisplayName}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Lousa Companion</div>
                        <p className="text-sm text-slate-500">Use em um tablet ou celular para controlar a lousa durante a sessão.</p>
                      </div>
                      <Input
                        readOnly
                        value={getCompanionUrl()}
                        iconRight={
                          <button
                            onClick={() => navigator.clipboard.writeText(getCompanionUrl())}
                            className="text-slate-400 hover:text-[#2a74ac] transition-colors"
                          >
                            <Copy size={14} />
                          </button>
                        }
                      />
                      <Button
                        fullWidth
                        variant="secondary"
                        onClick={() => window.open(getCompanionUrl(), "_blank")}
                        iconLeft={<Tablet size={14} />}
                      >
                        Abrir Lousa Companion
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="p-4 border-t border-slate-100 flex gap-2">
                  <Button
                    fullWidth
                    size="lg"
                    onClick={handleJoin}
                    iconLeft={<LogIn size={16} />}
                  >
                    Entrar na Sala
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/salas-virtuais")}
                  >
                    Voltar
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  }


  return (
    <div className="fixed inset-0 bg-[#0f1115] text-white flex flex-col">
      <style>{`
        @keyframes rxRise {
          0%   { transform: translate3d(0, 0px, 0);    opacity: 0; }
          10%  { transform: translate3d(0, -24px, 0);  opacity: 1; }
          80%  { transform: translate3d(0, -220px, 0); opacity: 1; }
          100% { transform: translate3d(0, -260px, 0); opacity: 0; }
        }
      `}</style>
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/10 bg-[#111319]">
        <div className="flex items-center gap-3">
          <ArrowLeft
            size={18}
            className="text-slate-400 cursor-pointer"
            onClick={() => navigate("/salas-virtuais")}
          />
          <div>
            <div className="text-sm font-bold">{roomLabel}</div>
            <div className="text-xs text-slate-400">
              {remoteUserConnected ? "Conectado" : "Aguardando participante"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={restartRoomConnection}
            className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-colors"
          >
            Refazer Conexão
          </button>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <Clock size={14} />
            {formatTime(elapsedTime)}
          </div>
        </div>
      </header>

      {entryNotice && (
        <div className={isMobileView
          ? "absolute top-16 inset-x-4 z-30 pointer-events-none"
          : "px-4 pt-3"
        }>
          <div className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm text-center">
            {entryNotice}
          </div>
        </div>
      )}

      {companionConnected && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[200] animate-[slideUpFade_0.3s_ease-out]">
          <div className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-sm font-bold">
            <Check size={16} />
            Lousa vinculada com sucesso!
          </div>
        </div>
      )}

      <main className={`flex-1 flex overflow-hidden min-h-0 ${isMobileView ? "" : "flex-col lg:flex-row gap-4 p-4"}`}>
        {!isGuest && (
          <WaitingToast
            entries={waitingEntries}
            onAdmit={handleAdmitGuest}
            onDeny={handleDenyGuest}
            dark
          />
        )}
        <section className="flex-1 relative min-h-0 min-w-0">
          {!isMobileView ? (
            /* ── Desktop: grid lado a lado ── */
            <div className={`grid h-full gap-3 ${useGridLayout ? "grid-cols-2" : "grid-cols-1"}`}>
              <RemoteVideoTile
                videoRef={remoteVideoRef}
                remoteUserConnected={remoteUserConnected}
                remoteStreamActive={remoteStreamActive}
                remoteDisplayName={remoteDisplayName}
                remoteInitial={remoteInitial}
                screenShareRef={screenShareRef}
                screenShare={screenShare}
              />
              <VideoTile
                videoRef={localVideoRef}
                label={localDisplayName}
                isLocal
                cameraOn={cameraOn}
                initial={localInitial}
                audioLevel={audioLevel}
                micOn={micOn}
              />
              <ReactionsOverlay reactions={reactions} />
            </div>
          ) : mobileSplit ? (
            /* ── Mobile: split screen — dois vídeos empilhados ── */
            <div className="absolute inset-0 flex flex-col">
              {/* Vídeo de cima */}
              <div className="flex-1 relative min-h-0">
                {mobileSwapped ? (
                  <VideoTile
                    videoRef={localVideoRef}
                    label={localDisplayName}
                    isLocal
                    cameraOn={cameraOn}
                    initial={localInitial}
                    audioLevel={audioLevel}
                    micOn={micOn}
                    className="absolute inset-0 !rounded-none !min-h-0"
                  />
                ) : (
                  <RemoteVideoTile
                    videoRef={remoteVideoRef}
                    remoteUserConnected={remoteUserConnected}
                    remoteStreamActive={remoteStreamActive}
                    remoteDisplayName={remoteDisplayName}
                    remoteInitial={remoteInitial}
                    screenShareRef={screenShareRef}
                    screenShare={screenShare}
                    className="absolute inset-0 !rounded-none !min-h-0"
                  />
                )}
              </div>
              {/* Divisor */}
              <div className="h-0.5 bg-white/10 shrink-0" />
              {/* Vídeo de baixo */}
              <div className="flex-1 relative min-h-0">
                {mobileSwapped ? (
                  <RemoteVideoTile
                    videoRef={remoteVideoRef}
                    remoteUserConnected={remoteUserConnected}
                    remoteStreamActive={remoteStreamActive}
                    remoteDisplayName={remoteDisplayName}
                    remoteInitial={remoteInitial}
                    screenShareRef={screenShareRef}
                    screenShare={screenShare}
                    className="absolute inset-0 !rounded-none !min-h-0"
                  />
                ) : (
                  <VideoTile
                    videoRef={localVideoRef}
                    label={localDisplayName}
                    isLocal
                    cameraOn={cameraOn}
                    initial={localInitial}
                    audioLevel={audioLevel}
                    micOn={micOn}
                    className="absolute inset-0 !rounded-none !min-h-0"
                  />
                )}
              </div>
              {/* Botão trocar posição */}
              <button
                className="absolute top-1/2 right-3 -translate-y-1/2 z-20 rounded-full bg-black/50 border border-white/20 p-2 active:scale-95 transition-transform"
                onClick={() => setMobileSwapped(v => !v)}
                title="Inverter vídeos"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </button>
              {/* Botão alternar para PiP */}
              <button
                className="absolute top-3 right-3 z-20 rounded-full bg-black/50 border border-white/20 p-2 active:scale-95 transition-transform"
                onClick={() => setMobileSplit(false)}
                title="Modo spotlight"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="3"/>
                  <rect x="13" y="13" width="8" height="8" rx="1.5" fill="white" stroke="none"/>
                </svg>
              </button>
              <ReactionsOverlay reactions={reactions} />
            </div>
          ) : (
            /* ── Mobile: spotlight fullscreen + PiP card ── */
            <div className="absolute inset-0">
              {/* Vídeo principal (fullscreen) */}
              {mobileSwapped ? (
                <VideoTile
                  videoRef={localVideoRef}
                  label={localDisplayName}
                  isLocal
                  cameraOn={cameraOn}
                  initial={localInitial}
                  audioLevel={audioLevel}
                  micOn={micOn}
                  className="absolute inset-0 !rounded-none !min-h-0"
                />
              ) : (
                <RemoteVideoTile
                  videoRef={remoteVideoRef}
                  remoteUserConnected={remoteUserConnected}
                  remoteStreamActive={remoteStreamActive}
                  remoteDisplayName={remoteDisplayName}
                  remoteInitial={remoteInitial}
                  screenShareRef={screenShareRef}
                  screenShare={screenShare}
                  className="absolute inset-0 !rounded-none !min-h-0"
                />
              )}

              {/* PiP card — vídeo secundário com ref próprio para não conflitar */}
              <div
                className="absolute bottom-[5.5rem] right-3 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl cursor-pointer z-20 active:scale-95 transition-transform bg-[#101216]"
                onClick={() => setMobileSwapped(v => !v)}
                title="Toque para inverter"
              >
                {mobileSwapped ? (
                  /* PiP mostra remoto */
                  <video
                    ref={(el) => {
                      pipRemoteVideoRef.current = el;
                      if (el && remoteVideoRef.current?.srcObject) {
                        el.srcObject = remoteVideoRef.current.srcObject;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  /* PiP mostra local */
                  <video
                    ref={(el) => {
                      pipLocalVideoRef.current = el;
                      if (el && localStreamRef.current) {
                        el.srcObject = localStreamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                )}
                {/* Ícone de swap */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-100 sm:opacity-0 sm:hover:opacity-100 transition-opacity pointer-events-none">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                  </svg>
                </div>
              </div>

              {/* Botão alternar para split */}
              <button
                className="absolute bottom-[5.5rem] left-3 z-20 rounded-full bg-black/50 border border-white/20 p-2 active:scale-95 transition-transform"
                onClick={() => setMobileSplit(true)}
                title="Dividir tela"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="3"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                </svg>
              </button>

              <ReactionsOverlay reactions={reactions} />
            </div>
          )}
        </section>

        {activeSidePanel !== "none" && (
          <>
          {/* Mobile backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setActiveSidePanel("none")}
          />
          <aside className="fixed inset-x-0 bottom-16 top-16 z-50 lg:static lg:inset-auto lg:z-auto w-full lg:w-96 bg-[#111319] border border-white/10 lg:rounded-2xl rounded-t-2xl p-4 flex flex-col overflow-hidden shadow-2xl lg:shadow-none">
            {/* Mobile close button */}
            <button
              className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg bg-white/10 text-slate-300 hover:bg-white/20"
              onClick={() => setActiveSidePanel("none")}
            >
              <X size={16} />
            </button>
            {activeSidePanel === "chat" && (
              <>
                <div className="text-sm font-bold mb-3">Chat</div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {messages.map((msg, idx) => (
                    <div
                      key={`${msg.time}-${idx}`}
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        msg.isLocal
                          ? "ml-auto bg-indigo-600/70 text-white"
                          : "bg-white/10 text-slate-200"
                      }`}
                    >
                      <div className="text-[10px] text-slate-300/80 mb-1">
                        {msg.sender}
                      </div>
                      <div>{msg.text}</div>
                    </div>
                  ))}
                </div>
                <form
                  onSubmit={handleSendMessage}
                  className="mt-3 flex items-center gap-2"
                >
                  <input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-[#0f1115] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}

            {activeSidePanel === "whiteboard" && (
              <>
                {/* Lousa Header */}
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <PenTool size={14} className="text-slate-400" />
                    <span className="text-sm font-bold">Lousa</span>
                    {isGuest && !guestCanDraw && (
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Somente leitura</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isGuest && (
                      <button
                        onClick={() => setShowLinkDeviceModal(true)}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                        title="Vincular dispositivo"
                      >
                        <QrCode size={12} /> QR
                      </button>
                    )}
                    {(!isGuest || guestCanDraw) && (
                      <button
                        onClick={clearCanvas}
                        className="text-xs text-slate-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Eraser size={12} /> Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Toolbar */}
                {(!isGuest || guestCanDraw) && (
                  <div className="flex flex-col gap-1.5 mb-2 flex-shrink-0">
                    {/* Colors */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {[
                        "#000000", "#ffffff", "#ef4444", "#f97316",
                        "#eab308", "#22c55e", "#3b82f6", "#8b5cf6",
                        "#ec4899", "#64748b",
                      ].map((color) => (
                        <button
                          key={color}
                          onClick={() => { setDrawColor(color); setIsEraser(false); }}
                          title={color}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all flex-shrink-0 ${
                            !isEraser && drawColor === color
                              ? "ring-2 ring-white ring-offset-1 ring-offset-[#111319] scale-110"
                              : "opacity-80 hover:opacity-100 hover:scale-105"
                          }`}
                          style={{ backgroundColor: color, border: color === "#ffffff" ? "1px solid rgba(255,255,255,0.2)" : "none" }}
                        />
                      ))}
                    </div>
                    {/* Size + Eraser */}
                    <div className="flex items-center gap-1 sm:gap-2">
                      {[1, 3, 6, 12].map((size) => (
                        <button
                          key={size}
                          onClick={() => { setDrawSize(size); setIsEraser(false); }}
                          title={`Espessura ${size}px`}
                          className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                            !isEraser && drawSize === size
                              ? "bg-white/20 ring-1 ring-white/40"
                              : "hover:bg-white/10"
                          }`}
                        >
                          <div
                            className="rounded-full bg-white"
                            style={{ width: Math.min(size * 2, 18), height: Math.min(size * 2, 18) }}
                          />
                        </button>
                      ))}
                      <div className="w-px h-5 bg-white/10 mx-0.5" />
                      <button
                        onClick={() => setIsEraser(!isEraser)}
                        title="Borracha"
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isEraser
                            ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30"
                            : "text-slate-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <Eraser size={12} />
                        <span className="hidden sm:inline">Borracha</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Canvas */}
                <div className="flex-1 min-h-[280px] bg-white rounded-xl overflow-hidden border border-white/10 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={1200}
                    height={900}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className={`w-full h-full touch-none block ${
                      isGuest && !guestCanDraw
                        ? "cursor-default pointer-events-none"
                        : isEraser
                        ? "cursor-cell"
                        : "cursor-crosshair"
                    }`}
                    style={{ background: "radial-gradient(#e5e7eb 1px, transparent 1px)", backgroundSize: "20px 20px", backgroundColor: "#ffffff" }}
                  />
                </div>
              </>
            )}

            {activeSidePanel === "assessments" && (
              <>
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck size={14} className="text-slate-400" />
                    <span className="text-sm font-bold">Avaliações</span>
                  </div>
                  {assessmentStatus !== "idle" && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      assessmentStatus === "completed"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-indigo-500/20 text-indigo-300"
                    }`}>
                      {assessmentStatus === "completed" ? "Finalizada" : "Em andamento"}
                    </span>
                  )}
                </div>

                {!isGuest && assessmentStatus === "idle" && (
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {assessmentForms.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                        <ClipboardCheck size={28} className="text-slate-600" />
                        <div className="text-xs text-slate-500">Nenhuma avaliação disponível.</div>
                      </div>
                    ) : (
                      assessmentForms.map((form) => (
                        <button
                          key={form.id}
                          onClick={() => handleStartAssessment(form.id)}
                          className="w-full text-left bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 rounded-xl px-3 py-2.5 transition-colors group"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                              {form.title}
                            </div>
                            <Play size={12} className="text-slate-500 group-hover:text-indigo-400 shrink-0 transition-colors" />
                          </div>
                          {form.description && (
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{form.description}</div>
                          )}
                          {form.responseCount > 0 && (
                            <div className="text-[10px] text-slate-500 mt-1">{form.responseCount} resposta(s) anteriores</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}

                {!isGuest && assessmentStatus !== "idle" && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2 flex-shrink-0">
                      <span className="text-xs font-bold text-slate-300">
                        {activeAssessmentForm?.title || "Carregando..."}
                      </span>
                      <button
                        onClick={handleCancelAssessment}
                        className="text-[10px] text-red-400 hover:text-red-200 flex items-center gap-1"
                      >
                        <X size={10} /> Cancelar
                      </button>
                    </div>

                    {/* Progress */}
                    {activeAssessmentForm && assessmentStatus === "active" && (
                      <div className="mb-3 flex-shrink-0">
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Respostas do paciente</span>
                          <span>{Object.keys(remoteAnswers).length}/{activeAssessmentForm.questions.length}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${activeAssessmentForm.questions.length ? (Object.keys(remoteAnswers).length / activeAssessmentForm.questions.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Answers */}
                    {activeAssessmentForm && (
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {activeAssessmentForm.questions.map((question, idx) => {
                          const answer = remoteAnswers[question.id];
                          const hasAnswer = answer !== undefined && answer !== null;
                          return (
                            <div
                              key={question.id}
                              className={`border rounded-xl p-3 transition-colors ${
                                hasAnswer ? "bg-indigo-500/10 border-indigo-500/20" : "bg-white/5 border-white/10"
                              }`}
                            >
                              <div className="flex items-start gap-2 mb-1.5">
                                <span className="shrink-0 w-4 h-4 rounded-full bg-white/10 text-[9px] font-bold text-slate-500 flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <div className="text-xs text-slate-400 leading-relaxed">{question.text}</div>
                              </div>
                              <div className={`text-sm font-medium pl-6 ${hasAnswer ? "text-white" : "text-slate-600 italic"}`}>
                                {hasAnswer ? formatAnswerDisplay(question, answer.value) : "–"}
                              </div>
                              {hasAnswer && typeof answer.score === "number" && answer.score !== 0 && (
                                <div className="text-[10px] text-indigo-400 pl-6 mt-0.5">+{answer.score} pts</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Result */}
                    {assessmentStatus === "completed" && (() => {
                      const score = calculateHostResult();
                      const interp = getInterpretationForScore(score);
                      return (
                        <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-3 flex-shrink-0 space-y-1">
                          <div className="text-xs text-slate-400">Pontuação total</div>
                          <div className="text-2xl font-bold text-white">{score ?? "–"}</div>
                          {interp && (
                            <div className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${interp.color || "bg-slate-700 text-slate-300"}`}>
                              {interp.resultTitle}
                            </div>
                          )}
                          {interp?.description && (
                            <div className="text-xs text-slate-400 mt-1">{interp.description}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {isGuest && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {!activeAssessmentForm ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4 py-8">
                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                          <ClipboardCheck size={22} className="text-slate-500" />
                        </div>
                        <div className="text-sm text-slate-300 font-medium">Aguardando avaliação</div>
                        <div className="text-xs text-slate-500">O profissional iniciará o questionário em breve.</div>
                      </div>
                    ) : (
                      <>
                        {/* Assessment header */}
                        <div className="mb-3 pb-3 border-b border-white/10 flex-shrink-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-white">{activeAssessmentForm.title}</div>
                              {activeAssessmentForm.description && (
                                <div className="text-xs text-slate-400 mt-0.5">{activeAssessmentForm.description}</div>
                              )}
                            </div>
                            {assessmentStatus === "completed" && (
                              <span className="shrink-0 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                                Finalizada
                              </span>
                            )}
                          </div>

                          {/* Progress bar */}
                          {assessmentStatus === "active" && (
                            <div className="mt-3">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span>Progresso</span>
                                <span>{Object.keys(remoteAnswers).length}/{activeAssessmentForm.questions.length} respondidas</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${activeAssessmentForm.questions.length ? (Object.keys(remoteAnswers).length / activeAssessmentForm.questions.length) * 100 : 0}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Questions list */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                          {activeAssessmentForm.questions.map((question, idx) => {
                            const answerValue = remoteAnswers[question.id]?.value ?? (question.type === "checkbox" ? [] : "");
                            const isDisabled = assessmentStatus === "completed";
                            const hasAnswer = question.type === "checkbox"
                              ? Array.isArray(answerValue) && answerValue.length > 0
                              : answerValue !== "" && answerValue !== null && answerValue !== undefined;
                            return (
                              <div
                                key={question.id}
                                className={`border rounded-xl p-3 space-y-2.5 transition-colors ${
                                  hasAnswer
                                    ? "bg-indigo-500/10 border-indigo-500/30"
                                    : "bg-white/5 border-white/10"
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-[10px] font-bold text-slate-400 flex items-center justify-center mt-0.5">
                                    {idx + 1}
                                  </span>
                                  <div className="text-xs text-slate-200 leading-relaxed flex-1">
                                    {question.text}
                                    {question.required && <span className="text-red-400 ml-1">*</span>}
                                  </div>
                                </div>

                                {(question.type === "radio" || question.type === "checkbox") && (question.options || []).map((opt) => {
                                  const optionValue = String(opt.value);
                                  const checked = question.type === "radio"
                                    ? String(answerValue) === optionValue
                                    : Array.isArray(answerValue) && answerValue.includes(optionValue);
                                  return (
                                    <label
                                      key={optionValue}
                                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                        checked
                                          ? "bg-indigo-600/50 text-white border border-indigo-500/50"
                                          : "bg-white/5 text-slate-300 border border-transparent hover:bg-white/10"
                                      } ${isDisabled ? "pointer-events-none opacity-70" : ""}`}
                                    >
                                      <input
                                        type={question.type === "radio" ? "radio" : "checkbox"}
                                        name={`q-${question.id}`}
                                        value={optionValue}
                                        checked={checked}
                                        disabled={isDisabled}
                                        onChange={() => {
                                          if (question.type === "radio") {
                                            handleGuestAnswerChange(question, optionValue);
                                            return;
                                          }
                                          const selected = Array.isArray(answerValue) ? [...answerValue] : [];
                                          const next = selected.includes(optionValue)
                                            ? selected.filter(item => item !== optionValue)
                                            : [...selected, optionValue];
                                          handleGuestAnswerChange(question, next);
                                        }}
                                        className="accent-indigo-500 w-3.5 h-3.5"
                                      />
                                      <span>{opt.label}</span>
                                    </label>
                                  );
                                })}

                                {(question.type === "text" || question.type === "number") && (
                                  <input
                                    type={question.type === "number" ? "number" : "text"}
                                    value={answerValue ?? ""}
                                    onChange={(e) => handleGuestAnswerChange(question, e.target.value)}
                                    disabled={isDisabled}
                                    placeholder="Sua resposta..."
                                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-60 placeholder-slate-600"
                                  />
                                )}

                                {question.type === "textarea" && (
                                  <textarea
                                    value={answerValue ?? ""}
                                    onChange={(e) => handleGuestAnswerChange(question, e.target.value)}
                                    disabled={isDisabled}
                                    placeholder="Sua resposta..."
                                    rows={3}
                                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 resize-none disabled:opacity-60 placeholder-slate-600"
                                  />
                                )}

                                {question.type === "select" && (
                                  <select
                                    value={answerValue ?? ""}
                                    onChange={(e) => handleGuestAnswerChange(question, e.target.value)}
                                    disabled={isDisabled}
                                    className="w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-60"
                                  >
                                    <option value="">Selecione...</option>
                                    {(question.options || []).map((opt) => (
                                      <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer actions */}
                        <div className="mt-3 flex-shrink-0">
                          {assessmentStatus === "active" && (
                            <button
                              onClick={handleFinishAssessment}
                              disabled={Object.keys(remoteAnswers).length === 0}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                            >
                              <Check size={15} />
                              Finalizar Avaliação
                            </button>
                          )}
                          {assessmentStatus === "completed" && (
                            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-center">
                              <div className="text-sm font-bold text-emerald-400">Avaliação finalizada!</div>
                              <div className="text-xs text-slate-400 mt-1">Suas respostas foram enviadas ao profissional.</div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </aside>
          </>
        )}
      </main>

      {/* --- FOOTER CONTROLS --- */}
        <footer className="shrink-0 flex items-center justify-center relative z-50 pointer-events-none px-2 py-2 sm:px-4 sm:py-3">
          {/* Emoji picker — fora do overflow-x-auto */}
          {showReactionPicker && (
            <>
              <div className="fixed inset-0 z-[190] pointer-events-auto" onClick={() => setShowReactionPicker(false)} />
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-auto bg-[#1e2028] border border-white/15 rounded-2xl px-3 py-2.5 flex gap-1 sm:gap-2 shadow-2xl z-[200]">
                {["✋", "👍", "❤️", "😂", "🎉", "👏", "🙏", "😮"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { sendReaction(emoji); setShowReactionPicker(false); }}
                    className="text-2xl sm:text-3xl hover:scale-125 transition-transform active:scale-90 select-none p-0.5"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="pointer-events-auto bg-[#181a1f]/90 backdrop-blur-xl border border-white/10 p-1.5 sm:p-2 rounded-2xl shadow-2xl flex items-center gap-1 sm:gap-2 overflow-x-auto max-w-full">
            <RoomFooterBtn
              onClick={toggleMic}
              active={!micOn}
              activeColor="bg-red-500/20 hover:bg-red-500/30 !text-red-500"
              title={micOn ? "Desativar Microfone" : "Ativar Microfone"}
            >
              {micOn ? <><Mic size={18} className="sm:hidden" /><Mic size={22} className="hidden sm:block" /></> : <><MicOff size={18} className="sm:hidden" /><MicOff size={22} className="hidden sm:block" /></>}
            </RoomFooterBtn>
            <RoomFooterBtn
              onClick={toggleCam}
              active={!cameraOn}
              activeColor="bg-red-500/20 hover:bg-red-500/30 !text-red-500"
              title={cameraOn ? "Desativar Câmera" : "Ativar Câmera"}
            >
              {cameraOn ? <><Video size={18} className="sm:hidden" /><Video size={22} className="hidden sm:block" /></> : <><VideoOff size={18} className="sm:hidden" /><VideoOff size={22} className="hidden sm:block" /></>}
            </RoomFooterBtn>
            <div className="w-px h-6 bg-white/10 mx-0.5 shrink-0" />

            {/* Hidden for Guests */}
            {!isGuest && (
              <>
                <RoomFooterBtn
                  onClick={toggleScreenShare}
                  active={screenShare}
                  activeColor="bg-green-600"
                  title="Compartilhar Tela"
                >
                  {screenShare ? <><MonitorUp size={18} className="sm:hidden" /><MonitorUp size={22} className="hidden sm:block" /></> : <><ScreenShare size={18} className="sm:hidden" /><ScreenShare size={22} className="hidden sm:block" /></>}
                </RoomFooterBtn>
                <RoomFooterBtn
                  onClick={() => setActiveSidePanel(activeSidePanel === "assessments" ? "none" : "assessments")}
                  active={activeSidePanel === "assessments"}
                  title="Avaliações"
                >
                  <ClipboardCheck size={18} className="sm:hidden" />
                  <ClipboardCheck size={22} className="hidden sm:block" />
                </RoomFooterBtn>
                <RoomFooterBtn
                  onClick={() => setActiveSidePanel(activeSidePanel === "whiteboard" ? "none" : "whiteboard")}
                  active={activeSidePanel === "whiteboard"}
                  title="Lousa Interativa"
                >
                  <PenTool size={18} className="sm:hidden" />
                  <PenTool size={22} className="hidden sm:block" />
                </RoomFooterBtn>
                <RoomFooterBtn
                  onClick={() => setCaptionsOn(!captionsOn)}
                  active={captionsOn}
                  className="hidden sm:flex"
                  title="Legendas"
                >
                  <Subtitles size={22} />
                </RoomFooterBtn>
                <RoomFooterBtn
                  onClick={() => setShowInviteModal(true)}
                  title="Convidar"
                >
                  <UserPlus size={18} className="sm:hidden" />
                  <UserPlus size={22} className="hidden sm:block" />
                </RoomFooterBtn>
                <div className="w-px h-6 bg-white/10 mx-0.5 shrink-0" />
              </>
            )}

            {/* Assessment button visible to guests when active */}
            {isGuest && assessmentStatus !== "idle" && (
              <RoomFooterBtn
                onClick={() => setActiveSidePanel(activeSidePanel === "assessments" ? "none" : "assessments")}
                active={activeSidePanel === "assessments"}
                activeColor="bg-indigo-600"
                className={activeSidePanel !== "assessments" ? "bg-indigo-500/20 !text-indigo-300 hover:bg-indigo-500/30" : ""}
                badge={assessmentStatus === "active" && activeSidePanel !== "assessments"}
                title="Avaliação"
              >
                <ClipboardCheck size={18} className="sm:hidden" />
                <ClipboardCheck size={22} className="hidden sm:block" />
              </RoomFooterBtn>
            )}

            <RoomFooterBtn
              onClick={() => setShowReactionPicker(v => !v)}
              active={showReactionPicker}
              title="Reações"
            >
              <Smile size={18} className="sm:hidden" />
              <Smile size={22} className="hidden sm:block" />
            </RoomFooterBtn>

            <RoomFooterBtn onClick={() => setShowSettingsModal(true)} title="Configurações">
              <Settings size={18} className="sm:hidden" />
              <Settings size={22} className="hidden sm:block" />
            </RoomFooterBtn>
            <div className="w-px h-6 bg-white/10 mx-0.5 shrink-0" />

            <RoomFooterBtn
              onClick={() => setActiveSidePanel(activeSidePanel === "chat" ? "none" : "chat")}
              active={activeSidePanel === "chat"}
              badge={messages.length > 1 && activeSidePanel !== "chat"}
              title="Chat"
            >
              <MessageSquare size={18} className="sm:hidden" />
              <MessageSquare size={22} className="hidden sm:block" />
            </RoomFooterBtn>
            <RoomFooterBtn
              onClick={() => setShowEndModal(true)}
              danger
              wide
              className="ml-1"
              title="Encerrar"
            >
              <PhoneOff size={18} className="sm:hidden" />
              <PhoneOff size={22} className="hidden sm:block" />
            </RoomFooterBtn>
          </div>
        </footer>

        {/* ── Modal: Configurações ── */}
        <RoomModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} size="md">
          <RoomModalHeader title={<><Settings size={18} /> Configurações</>} onClose={() => setShowSettingsModal(false)} />
          <RoomModalBody>
            <div className="space-y-6">
              {!isGuest && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Subtitles size={14} /> Transcrição
                  </label>
                  <div className="bg-[#252830] border border-white/10 rounded-xl px-4 py-3 space-y-2">
                    <p className="text-xs text-slate-400">
                      Chave de API Gemini{" "}
                      <span className="text-slate-500">(opcional — melhora a qualidade da transcrição)</span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                        placeholder="AIza..."
                        className="flex-1 bg-[#1a1c22] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={saveGeminiKey}
                        className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${geminiKeySaved ? "bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
                      >
                        {geminiKeySaved ? <Check size={12} /> : <Save size={12} />}
                        {geminiKeySaved ? "Salvo" : "Salvar"}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      Obtenha sua chave gratuita em{" "}
                      <span className="text-indigo-400">aistudio.google.com/apikey</span>
                      {preferences.gemini.apiKey && <span className="ml-2 text-emerald-500 font-bold">• Gemini ativo</span>}
                      {!preferences.gemini.apiKey && <span className="ml-2 text-amber-500"> • Usando reconhecimento do browser</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between bg-[#252830] border border-white/10 rounded-xl px-4 py-3">
                    <span className="text-sm text-slate-200">
                      Transcrição ativa
                      {transcriptionActive && <span className="ml-2 text-emerald-400 text-xs animate-pulse">● gravando</span>}
                    </span>
                    <button
                      onClick={() => setTranscriptionEnabled(!transcriptionEnabled)}
                      className={`w-12 h-7 rounded-full transition-colors ${transcriptionEnabled ? "bg-emerald-500" : "bg-slate-600"}`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${transcriptionEnabled ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              )}
              {!isGuest && (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <PenTool size={14} /> Lousa
                  </label>
                  <div className="flex items-center justify-between bg-[#252830] border border-white/10 rounded-xl px-4 py-3">
                    <span className="text-sm text-slate-200">Permitir paciente desenhar</span>
                    <button
                      onClick={() => setAllowGuestDraw(!allowGuestDraw)}
                      className={`w-12 h-7 rounded-full transition-colors ${allowGuestDraw ? "bg-emerald-500" : "bg-slate-600"}`}
                    >
                      <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${allowGuestDraw ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Layout size={14} /> Layout da Sala
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["focus", "side-by-side", "stacked"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLayoutMode(mode)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${layoutMode === mode ? "bg-indigo-600 text-white border-indigo-500" : "bg-[#252830] text-slate-300 border-white/10 hover:bg-[#2d313a]"}`}
                    >
                      {mode === "focus" ? "Foco" : mode === "side-by-side" ? "Lado a lado" : "Empilhado"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Status da Conexão</div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Usuário remoto:</span>
                    <span className={remoteUserConnected ? "text-emerald-400 font-bold" : "text-amber-400"}>
                      {remoteUserConnected ? "Conectado" : "Aguardando"}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Fluxo de Vídeo:</span>
                    <span className={remoteStreamActive ? "text-emerald-400 font-bold" : "text-slate-500"}>
                      {remoteStreamActive ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <button
                    onClick={restartRoomConnection}
                    className="mt-2 w-full py-2 bg-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-500/20 hover:bg-indigo-600/30 transition-all"
                  >
                    Reiniciar Fluxo de Mídia
                  </button>
                </div>
              </div>
            </div>
          </RoomModalBody>
          <RoomModalFooter>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="ml-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
            >
              Concluído
            </button>
          </RoomModalFooter>
        </RoomModal>

        {/* ── Modal: Vincular Lousa ── */}
        <RoomModal isOpen={showLinkDeviceModal} onClose={() => setShowLinkDeviceModal(false)} size="sm">
          <RoomModalHeader title={<><Tablet size={18} className="text-indigo-400" /> Vincular Lousa Interativa</>} onClose={() => setShowLinkDeviceModal(false)} />
          <RoomModalBody>
            <div className="flex gap-1 bg-white/5 p-1 rounded-xl mb-5">
              {(["qr", "link"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLinkDeviceTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${linkDeviceTab === tab ? "bg-white/15 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  {tab === "qr" ? <><QrCode size={14} /> QR Code</> : <><Copy size={14} /> Copiar Link</>}
                </button>
              ))}
            </div>
            {linkDeviceTab === "qr" && (
              <div className="flex flex-col items-center mb-5">
                <div className="bg-white p-4 rounded-2xl shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getCompanionUrl())}&format=png&margin=1&color=0f172a`}
                    alt="QR Code Lousa"
                    className="w-48 h-48 block"
                  />
                </div>
                <p className="text-slate-400 text-xs mt-3 text-center">Aponte a câmera do celular ou tablet para abrir a lousa</p>
              </div>
            )}
            {linkDeviceTab === "link" && (
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="flex-1 text-xs text-slate-300 font-mono truncate select-all">{getCompanionUrl()}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(getCompanionUrl()); setCopiedCompanionLink(true); setTimeout(() => setCopiedCompanionLink(false), 2000); }}
                    className={`p-2 rounded-lg transition-all shrink-0 ${copiedCompanionLink ? "bg-emerald-500/20 text-emerald-400" : "hover:bg-white/10 text-slate-400 hover:text-white"}`}
                  >
                    {copiedCompanionLink ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
                <button onClick={sendCompanionLinkToChat} className="w-full py-2.5 rounded-xl font-bold text-sm bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center gap-2 transition-colors">
                  <Send size={14} /> Enviar link ao paciente via chat
                </button>
                <button onClick={() => window.open(getCompanionUrl(), "_blank")} className="w-full py-2.5 rounded-xl font-bold text-sm bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 transition-colors">
                  <MonitorUp size={14} /> Abrir neste dispositivo
                </button>
              </div>
            )}
            <p className="text-slate-500 text-xs text-center leading-relaxed">
              O dispositivo vinculado acessa a <span className="text-indigo-400 font-semibold">Lousa Interativa</span> — você pode habilitar o desenho para o paciente nas configurações da lousa.
            </p>
          </RoomModalBody>
          <RoomModalFooter>
            <button onClick={() => setShowLinkDeviceModal(false)} className="w-full py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              Concluído
            </button>
          </RoomModalFooter>
        </RoomModal>

        {/* ── Modal: Encerrar Sessão ── */}
        <RoomModal isOpen={showEndModal} onClose={() => setShowEndModal(false)} size={!isGuest && transcriptionEnabled ? "lg" : "sm"}>
          <RoomModalHeader title={isGuest ? "Sair da sessão?" : "Encerrar Sessão?"} onClose={() => setShowEndModal(false)} />
          <RoomModalBody>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                <PhoneOff size={28} />
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {isGuest
                  ? "Você vai sair da videochamada. O profissional continuará na sala. Pode entrar novamente pelo link de acesso."
                  : "Isso encerrará a sessão para você e o paciente. Certifique-se de que o prontuário foi salvo."}
              </p>
            </div>
            {!isGuest && transcriptionEnabled && (
              <div className="text-left bg-[#101216] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Transcrição da sessão</div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const blob = new Blob([transcriptText || 'Sem transcrição registrada.'], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `transcricao-${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.txt`;
                        document.body.appendChild(a); a.click(); document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Download size={12} /> Baixar .txt
                    </button>
                    <button onClick={handleCopyTranscript} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      {copiedTranscript ? <Check size={12} /> : <Copy size={12} />}
                      {copiedTranscript ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={transcriptText}
                  className="w-full h-40 bg-[#0f1115] border border-white/10 rounded-xl p-3 text-xs text-slate-200 leading-relaxed resize-none"
                  placeholder={
                    (preferences.gemini.apiKeys?.some(k => k.trim()) || preferences.gemini.apiKey.trim())
                      ? "A transcrição de alta fidelidade e com identificação de falantes será gerada automaticamente pelo Gemini assim que você clicar em 'Encerrar'."
                      : "Sem transcrição registrada."
                  }
                />
              </div>
            )}
          </RoomModalBody>
          <RoomModalFooter>
            <button onClick={() => setShowEndModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-300 hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleEndCall}
              disabled={isUploadingRecording}
              className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {isUploadingRecording ? (
                <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg> Salvando…</>
              ) : isGuest ? "Sair" : "Encerrar"}
            </button>
          </RoomModalFooter>
        </RoomModal>

        {/* ── Modal: Convidar ── */}
        <RoomModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} size="sm">
          <RoomModalHeader title={<><UserPlus size={18} className="text-indigo-400" /> Convidar</>} onClose={() => setShowInviteModal(false)} />
          <RoomModalBody>
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="bg-white p-4 rounded-3xl shadow-2xl shadow-indigo-500/10">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(meetingUrl)}&format=png&margin=1&color=111827`}
                    alt="QR Code Meeting"
                    className="w-40 h-40 block"
                  />
                </div>
                {user?.clinicLogoUrl ? (
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl p-1.5 shadow-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                    <img src={user.clinicLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl p-1 shadow-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                    <img src={isDark ? logoDarkUrl : logoUrl} alt="PsiFlux" className="w-10 h-10 object-contain" />
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest text-center">Acesso Direto via QR Code</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-3 hover:bg-white/10 transition-colors">
                <span className="flex-1 text-xs text-slate-300 font-mono truncate select-all">{meetingUrl}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(meetingUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className={`p-2 rounded-xl transition-all shrink-0 ${copied ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400 hover:text-white"}`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/api/virtual-rooms/public/${id}/preview`;
                  const company = user?.companyName || user?.name || 'seu profissional';
                  const msg = `*Prepare-se, sua sessão já vai começar com ${company}!* 🌿\n\nPara um melhor aproveitamento da sua consulta:\n📍 Procure um local calmo, iluminado e privado.\n🎧 Use fones de ouvido para sua privacidade e melhor som.\n🛜 Verifique se sua conexão de internet está estável.\n\nAcesse sua sala virtual pelo link abaixo:\n${shareUrl}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Send size={16} /> Compartilhar via WhatsApp
              </button>
              <p className="text-center text-[10px] text-slate-500 leading-relaxed font-bold">
                Este link é exclusivo para esta sala. O paciente não precisa de login para entrar.
              </p>
            </div>
          </RoomModalBody>
        </RoomModal>

      </div>
    );
  }


