import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Comanda, Patient, Service } from '../types';
import { 
  ShoppingBag, Search, Plus, Edit3, Trash2, 
  DollarSign, CheckCircle, X, LayoutGrid, List as ListIcon, 
  CreditCard, Calendar, User, MoreHorizontal, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, FileText,
  AlertTriangle, User as UserIcon, CalendarDays, Info, MessageSquare, Send, Repeat
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';

export const Comandas: React.FC = () => {
  const { t, language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [toasts, setToasts] = useState<{id: number, type: 'success' | 'error', message: string}[]>([]);
  
  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value || 0);
  };

  // Estados
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed'>('open');
  const [dateRangeFilter, setDateRangeFilter] = useState<'today' | 'month' | 'year' | 'all'>('month');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyComanda, setHistoryComanda] = useState<Comanda | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingComanda, setEditingComanda] = useState<Partial<Comanda> | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // States for Comanda Manager Modal
  const [managerTab, setManagerTab] = useState<'atendimentos' | 'pagamentos' | 'pacote'>('atendimentos');
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [newPayment, setNewPayment] = useState({ value: '', date: new Date().toISOString().slice(0, 10), method: 'Pix', receiptCode: '' });

  const handleSavePayment = async () => {
    if (!historyComanda) return;
    try {
        const payload = {
            amount: parseFloat(newPayment.value.replace(/,/g, '.')),
            payment_date: newPayment.date,
            payment_method: newPayment.method,
            receipt_code: newPayment.receiptCode
        };
        await api.post(`/finance/comandas/${historyComanda.id}/payments`, payload);
        
        pushToast('success', 'Pagamento registrado com sucesso!');
        setIsAddPaymentModalOpen(false);
        fetchData();
        
        // update local historyComanda so the modal reflects the new payment immediately
        api.get<Comanda[]>('/finance/comandas').then(res => {
           const updated = res.find(c => c.id === historyComanda.id);
           if (updated) setHistoryComanda(updated);
        });
    } catch (e) {
        pushToast('error', 'Erro ao registrar pagamento.');
    }
  };

  const handleGenerateReceipt = async () => {
    if (!historyComanda) return;
    try {
        const { default: jsPDF } = await import('jspdf');
        const doc = new jsPDF();
        
        doc.setFillColor(79, 70, 229); // indigo-600
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("RECIBO DE PAGAMENTO", 105, 25, { align: "center" });

        doc.setTextColor(60, 60, 60);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        
        doc.text(`Paciente: ${historyComanda.patientName || historyComanda.patient_name || 'Não informado'}`, 20, 60);
        doc.text(`Comanda: #${historyComanda.id}`, 20, 70);
        doc.text(`Referência: ${historyComanda.description || 'Consulta'}`, 20, 80);
        
        doc.setFont("helvetica", "bold");
        doc.text(`VALOR TOTAL: ${formatCurrency(historyComanda.totalValue || historyComanda.total || 0)}`, 20, 100);
        doc.text(`VALOR PAGO: ${formatCurrency(historyComanda.paidValue || 0)}`, 20, 110);
        
        doc.save(`Recibo_Comanda_${historyComanda.id}.pdf`);
        pushToast('success', 'Recibo baixado com sucesso!');
    } catch (e) {
        pushToast('error', 'Erro ao gerar o PDF do recibo.');
    }
  };

  // Carregar Dados
  const fetchData = async () => {
      setIsLoading(true);
      try {
          const [ptsData, srvsData, usrsData, pkgsData] = await Promise.all([
              api.get<any[]>('/patients'),
              api.get<Service[]>('/services'),
              api.get<any[]>('/users'),
              api.get<any[]>('/packages')
          ]);
          
          const mappedPatients = (ptsData || []).map(p => ({
            ...p,
            full_name: p.full_name || p.name || 'Sem nome'
          })) as Patient[];

          setPatients(mappedPatients);
          setServices(srvsData);
          setProfessionals(usrsData || []);
          setPackages(pkgsData || []);
          
          // Carregar comandas reais da API
          try {
            const fetchedComandas = await api.get<Comanda[]>('/finance/comandas');
            setComandas(fetchedComandas || []);
          } catch (e) {
            console.error("Erro ao carregar comandas:", e);
          }
      } catch (e) { 
        console.error(e); 
      } finally { 
        setIsLoading(false); 
      }
  };

  useEffect(() => {
      fetchData();
  }, []);
  
  // Abrir comanda automaticamente se vier redirecionado da agenda
  useEffect(() => {
    const state = location.state as { openComandaId?: string };
    if (state?.openComandaId && comandas.length > 0) {
      const comanda = comandas.find(c => String(c.id) === String(state.openComandaId));
      if (comanda) {
        setEditingComanda({ 
          ...comanda,
          patientId: comanda.patient_id || comanda.patientId,
          professionalId: comanda.professional_id || comanda.professionalId,
          startDate: comanda.start_date || comanda.startDate,
          totalValue: comanda.total || comanda.totalValue
        });
        setIsModalOpen(true);
        // Limpa o state para não reabrir em refresh
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, comandas]);

  // Lógica de Filtragem
  const filteredComandas = useMemo(() => {
      return comandas.filter(c => {
          const patientName = c.patientName || c.patient_name || '';
          const description = c.description || '';
          const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                description.toLowerCase().includes(searchTerm.toLowerCase());
          
          if (statusFilter !== c.status) return false;

          if (statusFilter === 'closed') {
              const date = new Date(c.updated_at || c.createdAt);
              const now = new Date();
              if (dateRangeFilter === 'today') {
                  if (date.toDateString() !== now.toDateString()) return false;
              } else if (dateRangeFilter === 'month') {
                  if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
              } else if (dateRangeFilter === 'year') {
                  if (date.getFullYear() !== now.getFullYear()) return false;
              }
          }

          return matchesSearch;
      });
  }, [comandas, searchTerm, statusFilter, dateRangeFilter]);

  // Estatísticas
  const stats = useMemo(() => {
      const total = comandas.reduce((acc, c) => acc + (c.totalValue || 0), 0);
      const open = comandas.filter(c => c.status === 'open').reduce((acc, c) => acc + (c.totalValue || 0), 0);
      const paid = comandas.filter(c => c.status === 'closed').reduce((acc, c) => acc + (c.totalValue || 0), 0);
      return { total, open, paid };
  }, [comandas]);

  // Ações
  const handleOpenModal = (comanda?: Comanda) => {
      if (comanda) {
          setEditingComanda({ ...comanda });
      } else {
          setEditingComanda({
              status: 'open',
              items: [],
              totalValue: 0,
              paidValue: 0,
              description: '',
              patientId: '',
              professionalId: '',
              startDate: new Date().toISOString().slice(0, 16),
              duration_minutes: 60
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      if (!editingComanda?.patientId) return;
      
      try {
        const payload = {
          patient_id: editingComanda.patientId || (editingComanda as any).patient_id,
          professional_id: editingComanda.professionalId || (editingComanda as any).professional_id,
          description: editingComanda.description,
          status: editingComanda.status,
          items: editingComanda.items,
          discount: 0,
          start_date: editingComanda.startDate || (editingComanda as any).start_date,
          duration_minutes: editingComanda.duration_minutes || 60,
          payment_method: editingComanda.payment_method || 'pending',
          sessions_total: editingComanda.sessions_total || 0,
          sessions_used: editingComanda.sessions_used || 0
        };

        if (editingComanda.id) {
            await api.put(`/finance/comandas/${editingComanda.id}`, payload);
            pushToast('success', 'Comanda atualizada!');
        } else {
            await api.post('/finance/comandas', payload);
            pushToast('success', 'Comanda criada!');
        }
        
        fetchData();
        setIsModalOpen(false);
      } catch (err) {
        console.error("Erro ao salvar comanda:", err);
        pushToast('error', "Erro ao salvar comanda.");
      }
  };

  const handleQuickStatusToggle = async (comanda: Comanda) => {
    try {
      const newStatus = comanda.status === 'open' ? 'closed' : 'open';
      await api.put(`/finance/comandas/${comanda.id}`, {
        ...comanda,
        status: newStatus,
        start_date: comanda.startDate || (comanda as any).start_date || null
      });
      fetchData();
      pushToast('success', `Comanda ${newStatus === 'closed' ? 'paga' : 'reaberta'}!`);
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao mudar status');
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await api.delete(`/finance/comandas/${deleteConfirmId}`);
        setComandas(prev => prev.filter(c => c.id !== deleteConfirmId));
        pushToast('success', 'Comanda removida!');
      } catch {
        pushToast('error', 'Erro ao remover comanda.');
      }
      setDeleteConfirmId(null);
    }
  };
  
  const handleUpdateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status: newStatus });
      fetchData(); // Recarrega tudo para atualizar progresso
      if (historyComanda) {
        // Atualiza a comanda no histórico localmente se necessário, ou apenas fecha e abre
        const refreshed = await api.get<Comanda[]>('/finance/comandas');
        const updated = refreshed.find(c => c.id === historyComanda.id);
        if (updated) setHistoryComanda(updated);
      }
      pushToast('success', `Status atualizado para ${newStatus}`);
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao atualizar agendamento');
    }
  };

  const handleAddItem = () => {
      if (!editingComanda) return;
    const newItem: any = { id: Math.random().toString(), name: '', value: 0, qty: 1 };
      setEditingComanda({
          ...editingComanda,
          items: [...(editingComanda.items || []), newItem]
      });
  };

  const StatusBadge = ({ status }: { status: string }) => {
      const styles = {
          open: 'bg-amber-50 text-amber-600 border-amber-100',
          closed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
          cancelled: 'bg-slate-50 text-slate-500 border-slate-100'
      };
      return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status as keyof typeof styles]}`}>
              {status === 'closed' ? 'Pago' : status === 'open' ? 'Aberto' : 'Cancelado'}
          </span>
      );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toasts.length > 0 && (
        <div className="fixed right-6 top-6 z-[60] space-y-2">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg border ${t.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}
            >
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-sm">
                <ShoppingBag size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Gestão de Comandas</h1>
                <p className="text-xs text-slate-500 mt-0.5">Controle seus atendimentos e pacotes de sessões</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenModal()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-sm"
              >
                <Plus size={14} /> NOVA COMANDA
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <FileText size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.total)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Clock size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black tracking-widest text-amber-500 uppercase">Em Aberto</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.open)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <CheckCircle2 size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black tracking-widest text-emerald-500 uppercase">Total Recebido</p>
                  <p className="text-xl font-black text-slate-800">{formatCurrency(stats.paid)}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder="Pesquisar por paciente ou descrição..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
              {/* Status Tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 lg:flex-none">
                  {[
                      { id: 'open', label: 'Em Aberto' },
                      { id: 'closed', label: 'Finalizadas' }
                  ].map(st => (
                      <button 
                          key={st.id}
                          onClick={() => setStatusFilter(st.id as any)}
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === st.id ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-indigo-400'}`}
                      >
                          {st.label}
                      </button>
                  ))}
              </div>

              {/* Date Filters for Closed */}
              {statusFilter === 'closed' && (
                  <div className="flex bg-slate-50 border border-slate-100 p-1 rounded-xl">
                      {[
                          { id: 'today', label: 'Hoje' },
                          { id: 'month', label: 'Mês' },
                          { id: 'year', label: 'Ano' },
                          { id: 'all', label: 'Tudo' }
                      ].map(d => (
                          <button 
                              key={d.id}
                              onClick={() => setDateRangeFilter(d.id as any)}
                              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${dateRangeFilter === d.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                          >
                              {d.label}
                          </button>
                      ))}
                  </div>
              )}

              {/* View Toggle */}
              <div className="flex gap-1.5 border border-slate-200 bg-white p-1.5 rounded-2xl shadow-sm">
                  <button onClick={() => setViewMode('kanban')} className={`p-2 rounded-xl transition-all ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-300'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-300'}`}><ListIcon size={18}/></button>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between px-3">
              <div className={`flex items-center gap-3 text-indigo-600 font-black text-[11px] uppercase tracking-[0.2em]`}>
                  {statusFilter === 'open' ? <Clock size={16}/> : <CheckCircle2 size={16}/>}
                  {statusFilter === 'open' ? 'Comandas em Aberto' : 'Comandas Finalizadas'}
                  <span className="px-2 py-0.5 bg-indigo-50 rounded-lg border border-indigo-100 text-[10px]">
                    {filteredComandas.length}
                  </span>
              </div>
          </div>

          {viewMode === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredComandas.map(comanda => (
                      <div 
                        key={comanda.id} 
                        onClick={() => { setHistoryComanda(comanda); setIsHistoryOpen(true); }}
                        className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative cursor-pointer"
                      >
                          <div className="flex justify-between items-start mb-5">
                              <div className="flex items-center gap-4">
                                  <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-[12px] font-black shadow-lg shadow-indigo-100`}>
                                      {(comanda.patientName || comanda.patient_name || 'P').split(' ').map(n => n[0]).join('').toUpperCase()}
                                  </div>
                                  <div>
                                      <h4 className="font-black text-slate-800 text-[13px]">{comanda.patientName || comanda.patient_name}</h4>
                                      <div className="flex items-center gap-2">
                                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{comanda.id}</p>
                                          {(comanda.sessions_total || 0) > 0 && (
                                              <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">
                                                  {comanda.sessions_used || 0}/{comanda.sessions_total} SESSÕES
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </div>
                              <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => handleOpenModal(comanda)} className="p-2.5 bg-slate-50 hover:bg-indigo-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Edit3 size={14}/></button>
                                  <button onClick={() => setDeleteConfirmId(comanda.id)} className="p-2.5 bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all border border-transparent hover:border-red-100"><Trash2 size={14}/></button>
                              </div>
                          </div>
                          
                          <div className="mb-5">
                              <div className="bg-slate-50/50 border border-slate-100/50 p-3.5 rounded-3xl">
                                  <div className="text-xs font-bold text-slate-600 flex items-center gap-2.5 leading-relaxed">
                                      <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0"><FileText size={12}/></div>
                                      <span className="truncate">{comanda.description || 'Sem descrição'}</span>
                                  </div>
                              </div>
                              <div className="mt-3 flex items-center justify-between text-[10px] font-black text-slate-400 px-1">
                                  <span className="flex items-center gap-1.5"><Calendar size={13}/> {new Date(comanda.createdAt || new Date()).toLocaleDateString()}</span>
                                  {comanda.next_appointment && (
                                      <span className="text-indigo-400 flex items-center gap-1.5"><ArrowUpRight size={13}/> Prox: {new Date(comanda.next_appointment).toLocaleDateString()}</span>
                                  )}
                              </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                              <div className="flex items-center gap-3">
                                  <div className="text-base font-black text-indigo-600">
                                      {formatCurrency(comanda.totalValue || comanda.total)}
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleQuickStatusToggle(comanda); }}
                                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${comanda.status === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100'}`}
                                    title={comanda.status === 'open' ? 'Marcar como Pago' : 'Reabrir'}
                                  >
                                      {comanda.status === 'open' ? 'PAGAR' : 'ABRIR'}
                                  </button>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-black text-slate-300">
                                  <Clock size={12}/> Ver Detalhes
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] border-b border-slate-100">
                      <tr>
                          <th className="px-8 py-5">Status</th>
                          <th className="px-8 py-5">Paciente</th>
                          <th className="px-8 py-5">Descrição</th>
                          <th className="px-8 py-5">Valor</th>
                          <th className="px-8 py-5 text-right">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                      {filteredComandas.map(c => (
                          <tr key={c.id} className="group hover:bg-indigo-50/30 transition-all cursor-pointer" onClick={() => { setHistoryComanda(c); setIsHistoryOpen(true); }}>
                               <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                        onClick={() => handleQuickStatusToggle(c)} 
                                        className="transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <StatusBadge status={c.status} />
                                    </button>
                               </td>
                              <td className="px-8 py-5">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black border border-indigo-100 shrink-0">
                                          {(c.patientName || c.patient_name || 'P').split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </div>
                                      <div className="flex flex-col">
                                          <span className="font-black text-slate-700 text-sm whitespace-nowrap">{c.patientName || c.patient_name}</span>
                                          {(c.sessions_total || 0) > 0 && (
                                              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">
                                                  {c.sessions_used || 0}/{c.sessions_total} Sessões
                                              </span>
                                          )}
                                      </div>
                                  </div>
                              </td>
                              <td className="px-8 py-5">
                                  <div className="max-w-[200px] truncate text-xs font-bold text-slate-400">{c.description}</div>
                              </td>
                              <td className="px-8 py-5">
                                  <span className="font-black text-slate-800">{formatCurrency(c.totalValue)}</span>
                              </td>
                              <td className="px-8 py-5 text-right">
                                  <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
                                      <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={14}/></button>
                                      <button onClick={() => setDeleteConfirmId(c.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}
      </div>

      {/* MODAL LANÇAMENTO */}
      <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Detalhes da Comanda"
          subtitle={editingComanda?.id ? `#${editingComanda.id} • ${editingComanda.patientName || 'Novo Registro'}` : 'Novo Lançamento'}
          maxWidth="max-w-2xl"
          footer={
            <div className="flex justify-between items-center w-full gap-4">
               <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="uppercase tracking-widest text-[10px] font-black">
                  Cancelar
               </Button>
               <Button 
                onClick={handleSave} 
                className="px-10 h-11 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-indigo-600/20 uppercase tracking-widest text-[10px] font-black transition-all transform active:scale-95"
               >
                  <CheckCircle size={18} className="mr-2"/> SALVAR ALTERAÇÕES
               </Button>
            </div>
          }
      >
          <div className="space-y-8 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* IDENTIFICAÇÃO */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Identificação</h4>
                      </div>

                      <Select 
                        label="Paciente" 
                        icon={<User size={18} className="text-indigo-400" />}
                        value={editingComanda?.patientId || ''} 
                        onChange={e => setEditingComanda({...editingComanda!, patientId: e.target.value})}
                      >
                          <option value="">Selecionar paciente...</option>
                          {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                      </Select>

                      <Select 
                        label="Status" 
                        value={editingComanda?.status || 'open'} 
                        onChange={e => setEditingComanda({...editingComanda!, status: e.target.value as any})}
                      >
                          <option value="open">Em Aberto</option>
                          <option value="closed">Pago</option>
                          <option value="cancelled">Cancelado</option>
                      </Select>

                      <Input 
                        label="Descrição" 
                        icon={<FileText size={18} className="text-slate-400" />}
                        placeholder="Ex: Consulta Avulsa"
                        value={editingComanda?.description || ''} 
                        onChange={e => setEditingComanda({...editingComanda!, description: e.target.value})}
                      />
                  </div>

                  {/* VALORES E SESSÕES */}
                  <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full"></div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Financeiro</h4>
                      </div>

                      <Input 
                        label="Valor Total" 
                        type="number"
                        icon={<DollarSign size={18} className="text-emerald-500" />}
                        value={editingComanda?.totalValue || editingComanda?.total || 0} 
                        onChange={e => setEditingComanda({...editingComanda!, totalValue: parseFloat(e.target.value)})}
                      />

                      <Select 
                        label="Profissional Responsável" 
                        icon={<User size={18} className="text-indigo-400" />}
                        value={editingComanda?.professionalId || ''} 
                        onChange={e => setEditingComanda({...editingComanda!, professionalId: e.target.value})}
                      >
                          <option value="">Selecionar profissional...</option>
                          {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </Select>

                      <Input 
                        label="Data Prevista" 
                        type="datetime-local"
                        icon={<Calendar size={18} className="text-slate-400" />}
                        value={editingComanda?.startDate ? editingComanda.startDate.slice(0, 16) : ''} 
                        onChange={e => setEditingComanda({...editingComanda!, startDate: e.target.value})}
                      />
                  </div>
              </div>

              {/* SERVIÇOS E ITENS */}
              <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                      <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                          <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Serviços / Itens</h4>
                      </div>
                      <button 
                          type="button"
                          onClick={() => {
                              const newItem = { id: Date.now().toString(), name: 'Novo Serviço', price: 0, qty: 1, type: 'service' };
                              setEditingComanda({...editingComanda!, items: [...(editingComanda?.items || []), newItem]});
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-indigo-100 rounded-xl font-black text-indigo-600 uppercase text-[9px] hover:bg-indigo-50 transition-all shadow-sm"
                      >
                          <Plus size={12}/> ADICIONAR ITEM
                      </button>
                  </div>
                  
                  <div className="space-y-3">
                      {(editingComanda?.items || []).map((item: any, idx: number) => (
                          <div key={item.id || idx} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-200/50 flex flex-col gap-4 group">
                              <div className="flex gap-4 items-start">
                                  <div className="flex-1">
                                    <Select 
                                      value={item.service_id || item.package_id || ''}
                                      onChange={(e) => {
                                          const val = e.target.value;
                                          const isPkg = val.startsWith('pkg_');
                                          const id = isPkg ? val.replace('pkg_', '') : val;
                                          const source = isPkg ? packages : services;
                                          const found = source.find(s => String(s.id) === String(id));
                                          
                                          const newItems = [...(editingComanda?.items || [])];
                                          newItems[idx] = {
                                              ...newItems[idx],
                                              name: found?.name || 'Item',
                                              price: found?.price || found?.totalPrice || 0,
                                              [isPkg ? 'package_id' : 'service_id']: id,
                                              type: isPkg ? 'package' : 'service'
                                          };
                                          if (isPkg) delete newItems[idx].service_id;
                                          else delete newItems[idx].package_id;

                                          const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * (curr.qty || 1)), 0);
                                          setEditingComanda({...editingComanda!, items: newItems, totalValue: newTotal});
                                      }}
                                    >
                                        <option value="">Selecionar...</option>
                                        <optgroup label="Serviços Individuais">
                                            {services.map(s => <option key={s.id} value={s.id}>{s.name} - {formatCurrency(s.price)}</option>)}
                                        </optgroup>
                                        <optgroup label="Pacotes">
                                            {packages.map(p => <option key={p.id} value={`pkg_${p.id}`}>{p.name} - {formatCurrency(p.totalPrice)}</option>)}
                                        </optgroup>
                                    </Select>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                        const newItems = editingComanda!.items.filter((_: any, i: number) => i !== idx);
                                        const newTotal = newItems.reduce((acc: number, curr: any) => acc + (curr.price * (curr.qty || 1)), 0);
                                        setEditingComanda({...editingComanda!, items: newItems, totalValue: newTotal});
                                    }}
                                    className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                                  >
                                      <Trash2 size={18}/>
                                  </button>
                              </div>
                              <div className="flex items-center justify-between gap-4 px-1">
                                  <div className="flex items-center gap-3">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qtd</span>
                                      <input 
                                        type="number" 
                                        className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-black text-slate-700 outline-none focus:border-indigo-400"
                                        value={item.qty || 1}
                                        onChange={(e) => {
                                            const newItems = [...(editingComanda?.items || [])];
                                            newItems[idx].qty = parseInt(e.target.value) || 1;
                                            const newTotal = newItems.reduce((acc, curr) => acc + (curr.price * (curr.qty || 1)), 0);
                                            setEditingComanda({...editingComanda!, items: newItems, totalValue: newTotal});
                                        }}
                                      />
                                  </div>
                                  <div className="text-sm font-black text-indigo-600 bg-indigo-50/50 px-4 py-1.5 rounded-xl border border-indigo-100/50">
                                      {formatCurrency(item.price * (item.qty || 1))}
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* PROGRESSO E NOTAS */}
              <div className="space-y-6">
                  {(editingComanda?.sessions_total || 0) > 1 && (
                      <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50">
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progresso do Pacote</span>
                              <span className="text-xs font-black text-indigo-600 bg-white px-3 py-1 rounded-full border border-indigo-100">
                                {editingComanda?.sessions_used}/{editingComanda?.sessions_total} Sessões
                              </span>
                          </div>
                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden shadow-inner">
                              <div 
                                  className="bg-indigo-500 h-full transition-all duration-1000 ease-out shadow-lg shadow-indigo-200" 
                                  style={{ width: `${Math.min(((editingComanda?.sessions_used || 0) / (editingComanda?.sessions_total || 1)) * 100, 100)}%` }}
                              ></div>
                          </div>
                      </div>
                  )}

                  <TextArea 
                    label="Observações Privadas" 
                    placeholder="Adicione detalhes internos sobre este faturamento..."
                    value={editingComanda?.notes || ''} 
                    onChange={e => setEditingComanda({...editingComanda!, notes: e.target.value})}
                    className="min-h-[120px] !rounded-[2rem]"
                  />
              </div>
          </div>
      </Modal>

      {/* COMANDA MANAGER MODAL */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Comanda - ${historyComanda?.description || 'Detalhes'}`}
        maxWidth="max-w-6xl"
      >
        <div className="flex flex-col lg:flex-row gap-8 py-2 min-h-[500px]">
            {/* LEFT SIDEBAR - PATIENT & SUMMARY */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6 border-r border-slate-100 pr-0 lg:pr-8">
                {/* Patient Basic Info */}
                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                            <UserIcon size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-black text-slate-800 truncate uppercase tracking-tight">
                                    {historyComanda?.patientName || historyComanda?.patient_name || 'Paciente'}
                                </h4>
                                <div className="flex gap-1">
                                    <button className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><MessageSquare size={16}/></button>
                                    <button className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><Send size={16}/></button>
                                </div>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 truncate lowercase">{patients.find(p => String(p.id) === String(historyComanda?.patientId))?.email || 'sem email cadastrado'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                            <CalendarDays size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Data de Criação</p>
                            <p className="text-xs font-black text-slate-700">{historyComanda?.createdAt ? new Date(historyComanda.createdAt).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { dateStyle: 'medium'}) : 'N/A'}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                            <Info size={24} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Detalhes</p>
                            <p className="text-xs font-black text-slate-700">
                                {historyComanda?.description || 'Comanda'}
                                {historyComanda?.sessions_total ? ` (${historyComanda.sessions_total})` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* YELLOW SUMMARY CARD */}
                <div className="mt-4 bg-orange-400 rounded-3xl p-6 text-white shadow-xl shadow-orange-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                        <DollarSign size={80} strokeWidth={3} />
                    </div>
                    <div className="relative z-10">
                        <h4 className="text-xs font-black uppercase tracking-widest mb-6 opacity-90">Resumo:</h4>
                        
                        <div className="space-y-4">
                            {(() => {
                                const total = historyComanda?.totalValue || historyComanda?.total || 0;
                                const paid = historyComanda?.paidValue || 0;
                                const pending = total - paid;

                                return (
                                    <>
                                        <div className="flex justify-between items-center border-b border-white/20 pb-3">
                                            <span className="text-[11px] font-bold opacity-80 uppercase">Total da comanda:</span>
                                            <span className="text-sm font-black tracking-tight">{formatCurrency(total)}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/20 pb-3">
                                            <span className="text-[11px] font-bold opacity-80 uppercase">Valor pago:</span>
                                            <span className="text-sm font-black tracking-tight">{formatCurrency(paid)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-[11px] font-bold opacity-90 uppercase">Valor pendente:</span>
                                            <span className="text-lg font-black tracking-tighter">{formatCurrency(pending)}</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>

                {/* BOTTOM ACTIONS */}
                <div className="mt-auto space-y-3 pt-6 border-t border-slate-50">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setNewPayment({ 
                                    value: '', 
                                    date: new Date().toISOString().slice(0, 10), 
                                    method: 'Pix',
                                    receiptCode: historyComanda?.receipt_code || ''
                                });
                                setIsAddPaymentModalOpen(true);
                            }}
                            className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all active:scale-95"
                        >
                            ADICIONAR PAGAMENTO
                        </button>
                        <button 
                            onClick={handleGenerateReceipt}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <FileText size={14}/> GERAR RECIBO
                        </button>
                    </div>
                    <button 
                        onClick={() => setIsHistoryOpen(false)}
                        className="w-full py-3 text-rose-500 hover:text-rose-600 text-[10px] font-black uppercase tracking-widest transition-all text-center border border-rose-100 rounded-xl hover:bg-rose-50/30"
                    >
                        FECHAR COMANDA
                    </button>
                </div>
            </div>

            {/* RIGHT MAIN CONTENT - TABS & LISTS */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-white sticky top-0 z-20 mb-6">
                    {[
                        { id: 'atendimentos', label: 'ATENDIMENTOS' },
                        { id: 'pagamentos', label: 'HISTÓRICO DE PAGAMENTOS' },
                        { id: 'pacote', label: 'USO DO PACOTE' },
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setManagerTab(tab.id as any)}
                            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${managerTab === tab.id ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[500px]">
                    {managerTab === 'atendimentos' && (
                        <div className="animate-fadeIn">
                            <div className="bg-slate-50 py-3 px-6 text-center rounded-xl mb-4 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Atendimentos</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b border-slate-100">
                                        <tr>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Data</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Horario</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const cmndApts = (historyComanda?.appointments || []).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                                            
                                            if (cmndApts.length === 0) return (
                                                <tr><td colSpan={3} className="py-12 text-center text-slate-400 text-xs italic">Nenhum atendimento vinculado.</td></tr>
                                            );

                                            return cmndApts.map((apt: any, idx: number) => {
                                                const dDate = new Date(apt.start_time);
                                                const dEnd = new Date(dDate.getTime() + (apt.duration_minutes || 50) * 60000);
                                                return (
                                                    <tr key={apt.id || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                                                        <td className="py-5 px-4 flex flex-col">
                                                            <span className="text-[9px] font-black text-indigo-400 uppercase mb-1">{apt.recurrence_index || idx + 1} de {apt.recurrence_count || cmndApts.length}</span>
                                                            <span className="text-xs font-bold text-slate-700 uppercase">{dDate.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            <span className="text-xs font-black text-slate-400 tabular-nums">{dDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {dEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </td>
                                                        <td className="py-5 px-4">
                                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                                                                apt.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                                                                apt.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'
                                                            }`}>{apt.status}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {managerTab === 'pagamentos' && (
                        <div className="animate-fadeIn">
                             <div className="bg-slate-50 py-3 px-6 text-center rounded-xl mb-4 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Histórico de Transações</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Valor</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Forma de pgto.</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Data</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Recibo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            if (!historyComanda?.paidValue || historyComanda.paidValue === 0) return (
                                                <tr><td colSpan={4} className="py-12 text-center text-slate-400 text-xs italic">Nenhum pagamento registrado.</td></tr>
                                            );
                                            
                                            // Mock default view, since the DB model implementation for individual comanda_payments is tied in Agenda.tsx mostly via fetch
                                            return (
                                                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-all group">
                                                    <td className="py-5 px-4">
                                                        <span className="text-sm font-black text-emerald-600">{formatCurrency(historyComanda.paidValue)}</span>
                                                    </td>
                                                    <td className="py-5 px-4 italic text-xs text-slate-500 font-bold uppercase">Pagamento Registrado</td>
                                                    <td className="py-5 px-4 text-xs font-black text-slate-400">{new Date(historyComanda.updated_at || historyComanda.createdAt).toLocaleDateString()}</td>
                                                    <td className="py-5 px-4">
                                                        <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 tracking-tighter shadow-sm">#{historyComanda.receipt_code || 'N/A'}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {managerTab === 'pacote' && (
                        <div className="animate-fadeIn">
                            <div className="bg-slate-50 py-3 px-6 text-center rounded-xl mb-4 border border-slate-100">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Uso do Pacote</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Serviço</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Utilizados</th>
                                            <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Restante</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const used = historyComanda?.sessions_used || 0;
                                            const total = historyComanda?.sessions_total || 0;
                                            const remaining = total - used;
                                            
                                            if (!historyComanda) return null;

                                            return (
                                                <tr className="border-b border-slate-50">
                                                    <td className="py-6 px-4">
                                                        <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">{historyComanda?.description || 'Serviço do Pacote'}</p>
                                                    </td>
                                                    <td className="py-6 px-4 text-center text-xs font-black text-slate-400 tabular-nums">{total}</td>
                                                    <td className="py-6 px-4 text-center text-xs font-black text-indigo-600 tabular-nums">{used}</td>
                                                    <td className="py-6 px-4 text-center">
                                                        {total > 0 && remaining === 0 ? (
                                                            <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-rose-100">Esgotado</span>
                                                        ) : total > 0 ? (
                                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">{remaining} Restantes</span>
                                                        ) : (
                                                            <span className="text-[9px] font-bold text-slate-400 italic">Avulso</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </Modal>

      {/* ADD PAYMENT MODAL */}
      <Modal
        isOpen={isAddPaymentModalOpen}
        onClose={() => setIsAddPaymentModalOpen(false)}
        title="Novo Pagamento"
        maxWidth="max-w-xl"
      >
        <div className="space-y-8 py-4">
            <div className="space-y-6">
                <Input 
                    label="Data do Pagamento" 
                    type="date"
                    value={newPayment.date}
                    onChange={e => setNewPayment({...newPayment, date: e.target.value})}
                />
                
                <Select 
                    label="Forma de pagamento" 
                    value={newPayment.method}
                    onChange={e => setNewPayment({...newPayment, method: e.target.value})}
                >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência">Transferência</option>
                </Select>

                <Input 
                    label="Valor" 
                    placeholder="R$ 0,00"
                    type="number"
                    value={newPayment.value}
                    onChange={e => setNewPayment({...newPayment, value: e.target.value})}
                />

                <Input 
                    label="Código do Recibo (Opcional)" 
                    placeholder="Ex: REC-123"
                    value={newPayment.receiptCode}
                    onChange={e => setNewPayment({...newPayment, receiptCode: e.target.value})}
                />
            </div>

            <div className="flex justify-end pr-2">
                {(() => {
                    const total = parseFloat(String(historyComanda?.totalValue || historyComanda?.total || 0));
                    const paid = parseFloat(String(historyComanda?.paid_value || historyComanda?.paidValue || 0));
                    const remaining = total - paid;
                    return (
                        <span className={`text-[11px] font-black uppercase tracking-widest ${remaining > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            Valor restante: {formatCurrency(remaining)}
                        </span>
                    );
                })()}
            </div>

            <div className="flex gap-4 pt-4 border-t border-slate-50">
                <Button 
                    variant="ghost" 
                    onClick={() => setIsAddPaymentModalOpen(false)} 
                    className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-none hover:bg-slate-50"
                >
                    FECHAR
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleSavePayment}
                    className="flex-1 bg-indigo-600 text-white hover:bg-slate-900 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                    SALVAR PAGAMENTO
                </Button>
            </div>
        </div>
      </Modal>
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3">Excluir Comanda?</h3>
              <p className="text-sm font-bold text-slate-400 mb-8 leading-relaxed">
                Esta ação é irreversível. Todas as informações ligadas a este lançamento serão perdidas.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 transition-all"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   DESISTIR
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border animate-slideIn ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {t.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
};