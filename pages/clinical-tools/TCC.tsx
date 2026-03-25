import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient, RPDRecord, CopingCard, SocraticQuestioning } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Brain, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  HelpCircle, MessageSquare, Layout, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2,
  BrainCircuit, ClipboardList, Target, Feather, ScanSearch, Camera,
  Sun, Smile, Zap, LayoutGrid
} from 'lucide-react';

const toIso = (v?: any) => {
  if (!v) return new Date().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const TCCPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'rpd' | 'cards' | 'socratic'>('rpd');
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tools State
  const [records, setRecords] = useState<RPDRecord[]>([]);
  const [cards, setCards] = useState<CopingCard[]>([]);
  const [socratic, setSocratic] = useState<SocraticQuestioning[]>([]);

  // Form States
  const [newRPD, setNewRPD] = useState<Partial<RPDRecord>>({ intensity: 5 });
  const [editingRPDId, setEditingRPDId] = useState<string | null>(null);
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newSocratic, setNewSocratic] = useState({ question: '', answer: '' });

  const fetchData = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const loadTccData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/tcc`);
      setRecords(Array.isArray(data?.records) ? data.records : []);
      setCards(Array.isArray(data?.cards) ? data.cards : []);
      
      // Load socratic tool
      const socr = await api.get<any>(`/clinical-tools/${patientId}/tcc/socratic`);
      setSocratic(Array.isArray(socr?.data) ? socr.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pid = searchParams.get('patient_id');
    const tab = searchParams.get('sub');
    if (pid) setSelectedPatientId(pid);
    if (tab === 'cards' || tab === 'socratic') setActiveSub(tab);
  }, [searchParams]);

  useEffect(() => {
    if (selectedPatientId) loadTccData(selectedPatientId);
  }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const handleSaveRPD = async () => {
    if (!selectedPatientId || !newRPD.situation || !newRPD.thought) return;
    setSaving(true);
    try {
      const url = editingRPDId 
        ? `/clinical-tools/${selectedPatientId}/tcc/rpd/${editingRPDId}`
        : `/clinical-tools/${selectedPatientId}/tcc/rpd`;
      
      await (editingRPDId ? api.put(url, newRPD) : api.post(url, newRPD));
      setEditingRPDId(null);
      setNewRPD({ intensity: 5 });
      loadTccData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCard = async () => {
    if (!selectedPatientId || !newCard.front || !newCard.back) return;
    setSaving(true);
    try {
      const url = editingCardId 
        ? `/clinical-tools/${selectedPatientId}/tcc/cards/${editingCardId}`
        : `/clinical-tools/${selectedPatientId}/tcc/cards`;
      
      await (editingCardId ? api.put(url, newCard) : api.post(url, newCard));
      setEditingCardId(null);
      setNewCard({ front: '', back: '' });
      loadTccData(selectedPatientId);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocratic = async () => {
    if (!selectedPatientId || !newSocratic.question) return;
    setSaving(true);
    try {
      const newList = [...socratic, { id: Date.now().toString(), ...newSocratic, createdAt: new Date().toISOString() }];
      await api.put(`/clinical-tools/${selectedPatientId}/tcc/socratic`, { data: newList });
      setNewSocratic({ question: '', answer: '' });
      setSocratic(newList);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Brain />}
        title="Terapia Cognitivo-Comportamental"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Workflow Clínico Estruturado"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setActiveSub('rpd')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'rpd' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Layout size={14}/> RPD</div>
              </button>
              <button 
                onClick={() => setActiveSub('cards')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'cards' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><Sparkles size={14}/> Cartões</div>
              </button>
              <button 
                onClick={() => setActiveSub('socratic')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${activeSub === 'socratic' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2"><HelpCircle size={14}/> Socrático</div>
              </button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        {/* SIDEBAR */}
        <ClinicalSidebar 
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoading && patients.length === 0}
            t={t}
        />

        {/* CONTENT */}
        <div className="space-y-6">
          {!selectedPatient ? (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[32px] p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <BrainCircuit size={120} />
                    </div>
                    <div className="relative z-10 max-w-2xl space-y-4">
                        <div className="px-3 py-1 bg-white/10 rounded-full border border-white/20 w-fit backdrop-blur-md">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100 italic">Eficácia Baseada em Evidência</span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tighter leading-none uppercase">Dashboard Estratégico<br/>Cognitivo-Comportamental</h2>
                        <p className="text-indigo-100/70 text-[11px] font-medium leading-relaxed">
                            Organize pensamentos, reestruture crenças e monitore a evolução comportamental através de protocolos validados.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { title: 'RPD Digital', desc: 'Registro de Pensamentos Disfuncionais estruturado.', icon: <ClipboardList size={22}/>, color: 'indigo' },
                        { title: 'Socrático', desc: 'Estruture o diálogo para desafiar distorções.', icon: <MessageSquare size={22}/>, color: 'blue' },
                        { title: 'Enfrentamento', desc: 'Cards para o paciente utilizar fora da sessão.', icon: <Target size={22}/>, color: 'emerald' }
                    ].map((feat, i) => (
                        <div key={i} className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                             <div className={`w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all`}>
                                {feat.icon}
                             </div>
                             <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-tight mb-1">{feat.title}</h3>
                             <p className="text-[9px] text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-8 text-center">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-slate-200 mx-auto mb-4 shadow-sm">
                        <Plus size={32} />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione um paciente para iniciar.</p>
                </div>
            </div>
          ) : (
            <>
              {activeSub === 'rpd' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    {/* FORM RPD */}
                    <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-lg tracking-tight uppercase">Novo Registro</h3>
                            <button onClick={() => { setEditingRPDId(null); setNewRPD({ intensity: 5 }); }} className="text-slate-400 hover:text-indigo-600 transition-colors"><RotateCcw size={18}/></button>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Situação</label>
                                <textarea 
                                    className="w-full p-4 rounded-3xl bg-slate-50 border border-slate-100 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all h-24 resize-none"
                                    value={newRPD.situation || ''}
                                    onChange={e => setNewRPD({...newRPD, situation: e.target.value})}
                                    placeholder="O que aconteceu? Onde? Com quem?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pensamento Automático</label>
                                <textarea 
                                    className="w-full p-4 rounded-3xl bg-indigo-50/30 border border-indigo-100 text-sm focus:bg-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-400 outline-none transition-all h-24 resize-none font-bold text-indigo-900"
                                    value={newRPD.thought || ''}
                                    onChange={e => setNewRPD({...newRPD, thought: e.target.value})}
                                    placeholder="O que passou pela sua cabeça no momento?"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Emoção</label>
                                    <input 
                                        type="text"
                                        className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:bg-white outline-none"
                                        value={newRPD.emotion || ''}
                                        onChange={e => setNewRPD({...newRPD, emotion: e.target.value})}
                                        placeholder="Tristeza, medo..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Intensidade (0-10)</label>
                                    <input 
                                        type="number"
                                        className="w-full h-12 px-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-center font-black focus:bg-white outline-none"
                                        value={newRPD.intensity || 5}
                                        onChange={e => setNewRPD({...newRPD, intensity: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSaveRPD}
                                disabled={saving}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin"/> : editingRPDId ? <Save size={16}/> : <Plus size={16}/>}
                                {editingRPDId ? 'Salvar' : 'Adicionar'}
                            </button>
                        </div>
                    </div>
                    
                    {/* HISTORICO RPD */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-4 mb-2">
                            <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2"><Sparkles size={16} className="text-amber-500"/> Registros Clínicos</h3>
                            <button onClick={() => loadTccData(selectedPatientId)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCcw size={16}/></button>
                        </div>
                        
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                            {records.length === 0 ? (
                                <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 border border-slate-100">
                                        <MessageSquare size={20} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-loose">Nenhum registro encontrado</span>
                                </div>
                            ) : (
                                records.slice().reverse().map(r => (
                                    <div key={r.id} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:border-indigo-200 transition-all group relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                            <button onClick={() => { setEditingRPDId(r.id); setNewRPD(r); }} className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit3 size={16}/></button>
                                            <button onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/tcc/rpd/${r.id}`); loadTccData(selectedPatientId); }} className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"><Trash2 size={16}/></button>
                                        </div>
                                        
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(r.date || "").toLocaleDateString()}</span>
                                                <div className="h-4 w-px bg-slate-100" />
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${r.intensity > 7 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    Intensidade: {r.intensity}/10
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Pensamento Alvo</p>
                                                    <p className="text-lg font-black text-slate-800 leading-tight italic tracking-tight">"{r.thought}"</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Situação</p>
                                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{r.situation}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Emoção</p>
                                                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{r.emotion || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'cards' && (
                <div className="space-y-4 animate-slideUpFade">
                    <div className="bg-gradient-to-br from-indigo-600 to-primary-700 rounded-[32px] p-6 text-white relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Sparkles size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h2 className="text-xl font-black tracking-tight uppercase">Cartões de Enfrentamento</h2>
                                <p className="text-indigo-100/80 font-medium text-[11px] max-w-md">Lembretes para o paciente utilizar fora da sessão.</p>
                            </div>
                            <button 
                                onClick={() => { setEditingCardId(null); setNewCard({ front: '', back: '' }); }}
                                className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 text-xs uppercase"
                            >
                                <Plus size={16}/> Novo Cartão
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pt-4">
                        {/* FORM COMPACTO */}
                        <div className="bg-white rounded-[32px] border-2 border-dashed border-indigo-200 p-8 flex flex-col gap-6 shadow-sm hover:border-solid hover:border-indigo-400 transition-all group">
                             <div className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frente / Gatilho</label>
                                    <input 
                                        className="w-full h-12 px-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-sm font-bold text-indigo-900 focus:bg-white outline-none"
                                        value={newCard.front}
                                        onChange={(e) => setNewCard({...newCard, front: e.target.value})}
                                        placeholder="Ex: Quando me sinto sozinho..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verso / Enfrentamento</label>
                                    <textarea 
                                        className="w-full h-32 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm focus:bg-white outline-none resize-none"
                                        value={newCard.back}
                                        onChange={(e) => setNewCard({...newCard, back: e.target.value})}
                                        placeholder="Ex: Respire fundo e lembre que esse sentimento é passageiro..."
                                    />
                                </div>
                                <button 
                                    onClick={handleSaveCard}
                                    className="w-full h-12 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    {editingCardId ? 'Salvar' : 'Criar Cartão'}
                                </button>
                             </div>
                        </div>

                        {cards.map(c => (
                            <div key={c.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col h-full group">
                                <div className="p-7 bg-indigo-600/5 flex-1 relative">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingCardId(c.id); setNewCard(c); }} className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                                        <button onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/tcc/cards/${c.id}`); loadTccData(selectedPatientId); }} className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                                    </div>
                                    <h4 className="text-lg font-black text-slate-800 leading-tight mb-4 pr-12">{c.front}</h4>
                                    <div className="h-px bg-slate-200/50 mb-6" />
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.back}</p>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic flex items-center gap-1.5 align-top"><CheckCircle2 size={10}/> Lembrete Terapêutico</span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(c.createdAt || "").toLocaleDateString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              )}

              {activeSub === 'socratic' && (
                <div className="space-y-8 animate-slideUpFade">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* GUIA DE PERGUNTAS */}
                        <div className="bg-white rounded-[40px] border border-slate-200 p-8 shadow-sm space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                    <HelpCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Questionamento Socrático</h3>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-2">Exploração de Evidências</p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500 leading-relaxed font-medium">Use as perguntas guia abaixo para estimular a reflexão do paciente sobre seus pensamentos disfuncionais:</p>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {[
                                        "Quais evidências apoiam esse pensamento?",
                                        "Quais evidências contrariam esse pensamento?",
                                        "Existe uma explicação alternativa?",
                                        "Qual o pior que pode acontecer? E o melhor?",
                                        "O que eu diria a um amigo se ele estivesse nessa situação?",
                                        "Qual o efeito de acreditar nesse pensamento?"
                                    ].map((q, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setNewSocratic({...newSocratic, question: q})}
                                            className="px-5 py-3.5 rounded-2xl bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-left text-sm font-bold text-slate-600 hover:text-indigo-800 transition-all group flex items-center justify-between"
                                        >
                                            {q}
                                            <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* FORM RESPOSTA */}
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-5">
                                <PenLine size={160} />
                             </div>
                             <div className="relative z-10 space-y-8 h-full flex flex-col justify-between">
                                <div className="space-y-6">
                                     <div className="space-y-3">
                                        <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Pergunta Selecionada</label>
                                        <input 
                                            className="w-full bg-white/5 border border-white/10 rounded-3xl h-14 px-6 text-sm font-bold placeholder:text-white/20 outline-none focus:bg-white/10 transition-all shadow-inner"
                                            value={newSocratic.question}
                                            onChange={e => setNewSocratic({...newSocratic, question: e.target.value})}
                                            placeholder="Selecione ao lado ou digite..."
                                        />
                                     </div>
                                     <div className="space-y-3">
                                        <label className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Resposta do Paciente</label>
                                        <textarea 
                                            className="w-full bg-white/5 border border-white/10 rounded-[32px] p-6 text-base font-medium placeholder:text-white/20 outline-none focus:bg-white/10 transition-all h-48 resize-none shadow-inner leading-relaxed"
                                            value={newSocratic.answer}
                                            onChange={e => setNewSocratic({...newSocratic, answer: e.target.value})}
                                            placeholder="Registre aqui a reflexão do paciente..."
                                        />
                                     </div>
                                </div>
                                <button 
                                    onClick={handleSaveSocratic}
                                    className="w-full h-16 bg-white text-indigo-900 rounded-[28px] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Save size={20}/> Registrar Reflexão
                                </button>
                             </div>
                        </div>
                    </div>

                    {/* LISTA SOCRATIC */}
                    <div className="space-y-4">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 px-4 shadow-sm py-3 bg-white rounded-2xl border border-slate-100 mb-6 underline decoration-indigo-500 decoration-4 underline-offset-8">Desafios Cognitivos</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {socratic.length === 0 ? (
                                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center">
                                    <p className="text-sm font-black text-slate-400 uppercase">Nenhum questionamento registrado ainda.</p>
                                </div>
                            ) : (
                                socratic.slice().reverse().map(s => (
                                    <div key={s.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col gap-6">
                                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={async () => {
                                                  const newList = socratic.filter(it => it.id !== s.id);
                                                  await api.put(`/clinical-tools/${selectedPatientId}/tcc/socratic`, { data: newList });
                                                  setSocratic(newList);
                                              }}
                                              className="w-9 h-9 bg-red-50 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-500 font-black text-[10px]">?</div>
                                                <p className="text-sm font-black text-slate-800 leading-tight uppercase tracking-tight">{s.question}</p>
                                            </div>
                                            <div className="pl-11 border-l-2 border-indigo-100">
                                                <p className="text-base text-slate-600 font-medium italic leading-relaxed">"{s.answer}"</p>
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-4 flex justify-end">
                                             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{new Date(s.createdAt || "").toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
