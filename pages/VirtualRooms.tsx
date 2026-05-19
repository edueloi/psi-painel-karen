import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  History,
  Link as LinkIcon,
  Loader2,
  Play,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  Video,
} from 'lucide-react';
import { api } from '../services/api';
import { Patient, User, VirtualRoom } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
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

export const VirtualRooms: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { pushToast } = useToast();

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
      pushToast('error', 'Erro ao criar sala: ' + (error.message || ''));
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
      pushToast('success', 'Sala criada com sucesso.');
    } catch (error: any) {
      pushToast('error', t('rooms.errorCreate') + ' ' + (error.message || ''));
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
      pushToast('success', 'Sala removida com sucesso.');
    } catch {
      pushToast('error', t('rooms.errorDelete'));
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
        </div>
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
    </PageWrapper>
  );
};
