import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getStaticUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Patient, InterpretationRule } from '../types';
import {
  FileText, Clock, User, Calculator,
  ChevronRight, CheckCircle2, Phone, Mail, Info, Sparkles, X, Bot,
  ClipboardList
} from 'lucide-react';
import { useDateFormat } from '../contexts/UserPreferencesContext';
import {
  PageWrapper, SectionTitle, ContentCard, PanelCard, Button, IconButton, Badge, Alert, EmptyState,
  FilterLine, FilterLineSection, FilterLineDateRange, Combobox,
} from '../components/UI';
import { FormsTabs } from '../components/Forms/FormsTabs';
import { AnswerRow, ScoreBlock, computePoints } from '../components/Forms/ResponseParts';
import { FormsResponsesAll } from './FormsResponsesAll';

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

const FormResponsesDetail: React.FC = () => {
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
  const [autoOpenId, setAutoOpenId] = useState<string | null>(null);

  const { user } = useAuth();

  // Pré-filtros vindos da URL (ex: clique no histórico do paciente)
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) setFilterPatientId(pid);

    const rid = searchParams.get('responseId');
    if (rid) setAutoOpenId(rid);

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

      pdf.save(`Relatorio_Bia_${respondentName.replace(/\s+/g, '_')}.pdf`);
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

  // Auto-scroll e destaque para a resposta específica vinda da URL
  useEffect(() => {
    if (!autoOpenId || isLoading) return;
    const el = document.getElementById(`response-card-${autoOpenId}`);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary-400', 'ring-offset-2');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary-400', 'ring-offset-2'), 3000);
      // Abrir o accordion de detalhes
      const details = el.querySelector('details');
      if (details) details.open = true;
    }, 300);
  }, [autoOpenId, isLoading]);

  const getInterpretation = (score: number | null | undefined) => {
    if (score === null || score === undefined) return null;
    return interpretations.find(i => score >= (i.minScore ?? 0) && score <= (i.maxScore ?? 999));
  };

  const { formatDate } = useDateFormat();

  const renderAnswers = (answersJson: any) => {
    if (!answersJson) return <p className="text-xs text-slate-500 py-2">Respostas não detalhadas.</p>;
    const entries = Object.entries(answersJson);
    if (!entries.length) return <p className="text-xs text-slate-500 py-2">Respostas não detalhadas.</p>;

    return (
      <div className="flex flex-col gap-2 py-2">
        {entries.map(([key, value]) => {
          const qMeta = questionsMetadata.find(q => String(q.id) === key);
          const label = qMeta?.question_text || qMeta?.text || questionsMap[key] || `Pergunta ${key}`;
          const display = Array.isArray(value) ? value.join(', ') : String(value);
          const { points, maxPossible } = computePoints(qMeta?.options_json || qMeta?.options, value);
          return <AnswerRow key={key} label={label} display={display} points={points} maxPossible={maxPossible} />;
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

  const maxPoints = questionsMetadata.reduce((sum, q) => {
    const opts = typeof q.options === 'string' ? JSON.parse(q.options) : (q.options || []);
    const max = Array.isArray(opts) && opts.length > 0 ? Math.max(...opts.map((o: any) => o.value || 0)) : 0;
    return sum + max;
  }, 0);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={ClipboardList}
          title={formTitle}
          description={`Relatório clínico · ${responses.length} respostas · máximo de ${maxPoints} pts possíveis`}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/formularios/lista')}>Voltar</Button>
          }
        />

        <FormsTabs />

        <FilterLine>
          <FilterLineSection grow>
            <div className="w-full sm:max-w-[280px]">
              <Combobox
                label="Paciente"
                options={patientOptions}
                value={filterPatientId}
                onChange={(val) => setFilterPatientId(String(val))}
                icon={<User size={14} />}
                placeholder="Selecionar paciente"
              />
            </div>
          </FilterLineSection>
          <FilterLineSection>
            <FilterLineDateRange
              from={filterDateFrom || null}
              to={filterDateTo || null}
              onFromChange={(v) => setFilterDateFrom(v || '')}
              onToChange={(v) => setFilterDateTo(v || '')}
            />
            {(filterPatientId !== 'all' || filterDateFrom !== defaultFrom || filterDateTo !== defaultTo) && (
              <Button
                variant="outline"
                size="sm"
                iconLeft={<X size={14} />}
                onClick={() => {
                  setFilterPatientId('all');
                  setFilterDateFrom(defaultFrom);
                  setFilterDateTo(defaultTo);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </FilterLineSection>
        </FilterLine>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {/* Metodologia */}
          <div className="lg:col-span-1">
            <PanelCard title="Metodologia" icon={Calculator} className="lg:sticky lg:top-4">
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-600 mb-1">Processamento</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Este modelo utiliza somatório linear ponderado para cada opção de resposta selecionada, agrupados por escala de interpretação.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-600">Legenda de faixas</p>
                  {interpretations.map((i, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-slate-200">
                      <div className="w-3 h-3 rounded-full shrink-0 bg-primary-500" style={i.color && !i.color.startsWith('bg-') ? { backgroundColor: i.color } : undefined} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{i.resultTitle}</p>
                        <p className="text-[11px] text-slate-500">{i.minScore} — {i.maxScore} pts</p>
                      </div>
                    </div>
                  ))}
                  {interpretations.length === 0 && (
                    <EmptyState title="Sem faixas definidas" />
                  )}
                </div>

                <Alert variant="info">
                  <span className="text-[11px]">Bia AI está ativada. Você pode gerar análises automáticas para cada resposta.</span>
                </Alert>
              </div>
            </PanelCard>
          </div>

          {/* Lista de respostas */}
          <div className="lg:col-span-3 min-w-0">
            {isLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                Cruzando dados...
              </div>
            ) : filteredResponses.length === 0 ? (
              <ContentCard>
                <EmptyState
                  icon={FileText}
                  title="Nenhuma resposta"
                  description="Nenhuma resposta encontrada para os filtros selecionados."
                />
              </ContentCard>
            ) : (
              <div className="space-y-3">
                {filteredResponses.map((res) => {
                  const patientName = getPatientName(res.patient_id);
                  const inter = getInterpretation(res.score);
                  const isAnalyzing = analyzingId === res.id;
                  const analysis = aiAnalysisMap[res.id];
                  const respondentDisplay = patientName || res.respondent_name || 'Usuário Externo';

                  return (
                    <ContentCard key={res.id} id={`response-card-${res.id}`} padding="none" className="overflow-visible">
                      {/* Cabeçalho do item */}
                      <div className="p-3 flex flex-col md:flex-row gap-3 justify-between items-start">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                            <User size={18} />
                          </div>
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-medium text-slate-900 break-words">{respondentDisplay}</h3>
                              {patientName ? (
                                <Badge color="success" size="sm" icon={<CheckCircle2 size={11} />}>Paciente ativo</Badge>
                              ) : (
                                <Badge color="default" size="sm" icon={<Info size={11} />}>Respondente externo</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-slate-500">
                              <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" />{formatDate(res.created_at)}</span>
                              {res.respondent_phone && (
                                <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" />{res.respondent_phone}</span>
                              )}
                              {res.respondent_email && (
                                <span className="flex items-center gap-1.5 break-all"><Mail size={13} className="text-slate-400" />{res.respondent_email}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap">
                          {res.score !== null && res.score !== undefined && (
                            <ScoreBlock score={res.score} title={inter?.resultTitle || 'Avaliado'} scoreLabel="Score" resultLabel="Resultado" />
                          )}
                          <Badge color="success" size="sm" dot>Completo</Badge>
                        </div>
                      </div>

                      {/* Análise de IA */}
                      <div className="px-3 pb-3">
                        {analysis ? (
                          <div id={`analysis-card-${res.id}`} className="rounded-lg border border-primary-100 bg-primary-50/40 overflow-hidden">
                            <div className="p-3 border-b border-primary-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white">
                                  <Sparkles size={15} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-medium text-slate-900">Análise da Bia AI</h4>
                                  <p className="text-[11px] text-slate-500">Insights clínicos e sugestões</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  iconLeft={<FileText size={14} />}
                                  onClick={() => handleExportPDF(res.id, respondentDisplay)}
                                >
                                  Baixar relatório PDF
                                </Button>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Fechar análise"
                                  title="Fechar análise"
                                  onClick={() => setAiAnalysisMap(p => { const next = {...p}; delete next[res.id]; return next; })}
                                >
                                  <X size={14} />
                                </IconButton>
                              </div>
                            </div>

                            <div className="p-3 bg-white">
                              <div
                                className="text-[13px] text-slate-700 leading-relaxed markdown-content"
                                dangerouslySetInnerHTML={{
                                  __html: analysis
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 block mt-4 mb-1">$1</strong>')
                                    .replace(/\n/g, '<br/>')
                                }}
                              />

                              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] text-slate-400">Plaelo Intelligence · Relatório gerado em {new Date().toLocaleDateString()}</p>
                                <p className="text-[11px] text-slate-400">Análise automática orientada por IA</p>
                              </div>
                            </div>

                             {/* TEMPLATE PARA O PDF (Invisível na UI mas capturado pelo html2canvas) */}
                             <div
                                id={`pdf-report-content-${res.id}`}
                                className="bg-white w-[210mm] text-slate-800"
                                style={{ display: 'none', position: 'absolute', left: '-10000px', top: '0', padding: '28mm 30mm 32mm 30mm' }}
                             >
                                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-14">
                                   <div>
                                      {user?.clinicLogoUrl ? (
                                         <img src={getStaticUrl(user.clinicLogoUrl)} alt="Logo" className="h-20 mb-3 object-contain" />
                                      ) : (
                                         <div className="h-16 w-16 bg-slate-900 text-white flex items-center justify-center rounded-lg font-semibold text-2xl">P</div>
                                      )}
                                      <p className="text-[12px] font-semibold text-slate-400 mt-2">{user?.companyName || 'Clínica de Psicologia'}</p>
                                   </div>
                                   <div className="text-right">
                                      <h2 className="text-xl font-semibold text-slate-900 leading-none mb-1">{user?.name || 'Profissional'}</h2>
                                      <p className="text-sm font-semibold text-slate-500">CRP: {user?.crp || 'Não informado'}</p>
                                      {user?.email && <p className="text-xs text-slate-400 mt-1">{user.email}</p>}
                                   </div>
                                </div>

                                <div className="text-center mb-16 px-10">
                                   <h1 className="text-3xl font-semibold text-slate-900 leading-tight border-y border-slate-100 py-6">Relatório de Análise Clínica</h1>
                                   <div className="flex justify-center gap-6 mt-6">
                                      <p className="text-xs font-semibold text-slate-400">Formulário: <span className="text-slate-900">{formTitle}</span></p>
                                      <p className="text-xs font-semibold text-slate-400">Respondente: <span className="text-slate-900">{respondentDisplay}</span></p>
                                      <p className="text-xs font-semibold text-slate-400">Data: <span className="text-slate-900">{new Date().toLocaleDateString('pt-BR')}</span></p>
                                   </div>
                                </div>

                                <div
                                   className="text-[12pt] leading-relaxed text-slate-800 text-justify"
                                   dangerouslySetInnerHTML={{
                                      __html: (() => {
                                         return analysis
                                           // Parágrafos duplos → separação real
                                           .replace(/\n{2,}/g, '\n\n')
                                           // Remove ":" no início de linhas de conteúdo
                                           .replace(/^:\s+/gm, '')
                                           // Números de lista soltos (ex: "2.") → elemento com espaço topo
                                           .replace(/^(\d+\.)$/gm, '<span style="display:block;margin-top:28px;font-size:11pt;font-weight:700;color:#94a3b8;">$1</span>')
                                           // Headings **TEXTO** → bloco com barra lateral
                                           .replace(/\*\*(.*?)\*\*/g, '<strong style="display:block;margin-top:32px;margin-bottom:12px;color:#0f172a;font-size:13pt;font-weight:900;border-left:5px solid #4f46e5;padding-left:14px;;letter-spacing:0.8px;line-height:1.3;">$1</strong>')
                                           // Duplo \n → parágrafo com espaço
                                           .replace(/\n\n/g, '<br/><br/>')
                                           // Simples \n → quebra com respiração
                                           .replace(/\n/g, '<br style="margin-bottom:6px;"/>');
                                      })()
                                   }}
                                />

                                <div className="mt-32 pt-10 border-t-2 border-slate-100 flex justify-between items-end">
                                   <div className="max-w-[300px]">
                                      <p className="text-[11px] font-semibold text-slate-300 mb-1">Tecnologia Plaelo</p>
                                      <p className="text-[11px] leading-relaxed text-slate-400 italic">Este documento foi gerado pela inteligência artificial Bia e deve ser validado pelo profissional responsável para fins legais e clínicos.</p>
                                   </div>
                                   <div className="text-right flex flex-col items-center">
                                      <div className="w-64 h-px bg-slate-300 mb-4"></div>
                                      <p className="text-[11pt] font-semibold text-slate-900 mb-0.5">{user?.name}</p>
                                      <p className="text-[10pt] font-semibold text-slate-400 leading-none">CRP: {user?.crp}</p>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-primary-500 border border-slate-200">
                                <Bot size={16} className={isAnalyzing ? 'animate-spin' : ''} />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-800">Deseja uma análise da Bia?</p>
                                <p className="text-[11px] text-slate-500">Gere um insight clínico automático baseado nestas respostas.</p>
                              </div>
                            </div>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => generateAiAnalysis(res)}
                              loading={isAnalyzing}
                              disabled={isAnalyzing}
                              iconLeft={<Sparkles size={14} />}
                            >
                              {isAnalyzing ? 'Analisando...' : 'Gerar análise clínica'}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Detalhes */}
                      <div className="px-3 pb-3">
                        <details className="group/details">
                          <summary className="list-none flex items-center justify-between gap-2 py-2.5 border-t border-slate-100 text-xs font-medium text-primary-700">
                            <span className="flex items-center gap-2"><ClipboardList size={14} /> Ver detalhes das respostas</span>
                            <ChevronRight size={14} className="text-slate-400 group-open/details:rotate-90 transition-transform" />
                          </summary>
                          <div className="pt-2 space-y-3">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary-600 border border-slate-200 shrink-0">
                                <Calculator size={15} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-primary-700">Metodologia ponderada</p>
                                <h4 className="text-sm font-medium text-slate-900 mb-1">Análise técnica do resultado</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  Score final: <strong className="font-semibold text-primary-700">{res.score}</strong>. Este valor é o resultado da soma de cada opção parametrizada no formulário.
                                  A interpretação <strong className="font-semibold text-primary-700">{inter ? inter.resultTitle : '—'}</strong> é aplicada automaticamente para faixas entre {inter?.minScore || 0} e {inter?.maxScore || 'máximo'}.
                                </p>
                              </div>
                            </div>
                            {renderAnswers(res.answers_json)}
                          </div>
                        </details>
                      </div>
                    </ContentCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export const FormResponses: React.FC = () => {
  const { id } = useParams();
  return id ? <FormResponsesDetail /> : <FormsResponsesAll />;
};
