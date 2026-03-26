import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gauge, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Plus,
  Save,
  FileText,
  ChevronRight,
  TrendingUp,
  Brain,
  Clock,
  Layout,
  BookOpen,
  Share2,
  CheckCircle,
  Copy
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Button';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Modal } from '../../components/UI/Modal';
import { Patient } from '../../types';
import { api } from '../../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────
const DISC_ENTRIES = [
  { id: 'q1',  text: 'Gosto de resolver as coisas rapidamente.', block: 'D' },
  { id: 'q2',  text: 'Fico incomodado(a) quando percebo lentidão ou indecisão nos outros.', block: 'D' },
  { id: 'q3',  text: 'Costumo assumir a liderança quando ninguém toma iniciativa.', block: 'D' },
  { id: 'q4',  text: 'Prefiro agir logo do que pensar por muito tempo.', block: 'D' },
  { id: 'q5',  text: 'Sinto necessidade de ter controle sobre o que está acontecendo.', block: 'D' },
  { id: 'q6',  text: 'Tenho facilidade para confrontar situações difíceis.', block: 'D' },
  { id: 'q7',  text: 'Fico frustrado(a) quando as coisas não saem como planejei.', block: 'D' },
  { id: 'q8',  text: 'Em conflitos, costumo me posicionar de forma direta.', block: 'D' },
  { id: 'q9',  text: 'Gosto de conversar e me conectar com pessoas.', block: 'I' },
  { id: 'q10', text: 'Sinto-me motivado(a) quando recebo atenção ou reconhecimento.', block: 'I' },
  { id: 'q11', text: 'Tenho facilidade para entusiasmar outras pessoas.', block: 'I' },
  { id: 'q12', text: 'Gosto de ambientes leves, dinâmicos e com interação.', block: 'I' },
  { id: 'q13', text: 'Costumo expressar com facilidade o que penso e sinto.', block: 'I' },
  { id: 'q14', text: 'Gosto de ser visto(a) como alguém agradável e inspirador(a).', block: 'I' },
  { id: 'q15', text: 'Fico mais animado(a) quando estou em grupo do que sozinho(a).', block: 'I' },
  { id: 'q16', text: 'Valorizo ambientes calmos, previsíveis e harmoniosos.', block: 'S' },
  { id: 'q17', text: 'Mudanças bruscas costumam me deixar desconfortável.', block: 'S' },
  { id: 'q18', text: 'Prefiro manter uma rotina estável.', block: 'S' },
  { id: 'q19', text: 'Costumo evitar conflitos para preservar a paz.', block: 'S' },
  { id: 'q20', text: 'Sou uma pessoa paciente e constante.', block: 'S' },
  { id: 'q21', text: 'Gosto de ajudar os outros de forma acolhedora.', block: 'S' },
  { id: 'q22', text: 'Preciso de um tempo maior para me adaptar a novidades.', block: 'S' },
  { id: 'q23', text: 'Sou detalhista e gosto das coisas bem feitas.', block: 'C' },
  { id: 'q24', text: 'Costumo analisar bastante antes de tomar decisões.', block: 'C' },
  { id: 'q25', text: 'Fico incomodado(a) quando percebo erros, desorganização ou falta de critério.', block: 'C' },
  { id: 'q26', text: 'Gosto de regras claras e orientações bem definidas.', block: 'C' },
  { id: 'q27', text: 'Tenho tendência a cobrar muito de mim mesmo(a).', block: 'C' },
  { id: 'q28', text: 'Prefiro ter certeza antes de agir.', block: 'C' },
  { id: 'q29', text: 'Valorizo precisão, lógica e planejamento.', block: 'C' },
  { id: 'q30', text: 'Reviso mentalmente o que fiz para ver se poderia ter feito melhor.', block: 'C' },
];

const BLOCK_COLORS = {
  D: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Dominância' },
  I: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Influência' },
  S: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Estabilidade' },
  C: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', label: 'Conformidade' },
};

