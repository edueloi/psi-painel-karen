import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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
  ExternalLink,
} from 'lucide-react';
import { PageWrapper, SectionTitle, StatGrid, StatCard, ContentCard, PanelCard, Button, IconButton, Badge, EmptyState } from '../components/UI';
import { FormsTabs } from '../components/Forms/FormsTabs';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';

export const Forms: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [stats, setStats] = useState<FormStats>({ totalForms: 0, totalResponses: 0, mostUsed: null });
  const [recentResponses, setRecentResponses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedFormId, setCopiedFormId] = useState<string | null>(null);

  const handleCopyPublicLink = (form: ClinicalForm) => {
    const params = new URLSearchParams();
    if (user?.shareToken) params.set('u', user.shareToken);
    const qs = params.toString();
    const link = `${getPublicBaseUrl()}/f/${form.hash}${qs ? `?${qs}` : ''}`;
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
            // Se a data vier do banco como '2026-03-20 19:24:00' sem o T e sem o Z,
            // o JS interpreta como local. Forçamos UTC se o formato for esse.
            let dateStr = r.created_at;
            if (dateStr && dateStr.includes(' ') && !dateStr.includes('T') && !dateStr.includes('Z')) {
              dateStr = dateStr.replace(' ', 'T') + 'Z';
            } else if (dateStr && !dateStr.includes('Z') && !dateStr.includes('+') && dateStr.includes('T')) {
              dateStr = dateStr + 'Z';
            }

            const createdAt = new Date(dateStr);
            const diff = now - createdAt.getTime();
            const isNew = diff < 24 * 60 * 60 * 1000;
            return {
              id: r.id,
              patient: patientMap[String(r.patient_id)] || r.respondent_name || 'Visitante',
              form: r.form_title,
              formId: r.form_id,
              date: createdAt.toLocaleString('pt-BR', { 
                day: '2-digit', 
                month: 'short', 
                hour: '2-digit', 
                minute: '2-digit',
                timeZone: 'America/Sao_Paulo'
              }),
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
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={FilePlus2}
          title="Formulários Clínicos"
          description="Central de formulários e questionários"
          action={
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/caixa-ferramentas')}>Voltar</Button>
              <Button variant="primary" size="sm" iconLeft={<PlusCircle size={14} />} onClick={() => navigate('/formularios/novo')}>
                Criar formulário
              </Button>
            </>
          }
        />

        <StatGrid cols={4}>
          <StatCard title="Formulários" value={stats.totalForms} icon={FilePlus2} />
          <StatCard title="Respostas totais" value={stats.totalResponses} icon={Inbox} color="success" />
          <StatCard title="Pacientes alcançados" value={recentResponses.length} icon={Users} color="info" />
          <StatCard title="Formulários ativos" value={forms.length} icon={TrendingUp} color="warning" />
        </StatGrid>

        <FormsTabs />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-3">
          {/* Respostas recentes */}
          <ContentCard padding="none" className="overflow-hidden">
            <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Inbox size={14} className="text-slate-500 shrink-0" />
                <h2 className="text-sm font-medium text-slate-900">Respostas recentes</h2>
              </div>
              <Button variant="ghost" size="xs" iconRight={<ArrowRight size={12} />} onClick={() => navigate('/formularios/respostas')}>
                Ver todas
              </Button>
            </div>

            {isLoading ? (
              <div role="status" className="p-8 text-center text-xs text-slate-500">Carregando...</div>
            ) : recentResponses.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  icon={Inbox}
                  title="Nenhuma resposta ainda"
                  description="Compartilhe um formulário com seus pacientes para começar."
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentResponses.map((res) => (
                  <button
                    type="button"
                    key={res.id}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => navigate(`/formularios/${res.formId}/respostas?responseId=${res.id}`)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center font-medium text-xs shrink-0">
                      {(res.patient || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-800 truncate">{res.patient}</p>
                      <p className="text-[11px] text-slate-500 truncate flex items-center gap-1"><FileText size={11} /> {res.form}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5">
                      {res.isNew && <Badge color="success" size="sm" dot>Novo</Badge>}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 whitespace-nowrap"><Clock size={11} /> {res.date}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ContentCard>

          {/* Formulários */}
          <PanelCard
            title="Formulários"
            action={
              <Button variant="ghost" size="xs" iconRight={<ArrowRight size={12} />} onClick={() => navigate('/formularios/lista')}>
                Ver todos
              </Button>
            }
          >
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div role="status" className="py-4 text-center text-xs text-slate-500">Carregando...</div>
              ) : forms.length === 0 ? (
                <EmptyState icon={FileText} title="Nenhum formulário criado ainda." />
              ) : (
                forms.slice(0, 5).map((form) => (
                  <div key={form.id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 text-primary-700 flex items-center justify-center font-medium text-xs shrink-0">
                      {form.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-800 truncate">{form.title}</p>
                      <p className="text-[11px] text-slate-500">{form.responseCount || 0} respostas</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton variant="ghost" size="sm" aria-label="Editar" title="Editar" onClick={() => navigate(`/formularios/${form.id}`)}>
                        <ExternalLink size={14} />
                      </IconButton>
                      <IconButton variant="ghost" size="sm" aria-label="Copiar link público" title="Copiar link público" onClick={() => handleCopyPublicLink(form)}>
                        {copiedFormId === form.id ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </IconButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PanelCard>
        </div>
      </div>
    </PageWrapper>
  );
};
