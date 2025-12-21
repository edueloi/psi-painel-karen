
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Video, Calendar, Clock, Copy, ArrowRight, Link as LinkIcon, 
  Plus, History, Play, Trash2, Loader2, Search, Check, ShieldCheck, X 
} from 'lucide-react';
import { api } from '../services/api';
import { VirtualRoom, Patient, User } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

export const VirtualRooms: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  // State
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
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);
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
      expiration_date: ''
  });

  // Load Rooms
  const fetchRooms = async () => {
    setIsLoading(true);
    try {
        const [data, pts, pros] = await Promise.all([
            api.get<VirtualRoom[]>('/virtual-rooms'),
            api.get<Patient[]>('/patients'),
            api.get<User[]>('/users')
        ]);
        setRooms(data);
        setPatients(pts || []);
        setProfessionals((pros || []).filter(p => p.role !== 'secretario'));
    } catch (e) {
        console.error("Erro ao buscar salas:", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      fetchRooms();
  }, []);

  // Compute Categories
  const matchesQuery = (room: VirtualRoom) => {
      const q = roomSearch.trim().toLowerCase();
      if (!q) return true;
      const title = (room.title || '').toLowerCase();
      const desc = (room.description || '').toLowerCase();
      const code = (room.code || '').toLowerCase();
      return title.includes(q) || desc.includes(q) || code.includes(q);
  };

  const upcomingRooms = useMemo(() => {
      const now = new Date();
      return rooms
        .filter(r => r.scheduled_start && new Date(r.scheduled_start) >= now)
        .filter(matchesQuery)
        .sort((a, b) => new Date(a.scheduled_start!).getTime() - new Date(b.scheduled_start!).getTime());
  }, [rooms, roomSearch]);

  const persistentRooms = useMemo(() => {
      return rooms.filter(r => !r.scheduled_start).filter(matchesQuery);
  }, [rooms, roomSearch]);

  const roomStats = useMemo(() => ({
      total: rooms.length,
      upcoming: upcomingRooms.length,
      persistent: persistentRooms.length
  }), [rooms, upcomingRooms, persistentRooms]);

  const pushToast = (type: 'success' | 'error', message: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts(prev => [...prev, { id, type, message }]);
      window.setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
      }, 3200);
  };

  const generateCode = () => Math.random().toString(36).substr(2, 9);

  const openCreateModal = (preset?: { title?: string; description?: string }) => {
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
          expiration_date: ''
      });
      setIsCreateModalOpen(true);
  };

  // Handlers
  const handleInstantMeeting = async () => {
    openCreateModal({
        title: `${t('rooms.instantTitle')} - ${new Date().toLocaleDateString()}`,
        description: t('rooms.instantDesc')
    });
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
              expiration_date: createForm.expiration_date || null
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
              updated_at: new Date().toISOString()
          };
          setCreatedRoom(room);
          setRooms(prev => [room, ...prev]);
          pushToast('success', 'Sala criada com sucesso.');
      } catch (e: any) {
          pushToast('error', t('rooms.errorCreate') + ' ' + (e.message || ''));
      } finally {
          setIsSavingRoom(false);
      }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      navigate(`/sala/${meetingCode.trim()}`);
    }
  };

  const handleDeleteRoom = async (id: number) => {
      if (window.confirm(t('rooms.deleteConfirm'))) {
          try {
              await api.delete(`/virtual-rooms/${id}`);
              setRooms(prev => prev.filter(r => r.id !== id));
          } catch (e) {
              alert(t('rooms.errorDelete'));
          }
      }
  };

  const handleCopyLink = (room: VirtualRoom) => {
      const url = `${window.location.origin}/sala/${room.code}`;
      navigator.clipboard.writeText(url);
      setCopiedId(room.id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20 px-4 sm:px-6 lg:px-0">
      {toasts.length > 0 && (
        <div className="fixed top-6 right-6 z-[200] space-y-3">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`px-4 py-3 rounded-2xl shadow-xl border text-sm font-bold ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[28px] p-8 bg-slate-950 shadow-2xl shadow-indigo-900/30 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-95"></div>
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-[110px] pointer-events-none"></div>
        <div className="absolute -left-20 bottom-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)]"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <Video size={14} />
                    <span>{t('rooms.badge')}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('rooms.title')}</h1>
                <p className="text-indigo-100 text-lg leading-relaxed max-w-xl">
                    {t('rooms.subtitle')}
                </p>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold text-indigo-100/80">
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">{t('rooms.feature.e2e')}</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">{t('rooms.feature.noApp')}</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">{t('rooms.feature.link')}</span>
                </div>
            </div>
            
            <button 
                onClick={handleInstantMeeting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-3 transition-all hover:-translate-y-1 active:translate-y-0"
            >
                <Plus size={24} />
                {t('rooms.instant')}
            </button>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Criar sala virtual</h4>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Titulo</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                  value={createForm.title}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Sessao de acompanhamento"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Descricao</label>
                <textarea
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm resize-none h-20"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Observacoes para a sala..."
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Inicio</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                    value={createForm.scheduled_start}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, scheduled_start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Fim</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                    value={createForm.scheduled_end}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, scheduled_end: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Paciente</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm bg-white"
                    value={createForm.patient_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  >
                    <option value="">Sem paciente</option>
                    {patients.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Profissional</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm bg-white"
                    value={createForm.professional_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, professional_id: e.target.value }))}
                  >
                    <option value="">Sem profissional</option>
                    {professionals.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Provider</label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm bg-white"
                    value={createForm.provider}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, provider: e.target.value }))}
                  >
                    <option value="jitsi">Jitsi</option>
                    <option value="zoom">Zoom</option>
                    <option value="teams">Teams</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Expira em</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                    value={createForm.expiration_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, expiration_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Link externo (opcional)</label>
                <input
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 text-sm"
                  value={createForm.link}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                O link e publico. O cliente entra sem login usando <code className="font-mono">/sala/{'{codigo}'}</code>.
              </div>

              {createdRoom && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                  <div className="font-semibold text-emerald-700 mb-1">Sala criada</div>
                  <div className="text-xs text-emerald-700 break-all mb-3">
                    {`${window.location.origin}/sala/${createdRoom.code}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(createdRoom)}
                      className="px-3 py-2 text-xs font-semibold bg-white border border-emerald-200 rounded-lg text-emerald-700 hover:bg-emerald-100"
                    >
                      Copiar link publico
                    </button>
                    <button
                      onClick={() => navigate(`/sala/${createdRoom.code}`)}
                      className="px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      Abrir sala
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
                Cancelar
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={isSavingRoom}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {isSavingRoom ? 'Criando...' : 'Criar sala'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('rooms.stats.active')}</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{roomStats.total}</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('rooms.stats.upcoming')}</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{roomStats.upcoming}</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('rooms.stats.persistent')}</div>
          <div className="text-2xl font-display font-bold text-slate-800 mt-2">{roomStats.persistent}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* LEFT: ACTIONS & CODE */}
          <div className="space-y-6">
              
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-indigo-200 via-white to-slate-200 shadow-lg">
                  <div className="bg-white p-8 rounded-[22px] border border-slate-100">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LinkIcon size={20} className="text-indigo-600" /> {t('rooms.enterCode')}
                      </h3>
                      <form onSubmit={handleJoinByCode} className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1 group">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                              <input 
                                type="text" 
                                placeholder={t('rooms.placeholderCode')} 
                                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 font-medium text-slate-700 transition-all"
                                value={meetingCode}
                                onChange={(e) => setMeetingCode(e.target.value)}
                              />
                          </div>
                          <button 
                            type="submit"
                            disabled={!meetingCode}
                            className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                          >
                              {t('rooms.join')} <ArrowRight size={18} />
                          </button>
                      </form>
                  </div>
              </div>

              {/* Persistent Rooms / History */}
              <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-slate-200 via-white to-indigo-200 shadow-lg">
                  <div className="bg-white rounded-[22px] border border-slate-100 overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <h3 className="font-bold text-slate-700 flex items-center gap-2"><History size={18} className="text-indigo-500" /> {t('rooms.history')}</h3>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                              <div className="relative w-full sm:w-56">
                                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    value={roomSearch}
                                    onChange={(e) => setRoomSearch(e.target.value)}
                                    placeholder={t('rooms.search')}
                                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                                  />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2 py-1 rounded-md">{t('rooms.persistent')}</span>
                          </div>
                      </div>
                      
                      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                          {isLoading ? (
                              <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
                          ) : persistentRooms.length === 0 ? (
                              <div className="p-10 text-center text-slate-400 text-sm">{t('rooms.noPersistent')}</div>
                          ) : (
                              persistentRooms.map((room) => (
                                <div key={room.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">{room.title || t('rooms.unnamed')}</h4>
                                            <div className="flex items-center gap-1 text-[10px] font-mono bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                                                {room.code}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400">{t('rooms.createdAt')}: {new Date(room.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2 ml-4">
                                        <button 
                                            onClick={() => handleCopyLink(room)} 
                                            className={`p-2.5 rounded-xl border transition-all ${copiedId === room.id ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-100'}`}
                                            title={t('rooms.copyLink')}
                                        >
                                            {copiedId === room.id ? <Check size={18}/> : <Copy size={18} />}
                                        </button>
                                        <button 
                                            onClick={() => navigate(`/sala/${room.code}`)} 
                                            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md transition-all"
                                            title={t('rooms.join')}
                                        >
                                            <Play size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteRoom(room.id)}
                                            className="p-2.5 bg-white border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-100 rounded-xl transition-all"
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

          {/* RIGHT: UPCOMING ROOMS (SCHEDULED) */}
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-indigo-200 via-white to-slate-200 shadow-lg">
              <div className="bg-white rounded-[22px] border border-slate-100 flex flex-col h-full min-h-[500px]">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-display font-bold text-xl text-slate-800 flex items-center gap-2">
                        <Calendar size={22} className="text-indigo-600" /> {t('rooms.upcoming')}
                      </h3>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                          <ShieldCheck size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{t('rooms.secureBadge')}</span>
                      </div>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4 bg-slate-50/30">
                      {isLoading ? (
                          <div className="h-full flex items-center justify-center py-20 text-slate-300"><Loader2 className="animate-spin" size={32} /></div>
                      ) : upcomingRooms.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10 animate-fadeIn">
                              <div className="w-20 h-20 bg-white border border-slate-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                <Video size={40} className="opacity-10 text-indigo-900" />
                              </div>
                              <p className="font-medium">{t('rooms.noUpcoming')}</p>
                          </div>
                      ) : (
                          upcomingRooms.map(room => (
                              <div key={room.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-5 p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all bg-white relative overflow-hidden">
                                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  
                                  <div className="flex flex-col items-center justify-center bg-indigo-50 border border-indigo-100 rounded-2xl w-16 h-16 shrink-0 shadow-sm transition-transform group-hover:scale-105">
                                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                                        {room.scheduled_start ? new Date(room.scheduled_start).toLocaleString('default', { month: 'short' }) : '-'}
                                      </span>
                                      <span className="text-2xl font-display font-bold text-indigo-900 leading-none">
                                        {room.scheduled_start ? new Date(room.scheduled_start).getDate() : '-'}
                                      </span>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-2">
                                          <Clock size={14} className="text-indigo-400" />
                                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                              {room.scheduled_start ? new Date(room.scheduled_start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                              {room.scheduled_end ? ` - ${new Date(room.scheduled_end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                                          </span>
                                      </div>
                                      <h4 className="font-bold text-slate-800 text-base mb-1 truncate">{room.title || t('rooms.defaultTitle')}</h4>
                                      <p className="text-sm text-slate-400 line-clamp-1">{room.description || t('rooms.noDesc')}</p>
                                  </div>

                                  <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-50">
                                      <button 
                                        className={`p-3 rounded-xl border transition-all ${copiedId === room.id ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                                        title={t('rooms.copyLink')}
                                        onClick={() => handleCopyLink(room)}
                                      >
                                          {copiedId === room.id ? <Check size={20} /> : <Copy size={20} />}
                                      </button>
                                      <button 
                                        onClick={() => navigate(`/sala/${room.code}`)}
                                        className="flex-1 sm:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 group-hover:shadow-indigo-200"
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
  );
};


