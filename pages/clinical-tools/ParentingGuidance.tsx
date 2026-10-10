import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  UserCheck, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Settings,
  ClipboardList,
  Save,
  Trash2,
  Calendar,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layout,
  BookOpen,
  Plus,
  Users
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageWrapper, SectionTitle, ContentCard } from '../../components/UI/PageWrapper';
import { PanelCard } from '../../components/UI/PanelCard';
import { Tabs } from '../../components/UI/Tabs';
import { Button, IconButton } from '../../components/UI/Button';
import { Input, Textarea } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { Alert } from '../../components/UI/Alert';
import { EmptyState } from '../../components/UI/EmptyState';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Patient } from '../../types';
import { api } from '../../services/api';

interface RoutineItem {
  id: string | number;
  time: string;
  activity: string;
  status: 'pending' | 'success' | 'need_improvement';
}

interface ContingencyPlan {
  behavior: string;
  consequence: string;
  type: 'positive' | 'negative' | 'natural';
}

interface ParentingData {
  routine: RoutineItem[];
  contingencies: ContingencyPlan[];
  goals: string[];
  updated_at: string;
}

type ParentingTab = 'routine' | 'plan';

const parentingTabs = [
  { id: 'routine', label: 'Rotina', icon: Calendar },
  { id: 'plan', label: 'Plano de Manejo', icon: Layout },
] as const;

