
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, 
  MessageSquare, PenTool, X, Send, Paperclip, 
  Eraser, Download, Clock, User, Subtitles, MonitorUp, 
  Layout, Mic as MicIcon, FileText, Smartphone, QrCode, Share2, Tablet, Settings,
  Copy, Check, Info, ChevronDown, Volume2, Link as LinkIcon, UserPlus, ShieldAlert,
  ClipboardCheck, Play, PieChart, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { ASSESSMENTS_DATA } from '../constants';
import { api } from '../services/api';

interface MeetingRoomProps {
  isGuest?: boolean;
}

type ConnectionStatus = 'idle' | 'waiting_approval' | 'connected';

// Helper for coordinates
type Point = { x: number, y: number };
type RoomMessage = {
  id: number;
  sender_role: 'host' | 'guest' | 'system';
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
  speaker_role: 'host' | 'guest';
  speaker_name: string;
  text: string;
  created_at: string;
};
type AssessmentEvent = {
  id: number;
  event_type: 'start' | 'answer' | 'finish';
  assessment_id: string;
  question_id: string | null;
  payload_json: string | null;
  created_at: string;
};
type WaitingEntry = {
  id: number;
  guest_name: string;
  status: 'waiting' | 'approved' | 'denied';
  created_at?: string;
};

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ isGuest: isGuestProp = false }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const hasAuthToken = Boolean(localStorage.getItem('psi_token'));
  const isGuest = isGuestProp || searchParams.get('guest') === 'true' || !hasAuthToken;
  
  // --- Mode Check ---
  const isCompanionMode = searchParams.get('companion') === 'true';

  // --- States ---
  const [hasJoined, setHasJoined] = useState(isCompanionMode); 
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(isCompanionMode ? 'connected' : 'idle');
  
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'whiteboard' | 'assessments' | 'none'>(
    isCompanionMode ? 'whiteboard' : 'none'
  );
  
  // Host: Simulation State for Incoming Request
  const [incomingRequest, setIncomingRequest] = useState<{name: string, id: string} | null>(null);
  const [remoteUserConnected, setRemoteUserConnected] = useState(false);
  const [remoteParticipantName, setRemoteParticipantName] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'focus' | 'side-by-side' | 'stacked'>('focus');
  const [entryNotice, setEntryNotice] = useState<string | null>(null);
  const [waitingList, setWaitingList] = useState<WaitingEntry[]>([]);
  const [waitingToken, setWaitingToken] = useState<string | null>(null);
  const [remoteWhiteboardActive, setRemoteWhiteboardActive] = useState(false);
  const [allowGuestDraw, setAllowGuestDraw] = useState(false);
  const [remoteAllowGuestDraw, setRemoteAllowGuestDraw] = useState(false);

  const [messages, setMessages] = useState<{sender: string, text: string, time: string, role?: 'host' | 'guest' | 'system', isLocal?: boolean}[]>([
    { sender: 'Sistema', text: 'Sala segura criada (Criptografia ponta-a-ponta).', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), role: 'system', isLocal: false }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [lastMessageId, setLastMessageId] = useState(0);
  const [lastEventId, setLastEventId] = useState(0);
  const [lastAssessmentId, setLastAssessmentId] = useState(0);
  const [lastTranscriptId, setLastTranscriptId] = useState(0);
  const [transcriptLog, setTranscriptLog] = useState<TranscriptEntry[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLinkDeviceModal, setShowLinkDeviceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); 
  const [lobbyTab, setLobbyTab] = useState<'info' | 'companion'>('info');
  const [copied, setCopied] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [participantToken, setParticipantToken] = useState<string | null>(null);
  const [remoteScreenShareActive, setRemoteScreenShareActive] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [suppressMessageHistory, setSuppressMessageHistory] = useState(false);
  const [suppressEventHistory, setSuppressEventHistory] = useState(false);
  const [suppressAssessmentHistory, setSuppressAssessmentHistory] = useState(false);
  const [suppressTranscriptHistory, setSuppressTranscriptHistory] = useState(false);
  const [remoteTranscriptionRequested, setRemoteTranscriptionRequested] = useState(false);
  const [transcriptionActive, setTranscriptionActive] = useState(false);

  // Assessment States
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [remoteAnswers, setRemoteAnswers] = useState<Record<string, any>>({});
  const [assessmentStatus, setAssessmentStatus] = useState<'idle' | 'active' | 'completed'>('idle');

  // Captions
  const [captionsOn, setCaptionsOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcriptionEnabled, setTranscriptionEnabled] = useState(false);
  const [guestTranscriptionEnabled, setGuestTranscriptionEnabled] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  
  // --- Refs ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
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
  const participantsRef = useRef<string[]>([]);
  const clientIdRef = useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  );
  
  // Audio Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const lastPointRef = useRef<Point | null>(null);

  const meetingUrl = window.location.href.split('?')[0];
  const appointment: { title?: string; patientName?: string; psychologistName?: string } | null = null;
  const roomLabel = id ? `Sala ${id}` : 'Sala';
  const hostDisplayName = appointment?.psychologistName || 'Profissional';
  const patientDisplayName = remoteParticipantName || appointment?.patientName || 'Paciente';
  const remoteDisplayName = isGuest ? hostDisplayName : patientDisplayName;
  const remoteInitial = remoteDisplayName?.charAt(0)?.toUpperCase() || '?';
  const localDisplayName = isGuest ? (guestName || 'Paciente') : 'Você';
  const localInitial = localDisplayName.charAt(0).toUpperCase();
  const useGridLayout = !screenShare && layoutMode !== 'focus';
  const waitingEntries = waitingList.length
    ? waitingList
    : (incomingRequest ? [{ id: 0, guest_name: incomingRequest.name, status: 'waiting' as const }] : []);
  const guestCanDraw = isGuest ? remoteAllowGuestDraw : allowGuestDraw;
  const hasSpeechSupport = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const transcriptText = transcriptLog
      .map((entry) => `[${entry.speaker_name}] ${entry.text}`)
      .join('\n');

  // --- BROADCAST CHANNEL (Real-time Sync between tabs) ---
  useEffect(() => {
    // Unique channel per meeting ID
    const channel = new BroadcastChannel(`meeting_room_${id}`);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
        const { type, payload } = event.data;

        switch (type) {
            case 'REQUEST_ENTRY':
                // Only host listens to this
                if (!isGuest && !isCompanionMode) {
                    setIncomingRequest({ name: payload.name, id: payload.id });
                    setRemoteParticipantName(payload.name || null);
                }
                break;

            case 'ADMIT_GUEST':
                if (isGuest && connectionStatus === 'waiting_approval') {
                    setConnectionStatus('connected');
                    setRemoteUserConnected(true);
                }
                if (!isGuest) {
                    setIncomingRequest(null);
                    setRemoteUserConnected(true);
                }
                break;
            
            case 'DENY_GUEST':
                if (isGuest) {
                    alert("Sua entrada foi negada pelo anfitrião.");
                    setConnectionStatus('idle');
                    setHasJoined(false);
                }
                if (!isGuest) setIncomingRequest(null);
                break;

            case 'DRAW_START':
                remoteDrawStart(payload);
                break;

            case 'DRAW_MOVE':
                remoteDrawMove(payload);
                break;
            
            case 'CLEAR_BOARD':
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && canvasRef.current) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                break;

            // --- ASSESSMENT SYNC ---
            case 'START_ASSESSMENT':
                if (isGuest) {
                    setActiveAssessmentId(payload.id);
                    setAssessmentStatus('active');
                    setActiveSidePanel('assessments'); // Force open panel for guest
                    setRemoteAnswers({});
                }
                break;

            case 'UPDATE_ANSWER':
                if (!isGuest) {
                    setRemoteAnswers(prev => ({...prev, [payload.questionId]: payload.value}));
                }
                break;

            case 'FINISH_ASSESSMENT':
                if (!isGuest) {
                    setAssessmentStatus('completed');
                }
                break;
        }
    };

    return () => {
        channel.close();
    };
  }, [id, isGuest, isCompanionMode, connectionStatus]);

  useEffect(() => {
      if (isGuest || !id || !hasAuthToken) return;
      let active = true;
      const fetchWaiting = async () => {
          try {
              const data = await api.get<WaitingEntry[]>(`/virtual-rooms/${id}/waiting`);
              if (!active) return;
              const list = Array.isArray(data) ? data : [];
              setWaitingList(list);
              if (list.length) {
                  setRemoteParticipantName(list[0].guest_name);
              } else if (!remoteUserConnected) {
                  setRemoteParticipantName(null);
              }
          } catch (err) {
              if (active) setWaitingList([]);
          }
      };
      fetchWaiting();
      const interval = setInterval(fetchWaiting, 2000);
      return () => {
          active = false;
          clearInterval(interval);
      };
  }, [isGuest, id, hasAuthToken, remoteUserConnected]);

  useEffect(() => {
      if (!isGuest || !waitingToken) return;
      let active = true;
      const pollStatus = async () => {
          try {
              const data = await api.get<{ status: string }>(`/virtual-rooms/public/waiting/${waitingToken}`);
              if (!active) return;
              if (data.status === 'approved') {
                  try {
                      if (id) {
                          await api.post(`/virtual-rooms/public/${id}/join`, { token: waitingToken, name: guestName });
                      }
                      setConnectionStatus('connected');
                      setRemoteUserConnected(true);
                      setWaitingToken(null);
                  } catch (err) {
                      alert('Nao foi possivel entrar na sala.');
                      setConnectionStatus('idle');
                      setHasJoined(false);
                      setWaitingToken(null);
                  }
              } else if (data.status === 'denied') {
                  alert('Sua entrada foi negada.');
                  setConnectionStatus('idle');
                  setHasJoined(false);
                  setWaitingToken(null);
              }
          } catch (err) {
              // keep polling
          }
      };
      pollStatus();
      const interval = setInterval(pollStatus, 2000);
      return () => {
          active = false;
          clearInterval(interval);
      };
  }, [isGuest, waitingToken, id, guestName]);


  // --- ASSESSMENT HANDLERS ---
  const handleStartAssessment = (assessId: string) => {
      setActiveAssessmentId(assessId);
      setAssessmentStatus('active');
      setRemoteAnswers({});
      broadcastChannelRef.current?.postMessage({
          type: 'START_ASSESSMENT',
          payload: { id: assessId }
      });
      if (id) {
          api.post(`/virtual-rooms/${id}/assessments`, {
              event_type: 'start',
              assessment_id: assessId,
              payload: { client_id: clientIdRef.current }
          }).catch(() => {});
      }
  };

  const handleRemoteAnswer = (qId: string, val: any) => {
      // Called by Guest
      setRemoteAnswers(prev => ({...prev, [qId]: val}));
      broadcastChannelRef.current?.postMessage({
          type: 'UPDATE_ANSWER',
          payload: { questionId: qId, value: val }
      });
      if (id && activeAssessmentId) {
          if (isGuest && participantToken) {
              api.post(`/virtual-rooms/public/${id}/assessments`, {
                  token: participantToken,
                  event_type: 'answer',
                  assessment_id: activeAssessmentId,
                  question_id: qId,
                  payload: { value: val, client_id: clientIdRef.current }
              }).catch(() => {});
          }
      }
  };

  const handleFinishAssessment = () => {
      // Called by Guest
      setAssessmentStatus('completed');
      broadcastChannelRef.current?.postMessage({
          type: 'FINISH_ASSESSMENT'
      });
      if (id) {
          if (isGuest && participantToken && activeAssessmentId) {
              api.post(`/virtual-rooms/public/${id}/assessments`, {
                  token: participantToken,
                  event_type: 'finish',
                  assessment_id: activeAssessmentId,
                  payload: { client_id: clientIdRef.current }
              }).catch(() => {});
          }
      }
  };

  const calculateHostResult = () => {
      if (!activeAssessmentId) return null;
      const data = ASSESSMENTS_DATA[activeAssessmentId];
      if (!data) return null;

      let score = 0;
      if (data.type === 'risk') {
          data.questions.forEach(q => {
              const ans = remoteAnswers[q.id];
              if (ans && q.riskAnswer && ans === q.riskAnswer) score++;
          });
      } else {
          Object.values(remoteAnswers).forEach(val => score += (val as number));
      }
      return score;
  };

  const getQuestionText = (assessmentId: string, questionId: string) => {
      const data = ASSESSMENTS_DATA[assessmentId];
      if (!data) return '';
      const q = data.questions.find((item) => item.id === questionId);
      return q ? q.text : '';
  };

  const getAssessmentName = (assessmentId: string) => {
      const data = ASSESSMENTS_DATA[assessmentId];
      return data ? data.name : 'Formulario';
  };

  const parsePayload = (payload: any) => {
      if (payload === null || payload === undefined) return null;
      if (typeof payload === 'object') return payload;
      if (typeof payload === 'string') {
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

  useEffect(() => {
      if (!id || !hasJoined) return;
      if (isGuest && connectionStatus !== 'connected') return;
      let active = true;
      const fetchMessages = async () => {
          try {
              const endpoint = isGuest ? `/virtual-rooms/public/${id}/messages` : `/virtual-rooms/${id}/messages`;
              const rows = await api.get<RoomMessage[]>(endpoint, { since: String(lastMessageIdRef.current) });
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
                  const isLocal = isGuest ? msg.sender_role === 'guest' : msg.sender_role === 'host';
                  return {
                      sender: msg.sender_name,
                      text: msg.message,
                      time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                      role: msg.sender_role,
                      isLocal
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
      const interval = setInterval(fetchMessages, 2000);
      return () => {
          active = false;
          clearInterval(interval);
      };
  }, [id, hasJoined, isGuest, connectionStatus, suppressMessageHistory]);

  useEffect(() => {
      if (isGuest) return;
      if (activeSidePanel === 'whiteboard') {
          setRemoteWhiteboardActive(true);
          sendRoomEvent('whiteboard_open');
      } else if (remoteWhiteboardActive) {
          setRemoteWhiteboardActive(false);
          sendRoomEvent('whiteboard_close');
      }
  }, [activeSidePanel, isGuest, remoteWhiteboardActive]);

  useEffect(() => {
      if (isGuest) return;
      sendRoomEvent('whiteboard_permission', { allowed: allowGuestDraw });
  }, [allowGuestDraw, isGuest]);

  useEffect(() => {
      if (isGuest) return;
      if (transcriptionEnabled) {
          sendRoomEvent('transcription_on');
      } else {
          sendRoomEvent('transcription_off');
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
      if (!remoteWhiteboardActive && activeSidePanel === 'whiteboard') {
          setActiveSidePanel('none');
      }
  }, [isGuest, remoteWhiteboardActive, activeSidePanel]);

  useEffect(() => {
      if (!id || !hasJoined) return;
      if (isGuest && connectionStatus !== 'connected') return;
      let active = true;
      const fetchEvents = async () => {
          try {
              const endpoint = isGuest ? `/virtual-rooms/public/${id}/events` : `/virtual-rooms/${id}/events`;
              const rows = await api.get<RoomEvent[]>(endpoint, { since: String(lastEventIdRef.current) });
              if (!active || !rows.length) return;
              if (suppressEventHistoryRef.current) {
                  const last = rows[rows.length - 1];
                  lastEventIdRef.current = last.id;
                  setLastEventId(last.id);
                  suppressEventHistoryRef.current = false;
                  setSuppressEventHistory(false);
                  return;
              }
              rows.forEach((evt) => {
                  const payload = parsePayload(evt.payload_json);
                  if (payload?.client_id && payload.client_id === clientIdRef.current) return;
                  if (evt.event_type === 'whiteboard_start') {
                      remoteDrawStart(payload);
                  } else if (evt.event_type === 'whiteboard_move') {
                      remoteDrawMove(payload);
                  } else if (evt.event_type === 'whiteboard_clear') {
                      const ctx = canvasRef.current?.getContext('2d');
                      if (ctx && canvasRef.current) {
                          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                      }
                  } else if (evt.event_type === 'whiteboard_open') {
                      if (isGuest) {
                          setRemoteWhiteboardActive(true);
                          setActiveSidePanel('whiteboard');
                      }
                  } else if (evt.event_type === 'whiteboard_close') {
                      if (isGuest) {
                          setRemoteWhiteboardActive(false);
                          if (activeSidePanel === 'whiteboard') setActiveSidePanel('none');
                      }
                  } else if (evt.event_type === 'whiteboard_permission') {
                      if (isGuest) {
                          setRemoteAllowGuestDraw(Boolean(payload?.allowed));
                      }
                  } else if (evt.event_type === 'transcription_on') {
                      if (isGuest) {
                          setRemoteTranscriptionRequested(true);
                      }
                  } else if (evt.event_type === 'transcription_off') {
                      if (isGuest) {
                          setRemoteTranscriptionRequested(false);
                      }
                  } else if (evt.event_type === 'screen_share_on') {
                      setRemoteScreenShareActive(true);
                  } else if (evt.event_type === 'screen_share_off') {
                      setRemoteScreenShareActive(false);
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
      const interval = setInterval(fetchEvents, 2000);
      return () => {
          active = false;
          clearInterval(interval);
      };
  }, [id, hasJoined, isGuest, connectionStatus, suppressEventHistory]);

  useEffect(() => {
      if (!id || !hasJoined) return;
      if (isGuest && connectionStatus !== 'connected') return;
      let active = true;
      const fetchAssessments = async () => {
          try {
              const endpoint = isGuest ? `/virtual-rooms/public/${id}/assessments` : `/virtual-rooms/${id}/assessments`;
              const rows = await api.get<AssessmentEvent[]>(endpoint, { since: String(lastAssessmentIdRef.current) });
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
                  if (payload?.client_id && payload.client_id === clientIdRef.current) return;
                  if (evt.event_type === 'start') {
                      if (isGuest) {
                          setActiveAssessmentId(evt.assessment_id);
                          setAssessmentStatus('active');
                          setActiveSidePanel('assessments');
                          setRemoteAnswers({});
                      } else {
                          setMessages((prev) => [
                              ...prev,
                              {
                                  sender: 'Sistema',
                                  text: `Formulario iniciado: ${getAssessmentName(evt.assessment_id)}`,
                                  time: new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  role: 'system',
                                  isLocal: false
                              }
                          ]);
                      }
                  } else if (evt.event_type === 'answer') {
                      if (!isGuest && evt.question_id) {
                          setRemoteAnswers(prev => ({ ...prev, [evt.question_id as string]: payload?.value ?? payload }));
                          const questionText = getQuestionText(evt.assessment_id, evt.question_id);
                          const answerValue = payload?.value ?? payload;
                          const label = questionText ? `${questionText}: ${answerValue}` : `Resposta: ${answerValue}`;
                          setMessages((prev) => [
                              ...prev,
                              {
                                  sender: remoteDisplayName,
                                  text: label,
                                  time: new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  role: 'guest',
                                  isLocal: false
                              }
                          ]);
                      }
                  } else if (evt.event_type === 'finish') {
                      if (!isGuest) {
                          setAssessmentStatus('completed');
                          setMessages((prev) => [
                              ...prev,
                              {
                                  sender: 'Sistema',
                                  text: `Formulario finalizado: ${getAssessmentName(evt.assessment_id)}`,
                                  time: new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                  role: 'system',
                                  isLocal: false
                              }
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
      const interval = setInterval(fetchAssessments, 2000);
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
              const rows = await api.get<TranscriptEntry[]>(`/virtual-rooms/${id}/transcripts`, { since: String(lastTranscriptIdRef.current) });
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
      const interval = setInterval(fetchTranscripts, 2000);
      return () => {
          active = false;
          clearInterval(interval);
      };
  }, [id, hasJoined, isGuest, suppressTranscriptHistory]);

  useEffect(() => {
      if (!id || !hasAuthToken) return;
      let active = true;
      const fetchParticipants = async () => {
          try {
              const rows = await api.get<{ name: string }[]>(`/virtual-rooms/${id}/participants`);
              if (!active) return;
              const names = rows.map((r) => r.name);
              const prev = participantsRef.current;
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
      const interval = setInterval(fetchParticipants, 2000);
      return () => {
          active = false;
          clearInterval(interval);
      };
  }, [id, hasAuthToken]);

  useEffect(() => {
      if (!isGuest || !participantToken || !id) return;
      const leavePayload = JSON.stringify({ token: participantToken });
      const leaveUrl = `http://localhost:3013/virtual-rooms/public/${id}/leave`;
      const handleUnload = () => {
          if (navigator.sendBeacon) {
              navigator.sendBeacon(leaveUrl, leavePayload);
          } else {
              fetch(leaveUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: leavePayload,
                  keepalive: true
              }).catch(() => {});
          }
      };
      window.addEventListener('beforeunload', handleUnload);
      return () => {
          window.removeEventListener('beforeunload', handleUnload);
      };
  }, [isGuest, participantToken, id]);


  // --- Initialize Media ---
  useEffect(() => {
    if (isCompanionMode) return;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        localStreamRef.current = stream;
        
        if (!hasJoined && lobbyVideoRef.current) {
            lobbyVideoRef.current.srcObject = stream;
        } 
        else if (hasJoined && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
        }

        setupAudioAnalysis(stream);

      } catch (err) {
        console.error("Error accessing media:", err);
        setCameraOn(false);
        setMicOn(false);
      }
    };

    initMedia();

    return () => cleanupMedia();
  }, [hasJoined, isCompanionMode]);

  // Handle Video Element Ref Update when joining
  useEffect(() => {
      if (hasJoined && !isCompanionMode && localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
      }
  }, [hasJoined, isCompanionMode]);

  useEffect(() => {
      if (!remoteUserConnected) return;
      const message = `${remoteDisplayName} entrou na sala.`;
      setEntryNotice(message);
      const timeout = setTimeout(() => setEntryNotice(null), 3000);
      return () => clearTimeout(timeout);
  }, [remoteUserConnected, remoteDisplayName]);


  const handleAdmitGuest = async (entry?: WaitingEntry) => {
      const name = entry?.guest_name || incomingRequest?.name || remoteParticipantName || 'Paciente';
      if (entry && entry.id > 0 && id) {
          try {
              await api.post(`/virtual-rooms/${id}/waiting/${entry.id}/approve`, {});
          } catch (err) {
              // keep flow
          }
      } else {
          broadcastChannelRef.current?.postMessage({ type: 'ADMIT_GUEST' });
      }
      setRemoteUserConnected(true);
      setRemoteParticipantName(name);
      setIncomingRequest(null);
      if (entry && entry.id > 0) {
          setWaitingList(prev => prev.filter(item => item.id !== entry.id));
      }
      if (!isGuest) {
          setHasJoined(true);
          setConnectionStatus('connected');
      }
      setMessages(prev => [...prev, { 
          sender: 'System', 
          text: `${name} entrou na sala.`, 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }]);
  };

  const handleDenyGuest = async (entry?: WaitingEntry) => {
      if (entry && entry.id > 0 && id) {
          try {
              await api.post(`/virtual-rooms/${id}/waiting/${entry.id}/deny`, {});
          } catch (err) {
              // keep flow
          }
          setWaitingList(prev => prev.filter(item => item.id !== entry.id));
      } else {
          broadcastChannelRef.current?.postMessage({ type: 'DENY_GUEST' });
      }
      setIncomingRequest(null);
      setRemoteParticipantName(null);
  };

  const setupAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setScreenShare(false);
      sendRoomEvent('screen_share_off');
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenShare(true);
        sendRoomEvent('screen_share_on');
        stream.getVideoTracks()[0].onended = () => {
          setScreenShare(false);
          screenStreamRef.current = null;
          sendRoomEvent('screen_share_off');
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
    if (hasJoined && !isCompanionMode && connectionStatus === 'connected') {
        const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }
  }, [hasJoined, isCompanionMode, connectionStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Whiteboard Logic ---
  
  // Helpers
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      let clientX, clientY;
      
      if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }

      return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
      };
  };

  const sendRoomEvent = async (eventType: string, payload?: Record<string, any>) => {
      if (!id) return;
      if (isGuest && !guestCanDraw && eventType.startsWith('whiteboard_')) return;
      if (isGuest && (eventType === 'whiteboard_open' || eventType === 'whiteboard_close' || eventType === 'whiteboard_permission')) return;
      const body = {
          event_type: eventType,
          payload: payload ? { ...payload, client_id: clientIdRef.current } : { client_id: clientIdRef.current }
      };
      try {
          if (isGuest) {
              if (!participantToken) return;
              await api.post(`/virtual-rooms/public/${id}/events`, { token: participantToken, ...body });
          } else {
              await api.post(`/virtual-rooms/${id}/events`, body);
          }
      } catch (err) {
          // ignore event errors
      }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isGuest && !guestCanDraw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    setIsDrawing(true);
    const pos = getCoordinates(e, canvas);
    lastPointRef.current = pos;

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    
    // Broadcast
    broadcastChannelRef.current?.postMessage({
        type: 'DRAW_START',
        payload: { x: pos.x, y: pos.y, color: drawColor }
    });
    sendRoomEvent('whiteboard_start', { x: pos.x, y: pos.y, color: drawColor });
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isGuest && !guestCanDraw) return;
    if (!isDrawing || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const pos = getCoordinates(e, canvas);

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawColor;
    
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Broadcast
    broadcastChannelRef.current?.postMessage({
        type: 'DRAW_MOVE',
        payload: { 
            startX: lastPointRef.current.x, 
            startY: lastPointRef.current.y, 
            endX: pos.x, 
            endY: pos.y, 
            color: drawColor 
        }
    });
    sendRoomEvent('whiteboard_move', { 
        startX: lastPointRef.current.x, 
        startY: lastPointRef.current.y, 
        endX: pos.x, 
        endY: pos.y, 
        color: drawColor 
    });

    lastPointRef.current = pos;
  };

  const stopDrawing = () => {
      if (isGuest && !guestCanDraw) return;
      setIsDrawing(false);
      lastPointRef.current = null;
  };

  // Remote Drawing Handlers
  const remoteDrawStart = (data: { x: number, y: number, color: string }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.beginPath();
      ctx.moveTo(data.x, data.y);
  };

  const remoteDrawMove = (data: { startX: number, startY: number, endX: number, endY: number, color: string }) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = data.color;
      
      ctx.beginPath();
      ctx.moveTo(data.startX, data.startY);
      ctx.lineTo(data.endX, data.endY);
      ctx.stroke();
  };

  const clearCanvas = () => {
      if (isGuest && !guestCanDraw) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          broadcastChannelRef.current?.postMessage({ type: 'CLEAR_BOARD' });
          sendRoomEvent('whiteboard_clear');
      }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    const message = newMessage.trim();
    setNewMessage('');
    try {
        if (isGuest) {
            if (!participantToken) return;
            await api.post(`/virtual-rooms/public/${id}/messages`, {
                token: participantToken,
                sender_name: guestName || 'Paciente',
                message
            });
        } else {
            await api.post(`/virtual-rooms/${id}/messages`, {
                sender_name: hostDisplayName,
                message
            });
        }
    } catch (err) {
        // ignore send errors; polling will keep UI consistent
    }
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
      const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!Recognition) return;
      const recognition = new Recognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event: any) => {
          let finalText = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                  finalText += event.results[i][0].transcript;
              }
          }
          const text = finalText.trim();
          if (!text || !id) return;
          if (isGuest) {
              if (!participantToken) return;
              api.post(`/virtual-rooms/public/${id}/transcripts`, {
                  token: participantToken,
                  speaker_name: guestName || 'Paciente',
                  text
              }).catch(() => {});
          } else {
              api.post(`/virtual-rooms/${id}/transcripts`, {
                  speaker_name: hostDisplayName,
                  text
              }).catch(() => {});
          }
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
          return;
      }
      startRecognition();
      return () => stopRecognition();
  }, [transcriptionEnabled, isGuest]);

  useEffect(() => {
      if (!isGuest) return;
      if (!guestTranscriptionEnabled) {
          stopRecognition();
          return;
      }
      startRecognition();
      return () => stopRecognition();
  }, [guestTranscriptionEnabled, isGuest]);

  const handleEndCall = async () => {
      cleanupMedia();
      if (isGuest && participantToken && id) {
          try {
              await api.post(`/virtual-rooms/public/${id}/leave`, { token: participantToken });
          } catch (err) {
              // ignore leave errors
          }
      }
      navigate(isGuest ? '/' : '/salas-virtuais');
  };

  const getCompanionUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('companion', 'true');
      return url.toString();
  };

  const handleJoin = async () => {
      if (isGuest && !guestName.trim()) {
          alert("Por favor, digite seu nome para entrar.");
          return;
      }
      
      // reset state per session (no chat cache)
      setMessages([{
          sender: 'Sistema',
          text: 'Sala segura criada (Criptografia ponta-a-ponta).',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          role: 'system',
          isLocal: false
      }]);
      setRemoteAnswers({});
      setActiveAssessmentId(null);
      setAssessmentStatus('idle');
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

      setHasJoined(true);
      
      if (isGuest) {
          setConnectionStatus('waiting_approval');
          if (id) {
              try {
                  const data = await api.post<{ token: string }>(`/virtual-rooms/public/${id}/waiting`, { name: guestName });
                  setWaitingToken(data.token);
                  setParticipantToken(data.token);
              } catch (err) {
                  alert('Nao foi possivel entrar na fila.');
                  setConnectionStatus('idle');
                  setHasJoined(false);
                  return;
              }
          }
          // Optional: keep local broadcast for same-browser sessions
          broadcastChannelRef.current?.postMessage({
              type: 'REQUEST_ENTRY',
              payload: { name: guestName, id: 'guest-' + Date.now() }
          });
      } else {
          setConnectionStatus('connected');
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
                  <button onClick={clearCanvas} className="p-2 hover:bg-white/10 rounded-full">
                      <Eraser size={20} />
                  </button>
              </div>
              <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              <canvas 
                  ref={canvasRef}
                  width={window.innerWidth} 
                  height={window.innerHeight - 56}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className={`touch-none block ${isGuest && !guestCanDraw ? 'cursor-default pointer-events-none' : 'cursor-crosshair'}`}
              />
              {!isGuest && (
                  <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 bg-white/90 p-2 rounded-xl border border-slate-200 shadow-sm">
                      {['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'].map(color => (
                          <button 
                            key={color}
                            onClick={() => setDrawColor(color)} 
                            className={`w-8 h-8 rounded-full border-2 transition-transform ${drawColor === color ? 'border-slate-800 scale-110' : 'border-transparent'}`} 
                            style={{ backgroundColor: color }}
                          />
                      ))}
                  </div>
              )}
              </div>
          </div>
      );
  }

  // --- RENDER: WAITING ROOM (GUEST) ---
  if (hasJoined && connectionStatus === 'waiting_approval') {
      return (
          <div className="fixed inset-0 bg-[#0f1115] text-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
              <div className="relative w-32 h-32 mb-8">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                  <div className="relative w-full h-full bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700">
                      <User size={64} className="text-slate-400" />
                  </div>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Aguardando permissão</h2>
              <p className="text-slate-400 text-lg max-w-md mb-8">
                  Você está na sala de espera. O anfitrião permitirá sua entrada em breve.
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
          <div className="fixed inset-0 bg-slate-50 text-slate-800 flex items-center justify-center font-sans p-4 overflow-y-auto">
              {waitingEntries.length > 0 && !isGuest && (
                  <div className="absolute top-6 right-6 z-[100] animate-[slideLeft_0.3s_ease-out] w-full max-w-sm">
                      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xl">
                          <div className="flex items-center justify-between mb-3">
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Na espera ({waitingEntries.length})</div>
                              <div className="text-[10px] text-slate-400">Permissao pendente</div>
                          </div>
                          <div className="space-y-3">
                              {waitingEntries.map((entry) => (
                                  <div key={entry.id} className="flex items-center gap-4">
                                      <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">{entry.guest_name.charAt(0)}</div>
                                      <div className="flex-1">
                                          <h4 className="font-bold text-sm text-slate-900">{entry.guest_name}</h4>
                                          <p className="text-xs text-slate-500">Solicitando entrada...</p>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => handleDenyGuest(entry)} className="p-2 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white transition-colors" title="Negar"><X size={18} /></button>
                                          <button onClick={() => handleAdmitGuest(entry)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors" title="Admitir"><Check size={18} /></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}
              <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 my-auto h-auto min-h-[600px]">
                  {/* Left Column: Video Preview */}
                  <div className="flex flex-col justify-center animate-[fadeIn_0.5s_ease-out]">
                      <h1 className="text-3xl font-display font-bold mb-2 text-slate-900">Sala de Espera</h1>
                      <p className="text-slate-500 mb-6">
                          {isGuest ? 'Voce foi convidado para uma reuniao' : `${appointment?.title || 'Consulta'} - ${patientDisplayName}`}
                      </p>
                      
                      <div className="relative w-full aspect-video bg-slate-900 rounded-[2rem] overflow-hidden border border-slate-200 shadow-2xl mb-6 group ring-4 ring-white">
                          {cameraOn ? (
                              <video ref={lobbyVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                          ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 animate-pulse">
                                      <VideoOff size={32} />
                                  </div>
                              </div>
                          )}
                          
                          {/* Audio Visualizer Overlay */}
                          <div className="absolute bottom-6 left-6 flex gap-1 h-6 items-end">
                              {[1,2,3].map(i => (
                                  <div key={i} className={`w-2 rounded-full transition-all duration-75 ${micOn ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500'}`} style={{ height: micOn ? `${Math.max(20, audioLevel * (i * 0.8))}%` : '4px' }}></div>
                              ))}
                          </div>

                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md p-2 rounded-2xl border border-white/10">
                              <button onClick={toggleMic} className={`p-3 rounded-xl transition-all ${micOn ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-red-500 text-white'}`}>{micOn ? <Mic size={20} /> : <MicOff size={20} />}</button>
                              <button onClick={toggleCam} className={`p-3 rounded-xl transition-all ${cameraOn ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-red-500 text-white'}`}>{cameraOn ? <Video size={20} /> : <VideoOff size={20} />}</button>
                              <button onClick={() => setShowSettingsModal(true)} className="p-3 rounded-xl bg-slate-800/80 text-white hover:bg-slate-700 border border-white/10" title="Configurações"><Settings size={20} /></button>
                          </div>
                      </div>
                  </div>

                  {/* Right Column: Controls & Info */}
                  <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 flex flex-col h-full animate-[slideUpFade_0.5s_ease-out]">
                      {isGuest ? (
                          // GUEST VIEW
                          <div className="flex flex-col justify-center h-full space-y-6">
                              <div className="text-center">
                                  <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
                                      <User size={32} />
                                  </div>
                                  <h2 className="text-xl font-bold text-slate-800">Identificação</h2>
                                  <p className="text-sm text-slate-500 mt-1">Como você gostaria de ser chamado?</p>
                              </div>
                              <div className="space-y-4">
                                  <div>
                                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Seu Nome</label>
                                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Digite seu nome..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700" />
                                  </div>
                                  <button onClick={handleJoin} disabled={!guestName.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95">Pedir para Entrar</button>
                              </div>
                          </div>
                      ) : (
                          // HOST VIEW
                          <>
                              {/* Tabs */}
                              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                                  <button onClick={() => setLobbyTab('info')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${lobbyTab === 'info' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Info size={16} /> Detalhes</button>
                                  <button onClick={() => setLobbyTab('companion')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${lobbyTab === 'companion' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Tablet size={16} /> Lousa</button>
                              </div>
                              <div className="flex-1 overflow-y-auto custom-scrollbar">
                                  {lobbyTab === 'info' ? (
                                      <div className="space-y-6">
                                          <div>
                                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Link da Reunião</label>
                                              <div className="flex gap-2">
                                                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-600 truncate font-mono select-all">{meetingUrl}</div>
                                                  <button onClick={handleCopyLink} className={`p-3 rounded-xl transition-all flex-shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{copied ? <Check size={18} /> : <Copy size={18} />}</button>
                                              </div>
                                              <p className="text-xs text-slate-400 mt-2">Compartilhe este link com o paciente.</p>
                                          </div>
                                          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                                              <Info size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                              <div className="text-xs text-indigo-800 leading-relaxed"><span className="font-bold block mb-1">Pronto para começar?</span> Verifique se seus dispositivos estão funcionando corretamente na pré-visualização ao lado.</div>
                                          </div>
                                      </div>
                                  ) : (
                                      <div className="space-y-6 text-center">
                                          <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center">
                                              <QrCode size={120} className="text-slate-800 mb-4" />
                                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Escaneie para conectar</p>
                                          </div>
                                          <div>
                                              <p className="text-sm text-slate-600 mb-3">Ou use o link direto no outro dispositivo:</p>
                                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 break-all font-mono text-left">{getCompanionUrl()}</div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                              <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
                                  <button onClick={handleJoin} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">Entrar na Sala <Share2 size={18} className="opacity-50" /></button>
                                  <button onClick={() => navigate('/agenda')} className="w-full py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors">Voltar para Agenda</button>
                              </div>
                          </>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: MAIN MEETING ROOM ---
  return (
    <div className="fixed inset-0 bg-[#0f1115] text-white overflow-hidden font-sans flex flex-col">
      
      {/* --- INCOMING REQUEST ALERT (HOST ONLY) --- */}
      {waitingEntries.length > 0 && !isGuest && (
          <div className="absolute top-20 right-4 z-[100] animate-[slideLeft_0.3s_ease-out] w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Na espera ({waitingEntries.length})</div>
                      <div className="text-[10px] text-slate-400">Permissao pendente</div>
                  </div>
                  <div className="space-y-3">
                      {waitingEntries.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-800 font-bold text-lg">{entry.guest_name.charAt(0)}</div>
                              <div className="flex-1"><h4 className="font-bold text-sm text-white">{entry.guest_name}</h4><p className="text-xs text-slate-300">Solicitando entrada...</p></div>
                              <div className="flex gap-2">
                                  <button onClick={() => handleDenyGuest(entry)} className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Negar"><X size={18} /></button>
                                  <button onClick={() => handleAdmitGuest(entry)} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors" title="Admitir"><Check size={18} /></button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}
      {isGuest && remoteTranscriptionRequested && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[90] animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-indigo-600/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-indigo-400/50 flex items-center gap-3">
                  <span>Transcricao solicitada pelo profissional</span>
                  {hasSpeechSupport ? (
                      <button onClick={() => setGuestTranscriptionEnabled(true)} className="px-3 py-1 bg-white/10 rounded-full text-xs font-bold hover:bg-white/20">Ativar</button>
                  ) : (
                      <span className="text-xs text-white/80">Seu navegador nao suporta</span>
                  )}
              </div>
          </div>
      )}
      {entryNotice && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[90] animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-emerald-600/90 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg border border-emerald-400/50">
                  {entryNotice}
              </div>
          </div>
      )}

      {/* --- HEADER --- */}
      <header className="h-16 px-4 md:px-6 flex items-center justify-between bg-[#0f1115]/90 backdrop-blur-md z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
             <Clock size={16} className="text-emerald-400" />
             <span className="font-mono font-bold text-sm tracking-wide">{formatTime(elapsedTime)}</span>
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block"></div>
          <div className="hidden sm:block">
             <h1 className="font-bold text-lg leading-none">{isGuest ? `Atendimento: ${hostDisplayName}` : (patientDisplayName || t('meeting.patient'))}</h1>
             <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Em atendimento</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {!isGuest && (
               <button onClick={() => setShowLinkDeviceModal(true)} className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg text-xs font-bold transition-all border border-indigo-500/30"><Tablet size={14} /> Lousa no Tablet</button>
           )}
           <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white" title="Configurações"><Settings size={20} /></button>
        </div>
      </header>

      {/* --- MAIN STAGE --- */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* CENTER CONTENT */}
        <div className="flex-1 relative flex items-center justify-center p-2 md:p-4">
           
           {/* Remote Participant Area */}
           <div className={`w-full h-full ${useGridLayout ? '' : 'max-w-6xl max-h-[85vh]'} relative flex items-center justify-center`}>
              
              {screenShare ? (
                 <video ref={screenShareRef} autoPlay muted playsInline className="w-full h-full object-contain rounded-2xl shadow-2xl bg-black" />
              ) : useGridLayout ? (
                 <div className={`w-full h-full ${layoutMode === 'side-by-side' ? 'grid grid-cols-1 md:grid-cols-2' : 'grid grid-rows-2'} gap-4`}>
                    <div className="relative w-full h-full bg-[#1e2025] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl border border-white/5">
                       {remoteScreenShareActive ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                             <MonitorUp size={40} className="text-emerald-400 mb-3" />
                             <p className="text-sm md:text-base font-bold text-slate-200">Compartilhamento de tela ativo</p>
                             <p className="text-xs text-slate-500 mt-1">O profissional esta compartilhando a tela.</p>
                          </div>
                       ) : remoteUserConnected ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                             <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-4xl md:text-5xl font-bold text-white shadow-2xl">
                                {remoteInitial}
                             </div>
                             <p className="mt-4 text-sm md:text-base font-bold text-slate-200">{remoteDisplayName}</p>
                          </div>
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
                             <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(0,0,0,0.3)] border-4 border-white/5">
                                <User size={48} className="text-slate-400" />
                             </div>
                             <h2 className="text-lg md:text-xl font-display font-bold text-slate-200">{t('meeting.waiting')}</h2>
                             <p className="text-slate-500 mt-2 text-xs md:text-sm">{isGuest ? 'Aguardando o profissional...' : 'O paciente entrar em breve...'}</p>
                          </div>
                       )}
                       <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2">
                          {remoteDisplayName} <MicIcon size={14} className="text-emerald-400" />
                       </div>
                    </div>
                    <div className="relative w-full h-full bg-[#1e2025] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl border border-white/5">
                       {cameraOn ? (
                          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                       ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 relative">
                             <div className="w-24 h-24 md:w-36 md:h-36 rounded-full bg-indigo-600 flex items-center justify-center text-3xl md:text-4xl font-bold shadow-lg">
                                {localInitial}
                             </div>
                             {micOn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-24 h-24 md:w-36 md:h-36 rounded-full border-2 border-indigo-500/30 animate-ping"></div></div>}
                          </div>
                       )}
                       <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                          {t('meeting.you')} {!micOn && <MicOff size={12} className="text-red-400" />}
                       </div>
                    </div>
                 </div>
              ) : remoteScreenShareActive ? (
                 <div className="relative w-full h-full bg-[#1e2025] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl border border-white/5 animate-[fadeIn_0.5s_ease-out]">
                     <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                         <MonitorUp size={64} className="text-emerald-400 mb-4" />
                         <p className="text-lg font-bold text-slate-200">Compartilhamento de tela ativo</p>
                         <p className="text-sm text-slate-500 mt-2">O profissional esta compartilhando a tela.</p>
                     </div>
                 </div>
              ) : remoteUserConnected ? (
                 <div className="relative w-full h-full bg-[#1e2025] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl border border-white/5 animate-[fadeIn_0.5s_ease-out]">
                     <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                         <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-5xl md:text-6xl font-bold text-white shadow-2xl">
                            {remoteInitial}
                         </div>
                         <p className="mt-6 text-lg font-bold text-slate-200">{remoteDisplayName}</p>
                     </div>
                     <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2">
                         {remoteDisplayName} <MicIcon size={14} className="text-emerald-400" />
                     </div>
                 </div>
              ) : (
                 <div className="relative w-full h-full bg-[#181a1f] rounded-[24px] md:rounded-[32px] border border-white/5 flex flex-col items-center justify-center shadow-2xl overflow-hidden group">
                    <div className="relative z-10 flex flex-col items-center text-center px-4">
                       <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_60px_rgba(0,0,0,0.3)] border-4 border-white/5 relative animate-pulse">
                          <User size={60} className="text-slate-400 md:w-20 md:h-20" />
                       </div>
                       <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-200">{t('meeting.waiting')}</h2>
                       <p className="text-slate-500 mt-2 text-sm md:text-lg">{isGuest ? 'Aguardando o profissional...' : 'O paciente entrar em breve...'}</p>
                    </div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent opacity-50"></div>
                 </div>
              )}

              {/* Captions Overlay */}
              {captionsOn && (
                 <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20 pointer-events-none px-4">
                    <div className="bg-black/70 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-base md:text-lg font-medium text-center max-w-2xl shadow-xl">
                       {transcript || <span className="text-slate-400 italic flex items-center gap-2 justify-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div> {t('meeting.listening')}</span>}
                    </div>
                 </div>
              )}
           </div>

           {/* PIP (Local User) */}
           {!useGridLayout && (
              <div className="absolute top-4 right-4 w-28 md:w-72 aspect-video md:top-auto md:bottom-8 md:right-8 bg-[#1e2025] rounded-xl md:rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-30 group cursor-move transition-all duration-300">
                 {cameraOn ? (
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 relative">
                       <div className="w-8 h-8 md:w-16 md:h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xs md:text-xl font-bold shadow-lg">
                           {localInitial}
                       </div>
                       {micOn && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-indigo-500/30 animate-ping"></div></div>}
                    </div>
                 )}
                 <div className="absolute bottom-1 left-1 md:bottom-3 md:left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 md:px-3 md:py-1 rounded md:rounded-lg text-[8px] md:text-xs font-bold flex items-center gap-1 md:gap-2">
                    {t('meeting.you')} {!micOn && <MicOff size={8} className="text-red-400 md:w-3 md:h-3" />}
                 </div>
              </div>
           )}
        </div>

        {/* SIDE PANEL */}
        {activeSidePanel !== 'none' && (
           <div className="absolute inset-0 z-50 md:static md:w-[400px] bg-[#181a1f] border-l border-white/5 flex flex-col shadow-2xl animate-[slideLeft_0.3s_ease-out]">
              <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                 <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-300">
                    {activeSidePanel === 'chat' && <><MessageSquare size={16} className="text-indigo-400" /> {t('meeting.chat')}</>}
                    {activeSidePanel === 'whiteboard' && <><PenTool size={16} className="text-indigo-400" /> {t('meeting.whiteboard')}</>}
                    {activeSidePanel === 'assessments' && <><ClipboardCheck size={16} className="text-indigo-400" /> {t('meeting.assessments')}</>}
                 </h3>
                 <button onClick={() => setActiveSidePanel('none')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                    <X size={18} />
                 </button>
              </div>

              <div className="flex-1 overflow-hidden relative flex flex-col bg-[#0f1115]/50">
                 {/* PANEL CONTENT SWITCHER */}
                 {activeSidePanel === 'chat' && (
                    <>
                       <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                          {messages.map((msg, i) => (
                             <div key={i} className={`flex flex-col ${msg.isLocal ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.isLocal ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#252830] text-slate-200 rounded-tl-none border border-white/5'}`}>
                                   {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                             </div>
                          ))}
                       </div>
                       <div className="p-4 bg-[#181a1f] border-t border-white/5">
                          <form onSubmit={handleSendMessage} className="relative">
                             <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Digite sua mensagem..." className="w-full bg-[#0f1115] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder:text-slate-600" />
                             <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors text-white shadow-lg"><Send size={16} /></button>
                          </form>
                       </div>
                    </>
                 )}

                 {activeSidePanel === 'whiteboard' && (
                    <div className="flex flex-col h-full bg-white">
                        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            {!isGuest && (
                                <>
                                    <div className="flex gap-2">
                                        {['#000000', '#ef4444', '#3b82f6', '#10b981'].map(color => (
                                            <button key={color} onClick={() => setDrawColor(color)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${drawColor === color ? 'border-slate-400 scale-110 shadow-sm' : 'border-transparent'}`} style={{ backgroundColor: color }} />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                                        <button onClick={clearCanvas} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title={t('meeting.clearBoard')}><Eraser size={16} /></button>
                                    </div>
                                </>
                            )}
                            {isGuest && (
                                <div className="text-xs text-slate-500 font-semibold">Lousa compartilhada pelo profissional</div>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden cursor-crosshair relative bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                            <canvas ref={canvasRef} width={400} height={800} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} className="w-full h-full" />
                        </div>
                    </div>
                 )}

                 {activeSidePanel === 'assessments' && (
                     <div className="flex flex-col h-full bg-[#181a1f] p-4 overflow-y-auto custom-scrollbar">
                         {isGuest ? (
                             // GUEST VIEW FOR ASSESSMENTS
                             activeAssessmentId && ASSESSMENTS_DATA[activeAssessmentId] ? (
                                 <div className="bg-white rounded-2xl p-6 text-slate-800 animate-[fadeIn_0.3s_ease-out]">
                                     {assessmentStatus === 'completed' ? (
                                         <div className="text-center py-10">
                                             <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><Check size={32} /></div>
                                             <h3 className="text-xl font-bold mb-2">{t('meeting.testComplete')}</h3>
                                             <p className="text-slate-500">Suas respostas foram enviadas.</p>
                                         </div>
                                     ) : (
                                         <>
                                             <h3 className="font-bold text-lg mb-2">{ASSESSMENTS_DATA[activeAssessmentId].name}</h3>
                                             <p className="text-sm text-slate-500 mb-6">{ASSESSMENTS_DATA[activeAssessmentId].description}</p>
                                             
                                             <div className="space-y-6">
                                                 {ASSESSMENTS_DATA[activeAssessmentId].questions.map((q, idx) => (
                                                     <div key={q.id}>
                                                         <p className="font-bold text-sm mb-3">{idx + 1}. {q.text}</p>
                                                         <div className="flex flex-wrap gap-2">
                                                             {ASSESSMENTS_DATA[activeAssessmentId].options ? (
                                                                 ASSESSMENTS_DATA[activeAssessmentId].options?.map(opt => (
                                                                     <button 
                                                                        key={opt.value}
                                                                        onClick={() => handleRemoteAnswer(q.id, opt.value)}
                                                                        className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${remoteAnswers[q.id] === opt.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                                                     >
                                                                         {opt.label}
                                                                     </button>
                                                                 ))
                                                             ) : (
                                                                 <>
                                                                     <button onClick={() => handleRemoteAnswer(q.id, 'Sim')} className={`px-6 py-2 rounded-lg text-xs font-bold border ${remoteAnswers[q.id] === 'Sim' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}>Sim</button>
                                                                     <button onClick={() => handleRemoteAnswer(q.id, 'Não')} className={`px-6 py-2 rounded-lg text-xs font-bold border ${remoteAnswers[q.id] === 'Não' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}>Não</button>
                                                                 </>
                                                             )}
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                             
                                             <div className="mt-8 pt-4 border-t border-slate-100 text-right">
                                                 <button 
                                                    onClick={handleFinishAssessment}
                                                    className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
                                                 >
                                                     Finalizar
                                                 </button>
                                             </div>
                                         </>
                                     )}
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                     <ClipboardCheck size={48} className="mb-4" />
                                     <p>{t('meeting.waitingForStart')}</p>
                                 </div>
                             )
                         ) : (
                             // HOST VIEW FOR ASSESSMENTS
                             <>
                                {activeAssessmentId ? (
                                    <div className="space-y-4">
                                        <button onClick={() => { setActiveAssessmentId(null); setAssessmentStatus('idle'); }} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><ArrowLeft size={12}/> Voltar</button>
                                        
                                        <div className="bg-[#252830] p-4 rounded-xl border border-white/5">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-white">{ASSESSMENTS_DATA[activeAssessmentId].name}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-1 rounded ${assessmentStatus === 'active' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                    {assessmentStatus === 'active' ? t('meeting.monitoring') : t('meeting.testComplete')}
                                                </span>
                                            </div>
                                            
                                            {/* Live Progress */}
                                            <div className="space-y-3 mt-4">
                                                {ASSESSMENTS_DATA[activeAssessmentId].questions.map((q, idx) => (
                                                    <div key={q.id} className="flex justify-between text-xs text-slate-300 border-b border-white/5 pb-2 last:border-0">
                                                        <span className="truncate w-[70%]">{idx+1}. {q.text}</span>
                                                        <span className={`font-bold ${remoteAnswers[q.id] ? 'text-indigo-400' : 'text-slate-600'}`}>
                                                            {remoteAnswers[q.id] || '-'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Result Calculation */}
                                            <div className="mt-4 pt-4 border-t border-white/10">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs text-slate-400 font-bold uppercase">{t('meeting.resultCalculated')}</span>
                                                    <span className="text-xl font-bold text-white">{calculateHostResult() || 0}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500">*Visível apenas para você</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Disponíveis</p>
                                        {Object.values(ASSESSMENTS_DATA).map((assess) => (
                                            <div key={assess.id} className="bg-[#252830] p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 transition-all group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-bold text-white">{assess.name}</h4>
                                                    <span className={`w-2 h-2 rounded-full ${assess.color}`}></span>
                                                </div>
                                                <p className="text-xs text-slate-400 mb-4">{assess.description}</p>
                                                <button 
                                                    onClick={() => handleStartAssessment(assess.id)}
                                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Play size={12} /> {t('meeting.sendTest')}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </>
                         )}
                     </div>
                 )}
              </div>
           </div>
        )}

      </main>

      {/* --- FOOTER CONTROLS --- */}
      <footer className="h-24 flex items-center justify-center gap-4 relative z-50 pointer-events-none px-4">
         <div className="pointer-events-auto bg-[#181a1f]/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl flex items-center gap-2 mb-6 transform hover:scale-[1.02] transition-transform duration-300 overflow-x-auto max-w-full">
            {/* ... controls ... */}
            <button onClick={toggleMic} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${micOn ? 'bg-[#252830] hover:bg-[#2d313a] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`} title={micOn ? "Desativar Microfone" : "Ativar Microfone"}>{micOn ? <Mic size={24} /> : <MicOff size={24} />}</button>
            <button onClick={toggleCam} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${cameraOn ? 'bg-[#252830] hover:bg-[#2d313a] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`} title={cameraOn ? "Desativar Câmera" : "Ativar Câmera"}>{cameraOn ? <Video size={24} /> : <VideoOff size={24} />}</button>
            <div className="w-px h-8 bg-white/10 mx-1 shrink-0"></div>

            {/* Hidden for Guests */}
            {!isGuest && (
                <>
                    <button onClick={() => setCaptionsOn(!captionsOn)} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${captionsOn ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`} title="Legendas"><Subtitles size={24} /></button>
                    <button onClick={toggleScreenShare} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${screenShare ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`} title="Compartilhar Tela">{screenShare ? <MonitorUp size={24} /> : <ScreenShare size={24} />}</button>
                    <button onClick={() => setActiveSidePanel(activeSidePanel === 'assessments' ? 'none' : 'assessments')} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${activeSidePanel === 'assessments' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`} title="Avaliações em Tempo Real"><ClipboardCheck size={24} /></button>
                    <button onClick={() => setActiveSidePanel(activeSidePanel === 'whiteboard' ? 'none' : 'whiteboard')} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${activeSidePanel === 'whiteboard' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`} title="Lousa Interativa"><PenTool size={24} /></button>
                    <div className="w-px h-8 bg-white/10 mx-1 shrink-0"></div>
                </>
            )}

            <button onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? 'none' : 'chat')} className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 relative ${activeSidePanel === 'chat' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`} title="Chat"><MessageSquare size={24} />{messages.length > 1 && activeSidePanel !== 'chat' && (<span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#252830]"></span>)}</button>
            <button onClick={() => setShowEndModal(true)} className="w-20 h-14 shrink-0 rounded-[1.2rem] bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/40 ml-2 transition-all hover:scale-105 active:scale-95" title="Encerrar"><PhoneOff size={28} /></button>
         </div>
      </footer>

      {/* ... (Other Modals - Settings, LinkDevice, End - kept same) ... */}
      {showSettingsModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-[#181a1f] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Settings size={20} /> Configurações</h3><button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
                  <div className="p-6 space-y-6">
                      {!isGuest && (
                          <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Subtitles size={14} /> Transcricao</label>
                              <div className="flex items-center justify-between bg-[#252830] border border-white/10 rounded-xl px-4 py-3">
                                  <span className="text-sm text-slate-200">Transcricao ativa</span>
                                  <button onClick={() => setTranscriptionEnabled(!transcriptionEnabled)} className={`w-12 h-7 rounded-full transition-colors ${transcriptionEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                      <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${transcriptionEnabled ? 'translate-x-6' : 'translate-x-1'}`}></span>
                                  </button>
                              </div>
                          </div>
                      )}
                      {!isGuest && (
                          <div className="space-y-3">
                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><PenTool size={14} /> Lousa</label>
                              <div className="flex items-center justify-between bg-[#252830] border border-white/10 rounded-xl px-4 py-3">
                                  <span className="text-sm text-slate-200">Permitir paciente desenhar</span>
                                  <button onClick={() => setAllowGuestDraw(!allowGuestDraw)} className={`w-12 h-7 rounded-full transition-colors ${allowGuestDraw ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                      <span className={`block w-5 h-5 bg-white rounded-full transform transition-transform ${allowGuestDraw ? 'translate-x-6' : 'translate-x-1'}`}></span>
                                  </button>
                              </div>
                          </div>
                      )}
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layout size={14} /> Layout da Sala</label>
                          <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => setLayoutMode('focus')} className={layoutMode === 'focus' ? 'px-3 py-2 rounded-xl text-xs font-bold border transition-colors bg-indigo-600 text-white border-indigo-500' : 'px-3 py-2 rounded-xl text-xs font-bold border transition-colors bg-[#252830] text-slate-300 border-white/10 hover:bg-[#2d313a]'}>Foco</button>
                              <button onClick={() => setLayoutMode('side-by-side')} className={layoutMode === 'side-by-side' ? 'px-3 py-2 rounded-xl text-xs font-bold border transition-colors bg-indigo-600 text-white border-indigo-500' : 'px-3 py-2 rounded-xl text-xs font-bold border transition-colors bg-[#252830] text-slate-300 border-white/10 hover:bg-[#2d313a]'}>Lado a lado</button>
                              <button onClick={() => setLayoutMode('stacked')} className={layoutMode === 'stacked' ? 'px-3 py-2 rounded-xl text-xs font-bold border transition-colors bg-indigo-600 text-white border-indigo-500' : 'px-3 py-2 rounded-xl text-xs font-bold border transition-colors bg-[#252830] text-slate-300 border-white/10 hover:bg-[#2d313a]'}>Empilhado</button>
                          </div>
                      </div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Video size={14} /> Câmera</label><div className="relative"><select className="w-full p-3 bg-[#252830] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none"><option>FaceTime HD Camera (Built-in)</option><option>External Webcam</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Mic size={14} /> Microfone</label><div className="relative"><select className="w-full p-3 bg-[#252830] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none"><option>MacBook Pro Microphone (Built-in)</option><option>AirPods Pro</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div><div className="flex items-center gap-2"><div className="flex-1 bg-[#252830] h-2 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[60%] animate-pulse"></div></div><span className="text-xs text-emerald-400 font-bold">Bom</span></div></div>
                      <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Volume2 size={14} /> Saída de Áudio</label><div className="relative"><select className="w-full p-3 bg-[#252830] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none"><option>MacBook Pro Speakers</option><option>AirPods Pro</option></select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} /></div><button className="text-xs text-indigo-400 font-bold hover:underline">Testar Som</button></div>
                  </div>
                  <div className="p-6 border-t border-white/10 flex justify-end"><button onClick={() => setShowSettingsModal(false)} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors">Concluído</button></div>
              </div>
          </div>
      )}

      {showLinkDeviceModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-[#181a1f] border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center shadow-2xl animate-[slideUpFade_0.3s_ease-out]">
               <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold text-white flex items-center gap-2"><Tablet size={20} className="text-indigo-400" /> Vincular Dispositivo</h3><button onClick={() => setShowLinkDeviceModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button></div>
               <div className="bg-white p-6 rounded-xl mb-6 flex flex-col items-center"><QrCode size={160} className="text-slate-900" /><p className="text-slate-500 text-xs mt-2 font-mono">Scan to join as companion</p></div>
               <p className="text-slate-400 text-sm mb-6 leading-relaxed">Abra a câmera do seu tablet ou celular e escaneie o código para usar como <span className="text-indigo-400 font-bold"> Lousa Interativa</span>.</p>
               <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-slate-300 font-mono mb-6 break-all"><span className="truncate">{getCompanionUrl()}</span><button className="p-2 hover:bg-white/10 rounded-lg shrink-0" title="Copiar"><Share2 size={14} /></button></div>
               <button onClick={() => setShowLinkDeviceModal(false)} className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-50 shadow-lg shadow-indigo-900/30 transition-colors">Concluído</button>
            </div>
         </div>
      )}

      {showEndModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            <div className={`bg-[#181a1f] border border-white/10 p-8 rounded-[2rem] ${!isGuest && transcriptionEnabled ? 'max-w-2xl' : 'max-w-sm'} w-full text-center shadow-2xl animate-[slideUpFade_0.3s_ease-out]`}>
               <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20"><PhoneOff size={36} /></div>
               <h3 className="text-2xl font-bold text-white mb-2">Encerrar Sessão?</h3>
               <p className="text-slate-400 mb-8 text-sm leading-relaxed">Isso desconectará você e o paciente da sala virtual. Certifique-se de que o prontuário foi salvo.</p>
               {!isGuest && transcriptionEnabled && (
                   <div className="text-left bg-[#101216] border border-white/10 rounded-2xl p-4 mb-6">
                       <div className="flex items-center justify-between mb-2">
                           <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Relatorio da transcricao</div>
                           <button onClick={handleCopyTranscript} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                               {copiedTranscript ? <Check size={12} /> : <Copy size={12} />}
                               {copiedTranscript ? 'Copiado' : 'Copiar'}
                           </button>
                       </div>
                       <textarea readOnly value={transcriptText} className="w-full h-40 bg-[#0f1115] border border-white/10 rounded-xl p-3 text-xs text-slate-200 leading-relaxed resize-none" placeholder="Sem transcricao registrada." />
                   </div>
               )}
               <div className="flex gap-3"><button onClick={() => setShowEndModal(false)} className="flex-1 py-3.5 rounded-xl font-bold text-slate-300 hover:bg-white/10 transition-colors">Cancelar</button><button onClick={handleEndCall} className="flex-1 py-3.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30 transition-colors">Encerrar</button></div>
            </div>
         </div>
      )}

    </div>
  );
};


