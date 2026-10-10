import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getToken } from '../services/tokenStorage';
import {
  Users, Plus, Phone, Mail, Calendar, FileText,
  Edit2, Trash2, X, AlertCircle, Eye, ClipboardList,
  FolderOpen, BrainCircuit, Boxes, StickyNote, Loader2, ChevronRight,
  FileUp, FileDown, Download, MapPin, Shield, User,
  Activity, CheckSquare, Square, History, ChevronDown
} from 'lucide-react';
import { api, API_BASE_URL, getStaticUrl } from '../services/api';
import { Patient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { PatientHistoryDrawer } from '../components/Patient/PatientHistoryDrawer';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { useRealtimeSync } from '../hooks/useRealtimeSync';
import { GridTable, Column } from '../components/UI/GridTable';
import {
  Alert,
  Badge,
  Button,
  ContentCard,
  DetailField,
  Tabs,
  IconButton,
  ConfirmModal,
  EmptyState,
  FilterLine,
  FilterLineItem,
  FilterLineSearch,
  FilterLineSection,
  FilterLineSegmented,
  FilterLineViewToggle,
  Modal,
  ModalFooter,
  PageWrapper,
  PanelCard,
  SectionTitle,
  StatCard,
  StatGrid,
  Pagination,
} from '../components/UI';

interface PatientSummary {
  appointmentsCount: number | null;
  recordsCount: number | null;
  neuroCount: number | null;
  formsCount: number | null;
  documentsCount: number | null;
  toolsCount: number | null;
  notesCount: number | null;
  upcomingAppointments: { id: string; label: string; time: string }[];
}

const SUMMARY_TABS = [
  { id: 'resumo', label: 'Resumo', icon: User },
  { id: 'atividade', label: 'Atividade', icon: Activity },
  { id: 'cadastro', label: 'Cadastro', icon: FileText },
] as const;

const getFlag = (code?: string) => {
  const custom: Record<string, string> = {
    'BR': '🇧🇷', 'PT': '🇵🇹', 'US': '🇺🇸', 'CA': '🇨🇦', 'AR': '🇦🇷', 'CL': '🇨🇱', 'CO': '🇨🇴',
    'MX': '🇲🇽', 'UY': '🇺🇾', 'PY': '🇵🇾', 'PE': '🇵🇪', 'BO': '🇧🇴', 'GB': '🇬🇧', 'DE': '🇩🇪',
    'ES': '🇪🇸', 'FR': '🇫🇷', 'IT': '🇮🇹', 'CH': '🇨🇭', 'NL': '🇳🇱', 'BE': '🇧🇪', 'IE': '🇮🇪',
    'IL': '🇮🇱', 'AE': '🇦🇪', 'AU': '🇦🇺', 'JP': '🇯🇵', 'CN': '🇨🇳'
  };
  return code ? (custom[code.toUpperCase()] || '🌐') : null;
};

export const Patients: React.FC = () => {
  const { t } = useLanguage();
  const { user, isAdmin, hasPermission } = useAuth();
  const { pushToast } = useToast();
  const location = useLocation();
  const { preferences, updatePreference } = useUserPreferences();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ativo' | 'inativo'>(preferences.patients.statusFilter);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [summaryTab, setSummaryTab] = useState<typeof SUMMARY_TABS[number]['id']>('resumo');
  const importInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>(preferences.patients.viewMode);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [historyPatient, setHistoryPatient] = useState<Patient | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>({});
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSelectedIds, setImportSelectedIds] = useState<Set<string>>(new Set());


  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/patients/${id}`)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await fetchPatients();
    } catch (err) {
      pushToast('error', 'Erro ao excluir pacientes.');
    } finally {
      setBulkDeleting(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    api.get<any>('/profile/me').then(d => { if (d) setProfileData(d); }).catch(() => {});
  }, []);

  // Escuta Aurora criar pacientes e atualiza a tela sem perder a conversa
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.type === 'patients') fetchPatients();
    };
    window.addEventListener('aurora:data-updated', handler);
    return () => window.removeEventListener('aurora:data-updated', handler);
  }, []);

  // Sincronização em tempo real: recarrega quando outro dispositivo/aba
  // cria ou edita um paciente na mesma clínica.
  useRealtimeSync('patient.created', () => fetchPatients());
  useRealtimeSync('patient.updated', () => fetchPatients());

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const data = await api.get<any[]>('/patients');
      const mapped = (data || []).map(p => ({
        ...p,
        full_name: p.name || p.full_name || '',
        whatsapp: p.phone || p.whatsapp || '',
        cpf_cnpj: p.cpf || p.cpf_cnpj || '',
        birth_date: p.birth_date || p.birthDate || null,
        status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : p.status,
      })) as Patient[];
      setPatients(mapped);
    } catch (error) {
      console.error('Erro ao buscar pacientes', error);
    } finally {
      setIsLoading(false);
    }
  };

  const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const term = norm(searchTerm);
      const matchesSearch = norm(p.full_name).includes(term) ||
        (p.cpf_cnpj && p.cpf_cnpj.includes(searchTerm)) ||
        (p.whatsapp && p.whatsapp.includes(searchTerm)) ||
        norm(p.email).includes(term);
      const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [patients, searchTerm, statusFilter]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, itemsPerPage]);

  const currentPatients = useMemo(() => {
    return filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPatients, currentPage, itemsPerPage]);

  const toggleSelectAll = () => {
    const allVisibleSelected = currentPatients.every(p => selectedIds.has(String(p.id)));
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentPatients.forEach(p => next.delete(String(p.id)));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentPatients.forEach(p => next.add(String(p.id)));
        return next;
      });
    }
  };

  const summaryStats = useMemo(() => ({
    total: patients.length,
    active: patients.filter(p => p.status === 'ativo').length,
    inactive: patients.filter(p => p.status === 'inativo').length,
    withPlan: patients.filter(p => p.health_plan).length,
  }), [patients]);

  const uploadPatientDocuments = async (patientId: string | number, files: { file: File; label: string }[]) => {
    if (!files.length) return;
    for (const doc of files) {
      const formData = new FormData();
      formData.append('file', doc.file);
      formData.append('title', doc.label.trim() || doc.file.name);
      formData.append('category', 'Paciente');
      formData.append('patient_id', String(patientId));

      await api.request('/uploads', {
        method: 'POST',
        body: formData
      });
    }
  };

  const uploadPatientPhoto = async (patientId: string | number, photo: File) => {
    const formData = new FormData();
    formData.append('photo', photo);
    await api.request(`/patients/${patientId}/photo`, {
      method: 'POST',
      body: formData
    });
  };

  const handleSavePatient = async (data: Partial<Patient>, files: { file: File; label: string }[], photoFile?: File | null) => {
    try {
      const COUNTRY_DDI: Record<string, string> = {
        BR:'55',PT:'351',US:'1',CA:'1',AR:'54',CL:'56',CO:'57',MX:'52',
        UY:'598',PY:'595',PE:'51',BO:'591',GB:'44',DE:'49',ES:'34',FR:'33',
        IT:'39',CH:'41',NL:'31',BE:'32',IE:'353',IL:'972',AE:'971',AU:'61',
        JP:'81',CN:'86',
      };
      const prefixPhone = (raw: string | null | undefined, country: string | undefined) => {
        if (!raw) return null;
        const c = country || 'BR';
        if (c === 'BR' || c === 'OTHER' || !COUNTRY_DDI[c]) return raw;
        const digits = raw.replace(/\D/g, '');
        if (!digits) return null;
        return `+${COUNTRY_DDI[c]}${digits}`;
      };
      const phoneCountry = data.phone_country || 'BR';
      const phone2Country = data.phone2_country || 'BR';
      const payload = {
        name: data.full_name,
        email: data.email || null,
        phone: prefixPhone(data.whatsapp || data.phone || null, phoneCountry),
        whatsapp: prefixPhone(data.whatsapp || data.phone || null, phoneCountry),
        phone2: prefixPhone(data.phone2 || null, phone2Country),
        phone_country: phoneCountry,
        phone2_country: phone2Country,
        country: (data as any).country || 'BR',
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
        spouse_phone: data.spouse_phone || null,
        family_contact: data.family_contact || null,
        emergency_contact: data.emergency_contact || null,
        emergency_contacts: data.emergency_contacts ? JSON.stringify(data.emergency_contacts) : null,
        address: data.street
          ? `${data.street}${data.house_number ? ', ' + data.house_number : ''}${data.neighborhood ? ' - ' + data.neighborhood : ''}`
          : null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.address_zip || null,
        // Endereço estruturado (separado do texto livre acima) -- usado para enviar
        // o endereço do paciente na NFS-e, que exige os campos quebrados assim.
        address_cep: data.address_zip || null,
        address_logradouro: data.street || null,
        address_numero: data.house_number || null,
        address_bairro: data.neighborhood || null,
        address_uf: data.state || null,
        address_municipio_ibge: data.municipio_ibge || null,
        notes: data.notes || null,
        status: data.status || 'ativo',
        health_plan: data.convenio ? data.convenio_name || 'Sim' : null,
        responsible_professional_id: data.psychologist_id || null,
        diagnosis: (data as any).diagnosis || null,
        is_payer: data.is_payer !== undefined ? data.is_payer : true,
        payer_name: data.payer_name || null,
        payer_cpf: data.payer_cpf || null,
        payer_phone: data.payer_phone || null,
      };

      const savedPatient = data.id
        ? await api.put<any>(`/patients/${data.id}`, payload)
        : await api.post<any>('/patients', payload);

      const patientId = savedPatient?.id || data.id;
      if (patientId && files.length) {
        await uploadPatientDocuments(patientId, files);
      }
      if (patientId && photoFile) {
        await uploadPatientPhoto(patientId, photoFile);
      }

      await fetchPatients();
      pushToast('success', data.id ? 'Paciente atualizado com sucesso!' : 'Paciente criado com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar paciente:', err);
      const msg = err?.message || '';
      if (msg.startsWith('CPF já cadastrado')) {
        pushToast('warning', msg);
      } else {
        pushToast('error', 'Erro ao salvar paciente. Verifique os dados e tente novamente.');
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsProcessing(true);
    try {
      await api.delete(`/patients/${deleteId}`);
      await fetchPatients();
      if (selectedPatient && String(selectedPatient.id) === deleteId) setSelectedPatient(null);
    } catch (err) {
      console.error('Erro ao excluir paciente:', err);
      pushToast('error', 'Erro ao excluir paciente.');
    } finally {
      setIsProcessing(false);
      setDeleteId(null);
    }
  };

  const handleQuickStatusChange = async (patient: Patient) => {
    try {
      const newStatus = patient.status === 'ativo' ? 'inactive' : 'active';
      const p = patients.find(p => p.id === patient.id);
      if (!p) return;

      const payload = {
        ...p,
        status: newStatus,
        birth_date: p.birth_date || null,
        email: p.email || null,
        phone: p.phone || null,
        cpf: p.cpf || null,
        rg: p.rg || null
      };

      await api.put(`/patients/${patient.id}`, payload);
      await fetchPatients();
      pushToast('success', newStatus === 'active' ? 'Paciente ativado com sucesso!' : 'Paciente inativado com sucesso!');
    } catch (err: any) {
      console.error(err);
      pushToast('error', 'Erro ao mudar status:' + (err.message || 'Erro interno'));
    }
  };

  const safeGet = async <T,>(endpoint: string, params?: Record<string, string>): Promise<T | null> => {
    try { return await api.get<T>(endpoint, params); } catch { return null; }
  };

  const openPatientSummary = async (patient: Patient) => {
    setSelectedPatient(patient);
    setSummaryTab('resumo');
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    const patientId = String(patient.id);
    const now = new Date();
    const [appointmentsRaw, recordsRaw, neuroRaw, formsRaw, documentsRaw, toolsRaw, notesRaw] = await Promise.all([
      safeGet<any[]>('/appointments', { patient_id: patientId }),
      safeGet<any[]>('/medical-records', { patient_id: patientId }),
      safeGet<any[]>('/pei', { patient_id: patientId }),
      safeGet<any[]>('/forms/responses', { patient_id: patientId }),
      safeGet<any[]>('/documents', { patient_id: patientId }),
      safeGet<any>('/clinical-tools/summary', { patient_id: patientId }),
      safeGet<any[]>('/notes', { patient_id: patientId }),
    ]);
    const appointmentsList = Array.isArray(appointmentsRaw) ? appointmentsRaw : [];
    const patientAppointments = appointmentsList.filter(a => {
      const pid = String(a.patient_id ?? a.patientId ?? '');
      return pid ? pid === patientId : true;
    });
    const upcomingAppointments = patientAppointments
      .map((a: any) => {
        const raw = a.appointment_date || a.start || a.date || a.scheduled_start;
        const d = raw ? new Date(raw) : null;
        if (!d || Number.isNaN(d.getTime()) || d.getTime() < now.getTime()) return null;
        return {
          id: String(a.id ?? d.getTime()),
          label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      })
      .filter(Boolean).slice(0, 4) as { id: string; label: string; time: string }[];

    const countFrom = (v: any): number | null => {
      if (Array.isArray(v)) return v.length;
      if (typeof v === 'number') return v;
      if (v && typeof v === 'object' && typeof v.count === 'number') return v.count;
      return null;
    };
    setSummary({
      appointmentsCount: countFrom(patientAppointments),
      recordsCount: countFrom(recordsRaw),
      neuroCount: countFrom(neuroRaw),
      formsCount: countFrom(formsRaw),
      documentsCount: countFrom(documentsRaw),
      toolsCount: countFrom(toolsRaw),
      notesCount: countFrom(notesRaw),
      upcomingAppointments,
    });
    if (!appointmentsRaw && !recordsRaw && !neuroRaw && !formsRaw && !documentsRaw && !toolsRaw && !notesRaw) {
      setSummaryError('Não foi possível carregar os vínculos deste paciente.');
    }
    setSummaryLoading(false);
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  };

  const calcAge = (value?: string) => {
    if (!value) return null;
    const birth = new Date(value);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
    return age;
  };

  const isActive = (p: Patient) => (p.status as string) === 'ativo' || (p.status as string) === 'active';

  const handleExportTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/export-template`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo_importacao_pacientes.xlsx';
      a.click();
    } catch (err) {
      console.error('Erro ao baixar modelo:', err);
      pushToast('error', 'Erro ao baixar modelo.');
    }
  };

  const handleExportPatients = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/export`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (!response.ok) throw new Error(`Erro no servidor: ${response.status}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pacientes_exportados.xlsx';
      a.click();
    } catch (err) {
      console.error('Erro ao exportar pacientes:', err);
      pushToast('error', 'Erro ao exportar pacientes.');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'CPF', 'Status', 'Data de Cadastro'];
    const lines = [
      headers.join(';'),
      ...filteredPatients.map(p => [
        p.full_name || '',
        p.email || '',
        p.whatsapp || p.phone || '',
        p.cpf_cnpj || '',
        p.status || '',
        p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
      ].join(';')),
    ];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pacientes.csv';
    a.click();
    URL.revokeObjectURL(url);
    pushToast('success', 'CSV exportado!');
  };

  const handleExportPDF = async () => {
    pushToast('success', 'Gerando PDF...');
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const rows = filteredPatients;
      const logoUrl = profileData?.clinic_logo_url ? getStaticUrl(profileData.clinic_logo_url) : '';
      const profName = profileData?.name || '';
      const profCrp = profileData?.crp || '';
      const companyName = profileData?.company_name || 'Consultório';
      const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      const tableRows = rows.map(p => [
        p.full_name || '-',
        p.email || '-',
        p.whatsapp || p.phone || '-',
        p.cpf_cnpj || '-',
        p.status === 'ativo' ? 'Ativo' : 'Inativo',
        p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '-',
      ]);

      const headers = ['Nome', 'Email', 'Telefone', 'CPF', 'Status', 'Cadastro'];

      const buildRowHtml = (row: string[], i: number) => {
        const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        const isAtivo = row[4] === 'Ativo';
        const statusColor = isAtivo ? '#059669' : '#64748b';
        const statusBg = isAtivo ? '#d1fae5' : '#f1f5f9';
        return `<tr style="background:${bg}">
          ${row.slice(0, 4).map(cell => `<td style="padding:6px 10px;font-size:11px;color:#374151;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${cell}</td>`).join('')}
          <td style="padding:6px 10px;text-align:center;border-bottom:1px solid #f1f5f9;">
            <span style="font-size:10px;font-weight:bold;background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:99px;">${row[4]}</span>
          </td>
          <td style="padding:6px 10px;font-size:11px;color:#374151;border-bottom:1px solid #f1f5f9;">${row[5]}</td>
        </tr>`;
      };

      const headersHtml = headers.map(h => `<th style="padding:10px 10px;font-size:11px;font-weight:700;;letter-spacing:.05em;color:#e2e8f0;text-align:left;">${h}</th>`).join('');

      const ROWS_FIRST_PAGE = 14;
      const ROWS_PER_PAGE = 18;

      const chunks: (typeof tableRows)[] = [];
      if (tableRows.length <= ROWS_FIRST_PAGE) {
        chunks.push(tableRows);
      } else {
        chunks.push(tableRows.slice(0, ROWS_FIRST_PAGE));
        for (let i = ROWS_FIRST_PAGE; i < tableRows.length; i += ROWS_PER_PAGE) {
          chunks.push(tableRows.slice(i, i + ROWS_PER_PAGE));
        }
      }

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      for (let pageIdx = 0; pageIdx < chunks.length; pageIdx++) {
        const pageRows = chunks[pageIdx];
        const isFirstPage = pageIdx === 0;
        const isLastPage = pageIdx === chunks.length - 1;

        const rowsHtml = pageRows.map((row, i) => buildRowHtml(row, i)).join('');

        const container = document.createElement('div');
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;background:#ffffff;font-family:Arial,sans-serif;';

        container.innerHTML = `
          <div style="padding:32px 40px;">
            ${isFirstPage ? `
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:16px;">
                  ${logoUrl
                    ? `<img src="${logoUrl}" style="height:56px;width:56px;object-fit:contain;border-radius:10px;" crossorigin="anonymous"/>`
                    : `<div style="height:56px;width:56px;background:#e0e7ff;border-radius:10px;"></div>`}
                  <div>
                    <div style="font-size:18px;font-weight:900;color:#1e293b;">${companyName}</div>
                    <div style="font-size:12px;color:#64748b;margin-top:2px;">Lista de Pacientes</div>
                  </div>
                </div>
                <div style="text-align:right;font-size:11px;color:#64748b;line-height:1.8;">
                  ${profName ? `<b style="color:#1e293b;">${profName}</b><br/>` : ''}
                  ${profCrp ? `CRP: ${profCrp}<br/>` : ''}
                  ${now}
                </div>
              </div>
              <div style="display:flex;gap:12px;margin-bottom:20px;">
                <div style="flex:1;background:#eef2ff;border-radius:10px;padding:12px 16px;">
                  <div style="font-size:10px;font-weight:700;;letter-spacing:.05em;color:#94a3b8;">Total</div>
                  <div style="font-size:16px;font-weight:900;color:#4f46e5;margin-top:4px;">${rows.length}</div>
                </div>
                <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:12px 16px;">
                  <div style="font-size:10px;font-weight:700;;letter-spacing:.05em;color:#94a3b8;">Ativos</div>
                  <div style="font-size:16px;font-weight:900;color:#059669;margin-top:4px;">${rows.filter(p => p.status === 'ativo').length}</div>
                </div>
                <div style="flex:1;background:#f8fafc;border-radius:10px;padding:12px 16px;">
                  <div style="font-size:10px;font-weight:700;;letter-spacing:.05em;color:#94a3b8;">Inativos</div>
                  <div style="font-size:16px;font-weight:900;color:#64748b;margin-top:4px;">${rows.filter(p => p.status !== 'ativo').length}</div>
                </div>
              </div>
            `:`
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:13px;font-weight:700;color:#1e293b;">Lista de Pacientes</span>
                <span style="font-size:11px;color:#94a3b8;">Página ${pageIdx + 1} de ${chunks.length} · ${now}</span>
              </div>
            `}
            <table style="width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#1e293b;">${headersHtml}</tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            ${isLastPage ? `
              <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:10px;color:#94a3b8;">Gerado em ${now} · Plaelo</div>
                ${profName ? `<div style="font-size:10px;color:#64748b;">${profName}${profCrp ? ` · CRP ${profCrp}` : ''}</div>` : ''}
              </div>
            ` : ''}
          </div>`;

        document.body.appendChild(container);
        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: 1200 });
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        const imgH = (canvas.height / canvas.width) * 297;
        const safeScale = imgH > 210 ? 210 / imgH : 1;
        const finalW = 297 * safeScale;
        const finalH = imgH * safeScale;

        if (pageIdx > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', (297 - finalW) / 2, 0, finalW, finalH);
      }

      pdf.save(`pacientes_${new Date().toISOString().slice(0, 10)}.pdf`);
      pushToast('success', 'PDF gerado!');
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao gerar PDF.');
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsLoadingPreview(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const result = await api.request<any>('/patients/import/preview', { method: 'POST', body: formData });
      const rows = result.preview || [];
      setImportPreview(rows);
      setImportSelectedIds(new Set(rows.filter((r: any) => !r.duplicate).map((_: any, i: number) => String(i))));
      setImportFile(file);
      setImportPreviewOpen(true);
    } catch (err) {
      console.error('Erro ao gerar prévia:', err);
      pushToast('error', 'Erro ao ler o arquivo. Verifique o formato.');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    if (importSelectedIds.size === 0) return;
    setIsImporting(true);
    const selectedRows = [...importSelectedIds].map(id => importPreview[Number(id)]).filter(Boolean);
    try {
      const result = await api.post<any>('/patients/import/confirm', { rows: selectedRows });
      pushToast('success', `${result.importedLength} paciente(s) importado(s) com sucesso!`);
      setImportPreviewOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportSelectedIds(new Set());
      fetchPatients();
    } catch (err) {
      console.error('Erro ao importar:', err);
      pushToast('error', 'Erro ao importar pacientes.');
    } finally {
      setIsImporting(false);
    }
  };

  const renderPatientCard = (patient: Patient) => {
    const age = calcAge(patient.birth_date);
    const active = isActive(patient);
    const isSelected = selectedIds.has(String(patient.id));
    return (
      <div
        key={patient.id}
        className={`bg-white border rounded-lg transition-colors overflow-hidden group cursor-pointer flex flex-col h-full ${isSelected ? 'border-primary-400 ring-2 ring-primary-100' : 'border-slate-200 hover:border-primary-200'}`}
        onClick={() => selectedIds.size > 0 ? toggleSelect(String(patient.id)) : navigate(`/pacientes/${patient.id}`)}
      >
        <div className="p-3 flex-1">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center text-primary-700 text-base font-medium overflow-hidden">
                {patient.photo_url || patient.photoUrl ? (
                  <img src={getStaticUrl(patient.photo_url || patient.photoUrl)} alt={patient.full_name} className="w-full h-full object-cover" />
                ) : (patient.full_name || '?').charAt(0).toUpperCase()}
              </div>
              <button
                type="button"
                aria-label={isSelected ? 'Desmarcar paciente' : 'Selecionar paciente'}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleSelect(String(patient.id)); }}
                className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-primary-600 border-primary-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-primary-400'}`}
              >
                {isSelected && <CheckSquare size={12} />}
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-slate-800 truncate mb-1">{patient.full_name || 'Sem nome'}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={active ? 'success' : 'default'} size="sm" dot>{active ? 'Ativo' : 'Inativo'}</Badge>
                {patient.health_plan && <Badge color="info" size="sm"><Shield size={10} className="mr-1" />Convênio</Badge>}
                {age && <span className="text-[11px] text-slate-500">{age} anos</span>}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            {(patient.whatsapp || patient.phone) && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Phone size={12} className="text-primary-500 shrink-0" />
                <span className="truncate flex items-center gap-1.5">
                  {patient.phone_country && <span className="text-sm leading-none shrink-0">{getFlag(patient.phone_country)}</span>}
                  {patient.whatsapp || patient.phone}
                </span>
              </div>
            )}
            {patient.email && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Mail size={12} className="text-primary-500 shrink-0" />
                <span className="truncate">{patient.email}</span>
              </div>
            )}
            {patient.city && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{patient.city}{patient.state ? ` — ${patient.state}` : ''}</span>
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 p-3 flex flex-wrap items-center gap-1.5 bg-slate-50/50">
          <Button variant="outline" size="xs" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/pacientes/${patient.id}`); }} iconLeft={<Eye size={14} />} className="flex-1 justify-center">Perfil</Button>
          <Button variant="ghost" size="xs" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setHistoryPatient(patient); }} iconLeft={<History size={14} />} className="flex-1 justify-center">Histórico</Button>
          {hasPermission('edit_patient') && (
            <Button variant={active ? 'ghost' : 'success'} size="xs" onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleQuickStatusChange(patient); }} className={`flex-1 justify-center ${active ? 'text-amber-600 hover:bg-amber-50' : ''}`}>{active ? 'Pausar' : 'Ativar'}</Button>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            {hasPermission('edit_patient') && (
              <IconButton variant="ghost" size="xs" aria-label="Editar paciente" title="Editar" onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/pacientes/${patient.id}/editar`); }} disabled={isProcessing || bulkDeleting}><Edit2 size={14} /></IconButton>
            )}
            {hasPermission('delete_patient') && (
              <IconButton variant="ghost" size="xs" aria-label="Excluir paciente" title="Excluir" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteId(patient.id); }} disabled={isProcessing || bulkDeleting} className="hover:text-red-600 hover:bg-red-50"><Trash2 size={14} /></IconButton>
            )}
          </div>
        </div>
      </div>
    );
  };

  const listLoading = isLoading || bulkDeleting || isProcessing;

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Users}
          title={t('patients.title')}
          description={t('patients.subtitle')}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {hasPermission('view_performance_reports') && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportTemplate}
                    title="Baixar Modelo de Importação"
                    aria-label="Baixar Modelo de Importação"
                    iconLeft={<Download size={14} />}
                  >
                    <span className="hidden sm:inline">Modelo</span>
                  </Button>

                  {/* Exportar dropdown */}
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setExportMenuOpen(o => !o)}
                      title="Exportar Pacientes"
                      aria-label="Exportar Pacientes"
                      iconLeft={<FileDown size={14} />}
                      iconRight={<ChevronDown size={14} />}
                    >
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    {exportMenuOpen && (
                      <div
                        className="absolute right-0 top-full z-[110] mt-1 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-sm"
                        onMouseLeave={() => setExportMenuOpen(false)}
                      >
                        <button
                          type="button"
                          onClick={() => { setExportMenuOpen(false); handleExportCSV(); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} className="text-emerald-500" /> Exportar CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => { setExportMenuOpen(false); handleExportPatients(); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} className="text-green-600" /> Exportar Excel
                        </button>
                        <button
                          type="button"
                          onClick={() => { setExportMenuOpen(false); handleExportPDF(); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} className="text-red-500" /> Exportar PDF
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Importar */}
                  <input ref={importInputRef} type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportFile} disabled={isLoadingPreview} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => importInputRef.current?.click()}
                    disabled={isLoadingPreview}
                    loading={isLoadingPreview}
                    aria-label="Importar pacientes"
                    iconLeft={<FileUp size={14} />}
                  >
                    <span className="hidden sm:inline">{isLoadingPreview ? 'Lendo...' : 'Importar'}</span>
                  </Button>
                </>
              )}
              {hasPermission('create_patient') && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/pacientes/novo')}
                  aria-label={t('patients.new')}
                  iconLeft={<Plus size={14} />}
                >
                  <span className="hidden sm:inline">{t('patients.new')}</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Stats Cards */}
        <StatGrid cols={4}>
          {[
            { label: 'Total de Pacientes', value: summaryStats.total, icon: Users, color: 'info' as const },
            { label: 'Pacientes Ativos', value: summaryStats.active, icon: Activity, color: 'success' as const },
            { label: 'Inativos / Arquivados', value: summaryStats.inactive, icon: User, color: 'default' as const },
            { label: 'Com Convênio', value: summaryStats.withPlan, icon: Shield, color: 'purple' as const },
          ].map((s, index) => (
            <StatCard
              key={s.label}
              title={s.label}
              value={s.value}
              icon={s.icon}
              color={s.color}
              delay={index * 0.04}
            />
          ))}
        </StatGrid>

        {/* Search + Filter Bar */}
        <FilterLine>
          <FilterLineSection grow>
            <FilterLineItem grow minWidth={200}>
              <FilterLineSearch
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t('patients.search')}
              />
            </FilterLineItem>
          </FilterLineSection>
          <FilterLineSection align="right">
            <FilterLineSegmented<'all' | 'ativo' | 'inativo'>
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                updatePreference('patients', { statusFilter: value });
              }}
              options={[
                { value: 'all', label: t('patients.filter.all') },
                { value: 'ativo', label: t('patients.status.active') },
                { value: 'inativo', label: t('patients.status.archived') },
              ]}
              size="sm"
            />
            <div className="hidden sm:flex">
              <FilterLineViewToggle<'cards' | 'list'>
                value={viewMode}
                gridValue="cards"
                listValue="list"
                onChange={(value) => {
                  setViewMode(value);
                  updatePreference('patients', { viewMode: value });
                }}
              />
            </div>
          </FilterLineSection>
        </FilterLine>

        {/* Results Count + Bulk Actions */}
        {!isLoading && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="info" pill>
                {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''}
              </Badge>
              {filteredPatients.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={toggleSelectAll}
                  iconLeft={
                    currentPatients.length > 0 && currentPatients.every(p => selectedIds.has(String(p.id)))
                      ? <CheckSquare size={14} />
                      : <Square size={14} />
                  }
                >
                  {currentPatients.length > 0 && currentPatients.every(p => selectedIds.has(String(p.id))) ? 'Desmarcar página' : 'Selecionar página'}
                </Button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2 animate-fadeIn">
                <Badge color="primary" pill>
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                </Badge>
                {hasPermission('delete_patient') && (
                  <Button
                    type="button"
                    variant="danger"
                    size="xs"
                    onClick={() => setConfirmBulkDelete(true)}
                    iconLeft={<Trash2 size={14} />}
                  >
                    Excluir selecionados
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Content — mobile sempre cards, desktop respeita viewMode */}
        {listLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-slate-100 rounded-lg animate-pulse h-40" />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <>
            {/* Mobile: sempre cards */}
            <div className="grid grid-cols-1 gap-3 sm:hidden">
              {currentPatients.map(renderPatientCard)}
            </div>
            {/* Desktop: tabela */}
            <ContentCard padding="none" className="hidden sm:block overflow-hidden">
              <GridTable<Patient>
                data={currentPatients}
                keyExtractor={(p) => p.id}
                selectedIds={selectedIds}
                onToggleSelect={(id) => toggleSelect(id)}
                onToggleSelectAll={toggleSelectAll}
                onRowClick={(p) => navigate(`/pacientes/${p.id}`)}
                emptyMessage={t('patients.empty')}
                isLoading={listLoading}
                columns={[
                  {
                    header: 'Paciente',
                    render: (patient: Patient) => (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-700 text-[11px] font-medium shrink-0 overflow-hidden">
                          {patient.photo_url || patient.photoUrl ? (
                            <img src={getStaticUrl(patient.photo_url || patient.photoUrl)} alt={patient.full_name} className="w-full h-full object-cover" />
                          ) : (
                            (patient.full_name || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-800 truncate">{patient.full_name || 'Sem nome'}</div>
                          {patient.notes && (
                            <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{patient.notes}</div>
                          )}
                        </div>
                      </div>
                    )
                  },
                  {
                    header: 'Contato',
                    className: 'hidden md:table-cell',
                    headerClassName: 'hidden md:table-cell',
                    render: (patient: Patient) => (
                      <>
                        <div className="text-xs text-slate-700 flex items-center gap-1.5">
                          {patient.phone_country && <span className="text-sm leading-none shrink-0">{getFlag(patient.phone_country)}</span>}
                          {patient.whatsapp || patient.phone || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px] mt-0.5">{patient.email || ''}</div>
                      </>
                    )
                  },
                  {
                    header: 'Idade',
                    className: 'hidden lg:table-cell',
                    headerClassName: 'hidden lg:table-cell',
                    render: (patient: Patient) => {
                      const age = calcAge(patient.birth_date);
                      return (
                        <>
                          <div className="text-xs text-slate-700">{age ? `${age} anos` : '—'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{formatDate(patient.birth_date)}</div>
                        </>
                      )
                    }
                  },
                  {
                    header: 'Status',
                    className: 'hidden sm:table-cell',
                    headerClassName: 'hidden sm:table-cell',
                    render: (patient: Patient) => {
                      const active = isActive(patient);
                      return (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(patient); }}
                          disabled={!hasPermission('edit_patient')}
                          title={hasPermission('edit_patient') ? 'Alterar status' : undefined}
                          className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${!hasPermission('edit_patient') ? 'opacity-50 border-slate-200' : 'hover:border-primary-300'} ${
                            active ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {active ? 'Ativo' : 'Inativo'}
                        </button>
                      )
                    }
                  },
                  {
                    header: 'Ações',
                    className: 'text-right',
                    headerClassName: 'text-right',
                    render: (patient: Patient) => (
                      <div className="flex items-center gap-1 justify-end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <IconButton
                          variant="outline"
                          size="xs"
                          onClick={() => navigate(`/pacientes/${patient.id}`)}
                          title="Perfil"
                          aria-label="Abrir perfil"
                        >
                          <Eye size={14} />
                        </IconButton>
                        <IconButton
                          variant="ghost"
                          size="xs"
                          onClick={() => setHistoryPatient(patient)}
                          title="Histórico"
                          aria-label="Ver histórico"
                        >
                          <History size={14} />
                        </IconButton>
                        {hasPermission('edit_patient') && (
                          <IconButton
                            variant="ghost"
                            size="xs"
                            onClick={() => navigate(`/pacientes/${patient.id}/editar`)}
                            title="Editar"
                            aria-label="Editar paciente"
                          >
                            <Edit2 size={14} />
                          </IconButton>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </ContentCard>
          </>
        ) : (
          /* === CARD VIEW === */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {currentPatients.map(renderPatientCard)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPatients.length === 0 && (
          <ContentCard>
            <EmptyState
              icon={Users}
              title={t('patients.empty')}
              description="Tente buscar por outro termo ou ajuste os filtros para ver todos os pacientes."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                >
                  Limpar filtros
                </Button>
              }
            />
          </ContentCard>
        )}

        {/* Pagination */}
        {!isLoading && filteredPatients.length > 0 && (
          <Pagination
            total={filteredPatients.length}
            page={currentPage}
            pageSize={itemsPerPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            className="rounded-lg border border-slate-200"
          />
        )}
      </div>

      {/* Bulk Delete Confirm Modal */}
      <ConfirmModal
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title={`Excluir ${selectedIds.size} paciente${selectedIds.size > 1 ? 's' : ''}?`}
        message="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={bulkDeleting}
        variant="danger"
      />

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Excluir paciente"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={isProcessing}
        variant="danger"
      />

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <Modal
          isOpen={!!selectedPatient}
          onClose={() => setSelectedPatient(null)}
          size="xl"
          mobileStyle="fullscreen"
          title={
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-10 h-10 rounded-lg border border-primary-100 bg-primary-50 flex items-center justify-center text-primary-700 text-sm font-medium shrink-0 overflow-hidden">
                {selectedPatient.photo_url || selectedPatient.photoUrl ? (
                  <img src={getStaticUrl(selectedPatient.photo_url || selectedPatient.photoUrl)} alt={selectedPatient.full_name} className="w-full h-full object-cover" />
                ) : (
                  (selectedPatient.full_name || '?').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{selectedPatient.full_name}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge color={isActive(selectedPatient) ? 'success' : 'default'} size="sm" dot>
                    {isActive(selectedPatient) ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {selectedPatient.health_plan && (
                    <Badge color="info" size="sm"><Shield size={10} className="mr-1" /> {selectedPatient.health_plan}</Badge>
                  )}
                  {calcAge(selectedPatient.birth_date || selectedPatient.birthDate) && (
                    <span className="text-[11px] font-normal text-slate-500">
                      {calcAge(selectedPatient.birth_date || selectedPatient.birthDate)} anos
                    </span>
                  )}
                </div>
              </div>
            </div>
          }
          footer={
            <ModalFooter align="between">
              <div className="flex flex-wrap gap-2">
                {hasPermission('view_agenda') && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/agenda?patient_id=${selectedPatient.id}`)}
                    iconLeft={<Calendar size={14} />}
                  >
                    Agenda
                  </Button>
                )}
                {[
                  { label: 'Prontuário', path: `/prontuario?patient_id=${selectedPatient.id}`, perm: 'view_medical_records' },
                  { label: 'Neuro', path: `/neurodesenvolvimento?patient_id=${selectedPatient.id}`, perm: 'neuro_access' },
                  { label: 'Formulários', path: `/formularios/lista?patient_id=${selectedPatient.id}`, perm: 'fill_forms' },
                  { label: 'Documentos', path: `/documentos?patient_id=${selectedPatient.id}`, perm: 'manage_documents' },
                  { label: 'Ferramentas', path: `/caixa-ferramentas?patient_id=${selectedPatient.id}`, perm: 'view_medical_records' },
                ].map(btn => hasPermission(btn.perm as any) && (
                  <Button
                    key={btn.label}
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(btn.path)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
              {hasPermission('edit_patient') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setSelectedPatient(null); navigate(`/pacientes/${selectedPatient.id}/editar`); }}
                  iconLeft={<Edit2 size={14} />}
                >
                  Editar
                </Button>
              )}
            </ModalFooter>
          }
        >
          <Tabs<typeof SUMMARY_TABS[number]['id']>
            items={SUMMARY_TABS}
            value={summaryTab}
            onChange={setSummaryTab}
            label="Resumo do paciente"
          >
            {summaryTab === 'resumo' && (
              <div className="space-y-3">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                  <DetailField label="Nascimento" value={formatDate(selectedPatient.birth_date || selectedPatient.birthDate)} />
                  <DetailField
                    label="Telefone"
                    value={[
                      [selectedPatient.phone_country ? getFlag(selectedPatient.phone_country) : '', selectedPatient.whatsapp || selectedPatient.phone || ''].filter(Boolean).join(' '),
                      selectedPatient.phone2 ? [selectedPatient.phone2_country ? getFlag(selectedPatient.phone2_country) : '', selectedPatient.phone2].filter(Boolean).join(' ') : '',
                    ].filter(Boolean).join(' · ')}
                  />
                  <DetailField label="Email" value={selectedPatient.email || ''} />
                  <DetailField label="CPF" value={selectedPatient.cpf_cnpj || selectedPatient.cpf || ''} />
                </dl>

                {(selectedPatient.address || selectedPatient.city) && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                    <MapPin size={14} className="text-primary-500 shrink-0" />
                    <span>
                      {[selectedPatient.address, selectedPatient.city, selectedPatient.state].filter(Boolean).join(', ')}
                      {selectedPatient.zip_code && ` — CEP ${selectedPatient.zip_code}`}
                    </span>
                  </div>
                )}

                {selectedPatient.notes && (
                  <div>
                    <div className="text-xs font-medium text-amber-700 mb-1.5 flex items-center gap-1.5">
                      <StickyNote size={14} /> Observações / Referência
                    </div>
                    <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed whitespace-pre-wrap">
                      {selectedPatient.notes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {summaryTab === 'atividade' && (
              <div className="space-y-3">
                {summaryLoading ? (
                  <div role="status" className="flex items-center gap-2 text-xs text-slate-500 py-3">
                    <Loader2 size={14} className="animate-spin text-primary-500" /> Carregando vínculos...
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Agenda', value: summary?.appointmentsCount, icon: <Calendar size={14} />, color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Prontuários', value: summary?.recordsCount, icon: <FileText size={14} />, color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Neuro', value: summary?.neuroCount, icon: <BrainCircuit size={14} />, color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Formulários', value: summary?.formsCount, icon: <ClipboardList size={14} />, color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Documentos', value: summary?.documentsCount, icon: <FolderOpen size={14} />, color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Ferramentas', value: summary?.toolsCount, icon: <Boxes size={14} />, color: 'text-primary-600', bg: 'bg-primary-50' },
                      { label: 'Notas', value: summary?.notesCount, icon: <StickyNote size={14} />, color: 'text-slate-500', bg: 'bg-slate-100' },
                    ].map(item => (
                      <div key={item.label} className={`${item.bg} rounded-lg p-3 text-center`}>
                        <div className={`${item.color} flex justify-center mb-1.5`}>{item.icon}</div>
                        <div className="text-base font-medium text-slate-800 leading-none">
                          {item.value === null ? <span className="text-slate-300 text-xs">—</span> : item.value}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 leading-tight">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {summaryError && <Alert variant="error">{summaryError}</Alert>}

                {(summary?.upcomingAppointments?.length ?? 0) > 0 && (
                  <div>
                    <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-2">
                      <Calendar size={14} className="text-primary-500" /> Próximos atendimentos
                    </div>
                    <div className="space-y-2">
                      {summary!.upcomingAppointments.map(item => (
                        <div key={item.id} className="flex items-center justify-between text-xs bg-primary-50 border border-primary-100 rounded-lg px-3 py-2">
                          <span className="font-medium text-primary-800">{item.label}</span>
                          <span className="text-primary-600">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {summaryTab === 'cadastro' && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <DetailField label="RG" value={selectedPatient.rg || ''} />
                <DetailField label="Profissão" value={selectedPatient.profession || ''} />
                <DetailField label="Estado civil" value={selectedPatient.marital_status || ''} />
                <DetailField label="Escolaridade" value={selectedPatient.education || ''} />
                <DetailField label="Nacionalidade" value={selectedPatient.nationality || ''} />
                <DetailField label="Convênio" value={selectedPatient.health_plan || (selectedPatient.convenio ? selectedPatient.convenio_name || 'Sim' : 'Não')} />
                <DetailField label="Contato emergência" value={selectedPatient.emergency_contact || ''} />
                <DetailField label="Contato familiar" value={selectedPatient.family_contact || ''} />
              </dl>
            )}
          </Tabs>
        </Modal>
      )}

      {/* Patient History Drawer */}
      <PatientHistoryDrawer
        patient={historyPatient}
        onClose={() => setHistoryPatient(null)}
      />

      {/* Import Preview Modal */}
      {importPreviewOpen && (() => {
        const dupCount = importPreview.filter(r => r.duplicate).length;
        const selectedCount = importSelectedIds.size;
        const allNonDup = importPreview.filter(r => !r.duplicate);
        const allSelected = allNonDup.length > 0 && allNonDup.every((_,i) => importSelectedIds.has(String(importPreview.indexOf(_))));

        const toggleRow = (idx: string) => {
          setImportSelectedIds(prev => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
          });
        };
        const toggleAll = () => {
          if (allSelected) {
            setImportSelectedIds(new Set());
          } else {
            setImportSelectedIds(new Set(importPreview.map((_,i) => String(i)).filter(i => !importPreview[Number(i)].duplicate)));
          }
        };
        const removeRow = (idx: number) => {
          setImportPreview(prev => prev.filter((_, i) => i !== idx));
          setImportSelectedIds(prev => {
            const next = new Set<string>();
            prev.forEach(id => { const n = Number(id); if (n < idx) next.add(String(n)); else if (n > idx) next.add(String(n - 1)); });
            return next;
          });
        };

        const importColumns: Column<any>[] = [
          {
            header: 'Nome',
            render: (row) => (
              <span className={`font-medium ${row.duplicate ? 'text-rose-700' : 'text-slate-800'}`}>{row.name}</span>
            ),
          },
          {
            header: 'CPF',
            render: (row) => row.cpf ? (
              <div className="flex flex-col gap-0.5">
                <span className={`font-mono text-xs font-semibold ${row.duplicate ? 'text-rose-600' : 'text-slate-700'}`}>
                  {row.duplicate && <AlertCircle size={11} className="inline mr-1 mb-0.5" />}
                  {row.cpf}
                </span>
                {row.duplicate && (
                  <span className="text-[11px] text-rose-500 font-medium">já existe: {row.existingName}</span>
                )}
              </div>
            ) : <span className="text-slate-300 text-xs">—</span>,
          },
          {
            header: 'Telefone',
            render: (row) => <span className="text-slate-600 text-xs">{row.phone || <span className="text-slate-300">—</span>}</span>,
          },
          {
            header: 'Nascimento',
            render: (row) => <span className="text-slate-600 text-xs">{row.birth_date || <span className="text-slate-300">—</span>}</span>,
          },
          {
            header: 'Ação',
            headerClassName: 'text-center',
            className: 'text-center',
            render: (row) => {
              const idx = importPreview.indexOf(row);
              return (
                <IconButton
                  variant="ghost"
                  size="xs"
                  onClick={(e) => { e.stopPropagation(); removeRow(idx); }}
                  title="Remover da lista"
                  className="mx-auto text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 size={14} />
                </IconButton>
              );
            },
          },
        ];

        return (
          <Modal
            isOpen={importPreviewOpen}
            onClose={() => { setImportPreviewOpen(false); setImportPreview([]); setImportFile(null); }}
            size="full"
            mobileStyle="fullscreen"
            title={
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50">
                  <FileUp size={18} className="text-primary-600" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate">Pré-visualização da Importação</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 normal-case">
                    <Badge color="default" pill>{importPreview.length} na planilha</Badge>
                    {dupCount > 0 && <Badge color="danger" pill>{dupCount} CPF duplicado{dupCount > 1 ? 's' : ''}</Badge>}
                    <Badge color="info" pill>{selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}</Badge>
                  </span>
                </span>
              </div>
            }
            footer={
              <ModalFooter align="between" className="w-full">
                <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                  {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setImportPreviewOpen(false); setImportPreview([]); setImportFile(null); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleConfirmImport}
                    disabled={isImporting || selectedCount === 0}
                    loading={isImporting}
                    iconLeft={<FileUp size={15} />}
                  >
                    Importar {selectedCount} paciente{selectedCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              </ModalFooter>
            }
          >
            <div className="space-y-3">
              <GridTable
                data={importPreview}
                keyExtractor={(_) => String(importPreview.indexOf(_))}
                columns={importColumns}
                selectedIds={importSelectedIds}
                onToggleSelect={(id) => { if (!importPreview[Number(id)]?.duplicate) toggleRow(id); }}
                onToggleSelectAll={toggleAll}
                emptyMessage="Nenhum paciente encontrado na planilha."
              />

              {dupCount > 0 && (
                <Alert variant="warning">
                  Linhas com CPF duplicado não podem ser selecionadas e serão ignoradas na importação.
                </Alert>
              )}
            </div>
          </Modal>
        );
      })()}

    </PageWrapper>
  );
};