export const ParentingGuidancePage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const [data, setData] = useState<ParentingData>({
    routine: [],
    contingencies: [],
    goals: [],
    updated_at: new Date().toISOString()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeSub, setActiveSub] = useState<ParentingTab>('routine');
  const [newRoutine, setNewRoutine] = useState<Partial<RoutineItem>>({ time: '', activity: '', status: 'pending' });

  // Carregar lista de pacientes
  useEffect(() => {
    const fetchPatients = async () => {
      setIsLoadingPatients(true);
      try {
        const raw = await api.get<any[]>('/patients');
        setPatients((raw || []).map((p: any) => ({
          ...p,
          full_name: p.name || p.full_name || '',
          status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingPatients(false);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedPatientId) {
        setData({
          routine: [],
          contingencies: [],
          goals: [],
          updated_at: new Date().toISOString()
        });
        return;
      }
      try {
        const response = await fetch(`/api/clinical-tools/${selectedPatientId}/parenting-guidance`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && typeof json === 'object') {
            setData({
              routine: json.routine || [],
              contingencies: json.contingencies || [],
              goals: json.goals || [],
              updated_at: json.updated_at || new Date().toISOString()
            });
          }
        } else {
          setData({
            routine: [],
            contingencies: [],
            goals: [],
            updated_at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      }
    };
    loadData();
  }, [selectedPatientId]);

  const handleSave = async (updatedData = data) => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione o prontuário dos pais para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...updatedData, updated_at: new Date().toISOString() };
      const response = await fetch(`/api/clinical-tools/${selectedPatientId}/parenting-guidance`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          data: payload
        })
      });

      if (response.ok) {
        setData(payload);
        success('Orientação Sincronizada', 'O plano de orientação parental foi atualizado com sucesso.');
      } else {
        throw new Error();
      }
    } catch (err) {
      error('Erro', 'Não foi possível salvar os registros.');
    } finally {
      setIsSaving(false);
    }
  };

  const addRoutineItem = () => {
    if (!newRoutine.time || !newRoutine.activity) return;
    const updated = { ...data, routine: [...data.routine, { ...newRoutine, id: Date.now() } as RoutineItem] };
    setData(updated);
    setNewRoutine({ time: '', activity: '', status: 'pending' });
    handleSave(updated);
  };

  const removeRoutineItem = (id: string | number) => {
    const updated = { ...data, routine: data.routine.filter(r => r.id !== id) };
    setData(updated);
    handleSave(updated);
  };

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={UserCheck}
          title="Orientação de Pais & Parentalidade"
          description={selectedPatientId ? `Paciente: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}` : "Construção de rotinas visuais e manejo de contingências comportamentais."}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          {/* Seleção de Paciente */}
          <ClinicalSidebar
            patients={patients}
            selectedPatientId={selectedPatientId ? String(selectedPatientId) : null}
            onSelectPatient={(id) => setSelectedPatientId(id)}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoadingPatients}
            t={t}
          />

          {/* Conteúdo */}
          <div className="min-w-0 space-y-4">
            {!selectedPatientId ? (
              <ContentCard>
                <EmptyState
                  icon={Users}
                  title="Nenhum prontuário selecionado"
                  description="Selecione um prontuário para iniciar a orientação parental."
                />
              </ContentCard>
            ) : (
              <Tabs<ParentingTab> items={parentingTabs} value={activeSub} onChange={setActiveSub} label="Seções da orientação parental">
                {activeSub === 'routine' && (
                  <PanelCard
                    title="Estruturação de Rotina"
                    icon={Calendar}
                    action={<Badge color="default" icon={<Clock size={12} />}>Painel Diário</Badge>}
                  >
                    <div className="space-y-3">
                      {data.routine.length === 0 && (
                        <EmptyState icon={Calendar} title="Nenhuma atividade na rotina." description="Adicione horários e atividades abaixo." />
                      )}
                      {data.routine.sort((a,b) => a.time.localeCompare(b.time)).map(item => (
                        <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-white hover:border-primary-200 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-12 bg-primary-50 rounded-lg flex flex-col items-center justify-center border border-primary-100 shrink-0">
                              <span className="text-xs font-medium text-primary-700">{item.time}</span>
                              <span className="text-[11px] text-primary-400">h</span>
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="text-[13px] font-medium text-slate-900 break-words">{item.activity}</p>
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-emerald-500' : item.status === 'need_improvement' ? 'bg-amber-500' : 'bg-slate-300'}`} />
                                <span className="text-[11px] text-slate-500">Execução {item.status === 'success' ? 'Ok' : 'Em ajuste'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label="Alternar execução"
                              title="Alternar execução"
                              className="hover:text-emerald-600"
                              onClick={() => {
                                const updated = {...data, routine: data.routine.map(r => r.id === item.id ? {...r, status: r.status === 'success' ? 'need_improvement' : 'success'} : r)};
                                setData(updated as ParentingData);
                                handleSave(updated as ParentingData);
                              }}
                            >
                              <CheckCircle2 size={14} />
                            </IconButton>
                            <IconButton variant="ghost" size="sm" aria-label="Remover atividade" title="Remover atividade" className="hover:text-red-600" onClick={() => removeRoutineItem(item.id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        </div>
                      ))}

                      {/* Add New Routine */}
                      <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 border-dashed grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3 items-end">
                        <Input
                          label="Horário"
                          type="time"
                          value={newRoutine.time}
                          onChange={e => setNewRoutine({...newRoutine, time: e.target.value})}
                        />
                        <Input
                          label="Atividade"
                          placeholder="Ex: Hora do banho..."
                          value={newRoutine.activity}
                          onChange={e => setNewRoutine({...newRoutine, activity: e.target.value})}
                        />
                        <Button variant="primary" onClick={addRoutineItem} iconLeft={<Plus size={14} />}>
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </PanelCard>
                )}

                {activeSub === 'plan' && (
                  <PanelCard
                    title="Plano de Manejo (ABC)"
                    icon={Layout}
                    action={
                      <Button variant="primary" size="sm" loading={isSaving} iconLeft={<Save size={14} />} onClick={() => handleSave()}>
                        Sincronizar Plano
                      </Button>
                    }
                  >
                    <div className="space-y-3">
                      <Textarea
                        label="Metas do Treinamento"
                        rows={6}
                        value={data.goals.join('\n')}
                        onChange={e => setData({...data, goals: e.target.value.split('\n')})}
                        placeholder="Quais são as principais mudanças esperadas?"
                      />
                      <Alert variant="warning" title="Nota Técnica">
                        O foco deste painel é a Psicoeducação. Utilize o registro para validar a implementação semanal.
                      </Alert>
                    </div>
                  </PanelCard>
                )}
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
