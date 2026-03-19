import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { Patient, InterpretationRule } from '../types';
import { 
  ArrowLeft, FileText, Clock, User, Calculator, 
  ChevronRight, CheckCircle2, Phone, Mail, Filter, Search
} from 'lucide-react';

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
  const [formTitle, setFormTitle] = useState('Formulário');
  const [interpretations, setInterpretations] = useState<InterpretationRule[]>([]);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Record<string, string>>({});
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
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
        
        const map: Record<string, string> = {};
        (formData.questions || []).forEach((q: any) => {
          const key = String(q.id ?? q.question_id);
          map[key] = q.question_text ?? q.text ?? '';
        });
        setQuestionsMap(map);
        
        setResponses(
          (responsesData || []).map((r: any) => ({
            id: String(r.id),
            patient_id: r.patient_id ? String(r.patient_id) : null,
            respondent_name: r.respondent_name ?? null,
            respondent_email: r.respondent_email ?? null,
            respondent_phone: r.respondent_phone ?? null,
            score: r.score ?? null,
            answers_json: typeof r.data === 'string' ? JSON.parse(r.data).answers : (r.data?.answers || r.answers_json || r.answers),
            created_at: r.created_at
          }))
        );
        setPatients(patientsData || []);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  const getPatientName = (patientId?: string | null) => {
    if (!patientId) return '';
    return patients.find((p) => String(p.id) === String(patientId))?.full_name || '';
  };

  const getInterpretation = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    return interpretations.find(i => score >= i.minScore && score <= i.maxScore);
  };

  const formatDate = (value?: string) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderAnswers = (answersJson: any) => {
    if (!answersJson) return <p className="text-xs text-slate-400 italic py-4">Nenhuma resposta detalhada encontrada.</p>;
    const entries = Object.entries(answersJson);
    if (!entries.length) return <p className="text-xs text-slate-400 italic py-4">Nenhuma resposta detalhada encontrada.</p>;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
        {entries.map(([key, value]) => {
          const label = questionsMap[key] || `Pergunta ${key}`;
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

  const filteredResponses = responses.filter(r => {
    const pName = getPatientName(r.patient_id).toLowerCase();
    const rName = (r.respondent_name || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return pName.includes(search) || rName.includes(search);
  });

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
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{formTitle}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                {responses.length} Respostas
              </span>
              <span className="text-[10px] font-bold text-slate-400">·</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Resultados Automáticos</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por paciente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-inner-sm text-sm outline-none focus:border-indigo-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Rules Info */}
      {interpretations.length > 0 && (
        <div className="bg-indigo-600 text-white rounded-[1.5rem] p-5 shadow-lg shadow-indigo-200 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Calculator size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Cálculo de Resultado</p>
            <p className="text-sm font-medium leading-relaxed">
              O sistema calcula automaticamente a pontuação somando os valores atribuídos a cada resposta. 
              Abaixo você verá o título da interpretação baseado na faixa de pontuação configurada.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando...</p>
        </div>
      ) : filteredResponses.length === 0 ? (
        <div className="p-20 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <FileText size={28} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700">Nenhuma resposta encontrada</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-xs mx-auto">
            {searchTerm ? 'Tente buscar por outro nome de paciente.' : 'Aguarde até que os pacientes preencham o formulário.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredResponses.map((res) => {
            const patientName = getPatientName(res.patient_id);
            const inter = getInterpretation(res.score);
            
            return (
              <div key={res.id} className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all overflow-hidden">
                {/* Response Header */}
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
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                          <Clock size={12} /> {formatDate(res.created_at)}
                        </div>
                        {(res.respondent_email || res.respondent_phone) && (
                          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium border-l border-slate-100 pl-4">
                            {res.respondent_phone && <span className="flex items-center gap-1"><Phone size={11} /> {res.respondent_phone}</span>}
                            {res.respondent_email && <span className="flex items-center gap-1"><Mail size={11} /> {res.respondent_email}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Result Box */}
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

                {/* Details Section */}
                <div className="px-6 pb-6 border-t border-slate-50">
                  <details className="group/details mt-2">
                    <summary className="list-none cursor-pointer flex items-center justify-between py-3">
                      <div className="flex items-center gap-2 text-xs font-black text-indigo-500 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">
                        <FileText size={14} /> Ver Detalhes das Respostas
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-open/details:rotate-90 transition-transform" />
                    </summary>
                    <div className="animate-slideDown">
                      {renderAnswers(res.answers_json)}
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
