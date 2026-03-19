import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Patient, InterpretationRule } from '../types';
import { 
  ArrowLeft, FileText, Clock, User, Filter, 
  ChevronDown, Search, Calculator, CheckCircle2, 
  Phone, Mail, ChevronRight 
} from 'lucide-react';

type FormResponse = {
  id: string;
  form_id: string;
  form_title: string;
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
  const [forms, setForms] = useState<{ id: string; title: string, interpretations: InterpretationRule[] }[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, Record<string, string>>>({});
  const [selectedFormId, setSelectedFormId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [formsData, patientsData] = await Promise.all([
          api.get<any[]>('/forms'),
          api.get<Patient[]>('/patients')
        ]);
        
        // Load full form data for interpretations and questions
        const fullForms = await Promise.all(
          formsData.map(f => api.get<any>(`/forms/${f.id}`))
        );

        setForms(fullForms.map(f => ({ 
          id: String(f.id), 
          title: f.title, 
          interpretations: f.interpretations || [] 
        })));
        setPatients(patientsData || []);

        const responsesBuckets = await Promise.all(
          fullForms.map((form) =>
            api.get<any[]>(`/forms/${form.id}/responses`).then((rows) =>
              rows.map((r) => ({ ...r, form_title: form.title, form_id: form.id }))
            )
          )
        );
        
        const allResponses = responsesBuckets.flat();
        const mapped = allResponses
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((r) => ({
            form_id: String(r.form_id),
            form_title: r.form_title,
            form_category: fullForms.find(f => String(f.id) === String(r.form_id))?.category || '',
            patient_id: r.patient_id ? String(r.patient_id) : null,
            respondent_name: r.respondent_name ?? null,
            respondent_email: r.respondent_email ?? null,
            respondent_phone: r.respondent_phone ?? null,
            score: r.score ?? null,
            answers_json: typeof r.data === 'string' ? JSON.parse(r.data).answers : (r.data?.answers || r.answers_json || r.answers),
            created_at: r.created_at
          }));
        setResponses(mapped);

        const qMap: Record<string, Record<string, string>> = {};
        fullForms.forEach(f => {
          const inner: Record<string, string> = {};
          (f.questions || []).forEach((q: any) => {
            inner[String(q.id ?? q.question_id)] = q.question_text ?? q.text ?? '';
          });
          qMap[String(f.id)] = inner;
        });
        setQuestionsMap(qMap);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
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
    return form.interpretations.find(i => score >= i.minScore && score <= i.maxScore);
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderAnswers = (formId: string, answersJson: any) => {
    if (!answersJson) return <p className="text-xs text-slate-400 italic py-4">Nenhuma resposta detalhada encontrada.</p>;
    const map = questionsMap[formId] || {};
    const entries = Object.entries(answersJson);
    if (!entries.length) return <p className="text-xs text-slate-400 italic py-4">Nenhuma resposta detalhada encontrada.</p>;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
        {entries.map(([key, value]) => {
          const label = map[key] || `Pergunta ${key}`;
          const display = Array.isArray(value) ? value.join(', ') : String(value);
          return (
            <div key={key} className="p-3 rounded-xl bg-slate-50/50 border border-slate-100/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm text-slate-700 font-medium leading-relaxed">{display || '—'}</p>
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

  const categories = ['Todas', ...Array.from(new Set(forms.map(f => f.category).filter(Boolean)))];

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-10 max-w-6xl mx-auto px-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between bg-white/40 backdrop-blur-sm p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/20">
        <div className="flex items-center gap-5">
          <button
            onClick={() => navigate('/formularios/metricas')}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-100 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Histórico de Respostas</h1>
            <p className="text-sm text-slate-500 font-medium mt-0.5">{responses.length} respostas no total</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Paciente ou formulário..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-inner-sm text-sm outline-none focus:border-indigo-400 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shrink-0">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm font-bold text-slate-600 bg-transparent outline-none cursor-pointer pr-4"
            >
              <option value="Todas">Todas Categorias</option>
              {categories.filter(c => c !== 'Todas').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm shrink-0">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="text-sm font-bold text-slate-600 bg-transparent outline-none cursor-pointer pr-4"
            >
              <option value="">Todos os formulários</option>
              {forms.map((form) => (
                <option key={form.id} value={form.id}>{form.title}</option>
              ))}
            </select>
            <ChevronDown size={14} className="text-slate-400 -ml-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando histórico...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-20 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Filter size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Nenhum resultado</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            Ajuste seus filtros ou termos de busca para encontrar o que procura.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredResponses.map((res) => {
            const patientName = getPatientName(res.patient_id);
            const inter = getInterpretation(res.form_id, res.score);
            
            return (
              <div key={res.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all overflow-hidden">
                <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-colors">
                      <User size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-800 leading-tight">
                          {patientName || res.respondent_name || 'Visitante'}
                        </h3>
                        {patientName ? (
                          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">
                            <CheckCircle2 size={10} /> Vinculado
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">Externo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          <FileText size={10} /> {res.form_title}
                        </div>
                        {res.form_category && (
                           <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                             {res.form_category}
                           </div>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Clock size={12} /> {formatDate(res.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto">
                    {res.score !== null && (
                      <div className={`p-4 rounded-2xl border flex items-center gap-4 w-full md:min-w-[240px] ${inter?.color || 'bg-slate-50 border-slate-100'}`}>
                        <div className="text-center shrink-0 border-r border-black/5 pr-4">
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Pontos</p>
                          <p className="text-xl font-black">{res.score}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Resultado</p>
                          <p className="text-sm font-bold leading-tight">{inter?.resultTitle || 'Sem faixa'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6 border-t border-slate-50">
                  <details className="group/details mt-2">
                    <summary className="list-none cursor-pointer flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                        <Calculator size={14} /> Ver Detalhes das Respostas
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-open/details:rotate-90 transition-transform" />
                    </summary>
                    <div className="animate-slideDown">
                      {renderAnswers(res.form_id, res.answers_json)}
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
