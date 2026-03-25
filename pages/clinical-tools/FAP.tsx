import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Save, Plus, Trash2, HeartHandshake, Eye, MessageSquare, Activity, Loader2 } from 'lucide-react';

const CRB_COLORS: Record<string, string> = {
  CRB1: 'bg-rose-100 text-rose-700 border-rose-200',
  CRB2: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CRB3: 'bg-blue-100 text-blue-700 border-blue-200',
};

export const FAPPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'crb' | 'five_rules' | 'session_notes'>('crb');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // FAP state
  const [crbs, setCrbs] = useState<any[]>([]);
  const [fiveRules, setFiveRules] = useState({
    rule1: '', rule2: '', rule3: '', rule4: '', rule5: ''
  });
  const [sessionNotes, setSessionNotes] = useState<any[]>([]);

  const [newCrb, setNewCrb] = useState({ type: 'CRB1', description: '', context: '', intervention: '', patient_response: '' });
  const [newNote, setNewNote] = useState({ date: new Date().toISOString().split('T')[0], relationship_quality: 7, observation: '', patient_emotion: '', therapist_reaction: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const raw = await api.get<any[]>('/patients');
      setPatients((raw || []).map((p: any) => ({ ...p, full_name: p.name || p.full_name || '' })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadFAPData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/fap`);
      setCrbs(Array.isArray(data?.crbs) ? data.crbs : []);
      setFiveRules(data?.five_rules || { rule1: '', rule2: '', rule3: '', rule4: '', rule5: '' });
      setSessionNotes(Array.isArray(data?.session_notes) ? data.session_notes : []);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    fetchData();
    const pid = searchParams.get('patient_id');
    if (pid) setSelectedPatientId(pid);
  }, [searchParams]);

  useEffect(() => { if (selectedPatientId) loadFAPData(selectedPatientId); }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const saveAll = async (patch: any) => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/fap`, {
        crbs: patch.crbs ?? crbs,
        five_rules: patch.five_rules ?? fiveRules,
        session_notes: patch.session_notes ?? sessionNotes,
      });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const addCRB = () => {
    if (!newCrb.description) return;
    const upd = [...crbs, { id: Date.now().toString(), date: new Date().toISOString(), ...newCrb }];
    setCrbs(upd);
    setNewCrb({ type: 'CRB1', description: '', context: '', intervention: '', patient_response: '' });
    saveAll({ crbs: upd });
  };
  const removeCRB = (id: string) => { const upd = crbs.filter(c => c.id !== id); setCrbs(upd); saveAll({ crbs: upd }); };

  const saveFiveRules = () => saveAll({ five_rules: fiveRules });

  const addNote = () => {
    if (!newNote.observation) return;
    const upd = [...sessionNotes, { id: Date.now().toString(), ...newNote }];
    setSessionNotes(upd);
    setNewNote({ date: new Date().toISOString().split('T')[0], relationship_quality: 7, observation: '', patient_emotion: '', therapist_reaction: '' });
    saveAll({ session_notes: upd });
  };
  const removeNote = (id: string) => { const upd = sessionNotes.filter(n => n.id !== id); setSessionNotes(upd); saveAll({ session_notes: upd }); };

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<HeartHandshake />}
        title="FAP — Psicoterapia Analítica Funcional"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "CRBs · 5 Regras da FAP · Notas de Sessão"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
            {[
              { key: 'crb', icon: <Activity size={13}/>, label: 'CRBs' },
              { key: 'five_rules', icon: <Eye size={13}/>, label: '5 Regras' },
              { key: 'session_notes', icon: <MessageSquare size={13}/>, label: 'Notas de Sessão' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveSub(tab.key as any)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${activeSub === tab.key ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <ClinicalSidebar patients={patients} selectedPatientId={selectedPatientId} onSelectPatient={setSelectedPatientId} patientSearch={patientSearch} setPatientSearch={setPatientSearch} isLoading={isLoading && patients.length === 0} t={t} />

        <div className="space-y-6">
          {!selectedPatient ? (
            <div className="text-center py-20 bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6"><HeartHandshake size={40} /></div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">FAP Workspace</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">Mapeie CRBs ao vivo na sessão, aplique as 5 Regras da FAP e registre a qualidade da relação terapêutica.</p>
            </div>
          ) : (
            <>
              {/* CRBs */}
              {activeSub === 'crb' && (
                <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 animate-slideUpFade">
                  <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">Novo CRB — Em Sessão</h3>
                    <select className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-black outline-none" value={newCrb.type} onChange={e => setNewCrb({...newCrb, type: e.target.value})}>
                      <option value="CRB1">CRB1 — Comportamento Problema (Sessão)</option>
                      <option value="CRB2">CRB2 — Melhoria / Comportamento alvo</option>
                      <option value="CRB3">CRB3 — Interpretação do Paciente</option>
                    </select>
                    {[
                      { field: 'description', label: 'Descrição do Comportamento (o que ocorreu?)' },
                      { field: 'context', label: 'Contexto / Antecedente na sessão' },
                      { field: 'intervention', label: 'Sua Intervenção Terapêutica (Regra 3 / 4)' },
                      { field: 'patient_response', label: 'Resposta do Paciente à Intervenção' },
                    ].map(f => (
                      <div key={f.field} className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{f.label}</label>
                        <textarea className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium h-16 resize-none outline-none focus:bg-white focus:border-emerald-300 transition-all"
                          value={(newCrb as any)[f.field]} onChange={e => setNewCrb({...newCrb, [f.field]: e.target.value})} />
                      </div>
                    ))}
                    <button onClick={addCRB} className="w-full h-12 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16} />} Registrar CRB
                    </button>
                  </div>

                  <div className="space-y-3">
                    {crbs.length === 0 ? (
                      <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center"><p className="text-slate-400 font-bold">Nenhum CRB registrado ainda.</p></div>
                    ) : crbs.map(c => (
                      <div key={c.id} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm relative group">
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeCRB(c.id)} className="p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-colors"><Trash2 size={14}/></button>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${CRB_COLORS[c.type]}`}>{c.type}</span>
                          <span className="text-[10px] text-slate-400">{c.date ? new Date(c.date).toLocaleDateString() : ''}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 mb-2">{c.description}</p>
                        {c.context && <p className="text-xs text-slate-500 mb-1"><span className="font-black text-slate-700">Contexto: </span>{c.context}</p>}
                        {c.intervention && <p className="text-xs text-slate-500 mb-1"><span className="font-black text-slate-700">Intervenção: </span>{c.intervention}</p>}
                        {c.patient_response && <p className="text-xs text-emerald-600 italic"><span className="font-black text-emerald-700">Resposta: </span>"{c.patient_response}"</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5 Regras */}
              {activeSub === 'five_rules' && (
                <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm animate-slideUpFade space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><Eye className="text-emerald-500"/> 5 Regras da FAP</h3>
                    <button onClick={saveFiveRules} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black uppercase text-xs shadow hover:bg-emerald-700 transition flex items-center gap-2">
                      {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {[
                      { key: 'rule1', num: '1', title: 'Observar CRBs', color: 'rose', desc: 'Identificar quando surgem CRBs durante a sessão.' },
                      { key: 'rule2', num: '2', title: 'Evocar CRBs', color: 'amber', desc: 'Criar condições para que CRBs ocorram na sessão.' },
                      { key: 'rule3', num: '3', title: 'Reforçar CRB2s', color: 'emerald', desc: 'Reforçar naturalmente os comportamentos de melhoria.' },
                      { key: 'rule4', num: '4', title: 'Observar Efeitos', color: 'blue', desc: 'Observar seus efeitos no comportamento do paciente.' },
                      { key: 'rule5', num: '5', title: 'Interpretar', color: 'purple', desc: 'Ajudar o paciente a fazer análises funcionais.' },
                    ].map(r => (
                      <div key={r.key} className={`p-5 rounded-2xl border border-${r.color}-100 bg-${r.color}-50/40 space-y-3`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-${r.color}-100 text-${r.color}-700 flex items-center justify-center font-black text-sm`}>{r.num}</div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">{r.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium">{r.desc}</p>
                          </div>
                        </div>
                        <textarea
                          className="w-full h-24 p-3 rounded-xl bg-white border border-slate-100 text-xs resize-none outline-none focus:border-emerald-300 transition font-medium"
                          placeholder={`O que você fez sobre a Regra ${r.num} nesta sessão?`}
                          value={(fiveRules as any)[r.key]}
                          onChange={e => setFiveRules({...fiveRules, [r.key]: e.target.value})}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session Notes */}
              {activeSub === 'session_notes' && (
                <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 animate-slideUpFade">
                  <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">Nota de Sessão</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                        <input type="date" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newNote.date} onChange={e => setNewNote({...newNote, date: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualidade Relação (1-10)</label>
                        <input type="number" min="1" max="10" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newNote.relationship_quality} onChange={e => setNewNote({...newNote, relationship_quality: Number(e.target.value)})} />
                      </div>
                    </div>
                    {[
                      { field: 'observation', label: 'Observação Geral da Sessão', ph: 'O que aconteceu de mais relevante?' },
                      { field: 'patient_emotion', label: 'Estado Emocional do Paciente', ph: 'Ex: Ansioso, aberto, defensivo...' },
                      { field: 'therapist_reaction', label: 'Sua Reação como Terapeuta (Regra 4)', ph: 'O que você sentiu? Como respondeu?' },
                    ].map(f => (
                      <div key={f.field} className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{f.label}</label>
                        <textarea className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium h-16 resize-none outline-none focus:bg-white focus:border-emerald-300"
                          placeholder={f.ph} value={(newNote as any)[f.field]} onChange={e => setNewNote({...newNote, [f.field]: e.target.value})} />
                      </div>
                    ))}
                    <button onClick={addNote} className="w-full h-12 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Registrar Sessão
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sessionNotes.length === 0 ? (
                      <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center"><p className="text-slate-400 font-bold">Nenhuma nota registrada.</p></div>
                    ) : sessionNotes.map(n => (
                      <div key={n.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 relative group">
                        <button onClick={() => removeNote(n.id)} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 font-black px-2 py-0.5 rounded uppercase">{n.date ? new Date(n.date).toLocaleDateString() : ''}</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${n.relationship_quality >= 7 ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>Relação: {n.relationship_quality}/10</span>
                        </div>
                        <p className="text-sm font-bold text-slate-800 mb-2">{n.observation}</p>
                        {n.patient_emotion && <p className="text-xs text-slate-500 mb-1"><span className="font-black text-slate-700">Estado: </span>{n.patient_emotion}</p>}
                        {n.therapist_reaction && <p className="text-xs text-slate-500 italic"><span className="font-black text-slate-700">Reação: </span>"{n.therapist_reaction}"</p>}
                      </div>
                    ))}
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
