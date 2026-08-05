import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Edit3,
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
  Zap,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
import { api } from '../services/api';
import { PUBLIC_BASE_URL } from '@/src/lib/publicLinks';
import { Patient, User, VirtualRoom } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DatePicker } from '../components/UI/DatePicker';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import {
  Button,
  Combobox,
  ConfirmModal,
  EmptyState,
  FilterLineDateRange,
  FilterLineSearch,
  FilterLineSegmented,
  Input,
  Modal,
  ModalFooter,
  Select,
  StatCard,
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
  display_title?: string;
  custom_title?: string | null;
  patient_id?: number | null;
  patient_name?: string | null;
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

const _normalizeAudioMimeType = (mimeType?: string) => {
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
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

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
  const [isInstantModalOpen, setIsInstantModalOpen] = useState(false);
  const [instantPatientId, setInstantPatientId] = useState('');
  const [roomToNotify, setRoomToNotify] = useState<VirtualRoom | null>(null);
  const [isNotifyingPatient, setIsNotifyingPatient] = useState(false);

  const [activeTab, setActiveTab] = useState<'rooms' | 'transcricoes'>('rooms');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionTranscripts, setSessionTranscripts] = useState<Record<string, TranscriptLine[]>>({});
  const [sessionRecordings, setSessionRecordings] = useState<Record<string, RecordingEntry[]>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const [sessionToEdit, setSessionToEdit] = useState<SessionSummary | null>(null);
  const [editSessionTitle, setEditSessionTitle] = useState('');
  const [editSessionPatientId, setEditSessionPatientId] = useState('');
  const [isSavingSessionEdit, setIsSavingSessionEdit] = useState(false);

  const [sessionSearch, setSessionSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterHasRecording, setFilterHasRecording] = useState<boolean | null>(null);
  const [filterHasTranscript, setFilterHasTranscript] = useState<boolean | null>(null);


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
      setPatients((pts || []).map((p: any) => ({ ...p, full_name: p.full_name || p.name || 'Sem nome' })));
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

  const openEditSession = (session: SessionSummary) => {
    setSessionToEdit(session);
    setEditSessionTitle(session.custom_title || session.display_title || session.room_title || '');
    setEditSessionPatientId(session.patient_id ? String(session.patient_id) : '');
  };

  const saveSessionEdit = async () => {
    if (!sessionToEdit) return;
    setIsSavingSessionEdit(true);
    try {
      await api.patch(`/virtual-rooms/${sessionToEdit.room_id}/sessions/${sessionToEdit.session_key}`, {
        custom_title: editSessionTitle.trim() || null,
        patient_id: editSessionPatientId ? Number(editSessionPatientId) : null,
      });
      const patient = patients.find((p) => String(p.id) === editSessionPatientId);
      setSessions((prev) => prev.map((s) => s.session_key === sessionToEdit.session_key
        ? {
            ...s,
            custom_title: editSessionTitle.trim() || null,
            display_title: editSessionTitle.trim() || s.room_title,
            patient_id: editSessionPatientId ? Number(editSessionPatientId) : null,
            patient_name: patient?.full_name || null,
          }
        : s
      ));
      toastSuccess('Sessão atualizada', 'Nome e paciente salvos com sucesso.');
      setSessionToEdit(null);
    } catch {
      toastError('Erro', 'Não foi possível atualizar a sessão.');
    } finally {
      setIsSavingSessionEdit(false);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (sessionSearch.trim()) {
      const q = sessionSearch.trim().toLowerCase();
      const inTitle = (s.display_title || s.room_title || '').toLowerCase().includes(q);
      const inCode = (s.room_code || '').toLowerCase().includes(q);
      const inKey = s.session_key.toLowerCase().includes(q);
      const inPatient = (s.patient_name || '').toLowerCase().includes(q);
      if (!inTitle && !inCode && !inKey && !inPatient) return false;
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
    setTranscribingRecording(rec.id);
    try {
      // Baixa o áudio do servidor
      const audioUrl = resolveRecordingUrl(rec.file_url);
      const resp = await fetch(audioUrl);
      if (!resp.ok) throw new Error('Falha ao baixar áudio');
      const blob = await resp.blob();

      // Envia para Whisper via backend
      // Força o mimetype correto baseado na extensão do arquivo, pois fetch blob pode retornar octet-stream
      const fileName = rec.file_name || 'audio.webm';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'webm';
      const mimeMap: Record<string, string> = {
        webm: 'audio/webm',
        mp4: 'audio/mp4',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg',
        wav: 'audio/wav',
        mp3: 'audio/mpeg',
      };
      const forcedMime = mimeMap[ext] || 'audio/webm';
      const audioBlob = new Blob([blob], { type: forcedMime });
      const formData = new FormData();
      formData.append('audio', audioBlob, fileName);
      formData.append('language', 'pt');
      const result = await api.post<any>('/ai/transcribe-audio', formData);
      const transcribed: string = result?.text?.trim() || '';

      if (!transcribed) {
        toastError('Falha na transcrição', 'Whisper não retornou texto. Verifique se o áudio tem fala.');
        return;
      }

      await api.post(`/virtual-rooms/${session.room_id}/transcripts`, {
        speaker_name: 'Transcrição do Áudio',
        speaker_role: 'system',
        session_key: session.session_key,
        text: transcribed,
      });

      const updated = await api.get<TranscriptLine[]>(
        `/virtual-rooms/${session.room_id}/sessions/${session.session_key}/transcript`
      );
      setSessionTranscripts((prev) => ({ ...prev, [session.session_key]: updated || [] }));
      toastSuccess('Transcrição concluída', 'Áudio transcrito com sucesso!');
    } catch (e: any) {
      toastError('Erro', e?.message || 'Erro ao transcrever o áudio.');
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

  // Banco armazena em UTC sem 'Z' — força interpretação como UTC para converter corretamente para BRT
  const formatSessionDate = (raw: string) => {
    if (!raw) return '';
    const utc = raw.includes('T') || raw.includes('Z') ? raw : raw.replace(' ', 'T') + 'Z';
    const d = new Date(utc);
    const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
    return `${date} · ${time}`;
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
    // Salas instantâneas (provider "interno", criadas pelo botão "Sala Instantânea")
    // são de uso único e não devem poluir "Minhas Salas" — só as criadas manualmente
    // (permanentes de verdade, provider "jitsi") ficam listadas aqui.
    () => rooms.filter((room) => !room.scheduled_start && room.provider !== 'interno').filter(matchesQuery),
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

  const handleInstantMeeting = () => {
    setInstantPatientId('');
    setIsInstantModalOpen(true);
  };

  const handleCreateInstantRoom = async () => {
    setIsCreatingInstant(true);
    try {
      const code = generateCode();
      const title = `Sessão - ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      const room = await api.post<any>('/virtual-rooms', {
        title,
        description: 'Sessão iniciada via acesso rápido.',
        code,
        provider: 'interno',
        patient_id: instantPatientId || null,
      });
      const roomCode = room.code || room.hash || code;
      setIsInstantModalOpen(false);
      window.open(`/sala/${roomCode}`, '_blank');
      if (instantPatientId) setRoomToNotify(room);
    } catch (error: any) {
      toastError('Erro ao criar sala', error.message || '');
    } finally {
      setIsCreatingInstant(false);
    }
  };

  const handleNotifyPatient = async () => {
    if (!roomToNotify) return;
    setIsNotifyingPatient(true);
    try {
      await api.post(`/virtual-rooms/${roomToNotify.id}/notify-patient`, {});
      toastSuccess('Mensagem enviada', 'O paciente recebeu o link da sala pelo WhatsApp.');
      setRoomToNotify(null);
    } catch (error: any) {
      toastError('Erro ao enviar mensagem', error.message || '');
    } finally {
      setIsNotifyingPatient(false);
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
      // Se a sala já tem horário marcado, o backend enfileira o envio para 1min antes —
      // só pede confirmação de envio imediato quando não há agendamento (envio na hora).
      if (createForm.patient_id && !createForm.scheduled_start) setRoomToNotify(room);
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
    const url = `${PUBLIC_BASE_URL}/sala/${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsAppShare = (room: VirtualRoom) => {
    const shareUrl = `${PUBLIC_BASE_URL}/api/virtual-rooms/public/${room.code}/preview`;
    const company = user?.companyName || user?.name || 'seu profissional';
    const message = `*Prepare-se, sua sessão já vai começar com ${company}!* 🌿\n\nPara um melhor aproveitamento da sua consulta:\n📍 Procure um local calmo, iluminado e privado.\n🎧 Use fones de ouvido para sua privacidade e melhor som.\n🛜 Verifique se sua conexão de internet está estável.\n\nAcesse sua sala virtual pelo link abaixo:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <PageWrapper mobileBottomPad={false} className="space-y-4 sm:space-y-6 !px-0 !pt-0 !pb-0">

      <SectionTitle
        icon={Video}
        title="Atendimento Online"
        description="Salas seguras com criptografia ponta-a-ponta"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Plus size={14} />}
              onClick={() => openCreateModal()}
            >
              Agendar Sala
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Zap size={14} className="fill-current" />}
              loading={isCreatingInstant}
              onClick={handleInstantMeeting}
            >
              Sala Instantânea
            </Button>
          </div>
        }
      />

      <div className="px-3 sm:px-5 lg:px-6 xl:px-8 space-y-4 sm:space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard title="Salas ativas" value={roomStats.total} icon={Video} color="default" delay={0} />
          <StatCard title="Agendadas" value={roomStats.upcoming} icon={Calendar} color="info" delay={1} />
          <StatCard title="Permanentes" value={roomStats.persistent} icon={ShieldCheck} color="purple" delay={2} />
        </div>

        {/* Tab switcher */}
        <FilterLineSegmented
          value={activeTab}
          onChange={v => setActiveTab(v as 'rooms' | 'transcricoes')}
          options={[
            { value: 'rooms', label: 'Salas' },
            { value: 'transcricoes', label: 'Transcrições' },
          ]}
        />

        {/* ── SALAS TAB ── */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            {/* Entrar com código */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-slate-800">
                <LinkIcon size={16} className="text-indigo-500" /> Entrar com Código
              </h2>
              <p className="mb-4 text-sm text-slate-400">Cole o código da sala para entrar direto</p>
              <form onSubmit={handleJoinByCode} className="flex flex-col gap-2 sm:flex-row">
                <div className="flex-1">
                  <Input
                    addonLeft={<Search size={15} />}
                    placeholder="Ex: abc-123-xyz"
                    value={meetingCode}
                    onChange={(e) => setMeetingCode(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="primary" disabled={!meetingCode} iconRight={<ArrowRight size={15} />}>
                  Acessar Sala
                </Button>
              </form>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {/* Salas permanentes */}
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <History size={16} className="text-indigo-500" />
                    <h2 className="font-bold text-slate-700">Minhas Salas</h2>
                    {persistentRooms.length > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600">
                        {persistentRooms.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-44">
                      <FilterLineSearch
                        value={roomSearch}
                        onChange={setRoomSearch}
                        placeholder="Buscar sala..."
                      />
                    </div>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Permanentes
                    </span>
                  </div>
                </div>

                <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-slate-300" />
                    </div>
                  ) : persistentRooms.length === 0 ? (
                    <EmptyState
                      icon={Video}
                      title="Nenhuma sala permanente"
                      description="Crie uma sala para atender quando quiser"
                      className="border-none bg-transparent py-14"
                    />
                  ) : (
                    persistentRooms.map((room) => (
                      <div key={room.id} className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                          <Video size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{room.title || 'Sem título'}</p>
                          <div className="mt-0.5 flex items-center gap-1.5">
                            <span className="rounded border border-indigo-100 bg-indigo-50 px-1.5 py-0.5 font-mono text-[10px] text-indigo-600">
                              {room.code}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(room.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopyLink(room)}
                            title="Copiar link"
                            className={`rounded-xl border p-2 transition ${
                              copiedId === room.id
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                : 'border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                            }`}
                          >
                            {copiedId === room.id ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                          <button
                            onClick={() => openWhatsAppShare(room)}
                            title="WhatsApp"
                            className="rounded-xl bg-emerald-500 p-2 text-white shadow-sm transition hover:bg-emerald-600"
                          >
                            <Send size={15} />
                          </button>
                          <button
                            onClick={() => window.open(`/sala/${room.code}`, '_blank')}
                            title="Entrar na sala"
                            className="rounded-xl bg-indigo-600 p-2 text-white shadow-sm transition hover:bg-indigo-700"
                          >
                            <Play size={15} />
                          </button>
                          <button
                            onClick={() => setRoomToDelete(room)}
                            title="Excluir"
                            className="rounded-xl border border-slate-200 p-2 text-slate-300 transition hover:border-red-200 hover:text-red-500"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Próximas sessões agendadas */}
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-indigo-500" />
                    <h2 className="font-bold text-slate-700">Próximos Atendimentos</h2>
                    {upcomingRooms.length > 0 && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-600">
                        {upcomingRooms.length}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Hiper Seguro</span>
                  </div>
                </div>

                <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="animate-spin text-slate-300" size={28} />
                    </div>
                  ) : upcomingRooms.length === 0 ? (
                    <EmptyState
                      icon={Calendar}
                      title="Sem consultas agendadas"
                      className="border-none bg-transparent py-14"
                      action={
                        <Button variant="primary" size="sm" iconLeft={<Plus size={13} />} onClick={() => openCreateModal()}>
                          Agendar agora
                        </Button>
                      }
                    />
                  ) : (
                    upcomingRooms.map((room) => {
                      const start = room.scheduled_start ? new Date(room.scheduled_start) : null;
                      const end = room.scheduled_end ? new Date(room.scheduled_end) : null;
                      const dayNum = start ? start.getDate() : '--';
                      const monthStr = start ? start.toLocaleString('pt-BR', { month: 'short' }).replace('.', '') : '--';
                      const timeStr = start ? start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                      const endTimeStr = end ? end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
                      return (
                        <div key={room.id} className="group flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center">
                          {/* Date badge */}
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 shadow-sm">
                            <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-500">{monthStr}</span>
                            <span className="text-2xl font-black leading-tight text-indigo-800">{dayNum}</span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-1.5">
                              <Clock size={12} className="text-slate-400" />
                              <span className="text-xs font-bold text-slate-500">
                                {timeStr}{endTimeStr ? ` – ${endTimeStr}` : ''}
                              </span>
                            </div>
                            <p className="truncate text-sm font-bold text-slate-800">{room.title || 'Sessão sem título'}</p>
                            {room.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{room.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleCopyLink(room)}
                              title="Copiar link"
                              className={`rounded-xl border p-2 transition ${
                                copiedId === room.id
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                                  : 'border-slate-200 text-slate-400 hover:border-indigo-200 hover:text-indigo-600'
                              }`}
                            >
                              {copiedId === room.id ? <Check size={15} /> : <Copy size={15} />}
                            </button>
                            <button
                              onClick={() => openWhatsAppShare(room)}
                              className="rounded-xl bg-emerald-500 p-2 text-white shadow-sm transition hover:bg-emerald-600"
                              title="WhatsApp"
                            >
                              <Send size={15} />
                            </button>
                            <button
                              onClick={() => window.open(`/sala/${room.code}`, '_blank')}
                              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-indigo-700"
                            >
                              <Play size={13} fill="currentColor" /> Entrar
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TRANSCRIÇÕES TAB ── */}
        {activeTab === 'transcricoes' && (
          <div className="space-y-5">
            {/* Histórico */}
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/50 px-5 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold text-slate-800">
                    <FileText size={17} className="text-indigo-500" /> Histórico de Sessões
                  </h3>
                  <button
                    onClick={fetchSessions}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:text-indigo-600"
                  >
                    Atualizar
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div className="min-w-[150px] flex-1">
                    <FilterLineSearch
                      value={sessionSearch}
                      onChange={setSessionSearch}
                      placeholder="Buscar sala ou sessão..."
                    />
                  </div>
                  <FilterLineDateRange
                    from={filterDateFrom || null}
                    to={filterDateTo || null}
                    onFromChange={v => setFilterDateFrom(v || '')}
                    onToChange={v => setFilterDateTo(v || '')}
                  />
                  <button
                    onClick={() => setFilterHasRecording(v => v === true ? null : true)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${filterHasRecording === true ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:text-emerald-600'}`}
                  >
                    Com áudio
                  </button>
                  <button
                    onClick={() => setFilterHasTranscript(v => v === true ? null : true)}
                    className={`rounded-xl border px-2.5 py-1.5 text-xs font-bold transition ${filterHasTranscript === true ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500 hover:text-indigo-600'}`}
                  >
                    Com transcrição
                  </button>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-100"
                    >
                      <X size={11} /> Limpar
                    </button>
                  )}
                </div>

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
                <EmptyState
                  icon={FileText}
                  title={sessions.length === 0 ? 'Nenhuma sessão registrada ainda.' : 'Nenhuma sessão encontrada.'}
                  description={sessions.length === 0 ? 'As transcrições aparecem aqui após encerrar uma sessão.' : 'Tente ajustar os filtros.'}
                  className="border-none bg-transparent py-16"
                  action={hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs text-indigo-600 hover:underline">Limpar filtros</button>
                  )}
                />
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredSessions.map((session) => {
                    const isOpen = expandedSession === session.session_key;
                    const transcripts = sessionTranscripts[session.session_key];
                    const recordings = sessionRecordings[session.session_key];
                    const isLoadingThis = loadingDetail === session.session_key;
                    return (
                      <div key={session.session_key}>
                        <div className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-slate-50">
                          <button
                            onClick={() => toggleSession(session)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                              <Mic size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800">
                                {session.display_title || session.room_title || `Sala #${session.room_id}`}
                                {session.room_code && (
                                  <span className="ml-2 font-mono text-[10px] text-slate-400">{session.room_code}</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {session.patient_name && (
                                  <span className="font-semibold text-slate-500">{session.patient_name} · </span>
                                )}
                                {formatSessionDate(session.started_at)}
                                {session.duration_seconds != null && ` · ${formatDuration(session.duration_seconds)}`}
                              </p>
                            </div>
                          </button>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="hidden rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600 sm:inline">
                              {session.transcript_count} linhas
                            </span>
                            {session.recording_count > 0 && (
                              <span className="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600 sm:inline">
                                {session.recording_count} áudio{session.recording_count > 1 ? 's' : ''}
                              </span>
                            )}
                            <button
                              onClick={() => openEditSession(session)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-300 transition hover:border-indigo-200 hover:text-indigo-600"
                              title="Renomear / marcar paciente"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => deleteSession(session)}
                              className="rounded-lg border border-slate-200 p-1.5 text-slate-300 transition hover:border-red-200 hover:text-red-500"
                              title="Deletar sessão"
                            >
                              <Trash2 size={13} />
                            </button>
                            <button onClick={() => toggleSession(session)} className="p-1">
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4 space-y-4">
                            {isLoadingThis ? (
                              <div className="flex justify-center py-6">
                                <Loader2 className="animate-spin text-slate-300" size={24} />
                              </div>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-2">
                                  {(transcripts?.length ?? 0) > 0 && (
                                    <button
                                      onClick={() => downloadTranscript(session)}
                                      className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100"
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
                                      className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                                    >
                                      <Mic size={13} /> Refazer Transcrição
                                    </button>
                                  )}
                                </div>

                                {(recordings?.length ?? 0) > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Gravações de Áudio</p>
                                    {recordings!.map((rec) => (
                                      <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-sm">
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="truncate text-xs font-bold text-slate-700">{rec.file_name}</span>
                                          <div className="flex shrink-0 items-center gap-2">
                                            {rec.duration_seconds != null && (
                                              <span className="text-[11px] text-slate-400">{formatDuration(rec.duration_seconds)}</span>
                                            )}
                                            <a
                                              href={resolveRecordingUrl(rec.file_url)}
                                              download={rec.file_name}
                                              className="rounded-lg border border-slate-200 p-1.5 text-slate-400 transition hover:text-indigo-600"
                                              title="Baixar áudio"
                                            >
                                              <Download size={13} />
                                            </a>
                                            <button
                                              onClick={() => deleteRecording(rec, session)}
                                              disabled={deletingRecording === rec.id}
                                              className="rounded-lg border border-slate-200 p-1.5 text-slate-300 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
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
                                        <button
                                          onClick={() => transcribeRecording(rec, session)}
                                          disabled={transcribingRecording === rec.id}
                                          className="flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {transcribingRecording === rec.id ? (
                                            <><Loader2 size={13} className="animate-spin" /> Transcrevendo...</>
                                          ) : (
                                            <><Mic size={13} /> Transcrever</>
                                          )}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(transcripts?.length ?? 0) > 0 ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Transcrição</p>
                                      <button
                                        onClick={() => deleteTranscript(session)}
                                        disabled={deletingTranscript === session.session_key}
                                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-400 transition hover:border-red-200 hover:text-red-500 disabled:opacity-50"
                                      >
                                        {deletingTranscript === session.session_key ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                                        Deletar
                                      </button>
                                    </div>
                                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
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
                                          <p className="text-xs leading-relaxed text-slate-700">{line.text}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="py-4 text-center text-sm text-slate-400">Sem transcrição registrada para esta sessão.</p>
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
        )}
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
              <label className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-widest text-slate-500">Data início</label>
              <DatePicker
                value={createForm.scheduled_start ? createForm.scheduled_start.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => {
                  const time = prev.scheduled_start?.split('T')[1] || '00:00';
                  return { ...prev, scheduled_start: val ? `${val}T${time}` : '' };
                })}
              />
            </div>
            <div>
              <label className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-widest text-slate-500">Horário início</label>
              <div className="relative">
                <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-indigo-400" />
                <input
                  type="time"
                  value={createForm.scheduled_start ? createForm.scheduled_start.slice(11, 16) : ''}
                  onChange={(e) => setCreateForm((prev) => {
                    const date = prev.scheduled_start?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                    return { ...prev, scheduled_start: `${date}T${e.target.value}` };
                  })}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/30 pl-9 pr-3 text-sm font-black text-slate-700 outline-none transition-all hover:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-widest text-slate-500">Data fim</label>
              <DatePicker
                value={createForm.scheduled_end ? createForm.scheduled_end.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => {
                  const time = prev.scheduled_end?.split('T')[1] || '00:00';
                  return { ...prev, scheduled_end: val ? `${val}T${time}` : '' };
                })}
              />
            </div>
            <div>
              <label className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-widest text-slate-500">Horário fim</label>
              <div className="relative">
                <Clock size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-indigo-400" />
                <input
                  type="time"
                  value={createForm.scheduled_end ? createForm.scheduled_end.slice(11, 16) : ''}
                  onChange={(e) => setCreateForm((prev) => {
                    const date = prev.scheduled_end?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                    return { ...prev, scheduled_end: `${date}T${e.target.value}` };
                  })}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/30 pl-9 pr-3 text-sm font-black text-slate-700 outline-none transition-all hover:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
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
              <label className="mb-1.5 ml-1 block text-[11px] font-black uppercase tracking-widest text-slate-500">Expira em</label>
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
                <div className="font-semibold text-emerald-700">Sala criada!</div>
                <div className="break-all text-xs text-emerald-700">
                  {`${PUBLIC_BASE_URL}/sala/${createdRoom.code}`}
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

      <Modal
        isOpen={!!sessionToEdit}
        onClose={() => setSessionToEdit(null)}
        title="Renomear sessão"
        size="sm"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setSessionToEdit(null)}>Cancelar</Button>
            <Button variant="primary" onClick={saveSessionEdit} loading={isSavingSessionEdit}>Salvar</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome da sessão"
            value={editSessionTitle}
            onChange={(e) => setEditSessionTitle(e.target.value)}
            placeholder="Ex: Sessão com Maria Silva"
          />
          <Combobox
            label="Paciente"
            options={patients.map((p) => ({ value: String(p.id), label: p.full_name }))}
            value={editSessionPatientId}
            onChange={(v) => setEditSessionPatientId(v as string)}
            placeholder="Selecionar paciente (opcional)"
          />
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

      <Modal
        isOpen={isInstantModalOpen}
        onClose={() => setIsInstantModalOpen(false)}
        title="Sala Instantânea"
        size="sm"
        footer={
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsInstantModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreateInstantRoom} loading={isCreatingInstant}>Criar sala</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">A sala abre em uma nova aba assim que for criada.</p>
          <Combobox
            label="Paciente"
            options={[
              { value: '', label: 'Sem paciente' },
              ...patients.map((p) => ({ value: String(p.id), label: p.full_name || p.name || '—' })),
            ]}
            value={instantPatientId}
            onChange={(v) => setInstantPatientId(v as string)}
            placeholder="Selecionar paciente (opcional)"
          />
        </div>
      </Modal>

      <ConfirmModal
        isOpen={!!roomToNotify}
        onClose={() => setRoomToNotify(null)}
        onConfirm={handleNotifyPatient}
        title="Enviar link para o paciente?"
        message="O link desta sala será enviado agora pelo WhatsApp do paciente, pelo bot da sua clínica."
        confirmLabel="Enviar agora"
        variant="success"
        loading={isNotifyingPatient}
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
