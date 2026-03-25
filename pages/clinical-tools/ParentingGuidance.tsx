import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Settings,
  ClipboardList,
  Save,
  Trash2,
  Calendar,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layout,
  BookOpen,
  Plus,
  Users
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Button';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Patient } from '../../types';
import { api } from '../../services/api';

interface RoutineItem {
  id: string | number;
  time: string;
  activity: string;
  status: 'pending' | 'success' | 'need_improvement';
}

interface ContingencyPlan {
  behavior: string;
  consequence: string;
  type: 'positive' | 'negative' | 'natural';
}

interface ParentingData {
  routine: RoutineItem[];
  contingencies: ContingencyPlan[];
  goals: string[];
  updated_at: string;
}

export const ParentingGuidancePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const [data, setData] = useState<ParentingData>({
    routine: [],
    contingencies: [],
    goals: [],
    updated_at: new Date().toISOString()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newRoutine, setNewRoutine] = useState<Partial<RoutineItem>>({ time: '', activity: '', status: 'pending' });

  // Carregar lista de pacientes
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const raw = await api.get<any[]>('/patients');
        setPatients((raw || []).map((p: any) => ({
          ...p,
          full_name: p.name || p.full_name || '',
          status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedPatientId) {
        setData({
          routine: [],
          contingencies: [],
          goals: [],
          updated_at: new Date().toISOString()
        });
        return;
      }
      try {
        const response = await fetch(`/api/clinical-tools/${selectedPatientId}/parenting-guidance`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && typeof json === 'object') {
            setData({
              routine: json.routine || [],
              contingencies: json.contingencies || [],
              goals: json.goals || [],
              updated_at: json.updated_at || new Date().toISOString()
            });
          }
        } else {
          setData({
            routine: [],
            contingencies: [],
            goals: [],
            updated_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    loadData();
  }, [selectedPatientId]);

  const handleSave = async (updatedData = data) => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione o prontuário dos pais para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...updatedData, updated_at: new Date().toISOString() };
      const response = await fetch(`/api/clinical-tools/${selectedPatientId}/parenting-guidance`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          data: payload
        })
      });

      if (response.ok) {
        setData(payload);
        success('Orientação Sincronizada', 'O plano de orientação parental foi atualizado com sucesso.');
      } else {
        throw new Error();
      }
    } catch (err) {
      error('Erro', 'Não foi possível salvar os registros.');
    } finally {
      setIsSaving(false);
    }
  };

  const addRoutineItem = () => {
    if (!newRoutine.time || !newRoutine.activity) return;
    const updated = { ...data, routine: [...data.routine, { ...newRoutine, id: Date.now() } as RoutineItem] };
    setData(updated);
    setNewRoutine({ time: '', activity: '', status: 'pending' });
    handleSave(updated);
  };

  const removeRoutineItem = (id: string | number) => {
    const updated = { ...data, routine: data.routine.filter(r => r.id !== id) };
    setData(updated);
    handleSave(updated);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Orientação de Pais & Parentalidade"
        subtitle={selectedPatientId ? `Paciente: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}` : "Construção de rotinas visuais e manejo de contingências comportamentais."}
        icon={<UserCheck className="text-amber-500" />}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Lado Esquerdo - Seleção de Paciente */}
        <div className="space-y-6">
          <ClinicalSidebar 
            patients={patients}
            selectedPatientId={selectedPatientId ? String(selectedPatientId) : null}
            onSelectPatient={(id) => setSelectedPatientId(id)}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoadingPatients}
            t={(k) => k}
          />
        </div>

        {/* Lado Direito - Conteúdo */}
        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Users size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione um prontuário para iniciar a orientação parental.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Lado Esquerdo - Rotina Visual */}
            <div className="xl:col-span-2 space-y-8">
               <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm space-y-10">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                        <Calendar className="text-amber-500" size={24} /> Estruturação de Rotina
                     </h3>
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2 shadow-sm">
                        <Clock size={12} /> Painel Diário
                     </div>
                  </div>

                  <div className="space-y-4">
                     {data.routine.sort((a,b) => a.time.localeCompare(b.time)).map(item => (
                        <div key={item.id} className="group flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 transition-all hover:bg-white hover:border-amber-200 shadow-sm hover:shadow-md">
                           <div className="flex items-center gap-8">
                              <div className="w-20 h-20 bg-amber-50 rounded-2xl flex flex-col items-center justify-center border border-amber-100 shadow-inner">
                                 <span className="text-xs font-black text-amber-700">{item.time}</span>
                                 <span className="text-[8px] font-black text-amber-400 uppercase">H</span>
                              </div>
                              <div className="space-y-1">
                                 <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.activity}</p>
                                 <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : item.status === 'need_improvement' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Execução {item.status === 'success' ? 'Ok' : 'Em ajuste'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <button 
                                 onClick={() => {
                                    const updated = {...data, routine: data.routine.map(r => r.id === item.id ? {...r, status: r.status === 'success' ? 'need_improvement' : 'success'} : r)};
                                    setData(updated);
                                    handleSave(updated);
                                 }}
                                 className="p-2.5 bg-white text-slate-300 hover:text-emerald-500 rounded-xl shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-105"
                              >
                                 <CheckCircle2 size={16} />
                              </button>
                              <button onClick={() => removeRoutineItem(item.id)} className="p-2.5 bg-white text-slate-300 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all scale-90 hover:scale-105">
                                 <Trash2 size={16} />
                              </button>
                           </div>
                        </div>
                     ))}

                     {/* Add New Routine */}
                     <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 border-dashed grid grid-cols-1 md:grid-cols-12 gap-6 items-end mt-10">
                        <div className="md:col-span-2 space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário</label>
                           <input 
                              type="time"
                              value={newRoutine.time}
                              onChange={e => setNewRoutine({...newRoutine, time: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none ring-4 ring-transparent focus:ring-amber-50 transition-all font-mono shadow-sm"
                           />
                        </div>
                        <div className="md:col-span-7 space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Atividade</label>
                           <input 
                              placeholder="Ex: Hora do banho..."
                              value={newRoutine.activity}
                              onChange={e => setNewRoutine({...newRoutine, activity: e.target.value})}
                              className="w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-xs font-bold outline-none ring-4 ring-transparent focus:ring-amber-50 transition-all shadow-sm"
                           />
                        </div>
                        <div className="md:col-span-3">
                           <Button 
                              onClick={addRoutineItem}
                              fullWidth
                              className="bg-slate-950 text-white rounded-xl py-4 font-black uppercase text-[10px] tracking-widest h-[50px] shadow-lg shadow-slate-200 hover:bg-amber-600 transition-all"
                           >
                              Add <Plus size={16} className="ml-2" />
                           </Button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Lado Direito - Contingências Comportamentais */}
            <div className="xl:col-span-1 space-y-8">
               <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 p-10 opacity-10 animate-pulse">
                     <Zap size={120} className="text-amber-500" />
                  </div>
                  
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-3 relative z-10">
                     <Layout size={18} className="text-amber-400" /> Plano de Manejo (ABC)
                  </h3>

                  <div className="space-y-6 relative z-10">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Metas do Treinamento</p>
                        <textarea 
                           rows={6}
                           value={data.goals.join('\n')}
                           onChange={e => setData({...data, goals: e.target.value.split('\n')})}
                           className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xs font-bold leading-relaxed focus:ring-4 focus:ring-amber-500/20 outline-none transition-all placeholder:text-white/10 resize-none italic shadow-inner"
                           placeholder="Quais são as principais mudanças esperadas?"
                        />
                     </div>

                     <div className="p-8 bg-amber-500/10 rounded-3xl border border-amber-500/20 space-y-4 shadow-inner">
                        <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                           <AlertCircle size={14} /> Nota Técnica
                        </h4>
                        <p className="text-[11px] font-bold text-slate-300 leading-relaxed">
                           O foco deste painel é a **Psicoeducação**. Utilize o registro para validar a implementação semanal.
                        </p>
                     </div>

                     <Button 
                        fullWidth
                        onClick={() => handleSave()}
                        isLoading={isSaving}
                        className="bg-amber-500 hover:bg-white hover:text-slate-950 text-white rounded-2xl py-6 font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-amber-500/20 transition-all border border-amber-400/30"
                     >
                        Sincronizar Plano <Save size={16} className="ml-2" />
                     </Button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
