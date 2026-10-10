import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Patient, InterpretationRule, FormCategory } from '../types';
import {
  FileText, Clock, User, Calculator,
  Phone, Mail, ChevronRight, Target, Brain, Heart, ClipboardList, BarChart3, AlertCircle,
  X, FileSearch
} from 'lucide-react';
import {
  PageWrapper, SectionTitle, ContentCard, Button, Badge, EmptyState, Combobox,
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineSelect,
} from '../components/UI';
import { FormsTabs } from '../components/Forms/FormsTabs';
import { AnswerRow, ScoreBlock, computePoints } from '../components/Forms/ResponseParts';
import { useDateFormat } from '../contexts/UserPreferencesContext';

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
  const [selectedPatientId, setSelectedPatientId] = useState('');
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

  const { formatDate } = useDateFormat();


  const renderAnswers = (formId: string, answersJson: any) => {
    if (!answersJson) return <p className="text-xs text-slate-500 py-2">Respostas não disponíveis.</p>;
    const questions = questionsMap[formId] || [];
    const entries = Object.entries(answersJson);
    if (!entries.length) return <p className="text-xs text-slate-500 py-2">Respostas não detalhadas.</p>;

    return (
      <div className="flex flex-col gap-2 py-2">
        {entries.map(([key, value]) => {
          const q = questions.find(item => String(item.id) === key);
          const label = q?.question_text || q?.text || `Pergunta ${key}`;
          const display = Array.isArray(value) ? value.join(', ') : String(value);
          const { points, maxPossible } = computePoints(q?.options_json || q?.options, value);
          return <AnswerRow key={key} label={label} display={display} points={points} maxPossible={maxPossible} />;
        })}
      </div>
    );
  };

  const filteredResponses = responses.filter((r) => {
    const matchForm = !selectedFormId || r.form_id === selectedFormId;
    const matchPatient = !selectedPatientId || r.patient_id === selectedPatientId;
    const matchCategory = selectedCategory === 'Todas' || r.form_category === selectedCategory;
    const pName = getPatientName(r.patient_id).toLowerCase();
    const rName = (r.respondent_name || '').toLowerCase();
    const fTitle = r.form_title.toLowerCase();
    const fCat = (r.form_category || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    const matchSearch = pName.includes(search) || rName.includes(search) || fTitle.includes(search) || fCat.includes(search);
    return matchForm && matchPatient && matchCategory && matchSearch;
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

  const hasActiveFilters = Boolean(selectedFormId || selectedPatientId || searchTerm || selectedCategory !== 'Todas');

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={BarChart3}
          title="Central de Resultados"
          description={`Monitoramento clínico · ${responses.length} respostas registradas`}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/formularios/lista')}>Voltar</Button>
          }
        />

        <FormsTabs />

        <FilterLine>
          <FilterLineSection grow>
            <div className="w-full sm:max-w-[280px]">
              <FilterLineSearch
                aria-label="Pesquisar respostas"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar por paciente ou formulário..."
              />
            </div>
          </FilterLineSection>
          <FilterLineSection wrap>
            <div className="w-full sm:w-[220px]">
              <Combobox
                label="Paciente"
                options={[
                  { id: '', label: 'Todos os pacientes' },
                  ...patients.map(p => ({ id: String(p.id), label: p.full_name || p.name || 'Paciente sem nome' }))
                ]}
                value={selectedPatientId}
                onChange={(val) => setSelectedPatientId(String(val))}
                icon={<User size={14} />}
                placeholder="Selecionar paciente"
              />
            </div>
            <div className="w-full sm:w-[220px]">
              <Combobox
                label="Documento / teste"
                options={[
                  { id: '', label: 'Todos os formulários' },
                  ...forms.map(f => ({ id: f.id, label: f.title }))
                ]}
                value={selectedFormId}
                onChange={(val) => setSelectedFormId(String(val))}
                icon={<FileSearch size={14} />}
                placeholder="Selecionar formulário"
              />
            </div>
            <FilterLineSelect
              label="Especialidade"
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={allAvailableCategories.map(c => ({ value: c, label: c }))}
            />
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                iconLeft={<X size={14} />}
                onClick={() => {
                  setSelectedFormId('');
                  setSelectedPatientId('');
                  setSearchTerm('');
                  setSelectedCategory('Todas');
                }}
              >
                Limpar filtros
              </Button>
            )}
          </FilterLineSection>
        </FilterLine>

        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            Consolidando dados clínicos...
          </div>
        ) : filteredResponses.length === 0 ? (
          <ContentCard>
            <EmptyState
              icon={AlertCircle}
              title="Nenhum registro"
              description="Não encontramos respostas que coincidam com os filtros aplicados no momento."
            />
          </ContentCard>
        ) : (
          <div className="space-y-3">
            {filteredResponses.map((res) => {
              const patientName = getPatientName(res.patient_id);
              const inter = getInterpretation(res.form_id, res.score);
              const AreaIcon = getAreaIcon(res.form_category);

              return (
                <ContentCard key={res.id} padding="none" className="overflow-visible">
                  <div className="p-3 flex flex-col xl:flex-row gap-3 justify-between items-start">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                        <AreaIcon size={18} />
                      </div>
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-medium text-slate-900 break-words">{patientName || res.respondent_name || 'Usuário Externo'}</h3>
                          <Badge color={patientName ? 'success' : 'default'} size="sm">{patientName ? 'Paciente' : 'Link público'}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5 text-primary-700 font-medium"><FileText size={13} /> {res.form_title}</span>
                          <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" /> {formatDate(res.created_at)}</span>
                          {res.respondent_phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {res.respondent_phone}</span>}
                          {res.respondent_email && <span className="flex items-center gap-1.5 break-all"><Mail size={13} className="text-slate-400" /> {res.respondent_email}</span>}
                        </div>
                      </div>
                    </div>

                    {res.score !== null && res.score !== undefined && (
                      <ScoreBlock score={res.score} title={inter?.resultTitle || 'Avaliado'} scoreLabel="Desempenho" resultLabel="Diagnóstico / status" />
                    )}
                  </div>

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
                            <p className="text-[11px] font-medium text-primary-700">Lógica de processamento</p>
                            <h4 className="text-sm font-medium text-slate-900 mb-1">Análise do score de saúde / comportamento</h4>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              O valor final somado de <strong className="font-semibold text-primary-700">{res.score} pontos</strong> foi calculado com base na ponderação de cada questão deste modelo.
                              {inter ? (
                                <> A regra aplicada para esta faixa ({inter.minScore} a {inter.maxScore} pts) define o status como: <Badge color="primary" size="sm">{inter.resultTitle}</Badge>.</>
                              ) : ' Nenhuma regra de interpretação automatizada foi configurada para este resultado específico.'}
                            </p>
                            {inter?.description && (
                              <p className="mt-2 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-500 leading-relaxed italic">
                                "{inter.description}"
                              </p>
                            )}
                          </div>
                        </div>
                        <h5 className="text-xs font-medium text-slate-600">Detalhamento das questões</h5>
                        {renderAnswers(res.form_id, res.answers_json)}
                      </div>
                    </details>
                  </div>
                </ContentCard>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
};
