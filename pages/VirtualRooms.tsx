import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Link as LinkIcon,
  Loader2,
  Mic,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { api } from '../services/api';
import { Patient, User, VirtualRoom } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { DatePicker } from '../components/UI/DatePicker';
import { PageHeader } from '../components/UI/PageHeader';
import {
  Button,
  Combobox,
  ConfirmModal,
  Input,
  Modal,
  ModalFooter,
  PageWrapper,
  Select,
  Textarea,
} from '../components/UI';

type SessionSummary = {
  id: number;
  room_id: number;
  session_key: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript_count: number;
  recording_count: number;
  room_title?: string;
  room_code?: string;
};

type TranscriptLine = {
  id: number;
  speaker_role: 'host' | 'guest' | 'system';
  speaker_name: string;
  text: string;
  created_at: string;
};

type RecordingEntry = {
  id: number;
  file_name: string;
  file_url: string;
  file_size: number;
  duration_seconds: number | null;
  speaker_role: string;
  created_at: string;
};

const normalizeGeminiAudioMimeType = (mimeType?: string) => {
  const normalized = (mimeType || '').toLowerCase();
  if (normalized.includes('webm')) return 'audio/webm';
  if (normalized.includes('ogg')) return 'audio/ogg';
  if (normalized.includes('wav')) return 'audio/wav';
  if (normalized.includes('mp4')) return 'audio/mp4';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'audio/mpeg';
  return 'audio/webm';
};

const resolveRecordingUrl = (fileUrl?: string) => {
  if (!fileUrl) return '';
  const normalizedPath = fileUrl.startsWith('/uploads/')
    ? fileUrl.replace('/uploads/', '/uploads-static/')
    : fileUrl;
  return `${API_BASE_URL.replace('/api', '')}${normalizedPath}`;
};

