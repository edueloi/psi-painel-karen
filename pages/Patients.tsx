import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Search, Plus, Phone, Mail, Calendar, FileText,
  Edit2, Trash2, X, AlertCircle, Eye, ClipboardList,
  FolderOpen, BrainCircuit, Boxes, StickyNote, Loader2, ChevronRight, ChevronLeft,
  FileUp, FileDown, Download, MapPin, Shield, User,
  Activity, TrendingUp, CheckSquare, Square, History, CheckCircle2, ChevronDown
} from 'lucide-react';
import { api, API_BASE_URL, getStaticUrl } from '../services/api';
import { Patient } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { PatientFormWizard } from '../components/Patient/PatientFormWizard';
import { PatientHistoryDrawer } from '../components/Patient/PatientHistoryDrawer';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useToast } from '../contexts/ToastContext';
import { GridTable, Column } from '../components/UI/GridTable';
import { PageHeader } from '../components/UI/PageHeader';

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

const AVATAR_COLORS = [
  'from-primary-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

const getAvatarColor = (name: string) => {
  const idx = (name.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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

  const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

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

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / itemsPerPage));
  const currentPatients = useMemo(() => {
    return filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredPatients, currentPage, itemsPerPage]);

  const toggleSelectAll = () => {
    // Determine if all visible patients on the current page are selected
    const allVisibleSelected = currentPatients.every(p => selectedIds.has(String(p.id)));
    if (allVisibleSelected) {
      // Unselect only the ones on the current page
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentPatients.forEach(p => next.delete(String(p.id)));
        return next;
      });
    } else {
      // Select all on the current page
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
      setIsWizardOpen(false);
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
      
      // Sanitizar dados para evitar erro 500 no MySQL (como birth_date: '')
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
    } catch (err: any) {
      console.error(err);
      pushToast('error', 'Erro ao mudar status: ' + (err.message || 'Erro interno'));
    }
  };

  const safeGet = async <T,>(endpoint: string, params?: Record<string, string>): Promise<T | null> => {
    try { return await api.get<T>(endpoint, params); } catch { return null; }
  };

  const openPatientSummary = async (patient: Patient) => {
    setSelectedPatient(patient);
    setShowDetails(false);
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
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
        headers: { 'Authorization': `Bearer ${localStorage.getItem('psi_token')}` }
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
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
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

      const headersHtml = headers.map(h => `<th style="padding:10px 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#e2e8f0;text-align:left;">${h}</th>`).join('');

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
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">Total</div>
                  <div style="font-size:16px;font-weight:900;color:#4f46e5;margin-top:4px;">${rows.length}</div>
                </div>
                <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:12px 16px;">
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">Ativos</div>
                  <div style="font-size:16px;font-weight:900;color:#059669;margin-top:4px;">${rows.filter(p => p.status === 'ativo').length}</div>
                </div>
                <div style="flex:1;background:#f8fafc;border-radius:10px;padding:12px 16px;">
                  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;">Inativos</div>
                  <div style="font-size:16px;font-weight:900;color:#64748b;margin-top:4px;">${rows.filter(p => p.status !== 'ativo').length}</div>
                </div>
              </div>
            ` : `
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
                <div style="font-size:10px;color:#94a3b8;">Gerado em ${now} · PsiFlux</div>
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
      // Pré-seleciona apenas os não-duplicados
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1600px] mx-auto px-6 pt-6 mb-6">
        <PageHeader
          icon={<Users />}
          title={t('patients.title')}
          subtitle={t('patients.subtitle')}
          containerClassName="mb-0"
          actions={
            <div className="flex items-center gap-2">
              {hasPermission('view_performance_reports') && (
                <>
                  <button
                    onClick={handleExportTemplate}
                    title="Baixar Modelo de Importação"
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm uppercase tracking-tighter"
                  >
                    <Download size={14} /> <span className="hidden sm:inline">Modelo</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setExportMenuOpen(o => !o)}
                      title="Exportar Pacientes"
                      className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm uppercase tracking-tighter"
                    >
                      <Download size={14} /> <span className="hidden sm:inline">Exportar</span> <ChevronDown size={12} />
                    </button>
                    {exportMenuOpen && (
                      <div
                        className="absolute right-0 top-full z-[110] mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                        onMouseLeave={() => setExportMenuOpen(false)}
                      >
                        <button
                          onClick={() => { setExportMenuOpen(false); handleExportCSV(); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} className="text-emerald-500" /> Exportar CSV
                        </button>
                        <button
                          onClick={() => { setExportMenuOpen(false); handleExportPatients(); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} className="text-green-600" /> Exportar Excel
                        </button>
                        <button
                          onClick={() => { setExportMenuOpen(false); handleExportPDF(); }}
                          className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <FileText size={14} className="text-red-500" /> Exportar PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-sm cursor-pointer uppercase tracking-tighter">
                    {isLoadingPreview ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                    <span className="hidden sm:inline">{isLoadingPreview ? 'Lendo...' : 'Importar'}</span>
                    <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleImportFile} disabled={isLoadingPreview} />
                  </label>
                </>
              )}
              {hasPermission('create_patient') && (
                <button
                  onClick={() => { setEditingPatient(undefined); setIsWizardOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-primary-600 text-white text-xs font-semibold rounded-lg hover:from-indigo-700 hover:to-primary-700 transition-all shadow-sm uppercase tracking-tighter"
                >
                  <Plus size={14} /> {t('patients.new')}
                </button>
              )}
            </div>
          }
        />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total de Pacientes', value: summaryStats.total, icon: <Users size={18} />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'Pacientes Ativos', value: summaryStats.active, icon: <Activity size={18} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Inativos / Arquivados', value: summaryStats.inactive, icon: <User size={18} />, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' },
            { label: 'Com Convênio', value: summaryStats.withPlan, icon: <Shield size={18} />, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
          ].map(s => (
            <div key={s.label} className={`bg-white border ${s.border} rounded-2xl p-4 flex items-center gap-3 shadow-sm`}>
              <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                {s.icon}
              </div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[11px] text-slate-500 font-medium leading-tight">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 mb-5 flex flex-col sm:flex-row gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder={t('patients.search')}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              {[
                { id: 'all', label: t('patients.filter.all') },
                { id: 'ativo', label: t('patients.status.active') },
                { id: 'inativo', label: t('patients.status.archived') },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => { setStatusFilter(f.id as any); updatePreference('patients', { statusFilter: f.id as any }); }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === f.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => { setViewMode('cards'); updatePreference('patients', { viewMode: 'cards' }); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                title="Visualização em cards"
              >
                ⊞
              </button>
              <button
                onClick={() => { setViewMode('list'); updatePreference('patients', { viewMode: 'list' }); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                title="Visualização em lista"
              >
                ☰
              </button>
            </div>
          </div>
        </div>

        {/* Results Count + Bulk Actions */}
        {!isLoading && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-slate-400 font-medium">
                {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''} encontrado{filteredPatients.length !== 1 ? 's' : ''}
              </p>
              {filteredPatients.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {selectedIds.size === filteredPatients.length && filteredPatients.length > 0
                    ? <CheckSquare size={14} className="text-indigo-600" />
                    : <Square size={14} />
                  }
                  {selectedIds.size === filteredPatients.length && filteredPatients.length > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              )}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 animate-fadeIn">
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                  {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
                </span>
                {hasPermission('delete_patient') && (
                  <button
                    onClick={() => setConfirmBulkDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm"
                  >
                    <Trash2 size={13} /> Excluir selecionados
                  </button>
                )}
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        { (isLoading || bulkDeleting || isProcessing) ? (
          <div className={viewMode === 'cards' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2'}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`bg-slate-100 rounded-2xl animate-pulse ${viewMode === 'cards' ? 'h-40' : 'h-16'}`} />
            ))}
          </div>
        ) : viewMode === 'cards' ? (
          /* === CARD VIEW === */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentPatients.map(patient => {
              const age = calcAge(patient.birth_date);
              const active = isActive(patient);
              const avatarGrad = getAvatarColor(patient.full_name || 'A');
              const isSelected = selectedIds.has(String(patient.id));
              return (
                <div
                  key={patient.id}
                  className={`bg-white border rounded-2xl hover:shadow-lg transition-all duration-200 overflow-hidden group cursor-pointer ${isSelected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-200'}`}
                  onClick={() => selectedIds.size > 0 ? toggleSelect(String(patient.id)) : navigate(`/pacientes/${patient.id}`)}
                >
                  {/* Card Top */}
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white text-base font-bold shadow-sm overflow-hidden`}>
                          {patient.photo_url || patient.photoUrl ? (
                            <img src={getStaticUrl(patient.photo_url || patient.photoUrl)} alt={patient.full_name} className="w-full h-full object-cover" />
                          ) : (
                            (patient.full_name || '?').charAt(0).toUpperCase()
                          )}
                        </div>
                        <button
                          onClick={(e: React.MouseEvent) => { e.stopPropagation(); toggleSelect(String(patient.id)); }}
                          className={`absolute -top-1.5 -left-1.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-indigo-400'}`}
                        >
                          {isSelected && <CheckSquare size={12} />}
                        </button>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-slate-800 truncate">{patient.full_name || 'Sem nome'}</h3>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {active ? 'Ativo' : 'Inativo'}
                          </span>
                          {patient.health_plan && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                              <Shield size={9} /> Convênio
                            </span>
                          )}
                          {age && (
                            <span className="text-[10px] text-slate-400 font-medium">{age} anos</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {(patient.whatsapp || patient.phone) && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Phone size={11} className="text-indigo-400 shrink-0" />
                          <span className="truncate flex items-center gap-1.5">
                            {patient.phone_country && <span className="text-sm leading-none shrink-0" title={patient.phone_country}>{getFlag(patient.phone_country)}</span>}
                            {patient.whatsapp || patient.phone}
                          </span>
                        </div>
                      )}
                      {patient.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Mail size={11} className="text-indigo-400 shrink-0" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                      )}
                      {patient.city && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <MapPin size={11} className="text-slate-300 shrink-0" />
                          <span className="truncate">{patient.city}{patient.state ? ` — ${patient.state}` : ''}</span>
                        </div>
                      )}
                      {patient.notes && (
                        <div className="flex items-start gap-2 text-xs text-slate-500 mt-2">
                          <StickyNote size={11} className="text-amber-400 shrink-0 mt-0.5" />
                          <span className="truncate italic">{patient.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="border-t border-slate-100 px-3 py-2.5 flex flex-wrap items-center gap-1.5 bg-slate-50/70">
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/pacientes/${patient.id}`); }}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all flex-1 justify-center whitespace-nowrap"
                    >
                      <Eye size={12} /> Perfil
                    </button>
                    <button
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setHistoryPatient(patient); }}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50 transition-all flex-1 justify-nowrap"
                    >
                      <History size={12} /> Histórico
                    </button>
                    {hasPermission('edit_patient') && (
                      <button
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleQuickStatusChange(patient); }}
                        className={`flex items-center gap-1 px-2 py-1.5 text-xs font-semibold rounded-lg border transition-all flex-1 justify-center whitespace-nowrap ${active ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}
                        title={active ? 'Desativar' : 'Ativar'}
                      >
                        {active ? 'Pausar' : 'Ativar'}
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 ml-auto">
                        {hasPermission('edit_patient') && (
                          <button
                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setEditingPatient(patient); setIsWizardOpen(true); }}
                            disabled={isProcessing || bulkDeleting}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all disabled:opacity-50"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                        {hasPermission('delete_patient') && (
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteId(patient.id); }}
                            disabled={isProcessing || bulkDeleting}
                            className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <GridTable<Patient> 
            data={currentPatients}
            keyExtractor={(p) => p.id}
            selectedIds={selectedIds}
            onToggleSelect={(id) => toggleSelect(id)}
            onToggleSelectAll={toggleSelectAll}
            onRowClick={(p) => navigate(`/pacientes/${p.id}`)}
            emptyMessage={t('patients.empty')}
            isLoading={isLoading || bulkDeleting || isProcessing}
            columns={[
              {
                header: 'Paciente',
                render: (patient: Patient) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-[10px] font-bold shrink-0 shadow-sm transition-transform group-hover:scale-105">
                      {patient.photo_url || patient.photoUrl ? (
                        <img src={getStaticUrl(patient.photo_url || patient.photoUrl)} alt={patient.full_name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        (patient.full_name || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-800 truncate">{patient.full_name || 'Sem nome'}</div>
                      {patient.notes && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px] italic">{patient.notes}</div>
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
                    <div className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                      {patient.phone_country && <span className="text-sm leading-none shrink-0">{getFlag(patient.phone_country)}</span>}
                      {patient.whatsapp || patient.phone || '—'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{patient.email || ''}</div>
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
                      <div className="text-xs font-bold text-slate-700">{age ? `${age} anos` : '—'}</div>
                      <div className="text-[10px] text-slate-400">{formatDate(patient.birth_date)}</div>
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
                      onClick={(e) => { e.stopPropagation(); handleQuickStatusChange(patient); }}
                      disabled={!hasPermission('edit_patient')}
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${!hasPermission('edit_patient') ? 'opacity-50 cursor-not-allowed border-slate-200' : 'hover:ring-4 hover:ring-slate-50'} ${
                        active ? 'bg-emerald-50 text-emerald-700 border-emerald-100 px-2.5' : 'bg-slate-100 text-slate-500 border-slate-200 px-2.5'
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
                    <button
                      onClick={() => navigate(`/pacientes/${patient.id}`)}
                      className="p-1.5 text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all"
                      title="Perfil"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={() => setHistoryPatient(patient)}
                      className="p-1.5 text-primary-500 bg-primary-50 border border-primary-100 rounded-lg hover:bg-primary-100 transition-all"
                      title="Histórico"
                    >
                      <History size={13} />
                    </button>
                    {hasPermission('edit_patient') && (
                      <button
                        onClick={() => { setEditingPatient(patient); setIsWizardOpen(true); }}
                        className="p-1.5 text-slate-500 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:text-amber-600 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}

        {/* Empty state */}
        {!isLoading && filteredPatients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-5">
              <Users size={32} className="text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-600 mb-1">{t('patients.empty')}</h3>
            <p className="text-sm text-slate-400 max-w-xs mb-5">Tente buscar por outro termo ou ajuste os filtros para ver todos os pacientes.</p>
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="px-4 py-2 text-sm text-indigo-600 font-semibold border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filteredPatients.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Itens por página:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
              >
                {[5, 15, 30, 50, 100].map(limit => (
                  <option key={limit} value={limit}>{limit}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 transition-all font-bold"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 disabled:opacity-50 transition-all font-bold"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Form Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl bg-white flex flex-col">
            <PatientFormWizard
              initialData={editingPatient || {}}
              onSave={handleSavePatient}
              onCancel={() => setIsWizardOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Excluir {selectedIds.size} paciente{selectedIds.size > 1 ? 's' : ''}?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setConfirmBulkDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
                disabled={bulkDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {bulkDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {bulkDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shrink-0">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Excluir paciente</h3>
                <p className="text-xs text-slate-400 mt-0.5">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isProcessing ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-primary-600 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl font-bold shrink-0 border-2 border-white/30 overflow-hidden`}>
                    {selectedPatient.photo_url || selectedPatient.photoUrl ? (
                      <img src={getStaticUrl(selectedPatient.photo_url || selectedPatient.photoUrl)} alt={selectedPatient.full_name} className="w-full h-full object-cover" />
                    ) : (
                      (selectedPatient.full_name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="text-white">
                    <div className="text-base font-bold">{selectedPatient.full_name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive(selectedPatient) ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-400/40' : 'bg-white/20 text-white/70'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive(selectedPatient) ? 'bg-emerald-300' : 'bg-white/50'}`} />
                        {isActive(selectedPatient) ? 'Ativo' : 'Inativo'}
                      </span>
                      {selectedPatient.health_plan && (
                        <span className="text-[10px] text-indigo-100 font-medium flex items-center gap-1">
                          <Shield size={10} /> {selectedPatient.health_plan}
                        </span>
                      )}
                      {calcAge(selectedPatient.birth_date || selectedPatient.birthDate) && (
                        <span className="text-[10px] text-indigo-100 font-medium">
                          {calcAge(selectedPatient.birth_date || selectedPatient.birthDate)} anos
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedPatient(null)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Quick info grid */}
              <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-100">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Nascimento</div>
                  <div className="text-xs font-bold text-slate-800">{formatDate(selectedPatient.birth_date || selectedPatient.birthDate)}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Telefone</div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {selectedPatient.phone_country && <span className="text-base leading-none shrink-0" title={selectedPatient.phone_country}>{getFlag(selectedPatient.phone_country)}</span>}
                    {selectedPatient.whatsapp || selectedPatient.phone || '—'}
                  </div>
                  {selectedPatient.phone2 && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5 italic">
                      {selectedPatient.phone2_country && <span className="leading-none shrink-0" title={selectedPatient.phone2_country}>{getFlag(selectedPatient.phone2_country)}</span>}
                      {selectedPatient.phone2}
                    </div>
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email</div>
                  <div className="text-xs font-bold text-slate-800 truncate">{selectedPatient.email || '—'}</div>
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">CPF</div>
                  <div className="text-xs font-bold text-slate-800">{selectedPatient.cpf_cnpj || selectedPatient.cpf || '—'}</div>
                </div>
              </div>

              {/* Address if available */}
              {(selectedPatient.address || selectedPatient.city) && (
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <MapPin size={13} className="text-indigo-400 shrink-0" />
                    <span>
                      {[selectedPatient.address, selectedPatient.city, selectedPatient.state].filter(Boolean).join(', ')}
                      {selectedPatient.zip_code && ` — CEP ${selectedPatient.zip_code}`}
                    </span>
                  </div>
                </div>
              )}

              {/* Observation */}
              {selectedPatient.notes && (
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <StickyNote size={12} /> Observações / Referência
                  </div>
                  <div className="text-xs text-slate-600 bg-amber-50 border border-amber-200/60 rounded-xl p-3 leading-relaxed whitespace-pre-wrap">
                    {selectedPatient.notes}
                  </div>
                </div>
              )}

              {/* Vínculos */}
              <div className="p-5 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" />
                  Atividade do paciente
                </div>
                {summaryLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                    <Loader2 size={14} className="animate-spin text-indigo-400" /> Carregando vínculos...
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {[
                      { label: 'Agenda', value: summary?.appointmentsCount, icon: <Calendar size={14} />, color: 'text-indigo-500', bg: 'bg-indigo-50' },
                      { label: 'Prontuários', value: summary?.recordsCount, icon: <FileText size={14} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: 'Neuro', value: summary?.neuroCount, icon: <BrainCircuit size={14} />, color: 'text-primary-500', bg: 'bg-primary-50' },
                      { label: 'Formulários', value: summary?.formsCount, icon: <ClipboardList size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                      { label: 'Documentos', value: summary?.documentsCount, icon: <FolderOpen size={14} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                      { label: 'Ferramentas', value: summary?.toolsCount, icon: <Boxes size={14} />, color: 'text-rose-500', bg: 'bg-rose-50' },
                      { label: 'Notas', value: summary?.notesCount, icon: <StickyNote size={14} />, color: 'text-slate-500', bg: 'bg-slate-100' },
                    ].map(item => (
                      <div key={item.label} className={`${item.bg} rounded-xl p-2.5 text-center`}>
                        <div className={`${item.color} flex justify-center mb-1.5`}>{item.icon}</div>
                        <div className="text-base font-bold text-slate-800 leading-none">
                          {item.value === null ? <span className="text-slate-300 text-xs">—</span> : item.value}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1 leading-tight">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
                {summaryError && <p className="text-xs text-rose-500 mt-2">{summaryError}</p>}
              </div>

              {/* Upcoming appointments */}
              {(summary?.upcomingAppointments?.length ?? 0) > 0 && (
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-500" /> Próximos atendimentos
                  </div>
                  <div className="space-y-2">
                    {summary!.upcomingAppointments.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2.5">
                        <span className="font-semibold text-indigo-800">{item.label}</span>
                        <span className="text-indigo-500 font-medium">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Extra details */}
              <div className="px-5 py-4">
                <button
                  onClick={() => setShowDetails(p => !p)}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline"
                >
                  <ChevronRight size={13} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
                  {showDetails ? 'Ocultar dados completos' : 'Ver dados completos do cadastro'}
                </button>
                {showDetails && (
                  <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-xs">
                    {[
                      { label: 'RG', value: selectedPatient.rg },
                      { label: 'Profissão', value: selectedPatient.profession },
                      { label: 'Estado civil', value: selectedPatient.marital_status },
                      { label: 'Escolaridade', value: selectedPatient.education },
                      { label: 'Nacionalidade', value: selectedPatient.nationality },
                      { label: 'Convênio', value: selectedPatient.health_plan || (selectedPatient.convenio ? selectedPatient.convenio_name || 'Sim' : 'Não') },
                      { label: 'Contato emergência', value: selectedPatient.emergency_contact },
                      { label: 'Contato familiar', value: selectedPatient.family_contact },
                    ].map(row => row.value ? (
                      <div key={row.label}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{row.label}</div>
                        <div className="text-slate-700 font-semibold mt-0.5">{row.value}</div>
                      </div>
                    ) : null)}
                  </div>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/60">
              <div className="flex flex-wrap gap-2">
                {hasPermission('view_agenda') && (
                  <button
                    onClick={() => navigate(`/agenda?patient_id=${selectedPatient.id}`)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
                  >
                    <Calendar size={12} /> Agenda
                  </button>
                )}
                {[
                  { label: 'Prontuário', path: `/prontuario?patient_id=${selectedPatient.id}`, perm: 'view_medical_records' },
                  { label: 'Neuro', path: `/neurodesenvolvimento?patient_id=${selectedPatient.id}`, perm: 'neuro_access' },
                  { label: 'Formulários', path: `/formularios/lista?patient_id=${selectedPatient.id}`, perm: 'fill_forms' },
                  { label: 'Documentos', path: `/documentos?patient_id=${selectedPatient.id}`, perm: 'manage_documents' },
                  { label: 'Ferramentas', path: `/caixa-ferramentas?patient_id=${selectedPatient.id}`, perm: 'view_medical_records' },
                ].map(btn => hasPermission(btn.perm as any) && (
                  <button
                    key={btn.label}
                    onClick={() => navigate(btn.path)}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                  >
                    {btn.label}
                  </button>
                ))}
                <div className="flex-1" />
                {hasPermission('edit_patient') && (
                  <button
                    onClick={() => { setEditingPatient(selectedPatient); setSelectedPatient(null); setIsWizardOpen(true); }}
                    className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
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
                  <span className="text-[10px] text-rose-500 font-medium">já existe: {row.existingName}</span>
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
                <button
                  onClick={(e) => { e.stopPropagation(); removeRow(idx); }}
                  title="Remover da lista"
                  className="text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              );
            },
          },
        ];

        return (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ maxHeight: '90vh' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <FileUp size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Pré-visualização da Importação</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{importPreview.length} pacientes na planilha</span>
                      {dupCount > 0 && (
                        <span className="text-[11px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          {dupCount} CPF duplicado{dupCount > 1 ? 's' : ''}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => { setImportPreviewOpen(false); setImportPreview([]); setImportFile(null); }} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              {/* Table — scrollable */}
              <div className="overflow-y-auto flex-1 px-6 py-4">
                <GridTable
                  data={importPreview}
                  keyExtractor={(_) => String(importPreview.indexOf(_))}
                  columns={importColumns}
                  selectedIds={importSelectedIds}
                  onToggleSelect={(id) => { if (!importPreview[Number(id)]?.duplicate) toggleRow(id); }}
                  onToggleSelectAll={toggleAll}
                  emptyMessage="Nenhum paciente encontrado na planilha."
                />
              </div>

              {/* Alert duplicates */}
              {dupCount > 0 && (
                <div className="px-6 py-2.5 bg-rose-50 border-t border-rose-100 text-xs text-rose-600 font-medium flex items-center gap-2 shrink-0">
                  <AlertCircle size={13} />
                  Linhas com CPF duplicado não podem ser selecionadas e serão ignoradas na importação.
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0">
                <button
                  onClick={toggleAll}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setImportPreviewOpen(false); setImportPreview([]); setImportFile(null); }}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors rounded-xl hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={isImporting || selectedCount === 0}
                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-indigo-100"
                  >
                    {isImporting ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
                    Importar {selectedCount} paciente{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
