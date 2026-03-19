import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Patient, InterpretationRule, FormCategory } from '../types';
import { 
  ArrowLeft, FileText, Clock, User, Filter, 
  ChevronDown, Search, Calculator, CheckCircle2, 
  Phone, Mail, ChevronRight, Target, Brain, Heart, ClipboardList, BarChart3, AlertCircle, Info, Sparkles
} from 'lucide-react';
import { 
  FilterLine, 
  FilterLineSection, 
  FilterLineSearch, 
  FilterLineSegmented 
} from '../components/UI/FilterLine';
import { AppCard } from '../components/UI/AppCard';
import { Button } from '../components/UI/Button';

type FormResponse = {
  id: string;
  form_id: string;
  form_title: string;
  form_category?: string;
  patient_id?: string | null;
  respondent_name?: string | null;
  respondent_email?: string | null;
  respondent_phone?: string | null;
  score?: number | null;
  answers_json?: any;
  created_at?: string;
};

export const FormsResponsesAll: React.FC = () => {
  const navigate = useNavigate();
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [forms, setForms] = useState<{ id: string; title: string, category?: string, interpretations: InterpretationRule[] }[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, any[]>>({});
  const [userCategories, setUserCategories] = useState<FormCategory[]>([]);
  
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const [formsData, patientsData, categoriesData] = await Promise.all([
        api.get<any[]>('/forms'),
        api.get<Patient[]>('/patients'),
        api.get<FormCategory[]>('/forms/categories').catch(() => [])
      ]);
      
      setUserCategories(categoriesData || []);
      setPatients(patientsData || []);

      const fullForms = await Promise.all(
        formsData.map(f => api.get<any>(`/forms/${f.id}`))
      );

      setForms(fullForms.map(f => ({ 
        id: String(f.id), 
        title: f.title, 
        category: f.category || '',
        interpretations: f.interpretations || [] 
      })));

      const responsesBuckets = await Promise.all(
        fullForms.map((form) =>
          api.get<any[]>(`/forms/${form.id}/responses`).then((rows) =>
            rows.map((r) => ({ 
              ...r, 
              form_title: form.title, 
              form_id: form.id,
              form_category: form.category || ''
            }))
          )
        )
      );
      
      const allResponses = responsesBuckets.flat();
      const mapped = allResponses
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((r) => {
           let answers = {};
           try {
              answers = typeof r.data === 'string' ? JSON.parse(r.data).answers : (r.data?.answers || r.answers_json || r.answers || {});
           } catch(e) { console.error(e); }

           return {
              id: String(r.id),
              form_id: String(r.form_id),
              form_title: r.form_title,
              form_category: r.form_category || '',
              patient_id: r.patient_id ? String(r.patient_id) : null,
              respondent_name: r.respondent_name ?? null,
              respondent_email: r.respondent_email ?? null,
              respondent_phone: r.respondent_phone ?? null,
              score: r.score ?? null,
              answers_json: answers,
              created_at: r.created_at
           };
        });
      setResponses(mapped);

      const qMap: Record<string, any[]> = {};
      fullForms.forEach(f => {
        qMap[String(f.id)] = f.questions || [];
      });
      setQuestionsMap(qMap);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getPatientName = (patientId?: string | null) => {
    if (!patientId) return '';
    return patients.find((p) => String(p.id) === String(patientId))?.full_name || '';
  };

  const getInterpretation = (formId: string, score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    const form = forms.find(f => f.id === formId);
    if (!form) return null;
    return form.interpretations.find(i => score >= (i.minScore ?? 0) && score <= (i.maxScore ?? 999));
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderAnswers = (formId: string, answersJson: any) => {
    if (!answersJson) return <p className="text-xs text-slate-400 italic py-4 text-left">Respostas não disponíveis.</p>;
    const questions = questionsMap[formId] || [];
    const entries = Object.entries(answersJson);
    if (!entries.length) return <p className="text-xs text-slate-400 italic py-4 text-left">Respostas não detalhadas.</p>;
    
    return (
      <div className="flex flex-col gap-4 py-4 text-left">
        {entries.map(([key, value]) => {
          const q = questions.find(item => String(item.id) === key);
          const label = q?.question_text || q?.text || `Pergunta ${key}`;
          const display = Array.isArray(value) ? value.join(', ') : String(value);

          let points = 0;
          let possiblePoints: number[] = [];
          
          const rawOptions = q?.options_json || q?.options;
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
                       <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-50 shadow-sm text-left">
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

  const filteredResponses = responses.filter((r) => {
    const matchForm = !selectedFormId || r.form_id === selectedFormId;
    const matchCategory = selectedCategory === 'Todas' || r.form_category === selectedCategory;
    const pName = getPatientName(r.patient_id).toLowerCase();
    const rName = (r.respondent_name || '').toLowerCase();
    const fTitle = r.form_title.toLowerCase();
    const fCat = (r.form_category || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchSearch = pName.includes(search) || rName.includes(search) || fTitle.includes(search) || fCat.includes(search);
    return matchForm && matchCategory && matchSearch;
  });

  const staticCategories = ['TCC', 'Neuropsicologia', 'Psicopedagogia', 'Psicanálise', 'Anamnese', 'Eventos', 'Humanista'];
  const allAvailableCategories = Array.from(new Set([
    'Todas',
    ...staticCategories,
    ...userCategories.map(c => c.name),
    ...forms.map(f => f.category).filter(Boolean)
  ]));

  const getAreaIcon = (category?: string) => {
    const cat = category || '';
    switch (cat) {
      case 'TCC': return Target;
      case 'Neuropsicologia': return Brain;
      case 'Psicopedagogia': return ClipboardList;
      case 'Psicanálise': return Heart;
      case 'Anamnese': return FileText;
      case 'Eventos': return BarChart3;
      case 'Humanista': return Heart;
      default: return FileText;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 max-w-[1600px] mx-auto px-4 sm:px-8 text-left">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-8 justify-between pt-6 text-left">
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
            <h1 className="text-3xl font-black text-slate-800 tracking-tight text-left">Central de Resultados</h1>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1 text-left">
              Monitoramento Clínico · {responses.length} Respostas Registradas
            </p>
          </div>
        </div>
      </div>

      {/* Filter Line */}
      <FilterLine className="shadow-lg shadow-slate-200/40 p-5 rounded-[2rem] border-slate-100/50 bg-white/80 backdrop-blur-xl">
        <FilterLineSection grow>
          <FilterLineSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Pesquisar por paciente, título do formulário ou termo..."
            className="border-none bg-slate-50/50 focus-within:bg-white rounded-2xl py-6"
          />
        </FilterLineSection>

        <div className="h-8 w-px bg-slate-100 hidden xl:block mx-4" />

        <FilterLineSection>
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</span>
             <select
                value={selectedFormId}
                onChange={(e) => setSelectedFormId(e.target.value)}
                className="text-xs font-black text-slate-700 bg-transparent outline-none max-w-[180px] truncate uppercase tracking-tighter"
             >
                <option value="">TODOS</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
             </select>
           </div>
        </FilterLineSection>
      </FilterLine>

      {/* Category Horizontal Pills */}
      <div className="overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 text-left">
        <div className="flex gap-3 min-w-max pb-2 text-left">
          {allAvailableCategories.map(cat => {
            const isActive = selectedCategory === cat;
            const Icon = getAreaIcon(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all group shrink-0 ${
                  isActive 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-1' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'} />
                <span className="text-[11px] font-black uppercase tracking-widest">{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin shadow-inner" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse text-left">Consolidando dados clínicos...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-24 rounded-[3rem] border-4 border-dashed border-slate-100 text-center bg-white shadow-xl shadow-slate-200/20">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Nenhum registro</h3>
          <p className="text-sm text-slate-400 mt-2 max-w-xs mx-auto font-medium">
            Não encontramos respostas que coincidam com os filtros aplicados no momento.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 text-left">
          {filteredResponses.map((res) => {
            const patientName = getPatientName(res.patient_id);
            const inter = getInterpretation(res.form_id, res.score);
            const AreaIcon = getAreaIcon(res.form_category);
            
            return (
              <AppCard key={res.id} className="group overflow-visible bg-white border-slate-100 hover:border-indigo-500/10 shadow-lg hover:shadow-2xl transition-all duration-700 rounded-[2.5rem]">
                <div className="p-8 flex flex-col xl:flex-row gap-10 justify-between items-start text-left">
                  <div className="flex items-start gap-6 text-left">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl group-hover:rotate-12 ${
                       res.form_category === 'Neuropsicologia' ? 'bg-indigo-600 text-white shadow-indigo-100' :
                       res.form_category === 'TCC' ? 'bg-emerald-500 text-white shadow-emerald-100' :
                       'bg-slate-900 text-white shadow-slate-300'
                    }`}>
                      <AreaIcon size={30} />
                    </div>
                    <div className="text-left space-y-4">
                      <div className="text-left">
                        <div className="flex items-center gap-3 flex-wrap text-left">
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight text-left">{patientName || res.respondent_name || 'Usuário Externo'}</h3>
                          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border ${
                            patientName ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>
                            {patientName ? 'Paciente' : 'Link Público'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-2.5 font-bold text-slate-400 text-left">
                           <div className="flex items-center gap-1.5 text-indigo-600 text-xs font-black uppercase tracking-tighter text-left">
                              <FileText size={14} /> {res.form_title}
                           </div>
                           <div className="flex items-center gap-1.5 text-slate-400 text-xs text-left">
                              <Clock size={14} /> {formatDate(res.created_at)}
                           </div>
                        </div>
                      </div>

                      {(res.respondent_email || res.respondent_phone) && (
                        <div className="flex flex-wrap items-center gap-6 text-[11px] font-bold text-slate-500 text-left">
                          {res.respondent_phone && <span className="flex items-center gap-2"><Phone size={14} className="text-slate-400" /> {res.respondent_phone}</span>}
                          {res.respondent_email && <span className="flex items-center gap-2"><Mail size={14} className="text-slate-400" /> {res.respondent_email}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SCORE & INTERPRETATION BANNER */}
                  {res.score !== null && (
                    <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-8 min-w-full sm:min-w-[320px] xl:min-w-0 transition-all ${
                        inter?.color?.includes('emerald') ? 'bg-emerald-500 text-white border-emerald-400' :
                        inter?.color?.includes('indigo') || inter?.color?.includes('blue') ? 'bg-indigo-600 text-white border-indigo-500' :
                        inter?.color?.includes('red') ? 'bg-red-500 text-white border-red-400' :
                        inter?.color?.includes('amber') ? 'bg-amber-500 text-white border-amber-400' :
                        'bg-slate-900 text-white border-slate-800'
                    } shadow-xl shadow-slate-200/40 text-left`}>
                      <div className="text-center pr-8 border-r border-white/20 shrink-0 text-left">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-left">DESEMPENHO</p>
                        <p className="text-4xl font-black tracking-tighter text-left">{res.score}</p>
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mb-1 text-left">DIAGNÓSTICO / STATUS</p>
                        <p className="text-lg font-black leading-tight truncate uppercase tracking-tight text-left">{inter?.resultTitle || 'Avaliado'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                         <Sparkles size={20} className="text-white" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-8 pb-8 text-left">
                  <details className="group/details">
                    <summary className="list-none cursor-pointer flex items-center justify-between py-6 border-t border-slate-50 hover:bg-slate-50/50 rounded-2xl transition-all duration-300">
                      <div className="flex items-center gap-4 text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] group-hover:translate-x-2 transition-transform text-left">
                        <Info size={18} /> Rastreabilidade e Respostas Completas
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center transition-all group-hover:border-indigo-200 group-hover:shadow-md">
                        <ChevronRight size={22} className="text-slate-300 group-open/details:rotate-90 transition-transform" />
                      </div>
                    </summary>
                    <div className="animate-in fade-in slide-in-from-top-6 duration-700 pt-6 text-left">
                      {/* Formula & Method Section */}
                      <div className="mb-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col md:flex-row gap-8 text-left">
                         <div className="w-16 h-16 bg-white rounded-2.5xl flex items-center justify-center text-indigo-600 shadow-xl shadow-slate-200 border border-slate-50 shrink-0">
                            <Calculator size={30} />
                         </div>
                         <div className="text-left py-1">
                            <div className="flex items-center gap-2 mb-2 text-left">
                              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest text-left">Lógica de Processamento</span>
                              <div className="h-px bg-indigo-100 flex-1"></div>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 mb-2 text-left">Análise do Score de Saúde / Comportamento</h4>
                            <p className="text-sm font-medium text-slate-600 leading-relaxed text-left">
                              O valor final somado de <strong className="font-black text-indigo-700">{res.score} pontos</strong> foi calculado com base na ponderação de cada questão deste modelo. 
                              {inter ? (
                                <> A regra aplicada para esta faixa ({inter.minScore} a {inter.maxScore} pts) define o status como: <strong className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg">{inter.resultTitle}</strong>.</>
                              ) : 'Nenhuma regra de interpretação automatizada foi configurada para este resultado específico.'}
                            </p>
                            {inter?.description && (
                              <div className="mt-5 p-5 bg-white rounded-2xl border border-indigo-50 text-xs font-bold text-slate-500 leading-relaxed shadow-sm text-left italic">
                                "{inter.description}"
                              </div>
                            )}
                         </div>
                      </div>

                      <div className="flex items-center gap-3 mb-6 px-2 text-left">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Detalhamento das Questões</h5>
                        <div className="h-px bg-slate-100 flex-1"></div>
                      </div>
                      
                      {renderAnswers(res.form_id, res.answers_json)}
                    </div>
                  </details>
                </div>
              </AppCard>
            );
          })}
        </div>
      )}
    </div>
  );
};
