import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Calendar, FileText, BrainCircuit, ClipboardList, FolderOpen,
  Boxes, StickyNote, MapPin, Shield, Phone, Mail, User, Edit2,
  Loader2, Download, Trash2, FileUp, TrendingUp, ExternalLink,
  ChevronRight, History, Activity, Link2, Copy, Check, X, Clock, Smartphone,
  CheckSquare, Plus, Flag, Tag, AlarmClock, MessageCircle, Send,
  Heart, BookOpen, Dumbbell, Smile,
  FileSignature, PauseCircle, PlayCircle, Image as ImageIcon, Paperclip,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api, getStaticUrl } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Patient } from '../types';
import { PatientHistoryDrawer } from '../components/Patient/PatientHistoryDrawer';
import {
  Badge,
  Button,
  ConfirmModal as UIConfirmModal,
  ContentCard,
  DetailField,
  EmptyState,
  FilterLine,
  FilterLineDateRange,
  FilterLineSection,
  FilterPopover,
  FormRow,
  IconButton,
  Input,
  Modal,
  ModalFooter,
  PageWrapper,
  PanelCard,
  Select,
  Switch,
  Tabs,
  Textarea,
} from '../components/UI';
import { useToast } from '../contexts/ToastContext';
import { getPortalBaseUrl } from '@/src/lib/portal';

const patientName = (p: Patient) => p.full_name || (p as any).name || '?';

const calcAge = (val?: string) => {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
};

const formatDate = (val?: string) => {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
};

const isActive = (p: Patient) =>
  p.status === 'ativo' || p.status === 'active' || (p.active as any) === true || (p.active as any) === 1;

const safeGet = async <T,>(url: string, params?: Record<string, string>): Promise<T | null> => {
  try { return await api.get<T>(url, params); } catch { return null; }
};

type Tab = 'dados' | 'agenda' | 'documentos' | 'prontuario' | 'formularios' | 'ferramentas' | 'tarefas' | 'mensagens' | 'portal' | 'contrato';

