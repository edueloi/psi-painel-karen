import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageHeader } from '../../components/UI/PageHeader';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Star, Plus, Trash2, Heart, Smile, Save, Loader2, SunMedium, BookOpen } from 'lucide-react';

const VIA_STRENGTHS = [
  'Criatividade', 'Curiosidade', 'Julgamento Crítico', 'Amor ao Aprendizado',
  'Perspectiva', 'Coragem / Bravura', 'Persistência', 'Integridade / Autenticidade',
  'Vitalidade / Entusiasmo', 'Amor / Capacidade de Amar', 'Gentileza', 'Inteligência Social',
  'Trabalho em Equipe', 'Equanimidade / Justiça', 'Liderança',
  'Perdão / Misericórdia', 'Humildade / Modéstia', 'Prudência',
  'Autorregulação', 'Apreciação da Beleza', 'Gratidão',
  'Esperança / Otimismo', 'Humor / Alegria', 'Espiritualidade / Propósito'
];

export const PositivePsychologyPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeSub, setActiveSub] = useState<'strengths' | 'gratitude' | 'wellbeing'>('strengths');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State
  const [strengths, setStrengths] = useState<any[]>([]);
  const [gratitudeEntries, setGratitudeEntries] = useState<any[]>([]);
  const [wellbeing, setWellbeing] = useState({
    positive_emotions: '', engagement: '', relationships: '', meaning: '', achievement: '',
    perma_notes: ''
  });

  const [newStrength, setNewStrength] = useState({ virtue: '', usage_context: '', growth_plan: '', frequency: 'Diário' });
  const [newGratitude, setNewGratitude] = useState({ date: new Date().toISOString().split('T')[0], entries: ['', '', ''], intensity: 8 });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const raw = await api.get<any[]>('/patients');
      setPatients((raw || []).map((p: any) => ({ ...p, full_name: p.name || p.full_name || '' })));
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const loadData = async (patientId: string) => {
    if (!patientId) return;
    setIsLoading(true);
    try {
      const data = await api.get<any>(`/clinical-tools/${patientId}/positivepsych`);
      setStrengths(Array.isArray(data?.strengths) ? data.strengths : []);
      setGratitudeEntries(Array.isArray(data?.gratitude_entries) ? data.gratitude_entries : []);
      setWellbeing(data?.wellbeing || { positive_emotions: '', engagement: '', relationships: '', meaning: '', achievement: '', perma_notes: '' });
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); const pid = searchParams.get('patient_id'); if (pid) setSelectedPatientId(pid); }, [searchParams]);
  useEffect(() => { if (selectedPatientId) loadData(selectedPatientId); }, [selectedPatientId]);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);

  const saveAll = async (patch: any) => {
    if (!selectedPatientId) return;
    setSaving(true);
    try {
      await api.put(`/clinical-tools/${selectedPatientId}/positivepsych`, {
        strengths: patch.strengths ?? strengths,
        gratitude_entries: patch.gratitude_entries ?? gratitudeEntries,
        wellbeing: patch.wellbeing ?? wellbeing,
      });
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  const addStrength = () => {
    if (!newStrength.virtue) return;
    const upd = [...strengths, { id: Date.now().toString(), ...newStrength, mapped_at: new Date().toISOString() }];
    setStrengths(upd);
    setNewStrength({ virtue: '', usage_context: '', growth_plan: '', frequency: 'Diário' });
    saveAll({ strengths: upd });
  };

  const addGratitude = () => {
    if (!newGratitude.entries[0]) return;
    const upd = [...gratitudeEntries, { id: Date.now().toString(), ...newGratitude }];
    setGratitudeEntries(upd);
    setNewGratitude({ date: new Date().toISOString().split('T')[0], entries: ['', '', ''], intensity: 8 });
    saveAll({ gratitude_entries: upd });
  };

  const saveWellbeing = () => saveAll({ wellbeing });

  return (
    <div className="flex flex-col gap-4 pb-16 animate-fadeIn">
      <PageHeader
        icon={<Star />}
        title="Psicologia Positiva"
        subtitle={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : "Forças VIA · Diário de Gratidão · Modelo PERMA"}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={selectedPatient && (
          <div className="flex items-center gap-1 bg-white/50 backdrop-blur-sm p-1 rounded-2xl border border-slate-200 shadow-sm">
            {[
              { key: 'strengths', icon: <Star size={13}/>, label: 'Forças VIA' },
              { key: 'gratitude', icon: <Heart size={13}/>, label: 'Gratidão' },
              { key: 'wellbeing', icon: <SunMedium size={13}/>, label: 'PERMA' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveSub(tab.key as any)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-tight transition-all flex items-center gap-1.5 ${activeSub === tab.key ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
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
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-6"><Star size={40}/></div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Psicologia Positiva</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">Mapeie Forças VIA, pratique gratidão e monitore o florescimento com o modelo PERMA.</p>
            </div>
          ) : (
            <>
              {/* FORÇAS VIA */}
              {activeSub === 'strengths' && (
                <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 animate-slideUpFade">
                  <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">Mapear Força VIA</h3>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Força / Virtude</label>
                      <select className="w-full h-12 px-4 rounded-xl bg-amber-50/40 border border-amber-100 text-sm font-bold outline-none focus:border-amber-300" value={newStrength.virtue} onChange={e => setNewStrength({...newStrength, virtue: e.target.value})}>
                        <option value="">Selecione...</option>
                        {VIA_STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em que contexto o paciente usa essa força?</label>
                      <textarea className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium h-20 resize-none outline-none focus:bg-white focus:border-amber-300"
                        placeholder="Ex: No trabalho quando ajuda colegas, em casa com os filhos..." value={newStrength.usage_context} onChange={e => setNewStrength({...newStrength, usage_context: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plano de expansão / uso criativo</label>
                      <textarea className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-medium h-20 resize-none outline-none focus:bg-white focus:border-amber-300"
                        placeholder="Como poderia usar mais essa força de forma nova?" value={newStrength.growth_plan} onChange={e => setNewStrength({...newStrength, growth_plan: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequência de uso</label>
                      <select className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-100 text-sm font-bold outline-none" value={newStrength.frequency} onChange={e => setNewStrength({...newStrength, frequency: e.target.value})}>
                        {['Raramente', 'Semanal', 'Diário', 'Múltiplas vezes ao dia'].map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <button onClick={addStrength} className="w-full h-12 bg-amber-500 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-amber-600 transition flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Mapear Força
                    </button>
                  </div>

                  <div className="space-y-3">
                    {strengths.length === 0 ? (
                      <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center"><p className="text-slate-400 font-bold">Nenhuma força mapeada.</p></div>
                    ) : strengths.map(s => (
                      <div key={s.id} className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm relative group">
                        <button onClick={() => { const upd = strengths.filter(x => x.id !== s.id); setStrengths(upd); saveAll({ strengths: upd }); }} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Star size={16}/></div>
                          <div>
                            <h4 className="font-black text-slate-800 text-sm uppercase">{s.virtue}</h4>
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 rounded font-bold">{s.frequency}</span>
                          </div>
                        </div>
                        {s.usage_context && <p className="text-xs text-slate-600 mb-1"><span className="font-black text-slate-800">Como usa: </span>{s.usage_context}</p>}
                        {s.growth_plan && <p className="text-xs text-amber-700 italic"><span className="font-black">Plano: </span>{s.growth_plan}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GRATIDÃO */}
              {activeSub === 'gratitude' && (
                <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4 animate-slideUpFade">
                  <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-black text-slate-800 text-base uppercase tracking-tight">Diário de Gratidão</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Data</label>
                        <input type="date" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newGratitude.date} onChange={e => setNewGratitude({...newGratitude, date: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Intensidade (1-10)</label>
                        <input type="number" min="1" max="10" className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-100 text-sm outline-none" value={newGratitude.intensity} onChange={e => setNewGratitude({...newGratitude, intensity: Number(e.target.value)})} />
                      </div>
                    </div>
                    {newGratitude.entries.map((entry, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Gratidão #{idx + 1}</label>
                        <input className="w-full h-11 px-3 rounded-xl bg-amber-50/40 border border-amber-100 text-sm outline-none focus:bg-white focus:border-amber-300 font-medium"
                          placeholder={`Sou grato(a) por...`}
                          value={entry}
                          onChange={e => { const upd = [...newGratitude.entries]; upd[idx] = e.target.value; setNewGratitude({...newGratitude, entries: upd}); }}
                        />
                      </div>
                    ))}
                    <button onClick={addGratitude} className="w-full h-12 bg-amber-500 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-amber-600 transition flex items-center justify-center gap-2">
                      {saving ? <Loader2 size={16} className="animate-spin"/> : <Heart size={16}/>} Registrar Gratidão
                    </button>
                  </div>

                  <div className="space-y-3">
                    {gratitudeEntries.length === 0 ? (
                      <div className="bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm text-center"><p className="text-slate-400 font-bold">Nenhum registro de gratidão ainda.</p></div>
                    ) : gratitudeEntries.map(g => (
                      <div key={g.id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-5 relative group">
                        <button onClick={() => { const upd = gratitudeEntries.filter(x => x.id !== g.id); setGratitudeEntries(upd); saveAll({ gratitude_entries: upd }); }} className="absolute top-4 right-4 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[10px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded uppercase">{g.date ? new Date(g.date).toLocaleDateString() : ''}</span>
                          <span className="text-[10px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded">❤️ Intensidade: {g.intensity}/10</span>
                        </div>
                        <ul className="space-y-1">
                          {(g.entries || []).filter((e: string) => e).map((e: string, idx: number) => (
                            <li key={idx} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                              <span className="text-amber-400 font-black">#{idx + 1}</span> {e}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PERMA */}
              {activeSub === 'wellbeing' && (
                <div className="bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm animate-slideUpFade">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3"><SunMedium className="text-amber-500"/> Modelo PERMA</h3>
                      <p className="text-sm text-slate-500 mt-1">Mapeie os 5 pilares do florescimento de Seligman</p>
                    </div>
                    <button onClick={saveWellbeing} className="bg-amber-500 text-white px-6 py-2 rounded-xl font-black uppercase text-xs shadow hover:bg-amber-600 transition flex items-center gap-2">
                      {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar PERMA
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {[
                      { key: 'positive_emotions', label: 'P — Emoções Positivas', color: 'yellow', emoji: '😊', desc: 'Sentimentos de alegria, amor, esperança, gratidão...' },
                      { key: 'engagement', label: 'E — Engajamento / Flow', color: 'blue', emoji: '🔥', desc: 'Atividades que causam imersão total, time flies...' },
                      { key: 'relationships', label: 'R — Relacionamentos', color: 'rose', emoji: '❤️', desc: 'Conexões positivas e suporte social...' },
                      { key: 'meaning', label: 'M — Sentido e Propósito', color: 'purple', emoji: '🌟', desc: 'Pertencer a algo maior, valores, missão de vida...' },
                      { key: 'achievement', label: 'A — Conquistas / Realização', color: 'emerald', emoji: '🏆', desc: 'Metas alcançadas, progresso, autodeterminação...' },
                    ].map(p => (
                      <div key={p.key} className={`p-5 rounded-2xl border border-${p.color}-100 bg-${p.color}-50/30 space-y-3`}>
                        <div>
                          <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2">{p.emoji} {p.label}</h4>
                          <p className="text-[11px] text-slate-500 mt-1 font-medium">{p.desc}</p>
                        </div>
                        <textarea className="w-full h-28 p-3 rounded-xl bg-white border border-slate-100 text-xs resize-none outline-none focus:border-amber-300 transition font-medium"
                          placeholder="Como está esse pilar para o paciente?"
                          value={(wellbeing as any)[p.key]}
                          onChange={e => setWellbeing({...wellbeing, [p.key]: e.target.value})}
                        />
                      </div>
                    ))}
                    <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/40 space-y-3 md:col-span-2 xl:col-span-1">
                      <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight flex items-center gap-2"><BookOpen size={16} className="text-slate-500"/> Notas Gerais PERMA</h4>
                      <textarea className="w-full h-36 p-3 rounded-xl bg-white border border-slate-100 text-xs resize-none outline-none focus:border-amber-300 transition font-medium"
                        placeholder="Observações gerais, áreas de intervenção prioritária..."
                        value={wellbeing.perma_notes}
                        onChange={e => setWellbeing({...wellbeing, perma_notes: e.target.value})}
                      />
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
