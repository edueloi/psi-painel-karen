import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

import { 
  Users, 
  Target, 
  History, 
  Sparkles, 
  ArrowLeft,
  Heart,
  MessageSquare,
  ShieldAlert,
  Save,
  Trash2,
  MoreVertical,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  Plus,
  FileText
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { PageWrapper, SectionTitle, ContentCard } from '../../components/UI/PageWrapper';
import { PanelCard } from '../../components/UI/PanelCard';
import { Tabs } from '../../components/UI/Tabs';
import { Button, IconButton } from '../../components/UI/Button';
import { Input, Textarea, Select } from '../../components/UI/Input';
import { Badge } from '../../components/UI/Badge';
import { EmptyState } from '../../components/UI/EmptyState';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import { Patient } from '../../types';
import { api } from '../../services/api';

interface MapItem {
  id: string | number;
  partner: 'A' | 'B';
  interest: string;
  intensity: number;
}

interface CoupleData {
  loveMap: MapItem[];
  agreements: string[];
  conflictLevel: number;
  updated_at: string;
}

export const CoupleTherapyPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || searchParams.get('patient_id');
  const { success, error, info } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatientId);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);

  const [data, setData] = useState<CoupleData>({
    loveMap: [],
    agreements: [],
    conflictLevel: 5,
    updated_at: new Date().toISOString()
  });
  const [isSaving, setIsSaving] = useState(false);
  const [newMapItem, setNewMapItem] = useState<{partner: 'A' | 'B', interest: string, intensity: number}>({
    partner: 'A',
    interest: '',
    intensity: 5
  });

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
          loveMap: [],
          agreements: [],
          conflictLevel: 5,
          updated_at: new Date().toISOString()
        });
        return;
      }
      try {
        const response = await fetch(`/api/clinical-tools/${selectedPatientId}/couple-therapy`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const json = await response.json();
          if (json && typeof json === 'object') {
            setData({
              loveMap: json.loveMap || [],
              agreements: json.agreements || [],
              conflictLevel: json.conflictLevel ?? 5,
              updated_at: json.updated_at || new Date().toISOString()
            });
          }
        } else {
          setData({
            loveMap: [],
            agreements: [],
            conflictLevel: 5,
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
      info('Atenção', 'Selecione o prontuário do casal para salvar.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { ...updatedData, updated_at: new Date().toISOString() };
      const response = await fetch(`/api/clinical-tools/${selectedPatientId}/couple-therapy`, {
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
        success('Painel do Casal Atualizado', 'Os dados do sistema conjugal foram sincronizados.');
      } else {
        throw new Error();
      }
    } catch (err) {
      error('Erro', 'Não foi possível salvar os dados do casal.');
    } finally {
      setIsSaving(false);
    }
  };

  const addMapItem = () => {
    if (!newMapItem.interest) return;
    const newItem = { ...newMapItem, id: Date.now() };
    const updated = { ...data, loveMap: [...data.loveMap, newItem] };
    setData(updated);
    setNewMapItem({ partner: 'A', interest: '', intensity: 5 });
    handleSave(updated);
  };

  const removeMapItem = (id: string | number) => {
    const updated = { ...data, loveMap: data.loveMap.filter(item => item.id !== id) };
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
          icon={Users}
          title="Terapia de Casal & Conjugalidade"
          description={selectedPatientId ? `Paciente: ${patients.find(p => String(p.id) === String(selectedPatientId))?.full_name}` : "Mapeamento de vínculos, contratos e mapas do amor."}
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
                  title="Terapia de Casal"
                  description="Selecione um prontuário de casal para iniciar o mapeamento."
                />
              </ContentCard>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                <PanelCard
                  title="Mapa do Amor (Gottman)"
                  icon={Heart}
                  className="min-w-0"
                  action={<Badge color="default" size="sm">Sincronização Ativa</Badge>}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(['A', 'B'] as const).map(partner => (
                        <div key={partner} className="space-y-2 min-w-0">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <Badge color={partner === 'A' ? 'success' : 'danger'} size="md">{partner}</Badge>
                            <p className="text-xs font-medium text-slate-600">Interesses & Sonhos</p>
                          </div>
                          <div className="space-y-2">
                            {data.loveMap.filter(i => i.partner === partner).map(item => (
                              <div key={item.id} className="group flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2 size={14} className={`shrink-0 ${partner === 'A' ? 'text-emerald-500' : 'text-rose-500'}`} />
                                  <span className="text-xs text-slate-700">{item.interest}</span>
                                </div>
                                <IconButton
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Remover interesse"
                                  title="Remover interesse"
                                  className="hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                  onClick={() => removeMapItem(item.id)}
                                >
                                  <Trash2 size={14} />
                                </IconButton>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
                      <Select
                        aria-label="Parceiro"
                        wrapperClassName="sm:w-36"
                        value={newMapItem.partner}
                        onChange={e => setNewMapItem({ ...newMapItem, partner: e.target.value as 'A' | 'B' })}
                      >
                        <option value="A">Parceiro A</option>
                        <option value="B">Parceiro B</option>
                      </Select>
                      <Input
                        aria-label="Novo interesse"
                        wrapperClassName="flex-1"
                        placeholder="Novo interesse..."
                        value={newMapItem.interest}
                        onChange={e => setNewMapItem({ ...newMapItem, interest: e.target.value })}
                      />
                      <Button variant="primary" iconLeft={<Plus size={14} />} onClick={addMapItem}>
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </PanelCard>

                <div className="space-y-3 min-w-0">
                  <PanelCard title="Monitor de Tensão Sistêmica" icon={Activity}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-emerald-600">Conexão Terapêutica</span>
                        <span className="text-rose-600">Conflito Agudo</span>
                      </div>
                      <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200 relative group cursor-pointer">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${data.conflictLevel > 7 ? 'bg-rose-500' : data.conflictLevel > 4 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${data.conflictLevel * 10}%` }}
                        />
                        <input
                          type="range" min="1" max="10" step="1"
                          aria-label="Nível de conflito"
                          value={data.conflictLevel}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setData({ ...data, conflictLevel: val });
                            handleSave({ ...data, conflictLevel: val });
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between px-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <span key={n} className={`text-[11px] ${data.conflictLevel === n ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>{n}</span>
                        ))}
                      </div>
                    </div>
                  </PanelCard>

                  <PanelCard title="Acordos & Contratos de Convivência" icon={Layers}>
                    <div className="space-y-3">
                      <Textarea
                        aria-label="Acordos e contratos de convivência"
                        rows={8}
                        placeholder="Quais são os combinados estabelecidos em sessão? Utilize este espaço para consolidar o contrato de convivência e as metas do casal."
                        value={data.agreements.join('\n')}
                        onChange={e => setData({ ...data, agreements: e.target.value.split('\n') })}
                      />
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => handleSave()}
                        isLoading={isSaving}
                        iconRight={<Save size={14} />}
                      >
                        Consolidar Acordo
                      </Button>
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