const TABS = [
  { id: 'dados',       label: 'Dados',       icon: User },
  { id: 'agenda',      label: 'Agenda',      icon: Calendar },
  { id: 'tarefas',     label: 'Tarefas',     icon: CheckSquare },
  { id: 'portal',      label: 'Portal',      icon: Heart },
  { id: 'contrato',    label: 'Contrato',    icon: FileSignature },
  { id: 'mensagens',   label: 'Mensagens',   icon: MessageCircle },
  { id: 'documentos',  label: 'Documentos',  icon: FolderOpen },
  { id: 'prontuario',  label: 'Prontuário',  icon: FileText },
  { id: 'formularios', label: 'Formulários', icon: ClipboardList },
  { id: 'ferramentas', label: 'Ferramentas', icon: Boxes },
] as const;

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { pushToast } = useToast();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'dados');
  const [historyOpen, setHistoryOpen] = useState(false);

  // Portal do paciente
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [portalTokens, setPortalTokens] = useState<any[]>([]);
  const [portalLinkLoading, setPortalLinkLoading] = useState(false);
  const [portalCopiedId, setPortalCopiedId] = useState<number | null>(null);
  const [portalForm, setPortalForm] = useState({
    expires_in_days: '30', allow_self_schedule: true, require_approval: true, self_register: false,
  });

  // Tab data
  const [appointments, setAppointments] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Summary counts
  const [summary, setSummary] = useState<Record<string, number | null>>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    safeGet<Patient>(`/patients/${id}`).then(data => {
      setPatient(data);
      setLoading(false);
    });
  }, [id]);

  // Load summary counts
  useEffect(() => {
    if (!id) return;
    Promise.all([
      safeGet<any[]>('/appointments', { patient_id: id }),
      safeGet<any[]>('/medical-records', { patient_id: id }),
      safeGet<any[]>('/pei', { patient_id: id }),
      safeGet<any[]>('/forms/responses', { patient_id: id }),
      safeGet<any[]>('/uploads', { patient_id: id }),
      safeGet<any>('/clinical-tools/summary', { patient_id: id }),
      safeGet<any[]>('/notes', { patient_id: id }),
    ]).then(([apts, recs, neuro, fms, docs, tools, notes]) => {
      const count = (v: any) => Array.isArray(v) ? v.length : typeof v === 'number' ? v : v?.count ?? null;
      setSummary({
        agenda: count(Array.isArray(apts) ? apts.filter((a: any) => String(a.patient_id ?? a.patientId ?? '') === id) : apts),
        prontuario: count(recs),
        neuro: count(neuro),
        formularios: count(fms),
        documentos: count(docs),
        ferramentas: count(tools),
        notas: count(notes),
      });
    });
  }, [id]);

  const loadTab = useCallback(async (tab: Tab) => {
    if (!id) return;
    setTabLoading(true);
    if (tab === 'agenda') {
      const data = await safeGet<any[]>('/appointments', { patient_id: id });
      setAppointments(Array.isArray(data) ? data.filter((a: any) => String(a.patient_id ?? a.patientId ?? '') === id) : []);
    } else if (tab === 'documentos') {
      const data = await safeGet<any[]>('/uploads', { patient_id: id });
      setDocuments(Array.isArray(data) ? data : []);
    } else if (tab === 'prontuario') {
      const data = await safeGet<any[]>('/medical-records', { patient_id: id });
      setRecords(Array.isArray(data) ? data : []);
    } else if (tab === 'formularios') {
      const data = await safeGet<any[]>('/forms/responses', { patient_id: id });
      setForms(Array.isArray(data) ? data : []);
    }
    setTabLoading(false);
  }, [id]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (['agenda', 'documentos', 'prontuario', 'formularios'].includes(tab)) {
      loadTab(tab);
    }
  };

  const loadPortalTokens = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.get<any[]>('/patient-portal/tokens', { patient_id: id });
      setPortalTokens(Array.isArray(data) ? data : []);
    } catch { setPortalTokens([]); }
  }, [id]);

  const openPortalModal = () => {
    setPortalModalOpen(true);
    loadPortalTokens();
  };

  const generatePortalLink = async () => {
    if (!id) return;
    setPortalLinkLoading(true);
    try {
      const res = await api.post<any>('/patient-portal/tokens', {
        patient_id: parseInt(id),
        expires_in_days: parseInt(portalForm.expires_in_days) || 30,
        allow_self_schedule: portalForm.allow_self_schedule,
        require_approval: portalForm.require_approval,
        self_register: portalForm.self_register,
        label: `Portal — ${patientName(patient!)}`,
      });
      await loadPortalTokens();
    } catch {
      pushToast('error', 'Erro ao gerar link.');
    } finally { setPortalLinkLoading(false); }
  };

  const revokePortalToken = async (tokenId: number) => {
    try {
      await api.delete(`/patient-portal/tokens/${tokenId}`);
      setPortalTokens(prev => prev.filter(t => t.id !== tokenId));
    } catch { pushToast('error', 'Erro ao revogar.'); }
  };

  const [sendingRegistrationLink, setSendingRegistrationLink] = useState(false);
  const sendRegistrationLink = async () => {
    if (!id) return;
    setSendingRegistrationLink(true);
    try {
      const res = await api.post<any>('/patient-registration/send', { patient_id: parseInt(id) });
      if (res.sent_via_bot) {
        pushToast('success', 'Link de atualização de cadastro enviado via WhatsApp!');
      } else if (res.whatsapp_url) {
        window.open(res.whatsapp_url, '_blank', 'noopener,noreferrer');
        pushToast('success', 'Link gerado — envie pelo WhatsApp que abriu.');
      } else {
        pushToast('success', 'Link gerado, mas o paciente não tem telefone cadastrado.');
      }
    } catch {
      pushToast('error', 'Erro ao gerar link de cadastro.');
    } finally {
      setSendingRegistrationLink(false);
    }
  };

  const copyPortalLink = (token: string, id: number) => {
    const url = `${getPortalBaseUrl()}/portal/entrar/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setPortalCopiedId(id);
      setTimeout(() => setPortalCopiedId(null), 2000);
    });
  };

  const handlePatientSaved = async (data: Partial<Patient>, files: { file: File; label: string }[], photoFile?: File | null) => {
    try {
      const payload = {
        name: data.full_name,
        email: data.email || null,
        phone: data.whatsapp || data.phone || null,
        phone2: data.phone2 || null,
        birth_date: data.birth_date || null,
        cpf: data.cpf_cnpj || data.cpf || null,
        rg: data.rg || null,
        gender: data.gender || null,
        marital_status: data.marital_status || null,
        education: data.education || null,
        profession: data.profession || null,
        nationality: data.nationality || null,
        naturality: (data as any).naturality || null,
        has_children: data.has_children ? 1 : 0,
        children_count: data.children_count || 0,
        minor_children_count: data.minor_children_count || 0,
        spouse_name: data.spouse_name || null,
        family_contact: data.family_contact || null,
        emergency_contact: data.emergency_contact || null,
        address: data.street
          ? `${data.street}${data.house_number ? ', ' + data.house_number : ''}${data.neighborhood ? ' - ' + data.neighborhood : ''}`
          : null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.address_zip || null,
        address_cep: data.address_zip || null,
        address_logradouro: data.street || null,
        address_numero: data.house_number || null,
        address_bairro: data.neighborhood || null,
        address_uf: data.state || null,
        address_municipio_ibge: data.municipio_ibge || null,
        notes: data.notes || null,
        status: data.status || 'ativo',
        health_plan: data.convenio ? data.convenio_name || 'Sim' : null,
        diagnosis: (data as any).diagnosis || null,
        is_payer: data.is_payer !== undefined ? data.is_payer : true,
        payer_name: data.payer_name || null,
        payer_cpf: data.payer_cpf || null,
        payer_phone: data.payer_phone || null,
      };

      if (!data.id) return;

      await api.put(`/patients/${data.id}`, payload);

      if (files.length) {
        for (const doc of files) {
          const fd = new FormData();
          fd.append('file', doc.file);
          fd.append('title', doc.label.trim() || doc.file.name);
          fd.append('category', 'Paciente');
          fd.append('patient_id', String(data.id));
          await api.request('/uploads', { method: 'POST', body: fd });
        }
      }

      if (photoFile) {
        const fd = new FormData();
        fd.append('photo', photoFile);
        await api.request(`/patients/${data.id}/photo`, { method: 'POST', body: fd });
      }

      pushToast('success', 'Paciente atualizado com sucesso!');
      
      const fresh = await safeGet<Patient>(`/patients/${id}`);
      if (fresh) setPatient(fresh);
    } catch (err) {
      console.error('Erro ao salvar paciente:', err);
      pushToast('error', 'Erro ao salvar paciente.');
    }
  };

  if (loading) {
    return (
      <PageWrapper>
        <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 size={18} className="animate-spin" />Carregando…
        </div>
      </PageWrapper>
    );
  }

  if (!patient) {
    return (
      <PageWrapper>
        <ContentCard>
          <EmptyState
            icon={User}
            title="Paciente não encontrado"
            description="O cadastro pode ter sido removido ou você não tem acesso a ele."
            action={
              <Button type="button" variant="outline" onClick={() => navigate('/pacientes')} size="sm">
                Voltar à lista
              </Button>
            }
          />
        </ContentCard>
      </PageWrapper>
    );
  }

  const age = calcAge(patient.birth_date || patient.birthDate);
  const active = isActive(patient);

  const visibleTabs = TABS.filter(tab => {
    if (tab.id === 'prontuario') return hasPermission('view_medical_records');
    if (tab.id === 'ferramentas') return hasPermission('manage_clinical_tools');
    if (tab.id === 'documentos') return hasPermission('manage_documents');
    if (tab.id === 'formularios') return hasPermission('manage_forms');
    if (tab.id === 'portal') return hasPermission('manage_patient_portal');
    return true;
  }).map(tab => {
    const n = summary[tab.id];
    return { ...tab, badge: n != null && n > 0 ? n : undefined };
  });

  const quickStats = [
    { key: 'agenda',      label: 'Agenda',      icon: Calendar },
    { key: 'prontuario',  label: 'Prontuário',  icon: FileText },
    { key: 'neuro',       label: 'Neuro',       icon: BrainCircuit },
    { key: 'formularios', label: 'Formulários', icon: ClipboardList },
    { key: 'documentos',  label: 'Docs',        icon: FolderOpen },
    { key: 'ferramentas', label: 'Ferramentas', icon: Boxes },
    { key: 'notas',       label: 'Notas',       icon: StickyNote },
  ];

  return (
    <PageWrapper mobileBottomPad={false}>
      <div className="space-y-4">
        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => navigate('/pacientes')} iconLeft={<ArrowLeft size={14} />}>
            Voltar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              iconLeft={<History size={14} />}
            >
              Histórico
            </Button>
            {hasPermission('manage_patient_portal') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={openPortalModal}
                iconLeft={<Smartphone size={14} />}
              >
                Portal
              </Button>
            )}
            {hasPermission('edit_patient') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={sendRegistrationLink}
                loading={sendingRegistrationLink}
                disabled={sendingRegistrationLink}
                iconLeft={<Send size={14} />}
              >
                Enviar cadastro
              </Button>
            )}
            {hasPermission('edit_patient') && (
              <Button
                type="button"
                size="sm"
                onClick={() => navigate(`/pacientes/${id}/editar`)}
                iconLeft={<Edit2 size={14} />}
              >
                Editar
              </Button>
            )}
          </div>
        </div>

        {/* Cabeçalho do paciente */}
        <ContentCard padding="md">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center text-lg font-medium text-primary-700">
              {patient.photo_url || patient.photoUrl ? (
                <img src={getStaticUrl(patient.photo_url || patient.photoUrl)} alt={patientName(patient)} className="w-full h-full object-cover" />
              ) : (
                (patientName(patient) || '?').charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base sm:text-lg font-medium text-slate-900">{patientName(patient)}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge color={active ? 'success' : 'default'} dot size="sm">{active ? 'Ativo' : 'Inativo'}</Badge>
                {age && <span>{age} anos</span>}
                {patient.health_plan && (
                  <span className="flex items-center gap-1"><Shield size={12} /> {patient.health_plan}</span>
                )}
              </div>
            </div>
          </div>

          {/* Resumo de vínculos */}
          <div className="mt-3 grid grid-cols-4 sm:grid-cols-7 gap-3">
            {quickStats.map(item => (
              <div key={item.key} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-center">
                <div className="mb-1 flex justify-center text-primary-600"><item.icon size={14} /></div>
                <div className="text-base font-medium leading-none text-slate-800">
                  {summary[item.key] === null || summary[item.key] === undefined ? '—' : summary[item.key]}
                </div>
                <div className="mt-1 text-[11px] leading-tight text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </ContentCard>

        {/* Abas */}
        <Tabs<Tab> items={visibleTabs} value={activeTab} onChange={handleTabChange} label="Seções do paciente">
          {activeTab === 'dados' && <TabDados patient={patient} navigate={navigate} />}
          {activeTab === 'agenda' && <TabAgenda appointments={appointments} loading={tabLoading} patientId={id!} navigate={navigate} />}
          {activeTab === 'documentos' && <TabDocumentos documents={documents} loading={tabLoading} patientId={id!} onRefresh={() => loadTab('documentos')} />}
          {activeTab === 'prontuario' && <TabProntuario records={records} loading={tabLoading} patientId={id!} navigate={navigate} />}
          {activeTab === 'tarefas'     && <TabTarefas patientId={id!} />}
          {activeTab === 'portal'      && <TabPortal patientId={id!} />}
          {activeTab === 'contrato'    && <TabContrato patientId={id!} />}
          {activeTab === 'mensagens'   && <TabMensagens patientId={id!} />}
          {activeTab === 'formularios' && <TabFormularios forms={forms} loading={tabLoading} patientId={id!} navigate={navigate} />}
          {activeTab === 'ferramentas' && <TabFerramentas patientId={id!} navigate={navigate} />}
        </Tabs>
      </div>

      {/* History drawer */}
      <PatientHistoryDrawer
        patient={historyOpen ? patient : null}
        onClose={() => setHistoryOpen(false)}
      />

      {/* Modal Portal do Paciente */}
      <Modal
        isOpen={portalModalOpen}
        onClose={() => setPortalModalOpen(false)}
        title="Portal do Paciente"
        subtitle="Gere um link de acesso seguro para o paciente acompanhar suas consultas e pagamentos."
        size="md"
        footer={
          <ModalFooter align="between">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPortalModalOpen(false)}>Fechar</Button>
            <Button type="button" size="sm" onClick={generatePortalLink} loading={portalLinkLoading} iconLeft={<Link2 size={14} />}>
              Gerar novo link
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          {/* Configurações */}
          <PanelCard title="Configurações do link" contentClassName="space-y-3">
            <Switch
              checked={portalForm.allow_self_schedule}
              onCheckedChange={v => setPortalForm(f => ({ ...f, allow_self_schedule: v }))}
              label="Solicitar agendamento"
              description="Paciente pode solicitar novos horários"
            />
            <Switch
              checked={portalForm.require_approval}
              onCheckedChange={v => setPortalForm(f => ({ ...f, require_approval: v }))}
              label="Requer aprovação"
              description="Agendamentos precisam de confirmação"
            />
            <Select
              label="Expira em"
              value={portalForm.expires_in_days}
              onChange={e => setPortalForm(f => ({ ...f, expires_in_days: e.target.value }))}
            >
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="90">90 dias</option>
              <option value="365">1 ano</option>
              <option value="0">Nunca expira</option>
            </Select>
          </PanelCard>

          {/* Links gerados */}
          {portalTokens.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600">Links gerados</p>
                <span className="text-[11px] text-slate-500">{portalTokens.filter(t => !t.is_used && !(t.expires_at && new Date(t.expires_at) < new Date())).length} ativo(s)</span>
              </div>
              {portalTokens.map(tk => {
                const url = `${getPortalBaseUrl()}/portal/entrar/${tk.token}`;
                const expired = tk.expires_at && new Date(tk.expires_at) < new Date();
                const used = !!tk.is_used;
                const inactive = expired || used;
                return (
                  <div key={tk.id} className={`rounded-lg border p-3 ${inactive ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}>
                    <div className="mb-2 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-medium text-slate-700">{tk.label || 'Portal do Paciente'}</p>
                        {used && <Badge color="warning" size="sm">Já utilizado</Badge>}
                        {!used && expired && <Badge color="danger" size="sm">Expirado</Badge>}
                        {!used && !expired && <Badge color="success" size="sm" dot>Ativo</Badge>}
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-1">{url.slice(0, 50)}…</p>
                      {tk.created_at && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Gerado em {new Date(tk.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Clock size={12} />
                        {used
                          ? <span className="text-amber-600">Acesso único — link esgotado</span>
                          : expired
                          ? <span className="text-red-600">Expirado em {new Date(tk.expires_at).toLocaleDateString('pt-BR')}</span>
                          : tk.expires_at
                          ? `Expira ${new Date(tk.expires_at).toLocaleDateString('pt-BR')}`
                          : 'Sem expiração'}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {!inactive && (
                          <Button
                            type="button"
                            size="xs"
                            variant={portalCopiedId === tk.id ? 'success' : 'outline'}
                            onClick={() => copyPortalLink(tk.token, tk.id)}
                            iconLeft={portalCopiedId === tk.id ? <Check size={14} /> : <Copy size={14} />}
                          >
                            {portalCopiedId === tk.id ? 'Copiado!' : 'Copiar'}
                          </Button>
                        )}
                        {!inactive && (
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex h-7 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                            <ExternalLink size={14} /> Abrir
                          </a>
                        )}
                        <Button
                          type="button"
                          size="xs"
                          variant="softDanger"
                          onClick={() => revokePortalToken(tk.id)}
                          title="Excluir link"
                          iconLeft={<Trash2 size={14} />}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {portalTokens.length === 0 && !portalLinkLoading && (
            <p className="text-center py-3 text-xs text-slate-500">Nenhum link gerado ainda.</p>
          )}
        </div>
      </Modal>
    </PageWrapper>
  );
};

// ─── Tab: Dados ───────────────────────────────────────────────────────────────
const TabDados: React.FC<{ patient: Patient; navigate: (p: string) => void }> = ({ patient, navigate }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {/* Contato */}
      <PanelCard title="Contato" icon={Phone}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <DetailField label="Telefone" value={patient.whatsapp || patient.phone} />
          <DetailField label="Telefone 2" value={patient.phone2} />
          <DetailField label="Email" value={patient.email} />
          <DetailField label="CPF" value={patient.cpf_cnpj || patient.cpf} />
          <DetailField label="RG" value={patient.rg} />
        </dl>
      </PanelCard>

      {/* Dados pessoais */}
      <PanelCard title="Dados pessoais" icon={User}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <DetailField label="Nascimento" value={formatDate(patient.birth_date || patient.birthDate)} />
          <DetailField label="Gênero" value={patient.gender} />
          <DetailField label="Estado civil" value={patient.marital_status} />
          <DetailField label="Escolaridade" value={patient.education} />
          <DetailField label="Profissão" value={patient.profession} />
          <DetailField label="Nacionalidade" value={patient.nationality} />
          <DetailField label="Naturalidade" value={patient.naturality} />
        </dl>
      </PanelCard>

      {/* Endereço */}
      {(patient.address || patient.street || patient.city) && (
        <PanelCard title="Endereço" icon={MapPin}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <DetailField label="Logradouro" value={patient.address || patient.street} />
            <DetailField label="Número" value={patient.house_number} />
            <DetailField label="Bairro" value={patient.neighborhood} />
            <DetailField label="Cidade" value={patient.city} />
            <DetailField label="Estado" value={patient.state} />
            <DetailField label="CEP" value={patient.zip_code || patient.address_zip} />
          </dl>
        </PanelCard>
      )}

      {/* Família */}
      {(patient.spouse_name || patient.family_contact || patient.emergency_contact) && (
        <PanelCard title="Família / contatos" icon={Activity}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            <DetailField label="Cônjuge" value={patient.spouse_name} />
            <DetailField label="Contato familiar" value={patient.family_contact} />
            <DetailField label="Contato emergência" value={patient.emergency_contact} />
          </dl>
        </PanelCard>
      )}
    </div>

    {/* Clínico */}
    <PanelCard title="Informações clínicas" icon={Shield}>
      <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6">
        <DetailField label="Convênio" value={patient.health_plan || (patient.convenio ? patient.convenio_name || 'Sim' : undefined)} />
        <DetailField label="Diagnóstico" value={patient.diagnosis} />
      </dl>
      {patient.notes && (
        <div className="mt-3">
          <div className="text-xs font-medium text-slate-600 mb-1.5">Observações</div>
          <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
            {patient.notes}
          </div>
        </div>
      )}
    </PanelCard>

    {/* Quick nav */}
    <PanelCard title="Ir para" icon={ExternalLink}>
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Prontuário', path: `/prontuario?patient_id=${patient.id}` },
          { label: 'Neuro/PEI', path: `/neurodesenvolvimento?patient_id=${patient.id}` },
          { label: 'Formulários', path: `/formularios/lista?patient_id=${patient.id}` },
          { label: 'Documentos', path: `/documentos?patient_id=${patient.id}` },
          { label: 'Ferramentas', path: `/caixa-ferramentas?patient_id=${patient.id}` },
        ].map(btn => (
          <Button
            key={btn.label}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(btn.path)}
            iconRight={<ExternalLink size={14} />}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </PanelCard>
  </div>
);

// ─── Tab: Agenda ──────────────────────────────────────────────────────────────
type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'orange' | 'teal';
const STATUS_MAP: Record<string, { label: string; color: BadgeTone }> = {
  scheduled:   { label: 'Agendado',    color: 'primary' },
  confirmed:   { label: 'Confirmado',  color: 'info' },
  completed:   { label: 'Realizado',   color: 'success' },
  cancelled:   { label: 'Cancelado',   color: 'danger' },
  'no-show':   { label: 'Faltou',      color: 'warning' },
  rescheduled: { label: 'Reagendado',  color: 'orange' },
};
const STATUS_CHIPS = ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show', 'rescheduled'];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TabAgenda: React.FC<{ appointments: any[]; loading: boolean; patientId: string; navigate: (p: string) => void }> = ({ appointments, loading, patientId, navigate }) => {
  const today = todayISO();
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<string | null>(today);
  const [dateTo, setDateTo] = useState<string | null>(null);

  if (loading) return <TabLoader />;

  // Build comanda session index map
  const comandaGroups: Record<string, any[]> = {};
  for (const a of appointments) {
    if (a.comanda_id) {
      if (!comandaGroups[a.comanda_id]) comandaGroups[a.comanda_id] = [];
      comandaGroups[a.comanda_id].push(a);
    }
  }
  const comandaIndexMap: Record<string, number> = {};
  for (const [, group] of Object.entries(comandaGroups)) {
    group.sort((a: any, b: any) => new Date(a.start || a.start_time || 0).getTime() - new Date(b.start || b.start_time || 0).getTime());
    group.forEach((a: any, i: number) => { comandaIndexMap[a.id] = i + 1; });
  }

  // Apply filters
  const filtered = appointments.filter((a: any) => {
    const dt = new Date(a.start || a.start_time || a.appointment_date || '');
    if (statusFilter.length > 0 && !statusFilter.includes(a.status)) return false;
    if (dateFrom && !isNaN(dt.getTime())) {
      if (dt < new Date(dateFrom + 'T00:00:00')) return false;
    }
    if (dateTo && !isNaN(dt.getTime())) {
      if (dt > new Date(dateTo + 'T23:59:59')) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    new Date(a.start || a.start_time || a.appointment_date || 0).getTime() -
    new Date(b.start || b.start_time || b.appointment_date || 0).getTime()
  );

  const toggleStatus = (val: string) =>
    setStatusFilter((prev: string[]) => prev.includes(val) ? prev.filter((s: string) => s !== val) : [...prev, val]);

  const isViewingHistory = !dateFrom || dateFrom < today;
  const hasActiveFilters = statusFilter.length > 0 || dateTo !== null || isViewingHistory;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{sorted.length} atendimento{sorted.length !== 1 ? 's' : ''}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/agenda?patient_id=${patientId}`)} iconRight={<ExternalLink size={14} />}>
          Abrir na agenda
        </Button>
      </div>

      {/* Filtros */}
      <FilterLine>
        <FilterLineSection grow>
          <FilterLineDateRange
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            fromLabel="De"
            toLabel="Até"
          />
        </FilterLineSection>
        <FilterLineSection align="right">
          {isViewingHistory ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setDateFrom(today); setDateTo(null); setStatusFilter([]); }} iconLeft={<Calendar size={14} />}>
              Mostrar apenas próximos
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDateFrom(null)} iconLeft={<History size={14} />}>
              Ver histórico completo
            </Button>
          )}
          <FilterPopover
            activeCount={statusFilter.length}
            onApply={() => {}}
            onClear={() => setStatusFilter([])}
          >
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_CHIPS.map(key => {
                  const s = STATUS_MAP[key];
                  const on = statusFilter.includes(key);
                  return (
                    <Button
                      key={key}
                      type="button"
                      size="xs"
                      variant={on ? 'primary' : 'outline'}
                      onClick={() => toggleStatus(key)}
                    >
                      {s.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </FilterPopover>
        </FilterLineSection>
      </FilterLine>
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-500">{isViewingHistory ? 'Histórico ativo' : 'Filtros ativos'}</span>
          {statusFilter.map(key => (
            <Badge key={key} color={STATUS_MAP[key].color} size="sm">{STATUS_MAP[key].label}</Badge>
          ))}
        </div>
      )}

      {/* List */}
      {sorted.length === 0 && <EmptyState icon={Calendar} title="Nenhum atendimento encontrado" />}
      {sorted.length > 0 && (
        <ContentCard padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {sorted.map((a: any) => {
            const dt = new Date(a.start || a.start_time || a.appointment_date || '');
            const isPast = dt < new Date();
            const statusInfo = a.status ? (STATUS_MAP[a.status] || { label: a.status, color: 'default' as BadgeTone }) : null;

            const hasComanda = !!a.comanda_id;
            const sessionIdx = hasComanda ? comandaIndexMap[a.id] : null;
            const sessionTotal = hasComanda ? (a.comanda_sessions_total || null) : null;
            const sessionLabel = hasComanda && sessionIdx && sessionTotal ? `${sessionIdx}/${sessionTotal}` : null;

            const price = a.service_price != null ? Number(a.service_price)
              : (hasComanda && a.comanda_total && a.comanda_sessions_total)
                ? Number(a.comanda_total) / Number(a.comanda_sessions_total)
                : null;
            const priceLabel = price != null ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

            return (
              <div key={a.id} className="px-3 py-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-center shrink-0 ${isPast ? 'bg-slate-100' : 'bg-primary-50'}`}>
                  <span className={`text-[11px] leading-none ${isPast ? 'text-slate-500' : 'text-primary-600'}`}>
                    {isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-BR', { month: 'short' })}
                  </span>
                  <span className={`text-sm font-medium leading-none mt-0.5 ${isPast ? 'text-slate-600' : 'text-primary-700'}`}>
                    {isNaN(dt.getTime()) ? '—' : dt.getDate()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-800 truncate">{a.service_name || a.title || 'Atendimento'}</span>
                    {sessionLabel && <Badge color="purple" size="sm">{sessionLabel}</Badge>}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                    {!isNaN(dt.getTime()) && <span>{dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                    {(a.psychologist_name || a.professional_name || a.professional_name_text) && (
                      <span>· {a.psychologist_name || a.professional_name || a.professional_name_text}</span>
                    )}
                    {priceLabel && <span className="text-emerald-600 font-medium">· {priceLabel}</span>}
                  </div>
                </div>
                {statusInfo && <Badge color={statusInfo.color} size="sm">{statusInfo.label}</Badge>}
              </div>
            );
          })}
        </ContentCard>
      )}
    </div>
  );
};

