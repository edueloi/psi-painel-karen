import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { PageWrapper, SectionTitle, ContentCard } from '../../components/UI/PageWrapper';
import { Tabs } from '../../components/UI/Tabs';
import { Button } from '../../components/UI/Button';
import { Alert } from '../../components/UI/Alert';
import { EmptyState } from '../../components/UI/EmptyState';
import { Patient } from '../../types';
import { ClinicalSidebar } from '../../components/Clinical/ClinicalSidebar';
import {
  ArrowLeft, Layers, Puzzle, Activity, Camera, LayoutDashboard, ClipboardList, BarChart3, TrendingUp, Link2, PlayCircle,
} from 'lucide-react';
import { inventoriesApi, type PatientInventories, type SchemaApplication } from './schema/api';
import type { InstrumentId } from './schema/instruments';
import { latestByInstrument, type PatientRef } from './schema/common';
import { Conceptualization, useConcept } from './schema/Conceptualization';
import { OverviewTab } from './schema/OverviewTab';
import { InventoriesTab } from './schema/InventoriesTab';
import { ResultsTab } from './schema/ResultsTab';
import { EvolutionTab } from './schema/EvolutionTab';
import { ApplyModal } from './schema/ApplyModal';
import { SendLinkModal } from './schema/SendLinkModal';

type SchemaTab = 'overview' | 'inventories' | 'results' | 'evolution' | 'concept';

const POLL_MS = 30000;

