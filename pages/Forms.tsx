import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ClinicalForm, FormStats, Patient } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  FilePlus,
  Inbox,
  Wand2,
  PlusCircle,
  ListChecks,
  PieChart,
  Calendar,
  Bolt,
  Eye,
  Clock,
  CheckCircle,
  ChevronRight,
  FileText,
  Copy
} from 'lucide-react';

export const Forms: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<FormStats>({ totalForms: 0, totalResponses: 0, mostUsed: null });
  const [recentResponses, setRecentResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handleCopyPublicLink = (form: ClinicalForm) => {
    const link = `${window.location.origin}/f/${form.hash}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedFormId(form.id);
      setTimeout(() => setCopiedFormId(null), 2000);
    });
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [formsData, patientsData] = await Promise.all([
          api.get<any[]>('/forms'),
          api.get<Patient[]>('/patients')
        ]);
        const mappedForms = formsData.map((f) => ({
          id: String(f.id),
          title: f.title,
          hash: f.hash,
          description: f.description || '',
          questions: [],
          interpretations: [],
          responseCount: f.response_count ?? 0,
          isGlobal: Boolean(f.is_global)
        })) as ClinicalForm[];
        setForms(mappedForms);
        setPatients(patientsData);

        const totalResponses = mappedForms.reduce((acc, f) => acc + (f.responseCount || 0), 0);
        const mostUsed = mappedForms.sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0))[0]?.title || null;
        setStats({ totalForms: mappedForms.length, totalResponses, mostUsed });

        const responseBuckets = await Promise.all(
          mappedForms.slice(0, 5).map((form) =>
            api.get<any[]>(`/forms/${form.id}/responses`).then((rows) =>
              rows.map((r) => ({ ...r, formTitle: form.title, formId: form.id }))
            )
          )
        );
        const allResponses = responseBuckets.flat();
        const patientMap = patientsData.reduce((acc, p) => {
          acc[String(p.id)] = p.full_name;
          return acc;
        }, {} as Record<string, string>);

        const now = Date.now();
        const mappedResponses = allResponses
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 4)
          .map((r) => {
            const createdAt = new Date(r.created_at);
            const diff = now - createdAt.getTime();
            const status = diff < 24 * 60 * 60 * 1000 ? 'Novo' : 'Lido';
            return {
              id: r.id,
              patient: patientMap[String(r.patient_id)] || r.respondent_name || 'Visitante',
              form: r.formTitle,
              formId: r.formId,
              date: createdAt.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
              status
            };
          });
        setRecentResponses(mappedResponses);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-10">
      <div className="relative overflow-hidden rounded-[28px] p-6 md:p-10 bg-slate-950 border border-slate-700/40 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.7)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.25),transparent_55%)]"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950"></div>
        <div className="absolute -top-[80px] -right-[60px] w-[320px] h-[320px] bg-indigo-500/10 rounded-full blur-3xl opacity-70 pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-white/5 border border-white/10 text-indigo-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
              <HeartPulse size={12} className="text-sky-400" />
              <span>Central de formularios</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-50 mb-3 leading-tight">
              Formularios <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-200 to-indigo-200">clinicos</span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed max-w-2xl mb-6">
              Controle criacao, compartilhamento e respostas em um fluxo simples. Tudo pronto para sua rotina clinica.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/formularios/novo')}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 flex items-center gap-2"
              >
                <PlusCircle size={18} /> Criar formulario
              </button>
              <button
                onClick={() => navigate('/formularios/lista')}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 flex items-center gap-2"
              >
                <ListChecks size={18} /> Ver lista completa
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Formularios</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <FilePlus size={20} className="text-sky-400" /> {stats.totalForms}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Respostas</div>
              <div className="text-2xl font-bold text-white flex items-center gap-2">
                <Inbox size={20} className="text-emerald-400" /> {stats.totalResponses}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-1 font-bold">Mais usado</div>
              <div className="text-sm font-semibold text-slate-100 line-clamp-2">
                {stats.mostUsed || 'Sem dados'}
              </div>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-600/50 backdrop-blur-md text-slate-200 text-xs font-semibold shadow-lg w-fit">
              <Calendar size={14} className="text-yellow-400" />
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Bolt size={20} className="text-indigo-600" /> Acesso Rapido</h2>
            <div className="grid grid-cols-1 gap-4">
              <Link to="/formularios/novo" className="flex items-center p-4 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mr-4 group-hover:bg-white/30 transition-colors">
                  <PlusCircle size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-lg">Criar Novo</h4>
                  <p className="text-indigo-100 text-xs">Do zero ou a partir de um modelo</p>
                </div>
                <ChevronRight className="ml-auto opacity-50 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="grid grid-cols-2 gap-4">
                <Link to="/formularios/lista" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                  <ListChecks size={24} className="text-indigo-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-slate-800">Lista Completa</h4>
                  <p className="text-xs text-slate-500">Gerenciar formularios</p>
                </Link>
                <Link to="/formularios/metricas" className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all group">
                  <PieChart size={24} className="text-purple-500 mb-3 group-hover:scale-110 transition-transform" />
                  <h4 className="font-bold text-slate-800">Resultados</h4>
                  <p className="text-xs text-slate-500">Metricas e respostas</p>
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={20} className="text-slate-700" /> Formularios Recentes</h2>
            <div className="space-y-3">
              {forms.slice(0, 4).map((form) => (
                <div key={form.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    {form.title.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-slate-700">{form.title}</h4>
                    <p className="text-xs text-slate-500">{form.responseCount || 0} respostas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/formularios/${form.id}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                    >
                      Abrir
                    </button>
                    <button
                      onClick={() => handleCopyPublicLink(form)}
                      className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                      title="Copiar link publico"
                    >
                      {copiedFormId === form.id ? <CheckCircle size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              ))}
              {forms.length === 0 && (
                <div className="text-sm text-slate-400">Nenhum formulario criado ainda.</div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Inbox size={20} className="text-emerald-600" /> Respostas Recentes</h2>
            <button
              className="text-xs font-bold text-indigo-600 hover:underline"
              onClick={() => navigate('/formularios/respostas')}
            >
              Ver todas
            </button>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 space-y-3 md:hidden">
              {isLoading ? (
                <div className="text-center text-sm text-slate-400">Carregando respostas...</div>
              ) : recentResponses.length === 0 ? (
                <div className="text-center text-sm text-slate-400">Sem respostas recentes.</div>
              ) : (
                recentResponses.map((res) => (
                  <div key={res.id} className="border border-slate-100 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-700">{res.patient}</div>
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                        res.status === 'Novo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                      }`}>{res.status}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-2"><FileText size={12} /> {res.form}</div>
                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-2"><Clock size={12} /> {res.date}</div>
                    <button
                      className="mt-3 w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                      onClick={() => navigate(`/formularios/${res.formId}/respostas`)}
                    >
                      Ver resposta
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="overflow-x-auto hidden md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase text-slate-400 font-bold tracking-wider">
                    <th className="px-6 py-4">Paciente</th>
                    <th className="px-6 py-4">Formulario</th>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentResponses.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                            {res.patient.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{res.patient}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <FileText size={14} className="text-slate-400" />
                          {res.form}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Clock size={12} /> {res.date}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                          res.status === 'Novo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {res.status === 'Novo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                          {res.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Ver Resposta"
                          onClick={() => navigate(`/formularios/${res.formId}/respostas`)}
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50/30 text-center">
              <p className="text-xs text-slate-400">Mostrando as ultimas 4 respostas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
