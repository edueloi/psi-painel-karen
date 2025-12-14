
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, 
  MessageSquare, PenTool, X, Send, Paperclip, 
  Eraser, Download, Clock, User, Subtitles, MonitorUp, 
  Layout, Mic as MicIcon, FileText, Smartphone, QrCode, Share2, Tablet, Settings
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MOCK_APPOINTMENTS } from '../constants';

export const MeetingRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // --- Mode Check ---
  const isCompanionMode = searchParams.get('companion') === 'true';

  // --- States ---
  const [hasJoined, setHasJoined] = useState(isCompanionMode); // Auto-join if companion
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [activeSidePanel, setActiveSidePanel] = useState<'chat' | 'whiteboard' | 'none'>(
    isCompanionMode ? 'whiteboard' : 'none'
  );
  const [messages, setMessages] = useState<{sender: string, text: string, time: string}[]>([
    { sender: 'System', text: 'Sala segura criada (Criptografia ponta-a-ponta).', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showLinkDeviceModal, setShowLinkDeviceModal] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); 

  // Captions
  const [captionsOn, setCaptionsOn] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // --- Refs ---
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  
  // Audio Analysis
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#000000');

  const appointment = MOCK_APPOINTMENTS.find(a => a.id === id);

  // --- Initialize Media ---
  useEffect(() => {
    // If companion mode, we don't need camera/mic initially, just the whiteboard functionality
    if (isCompanionMode) return;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        localStreamRef.current = stream;
        
        // Attach to lobby video if not joined yet
        if (!hasJoined && lobbyVideoRef.current) {
            lobbyVideoRef.current.srcObject = stream;
        } 
        // Attach to main video if already joined (should be handled by toggle effect, but safe to keep)
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

  useEffect(() => {
    if (screenShare && screenShareRef.current && screenStreamRef.current) {
      screenShareRef.current.srcObject = screenStreamRef.current;
    }
  }, [screenShare]);

  useEffect(() => {
    if (hasJoined && !isCompanionMode) {
        const timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
        return () => clearInterval(timer);
    }
  }, [hasJoined, isCompanionMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Whiteboard & Touch Support ---
  const getTouchPos = (canvasDom: HTMLCanvasElement, touchEvent: React.TouchEvent) => {
    const rect = canvasDom.getBoundingClientRect();
    return {
      x: touchEvent.touches[0].clientX - rect.left,
      y: touchEvent.touches[0].clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    
    let x, y;
    if ('touches' in e) {
        const pos = getTouchPos(canvas, e);
        x = pos.x;
        y = pos.y;
    } else {
        const rect = canvas.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Prevent scrolling when drawing on touch devices
    if ('touches' in e) {
        // e.preventDefault(); // Note: Passive event listeners might block this in React 18, managed via style touch-action: none
    }

    let x, y;
    if ('touches' in e) {
        const pos = getTouchPos(canvas, e);
        x = pos.x;
        y = pos.y;
    } else {
        const rect = canvas.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawColor;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([...messages, { sender: 'Você', text: newMessage, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }]);
    setNewMessage('');
  };

  const getCompanionUrl = () => {
      const url = new URL(window.location.href);
      url.searchParams.set('companion', 'true');
      return url.toString();
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
                  <button onClick={() => {const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0, canvasRef.current?.width || 0, canvasRef.current?.height || 0)}} className="p-2 hover:bg-white/10 rounded-full">
                      <Eraser size={20} />
                  </button>
              </div>
              <div className="flex-1 relative overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
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
                  <canvas 
                      ref={canvasRef}
                      width={window.innerWidth} 
                      height={window.innerHeight - 56}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={() => setIsDrawing(false)}
                      onMouseLeave={() => setIsDrawing(false)}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={() => setIsDrawing(false)}
                      className="touch-none block cursor-crosshair"
                  />
              </div>
          </div>
      );
  }

  // --- RENDER: LOBBY (PRE-FLIGHT) ---
  if (!hasJoined) {
      return (
          <div className="fixed inset-0 bg-[#0f1115] text-white flex items-center justify-center font-sans p-4">
              <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="flex flex-col items-center">
                      <h1 className="text-3xl font-display font-bold mb-2">Preparar para entrar</h1>
                      <p className="text-slate-400 mb-8 text-center">{appointment?.title || 'Consulta'} - {appointment?.patientName}</p>
                      
                      <div className="relative w-full max-w-lg aspect-video bg-[#1e2025] rounded-2xl overflow-hidden border border-white/10 shadow-2xl mb-6 group">
                          {cameraOn ? (
                              <video ref={lobbyVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                          ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                                      <VideoOff size={32} />
                                  </div>
                              </div>
                          )}
                          
                          {/* Audio Visualizer Overlay */}
                          <div className="absolute bottom-4 left-4 flex gap-1 h-4 items-end">
                              {[1,2,3].map(i => (
                                  <div key={i} className={`w-1.5 rounded-full transition-all duration-75 ${micOn ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ height: micOn ? `${Math.max(20, audioLevel * (i * 0.5))}%` : '4px' }}></div>
                              ))}
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <button 
                              onClick={toggleMic}
                              className={`p-4 rounded-full transition-all ${micOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}
                          >
                              {micOn ? <Mic size={24} /> : <MicOff size={24} />}
                          </button>
                          <button 
                              onClick={toggleCam}
                              className={`p-4 rounded-full transition-all ${cameraOn ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-500/20 text-red-500 border border-red-500/50'}`}
                          >
                              {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
                          </button>
                      </div>
                  </div>

                  <div className="flex flex-col justify-center items-center lg:items-start">
                      <h2 className="text-xl font-bold mb-6">Configurações da Sala</h2>
                      
                      <div className="w-full space-y-4 mb-8">
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                  <Mic size={20} className="text-indigo-400" />
                                  <div className="text-sm">
                                      <p className="font-bold">Microfone Padrão</p>
                                      <p className="text-slate-400 text-xs">Default Audio Input</p>
                                  </div>
                              </div>
                              <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">Ativo</span>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                              <div className="flex items-center gap-3">
                                  <Video size={20} className="text-indigo-400" />
                                  <div className="text-sm">
                                      <p className="font-bold">Câmera Principal</p>
                                      <p className="text-slate-400 text-xs">FaceTime HD Camera</p>
                                  </div>
                              </div>
                              <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">Ativo</span>
                          </div>
                      </div>

                      <button 
                          onClick={() => setHasJoined(true)}
                          className="w-full lg:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-95"
                      >
                          Entrar na Sala Agora
                      </button>
                      <button onClick={() => navigate('/agenda')} className="mt-4 text-slate-500 hover:text-slate-300 text-sm">
                          Voltar para Agenda
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- RENDER: MAIN MEETING ROOM ---
  return (
    <div className="fixed inset-0 bg-[#0f1115] text-white overflow-hidden font-sans flex flex-col">
      
      {/* --- HEADER --- */}
      <header className="h-16 px-6 flex items-center justify-between bg-[#0f1115]/90 backdrop-blur-md z-50 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
             <Clock size={16} className="text-emerald-400" />
             <span className="font-mono font-bold text-sm tracking-wide">{formatTime(elapsedTime)}</span>
          </div>
          <div className="h-6 w-px bg-white/10"></div>
          <div>
             <h1 className="font-bold text-lg leading-none">{appointment?.patientName || t('meeting.patient')}</h1>
             <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Em atendimento
             </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
                onClick={() => setShowLinkDeviceModal(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded-lg text-xs font-bold transition-all border border-indigo-500/30"
           >
               <Tablet size={14} /> Lousa no Tablet
           </button>
           <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white" title="Configurações">
              <Settings size={20} />
           </button>
           <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white" title="Layout">
              <Layout size={20} />
           </button>
        </div>
      </header>

      {/* --- MAIN STAGE --- */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* CENTER CONTENT */}
        <div className="flex-1 relative flex items-center justify-center p-4">
           
           {/* Remote Participant Area (Or Screen Share) */}
           <div className="w-full h-full max-w-6xl max-h-[85vh] relative flex items-center justify-center">
              
              {screenShare ? (
                 <video ref={screenShareRef} autoPlay muted playsInline className="w-full h-full object-contain rounded-2xl shadow-2xl bg-black" />
              ) : (
                 <div className="relative w-full h-full bg-[#181a1f] rounded-[32px] border border-white/5 flex flex-col items-center justify-center shadow-2xl overflow-hidden group">
                    {/* Placeholder for Patient Video */}
                    <div className="relative z-10 flex flex-col items-center">
                       <div className="w-48 h-48 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(0,0,0,0.3)] border-4 border-white/5 relative">
                          <User size={80} className="text-slate-400" />
                          <div className="absolute bottom-3 right-3 p-3 bg-emerald-500 rounded-full border-4 border-[#181a1f] shadow-lg">
                             <MicIcon size={20} className="text-white" />
                          </div>
                       </div>
                       <h2 className="text-3xl font-display font-bold text-slate-200">{t('meeting.waiting')}</h2>
                       <p className="text-slate-500 mt-2 text-lg">O paciente entrará em breve...</p>
                    </div>

                    {/* Ambient Animation */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/5 via-transparent to-transparent opacity-50"></div>
                 </div>
              )}

              {/* Captions Overlay */}
              {captionsOn && (
                 <div className="absolute bottom-10 left-0 right-0 flex justify-center z-20 pointer-events-none">
                    <div className="bg-black/70 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-lg font-medium text-center max-w-2xl shadow-xl">
                       {transcript || <span className="text-slate-400 italic text-base flex items-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce"></div> {t('meeting.listening')}</span>}
                    </div>
                 </div>
              )}
           </div>

           {/* PIP (Local User) */}
           <div className="absolute bottom-8 right-8 w-72 aspect-video bg-[#1e2025] rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-30 group cursor-move hover:scale-105 transition-all duration-300">
              {cameraOn ? (
                 <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
              ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 relative">
                    <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-bold shadow-lg">You</div>
                    {/* Audio Pulse Visualizer when cam is off but mic is on */}
                    {micOn && (
                       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-20 h-20 rounded-full border-2 border-indigo-500/30 animate-ping"></div>
                       </div>
                    )}
                 </div>
              )}
              
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-2">
                 {t('meeting.you')} {!micOn && <MicOff size={10} className="text-red-400" />}
              </div>

              {/* Audio Bar Visualizer (Mini) */}
              {micOn && (
                 <div className="absolute top-3 right-3 flex gap-0.5 h-3 items-end">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-1 bg-emerald-500 rounded-full transition-all duration-75" style={{ height: `${Math.max(20, audioLevel * (i * 0.8))}%` }}></div>
                    ))}
                 </div>
              )}
           </div>

        </div>

        {/* SIDE PANEL */}
        {activeSidePanel !== 'none' && (
           <div className="w-[400px] bg-[#181a1f] border-l border-white/5 flex flex-col shadow-2xl relative z-40 animate-[slideLeft_0.3s_ease-out]">
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
                             <div key={i} className={`flex flex-col ${msg.sender === 'Você' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.sender === 'Você' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-[#252830] text-slate-200 rounded-tl-none border border-white/5'}`}>
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
                          <div className="flex gap-4 mt-3 px-1">
                             <button className="text-slate-400 hover:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors"><Paperclip size={14} /> Anexar</button>
                             <button className="text-slate-400 hover:text-indigo-400 text-xs font-bold flex items-center gap-1.5 transition-colors"><FileText size={14} /> Prontuário</button>
                          </div>
                       </div>
                    </>
                 ) : (
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
                            <div className="flex gap-1 bg-white rounded-lg border border-slate-200 p-0.5">
                                <button onClick={() => {const ctx = canvasRef.current?.getContext('2d'); ctx?.clearRect(0,0,400,600)}} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title={t('meeting.clearBoard')}>
                                    <Eraser size={16} />
                                </button>
                                <div className="w-px h-full bg-slate-200 mx-0.5"></div>
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
                                onMouseUp={() => setIsDrawing(false)}
                                onMouseLeave={() => setIsDrawing(false)}
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
      <footer className="h-24 flex items-center justify-center gap-4 relative z-50 pointer-events-none">
         <div className="pointer-events-auto bg-[#181a1f]/90 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl flex items-center gap-2 mb-6 transform hover:scale-[1.02] transition-transform duration-300">
            
            <button 
               onClick={toggleMic}
               className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${micOn ? 'bg-[#252830] hover:bg-[#2d313a] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
               title={micOn ? "Desativar Microfone" : "Ativar Microfone"}
            >
               {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>

            <button 
               onClick={toggleCam}
               className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${cameraOn ? 'bg-[#252830] hover:bg-[#2d313a] text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'}`}
               title={cameraOn ? "Desativar Câmera" : "Ativar Câmera"}
            >
               {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>

            <div className="w-px h-8 bg-white/10 mx-1"></div>

            <button 
               onClick={() => setCaptionsOn(!captionsOn)}
               className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${captionsOn ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
               title="Legendas"
            >
               <Subtitles size={24} />
            </button>

            <button 
               onClick={toggleScreenShare}
               className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${screenShare ? 'bg-green-600 text-white shadow-lg shadow-green-500/30' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
               title="Compartilhar Tela"
            >
               {screenShare ? <MonitorUp size={24} /> : <ScreenShare size={24} />}
            </button>

            <button 
               onClick={() => setActiveSidePanel(activeSidePanel === 'whiteboard' ? 'none' : 'whiteboard')}
               className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 ${activeSidePanel === 'whiteboard' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
               title="Lousa Interativa"
            >
               <PenTool size={24} />
            </button>

            <div className="w-px h-8 bg-white/10 mx-1"></div>

            <button 
               onClick={() => setActiveSidePanel(activeSidePanel === 'chat' ? 'none' : 'chat')}
               className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center transition-all duration-300 relative ${activeSidePanel === 'chat' ? 'bg-indigo-600 text-white' : 'bg-[#252830] hover:bg-[#2d313a] text-slate-300'}`}
               title="Chat"
            >
               <MessageSquare size={24} />
               {messages.length > 1 && activeSidePanel !== 'chat' && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#252830]"></span>
               )}
            </button>

            <button 
               onClick={() => setShowEndModal(true)}
               className="w-20 h-14 rounded-[1.2rem] bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-900/40 ml-2 transition-all hover:scale-105 active:scale-95"
               title="Encerrar"
            >
               <PhoneOff size={28} />
            </button>
         </div>
      </footer>

      {/* --- MODAL: LINK DEVICE (COMPANION) --- */}
      {showLinkDeviceModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
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
                  className="w-full py-3.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 transition-colors"
               >
                  Concluído
               </button>
            </div>
         </div>
      )}

      {/* --- CONFIRMATION MODAL --- */}
      {showEndModal && (
         <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-out]">
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
                     onClick={() => { cleanupMedia(); navigate('/virtual-rooms'); }}
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
