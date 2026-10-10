import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getToken } from '../services/tokenStorage';
import {
  AlertTriangle,
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
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { Patient, User, VirtualRoom } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { DatePicker } from '../components/UI/DatePicker';
import { PageWrapper, SectionTitle } from '../components/UI/PageWrapper';
import {
  Alert,
  Badge,
  Button,
  Combobox,
  ConfirmModal,
  EmptyState,
  FilterLineDateRange,
  FilterLineSearch,
  IconButton,
  Input,
  Modal,
  ModalFooter,
  PanelCard,
  StatCard,
  StatGrid,
  Tabs,
  Textarea,
} from '../components/UI';

const VIRTUAL_ROOMS_TABS = [
  { id: 'rooms', label: 'Salas', icon: Video },
  { id: 'transcricoes', label: 'Transcrições', icon: FileText },
] as const;

type VirtualRoomsTab = (typeof VIRTUAL_ROOMS_TABS)[number]['id'];

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
  const [googleMeetEnabled, setGoogleMeetEnabled] = useState(false);
  const [generatingRoomMeetLink, setGeneratingRoomMeetLink] = useState(false);
  const [isCreatingInstantMeet, setIsCreatingInstantMeet] = useState(false);

  const [activeTab, setActiveTab] = useState<VirtualRoomsTab>('rooms');
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

  useEffect(() => {
    api.get<any>('/google/status').then((d: any) => setGoogleMeetEnabled(!!(d?.connected && d?.enabled))).catch(() => {});
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
    const token = getToken();
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

  const handleGenerateRoomMeetLink = async () => {
    setGeneratingRoomMeetLink(true);
    try {
      const now = new Date();
      const startISO = createForm.scheduled_start
        ? new Date(createForm.scheduled_start).toISOString()
        : now.toISOString();
      const endISO = createForm.scheduled_end
        ? new Date(createForm.scheduled_end).toISOString()
        : new Date(new Date(startISO).getTime() + 50 * 60000).toISOString();

      const res = await api.post<any>('/google/generate-meet-link', {
        title: createForm.title || 'Sessão online',
        start_time: startISO,
        end_time: endISO,
        patient_id: createForm.patient_id || undefined,
      });
      if (res?.meeting_url) {
        setCreateForm((prev) => ({ ...prev, link: res.meeting_url, provider: 'google_meet' }));
        toastSuccess('Link do Google Meet gerado!', '');
      }
    } catch (error: any) {
      toastError('Erro ao gerar link do Google Meet', error.message || '');
    } finally {
      setGeneratingRoomMeetLink(false);
    }
  };

  const handleCreateInstantGoogleMeet = async () => {
    setIsCreatingInstantMeet(true);
    try {
      const now = new Date();
      const startISO = now.toISOString();
      const endISO = new Date(now.getTime() + 50 * 60000).toISOString();
      const title = `Sessão - ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      const meetRes = await api.post<any>('/google/generate-meet-link', {
        title,
        start_time: startISO,
        end_time: endISO,
        patient_id: instantPatientId || undefined,
      });
      if (!meetRes?.meeting_url) throw new Error('Não foi possível gerar o link do Google Meet.');

      const code = generateCode();
      const room = await api.post<any>('/virtual-rooms', {
        title,
        description: 'Sessão iniciada via acesso rápido (Google Meet).',
        code,
        provider: 'google_meet',
        link: meetRes.meeting_url,
        patient_id: instantPatientId || null,
      });
      setIsInstantModalOpen(false);
      window.open(meetRes.meeting_url, '_blank');
      if (instantPatientId) setRoomToNotify(room);
    } catch (error: any) {
      toastError('Erro ao iniciar com Google Meet', error.message || '');
    } finally {
      setIsCreatingInstantMeet(false);
    }
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
    const url = `${getPublicBaseUrl()}/sala/${room.code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(room.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openWhatsAppShare = (room: VirtualRoom) => {
    const shareUrl = `${getPublicBaseUrl()}/api/virtual-rooms/public/${room.code}/preview`;
    const company = user?.companyName || user?.name || 'seu profissional';
    const message = `*Prepare-se, sua sessão já vai começar com ${company}!* 🌿\n\nPara um melhor aproveitamento da sua consulta:\n📍 Procure um local calmo, iluminado e privado.\n🎧 Use fones de ouvido para sua privacidade e melhor som.\n🛜 Verifique se sua conexão de internet está estável.\n\nAcesse sua sala virtual pelo link abaixo:\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const renderCopyButton = (room: VirtualRoom) => (
    <IconButton
      variant="outline"
      size="sm"
      aria-label="Copiar link"
      title="Copiar link"
      onClick={() => handleCopyLink(room)}
      className={copiedId === room.id ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : undefined}
    >
      {copiedId === room.id ? <Check size={14} /> : <Copy size={14} />}
    </IconButton>
  );

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Video}
          title="Atendimento Online"
          description="Salas seguras com criptografia ponta-a-ponta"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => openCreateModal()}>
                Agendar Sala
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Zap size={14} />}
                loading={isCreatingInstant}
                onClick={handleInstantMeeting}
              >
                Sala Instantânea
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <StatGrid cols={3}>
          <StatCard title="Salas ativas" value={roomStats.total} icon={Video} color="default" delay={0} />
          <StatCard title="Agendadas" value={roomStats.upcoming} icon={Calendar} color="info" delay={1} />
          <StatCard title="Permanentes" value={roomStats.persistent} icon={ShieldCheck} color="success" delay={2} />
        </StatGrid>

        <Tabs<VirtualRoomsTab>
          items={VIRTUAL_ROOMS_TABS}
          value={activeTab}
          onChange={setActiveTab}
          label="Seções do atendimento online"
        >
          {/* ── SALAS TAB ── */}
          {activeTab === 'rooms' && (
            <div className="space-y-3">
              {/* Como funciona — orienta qual tipo de sala usar em cada caso */}
              <PanelCard title="Como funciona o atendimento online" icon={ShieldCheck}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                      <ShieldCheck size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800">Sala interna do Plaelo</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        Criptografada, sem instalar nada. Use "Sala Instantânea" ou "Agendar Sala" — o link é gerado sozinho.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                      <LinkIcon size={14} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800">Link externo (Zoom, Teams...)</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        Já tem uma sala em outro serviço? Cole o link manualmente ao agendar a consulta na Agenda.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-xs font-medium text-primary-600">
                      G
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-800">Google Meet automático — novo</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        Conecte sua conta em <strong>Configurações → Integrações</strong> e gere um link do Meet com um clique direto na Agenda.
                      </p>
                    </div>
                  </div>
                </div>
              </PanelCard>

              {/* Entrar com código */}
              <PanelCard title="Entrar com código" description="Cole o código da sala para entrar direto" icon={LinkIcon}>
                <form onSubmit={handleJoinByCode} className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <Input
                      addonLeft={<Search size={14} />}
                      placeholder="Ex: abc-123-xyz"
                      value={meetingCode}
                      onChange={(e) => setMeetingCode(e.target.value)}
                    />
                  </div>
                  <Button type="submit" variant="primary" size="md" disabled={!meetingCode} iconRight={<ArrowRight size={14} />}>
                    Acessar Sala
                  </Button>
                </form>
              </PanelCard>

              <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 [&>*]:min-w-0">
                {/* Salas permanentes */}
                <PanelCard
                  title="Minhas salas"
                  description="Salas permanentes"
                  icon={History}
                  action={
                    <div className="flex items-center gap-2">
                      {persistentRooms.length > 0 && <Badge color="primary">{persistentRooms.length}</Badge>}
                      <div className="w-full sm:w-44">
                        <FilterLineSearch
                          value={roomSearch}
                          onChange={setRoomSearch}
                          placeholder="Buscar sala..."
                        />
                      </div>
                    </div>
                  }
                  contentClassName="p-0"
                >
                  <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                    {isLoading ? (
                      <div role="status" className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-slate-300" />
                      </div>
                    ) : persistentRooms.length === 0 ? (
                      <EmptyState
                        icon={Video}
                        title="Nenhuma sala permanente"
                        description="Crie uma sala para atender quando quiser"
                        className="border-none bg-transparent py-10"
                      />
                    ) : (
                      persistentRooms.map((room) => (
                        <div key={room.id} className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                            <Video size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-slate-800">{room.title || 'Sem título'}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="rounded border border-primary-100 bg-primary-50 px-1.5 py-0.5 font-mono text-[11px] text-primary-700">
                                {room.code}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {new Date(room.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {renderCopyButton(room)}
                            <IconButton variant="success" size="sm" aria-label="Compartilhar no WhatsApp" title="WhatsApp" onClick={() => openWhatsAppShare(room)}>
                              <Send size={14} />
                            </IconButton>
                            <IconButton variant="primary" size="sm" aria-label="Entrar na sala" title="Entrar na sala" onClick={() => window.open(`/sala/${room.code}`, '_blank')}>
                              <Play size={14} />
                            </IconButton>
                            <IconButton variant="outline" size="sm" aria-label="Excluir sala" title="Excluir" onClick={() => setRoomToDelete(room)} className="text-red-600 hover:bg-red-50">
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </PanelCard>

                {/* Próximas sessões agendadas */}
                <PanelCard
                  title="Próximos atendimentos"
                  description="Sessões agendadas"
                  icon={Calendar}
                  action={
                    <div className="flex items-center gap-2">
                      {upcomingRooms.length > 0 && <Badge color="primary">{upcomingRooms.length}</Badge>}
                      <Badge color="success" dot>Hiper seguro</Badge>
                    </div>
                  }
                  contentClassName="p-0"
                >
                  <div className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
                    {isLoading ? (
                      <div role="status" className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-slate-300" size={24} />
                      </div>
                    ) : upcomingRooms.length === 0 ? (
                      <EmptyState
                        icon={Calendar}
                        title="Sem consultas agendadas"
                        className="border-none bg-transparent py-10"
                        action={
                          <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => openCreateModal()}>
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
                          <div key={room.id} className="flex flex-col gap-3 px-3 py-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center">
                            {/* Date badge */}
                            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-primary-100 bg-primary-50">
                              <span className="text-[11px] text-primary-600">{monthStr}</span>
                              <span className="text-base font-medium leading-tight text-primary-800">{dayNum}</span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-0.5 flex items-center gap-1.5">
                                <Clock size={12} className="text-slate-400" />
                                <span className="text-[11px] text-slate-500">
                                  {timeStr}{endTimeStr ? ` – ${endTimeStr}` : ''}
                                </span>
                              </div>
                              <p className="truncate text-[13px] font-medium text-slate-800">{room.title || 'Sessão sem título'}</p>
                              {room.description && (
                                <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{room.description}</p>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              {renderCopyButton(room)}
                              <IconButton variant="success" size="sm" aria-label="Compartilhar no WhatsApp" title="WhatsApp" onClick={() => openWhatsAppShare(room)}>
                                <Send size={14} />
                              </IconButton>
                              <Button variant="primary" size="sm" iconLeft={<Play size={14} />} onClick={() => window.open(`/sala/${room.code}`, '_blank')}>
                                Entrar
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PanelCard>
              </div>
            </div>
          )}

          {/* ── TRANSCRIÇÕES TAB ── */}
          {activeTab === 'transcricoes' && (
            <div className="space-y-3">
              {/* Aviso: funcionalidade em evolução */}
              <Alert variant="warning" title="A transcrição automática ainda está em evolução.">
                Você pode notar pequenas inconsistências no texto gerado — seguimos ajustando a qualidade.
                A funcionalidade continua liberada para uso; revise o conteúdo antes de considerá-lo definitivo.
              </Alert>

              {/* Histórico */}
              <PanelCard
                title="Histórico de sessões"
                description={!sessionsLoading && sessions.length > 0
                  ? `${filteredSessions.length} de ${sessions.length} sessão${sessions.length !== 1 ? 'ões' : ''}`
                  : undefined}
                icon={FileText}
                action={
                  <Button variant="outline" size="sm" onClick={fetchSessions}>
                    Atualizar
                  </Button>
                }
                contentClassName="p-0"
              >
                <div className="border-b border-slate-100 p-3">
                  <div className="flex flex-wrap items-center gap-2">
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
                    <Button
                      variant={filterHasRecording === true ? 'success' : 'outline'}
                      size="sm"
                      onClick={() => setFilterHasRecording(v => v === true ? null : true)}
                    >
                      Com áudio
                    </Button>
                    <Button
                      variant={filterHasTranscript === true ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setFilterHasTranscript(v => v === true ? null : true)}
                    >
                      Com transcrição
                    </Button>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" iconLeft={<X size={12} />} onClick={clearFilters}>
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>

                {sessionsLoading ? (
                  <div role="status" className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-slate-300" size={28} />
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title={sessions.length === 0 ? 'Nenhuma sessão registrada ainda.' : 'Nenhuma sessão encontrada.'}
                    description={sessions.length === 0 ? 'As transcrições aparecem aqui após encerrar uma sessão.' : 'Tente ajustar os filtros.'}
                    className="border-none bg-transparent py-12"
                    action={hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
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
                          <div className="flex items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-slate-50">
                            <button
                              type="button"
                              onClick={() => toggleSession(session)}
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                                <Mic size={14} />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-[13px] font-medium text-slate-800">
                                  {session.display_title || session.room_title || `Sala #${session.room_id}`}
                                  {session.room_code && (
                                    <span className="ml-2 font-mono text-[11px] text-slate-500">{session.room_code}</span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  {session.patient_name && (
                                    <span className="font-medium text-slate-600">{session.patient_name} · </span>
                                  )}
                                  {formatSessionDate(session.started_at)}
                                  {session.duration_seconds != null && ` · ${formatDuration(session.duration_seconds)}`}
                                </p>
                              </div>
                            </button>
                            <div className="flex shrink-0 items-center gap-2">
                              <span className="hidden sm:inline-flex">
                                <Badge color="primary">{session.transcript_count} linhas</Badge>
                              </span>
                              {session.recording_count > 0 && (
                                <span className="hidden sm:inline-flex">
                                  <Badge color="success">
                                    {session.recording_count} áudio{session.recording_count > 1 ? 's' : ''}
                                  </Badge>
                                </span>
                              )}
                              <IconButton variant="outline" size="sm" aria-label="Renomear / marcar paciente" title="Renomear / marcar paciente" onClick={() => openEditSession(session)}>
                                <Edit3 size={14} />
                              </IconButton>
                              <IconButton variant="outline" size="sm" aria-label="Deletar sessão" title="Deletar sessão" onClick={() => deleteSession(session)} className="text-red-600 hover:bg-red-50">
                                <Trash2 size={14} />
                              </IconButton>
                              <IconButton variant="ghost" size="sm" aria-label={isOpen ? 'Recolher sessão' : 'Expandir sessão'} onClick={() => toggleSession(session)}>
                                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                              </IconButton>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-3">
                              {isLoadingThis ? (
                                <div role="status" className="flex justify-center py-6">
                                  <Loader2 className="animate-spin text-slate-300" size={22} />
                                </div>
                              ) : (
                                <>
                                  <div className="flex flex-wrap gap-2">
                                    {(transcripts?.length ?? 0) > 0 && (
                                      <Button variant="outline" size="sm" iconLeft={<Download size={14} />} onClick={() => downloadTranscript(session)}>
                                        Baixar .txt
                                      </Button>
                                    )}
                                    {(transcripts?.length ?? 0) > 0 && (recordings?.length ?? 0) > 0 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        iconLeft={<Mic size={14} />}
                                        onClick={async () => {
                                          await deleteTranscript(session);
                                          const recs = sessionRecordings[session.session_key];
                                          if (recs?.length) transcribeRecording(recs[0], session);
                                        }}
                                        disabled={deletingTranscript === session.session_key || transcribingRecording !== null}
                                      >
                                        Refazer Transcrição
                                      </Button>
                                    )}
                                  </div>

                                  {(recordings?.length ?? 0) > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-slate-600">Gravações de áudio</p>
                                      {recordings!.map((rec) => (
                                        <div key={rec.id} className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-medium text-slate-700">{rec.file_name}</span>
                                            <div className="flex shrink-0 items-center gap-2">
                                              {rec.duration_seconds != null && (
                                                <span className="text-[11px] text-slate-500">{formatDuration(rec.duration_seconds)}</span>
                                              )}
                                              <a
                                                href={resolveRecordingUrl(rec.file_url)}
                                                download={rec.file_name}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:text-primary-700"
                                                title="Baixar áudio"
                                                aria-label="Baixar áudio"
                                              >
                                                <Download size={14} />
                                              </a>
                                              <IconButton
                                                variant="outline"
                                                size="sm"
                                                aria-label="Deletar gravação"
                                                title="Deletar gravação"
                                                onClick={() => deleteRecording(rec, session)}
                                                disabled={deletingRecording === rec.id}
                                                className="text-red-600 hover:bg-red-50"
                                              >
                                                {deletingRecording === rec.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                              </IconButton>
                                            </div>
                                          </div>
                                          <audio
                                            ref={(el) => { audioRefs.current[`${rec.id}`] = el; }}
                                            controls
                                            className="h-8 w-full"
                                            src={resolveRecordingUrl(rec.file_url)}
                                          />
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            fullWidth
                                            onClick={() => transcribeRecording(rec, session)}
                                            disabled={transcribingRecording === rec.id}
                                            iconLeft={transcribingRecording === rec.id ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
                                          >
                                            {transcribingRecording === rec.id ? 'Transcrevendo...' : 'Transcrever'}
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {(transcripts?.length ?? 0) > 0 ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-slate-600">Transcrição</p>
                                        <Button
                                          variant="ghost"
                                          size="xs"
                                          iconLeft={deletingTranscript === session.session_key ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                          onClick={() => deleteTranscript(session)}
                                          disabled={deletingTranscript === session.session_key}
                                          className="text-red-600 hover:bg-red-50"
                                        >
                                          Deletar
                                        </Button>
                                      </div>
                                      <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-3">
                                        {transcripts!.map((line) => (
                                          <div key={line.id} className="flex gap-2">
                                            <span
                                              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                line.speaker_role === 'host'
                                                  ? 'bg-primary-100 text-primary-700'
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
                                    <p className="py-4 text-center text-xs text-slate-500">Sem transcrição registrada para esta sessão.</p>
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
              </PanelCard>
            </div>
          )}
        </Tabs>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Criar sala virtual"
        subtitle="Cadastre uma sala agendada ou permanente com o padrão do sistema."
        size="lg"
        footer={
          <ModalFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateRoom} loading={isSavingRoom} iconLeft={<Plus size={14} />}>
              Criar sala
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="ds-label mb-1 block">Data início</label>
              <DatePicker
                value={createForm.scheduled_start ? createForm.scheduled_start.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => {
                  const time = prev.scheduled_start?.split('T')[1] || '00:00';
                  return { ...prev, scheduled_start: val ? `${val}T${time}` : '' };
                })}
              />
            </div>
            <Input
              label="Horário início"
              type="time"
              iconLeft={<Clock size={14} />}
              value={createForm.scheduled_start ? createForm.scheduled_start.slice(11, 16) : ''}
              onChange={(e) => setCreateForm((prev) => {
                const date = prev.scheduled_start?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                return { ...prev, scheduled_start: `${date}T${e.target.value}` };
              })}
            />
            <div>
              <label className="ds-label mb-1 block">Data fim</label>
              <DatePicker
                value={createForm.scheduled_end ? createForm.scheduled_end.slice(0, 10) : null}
                onChange={(val) => setCreateForm((prev) => {
                  const time = prev.scheduled_end?.split('T')[1] || '00:00';
                  return { ...prev, scheduled_end: val ? `${val}T${time}` : '' };
                })}
              />
            </div>
            <Input
              label="Horário fim"
              type="time"
              iconLeft={<Clock size={14} />}
              value={createForm.scheduled_end ? createForm.scheduled_end.slice(11, 16) : ''}
              onChange={(e) => setCreateForm((prev) => {
                const date = prev.scheduled_end?.slice(0, 10) || new Date().toISOString().slice(0, 10);
                return { ...prev, scheduled_end: `${date}T${e.target.value}` };
              })}
            />
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

          <div>
            <label className="ds-label mb-1 block">Expira em</label>
            <DatePicker
              value={createForm.expiration_date ? createForm.expiration_date.slice(0, 10) : null}
              onChange={(val) => setCreateForm((prev) => ({ ...prev, expiration_date: val || '' }))}
            />
          </div>

          <div>
            <Input
              label="Link externo (opcional)"
              value={createForm.link}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, link: e.target.value, provider: prev.provider === 'google_meet' ? 'jitsi' : prev.provider }))}
              placeholder="https://..."
            />
            {googleMeetEnabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleGenerateRoomMeetLink}
                loading={generatingRoomMeetLink}
                iconLeft={<span className="text-xs font-medium">G</span>}
              >
                Gerar link do Google Meet
              </Button>
            )}
          </div>

          <Alert variant="info">
            O link é público. O cliente entra sem login usando <code className="font-mono">/sala/{'{codigo}'}</code>.
          </Alert>

          {createdRoom && (
            <Alert
              variant="success"
              title="Sala criada!"
              action={
                <>
                  <Button variant="outline" size="sm" onClick={() => handleCopyLink(createdRoom)}>
                    Copiar link público
                  </Button>
                  <Button variant="success" size="sm" onClick={() => window.open(`/sala/${createdRoom.code}`, '_blank')}>
                    Abrir sala
                  </Button>
                </>
              }
            >
              <span className="break-all">{`${getPublicBaseUrl()}/sala/${createdRoom.code}`}</span>
            </Alert>
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
            <Button variant="ghost" size="sm" onClick={() => setSessionToEdit(null)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={saveSessionEdit} loading={isSavingSessionEdit}>Salvar</Button>
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
            <Button variant="ghost" size="sm" onClick={() => setIsInstantModalOpen(false)}>Cancelar</Button>
            {googleMeetEnabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateInstantGoogleMeet}
                disabled={isCreatingInstantMeet || isCreatingInstant}
                loading={isCreatingInstantMeet}
                iconLeft={<span className="text-xs font-medium">G</span>}
              >
                Google Meet
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleCreateInstantRoom} loading={isCreatingInstant} disabled={isCreatingInstantMeet}>Criar sala</Button>
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
