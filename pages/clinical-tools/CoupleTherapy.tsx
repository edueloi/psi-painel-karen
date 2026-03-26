import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  Users, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Heart,
  MessageSquare,
  ShieldAlert,
  Save,
  Trash2,
  MoreVertical,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  Plus,
  FileText
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Button';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Patient } from '../../types';
import { api } from '../../services/api';

interface MapItem {
  id: string | number;
  partner: 'A' | 'B';
  interest: string;
  intensity: number;
}

interface CoupleData {
  loveMap: MapItem[];
  agreements: string[];
  conflictLevel: number;
  updated_at: string;
}

export const CoupleTherapyPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const [data, setData] = useState<CoupleData>({
    loveMap: [],
    agreements: [],
    conflictLevel: 5,
    updated_at: new Date().toISOString()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newMapItem, setNewMapItem] = useState<{partner: 'A' | 'B', interest: string, intensity: number}>({
    partner: 'A',
    interest: '',
    intensity: 5
  });

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
          loveMap: [],
          agreements: [],
          conflictLevel: 5,
          updated_at: new Date().toISOString()
        });
        return;
      }
      try {
        const response = await fetch(`/api/clinical-tools/${selectedPatientId}/couple-therapy`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && typeof json === 'object') {
            setData({
              loveMap: json.loveMap || [],
              agreements: json.agreements || [],
              conflictLevel: json.conflictLevel ?? 5,
              updated_at: json.updated_at || new Date().toISOString()
            });
          }
        } else {
          setData({
            loveMap: [],
            agreements: [],
            conflictLevel: 5,
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
      info('Atenção', 'Selecione o prontuário do casal para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...updatedData, updated_at: new Date().toISOString() };
      const response = await fetch(`/api/clinical-tools/${selectedPatientId}/couple-therapy`, {
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
        success('Painel do Casal Atualizado', 'Os dados do sistema conjugal foram sincronizados.');
      } else {
        throw new Error();
      }
    } catch (err) {
      error('Erro', 'Não foi possível salvar os dados do casal.');
    } finally {
      setIsSaving(false);
    }
  };

  const addMapItem = () => {
    if (!newMapItem.interest) return;
    const newItem = { ...newMapItem, id: Date.now() };
    const updated = { ...data, loveMap: [...data.loveMap, newItem] };
    setData(updated);
    setNewMapItem({ partner: 'A', interest: '', intensity: 5 });
    handleSave(updated);
  };

  const removeMapItem = (id: string | number) => {
    const updated = { ...data, loveMap: data.loveMap.filter(item => item.id !== id) };
    setData(updated);
    handleSave(updated);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="Terapia de Casal & Conjugalidade"
        subtitle={selectedPatientId ? `Paciente: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}` : "Mapeamento de vínculos, contratos e mapas do amor."}
        icon={<Users className="text-emerald-500" />}
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
            t={t}

          />
        </div>

        {/* Lado Direito - Conteúdo */}
        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Users size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione um prontuário de casal para iniciar o mapeamento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Lado Esquerdo - Mapa do Amor */}
            <div className="space-y-8">
               <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm space-y-10">
                  <div className="flex items-center justify-between">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                        <Heart className="text-rose-400" size={24} /> Mapa do Amor (Gottman)
                     </h3>
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                        Sincronização Ativa
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Parceiro A */}
                     <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-emerald-50 pb-4">
                           <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">A</div>
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Interesses & Sonhos</p>
                        </div>
                        <div className="space-y-3">
                           {data.loveMap.filter(i => i.partner === 'A').map(item => (
                              <div key={item.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-emerald-200">
                                 <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-emerald-500"><CheckCircle2 size={12}/></div>
                                    <span className="text-xs font-bold text-slate-700">{item.interest}</span>
                                 </div>
                                 <button onClick={() => removeMapItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Parceiro B */}
                     <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-rose-50 pb-4">
                           <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center font-black">B</div>
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Interesses & Sonhos</p>
                        </div>
                        <div className="space-y-3">
                           {data.loveMap.filter(i => i.partner === 'B').map(item => (
                              <div key={item.id} className="group flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:bg-white hover:border-rose-200">
                                 <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm text-rose-500"><CheckCircle2 size={12}/></div>
                                    <span className="text-xs font-bold text-slate-700">{item.interest}</span>
                                 </div>
                                 <button onClick={() => removeMapItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Add New Map Item */}
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/50 border-dashed space-y-5">
                     <div className="flex gap-4">
                        <select 
                           value={newMapItem.partner}
                           onChange={e => setNewMapItem({...newMapItem, partner: e.target.value as 'A' | 'B'})}
                           className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-emerald-50 shadow-sm"
                        >
                           <option value="A">Parceiro A</option>
                           <option value="B">Parceiro B</option>
                        </select>
                        <input 
                           placeholder="Novo interesse..."
                           value={newMapItem.interest}
                           onChange={e => setNewMapItem({...newMapItem, interest: e.target.value})}
                           className="flex-1 bg-white border border-slate-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-emerald-50 shadow-sm"
                        />
                        <Button 
                           onClick={addMapItem}
                           className="bg-emerald-600 hover:bg-slate-950 text-white rounded-xl px-6 py-3 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100"
                        >
                           <Plus size={16} />
                        </Button>
                     </div>
                  </div>
               </div>
            </div>

            {/* Lado Direito - Conflito e Contratos */}
            <div className="space-y-8">
               {/* Monitor de Tensão */}
               <div className="bg-white rounded-[2.5rem] border border-slate-100 p-10 shadow-sm space-y-8">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                     <Activity className="text-amber-500" size={18} /> Monitor de Tensão Sistêmica
                  </h3>
                  
                  <div className="space-y-6">
                     <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                        <span className="text-emerald-500">Conexão Terapêutica</span>
                        <span className="text-rose-500">Conflito Agudo</span>
                     </div>
                     <div className="h-6 w-full bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200 relative group cursor-pointer">
                        <div 
                           className={`h-full rounded-full transition-all duration-1000 bg-gradient-to-r ${data.conflictLevel > 7 ? 'from-amber-400 to-rose-600' : 'from-emerald-400 to-amber-400 font-black'}`}
                           style={{ width: `${data.conflictLevel * 10}%` }}
                        />
                        <input 
                           type="range" min="1" max="10" step="1"
                           value={data.conflictLevel}
                           onChange={e => {
                              const val = Number(e.target.value);
                              setData({...data, conflictLevel: val});
                              handleSave({...data, conflictLevel: val});
                           }}
                           className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                     </div>
                     <div className="flex justify-between px-2">
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                           <span key={n} className={`text-[8px] font-black ${data.conflictLevel === n ? 'text-slate-900 scale-125' : 'text-slate-300'}`}>{n}</span>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Contratos & Combinados */}
               <div className="bg-slate-950 rounded-[2.5rem] p-10 text-white shadow-2xl space-y-8 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-[80px]" />
                  <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 relative z-10">
                     <Layers size={18} className="text-emerald-400" /> Acordos & Contratos de Convivência
                  </h3>

                  <div className="space-y-4 relative z-10">
                     <textarea 
                        rows={8}
                        className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-xs font-bold leading-relaxed focus:ring-4 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-white/20 resize-none shadow-inner"
                        placeholder="Quais são os combinados estabelecidos em sessão? Utilize este espaço para consolidar o contrato de convivência e as metas do casal."
                        value={data.agreements.join('\n')}
                        onChange={e => setData({...data, agreements: e.target.value.split('\n')})}
                     />
                     <Button 
                        fullWidth
                        onClick={() => handleSave()}
                        isLoading={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl py-6 font-black uppercase tracking-widest text-[11px] ring-4 ring-emerald-500/10"
                     >
                        Consolidar Acordo <Save size={16} className="ml-2" />
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
