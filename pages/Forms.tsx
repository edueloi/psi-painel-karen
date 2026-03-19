import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ClinicalForm, FormStats, Patient } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  FilePlus2,
  Inbox,
  PlusCircle,
  ListChecks,
  BarChart3,
  Clock,
  CheckCircle,
  FileText,
  Copy,
  ArrowRight,
  TrendingUp,
  Users,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export const Forms: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [stats, setStats] = useState<FormStats>({ totalForms: 0, totalResponses: 0, mostUsed: null });
  const [recentResponses, setRecentResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

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

        const totalResponses = mappedForms.reduce((acc, f) => acc + (f.responseCount || 0), 0);
        const sorted = [...mappedForms].sort((a, b) => (b.responseCount || 0) - (a.responseCount || 0));
        const mostUsed = sorted[0]?.title || null;
        setStats({ totalForms: mappedForms.length, totalResponses, mostUsed });

        const [recentResponsesData] = await Promise.all([
          api.get<any[]>('/forms/responses/recent?limit=5')
        ]);

        const patientMap = (patientsData || []).reduce((acc: Record<string, string>, p: Patient) => {
          acc[String(p.id)] = (p as any).name || p.full_name || '';
          return acc;
        }, {});
 
        const now = Date.now();
        const mappedResponses = (recentResponsesData || []).map((r) => {
            const createdAt = new Date(r.created_at);
            const diff = now - createdAt.getTime();
            const isNew = diff < 24 * 60 * 60 * 1000;
            return {
              id: r.id,
              patient: patientMap[String(r.patient_id)] || r.respondent_name || 'Visitante',
              form: r.form_title,
              formId: r.form_id,
              date: createdAt.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
              isNew,
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
    <div className="space-y-6 pb-10">
      {/* Header compacto */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <FilePlus2 size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Formulários Clínicos</h1>
            <p className="text-xs text-slate-400">Central de formulários e questionários</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/formularios/lista')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <ListChecks size={14} /> Ver lista
          </button>
          <button
            onClick={() => navigate('/formularios/metricas')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            <BarChart3 size={14} /> Métricas
          </button>
          <button
            onClick={() => navigate('/formularios/novo')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <PlusCircle size={14} /> Criar formulário
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Formulários', value: stats.totalForms,
            icon: <FilePlus2 size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-50',
          },
          {
            label: 'Respostas totais', value: stats.totalResponses,
            icon: <Inbox size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50',
          },
          {
            label: 'Pacientes alcançados', value: recentResponses.length,
            icon: <Users size={18} />, color: 'text-blue-600', bg: 'bg-blue-50',
          },
          {
            label: 'Formulários ativos', value: forms.length,
            icon: <TrendingUp size={18} />, color: 'text-amber-600', bg: 'bg-amber-50',
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className={`w-8 h-8 rounded-lg ${s.bg} ${s.color} flex items-center justify-center mb-2`}>
              {s.icon}
            </div>
            <div className="text-2xl font-extrabold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        {/* Respostas recentes */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox size={16} className="text-emerald-600" />
              <h2 className="font-bold text-slate-800">Respostas Recentes</h2>
            </div>
            <button
              onClick={() => navigate('/formularios/respostas')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-400">Carregando...</div>
          ) : recentResponses.length === 0 ? (
            <div className="p-10 flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Inbox size={22} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Nenhuma resposta ainda</p>
              <p className="text-xs text-slate-400">Compartilhe um formulário com seus pacientes para começar.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentResponses.map((res) => (
                <div
                  key={res.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/formularios/${res.formId}/respostas`)}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                    {(res.patient || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate">{res.patient}</p>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1"><FileText size={10} /> {res.form}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1.5">
                      {res.isNew && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Novo
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock size={11} /> {res.date}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulários recentes + ações rápidas */}
        <div className="space-y-4">
          {/* Ações rápidas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles size={15} className="text-indigo-500" /> Ações rápidas</h2>
            </div>
            <div className="p-3 space-y-2">
              <Link
                to="/formularios/novo"
                className="flex items-center gap-3 p-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                  <PlusCircle size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Criar novo formulário</p>
                  <p className="text-[11px] text-indigo-200">Do zero ou a partir de modelo</p>
                </div>
                <ArrowRight size={14} className="opacity-60 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/formularios/lista"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <ListChecks size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Gerenciar formulários</p>
                  <p className="text-[11px] text-slate-400">Editar, arquivar e compartilhar</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/formularios/metricas"
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-purple-600 flex items-center justify-center shrink-0">
                  <BarChart3 size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">Métricas e resultados</p>
                  <p className="text-[11px] text-slate-400">Análise de respostas</p>
                </div>
                <ArrowRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Formulários recentes */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={15} className="text-slate-500" /> Formulários
              </h2>
              <Link to="/formularios/lista" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                Ver todos <ArrowRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">Carregando...</div>
              ) : forms.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Nenhum formulário criado ainda.</div>
              ) : (
                forms.slice(0, 5).map((form) => (
                  <div key={form.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {form.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{form.title}</p>
                      <p className="text-[10px] text-slate-400">{form.responseCount || 0} respostas</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => navigate(`/formularios/${form.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Editar"
                      >
                        <ExternalLink size={13} />
                      </button>
                      <button
                        onClick={() => handleCopyPublicLink(form)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Copiar link público"
                      >
                        {copiedFormId === form.id ? <CheckCircle size={13} className="text-emerald-500" /> : <Copy size={13} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
