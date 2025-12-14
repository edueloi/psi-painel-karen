
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, 
  MessageSquare, PenTool, X, Send, Paperclip, 
  Eraser, Download, Clock, User, Subtitles, MonitorUp, 
  Layout, Mic as MicIcon, FileText, Smartphone, QrCode, Share2, Tablet, Settings,
  Copy, Check, Info, ChevronDown, Volume2, Link as LinkIcon, UserPlus, ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MOCK_APPOINTMENTS } from '../constants';

interface MeetingRoomProps {
  isGuest?: boolean;
}

type ConnectionStatus = 'idle' | 'waiting_approval' | 'connected';

// Helper for coordinates
type Point = { x: number, y: number };

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ isGuest = false }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // --- Mode Check ---
  const isCompanionMode = searchParams.get('companion') === 'true';

  // --- States ---
  const [hasJoined, setHasJoined] = useState(isCompanionMode); 
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(isCompanionMode ? 'connected' : 'idle');
  
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'whiteboard' | 'none'>(
    isCompanionMode ? 'whiteboard' : 'none'
  );
  
  // Host: Simulation State for Incoming Request
  const [incomingRequest, setIncomingRequest] = useState<{name: string, id: string} | null>(null);
  const [remoteUserConnected, setRemoteUserConnected] = useState(false);

  const [messages, setMessages] = useState<{sender: string, text: string, time: string}[]>([
    { sender: 'System', text: 'Sala segura criada (Criptografia ponta-a-ponta).', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLinkDeviceModal, setShowLinkDeviceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); 
  const [lobbyTab, setLobbyTab] = useState<'info' | 'companion'>('info');
  const [copied, setCopied] = useState(false);
  const [guestName, setGuestName] = useState('');

  // Captions
  const [captionsOn, setCaptionsOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // --- Refs ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
  // Audio Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');
  const lastPointRef = useRef<Point | null>(null);

  const appointment = MOCK_APPOINTMENTS.find(a => a.id === id);
  const meetingUrl = window.location.href.split('?')[0];

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
                    // Play notification sound logic here
                }
                break;

            case 'ADMIT_GUEST':
                // Guest listens to this
                if (isGuest && connectionStatus === 'waiting_approval') {
                    setConnectionStatus('connected');
                    setRemoteUserConnected(true);
                }
                // Host updates their UI too (if multiple host tabs)
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
                // Remote drawing start
                remoteDrawStart(payload);
                break;

            case 'DRAW_MOVE':
                // Remote drawing move
                remoteDrawMove(payload);
                break;
            
            case 'CLEAR_BOARD':
                const ctx = canvasRef.current?.getContext('2d');
                if (ctx && canvasRef.current) {
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                }
                break;
        }
    };

    return () => {
        channel.close();
    };
  }, [id, isGuest, isCompanionMode, connectionStatus]);


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

  // --- Simulate Remote Connection (Fallback if Broadcast not used) ---
  useEffect(() => {
      if (hasJoined && !isGuest && !isCompanionMode && !remoteUserConnected) {
          // Keep existing simulation as fallback or for demo feel
          const timeout = setTimeout(() => {
              if (!incomingRequest && !remoteUserConnected) {
                  // Only simulate if no real request via broadcast happened
                  setIncomingRequest({ 
                      name: appointment?.patientName || 'Carlos Oliveira (Simulado)', 
                      id: 'simulated-guest' 
                  });
              }
          }, 3000);
          return () => clearTimeout(timeout);
      }
  }, [hasJoined, isGuest, isCompanionMode, remoteUserConnected]);


  const handleAdmitGuest = () => {
      broadcastChannelRef.current?.postMessage({ type: 'ADMIT_GUEST' });
      setRemoteUserConnected(true);
      setIncomingRequest(null);
      setMessages(prev => [...prev, { 
          sender: 'System', 
          text: `${incomingRequest?.name} entrou na sala.`, 
          time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }]);
  };

  const handleDenyGuest = () => {
      broadcastChannelRef.current?.postMessage({ type: 'DENY_GUEST' });
      setIncomingRequest(null);
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
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setScreenShare(true);
        stream.getVideoTracks()[0].onended = () => {
          setScreenShare(false);
          screenStreamRef.current = null;
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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

    lastPointRef.current = pos;
  };

  const stopDrawing = () => {
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
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          broadcastChannelRef.current?.postMessage({ type: 'CLEAR_BOARD' });
      }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([...messages, { sender: isGuest ? guestName || 'Convidado' : 'Você', text: newMessage, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }]);
    setNewMessage('');
  };

  const getCompanionUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('companion', 'true');
      return url.toString();
  };

  const handleJoin = () => {
      if (isGuest && !guestName.trim()) {
          alert("Por favor, digite seu nome para entrar.");
          return;
      }
      
      setHasJoined(true);
      
      if (isGuest) {
          setConnectionStatus('waiting_approval');
          // Request entry via broadcast
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
                      className="touch-none block cursor-crosshair"
                  />
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
              <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 my-auto h-auto min-h-[600px]">
                  
                  {/* Left Column: Video Preview */}
                  <div className="flex flex-col justify-center animate-[fadeIn_0.5s_ease-out]">
                      <h1 className="text-3xl font-display font-bold mb-2 text-slate-900">Sala de Espera</h1>
                      <p className="text-slate-500 mb-6">
                          {isGuest ? 'Você foi convidado para uma reunião' : `${appointment?.title || 'Consulta'} - ${appointment?.patientName || 'Paciente'}`}
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
                              <button 
                                  onClick={toggleMic}
                                  className={`p-3 rounded-xl transition-all ${micOn ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-red-500 text-white'}`}
                              >
                                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                              </button>
                              <button 
                                  onClick={toggleCam}
                                  className={`p-3 rounded-xl transition-all ${cameraOn ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-red-500 text-white'}`}
                              >
                                  {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
                              </button>
                              
                              <button 
                                  onClick={() => setShowSettingsModal(true)}
                                  className="p-3 rounded-xl bg-slate-800/80 text-white hover:bg-slate-700 border border-white/10"
                                  title="Configurações"
                              >
                                  <Settings size={20} />
                              </button>
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
                                      <input 
                                          type="text" 
                                          value={guestName}
                                          onChange={(e) => setGuestName(e.target.value)}
                                          placeholder="Digite seu nome..."
                                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 font-medium text-slate-700"
                                      />
                                  </div>
                                  <button 
                                      onClick={handleJoin}
                                      disabled={!guestName.trim()}
                                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95"
                                  >
                                      Pedir para Entrar
                                  </button>
                              </div>
                          </div>
                      ) : (
                          // HOST VIEW
                          <>
                              {/* Tabs */}
                              <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                                  <button 
                                    onClick={() => setLobbyTab('info')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${lobbyTab === 'info' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      <Info size={16} /> Detalhes
                                  </button>
                                  <button 
                                    onClick={() => setLobbyTab('companion')}
                                    className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${lobbyTab === 'companion' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                  >
                                      <Tablet size={16} /> Lousa
                                  </button>
                              </div>

                              <div className="flex-1 overflow-y-auto custom-scrollbar">
                                  {lobbyTab === 'info' ? (
                                      <div className="space-y-6">
                                          <div>
                                              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Link da Reunião</label>
                                              <div className="flex gap-2">
                                                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-slate-600 truncate font-mono select-all">
                                                      {meetingUrl}
                                                  </div>
                                                  <button 
                                                    onClick={handleCopyLink}
                                                    className={`p-3 rounded-xl transition-all flex-shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                  >
                                                      {copied ? <Check size={18} /> : <Copy size={18} />}
                                                  </button>
                                              </div>
                                              <p className="text-xs text-slate-400 mt-2">Compartilhe este link com o paciente.</p>
                                          </div>

                                          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                                              <Info size={18} className="text-indigo-500 mt-0.5 flex-shrink-0" />
                                              <div className="text-xs text-indigo-800 leading-relaxed">
                                                  <span className="font-bold block mb-1">Pronto para começar?</span>
                                                  Verifique se seus dispositivos estão funcionando corretamente na pré-visualização ao lado.
                                              </div>
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
                                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 break-all font-mono text-left">
                                                  {getCompanionUrl()}
                                              </div>
                                          </div>

                                          <div className="flex items-center gap-2 justify-center text-xs text-purple-600 bg-purple-50 p-2 rounded-lg">
                                              <Tablet size={14} /> 
                                              <span>Use seu tablet como segunda tela</span>
                                          </div>
                                      </div>
                                  )}
                              </div>

                              <div className="pt-6 mt-6 border-t border-slate-100 space-y-3">
                                  <button 
                                      onClick={handleJoin}
                                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                                  >
                                      Entrar na Sala <Share2 size={18} className="opacity-50" />
                                  </button>
                                  <button onClick={() => navigate('/agenda')} className="w-full py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors">
                                      Voltar para Agenda
                                  </button>
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
      {incomingRequest && !isGuest && (
          <div className="absolute top-20 right-4 z-[100] animate-[slideLeft_0.3s_ease-out] w-full max-w-sm">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-800 font-bold text-lg">
                      {incomingRequest.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                      <h4 className="font-bold text-sm text-white">{incomingRequest.name}</h4>
                      <p className="text-xs text-slate-300">Solicitando entrada...</p>
                  </div>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleDenyGuest}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Negar"
                      >
                          <X size={18} />
                      </button>
                      <button 
                        onClick={handleAdmitGuest}
                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-colors" title="Admitir"
                      >
                          <Check size={18} />
                      </button>
                  </div>
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
             <h1 className="font-bold text-lg leading-none">
                 {isGuest 
                    ? `Atendimento: ${appointment?.psychologistName || 'Profissional'}` 
                    : (appointment?.patientName || t('meeting.patient'))}
             </h1>
             <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Em atendimento
             </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           {!isGuest && (
               <>
                   <button 
                        onClick={() => setShowLinkDeviceModal(true)}
                        className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg text-xs font-bold transition-all border border-indigo-500/30"
                   >
                       <Tablet size={14} /> Lousa no Tablet
                   </button>
                   <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white" title="Configurações">
                      <Settings size={20} />
                   </button>
                   <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white" title="Layout">
                      <Layout size={20} />
                   </button>
               </>
           )}
        </div>
      </header>

      {/* --- MAIN STAGE --- */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* CENTER CONTENT */}
        <div className="flex-1 relative flex items-center justify-center p-2 md:p-4">
           
           {/* Remote Participant Area (Or Screen Share) */}
           <div className="w-full h-full max-w-6xl max-h-[85vh] relative flex items-center justify-center">
              
              {screenShare ? (
                 <video ref={screenShareRef} autoPlay muted playsInline className="w-full h-full object-contain rounded-2xl shadow-2xl bg-black" />
              ) : remoteUserConnected ? (
                 // SIMULATED REMOTE VIDEO
                 <div className="relative w-full h-full bg-[#1e2025] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl border border-white/5 animate-[fadeIn_0.5s_ease-out]">
                     <img 
                        src={isGuest ? "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1000&auto=format&fit=crop" : "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop"} 
                        alt="Remote User" 
                        className="w-full h-full object-cover opacity-90"
                     />
                     <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl text-white text-sm font-bold flex items-center gap-2">
                         {isGuest ? 'Dra. Karen Gomes' : 'Paciente'} <MicIcon size={14} className="text-emerald-400" />
                     </div>
                 </div>
              ) : (
                 <div className="relative w-full h-full bg-[#181a1f] rounded-[24px] md:rounded-[32px] border border-white/5 flex flex-col items-center justify-center shadow-2xl overflow-hidden group">
                    {/* Placeholder for Remote Video Waiting */}
                    <div className="relative z-10 flex flex-col items-center text-center px-4">
                       <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-6 md:mb-8 shadow-[0_0_60px_rgba(0,0,0,0.3)] border-4 border-white/5 relative animate-pulse">
                          <User size={60} className="text-slate-400 md:w-20 md:h-20" />
                       </div>
                       <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-200">{t('meeting.waiting')}</h2>
                       <p className="text-slate-500 mt-2 text-sm md:text-lg">
                           {isGuest ? 'Aguardando o profissional...' : 'O paciente entrará em breve...'}
                       </p>
                    </div>

                    {/* Ambient Animation */}
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

           {/* PIP (Local User) - Adjusted for Mobile */}
           <div className="absolute top-4 right-4 w-28 md:w-72 aspect-video md:top-auto md:bottom-8 md:right-8 bg-[#1e2025] rounded-xl md:rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-30 group cursor-move transition-all duration-300">
              {cameraOn ? (
                 <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 relative">
                    <div className="w-8 h-8 md:w-16 md:h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xs md:text-xl font-bold shadow-lg">
                        {isGuest ? (guestName.charAt(0) || 'G') : 'You'}
                    </div>
                    {micOn && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 md:w-20 md:h-20 rounded-full border-2 border-indigo-500/30 animate-ping"></div>
                       </div>
                    )}
                 </div>
              )}
              
              <div className="absolute bottom-1 left-1 md:bottom-3 md:left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 md:px-3 md:py-1 rounded md:rounded-lg text-[8px] md:text-xs font-bold flex items-center gap-1 md:gap-2">
                 {t('meeting.you')} {!micOn && <MicOff size={8} className="text-red-400 md:w-3 md:h-3" />}
              </div>
           </div>

        </div>

        {/* SIDE PANEL */}
        {activeSidePanel !== 'none' && (
           <div className="absolute inset-0 z-50 md:static md:w-[400px] bg-[#181a1f] border-l border-white/5 flex flex-col shadow-2xl animate-[slideLeft_0.3s_ease-out]">
              <div className="h-16 flex items-center justify-between px-6 border-b border-white/5">
                 <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-slate-300">
                    {activeSidePanel === 'chat' ? <MessageSquare size={16} className="text-indigo-400" /> : <PenTool size={16} className="text-indigo-400" />}
                    {activeSidePanel === 'chat' ? t('meeting.chat') : t('meeting.whiteboard')}
                 </h3>
                 <button onClick={() => setActiveSidePanel('none')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400">
                    <X size={18} />
                 </button>
              </div>

              <div className="flex-1 overflow-hidden relative flex flex-col bg-[#0f1115]/50">
                 {activeSidePanel === 'chat' ? (
                    <>
                       <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                          {messages.map((msg, i) => (
                             <div key={i} className={`flex flex-col ${msg.sender === (isGuest ? guestName || 'Convidado' : 'Você') ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.sender === (isGuest ? guestName || 'Convidado' : 'Você') ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#252830] text-slate-200 rounded-tl-none border border-white/5'}`}>
                                   {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.time}</span>
                             </div>
                          ))}
                       </div>
                       <div className="p-4 bg-[#181a1f] border-t border-white/5">
                          <form onSubmit={handleSendMessage} className="relative">
                             <input 
                                type="text" 
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                className="w-full bg-[#0f1115] border border-white/10 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-white placeholder:text-slate-600"
                             />
                             <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors text-white shadow-lg">
                                <Send size={16} />
                             </button>
                          </form>
                          {!isGuest && (
                              <div className="flex gap-4 mt-3 px-1">
                                 <button className="text-slate-400 hover:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors"><Paperclip size={14} /> Anexar</button>
                                 <button className="text-slate-400 hover:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors"><FileText size={14} /> Prontuário</button>
                              </div>
                          )}
                       </div>
                    </>
                 ) : (
                    // Whiteboard only for non-guests or specifically allowed
                    <div className="flex flex-col h-full bg-white">
                        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                            <div className="flex gap-2">
                                {['#000000', '#ef4444', '#3b82f6', '#10b981'].map(color => (
                                    <button 
                                    key={color}
                                    onClick={() => setDrawColor(color)} 
                                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${drawColor === color ? 'border-slate-400 scale-110 shadow-sm' : 'border-transparent'}`} 
                                    style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                                {!isGuest && (
                                    <button 
                                        onClick={() => setShowLinkDeviceModal(true)} 
                                        className="p-1.5 hover:bg-indigo-50 text-indigo-500 rounded" 
                                        title="Conectar Dispositivo"
                                    >
                                        <Tablet size={16} />
                                    </button>
                                )}
                                <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
                                <button onClick={clearCanvas} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title={t('meeting.clearBoard')}>
                                    <Eraser size={16} />
                                </button>
                                <button className="p-1.5 hover:bg-slate-100 rounded text-slate-600">
                                    <Download size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden cursor-crosshair relative bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                            <canvas 
                                ref={canvasRef}
                                width={400} 
                                height={800}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                className="w-full h-full"
                            />
                        </div>
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
            <button 
               onClick={toggleMic}
               className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${micOn ? 'bg-[#252830] hover:bg-[#2d313a] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
               title={micOn ? "Desativar Microfone" : "Ativar Microfone"}
            >
               {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button 
               onClick={toggleCam}
               className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${cameraOn ? 'bg-[#252830] hover:bg-[#2d313a] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
               title={cameraOn ? "Desativar Câmera" : "Ativar Câmera"}
            >
               {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

            <div className="w-px h-8 bg-white/10 mx-1 shrink-0"></div>

            {/* Hidden for Guests */}
            {!isGuest && (
                <>
                    <button 
                    onClick={() => setCaptionsOn(!captionsOn)}
                    className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${captionsOn ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
                    title="Legendas"
                    >
                    <Subtitles size={24} />
                    </button>

                    <button 
                    onClick={toggleScreenShare}
                    className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${screenShare ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
                    title="Compartilhar Tela"
                    >
                    {screenShare ? <MonitorUp size={24} /> : <ScreenShare size={24} />}
                    </button>

                    <button 
                    onClick={() => setActiveSidePanel(activeSidePanel === 'whiteboard' ? 'none' : 'whiteboard')}
                    className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${activeSidePanel === 'whiteboard' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
                    title="Lousa Interativa"
                    >
                    <PenTool size={24} />
                    </button>

                    <div className="w-px h-8 bg-white/10 mx-1 shrink-0"></div>
                </>
            )}

            <button 
               onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? 'none' : 'chat')}
               className={`w-14 h-14 shrink-0 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 relative ${activeSidePanel === 'chat' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
               title="Chat"
            >
               <MessageSquare size={24} />
               {messages.length > 1 && activeSidePanel !== 'chat' && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#252830]"></span>
               )}
            </button>

            <button 
               onClick={() => setShowEndModal(true)}
               className="w-20 h-14 shrink-0 rounded-[1.2rem] bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/40 ml-2 transition-all hover:scale-105 active:scale-95"
               title="Encerrar"
            >
               <PhoneOff size={28} />
            </button>
         </div>
      </footer>

      {/* ... (Other Modals - Settings, LinkDevice, End - kept same) ... */}
      {showSettingsModal && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
              {/* ... settings modal content ... */}
              <div className="bg-[#181a1f] border border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Settings size={20} /> Configurações
                      </h3>
                      <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <Video size={14} /> Câmera
                          </label>
                          <div className="relative">
                              <select className="w-full p-3 bg-[#252830] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none">
                                  <option>FaceTime HD Camera (Built-in)</option>
                                  <option>External Webcam</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <Mic size={14} /> Microfone
                          </label>
                          <div className="relative">
                              <select className="w-full p-3 bg-[#252830] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none">
                                  <option>MacBook Pro Microphone (Built-in)</option>
                                  <option>AirPods Pro</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          </div>
                          {/* Mic Test Visualizer */}
                          <div className="flex items-center gap-2">
                              <div className="flex-1 bg-[#252830] h-2 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 w-[60%] animate-pulse"></div>
                              </div>
                              <span className="text-xs text-emerald-400 font-bold">Bom</span>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                              <Volume2 size={14} /> Saída de Áudio
                          </label>
                          <div className="relative">
                              <select className="w-full p-3 bg-[#252830] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 appearance-none">
                                  <option>MacBook Pro Speakers</option>
                                  <option>AirPods Pro</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                          </div>
                          <button className="text-xs text-indigo-400 font-bold hover:underline">Testar Som</button>
                      </div>
                  </div>

                  <div className="p-6 border-t border-white/10 flex justify-end">
                      <button 
                          onClick={() => setShowSettingsModal(false)}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
                      >
                          Concluído
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showLinkDeviceModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            {/* ... link device modal content ... */}
            <div className="bg-[#181a1f] border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center shadow-2xl animate-[slideUpFade_0.3s_ease-out]">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <Tablet size={20} className="text-indigo-400" />
                       Vincular Dispositivo
                   </h3>
                   <button onClick={() => setShowLinkDeviceModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
               </div>
               
               <div className="bg-white p-6 rounded-xl mb-6 flex flex-col items-center">
                   <QrCode size={160} className="text-slate-900" />
                   <p className="text-slate-500 text-xs mt-2 font-mono">Scan to join as companion</p>
               </div>

               <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                   Abra a câmera do seu tablet ou celular e escaneie o código para usar como 
                   <span className="text-indigo-400 font-bold"> Lousa Interativa</span>.
               </p>

               <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl border border-white/10 text-xs text-slate-300 font-mono mb-6 break-all">
                   <span className="truncate">{getCompanionUrl()}</span>
                   <button className="p-2 hover:bg-white/10 rounded-lg shrink-0" title="Copiar"><Share2 size={14} /></button>
               </div>

               <button 
                  onClick={() => setShowLinkDeviceModal(false)}
                  className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-50 shadow-lg shadow-indigo-900/30 transition-colors"
               >
                  Concluído
               </button>
            </div>
         </div>
      )}

      {showEndModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
            {/* ... end modal content ... */}
            <div className="bg-[#181a1f] border border-white/10 p-8 rounded-[2rem] max-w-sm w-full text-center shadow-2xl animate-[slideUpFade_0.3s_ease-out]">
               <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                  <PhoneOff size={36} />
               </div>
               <h3 className="text-2xl font-bold text-white mb-2">Encerrar Sessão?</h3>
               <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                  Isso desconectará você e o paciente da sala virtual. Certifique-se de que o prontuário foi salvo.
               </p>
               <div className="flex gap-3">
                  <button 
                     onClick={() => setShowEndModal(false)}
                     className="flex-1 py-3.5 rounded-xl font-bold text-slate-300 hover:bg-white/10 transition-colors"
                  >
                     Cancelar
                  </button>
                  <button 
                     onClick={() => { cleanupMedia(); navigate(isGuest ? '/' : '/virtual-rooms'); }}
                     className="flex-1 py-3.5 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-900/30 transition-colors"
                  >
                     Encerrar
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};