// ─── Tab: Documentos ─────────────────────────────────────────────────────────
const TabDocumentos: React.FC<{ documents: any[]; loading: boolean; patientId: string; onRefresh: () => void }> = ({ documents, loading, patientId, onRefresh }) => {
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('title', file.name);
      fd.append('category', 'Paciente');
      fd.append('patient_id', patientId);
      await api.request('/uploads', { method: 'POST', body: fd });
      onRefresh();
    } catch (e) {
      console.error('Upload error:', e);
    }
    setUploading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await api.request(`/uploads/${deleteTarget.id}`, { method: 'DELETE' }); } catch {}
    setDeleting(false);
    setDeleteTarget(null);
    onRefresh();
  };

  if (loading) return <TabLoader />;

  const TypeIcon = ({ type }: { type: string }) => {
    if (type === 'pdf') return <FileText size={18} />;
    if (type === 'image') return <ImageIcon size={18} />;
    return <Paperclip size={18} />;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{documents.length} documento(s)</span>
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          loading={uploading}
          iconLeft={<FileUp size={14} />}
        >
          Anexar
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
      </div>
      {documents.length === 0 && <EmptyState icon={FolderOpen} title="Nenhum documento anexado" />}
      {documents.length > 0 && (
        <ContentCard padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {documents.map((doc: any) => (
            <div key={doc.id} className="px-3 py-3 flex items-center gap-3">
              <div className="text-slate-400 shrink-0"><TypeIcon type={doc.type} /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-800 truncate">{doc.title || doc.file_name}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {doc.category} · {doc.size}
                  {doc.date && ` · ${new Date(doc.date).toLocaleDateString('pt-BR')}`}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {doc.file_url && (
                  <a
                    href={getStaticUrl(doc.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-primary-50 hover:text-primary-600 transition-colors"
                    title="Baixar"
                    aria-label="Baixar documento"
                  >
                    <Download size={14} />
                  </a>
                )}
                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget({ id: String(doc.id), name: doc.title || doc.file_name || 'documento' })}
                  title="Excluir"
                  aria-label="Excluir documento"
                  className="hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            </div>
          ))}
        </ContentCard>
      )}

      {/* Modal de confirmação de exclusão */}
      <UIConfirmModal
        isOpen={!!deleteTarget}
        title="Excluir documento"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
};

// ─── Tab: Prontuário ──────────────────────────────────────────────────────────
const SESSION_MOOD_MAP: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😞', label: 'Muito abalado', color: '#ef4444' },
  2: { emoji: '😕', label: 'Abalado', color: '#f97316' },
  3: { emoji: '😐', label: 'Neutro', color: '#eab308' },
  4: { emoji: '🙂', label: 'Bem', color: '#22c55e' },
  5: { emoji: '😄', label: 'Muito bem', color: '#0ea5e9' },
};

