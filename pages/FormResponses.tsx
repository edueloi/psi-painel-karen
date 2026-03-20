import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Patient, InterpretationRule } from '../types';
import {
  ArrowLeft, FileText, Clock, User, Calculator,
  ChevronRight, CheckCircle2, Phone, Mail, Info, Sparkles, X, Bot,
  ClipboardList
} from 'lucide-react';
import { useDateFormat } from '../contexts/UserPreferencesContext';
import { FilterLine, FilterLineSection } from '../components/UI/FilterLine';
import { AppCard } from '../components/UI/AppCard';
import { Button } from '../components/UI/Button';
import { Combobox } from '../components/UI/Combobox';
import { DatePicker } from '../components/UI/DatePicker';

type FormResponse = {
  id: string;
  patient_id?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  respondent_phone?: string | null;
  score?: number | null;
  answers_json?: any;
  created_at?: string;
};

export const FormResponses: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [formTitle, setFormTitle] = useState('Formulário');
  const [interpretations, setInterpretations] = useState<InterpretationRule[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPatientId, setFilterPatientId] = useState<string>('all');

  // Data de início e fim do filtro — padrão: mês atual (dia 1 até último dia)
  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const [filterDateFrom, setFilterDateFrom] = useState<string>(defaultFrom);
  const [filterDateTo, setFilterDateTo] = useState<string>(defaultTo);
  const [questionsMetadata, setQuestionsMetadata] = useState<any[]>([]);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysisMap, setAiAnalysisMap] = useState<Record<string, string>>({});

  const { user } = useAuth();

  // Pré-filtros vindos da URL (ex: clique no histórico do paciente)
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) setFilterPatientId(pid);

    const df = searchParams.get('dateFrom');
    if (df) {
      // Se veio uma data específica, usa ela como início e o último dia do mês dela como fim
      const d = new Date(df + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setFilterDateFrom(df);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        const dateTo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
        setFilterDateTo(dateTo);
      }
    }
  }, [searchParams]);
  
  const patientOptions = React.useMemo(() => [
    { id: 'all', label: 'Todos os Pacientes' },
    ...patients.map(p => ({ id: String(p.id), label: p.full_name || p.name || 'Paciente s/ nome' }))
  ], [patients]);

  const getPatientName = (patientId?: string | null) => {
    if (!patientId) return '';
    return patients.find((p) => String(p.id) === String(patientId))?.full_name || '';
  };

  const generateAiAnalysis = async (response: FormResponse) => {
    setAnalyzingId(response.id);
    try {
      const resp = await api.post<any>('/ai/analyze-form', {
        formTitle,
        respondentName: getPatientName(response.patient_id) || response.respondent_name || 'Usuário',
        answers: response.answers_json,
        score: response.score,
        interpretations,
        patientData: patients.find(p => String(p.id) === String(response.patient_id))
      });
      // Limpeza de blocos de markdown caso a IA ainda envie
      const cleanAnalysis = resp.analysis
        .replace(/```markdown/g, '')
        .replace(/```/g, '')
        .replace(/##/g, '') // remove títulos extras para a UI pois já colocamos estilizados
        .trim();
        
      setAiAnalysisMap(prev => ({ ...prev, [response.id]: cleanAnalysis }));

      // Vincular automaticamente ao prontuário do paciente se houver ID
      if (response.patient_id) {
        api.post('/ai/save-analysis', {
          patientId: response.patient_id,
          formTitle,
          analysis: cleanAnalysis
        }).catch(err => console.error("Falha ao salvar analise automatica", err));
      }

    } catch (e) {
      console.error(e);
      alert('Erro ao gerar análise. Verifique se a chave de API está configurada.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleExportPDF = async (responseId: string, respondentName: string) => {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    
    const input = document.getElementById(`pdf-report-content-${responseId}`);
    if (!input) return;

    // Abrimos temporariamente o template escondido
    input.style.display = 'block';
    
    try {
      const canvas = await html2canvas(input, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794 // Largura de uma folha A4 em px (aprox)
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // largura A4
      const pageHeight = 297; // altura A4
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Adiciona primeira página
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Adiciona páginas extras se necessário (paginação)
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Relatorio_Aurora_${respondentName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
    } finally {
      input.style.display = 'none';
    }
  };

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const [formData, responsesData, patientsData] = await Promise.all([
        api.get<any>(`/forms/${id}`),
        api.get<any[]>(`/forms/${id}/responses`),
        api.get<Patient[]>('/patients')
      ]);
      
      setFormTitle(formData.title || 'Formulário');
      setInterpretations(formData.interpretations || []);
      setQuestionsMetadata(formData.questions || []);
      
      const map: Record<string, string> = {};
      (formData.questions || []).forEach((q: any) => {
        const key = String(q.id ?? q.question_id);
        map[key] = q.question_text ?? q.text ?? '';
      });
      setQuestionsMap(map);
      
      setResponses(
        (responsesData || []).map((r: any) => {
          let answers = {};
          try {
            answers = typeof r.data === 'string' ? JSON.parse(r.data).answers : (r.data?.answers || r.answers_json || r.answers || {});
          } catch(e) { console.error("Error parsing answers", e); }
          
          return {
            id: String(r.id),
            patient_id: r.patient_id ? String(r.patient_id) : null,
            respondent_name: r.respondent_name ?? null,
            respondent_email: r.respondent_email ?? null,
            respondent_phone: r.respondent_phone ?? null,
            score: r.score ?? null,
            answers_json: answers,
            created_at: r.created_at
          };
        })
      );
      setPatients(patientsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const getInterpretation = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    return interpretations.find(i => score >= (i.minScore ?? 0) && score <= (i.maxScore ?? 999));
  };

  const { formatDate } = useDateFormat();

  const renderAnswers = (answersJson: any) => {
    if (!answersJson) return <p className="text-xs text-slate-400 italic py-4">Respostas não detalhadas.</p>;
    const entries = Object.entries(answersJson);
    if (!entries.length) return <p className="text-xs text-slate-400 italic py-4">Respostas não detalhadas.</p>;
    
    return (
      <div className="flex flex-col gap-4 py-4 text-left">
        {entries.map(([key, value]) => {
          const qMeta = questionsMetadata.find(q => String(q.id) === key);
          const label = qMeta?.question_text || qMeta?.text || questionsMap[key] || `Pergunta ${key}`;
          const display = Array.isArray(value) ? value.join(', ') : String(value);
          
          let points = 0;
          let possiblePoints: number[] = [];
          const rawOptions = qMeta?.options_json || qMeta?.options;
          if (rawOptions) {
            const opts = typeof rawOptions === 'string' ? JSON.parse(rawOptions) : rawOptions;
            if (Array.isArray(opts)) {
              possiblePoints = opts.map((o: any) => o.value || 0);
              if (Array.isArray(value)) {
                points = value.reduce((sum: number, val: any) => {
                  const opt = opts.find((o: any) => o.label === val);
                  return sum + (opt?.value || 0);
                }, 0);
              } else {
                const opt = opts.find((o: any) => o.label === value);
                points = opt?.value || 0;
              }
            }
          }

          const maxPossible = possiblePoints.length > 0 ? Math.max(...possiblePoints) : 0;

          return (
            <div key={key} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100/50 hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all duration-300 text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-2 text-left">
                    <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                      Q
                    </span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight text-left">
                      {label}
                    </p>
                  </div>
                  <p className="text-sm text-slate-700 font-black leading-relaxed text-left ml-8">
                    {display || <span className="text-slate-300 italic font-medium">Sem resposta</span>}
                  </p>
                </div>

                {(points > 0 || maxPossible > 0) && (
                  <div className="flex items-center gap-3 shrink-0 ml-8 md:ml-0 text-left">
                    <div className="h-10 w-px bg-slate-200 hidden md:block" />
                    <div className="text-right flex flex-col items-end">
                       <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Pontuação</span>
                       <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-50 shadow-sm">
                          <span className={`text-sm font-black ${points > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                             {points}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300">/ {maxPossible}</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const filteredResponses = responses.filter(r => {
    const matchesPatient = filterPatientId === 'all' || String(r.patient_id) === String(filterPatientId);
    const dateStr = r.created_at ? r.created_at.slice(0, 10) : '';
    const matchesFrom = !filterDateFrom || dateStr >= filterDateFrom;
    const matchesTo = !filterDateTo || dateStr <= filterDateTo;
    return matchesPatient && matchesFrom && matchesTo;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 max-w-[1600px] mx-auto px-4 sm:px-8 text-left">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between pt-6 text-left">
        <div className="flex items-center gap-6 text-left">
          <Button
            variant="outline"
            size="lg"
            radius="xl"
            onClick={() => navigate('/formularios/lista')}
            className="w-14 h-14 p-0 shrink-0 border-slate-200"
          >
            <ArrowLeft size={24} />
          </Button>
          <div className="text-left">
             <div className="flex items-center gap-3 text-left">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-indigo-600 text-white px-3 py-1 rounded-lg shadow-lg shadow-indigo-100 text-left">Relatório Clínico</span>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest text-left">
                  {responses.length} Respostas · Máximo de {
                    questionsMetadata.reduce((sum, q) => {
                      const opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
                      const max = Array.isArray(opts) && opts.length > 0 ? Math.max(...opts.map((o: any) => o.value || 0)) : 0;
                      return sum + max;
                    }, 0)
                  } pts possíveis
                </span>
             </div>
             <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight mt-1 text-left">{formTitle}</h1>
          </div>
        </div>
      </div>

      <FilterLine className="shadow-lg shadow-slate-200/40 p-5 rounded-[2rem] border-slate-100/50 bg-white/80 backdrop-blur-xl">
        <FilterLineSection className="min-w-[280px]" grow>
           <Combobox
              label="Paciente"
              options={patientOptions}
              value={filterPatientId}
              onChange={(val) => setFilterPatientId(val)}
              icon={<User size={16} />}
              placeholder="Selecionar paciente"
              className="border-none"
           />
        </FilterLineSection>

        <div className="h-10 w-px bg-slate-100 hidden xl:block mx-2" />

        <FilterLineSection className="min-w-[180px]">
           <div className="w-full">
              <label className="mb-2 block text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                De
              </label>
              <DatePicker
                value={filterDateFrom}
                onChange={(v) => setFilterDateFrom(v || '')}
                placeholder="Data inicial"
                className="[&>button]:rounded-xl [&>button]:border-slate-300 [&>button]:h-[44px]"
              />
           </div>
        </FilterLineSection>

        <div className="h-10 w-px bg-slate-100 hidden xl:block mx-2" />

        <FilterLineSection className="min-w-[180px]">
           <div className="w-full">
              <label className="mb-2 block text-[12px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                Até
              </label>
              <DatePicker
                value={filterDateTo}
                onChange={(v) => setFilterDateTo(v || '')}
                placeholder="Data final"
                className="[&>button]:rounded-xl [&>button]:border-slate-300 [&>button]:h-[44px]"
              />
           </div>
        </FilterLineSection>

        {(filterPatientId !== 'all' || filterDateFrom !== defaultFrom || filterDateTo !== defaultTo) && (
          <FilterLineSection>
            <Button
              variant="outline"
              size="sm"
              radius="xl"
              onClick={() => {
                setFilterPatientId('all');
                setFilterDateFrom(defaultFrom);
                setFilterDateTo(defaultTo);
              }}
              className="text-rose-500 border-rose-100 hover:bg-rose-50"
            >
              Limpar Filtros
            </Button>
          </FilterLineSection>
        )}
      </FilterLine>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-left">
        {/* Rules Info */}
        <div className="lg:col-span-1 space-y-6 text-left">
          <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-900/10 flex flex-col gap-8 sticky top-8 text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Calculator size={26} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight text-left">Metodologia</h3>
            </div>
            
            <div className="space-y-6 text-left">
              <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Processamento</p>
                <p className="text-xs font-medium text-slate-300 leading-relaxed text-left">
                  Este modelo utiliza somatório linear ponderado para cada opção de resposta selecionada, agrupados por escala de interpretação.
                </p>
              </div>

              <div className="space-y-3 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2 text-left">Legenda de Faixas</p>
                {interpretations.map((i, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left">
                    <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: i.color?.startsWith('bg-') ? 'currentColor' : (i.color || '#4f46e5') }} />
                    <div className="min-w-0 text-left">
                      <p className="text-xs font-black truncate text-left">{i.resultTitle}</p>
                      <p className="text-[10px] font-bold text-slate-500 text-left">{i.minScore} — {i.maxScore} pts</p>
                    </div>
                  </div>
                ))}
                {interpretations.length === 0 && (
                  <div className="py-8 text-center bg-white/5 rounded-2xl border border-dashed border-white/10">
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Sem faixas definidas</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-white/10 text-left">
               <div className="flex items-center gap-3 bg-indigo-600/20 p-4 rounded-2xl border border-indigo-500/20 text-left">
                  <Sparkles size={18} className="text-indigo-400 shrink-0" />
                  <p className="text-[10px] font-bold text-indigo-200 leading-tight text-left">
                    Aurora AI está ativada. Você pode gerar análises automáticas para cada resposta.
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Responses List */}
        <div className="lg:col-span-3 text-left">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Cruzando dados...</p>
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="p-24 rounded-[3.5rem] border-4 border-dashed border-slate-100 text-center bg-white shadow-xl shadow-slate-200/10">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <FileText size={40} className="text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Nenhuma Resposta</h3>
              <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto font-medium">
                Nenhuma resposta encontrada para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="space-y-6 text-left">
              {filteredResponses.map((res) => {
                const patientName = getPatientName(res.patient_id);
                const inter = getInterpretation(res.score);
                const isAnalyzing = analyzingId === res.id;
                const analysis = aiAnalysisMap[res.id];
                const respondentDisplay = patientName || res.respondent_name || 'Usuário Externo';
                
                return (
                  <AppCard key={res.id} noPadding className="group overflow-visible bg-white border-slate-100 hover:border-indigo-500/10 shadow-lg hover:shadow-2xl transition-all duration-700 rounded-[2.5rem]">
                    {/* Header Item */}
                    <div className="p-8 flex flex-col md:flex-row gap-10 justify-between items-start text-left">
                      <div className="flex items-start gap-6 text-left">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all duration-500 shadow-inner group-hover:shadow-xl group-hover:rotate-12 shrink-0">
                          <User size={32} />
                        </div>
                        <div className="space-y-3 text-left">
                          <div className="flex items-center gap-3 flex-wrap text-left">
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight text-left leading-none">
                              {respondentDisplay}
                            </h3>
                            {patientName ? (
                              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl border border-emerald-100">
                                <CheckCircle2 size={12} /> Paciente Ativo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 px-3 py-1.5 rounded-xl border border-slate-100">
                                <Info size={12} /> Respondente Externo
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 flex-wrap text-left mt-3">
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                               <Clock size={14} className="text-indigo-400" />
                               {formatDate(res.created_at)}
                            </div>
                            {res.respondent_phone && (
                               <div className="flex items-center gap-2 text-slate-400 font-bold text-xs text-left">
                                  <Phone size={14} className="text-indigo-400" />
                                  {res.respondent_phone}
                               </div>
                            )}
                            {res.respondent_email && (
                               <div className="flex items-center gap-2 text-slate-400 font-bold text-xs text-left">
                                  <Mail size={14} className="text-indigo-400" />
                                  {res.respondent_email}
                               </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-10">
                        {/* Score Indicator */}
                        {res.score !== null && (
                          <div className={`p-4 rounded-2xl border-2 flex items-center gap-6 shadow-sm transition-all ${
                            inter?.color?.includes('bg-') ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-white border-slate-800'
                          } text-left`}>
                            <div className="text-center pr-4 border-r border-white/20 shrink-0 text-left">
                              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5 text-left">SCORE</p>
                              <p className="text-2xl font-black text-left">{res.score}</p>
                            </div>
                            <div className="min-w-[100px] text-left">
                              <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-80 mb-0.5 leading-none text-left">RESULTADO</p>
                              <p className="text-[13px] font-black leading-tight tracking-tight uppercase text-left">{inter?.resultTitle || 'Avaliado'}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                             <p className="text-xs font-bold text-emerald-600">Completo</p>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all duration-500 group-hover:rotate-90">
                             <ChevronRight size={24} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Analysis Area */}
                    <div className="px-8 pb-4">
                       {analysis ? (
                          <div id={`analysis-card-${res.id}`} className="bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-500">
                             <div className="p-8 border-b border-indigo-100/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                   <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                      <Sparkles size={22} />
                                   </div>
                                   <div>
                                      <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Análise da Aurora AI</h4>
                                      <p className="text-[10px] font-bold text-indigo-500">Insights Clínicos e Sugestões</p>
                                   </div>
                                </div>
                                <div className="flex items-center gap-3">
                                   <button 
                                      onClick={() => handleExportPDF(res.id, respondentDisplay)}
                                      className="flex items-center gap-2 px-6 py-3 bg-white border border-indigo-100 rounded-2xl text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all"
                                   >
                                      <FileText size={16} /> Baixar Relatório PDF
                                   </button>
                                   <button 
                                      onClick={() => setAiAnalysisMap(p => { const next = {...p}; delete next[res.id]; return next; })}
                                      className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                   >
                                      <X size={18} />
                                   </button>
                                </div>
                             </div>
                             
                             <div className="p-10 bg-white">
                                <div 
                                   className="text-sm text-slate-700 leading-relaxed font-medium markdown-content"
                                   dangerouslySetInnerHTML={{ 
                                      __html: analysis
                                         .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900 block mt-6 mb-2">$1</strong>')
                                         .replace(/\n/g, '<br/>') 
                                   }} 
                                />

                                <div className="mt-10 pt-10 border-t border-slate-100 flex items-center justify-between">
                                   <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">PsiFlux Intelligence · Relatório Gerado em {new Date().toLocaleDateString()}</p>
                                   <p className="text-[9px] font-black text-indigo-300 uppercase">Análise Automática Orientada por IA</p>
                                </div>
                             </div>

                             {/* TEMPLATE PARA O PDF (Invisível na UI mas capturado pelo html2canvas) */}
                             <div 
                                id={`pdf-report-content-${res.id}`} 
                                className="bg-white p-[25mm] w-[210mm] text-slate-800"
                                style={{ display: 'none', position: 'absolute', left: '-10000px', top: '0' }}
                             >
                                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-12">
                                   <div>
                                      {user?.clinicLogoUrl ? (
                                         <img src={getStaticUrl(user.clinicLogoUrl)} alt="Logo" className="h-20 mb-3 object-contain" />
                                      ) : (
                                         <div className="h-16 w-16 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black text-2xl">P</div>
                                      )}
                                      <p className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">{user?.companyName || 'Clínica de Psicologia'}</p>
                                   </div>
                                   <div className="text-right">
                                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">{user?.name || 'Profissional'}</h2>
                                      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">CRP: {user?.crp || 'Não informado'}</p>
                                      {user?.email && <p className="text-xs text-slate-400 mt-1">{user.email}</p>}
                                   </div>
                                </div>

                                <div className="text-center mb-16 px-10">
                                   <h1 className="text-3xl font-black text-slate-900 uppercase tracking-[0.3em] leading-tight border-y border-slate-100 py-6">Relatório de Análise Clínica</h1>
                                   <div className="flex justify-center gap-6 mt-6">
                                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Formulário: <span className="text-slate-900">{formTitle}</span></p>
                                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Respondente: <span className="text-slate-900">{respondentDisplay}</span></p>
                                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Data: <span className="text-slate-900">{new Date().toLocaleDateString('pt-BR')}</span></p>
                                   </div>
                                </div>

                                <div 
                                   className="text-[12pt] leading-relaxed text-slate-800 space-y-6 text-justify"
                                   dangerouslySetInnerHTML={{ 
                                      __html: analysis
                                         .replace(/\*\*(.*?)\*\*/g, '<strong style="display: block; margin-top: 35px; margin-bottom: 15px; color: #0f172a; font-size: 14pt; font-weight: 900; border-left: 5px solid #4f46e5; padding-left: 15px; text-transform: uppercase; letter-spacing: 1px;">$1</strong>')
                                         .replace(/\n/g, '<br/>') 
                                   }} 
                                />

                                <div className="mt-32 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
                                   <div className="max-w-[300px]">
                                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Tecnologia PsiFlux</p>
                                      <p className="text-[9px] leading-relaxed text-slate-400 italic">Este documento foi gerado pela inteligência artificial Aurora e deve ser validado pelo profissional responsável para fins legais e clínicos.</p>
                                   </div>
                                   <div className="text-right flex flex-col items-center">
                                      <div className="w-64 h-px bg-slate-300 mb-4"></div>
                                      <p className="text-[11pt] font-black text-slate-900 mb-0.5">{user?.name}</p>
                                      <p className="text-[10pt] font-bold text-slate-400 uppercase tracking-widest leading-none">CRP: {user?.crp}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                       ) : (
                          <div className="flex items-center justify-between bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-indigo-400 border border-slate-100">
                                   <Bot size={20} className={isAnalyzing ? 'animate-spin' : ''} />
                                </div>
                                <div>
                                   <p className="text-xs font-black text-slate-800 uppercase tracking-widest">Deseja uma análise da Aurora?</p>
                                   <p className="text-[10px] font-bold text-slate-400">Gere um insight clínico automático baseado nestas respostas.</p>
                                </div>
                             </div>
                             <button
                                onClick={() => generateAiAnalysis(res)}
                                disabled={isAnalyzing}
                                className="flex items-center gap-3 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                             >
                                {isAnalyzing ? 'Analisando...' : (
                                   <>
                                      <Sparkles size={16} /> Gerar Análise Clínica
                                   </>
                                )}
                             </button>
                          </div>
                       )}
                    </div>

                    {/* Details Accordion */}
                    <div className="px-8 pb-8 text-left">
                       <details className="group/details">
                        <summary className="list-none cursor-pointer flex items-center justify-between py-6 border-t border-slate-50 hover:bg-slate-50/50 rounded-2xl transition-all duration-300">
                          <div className="flex items-center gap-4 text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] group-hover:translate-x-2 transition-transform text-left">
                            <ClipboardList size={18} /> VER DETALHES DAS RESPOSTAS
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center transition-all group-hover:border-indigo-200 group-hover:shadow-md">
                            <ChevronRight size={22} className="text-slate-300 group-open/details:rotate-90 transition-transform" />
                          </div>
                        </summary>
                        <div className="animate-in fade-in slide-in-from-top-6 duration-700 pt-6 text-left">
                          <div className="mb-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row gap-8 text-left">
                             <div className="w-16 h-16 bg-white rounded-2.5xl flex items-center justify-center text-indigo-600 shadow-xl shadow-slate-200 border border-slate-50 shrink-0">
                                <Calculator size={30} />
                             </div>
                             <div className="text-left py-1">
                                <div className="flex items-center gap-2 mb-2 text-left">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-left">Metodologia Ponderada</span>
                                  <div className="h-px bg-indigo-100 flex-1"></div>
                                </div>
                                <h4 className="text-lg font-black text-slate-800 mb-2 text-left">Análise Técnica do Resultado</h4>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed text-left">
                                   Score Final: <strong className="font-black text-indigo-700">{res.score}</strong>. Este valor é o resultado da soma de cada opção parametrizada no formulário. 
                                   A interpretação <strong className="font-black text-indigo-600">{inter ? inter.resultTitle : '—'}</strong> é aplicada automaticamente para faixas entre {inter?.minScore || 0} e {inter?.maxScore || 'máximo'}.
                                </p>
                             </div>
                          </div>
                          {renderAnswers(res.answers_json)}
                        </div>
                      </details>
                    </div>
                  </AppCard>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