export const VirtualRooms: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const { preferences, updatePreference } = useUserPreferences();

  const [rooms, setRooms] = useState<VirtualRoom[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [meetingCode, setMeetingCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<VirtualRoom | null>(null);
  const [isCreatingInstant, setIsCreatingInstant] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<VirtualRoom | null>(null);

  // Transcrições tab
  const [activeTab, setActiveTab] = useState<'rooms' | 'transcricoes'>('rooms');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionTranscripts, setSessionTranscripts] = useState<Record<string, TranscriptLine[]>>({});
  const [sessionRecordings, setSessionRecordings] = useState<Record<string, RecordingEntry[]>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // Filtros do histórico
  const [sessionSearch, setSessionSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterHasRecording, setFilterHasRecording] = useState<boolean | null>(null);
  const [filterHasTranscript, setFilterHasTranscript] = useState<boolean | null>(null);

  // Gemini API keys management
  const geminiKeys: string[] = preferences.gemini?.apiKeys?.length
    ? preferences.gemini.apiKeys
    : preferences.gemini?.apiKey ? [preferences.gemini.apiKey] : [];
  const [newKeyInput, setNewKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  const addGeminiKey = () => {
    const k = newKeyInput.trim();
    if (!k) return;
    const updated = [...geminiKeys.filter(x => x !== k), k];
    updatePreference('gemini', { apiKeys: updated, apiKey: updated[0] });
    setNewKeyInput('');
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const removeGeminiKey = (key: string) => {
    const updated = geminiKeys.filter(x => x !== key);
    updatePreference('gemini', { apiKeys: updated, apiKey: updated[0] ?? '' });
  };

  const moveKeyUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...geminiKeys];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    updatePreference('gemini', { apiKeys: updated, apiKey: updated[0] });
  };

  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    scheduled_start: '',
    scheduled_end: '',
    patient_id: '',
    professional_id: '',
    appointment_id: '',
    provider: 'jitsi',
    link: '',
    expiration_date: '',
  });

  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      const [data, pts, pros] = await Promise.all([
        api.get<VirtualRoom[]>('/virtual-rooms'),
        api.get<Patient[]>('/patients'),
        api.get<User[]>('/users'),
      ]);
      setRooms(data);
      setPatients(pts || []);
      setProfessionals((pros || []).filter((professional) => professional.role !== 'secretario'));
    } catch (error) {
      console.error('Erro ao buscar salas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const data = await api.get<SessionSummary[]>('/virtual-rooms/history');
      setSessions(data || []);
    } catch {
      // ignore
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transcricoes') fetchSessions();
  }, [activeTab]);

  const toggleSession = async (session: SessionSummary) => {
    const key = session.session_key;
    if (expandedSession === key) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(key);
    if (sessionTranscripts[key] !== undefined) return;
    setLoadingDetail(key);
    try {
      const [transcripts, recordings] = await Promise.all([
        api.get<TranscriptLine[]>(`/virtual-rooms/${session.room_id}/sessions/${key}/transcript`),
        api.get<RecordingEntry[]>(`/virtual-rooms/${session.room_id}/sessions/${key}/recordings`),
      ]);
      setSessionTranscripts((prev) => ({ ...prev, [key]: transcripts || [] }));
      setSessionRecordings((prev) => ({ ...prev, [key]: recordings || [] }));
    } catch {
      setSessionTranscripts((prev) => ({ ...prev, [key]: [] }));
      setSessionRecordings((prev) => ({ ...prev, [key]: [] }));
    } finally {
      setLoadingDetail(null);
    }
  };

  const downloadTranscript = (session: SessionSummary) => {
    const token = localStorage.getItem('psi_token');
    window.open(
      `${API_BASE_URL}/virtual-rooms/${session.room_id}/sessions/${session.session_key}/transcript/download?token=${token}`,
      '_blank'
    );
  };

  const [transcribingRecording, setTranscribingRecording] = useState<number | null>(null);
  const [deletingRecording, setDeletingRecording] = useState<number | null>(null);
  const [deletingTranscript, setDeletingTranscript] = useState<string | null>(null);

  // Confirm modal state
  type ConfirmAction = { type: 'recording'; rec: RecordingEntry; session: SessionSummary } | { type: 'transcript'; session: SessionSummary } | null;
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const executeDeleteRecording = async (rec: RecordingEntry, session: SessionSummary) => {
    setDeletingRecording(rec.id);
    try {
      await api.delete(`/virtual-rooms/${session.room_id}/sessions/${session.session_key}/recordings/${rec.id}`);
      setSessionRecordings((prev) => ({
        ...prev,
        [session.session_key]: (prev[session.session_key] || []).filter((r) => r.id !== rec.id),
      }));
      setSessions((prev) =>
        prev.map((s) =>
          s.session_key === session.session_key
            ? { ...s, recording_count: Math.max(0, s.recording_count - 1) }
            : s
        )
      );
      toastSuccess('Gravação deletada', 'O arquivo de áudio foi removido.');
    } catch {
      toastError('Erro', 'Não foi possível deletar a gravação.');
    } finally {
      setDeletingRecording(null);
    }
  };

  const executeDeleteTranscript = async (session: SessionSummary) => {
    setDeletingTranscript(session.session_key);
    try {
      await api.delete(`/virtual-rooms/${session.room_id}/sessions/${session.session_key}/transcript`);
      setSessionTranscripts((prev) => ({ ...prev, [session.session_key]: [] }));
      setSessions((prev) =>
        prev.map((s) =>
          s.session_key === session.session_key ? { ...s, transcript_count: 0 } : s
        )
      );
      toastSuccess('Transcrição deletada', 'Todas as linhas foram removidas.');
    } catch {
      toastError('Erro', 'Não foi possível deletar a transcrição.');
    } finally {
      setDeletingTranscript(null);
    }
  };

  const deleteRecording = (rec: RecordingEntry, session: SessionSummary) => {
    setConfirmAction({ type: 'recording', rec, session });
  };

  const deleteTranscript = (session: SessionSummary) => {
    setConfirmAction({ type: 'transcript', session });
  };

  const deleteSession = (session: SessionSummary) => {
    setConfirmAction({ type: 'session', session } as any);
  };

  const executeDeleteSession = async (session: SessionSummary) => {
    try {
      await api.delete(`/virtual-rooms/${session.room_id}/sessions/${session.session_key}`);
      setSessions((prev) => prev.filter((s) => s.session_key !== session.session_key));
      setSessionTranscripts((prev) => { const n = { ...prev }; delete n[session.session_key]; return n; });
      setSessionRecordings((prev) => { const n = { ...prev }; delete n[session.session_key]; return n; });
      if (expandedSession === session.session_key) setExpandedSession(null);
      toastSuccess('Sessão deletada', 'Sessão, transcrições e gravações removidas.');
    } catch {
      toastError('Erro', 'Não foi possível deletar a sessão.');
    }
  };

  // Filtro aplicado sobre sessions
  const filteredSessions = sessions.filter((s) => {
    if (sessionSearch.trim()) {
      const q = sessionSearch.trim().toLowerCase();
      const inTitle = (s.room_title || '').toLowerCase().includes(q);
      const inCode = (s.room_code || '').toLowerCase().includes(q);
      const inKey = s.session_key.toLowerCase().includes(q);
      if (!inTitle && !inCode && !inKey) return false;
    }
    if (filterDateFrom) {
      if (new Date(s.started_at) < new Date(filterDateFrom)) return false;
    }
    if (filterDateTo) {
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (new Date(s.started_at) > to) return false;
    }
    if (filterHasRecording === true && s.recording_count === 0) return false;
    if (filterHasRecording === false && s.recording_count > 0) return false;
    if (filterHasTranscript === true && s.transcript_count === 0) return false;
    if (filterHasTranscript === false && s.transcript_count > 0) return false;
    return true;
  });

  const hasActiveFilters = sessionSearch.trim() || filterDateFrom || filterDateTo || filterHasRecording !== null || filterHasTranscript !== null;

  const clearFilters = () => {
    setSessionSearch('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterHasRecording(null);
    setFilterHasTranscript(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmAction) return;
    const action = confirmAction as any;
    if (action.type === 'recording') {
      await executeDeleteRecording(action.rec, action.session);
    } else if (action.type === 'transcript') {
      await executeDeleteTranscript(action.session);
    } else if (action.type === 'session') {
      await executeDeleteSession(action.session);
    }
    setConfirmAction(null);
  };

  const transcribeRecording = async (rec: RecordingEntry, session: SessionSummary) => {
    if (!geminiKeys.length) {
      toastError('Chave Gemini necessária', 'Configure uma chave Gemini em "Chaves Gemini para Transcrição" primeiro.');
      return;
    }
    setTranscribingRecording(rec.id);
    try {
      // Baixa o arquivo de áudio como blob
      const audioUrl = resolveRecordingUrl(rec.file_url);
      const resp = await fetch(audioUrl);
      if (!resp.ok) throw new Error('Falha ao baixar áudio');
      const blob = await resp.blob();
      const mimeType = normalizeGeminiAudioMimeType(blob.type);

      // Converte para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Tenta cada chave + cada modelo em sequência (fallback automático em caso de 429)
      const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash', 'gemini-2.5-pro'];
      let transcribed = '';
      outer: for (const key of geminiKeys) {
        for (const model of GEMINI_MODELS) {
          try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent({
              model,
              contents: [{
                parts: [
                  { inlineData: { mimeType, data: base64 } },
                  { text: 'Transcreva este áudio em português brasileiro. Identifique os falantes quando possível (Profissional e Paciente). Retorne apenas o texto transcrito com os falantes, sem explicações adicionais.' },
                ],
              }],
            });
            const t = response.text?.trim() || '';
            if (t) { transcribed = t; break outer; }
          } catch (err: any) {
            // Se não for 429/quota, não tenta próximo modelo
            const is429 = err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED');
            if (!is429) break;
          }
        }
      }

      if (!transcribed) {
        toastError('Falha na transcrição', 'Gemini não conseguiu transcrever o áudio. Tente novamente.');
        return;
      }

      // Salva a transcrição no banco via POST /transcripts
      await api.post(`/virtual-rooms/${session.room_id}/transcripts`, {
        speaker_name: 'Transcrição do Áudio',
        speaker_role: 'system',
        session_key: session.session_key,
        text: transcribed,
      });

      // Recarrega transcrições da sessão
      const updated = await api.get<TranscriptLine[]>(
        `/virtual-rooms/${session.room_id}/sessions/${session.session_key}/transcript`
      );
      setSessionTranscripts((prev) => ({ ...prev, [session.session_key]: updated || [] }));
      toastSuccess('Transcrição concluída', 'Áudio transcrito com sucesso!');
    } catch (e) {
      toastError('Erro', 'Erro ao transcrever o áudio.');
    } finally {
      setTranscribingRecording(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  const matchesQuery = (room: VirtualRoom) => {
    const query = roomSearch.trim().toLowerCase();
    if (!query) return true;
    const title = (room.title || '').toLowerCase();
    const description = (room.description || '').toLowerCase();
    const code = (room.code || '').toLowerCase();
    return title.includes(query) || description.includes(query) || code.includes(query);
  };

  const upcomingRooms = useMemo(() => {
    const now = new Date();
    return rooms
      .filter((room) => room.scheduled_start && new Date(room.scheduled_start) >= now)
      .filter(matchesQuery)
      .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime());
  }, [rooms, roomSearch]);

  const persistentRooms = useMemo(
    () => rooms.filter((room) => !room.scheduled_start).filter(matchesQuery),
    [rooms, roomSearch]
  );

  const roomStats = useMemo(
    () => ({
      total: rooms.length,
      upcoming: upcomingRooms.length,
      persistent: persistentRooms.length,
    }),
    [rooms, upcomingRooms, persistentRooms]
  );

  const generateCode = () => Math.random().toString(36).substr(2, 9);

  const resetCreateForm = (preset?: { title?: string; description?: string }) => {
    setCreatedRoom(null);
    setCreateForm({
      title: preset?.title || '',
      description: preset?.description || '',
      scheduled_start: '',
      scheduled_end: '',
      patient_id: '',
      professional_id: '',
      appointment_id: '',
      provider: 'jitsi',
      link: '',
      expiration_date: '',
    });
  };

  const openCreateModal = (preset?: { title?: string; description?: string }) => {
    resetCreateForm(preset);
    setIsCreateModalOpen(true);
  };

  const handleInstantMeeting = async () => {
    setIsCreatingInstant(true);
    try {
      const code = generateCode();
      const title = `Sessão - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const room = await api.post<any>('/virtual-rooms', {
        title,
        description: 'Sessão iniciada via acesso rápido.',
        code,
        provider: 'interno',
      });
      const roomCode = room.code || room.hash || code;
      window.open(`/sala/${roomCode}`, '_blank');
    } catch (error: any) {
      toastError('Erro ao criar sala', error.message || '');
    } finally {
      setIsCreatingInstant(false);
    }
  };

  const handleCreateRoom = async () => {
    setIsSavingRoom(true);
    const code = generateCode();
    try {
      const response = await api.post<{ message: string; id: number }>('/virtual-rooms', {
        code,
        title: createForm.title || null,
        description: createForm.description || null,
        scheduled_start: createForm.scheduled_start || null,
        scheduled_end: createForm.scheduled_end || null,
        patient_id: createForm.patient_id || null,
        professional_id: createForm.professional_id || null,
        appointment_id: createForm.appointment_id || null,
        provider: createForm.provider || null,
        link: createForm.link || null,
        expiration_date: createForm.expiration_date || null,
      });

      const room: VirtualRoom = {
        id: response.id,
        tenant_id: 0,
        creator_user_id: 0,
        code,
        title: createForm.title || undefined,
        description: createForm.description || undefined,
        scheduled_start: createForm.scheduled_start || undefined,
        scheduled_end: createForm.scheduled_end || undefined,
        patient_id: createForm.patient_id ? Number(createForm.patient_id) : undefined,
        professional_id: createForm.professional_id ? Number(createForm.professional_id) : undefined,
        appointment_id: createForm.appointment_id ? Number(createForm.appointment_id) : undefined,
        provider: (createForm.provider || 'jitsi') as VirtualRoom['provider'],
        link: createForm.link || undefined,
        expiration_date: createForm.expiration_date || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCreatedRoom(room);
      setRooms((prev) => [room, ...prev]);
      toastSuccess('Sala criada', 'Sala criada com sucesso.');
    } catch (error: any) {
      toastError('Erro ao criar sala', error.message || '');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleJoinByCode = (event: React.FormEvent) => {
    event.preventDefault();
    if (meetingCode.trim()) {
      window.open(`/sala/${meetingCode.trim()}`, '_blank');
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      await api.delete(`/virtual-rooms/${roomToDelete.id}`);
      setRooms((prev) => prev.filter((room) => room.id !== roomToDelete.id));
      setRoomToDelete(null);
      toastSuccess('Sala removida', 'Sala removida com sucesso.');
    } catch {
      toastError('Erro', t('rooms.errorDelete'));
    }
  };

  const handleCopyLink = (room: VirtualRoom) => {
    const url = `${window.location.origin}/sala/${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsAppShare = (room: VirtualRoom) => {
    const shareUrl = `${window.location.origin}/api/virtual-rooms/public/${room.code}/preview`;
    const company = user?.companyName || user?.name || 'seu profissional';
    const message = `*Prepare-se, sua sessão já vai começar com ${company}!* 🌿\n\nPara um melhor aproveitamento da sua consulta:\n📍 Procure um local calmo, iluminado e privado.\n🎧 Use fones de ouvido para sua privacidade e melhor som.\n🛜 Verifique se sua conexão de internet está estável.\n\nAcesse sua sala virtual pelo link abaixo:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <PageWrapper className="space-y-4 sm:space-y-6 font-sans">
      <PageHeader
        icon={<Video />}
        title={t('rooms.title')}
        subtitle={t('rooms.subtitle')}
        showBackButton
        onBackClick={() => navigate('/')}
        containerClassName="mb-0"
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleInstantMeeting}
              loading={isCreatingInstant}
              iconLeft={<Play size={18} fill="currentColor" />}
              className="px-6 shadow-lg shadow-indigo-600/20"
            >
              Sala Instantânea
            </Button>
            <Button
              onClick={() => openCreateModal()}
              variant="soft"
              iconLeft={<Plus size={16} />}
              className="px-6"
            >
              Agendar Sala
            </Button>
          </div>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('rooms.stats.active')}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{roomStats.total}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('rooms.stats.upcoming')}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{roomStats.upcoming}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('rooms.stats.persistent')}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{roomStats.persistent}</div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1 w-fit">
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === 'rooms'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Video size={15} /> Salas
          </button>
          <button
            onClick={() => setActiveTab('transcricoes')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              activeTab === 'transcricoes'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText size={15} /> Transcrições
          </button>
        </div>

        {activeTab === 'transcricoes' && (
          <div className="space-y-4">

          {/* Gemini API Keys config */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-100 via-white to-indigo-100 p-px shadow-sm">
            <div className="rounded-[22px] border border-slate-100 bg-white px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <Mic size={18} className="text-violet-600" />
                <h3 className="font-bold text-slate-800 text-base">Chaves Gemini para Transcrição</h3>
                <span className="ml-auto text-[11px] text-slate-400">Fallback automático — usa a próxima se uma falhar</span>
              </div>

              {/* Key list */}
              {geminiKeys.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {geminiKeys.map((key, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${idx === 0 ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-mono text-xs text-slate-600 truncate">
                        {key.slice(0, 8)}{'•'.repeat(20)}{key.slice(-4)}
                      </span>
                      {idx === 0 && (
                        <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">Principal</span>
                      )}
                      {idx > 0 && (
                        <button onClick={() => moveKeyUp(idx)} title="Mover para cima" className="shrink-0 rounded-lg border border-slate-200 p-1 text-slate-400 hover:text-indigo-600 transition-colors">
                          <ChevronDown size={12} className="rotate-180" />
                        </button>
                      )}
                      <button onClick={() => removeGeminiKey(key)} title="Remover" className="shrink-0 rounded-lg border border-red-100 p-1 text-red-400 hover:bg-red-50 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mb-4 text-sm text-slate-400">Nenhuma chave configurada. Adicione ao menos uma para ativar a transcrição com Gemini.</p>
              )}

              {/* Add new key */}
              <div className="flex gap-2">
                <input
                  type="password"
                  value={newKeyInput}
                  onChange={e => setNewKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addGeminiKey()}
                  placeholder="AIza... — cole sua chave do Google AI Studio"
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20"
                />
                <button
                  onClick={addGeminiKey}
                  disabled={!newKeyInput.trim()}
                  className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  {keySaved ? <><Check size={14} /> Salvo!</> : <><Plus size={14} /> Adicionar</>}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Obtenha chaves gratuitas em <span className="font-mono text-violet-600">aistudio.google.com/apikey</span>
              </p>
            </div>
          </div>

          {/* Histórico */}
          <div className="rounded-3xl bg-gradient-to-br from-indigo-200 via-white to-slate-200 p-px shadow-lg">
            <div className="rounded-[22px] border border-slate-100 bg-white">
              {/* Header */}
              <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                    <FileText size={20} className="text-indigo-600" /> Histórico de Transcrições
                  </h3>
                  <button
                    onClick={fetchSessions}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                    Atualizar
                  </button>
                </div>

                {/* Filtros */}
                <div className="flex flex-wrap gap-2">
                  {/* Busca */}
                  <div className="relative flex-1 min-w-[160px]">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={sessionSearch}
                      onChange={e => setSessionSearch(e.target.value)}
                      placeholder="Buscar sala ou sessão..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                    />
                  </div>
                  {/* Data início */}
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={e => setFilterDateFrom(e.target.value)}
                    title="De"
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  {/* Data fim */}
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={e => setFilterDateTo(e.target.value)}
                    title="Até"
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20"
                  />
                  {/* Filtro áudio */}
                  <button
                    onClick={() => setFilterHasRecording(v => v === true ? null : true)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${filterHasRecording === true ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:text-emerald-600'}`}
                  >
                    Com áudio
                  </button>
                  {/* Filtro transcrição */}
                  <button
                    onClick={() => setFilterHasTranscript(v => v === true ? null : true)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-colors ${filterHasTranscript === true ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:text-indigo-600'}`}
                  >
                    Com transcrição
                  </button>
                  {/* Limpar filtros */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="rounded-xl border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <X size={11} /> Limpar
                    </button>
                  )}
                </div>

                {/* Contagem */}
                {!sessionsLoading && sessions.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    {filteredSessions.length} de {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''}
                  </p>
                )}
              </div>

              {sessionsLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="animate-spin text-slate-300" size={32} />
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <FileText size={40} className="mb-4 opacity-20" />
                  <p className="font-medium">{sessions.length === 0 ? 'Nenhuma sessão registrada ainda.' : 'Nenhuma sessão encontrada.'}</p>
                  <p className="mt-1 text-sm">{sessions.length === 0 ? 'As transcrições aparecem aqui após encerrar uma sessão.' : 'Tente ajustar os filtros.'}</p>
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="mt-3 text-xs text-indigo-600 hover:underline">Limpar filtros</button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSessions.map((session) => {
                    const isOpen = expandedSession === session.session_key;
                    const transcripts = sessionTranscripts[session.session_key];
                    const recordings = sessionRecordings[session.session_key];
                    const isLoadingThis = loadingDetail === session.session_key;
                    return (
                      <div key={session.session_key}>
                        <div className="w-full flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50 transition-colors">
                          <button
                            onClick={() => toggleSession(session)}
                            className="flex-1 flex items-center gap-4 min-w-0 text-left"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <Mic size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800 text-sm">
                                {session.room_title || `Sala #${session.room_id}`}
                                {session.room_code && (
                                  <span className="ml-2 font-mono text-[10px] text-slate-400">{session.room_code}</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(session.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                {' · '}
                                {new Date(session.started_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {session.duration_seconds != null && ` · ${formatDuration(session.duration_seconds)}`}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-600">
                              {session.transcript_count} linhas
                            </span>
                            {session.recording_count > 0 && (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                                {session.recording_count} áudio{session.recording_count > 1 ? 's' : ''}
                              </span>
                            )}
                            {/* Deletar sessão */}
                            <button
                              onClick={() => deleteSession(session)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-300 hover:border-red-200 hover:text-red-500 transition-colors"
                              title="Deletar sessão"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button onClick={() => toggleSession(session)} className="p-1">
                              <ChevronDown
                                size={16}
                                className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              />
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 space-y-4">
                            {isLoadingThis ? (
                              <div className="flex justify-center py-6">
                                <Loader2 className="animate-spin text-slate-300" size={24} />
                              </div>
                            ) : (
                              <>
                                {/* Actions row */}
                                <div className="flex flex-wrap gap-2">
                                  {(transcripts?.length ?? 0) > 0 && (
                                    <button
                                      onClick={() => downloadTranscript(session)}
                                      className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                                    >
                                      <Download size={13} /> Baixar .txt
                                    </button>
                                  )}
                                  {(transcripts?.length ?? 0) > 0 && (recordings?.length ?? 0) > 0 && (
                                    <button
                                      onClick={async () => {
                                        await deleteTranscript(session);
                                        const recs = sessionRecordings[session.session_key];
                                        if (recs?.length) transcribeRecording(recs[0], session);
                                      }}
                                      disabled={deletingTranscript === session.session_key || transcribingRecording !== null}
                                      className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                                    >
                                      <Mic size={13} /> Refazer Transcrição
                                    </button>
                                  )}
                                </div>

                                {/* Recordings */}
                                {(recordings?.length ?? 0) > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gravações de Áudio</p>
                                    {recordings!.map((rec) => (
                                      <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-xs font-bold text-slate-700 truncate">{rec.file_name}</span>
                                          <div className="flex items-center gap-2 shrink-0">
                                            {rec.duration_seconds != null && (
                                              <span className="text-[11px] text-slate-400">{formatDuration(rec.duration_seconds)}</span>
                                            )}
                                            <a
                                              href={resolveRecordingUrl(rec.file_url)}
                                              download={rec.file_name}
                                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                                              title="Baixar áudio"
                                            >
                                              <Download size={13} />
                                            </a>
                                            <button
                                              onClick={() => deleteRecording(rec, session)}
                                              disabled={deletingRecording === rec.id}
                                              className="rounded-lg border border-slate-200 p-1.5 text-slate-300 hover:border-red-200 hover:text-red-500 disabled:opacity-50 transition-colors"
                                              title="Deletar gravação"
                                            >
                                              {deletingRecording === rec.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                            </button>
                                          </div>
                                        </div>
                                        <audio
                                          ref={(el) => { audioRefs.current[`${rec.id}`] = el; }}
                                          controls
                                          className="w-full h-8"
                                          src={resolveRecordingUrl(rec.file_url)}
                                        />
                                        {/* Botão transcrever com Gemini */}
                                        <button
                                          onClick={() => transcribeRecording(rec, session)}
                                          disabled={transcribingRecording === rec.id}
                                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {transcribingRecording === rec.id ? (
                                            <><Loader2 size={13} className="animate-spin" /> Transcrevendo com Gemini...</>
                                          ) : (
                                            <><Mic size={13} /> Transcrever Áudio com Gemini</>
                                          )}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Transcript */}
                                {(transcripts?.length ?? 0) > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Transcrição</p>
                                      <button
                                        onClick={() => deleteTranscript(session)}
                                        disabled={deletingTranscript === session.session_key}
                                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-400 hover:border-red-200 hover:text-red-500 disabled:opacity-50 transition-colors"
                                        title="Deletar transcrição"
                                      >
                                        {deletingTranscript === session.session_key ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                        Deletar
                                      </button>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                                      {transcripts!.map((line) => (
                                        <div key={line.id} className="flex gap-2">
                                          <span
                                            className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                              line.speaker_role === 'host'
                                                ? 'bg-indigo-100 text-indigo-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}
                                          >
                                            {line.speaker_name}
                                          </span>
                                          <p className="text-xs text-slate-700 leading-relaxed">{line.text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-center text-sm text-slate-400 py-4">Sem transcrição registrada para esta sessão.</p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          </div>
        )}

        {activeTab === 'rooms' && <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-3xl bg-gradient-to-br from-indigo-200 via-white to-slate-200 p-px shadow-lg">
              <div className="rounded-[22px] border border-slate-100 bg-white p-6 sm:p-8">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <LinkIcon size={20} className="text-indigo-600" /> {t('rooms.enterCode')}
                </h3>
                <form onSubmit={handleJoinByCode} className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    iconLeft={<Search size={16} />}
                    placeholder={t('rooms.placeholderCode')}
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                    wrapperClassName="flex-1"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={!meetingCode}
                    iconRight={<ArrowRight size={16} />}
                  >
                    {t('rooms.join')}
                  </Button>
                </form>
              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-slate-200 via-white to-indigo-200 p-px shadow-lg">
              <div className="overflow-hidden rounded-[22px] border border-slate-100 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-slate-700">
                    <History size={18} className="text-indigo-500" /> {t('rooms.history')}
                  </h3>
                  <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                    <Input
                      iconLeft={<Search size={14} />}
                      value={roomSearch}
                      onChange={(e) => setRoomSearch(e.target.value)}
                      placeholder={t('rooms.search')}
                      size="sm"
                      wrapperClassName="w-full sm:w-56"
                    />
                    <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {t('rooms.persistent')}
                    </span>
                  </div>
                </div>

                <div className="max-h-[400px] divide-y divide-slate-100 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center p-10">
                      <Loader2 className="animate-spin text-slate-300" />
                    </div>
                  ) : persistentRooms.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400">{t('rooms.noPersistent')}</div>
                  ) : (
                    persistentRooms.map((room) => (
                      <div key={room.id} className="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-slate-50">
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="truncate text-sm font-bold text-slate-800">{room.title || t('rooms.unnamed')}</h4>
                            <div className="flex items-center gap-1 rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-600">
                              {room.code}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400">{t('rooms.createdAt')}: {new Date(room.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(room)}
                            className={`rounded-xl border p-2.5 transition-all ${
                              copiedId === room.id
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                                : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-100 hover:text-indigo-600'
                            }`}
                            title={t('rooms.copyLink')}
                          >
                            {copiedId === room.id ? <Check size={18} /> : <Copy size={18} />}
                          </button>
                          <button
                            onClick={() => openWhatsAppShare(room)}
                            className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-md transition-all hover:bg-emerald-700"
                            title="Compartilhar no WhatsApp"
                          >
                            <Send size={18} />
                          </button>
                          <button
                            onClick={() => window.open(`/sala/${room.code}`, '_blank')}
                            className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-md transition-all hover:bg-indigo-700"
                            title={t('rooms.join')}
                          >
                            <Play size={18} />
                          </button>
                          <button
                            onClick={() => setRoomToDelete(room)}
                            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-300 transition-all hover:border-red-100 hover:text-red-500"
                            title={t('common.delete')}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-indigo-200 via-white to-slate-200 p-px shadow-lg">
            <div className="flex h-full min-h-[500px] flex-col rounded-[22px] border border-slate-100 bg-white">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold text-slate-800">
                  <Calendar size={22} className="text-indigo-600" /> {t('rooms.upcoming')}
                </h3>
                <div className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t('rooms.secureBadge')}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/30 p-5">
                {isLoading ? (
                  <div className="flex h-full items-center justify-center py-20 text-slate-300">
                    <Loader2 className="animate-spin" size={32} />
                  </div>
                ) : upcomingRooms.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-10 text-slate-400">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-slate-100 bg-white shadow-sm">
                      <Video size={40} className="text-indigo-900 opacity-10" />
                    </div>
                    <p className="font-medium">{t('rooms.noUpcoming')}</p>
                  </div>
                ) : (
                  upcomingRooms.map((room) => (
                    <div
                      key={room.id}
                      className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-indigo-300 hover:shadow-lg sm:flex-row sm:items-center"
                    >
                      <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />

                      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm transition-transform group-hover:scale-105">
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-indigo-600">
                          {room.scheduled_start ? new Date(room.scheduled_start).toLocaleString('default', { month: 'short' }) : '-'}
                        </span>
                        <span className="text-2xl font-bold leading-none text-indigo-900">
                          {room.scheduled_start ? new Date(room.scheduled_start).getDate() : '-'}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <Clock size={14} className="text-indigo-400" />
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                            {room.scheduled_start ? new Date(room.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            {room.scheduled_end ? ` - ${new Date(room.scheduled_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </span>
                        </div>
                        <h4 className="mb-1 truncate text-base font-bold text-slate-800">{room.title || t('rooms.defaultTitle')}</h4>
                        <p className="line-clamp-1 text-sm text-slate-400">{room.description || t('rooms.noDesc')}</p>
                      </div>

                      <div className="mt-2 flex w-full gap-2 border-t border-slate-50 pt-4 sm:mt-0 sm:w-auto sm:border-t-0 sm:pt-0">
                        <button
                          className={`rounded-xl border p-3 transition-all ${
                            copiedId === room.id
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-600'
                              : 'border-slate-200 bg-white text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                          title={t('rooms.copyLink')}
                          onClick={() => handleCopyLink(room)}
                        >
                          {copiedId === room.id ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                        <button
                          onClick={() => openWhatsAppShare(room)}
                          className="rounded-xl bg-emerald-600 p-3 text-white shadow-md transition-all hover:bg-emerald-700"
                          title="Compartilhar no WhatsApp"
                        >
                          <Send size={20} />
                        </button>
                        <button
                          onClick={() => window.open(`/sala/${room.code}`, '_blank')}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 sm:flex-none"
                        >
                          <Play size={16} fill="currentColor" /> {t('rooms.startNow')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>}

      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Criar sala virtual"
        subtitle="Cadastre uma sala agendada ou permanente com o padrão do sistema."
        size="lg"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreateRoom} loading={isSavingRoom} iconLeft={<Plus size={14} />}>
              Criar sala
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <Input
            label="Título"
            value={createForm.title}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Sessão de acompanhamento"
          />

          <Textarea
            label="Descrição"
            value={createForm.description}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Observações para a sala..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Data início</label>
              <DatePicker
                value={createForm.scheduled_start ? createForm.scheduled_start.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => {
                  const time = prev.scheduled_start?.split('T')[1] || '00:00';
                  return { ...prev, scheduled_start: val ? `${val}T${time}` : '' };
                })}
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Horário início</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none z-10" />
                <input
                  type="time"
                  value={createForm.scheduled_start ? createForm.scheduled_start.slice(11, 16) : ''}
                  onChange={(e) => setCreateForm((prev) => {
                    const date = prev.scheduled_start?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                    return { ...prev, scheduled_start: `${date}T${e.target.value}` };
                  })}
                  className="h-11 w-full rounded-2xl border border-slate-200 pl-9 pr-3 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50/30 hover:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Data fim</label>
              <DatePicker
                value={createForm.scheduled_end ? createForm.scheduled_end.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => {
                  const time = prev.scheduled_end?.split('T')[1] || '00:00';
                  return { ...prev, scheduled_end: val ? `${val}T${time}` : '' };
                })}
              />
            </div>
            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Horário fim</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none z-10" />
                <input
                  type="time"
                  value={createForm.scheduled_end ? createForm.scheduled_end.slice(11, 16) : ''}
                  onChange={(e) => setCreateForm((prev) => {
                    const date = prev.scheduled_end?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                    return { ...prev, scheduled_end: `${date}T${e.target.value}` };
                  })}
                  className="h-11 w-full rounded-2xl border border-slate-200 pl-9 pr-3 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-slate-50/30 hover:bg-white"
                />
              </div>
            </div>
          </div>

          <Combobox
            label="Paciente"
            placeholder="Sem paciente"
            options={[
              { value: '', label: 'Sem paciente' },
              ...patients.map((p) => ({ value: String(p.id), label: p.full_name || p.name || '—' })),
            ]}
            value={createForm.patient_id}
            onChange={(v) => setCreateForm((prev) => ({ ...prev, patient_id: String(v) }))}
          />

          <Combobox
            label="Profissional"
            placeholder="Sem profissional"
            options={[
              { value: '', label: 'Sem profissional' },
              ...professionals.map((p) => ({ value: String(p.id), label: p.name || '—' })),
            ]}
            value={createForm.professional_id}
            onChange={(v) => setCreateForm((prev) => ({ ...prev, professional_id: String(v) }))}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Provider"
              value={createForm.provider}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, provider: e.target.value }))}
              options={[
                { value: 'jitsi', label: 'Jitsi' },
                { value: 'zoom', label: 'Zoom' },
                { value: 'teams', label: 'Teams' },
                { value: 'outro', label: 'Outro' },
              ]}
            />

            <div>
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1.5 block">Expira em</label>
              <DatePicker
                value={createForm.expiration_date ? createForm.expiration_date.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => ({ ...prev, expiration_date: val || '' }))}
              />
            </div>
          </div>

          <Input
            label="Link externo (opcional)"
            value={createForm.link}
            onChange={(e) => setCreateForm((prev) => ({ ...prev, link: e.target.value }))}
            placeholder="https://..."
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
            O link é público. O cliente entra sem login usando <code className="font-mono">/sala/{'{codigo}'}</code>.
          </div>

          {createdRoom && (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div>
                <div className="font-semibold text-emerald-700">Sala criada</div>
                <div className="break-all text-xs text-emerald-700">
                  {`${window.location.origin}/sala/${createdRoom.code}`}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" size="sm" onClick={() => handleCopyLink(createdRoom)}>
                  Copiar link público
                </Button>
                <Button variant="success" size="sm" onClick={() => window.open(`/sala/${createdRoom.code}`, '_blank')}>
                  Abrir sala
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={handleDeleteRoom}
        title="Excluir sala"
        message={roomToDelete ? `A sala "${roomToDelete.title || roomToDelete.code}" será removida permanentemente.` : ''}
        confirmLabel="Confirmar exclusão"
      />

      <ConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmDelete}
        title={
          (confirmAction as any)?.type === 'recording' ? 'Deletar gravação'
          : (confirmAction as any)?.type === 'session' ? 'Deletar sessão completa'
          : 'Deletar transcrição'
        }
        message={
          (confirmAction as any)?.type === 'recording'
            ? <>Tem certeza que deseja deletar a gravação <strong className="text-slate-800">"{(confirmAction as any).rec.file_name}"</strong>? O arquivo será removido permanentemente.</>
            : (confirmAction as any)?.type === 'session'
            ? <>Isso irá deletar a sessão <strong className="text-slate-800">permanentemente</strong>, incluindo todas as transcrições e arquivos de áudio. Esta ação não pode ser desfeita.</>
            : 'Tem certeza que deseja deletar toda a transcrição desta sessão? Esta ação não pode ser desfeita.'
        }
        confirmLabel="Deletar"
        loading={
          (confirmAction as any)?.type === 'recording'
            ? deletingRecording === (confirmAction as any)?.rec?.id
            : deletingTranscript === (confirmAction as any)?.session?.session_key
        }
      />
    </PageWrapper>
  );
};