export const SchemaPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SchemaTab>('overview');
  const [conceptSub, setConceptSub] = useState<'modes' | 'imagery'>('modes');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [inv, setInv] = useState<PatientInventories | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState<string | null>(null);
  const [openApp, setOpenApp] = useState<SchemaApplication | null>(null);
  const [sendOpen, setSendOpen] = useState<{ initial?: InstrumentId[] } | null>(null);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [creating, setCreating] = useState(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const concept = useConcept(selectedPatientId);

  const fetchPatients = async () => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const loadInventories = useCallback(async (patientId: string, silent = false) => {
    if (!silent) setInvLoading(true);
    try {
      const data = await inventoriesApi.forPatient(patientId);
      setInv(data); setInvError(null);
    } catch (e: any) {
      if (!silent) setInvError(e?.message || 'Erro ao carregar inventários.');
    } finally {
      if (!silent) setInvLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    const pid = searchParams.get('patient_id');
    const sub = searchParams.get('sub');
    const tabParam = searchParams.get('tab') as SchemaTab | null;
    if (pid) setSelectedPatientId(pid);
    if (sub === 'imagery') { setTab('concept'); setConceptSub('imagery'); }
    else if (tabParam && ['overview', 'inventories', 'results', 'evolution', 'concept'].includes(tabParam)) setTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    setInv(null); setInvError(null);
    if (selectedPatientId) void loadInventories(selectedPatientId);
  }, [selectedPatientId, loadInventories]);

  // acompanha respostas do paciente enviadas pelo link (atualização silenciosa)
  useEffect(() => {
    if (!selectedPatientId) return;
    const id = window.setInterval(() => { if (!document.hidden && !openApp) void loadInventories(selectedPatientId, true); }, POLL_MS);
    return () => window.clearInterval(id);
  }, [selectedPatientId, openApp, loadInventories]);

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const selectedPatient = useMemo(() => patients.find(p => p.id === selectedPatientId), [patients, selectedPatientId]);
  const patientRef: PatientRef | null = selectedPatient
    ? { id: selectedPatient.id, name: selectedPatient.full_name, phone: selectedPatient.whatsapp || selectedPatient.phone }
    : null;

  const notify = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setNotice({ msg, type });
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 6000);
  }, []);

  const reload = useCallback(() => { if (selectedPatientId) void loadInventories(selectedPatientId); }, [selectedPatientId, loadInventories]);

  /** "Aplicar agora": retoma a aplicação aberta do instrumento (sem link) ou cria uma nova. */
  const applyNow = async (id: InstrumentId) => {
    if (!selectedPatientId || creating) return;
    const existing = inv?.applications.find(a => a.instrument_id === id && a.status !== 'completed' && !a.link_id);
    if (existing) { setOpenApp(existing); return; }
    setCreating(true);
    try {
      const created = await inventoriesApi.create(selectedPatientId, id);
      setOpenApp(created);
      void loadInventories(selectedPatientId, true);
    } catch (e: any) { notify(e?.message || 'Não foi possível iniciar o inventário.', 'error'); }
    finally { setCreating(false); }
  };

  const latestDone = useMemo(() => latestByInstrument(inv?.applications || [], true), [inv]);
  const openCount = (inv?.applications || []).filter(a => a.status !== 'completed').length;

  const tabs = useMemo(() => [
    { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
    { id: 'inventories', label: 'Inventários', icon: ClipboardList, badge: openCount > 0 ? openCount : undefined },
    { id: 'results', label: 'Resultados', icon: BarChart3 },
    { id: 'evolution', label: 'Evolução', icon: TrendingUp },
    { id: 'concept', label: 'Conceituação', icon: Puzzle },
  ] as const, [openCount]);

  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
            Voltar
          </Button>
        </div>

        <SectionTitle
          icon={Layers}
          title="Terapia do Esquema"
          description={selectedPatient ? `Paciente: ${selectedPatient.full_name}` : 'Inventários de Young, resultados e conceituação de caso'}
          action={patientRef ? (
            <>
              <Button variant="outline" size="sm" iconLeft={<Link2 size={14} />} onClick={() => setSendOpen({})}>Enviar link</Button>
              <Button variant="primary" size="sm" iconLeft={<PlayCircle size={14} />} onClick={() => setTab('inventories')}>Aplicar inventário</Button>
            </>
          ) : undefined}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          <ClinicalSidebar
            patients={patients}
            selectedPatientId={selectedPatientId}
            onSelectPatient={setSelectedPatientId}
            patientSearch={patientSearch}
            setPatientSearch={setPatientSearch}
            isLoading={isLoading && patients.length === 0}
            t={t}
          />

          <div className="min-w-0 space-y-4">
            {!selectedPatient || !patientRef ? (
              <div className="space-y-3">
                <ContentCard>
                  <EmptyState
                    icon={Layers}
                    title="Terapia do Esquema"
                    description="Selecione um paciente para aplicar os inventários de Young (YSQ-S3, Estilos Parentais, YAMI, YCI, YRAI e RNE), enviar o link para ele responder, ver resultados e acompanhar a evolução."
                  />
                </ContentCard>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {[
                    { title: 'Inventários', desc: 'Aplique na sessão ou envie um link para o paciente responder, inclusive aos poucos.', icon: <ClipboardList size={14} /> },
                    { title: 'Resultados e evolução', desc: 'Esquemas ativados, modos, estilos parentais e comparação entre aplicações.', icon: <Activity size={14} /> },
                    { title: 'Conceituação e imagética', desc: 'Esquemas, modos e ressignificação imagética do caso.', icon: <Camera size={14} /> },
                  ].map((feat, i) => (
                    <ContentCard key={i}>
                      <div className="flex items-start gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-primary-700">{feat.icon}</div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-medium text-slate-800">{feat.title}</h3>
                          <p className="text-[11px] text-slate-500">{feat.desc}</p>
                        </div>
                      </div>
                    </ContentCard>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {notice && <Alert variant={notice.type === 'success' ? 'success' : 'error'}>{notice.msg}</Alert>}
                <Tabs<SchemaTab> items={tabs} value={tab} onChange={setTab} label="Seções da Terapia do Esquema">
                  {tab === 'overview' && (
                    <OverviewTab inv={inv} concept={concept} onOpen={setOpenApp} goTo={setTab} onSendLink={() => setSendOpen({})} />
                  )}
                  {tab === 'inventories' && (
                    <InventoriesTab inv={inv} loading={invLoading} error={invError} onReload={reload} onApply={applyNow} onOpen={setOpenApp}
                      onSendLink={initial => setSendOpen({ initial })} onNotify={notify} />
                  )}
                  {tab === 'results' && (
                    <ResultsTab patient={patientRef} inv={inv} onReload={reload} onNotify={notify} onGoInventories={() => setTab('inventories')} />
                  )}
                  {tab === 'evolution' && <EvolutionTab inv={inv} onGoInventories={() => setTab('inventories')} />}
                  {tab === 'concept' && (
                    <Conceptualization key={selectedPatientId} patientId={patientRef.id} state={concept} initialSub={conceptSub} latestYsq={latestDone.ysq} latestYami={latestDone.yami} />
                  )}
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>

      {openApp && patientRef && (
        <ApplyModal key={openApp.id} application={openApp} patientName={patientRef.name} onClose={() => setOpenApp(null)} onChanged={reload} notify={notify} />
      )}
      {sendOpen && patientRef && (
        <SendLinkModal patientId={patientRef.id} patientName={patientRef.name} patientPhone={patientRef.phone} initial={sendOpen.initial}
          onClose={() => setSendOpen(null)} onCreated={reload} />
      )}
    </PageWrapper>
  );
};
