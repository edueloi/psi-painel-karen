import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Patient, RPDRecord, CopingCard, SocraticQuestioning } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { 
  Brain, Plus, Trash2, Edit3, Save, RotateCcw, RefreshCcw, 
  HelpCircle, MessageSquare, Layout, Sparkles, AlertTriangle, 
  CheckCircle2, ArrowRight, PenLine, ChevronRight, X, Loader2,
  BrainCircuit, ClipboardList, Target, Feather, ScanSearch, Camera,
  Sun, Smile, Zap, LayoutGrid
} from 'lucide-react';
import { Button, ContentCard, EmptyState, IconButton, Input, PageWrapper, PanelCard, SectionTitle, Tabs, Textarea } from '../../components/UI';

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
    <PageWrapper>
      <div className="space-y-4">
      <SectionTitle
        icon={Brain}
        title="Terapia Cognitivo-Comportamental"
        description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : 'Registros de pensamentos, cartões de enfrentamento e questionamento socrático.'}
        action={<Button variant="ghost" size="sm" onClick={() => navigate('/caixa-ferramentas')} iconLeft={<ChevronRight className="rotate-180" size={14} />}>Voltar</Button>}
      />

      {selectedPatient && (
        <Tabs
          items={[
            { id: 'rpd', label: 'RPD', icon: Layout },
            { id: 'cards', label: 'Cartões', icon: Sparkles },
            { id: 'socratic', label: 'Socrático', icon: HelpCircle },
          ] as const}
          value={activeSub}
          onChange={setActiveSub}
          label="Ferramentas da TCC"
        />
      )}

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
        <div className="space-y-4">
          {!selectedPatient ? (
            <div className="space-y-3 animate-fadeIn">
                <ContentCard>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600"><BrainCircuit size={16} /></div>
                    <div>
                      <h2 className="text-sm font-medium text-slate-900">Fluxo clínico estruturado</h2>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">Organize pensamentos, reestruture crenças e acompanhe a evolução comportamental com protocolos da TCC.</p>
                    </div>
                  </div>
                </ContentCard>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                        { title: 'RPD digital', desc: 'Registro de pensamentos disfuncionais estruturado.', icon: ClipboardList },
                        { title: 'Questionamento socrático', desc: 'Estruture o diálogo para desafiar distorções.', icon: MessageSquare },
                        { title: 'Cartões de enfrentamento', desc: 'Cards para o paciente utilizar fora da sessão.', icon: Target }
                    ].map((feat, i) => (
                        <ContentCard key={i} className="p-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-primary-600"><feat.icon size={14} /></div>
                          <h3 className="mt-3 text-sm font-medium text-slate-900">{feat.title}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{feat.desc}</p>
                        </ContentCard>
                    ))}
                </div>

                <ContentCard><EmptyState icon={Brain} title="Selecione um paciente para iniciar" description="Escolha um paciente na coluna ao lado para visualizar e registrar os dados clínicos." /></ContentCard>
            </div>
          ) : (
            <>
              {activeSub === 'rpd' && (
                <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4 animate-slideUpFade">
                    {/* FORM RPD */}
                    <PanelCard
                        title="Novo Registro"
                        action={<IconButton aria-label="Limpar registro" size="sm" onClick={() => { setEditingRPDId(null); setNewRPD({ intensity: 5 }); }}><RotateCcw /></IconButton>}
                        contentClassName="space-y-3"
                    >
                        
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="ds-label">Situação</label>
                                <textarea 
                                    className="ds-input min-h-[88px] h-24 resize-none py-2"
                                    value={newRPD.situation || ''}
                                    onChange={e => setNewRPD({...newRPD, situation: e.target.value})}
                                    placeholder="O que aconteceu? Onde? Com quem?"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="ds-label">Pensamento Automático</label>
                                <textarea 
                                    className="ds-input min-h-[88px] h-24 resize-none py-2"
                                    value={newRPD.thought || ''}
                                    onChange={e => setNewRPD({...newRPD, thought: e.target.value})}
                                    placeholder="O que passou pela sua cabeça no momento?"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="ds-label">Emoção</label>
                                    <input 
                                        type="text"
                                        className="ds-input"
                                        value={newRPD.emotion || ''}
                                        onChange={e => setNewRPD({...newRPD, emotion: e.target.value})}
                                        placeholder="Tristeza, medo..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="ds-label">Intensidade (0-10)</label>
                                    <input 
                                        type="number"
                                        className="ds-input text-center"
                                        value={newRPD.intensity || 5}
                                        onChange={e => setNewRPD({...newRPD, intensity: parseInt(e.target.value)})}
                                    />
                                </div>
                            </div>
                            
                            <Button
                                onClick={handleSaveRPD}
                                disabled={saving}
                                fullWidth
                                size="sm"
                                iconLeft={saving ? <Loader2 className="animate-spin"/> : editingRPDId ? <Save/> : <Plus/>}
                            >
                                {editingRPDId ? 'Salvar' : 'Adicionar'}
                            </Button>
                        </div>
                    </PanelCard>
                    
                    {/* HISTORICO RPD */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-slate-800 flex items-center gap-2"><Sparkles size={15} className="text-amber-500"/> Registros Clínicos</h3>
                            <IconButton aria-label="Atualizar registros" size="sm" onClick={() => loadTccData(selectedPatientId)}><RefreshCcw /></IconButton>
                        </div>
                        
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                            {records.length === 0 ? (
                                <ContentCard><EmptyState icon={MessageSquare} title="Nenhum registro encontrado" description="Adicione um registro para acompanhar o pensamento clínico." /></ContentCard>
                            ) : (
                                records.slice().reverse().map(r => (
                                    <ContentCard key={r.id} className="group relative hover:border-primary-200 transition-colors">
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconButton aria-label="Editar registro" size="xs" variant="outline" onClick={() => { setEditingRPDId(r.id); setNewRPD(r); }}><Edit3 /></IconButton>
                                            <IconButton aria-label="Excluir registro" size="xs" variant="danger" onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/tcc/rpd/${r.id}`); loadTccData(selectedPatientId); }}><Trash2 /></IconButton>
                                        </div>
                                        
                                        <div className="flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[11px] font-semibold text-slate-300">{new Date(r.date || "").toLocaleDateString()}</span>
                                                <div className="h-4 w-px bg-slate-100" />
                                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold  ${r.intensity > 7 ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                                    Intensidade: {r.intensity}/10
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Pensamento Alvo</p>
                                                    <p className="text-lg font-semibold text-slate-800 leading-tight italic">"{r.thought}"</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Situação</p>
                                                        <p className="text-xs font-medium text-slate-600 leading-relaxed">{r.situation}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-slate-400 mb-1">Emoção</p>
                                                        <p className="text-xs font-semibold text-slate-800 leading-relaxed">{r.emotion || '-'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </ContentCard>
                                ))
                            )}
                        </div>
                    </div>
                </div>
              )}

              {activeSub === 'cards' && (
                <div className="space-y-4 animate-slideUpFade">
                    <div className="bg-gradient-to-br from-indigo-600 to-primary-700 rounded-[32px] p-6 text-white relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Sparkles size={100} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h2 className="text-xl font-semibold">Cartões de Enfrentamento</h2>
                                <p className="text-indigo-100/80 font-medium text-[11px] max-w-md">Lembretes para o paciente utilizar fora da sessão.</p>
                            </div>
                            <button 
                                onClick={() => { setEditingCardId(null); setNewCard({ front: '', back: '' }); }}
                                className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 text-xs"
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
                                    <label className="text-[11px] font-semibold text-slate-400">Frente / Gatilho</label>
                                    <input 
                                        className="w-full h-12 px-4 rounded-lg bg-indigo-50/50 border border-indigo-100 text-sm font-semibold text-indigo-900 focus:bg-white outline-none"
                                        value={newCard.front}
                                        onChange={(e) => setNewCard({...newCard, front: e.target.value})}
                                        placeholder="Ex: Quando me sinto sozinho..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-semibold text-slate-400">Verso / Enfrentamento</label>
                                    <textarea 
                                        className="w-full h-32 p-4 rounded-lg bg-slate-50 border border-slate-100 text-sm focus:bg-white outline-none resize-none"
                                        value={newCard.back}
                                        onChange={(e) => setNewCard({...newCard, back: e.target.value})}
                                        placeholder="Ex: Respire fundo e lembre que esse sentimento é passageiro..."
                                    />
                                </div>
                                <button 
                                    onClick={handleSaveCard}
                                    className="w-full h-12 bg-indigo-600 text-white rounded-lg font-semibold text-xs shadow-sm shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    {editingCardId ? 'Salvar' : 'Criar Cartão'}
                                </button>
                             </div>
                        </div>

                        {cards.map(c => (
                            <div key={c.id} className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm hover:shadow-sm hover:-translate-y-2 transition-all flex flex-col h-full group">
                                <div className="p-7 bg-indigo-600/5 flex-1 relative">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingCardId(c.id); setNewCard(c); }} className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                                        <button onClick={async () => { await api.delete(`/clinical-tools/${selectedPatientId}/tcc/cards/${c.id}`); loadTccData(selectedPatientId); }} className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-800 leading-tight mb-4 pr-12">{c.front}</h4>
                                    <div className="h-px bg-slate-200/50 mb-6" />
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.back}</p>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                    <span className="text-[11px] font-semibold text-slate-300 italic flex items-center gap-1.5 align-top"><CheckCircle2 size={10}/> Lembrete Terapêutico</span>
                                    <span className="text-[11px] font-semibold text-slate-300">{new Date(c.createdAt || "").toLocaleDateString()}</span>
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
                                <div className="w-12 h-12 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                    <HelpCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-800">Questionamento Socrático</h3>
                                    <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-2">Exploração de Evidências</p>
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
                                            className="px-5 py-3.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-left text-sm font-semibold text-slate-600 hover:text-indigo-800 transition-all group flex items-center justify-between"
                                        >
                                            {q}
                                            <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-300 group-hover:translate-x-1 transition-all" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* FORM RESPOSTA */}
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[40px] p-10 text-white shadow-sm relative overflow-hidden">
                             <div className="absolute top-0 right-0 p-10 opacity-5">
                                <PenLine size={160} />
                             </div>
                             <div className="relative z-10 space-y-8 h-full flex flex-col justify-between">
                                <div className="space-y-6">
                                     <div className="space-y-3">
                                        <label className="text-[11px] font-semibold text-indigo-300">Pergunta Selecionada</label>
                                        <input 
                                            className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-6 text-sm font-semibold placeholder:text-white/20 outline-none focus:bg-white/10 transition-all shadow-inner"
                                            value={newSocratic.question}
                                            onChange={e => setNewSocratic({...newSocratic, question: e.target.value})}
                                            placeholder="Selecione ao lado ou digite..."
                                        />
                                     </div>
                                     <div className="space-y-3">
                                        <label className="text-[11px] font-semibold text-indigo-300">Resposta do Paciente</label>
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
                                    className="w-full h-16 bg-white text-indigo-900 rounded-[28px] font-semibold shadow-sm hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    <Save size={20}/> Registrar Reflexão
                                </button>
                             </div>
                        </div>
                    </div>

                    {/* LISTA SOCRATIC */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2 px-4 shadow-sm py-3 bg-white rounded-lg border border-slate-100 mb-6 underline decoration-indigo-500 decoration-4 underline-offset-8">Desafios Cognitivos</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {socratic.length === 0 ? (
                                <div className="md:col-span-2 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-24 text-center">
                                    <p className="text-sm font-semibold text-slate-400">Nenhum questionamento registrado ainda.</p>
                                </div>
                            ) : (
                                socratic.slice().reverse().map(s => (
                                    <div key={s.id} className="bg-white rounded-[32px] border border-slate-100 p-8 shadow-sm hover:shadow-sm transition-all group relative overflow-hidden flex flex-col gap-6">
                                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                              onClick={async () => {
                                                  const newList = socratic.filter(it => it.id !== s.id);
                                                  await api.put(`/clinical-tools/${selectedPatientId}/tcc/socratic`, { data: newList });
                                                  setSocratic(newList);
                                              }}
                                              className="w-9 h-9 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-500 font-semibold text-[11px]">?</div>
                                                <p className="text-sm font-semibold text-slate-800 leading-tight">{s.question}</p>
                                            </div>
                                            <div className="pl-11 border-l-2 border-indigo-100">
                                                <p className="text-base text-slate-600 font-medium italic leading-relaxed">"{s.answer}"</p>
                                            </div>
                                        </div>
                                        <div className="mt-auto pt-4 flex justify-end">
                                             <span className="text-[11px] font-semibold text-slate-300">{new Date(s.createdAt || "").toLocaleDateString()}</span>
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
    </PageWrapper>
  );
};