export const DISCProfessionalPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPid = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();

  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPid);
  const [patientSearch, setPatientSearch] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);

  const [history, setHistory] = useState<any[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | number | null>(null);
  const [detailResult, setDetailResult] = useState<any | null>(null);

  const getShareLink = () => {
    const base = `${window.location.origin}/f/disc`;
    const params = new URLSearchParams();
    if (selectedPatientId) params.set('p', selectedPatientId);
    if (user?.shareToken) params.set('u', user.shareToken);
    return `${base}?${params.toString()}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    success('Copiado!', 'Link de compartilhamento copiado.');
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Olá! Gostaria que você respondesse ao Mapeamento DISC. Acesse pelo link seguro: ${getShareLink()}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  // Load Patients
  useEffect(() => {
    api.get<any[]>('/patients').then(data => {
      setPatients((data || []).map(p => ({
        ...p,
        full_name: p.name || p.full_name || '',
        status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
      })));
    }).finally(() => setLoadingPatients(false));
  }, []);

  // Load History
  useEffect(() => {
    if (!selectedPatientId) {
      setHistory([]);
      return;
    }
    const load = async () => {
      try {
        const resp = await api.get<any[]>(`/clinical-tools/${selectedPatientId}/disc-evaluative`);
        if (Array.isArray(resp)) setHistory(resp);
        else setHistory([]);
      } catch (err) { setHistory([]); }
    };
    load();
  }, [selectedPatientId]);

  const calculateScores = () => {
    const raw = { D: 0, I: 0, S: 0, C: 0 };
    const counts = { D: 8, I: 7, S: 7, C: 8 };
    
    DISC_ENTRIES.forEach(q => {
      raw[q.block as keyof typeof raw] += currentAnswers[q.id] || 0;
    });

    return {
      D: Number((raw.D / counts.D).toFixed(2)),
      I: Number((raw.I / counts.I).toFixed(2)),
      S: Number((raw.S / counts.S).toFixed(2)),
      C: Number((raw.C / counts.C).toFixed(2)),
    };
  };

  const currentScores = useMemo(() => calculateScores(), [currentAnswers]);

  const handleSave = async () => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione um paciente.');
      return;
    }
    if (Object.keys(currentAnswers).length < 30) {
      info('Atenção', 'Preencha todas as 30 observações de perfil.');
      return;
    }

    setIsSaving(true);
    try {
      const newResult = {
        id: Date.now(),
        date: new Date().toISOString(),
        answers: currentAnswers,
        scores: currentScores,
        type: 'evaluative'
      };
      const updatedHistory = [...history, newResult];
      await api.put(`/clinical-tools/${selectedPatientId}/disc-evaluative`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      setHistory(updatedHistory);
      setCurrentAnswers({});
      setIsApplying(false);
      success('DISC Avaliativo Salvo', 'O perfil clínico foi registrado com sucesso.');
    } catch (err) {
      error('Erro', 'Falha ao salvar o perfil DISC.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateAIResult = async (resultId: string | number) => {
    const result = history.find(h => h.id === resultId);
    if (!result) return;

    setAnalyzingId(resultId);
    try {
      const resp = await api.post<any>('/ai/analyze-clinical-tool', {
        toolName: 'DISC Avaliativo (Perfil Marston)',
        patientId: selectedPatientId,
        data: {
          scores: result.scores,
          blocks: BLOCK_COLORS
        }
      });

      const analysis = resp.analysis || 'Análise indisponível.';
      const updatedHistory = history.map(h => h.id === resultId ? { ...h, analysis } : h);
      
      await api.put(`/clinical-tools/${selectedPatientId}/disc-evaluative`, {
        patient_id: selectedPatientId,
        data: updatedHistory
      });
      
      setHistory(updatedHistory);
      success('Aurora Analisou', 'Perfil comportamental expandido pela IA.');
    } catch (err) {
      error('Erro', 'Erro na geração da análise.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const RadarGraphic = ({ scores }: { scores: any }) => {
    const size = 300;
    const center = size / 2;
    const radius = size * 0.35;
    const factors = ['D', 'I', 'S', 'C'];
    
    const points = factors.map((f, i) => {
      const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
      const val = (scores[f] || 0) / 5; // normalized 0-1
      const r = radius * val;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    }).join(' ');

    const webPaths = [0.25, 0.5, 0.75, 1].map(scale => {
      return factors.map((_, i) => {
        const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
        const r = radius * scale;
        return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
      }).join(' ');
    });

    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-2xl">
        {webPaths.map((path, i) => (
          <polygon key={i} points={path} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        ))}
        {factors.map((_, i) => {
          const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
          return (
            <line 
              key={i} 
              x1={center} y1={center} 
              x2={center + radius * Math.cos(angle)} y2={center + radius * Math.sin(angle)} 
              stroke="rgba(255,255,255,0.1)" strokeWidth="1"
            />
          );
        })}
        {factors.map((f, i) => {
          const angle = (Math.PI * 2 * i) / factors.length - Math.PI / 2;
          const r = radius + 25;
          return (
            <text 
              key={i} 
              x={center + r * Math.cos(angle)} y={center + r * Math.sin(angle)} 
              fill="white" fontSize="10" fontWeight="900" textAnchor="middle" alignmentBaseline="middle"
              className="uppercase tracking-widest opacity-40 font-black"
            >
              {f}
            </text>
          );
        })}
        <polygon points={points} fill="rgba(139, 92, 246, 0.3)" stroke="#8b5cf6" strokeWidth="3" strokeLinejoin="round" />
        {points.split(' ').map((p, i) => {
          const [x, y] = p.split(',');
          return <circle key={i} cx={x} cy={y} r="4" fill="#8b5cf6" stroke="white" strokeWidth="2" />;
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <PageHeader
        title="DISC Avaliativo (Clínico)"
        subtitle="Mapeamento técnico de tendências comportamentais para uso em sessão."
        icon={<Gauge className="text-violet-500" />}
        showBackButton
        onBackClick={() => navigate('/caixa-ferramentas')}
        actions={
          <div className="flex gap-2">
             <Button
                variant="outline"
                size="sm"
                radius="xl"
                leftIcon={<Share2 size={16} />}
                onClick={() => selectedPatientId ? setIsSharing(true) : info('Selecione um paciente', 'Escolha um prontuário para compartilhar o link.')}
                className="bg-white text-slate-600 border-slate-200"
             >
                Compartilhar
             </Button>
             <Button
                variant="primary" 
                size="sm"
                radius="xl"
                leftIcon={<Plus size={16} />}
                onClick={() => selectedPatientId ? setIsApplying(true) : info('Selecione um paciente', 'Escolha um prontuário para realizar o mapeamento.')}
                className="bg-violet-600 text-white shadow-xl shadow-violet-200"
             >
                Novo Mapeamento
             </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        <div className="space-y-6">
          <ClinicalSidebar 
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={id => setSelectedPatientId(id)}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={loadingPatients}
            t={k => k}
          />

          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <BookOpen size={14} className="text-violet-400" /> Referência Técnica
              </h4>
              <div className="space-y-3">
                 {Object.entries(BLOCK_COLORS).map(([k, v]) => (
                   <div key={k} className="space-y-1">
                      <p className={`text-[10px] font-black uppercase ${v.color}`}>{k} — {v.label}</p>
                      <p className="text-[9px] text-slate-400 font-medium italic leading-tight">Reage a {k === 'D' ? 'Desafios e Resultados' : k === 'I' ? 'Pessoas e Networking' : k === 'S' ? 'Ritmo e Estabilidade' : 'Regras e Detalhes'}.</p>
                   </div>
                 ))}
              </div>
          </div>
        </div>

        {!selectedPatientId ? (
          <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
              <Gauge size={32} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-loose">Selecione um prontuário para realizar o DISC Avaliativo.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                   <Brain size={240} />
                </div>
                
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2 text-violet-400 mb-10">
                   <Target size={18} /> Cockpit de Tendência Comportamental
                </h3>

                <div className="flex flex-col items-center gap-12">
                   <div className="shrink-0 bg-white/5 p-10 rounded-[3rem] border border-white/10 backdrop-blur-sm">
                      <RadarGraphic scores={history.length > 0 ? history[history.length - 1].scores : currentScores} />
                   </div>
                   <div className="flex-1 space-y-6 w-full">
                      {(['D', 'I', 'S', 'C'] as const).map(k => {
                         const lastRes = history.length > 0 ? history[history.length - 1] : null;
                         const score = lastRes ? lastRes.scores[k] : currentScores[k];
                         const v = BLOCK_COLORS[k];
                         return (
                           <div key={k} className="space-y-2">
                              <div className="flex items-center justify-between">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{v.label}</span>
                                 <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 ${v.color}`}>{score >= 3.5 ? 'Forte' : score >= 2.5 ? 'Moderado' : 'Baixo'}</span>
                              </div>
                              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                 <div className={`h-full transition-all duration-1000 ${v.color.replace('text', 'bg')}`} style={{ width: `${(score / 5) * 100}%` }} />
                              </div>
                           </div>
                         );
                      })}
                      <div className="pt-4 border-t border-white/10 text-slate-500">
                         <p className="text-[9px] font-black uppercase tracking-widest italic leading-relaxed">Perfil Técnico da Última Observação</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-8">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp size={16} className="text-violet-500" /> Evolução de Adaptabilidade
                    </h4>
                    <div className="h-56 w-full bg-slate-50 rounded-3xl border border-slate-100 p-5 flex items-end gap-2 relative">
                       {history.length < 2 && (
                         <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 backdrop-blur-[2px] rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ponto único de observação</p>
                         </div>
                       )}
                       {history.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(res => (
                         <div key={res.id} className="flex-1 flex flex-col justify-end gap-1 h-full min-w-[30px] group cursor-pointer relative" onClick={() => setDetailResult(res)}>
                            <div className="bg-blue-500/20 w-full rounded-t-lg" style={{ height: `${(res.scores.C / 5) * 100}%` }} />
                            <div className="bg-emerald-500/40 w-full" style={{ height: `${(res.scores.S / 5) * 100}%` }} />
                            <div className="bg-amber-500/60 w-full" style={{ height: `${(res.scores.I / 5) * 100}%` }} />
                            <div className="bg-red-500/80 w-full rounded-b-lg" style={{ height: `${(res.scores.D / 5) * 100}%` }} />
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <div className="px-8 py-4 border-b border-slate-50 flex items-center justify-between">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico de Mapeamento</p>
                       <History size={16} className="text-slate-300" />
                    </div>
                    <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                       {history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(res => (
                         <div key={res.id} className="p-8 hover:bg-slate-50 transition-all group flex items-center justify-between">
                            <div className="space-y-4 flex-1">
                               <div className="flex items-center gap-2">
                                  <Clock size={12} className="text-violet-400" />
                                  <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{new Date(res.date).toLocaleDateString()}</span>
                                  {res.analysis && <Sparkles size={12} className="text-violet-500 animate-pulse" />}
                               </div>
                               <div className="grid grid-cols-4 gap-2">
                                  {Object.entries(res.scores).map(([k, v]: any) => (
                                     <div key={k} className="flex flex-col">
                                        <span className="text-[8px] font-black text-slate-400 uppercase">{k}</span>
                                        <span className={`text-[12px] font-black ${BLOCK_COLORS[k as keyof typeof BLOCK_COLORS].color}`}>{v}</span>
                                     </div>
                                  ))}
                               </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <button 
                                 onClick={() => generateAIResult(res.id)}
                                 className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${res.analysis ? 'bg-violet-600 text-white shadow-lg shadow-violet-100' : 'bg-slate-50 text-slate-300 hover:text-violet-500'}`}
                               >
                                  <Sparkles size={16} className={analyzingId === res.id ? 'animate-spin' : ''} />
                               </button>
                               <button 
                                 onClick={() => setDetailResult(res)}
                                 className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-violet-500 rounded-xl flex items-center justify-center transition-all"
                               >
                                  <ChevronRight size={18} />
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={isApplying}
        onClose={() => setIsApplying(false)}
        title="Mapeamento DISC Clínico"
        subtitle={`Avaliando Perfil: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}`}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" radius="xl" onClick={() => setIsApplying(false)} className="flex-1">Cancelar</Button>
            <Button 
                variant="primary" 
                radius="xl" 
                onClick={handleSave} 
                isLoading={isSaving}
                className="flex-2 bg-violet-600 text-white"
            >
                Processar Perfil Marston <Save size={18} className="ml-2" />
            </Button>
          </div>
        }
      >
        <div className="space-y-10 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
           <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 italic text-[11px] font-medium text-slate-500">
              "Observe as tendências comportamentais do paciente durante as sessões e responda de 1 a 5 o quanto cada fator se manifesta."
           </div>
           
           {(['D', 'I', 'S', 'C'] as const).map(block => (
              <div key={block} className="space-y-8">
                 <div className={`p-4 rounded-2xl border ${BLOCK_COLORS[block].bg} ${BLOCK_COLORS[block].border} flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-current ${BLOCK_COLORS[block].color}`}>
                       <span className="font-black text-lg">{block}</span>
                    </div>
                    <div>
                       <p className={`text-xs font-black uppercase ${BLOCK_COLORS[block].color}`}>{BLOCK_COLORS[block].label}</p>
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Dimensionamento de Fator</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-3">
                    {DISC_ENTRIES.filter(e => e.block === block).map(entry => (
                       <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-white border border-slate-100 rounded-2xl hover:border-violet-200 transition-all shadow-sm">
                          <span className="text-xs font-black text-slate-700 flex-1 leading-tight">{entry.text}</span>
                          <div className="flex gap-1.5 self-end">
                             {[1, 2, 3, 4, 5].map(v => (
                               <button
                                 key={v}
                                 onClick={() => setCurrentAnswers({ ...currentAnswers, [entry.id]: v })}
                                 className={`w-11 h-11 rounded-xl text-xs font-black border transition-all ${
                                   currentAnswers[entry.id] === v 
                                   ? `bg-slate-950 text-white border-slate-950 shadow-xl scale-[1.1]` 
                                   : 'bg-white text-slate-300 border-slate-100 hover:border-violet-200 hover:text-violet-500'
                                 }`}
                               >
                                  {v}
                               </button>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           ))}
        </div>
      </Modal>

      <Modal
        isOpen={isSharing}
        onClose={() => setIsSharing(false)}
        title="Compartilhar Perfil DISC"
        subtitle="Enviar link de mapeamento para resposta externa do paciente."
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
           <div className="p-6 bg-violet-50 rounded-3xl border border-violet-100 space-y-3">
              <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest leading-none">Link de Resposta Segura</p>
              <div className="flex gap-2">
                 <input 
                   readOnly
                   value={getShareLink()}
                   className="flex-1 bg-white border border-violet-200 rounded-xl px-4 py-3 text-[10px] font-medium text-slate-500 outline-none"
                 />
                 <button 
                   onClick={handleCopyLink}
                   className="w-12 h-12 bg-white border border-violet-200 rounded-xl flex items-center justify-center text-violet-600 hover:bg-violet-600 hover:text-white transition-all shadow-sm"
                 >
                    {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                 </button>
              </div>
           </div>

           <div className="space-y-3">
              <Button 
                variant="primary" 
                radius="xl" 
                className="w-full py-8 bg-emerald-600 border-b-4 border-emerald-800 hover:bg-slate-950" 
                onClick={handleWhatsApp}
              >
                 Enviar via WhatsApp
              </Button>
              <Button 
                variant="outline" 
                radius="xl" 
                className="w-full py-8 text-slate-400 font-black uppercase tracking-widest text-[10px]"
                onClick={() => setIsSharing(false)}
              >
                 Cancelar
              </Button>
           </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!detailResult}
        onClose={() => setDetailResult(null)}
        title="Detalhamento do Perfil"
        subtitle={detailResult ? new Date(detailResult.date).toLocaleDateString() : ''}
        maxWidth="max-w-3xl"
      >
        {detailResult && (
          <div className="space-y-8">
             <div className="grid grid-cols-4 gap-4">
                {Object.entries(detailResult.scores).map(([k, v]: any) => (
                   <div key={k} className={`p-6 rounded-[2rem] border ${BLOCK_COLORS[k as keyof typeof BLOCK_COLORS].bg} ${BLOCK_COLORS[k as keyof typeof BLOCK_COLORS].border} text-center`}>
                      <p className={`text-2xl font-black ${BLOCK_COLORS[k as keyof typeof BLOCK_COLORS].color}`}>{v}</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">{BLOCK_COLORS[k as keyof typeof BLOCK_COLORS].label}</p>
                   </div>
                ))}
             </div>
             
             <div className="p-8 bg-slate-950 rounded-[2.5rem] mt-4 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-4">
                   <h4 className="text-[11px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                      <Sparkles size={14} /> Análise Aurora IA
                   </h4>
                   <p className="text-sm text-slate-300 leading-relaxed italic">
                      {detailResult.analysis || "Nenhuma análise gerada para este registro. Clique no botão de faísca no histórico para gerar."}
                   </p>
                </div>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
