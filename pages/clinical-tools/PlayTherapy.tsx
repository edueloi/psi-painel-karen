import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  Baby, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Save,
  MessageCircle,
  Gamepad2,
  Palette,
  Layout,
  ClipboardList,
  Star,
  Users
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageWrapper, SectionTitle, ContentCard, StatGrid } from '../../components/UI/PageWrapper';
import { PanelCard } from '../../components/UI/PanelCard';
import { Tabs } from '../../components/UI/Tabs';
import { Button, IconButton } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { EmptyState } from '../../components/UI/EmptyState';
import { StatCard } from '../../components/UI/StatCard';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Patient } from '../../types';
import { api } from '../../services/api';

interface PlaySession {
  id: string | number;
  date: string;
  toysUsed: string[];
  themes: string;
  observations: string;
}

export const PlayTherapyPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  
  const [sessions, setSessions] = useState<PlaySession[]>([]);
  const [newSession, setNewSession] = useState<Partial<PlaySession>>({
    date: new Date().toISOString().split('T')[0],
    toysUsed: [],
    themes: '',
    observations: ''
  });
  const [isSaving, setIsSaving] = useState(false);

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

  // Carregar dados do paciente selecionado
  useEffect(() => {
    const loadData = async () => {
      if (!selectedPatientId) {
        setSessions([]);
        return;
      }
      try {
        const response = await fetch(`/api/clinical-tools/${selectedPatientId}/play-therapy`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) setSessions(data);
          else setSessions([]);
        } else {
          setSessions([]);
        }
      } catch (err) {
        console.error('Erro ao carregar sessões:', err);
        setSessions([]);
      }
    };
    loadData();
  }, [selectedPatientId]);

  const handleSave = async () => {
    if (!selectedPatientId) {
      info('Atenção', 'Selecione um paciente para salvar os dados.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedSessions = [...sessions, { ...newSession, id: Date.now() } as PlaySession];
      const response = await fetch(`/api/clinical-tools/${selectedPatientId}/play-therapy`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          data: updatedSessions
        })
      });

      if (response.ok) {
        setSessions(updatedSessions);
        setNewSession({
          date: new Date().toISOString().split('T')[0],
          toysUsed: [],
          themes: '',
          observations: ''
        });
        success('Sessão Registrada', 'O registro da ludoterapia foi salvo com sucesso.');
      } else {
        throw new Error();
      }
    } catch (err) {
      error('Erro ao Salvar', 'Não foi possível salvar o registro da sessão.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSession = async (id: string | number) => {
    if (!selectedPatientId) return;
    const updated = sessions.filter(s => s.id !== id);
    try {
      await fetch(`/api/clinical-tools/${selectedPatientId}/play-therapy`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          data: updated
        })
      });
      setSessions(updated);
      success('Excluído', 'Sessão removida do histórico.');
    } catch (err) {
      error('Erro', 'Falha ao excluir sessão.');
    }
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
          icon={Baby}
          title="Ludoterapia & Clínica Infantil"
          description={selectedPatientId ? `Paciente: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}` : "Manejo clínico através do brincar e do lúdico."}
        />

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <ClinicalSidebar
            patients={patients}
            selectedPatientId={selectedPatientId ? String(selectedPatientId) : null}
            onSelectPatient={(id) => setSelectedPatientId(id)}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoadingPatients}
            t={t}
          />

          <div className="min-w-0">
            {!selectedPatientId ? (
              <ContentCard>
                <EmptyState
                  icon={Users}
                  title="Ludoterapia"
                  description="Selecione um paciente para iniciar o registro lúdico."
                />
              </ContentCard>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-3">
                <PanelCard title="Novo Registro Lúdico" icon={Gamepad2} className="h-fit">
                  <div className="space-y-3">
                    <Input
                      label="Data do Atendimento"
                      type="date"
                      value={newSession.date}
                      onChange={e => setNewSession({ ...newSession, date: e.target.value })}
                    />
                    <Input
                      label="Temas Emergentes"
                      placeholder="Ex: Agressividade, Cuidado, Separação..."
                      value={newSession.themes}
                      onChange={e => setNewSession({ ...newSession, themes: e.target.value })}
                    />
                    <Textarea
                      label="Brinquedos/Recursos Utilizados"
                      placeholder="Liste os itens usados na sessão..."
                      rows={3}
                      value={newSession.toysUsed?.join(', ')}
                      onChange={e => setNewSession({ ...newSession, toysUsed: e.target.value.split(',').map(s => s.trim()) })}
                    />
                    <Textarea
                      label="Observações do Brincar"
                      placeholder="Como a criança se expressou no setting?"
                      rows={5}
                      value={newSession.observations}
                      onChange={e => setNewSession({ ...newSession, observations: e.target.value })}
                    />
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={handleSave}
                      isLoading={isSaving}
                      iconRight={<Save size={14} />}
                    >
                      Salvar Registro
                    </Button>
                  </div>
                </PanelCard>

                <div className="space-y-3 min-w-0">
                  <StatGrid cols={3}>
                    <StatCard title="Sessões Realizadas" value={sessions.length} icon={ClipboardList} />
                    <StatCard
                      title="Temas Identificados"
                      value={Array.from(new Set(sessions.flatMap(s => s.themes.split(',')))).filter((t: string) => t.trim()).length}
                      icon={Sparkles}
                    />
                    <ContentCard>
                      <p className="text-[11px] text-slate-500">Conserto do Vínculo</p>
                      <div className="flex gap-1.5 pt-2">
                        {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className={i <= 4 ? "text-amber-400 fill-amber-400" : "text-slate-200"} />)}
                      </div>
                    </ContentCard>
                  </StatGrid>

                  <PanelCard title="Crônica das Sessões" icon={History} contentClassName="p-0">
                    <div className="divide-y divide-slate-100">
                      {sessions.length === 0 ? (
                        <EmptyState icon={ClipboardList} title="Nenhum registro encontrado para este paciente." />
                      ) : (
                        sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                          <div key={session.id} className="p-3 hover:bg-slate-50 transition-colors group">
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-3 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge color="default" size="sm">
                                    {new Date(session.date).toLocaleDateString('pt-BR')}
                                  </Badge>
                                  {(session.themes || '').split(',').map(t => (
                                    <Badge key={t} color="primary" size="sm">
                                      #{t.trim()}
                                    </Badge>
                                  ))}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-600">Brinquedos & Recursos</p>
                                    <p className="text-xs text-slate-600 italic border-l-2 border-slate-200 pl-3">
                                      {(session.toysUsed || []).join(', ') || 'Nenhum especificado'}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-xs font-medium text-slate-600">Observação Clínica</p>
                                    <p className="text-xs text-slate-600">
                                      {session.observations}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <IconButton
                                variant="ghost"
                                size="sm"
                                aria-label="Excluir registro"
                                title="Excluir registro"
                                className="hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                onClick={() => deleteSession(session.id)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </PanelCard>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
};