const MoodHistoryPanel: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [logs, setLogs] = useState<any[] | null>(null);

  useEffect(() => {
    api.get<any[]>(`/patients/${patientId}/mood-logs`)
      .then((rows) => setLogs(Array.isArray(rows) ? rows : []))
      .catch(() => setLogs([]));
  }, [patientId]);

  if (logs === null) return null;
  if (logs.length === 0) return null;

  const chartData = [...logs]
    .reverse()
    .map((l) => ({
      date: formatDate(l.recorded_at),
      score: l.mood_score,
      fullDate: l.recorded_at,
    }));

  const latest = logs[0];
  const latestInfo = SESSION_MOOD_MAP[latest.mood_score];

  return (
    <PanelCard title="Humor observado pelo profissional" icon={Smile}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{latestInfo?.emoji}</span>
        <div>
          <p className="text-sm font-medium" style={{ color: latestInfo?.color }}>{latestInfo?.label}</p>
          <p className="text-[11px] text-slate-500">Última sessão · {formatDate(latest.recorded_at)}</p>
        </div>
      </div>
      <div className="h-36 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={24} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
              formatter={(value: number) => [SESSION_MOOD_MAP[value]?.label || value, 'Humor']}
            />
            <Line type="monotone" dataKey="score" stroke="var(--c-600)" strokeWidth={2} dot={{ r: 3, fill: 'var(--c-600)' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
};

const TabProntuario: React.FC<{ records: any[]; loading: boolean; patientId: string; navigate: (p: string) => void }> = ({ records, loading, patientId, navigate }) => {
  if (loading) return <TabLoader />;
  return (
    <div className="space-y-3">
      <MoodHistoryPanel patientId={patientId} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{records.length} registro(s)</span>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/prontuario?patient_id=${patientId}`)} iconRight={<ExternalLink size={14} />}>
          Abrir prontuário
        </Button>
      </div>
      {records.length === 0 && <EmptyState icon={FileText} title="Nenhum registro de prontuário" />}
      {records.length > 0 && (
        <ContentCard padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {records.map((rec: any) => (
            <div key={rec.id} className="px-3 py-3">
              <div className="flex items-center gap-2 justify-between">
                <div className="text-xs font-medium text-slate-800">{rec.title || rec.type || 'Registro'}</div>
                <div className="text-[11px] text-slate-500">{formatDate(rec.date || rec.created_at)}</div>
              </div>
              {rec.preview && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{rec.preview}</p>}
            </div>
          ))}
        </ContentCard>
      )}
    </div>
  );
};

// ─── Tab: Formulários ─────────────────────────────────────────────────────────
const TabFormularios: React.FC<{ forms: any[]; loading: boolean; patientId: string; navigate: (p: string) => void }> = ({ forms, loading, patientId, navigate }) => {
  if (loading) return <TabLoader />;

  const goToForm = (f: any) => {
    const formId = f.form_id || f.formId;
    if (formId) {
      navigate(`/formularios/${formId}/respostas?patient_id=${patientId}`);
    } else {
      navigate(`/formularios/respostas?patient_id=${patientId}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{forms.length} resposta(s)</span>
        <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/formularios/lista?patient_id=${patientId}`)} iconRight={<ExternalLink size={14} />}>
          Ver todos
        </Button>
      </div>
      {forms.length === 0 && <EmptyState icon={ClipboardList} title="Nenhuma resposta de formulário" />}
      {forms.length > 0 && (
        <ContentCard padding="none" className="divide-y divide-slate-100 overflow-hidden">
          {forms.map((f: any) => (
            <button
              type="button"
              key={f.id}
              onClick={() => goToForm(f)}
              className="w-full text-left px-3 py-3 hover:bg-primary-50/40 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ClipboardList size={14} className="text-primary-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-800 truncate group-hover:text-primary-700 transition-colors">
                    {f.form_title || f.title || 'Formulário'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.score != null && <Badge color="primary" size="sm">{f.score} pts</Badge>}
                  <span className="text-[11px] text-slate-500">{formatDate(f.submitted_at || f.created_at)}</span>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            </button>
          ))}
        </ContentCard>
      )}
    </div>
  );
};

// ─── Tab: Ferramentas ─────────────────────────────────────────────────────────
const TabFerramentas: React.FC<{ patientId: string; navigate: (p: string) => void }> = ({ patientId, navigate }) => (
  <ContentCard>
    <EmptyState
      icon={Boxes}
      title="Ferramentas clínicas"
      description="Acesse os instrumentos clínicos do paciente na caixa de ferramentas."
      action={
        <Button type="button" size="sm" onClick={() => navigate(`/caixa-ferramentas?patient_id=${patientId}`)} iconRight={<ExternalLink size={14} />}>
          Abrir ferramentas
        </Button>
      }
    />
  </ContentCard>
);

// ─── Tab: Contrato ────────────────────────────────────────────────────────────
const CONTRACT_STATUS_LABEL: Record<string, { label: string; color: BadgeTone }> = {
  sent:      { label: 'Enviado',     color: 'default' },
  viewed:    { label: 'Visualizado', color: 'warning' },
  signed:    { label: 'Assinado',    color: 'success' },
  expired:   { label: 'Expirado',    color: 'danger' },
  cancelled: { label: 'Cancelado',   color: 'default' },
};

const SCALE_LABEL: Record<string, string> = { 'bdi-ii': 'BDI-II (Depressão)', 'bai': 'BAI (Ansiedade)' };

const TabContrato: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { pushToast } = useToast();
  const [contract, setContract] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractType, setContractType] = useState<'online' | 'presencial'>('online');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        api.get<any>(`/contract-send/${patientId}`),
        api.get<any[]>(`/contract-send/${patientId}/scale-schedules`),
      ]);
      setContract(c);
      setSchedules(s || []);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const sendContract = async () => {
    setSending(true);
    try {
      await api.post('/contract-send', { patient_id: Number(patientId), contract_type: contractType });
      pushToast('success', 'Contrato enviado ao paciente');
      await load();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao enviar contrato');
    } finally { setSending(false); }
  };

  const resendContract = async () => {
    if (!contract?.id) return;
    setSending(true);
    try {
      await api.post(`/contract-send/${contract.id}/resend`, {});
      pushToast('success', 'Novo link de contrato gerado');
      await load();
    } catch (e: any) {
      pushToast('error', e?.response?.data?.error || 'Erro ao reenviar contrato');
    } finally { setSending(false); }
  };

  const toggleSchedule = async (scheduleId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await api.patch(`/contract-send/scale-schedules/${scheduleId}`, { status: nextStatus });
      pushToast('success', nextStatus === 'active' ? 'Agendamento retomado' : 'Agendamento pausado');
      await load();
    } catch {
      pushToast('error', 'Erro ao atualizar agendamento');
    }
  };

  if (loading) return <TabLoader />;

  const statusInfo = contract ? CONTRACT_STATUS_LABEL[contract.status] : null;

  return (
    <div className="space-y-3">
      <PanelCard
        title="Contrato de prestação de serviços"
        icon={FileSignature}
        action={statusInfo ? <Badge color={statusInfo.color} size="sm">{statusInfo.label}</Badge> : undefined}
      >
        {!contract && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Nenhum contrato enviado ainda para este paciente.</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select
                label="Tipo de atendimento"
                wrapperClassName="flex-1"
                value={contractType}
                onChange={e => setContractType(e.target.value as 'online' | 'presencial')}
              >
                <option value="online">Atendimento Online</option>
                <option value="presencial">Atendimento Presencial</option>
              </Select>
              <Button
                type="button"
                onClick={sendContract}
                disabled={sending}
                loading={sending}
                iconLeft={<Send size={14} />}
              >
                Enviar
              </Button>
            </div>
          </div>
        )}

        {contract && contract.status !== 'signed' && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Contrato ({contract.contract_type === 'online' ? 'Online' : 'Presencial'}) aguardando assinatura do paciente.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resendContract}
              disabled={sending}
              loading={sending}
              iconLeft={<Send size={14} />}
            >
              Reenviar link
            </Button>
          </div>
        )}

        {contract && contract.status === 'signed' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Contrato ({contract.contract_type === 'online' ? 'Online' : 'Presencial'}) assinado
              {contract.signature?.signed_at ? ` em ${formatDate(contract.signature.signed_at)}` : ''}.
            </p>
            {contract.signature?.signature_image && (
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 w-fit">
                <img src={contract.signature.signature_image} alt="Assinatura" className="h-16 object-contain" />
                <p className="text-[11px] text-slate-500 mt-1">{contract.signature.signer_name} — CPF {contract.signature.signer_cpf}</p>
              </div>
            )}
          </div>
        )}
      </PanelCard>

      {schedules.length > 0 && (
        <PanelCard title="Acompanhamento periódico (a cada 3 meses)" icon={ClipboardList} contentClassName="space-y-2">
          {schedules.map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium text-slate-700">{SCALE_LABEL[s.scale_type] || s.scale_type}</p>
                <p className="text-[11px] text-slate-500">
                  {s.status === 'active' ? `Próximo envio: ${formatDate(s.next_due_at)}` : 'Pausado'}
                  {s.last_sent_at ? ` · Último envio: ${formatDate(s.last_sent_at)}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => toggleSchedule(s.id, s.status)}
                iconLeft={s.status === 'active' ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
              >
                {s.status === 'active' ? 'Pausar' : 'Retomar'}
              </Button>
            </div>
          ))}
        </PanelCard>
      )}
    </div>
  );
};

// ─── Tab: Tarefas ─────────────────────────────────────────────────────────────
const TASK_PRIOS = [
  { id: 'alta',  label: 'Alta',  color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  { id: 'media', label: 'Média', color: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  { id: 'baixa', label: 'Baixa', color: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-200' },
];
const TASK_CATS = [
  { id: 'geral',   label: 'Geral' },
  { id: 'terapia', label: 'Terapia' },
  { id: 'saude',   label: 'Saúde' },
  { id: 'fisico',  label: 'Físico' },
  { id: 'social',  label: 'Social' },
  { id: 'lazer',   label: 'Lazer' },
  { id: 'escrita', label: 'Escrita' },
];

const TabTarefas: React.FC<{ patientId: string }> = ({ patientId }) => {
  const { pushToast } = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'geral', priority: 'media', due_date: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<any>('/patient-portal/admin/tasks', { patient_id: patientId });
      setTasks(data?.tasks || []);
    } catch { setTasks([]); }
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (saving) return;
    if (!form.title.trim()) { pushToast('error', 'Título é obrigatório.'); return; }
    setSaving(true);
    try {
      await api.post('/patient-portal/admin/tasks', {
        patient_id: parseInt(patientId),
        ...form,
        due_date: form.due_date || null,
      });
      pushToast('success', 'Tarefa criada! O paciente verá no app.');
      setForm({ title: '', description: '', category: 'geral', priority: 'media', due_date: '' });
      setShowForm(false);
      await load();
    } catch { pushToast('error', 'Erro ao criar tarefa.'); }
    setSaving(false);
  };

  const del = async (id: number) => {
    try {
      await api.delete(`/patient-portal/admin/tasks/${id}`);
      setTasks(t => t.filter(x => x.id !== id));
      pushToast('success', 'Tarefa removida.');
    } catch { pushToast('error', 'Erro ao remover.'); }
  };

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'concluida' ? 'pendente' : 'concluida';
    try {
      await api.put(`/patient-portal/admin/tasks/${task.id}`, { status: newStatus });
      setTasks(t => t.map(x => x.id === task.id ? { ...x, status: newStatus, completed_at: newStatus === 'concluida' ? new Date().toISOString() : null } : x));
    } catch { pushToast('error', 'Erro.'); }
  };

  const pending = tasks.filter(t => t.status !== 'concluida');
  const done    = tasks.filter(t => t.status === 'concluida');

  return (
    <div className="space-y-3">
      <PanelCard
        title="Tarefas do paciente"
        icon={CheckSquare}
        action={
          <Button type="button" size="sm" onClick={() => setShowForm(v => !v)} iconLeft={<Plus size={14} />}>
            Nova tarefa
          </Button>
        }
        contentClassName="space-y-3"
      >
        <p className="text-xs text-slate-500">
          Tarefas criadas aqui aparecem automaticamente no <strong>app do paciente</strong> em tempo real.
        </p>

        {/* Formulário inline */}
        {showForm && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
            <p className="text-xs font-medium text-slate-700">Nova tarefa</p>

            <Input
              label="Título *"
              placeholder="Ex: Fazer anotações diárias no diário"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />

            <Textarea
              label="Descrição (opcional)"
              rows={2}
              placeholder="Detalhes ou instruções para o paciente..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />

            <FormRow cols={3}>
              <Select
                label="Categoria"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                options={TASK_CATS.map(c => ({ value: c.id, label: c.label }))}
              />
              <Select
                label="Prioridade"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                options={TASK_PRIOS.map(p => ({ value: p.id, label: p.label }))}
              />
              <Input
                label="Prazo"
                type="date"
                value={form.due_date}
                onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </FormRow>

            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving} loading={saving} iconLeft={<Check size={14} />}>
                {saving ? 'Salvando...' : 'Criar tarefa'}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <TabLoader />
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="Nenhuma tarefa criada ainda"
            description="Crie tarefas para esse paciente. Elas aparecem no app móvel do paciente."
          />
        ) : (
          <div className="space-y-3">
            {/* Pendentes */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <AlarmClock size={14} /> A fazer · {pending.length}
                </p>
                {pending.map(task => {
                  const prio = TASK_PRIOS.find(p => p.id === task.priority) || TASK_PRIOS[1];
                  return (
                    <div key={task.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-lg p-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(task)}
                        aria-label="Marcar tarefa como concluída"
                        className="mt-0.5 w-5 h-5 rounded-md border-2 border-slate-300 hover:border-primary-500 flex items-center justify-center shrink-0 transition-colors"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800">{task.title}</p>
                        {task.description && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{task.description}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${prio.color} ${prio.bg} ${prio.border}`}>
                            <Flag size={10} />{prio.label}
                          </span>
                          {task.category && task.category !== 'geral' && (
                            <Badge color="primary" size="sm"><Tag size={10} className="mr-1" />{TASK_CATS.find(c => c.id === task.category)?.label}</Badge>
                          )}
                          {task.due_date && (
                            <span className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Clock size={10} />{new Date(task.due_date.slice(0,10) + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {task.created_by_name && (
                            <span className="text-[11px] text-slate-400 ml-auto">por {task.created_by_name}</span>
                          )}
                        </div>
                      </div>
                      <IconButton type="button" variant="ghost" size="xs" onClick={() => del(task.id)} aria-label="Excluir tarefa" title="Excluir" className="hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Concluídas */}
            {done.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                  <Check size={14} /> Concluídas pelo paciente · {done.length}
                </p>
                {done.map(task => (
                  <div key={task.id} className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 opacity-70">
                    <div className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500 flex items-center justify-center shrink-0">
                      <Check size={12} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-500 line-through">{task.title}</p>
                      {task.completed_at && (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Concluída em {new Date(task.completed_at).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>
                    <IconButton type="button" variant="ghost" size="xs" onClick={() => del(task.id)} aria-label="Excluir tarefa" title="Excluir" className="hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PanelCard>
    </div>
  );
};

// ─── Tab Portal (humor, diário, atividades) ──────────────────────────────────
const MOOD_MAP: Record<number, { emoji: string; label: string; color: string }> = {
  5: { emoji: '😄', label: 'Ótimo',     color: '#10b981' },
  4: { emoji: '😊', label: 'Bem',        color: '#3b82f6' },
  3: { emoji: '😐', label: 'Neutro',     color: '#f59e0b' },
  2: { emoji: '😕', label: 'Mal',        color: '#f97316' },
  1: { emoji: '😞', label: 'Muito mal',  color: '#ef4444' },
};

const ACT_EMOJI: Record<string, string> = {
  exercicio: '🏃', meditacao: '🧘', sono: '😴', alimentacao: '🥗',
  social: '👥', terapia: '🧠', criativo: '🎨', leitura: '📚',
  respiracao: '🌬️', gratidao: '🙏', saude: '💊', lazer: '🎮', geral: '✨',
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const PORTAL_TABS = [
  { id: 'humor',      label: 'Humor',      icon: Smile },
  { id: 'diario',     label: 'Diário',     icon: BookOpen },
  { id: 'atividades', label: 'Atividades', icon: Dumbbell },
] as const;

const TabPortal: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [sub, setSub]       = useState<typeof PORTAL_TABS[number]['id']>('humor');
  const [mood, setMood]     = useState<any[]>([]);
  const [diary, setDiary]   = useState<any[]>([]);
  const [acts, setActs]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [m, d, a] = await Promise.all([
          api.get<any[]>(`/patients/${patientId}/wellbeing/mood`),
          api.get<any[]>(`/patients/${patientId}/wellbeing/diary`),
          api.get<any[]>(`/patients/${patientId}/wellbeing/activities`),
        ]);
        setMood(Array.isArray(m) ? m : []);
        setDiary(Array.isArray(d) ? d : []);
        setActs(Array.isArray(a) ? a : []);
      } catch {}
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) return <TabLoader />;

  // Últimos 7 dias de humor para mini-gráfico
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const entry = mood.find(m => m.date === dateStr);
    return { date: dateStr, value: entry?.value ?? null, label: entry?.label ?? null };
  });

  return (
    <div className="space-y-3">
      {/* Sub-abas */}
      <Tabs<typeof PORTAL_TABS[number]['id']> items={PORTAL_TABS} value={sub} onChange={setSub} label="Portal do paciente" />

      {/* ── HUMOR ── */}
      {sub === 'humor' && (
        <PanelCard title="Histórico de humor" icon={Smile}>
          {mood.length === 0 ? (
            <EmptyState icon={Smile} title="Nenhum registro de humor ainda" />
          ) : (
            <>
              {/* Mini gráfico 7 dias */}
              <div className="flex items-end gap-1.5 mb-4">
                {last7.map((d, i) => {
                  const info = d.value ? MOOD_MAP[d.value] : null;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-md transition-all"
                        style={{
                          height: d.value ? `${d.value * 10 + 10}px` : '6px',
                          backgroundColor: info?.color ?? '#e2e8f0',
                          minHeight: '6px',
                        }} />
                      <span className="text-[11px] text-slate-500">
                        {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'narrow' })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                {mood.slice(0, 30).map(m => {
                  const info = MOOD_MAP[m.value];
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-2xl">{info?.emoji}</span>
                      <div className="flex-1">
                        <span className="text-xs font-medium" style={{ color: info?.color }}>{info?.label}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(m.date || m.created_at)}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(v => (
                          <div key={v} className="w-2 h-2 rounded-full" style={{ backgroundColor: v <= m.value ? info?.color : '#e2e8f0' }} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </PanelCard>
      )}

      {/* ── DIÁRIO ── */}
      {sub === 'diario' && (
        <PanelCard title={`Diário — ${diary.length} entrada(s)`} icon={BookOpen}>
          {diary.length === 0 ? (
            <EmptyState icon={BookOpen} title="Nenhuma entrada no diário ainda" />
          ) : (
            <div className="space-y-2">
              {diary.map(e => {
                const moodInfo = e.mood != null ? MOOD_MAP[e.mood] : null;
                const isOpen = expanded === e.id;
                const tags = e.tags ? (typeof e.tags === 'string' ? JSON.parse(e.tags) : e.tags) : [];
                return (
                  <div key={e.id} className="rounded-lg border border-slate-200 bg-slate-50/50 overflow-hidden">
                    <button type="button" onClick={() => setExpanded(isOpen ? null : e.id)}
                      className="w-full flex items-start gap-3 p-3 text-left hover:bg-slate-100 transition-colors">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg"
                        style={{ backgroundColor: moodInfo?.color ? `${moodInfo.color}22` : '#f1f5f9' }}>
                        {moodInfo?.emoji ?? '📖'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{e.title || 'Entrada sem título'}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(e.created_at)}{moodInfo ? ` · ${moodInfo.label}` : ''}</p>
                        {!isOpen && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{e.content}</p>}
                      </div>
                      <ChevronRight size={14} className={`text-slate-400 shrink-0 mt-1 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-3 pb-3 space-y-2 border-t border-slate-100 pt-3">
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{e.content}</p>
                        {e.highlight && <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2"><span className="font-medium text-amber-700">Ponto alto:</span> {e.highlight}</div>}
                        {e.gratitude && <div className="text-xs bg-emerald-50 border border-emerald-100 rounded-lg p-2"><span className="font-medium text-emerald-700">Gratidão:</span> {e.gratitude}</div>}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {tags.map((t: string) => <Badge key={t} color="primary" size="sm">{t}</Badge>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      )}

      {/* ── ATIVIDADES ── */}
      {sub === 'atividades' && (
        <PanelCard title={`Atividades — ${acts.length} registro(s)`} icon={Dumbbell}>
          {acts.length === 0 ? (
            <EmptyState icon={Dumbbell} title="Nenhuma atividade registrada ainda" />
          ) : (
            <div className="space-y-2">
              {acts.map(a => (
                <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg border
                  ${a.done ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <span className="text-xl mt-0.5">{ACT_EMOJI[a.category] ?? '✨'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-medium ${a.done ? 'text-emerald-700' : 'text-slate-700'}`}>{a.title}</p>
                      {a.done && <Check size={12} className="text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 capitalize">{a.category}{a.duration ? ` · ${a.duration}` : ''}</p>
                    {a.description && <p className="text-xs text-slate-500 mt-1">{a.description}</p>}
                  </div>
                  <p className="text-[11px] text-slate-500 shrink-0">{fmtDate(a.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      )}
    </div>
  );
};

// ─── Tab Mensagens ────────────────────────────────────────────────────────────
const POLL_MS = 8000;

function fmtMsgTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
         d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const TabMensagens: React.FC<{ patientId: string }> = ({ patientId }) => {
  const [msgs, setMsgs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText]       = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    try {
      const data = await api.get<any[]>(`/messages/portal/${patientId}`);
      setMsgs(Array.isArray(data) ? data : []);
    } catch {}
    if (!silent) setLoading(false);
  }, [patientId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs]);

  const send = async () => {
    const msg = text.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);
    try {
      await api.post(`/messages/portal/${patientId}`, { content: msg });
      await load(true);
    } catch {
      setText(msg);
    }
    setSending(false);
  };

  if (loading) return <TabLoader />;

  return (
    <PanelCard
      title="Chat com paciente"
      description="Mensagens trocadas pelo portal do paciente"
      icon={MessageCircle}
      className="flex flex-col h-[520px]"
      contentClassName="p-0 flex flex-1 min-h-0 flex-col"
    >
      {/* Lista de mensagens */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/60">
        {msgs.length === 0 ? (
          <EmptyState icon={MessageCircle} title="Nenhuma mensagem ainda" description="O paciente pode enviar mensagens pelo app portal." />
        ) : msgs.map((m) => {
          const isPro = m.sender_type === 'professional';
          return (
            <div key={m.id} className={`flex gap-2 ${isPro ? 'justify-end' : 'justify-start'}`}>
              {!isPro && (
                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-primary-600" />
                </div>
              )}
              <div className={`max-w-[85%] sm:max-w-[72%] rounded-lg px-3 py-2 ${
                isPro
                  ? 'bg-primary-600 text-white rounded-br-sm'
                  : 'bg-white text-slate-700 rounded-bl-sm border border-slate-200'
              }`}>
                <p className="text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>
                <p className={`text-[11px] mt-1 ${isPro ? 'text-primary-100 text-right' : 'text-slate-500'}`}>
                  {fmtMsgTime(m.created_at)}
                  {isPro && m.read_at && <Check size={10} className="inline ml-1" />}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-3 border-t border-slate-100 bg-white">
        <Textarea
          wrapperClassName="flex-1"
          className="resize-none max-h-28 min-h-[34px]"
          rows={1}
          placeholder="Escreva uma resposta..."
          aria-label="Mensagem para o paciente"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={sending}
        />
        <IconButton
          type="button"
          variant="primary"
          size="md"
          onClick={send}
          disabled={!text.trim() || sending}
          aria-label="Enviar mensagem"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </IconButton>
      </div>
    </PanelCard>
  );
};

// ─── Shared components ────────────────────────────────────────────────────────
const TabLoader: React.FC = () => (
  <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
    <Loader2 size={18} className="animate-spin" />Carregando…
  </div>
);
