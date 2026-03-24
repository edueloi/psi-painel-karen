import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ClinicalRecord, Patient } from '../types';
import { api } from '../services/api';
import { 
  Search, Plus, User, Users,
  X, ArrowLeft, Loader2, Tag, Filter, FileText, Paperclip, Trash2,
  Calendar, ChevronRight, Link, Info, Save, Clock, Video, Activity, Package, Briefcase, UserCheck, Repeat, CheckCircle2, Layers,
  AlignLeft, AlignCenter, AlignRight, Highlighter,
  AlertCircle, FileDown
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea, Combobox } from '../components/UI/Input';
import { 
  FilterLine, 
  FilterLineSection, 
  FilterLineItem, 
  FilterLineSearch,
  FilterLineViewToggle
} from '../components/UI/FilterLine';

type RecordAttachment = {
  id?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number | null;
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const v = (status || '').toLowerCase();
  const isFinal = v === 'finalizado' || v === 'final';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border transition-all ${
        isFinal 
        ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm' 
        : 'bg-amber-50 text-amber-700 border-amber-100'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isFinal ? 'bg-indigo-600 animate-pulse' : 'bg-amber-500'}`} />
      {status}
    </span>
  );
};

const EditorSection: React.FC<{
  initialContent: string;
  onInput: (html: string) => void;
  label: string;
  onFocus: (el: HTMLDivElement) => void;
  onSelectionChange: () => void;
  isActive: boolean;
}> = React.memo(({ initialContent, onInput, label, onFocus, onSelectionChange, isActive }) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  
  // Use layout effect to set initial content only once when the component mounts
  // Since we use a unique key per record, this re-mounts correctly on record change.
  React.useLayoutEffect(() => {
    if (editorRef.current && initialContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = initialContent;
    }
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 ml-1">
        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${isActive ? 'bg-indigo-500 animate-pulse' : 'bg-slate-200'}`} />
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{label}</label>
      </div>
      <div
        ref={editorRef}
        className="min-h-[160px] p-6 rounded-[24px] border border-slate-200 bg-white text-[15px] leading-relaxed outline-none focus:ring-[4px] focus:ring-indigo-500/5 transition-all shadow-sm focus:border-indigo-300 custom-record-editor prose prose-slate max-w-none"
        contentEditable
        suppressContentEditableWarning
        onFocus={(e) => onFocus(e.currentTarget)}
        onMouseUp={onSelectionChange}
        onKeyUp={onSelectionChange}
        onInput={(e) => onInput((e.currentTarget as HTMLDivElement).innerHTML)}
      />
    </div>
  );
}, (prev, next) => {
  // Only re-render if label, isActive or the record identity (handled by key) changes.
  // We explicitly IGNORE initialContent changes after mounting to avoid resets.
  return prev.label === next.label && prev.isActive === next.isActive;
});

const PRESET_COLORS = [
    // Standar
    '#000000', '#4b5563', '#9ca3af', '#ffffff',
    // Clinical / Professional
    '#4f46e5', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6',
    // Soft / Pastel
    '#e0e7ff', '#dbeafe', '#d1fae5', '#fef3c7', '#fee2e2', '#fce7f3', '#f3e8ff', '#f1f5f9',
    // Clinical Dark
    '#312e81', '#1e3a8a', '#064e3b', '#78350f', '#7f1d1d', '#701a75', '#4c1d95', '#1e293b'
];

export const Records: React.FC = () => {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [activeTab, setActiveTab] = useState<'history' | 'reports' | 'analysis'>('history');
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit' | 'view'>('new');
  const [activeColorMenu, setActiveColorMenu] = useState<'text' | 'highlight' | null>(null);
  const [currentRecord, setCurrentRecord] = useState<Partial<ClinicalRecord> & { attachments?: RecordAttachment[] }>({});
  const editorSectionsRef = useRef({
    demand: '',
    procedures: '',
    analysis: '',
    free: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentType, setAttachmentType] = useState('');
  const [attachmentSize, setAttachmentSize] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPatientStatusOpen, setIsPatientStatusOpen] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState<string | null>(null);
  const { pushToast } = useToast();

  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorActiveRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [activeStyles, setActiveStyles] = useState<Record<string, boolean>>({});
  const appointmentIdParam = searchParams.get('appointment_id');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | number | null>(null);

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const recordTypeLabel: Record<string, string> = {
    Evolucao: 'Evolução',
    Anamnese: 'Anamnese',
    Avaliacao: 'Avaliação',
    Encaminhamento: 'Encaminhamento',
    Plano: 'Plano Terapêutico',
    Relatorio: 'Relatório',
  };

  const sectionMap: Record<string, Array<'demand' | 'procedures' | 'analysis' | 'free'>> = {
    Evolucao: ['demand', 'procedures', 'analysis'],
    Anamnese: ['demand', 'free'],
    Avaliacao: ['demand', 'procedures', 'analysis'],
    Encaminhamento: ['demand', 'analysis'],
    Plano: ['procedures', 'analysis'],
    Relatorio: ['demand', 'procedures', 'analysis', 'free']
  };

  const getVisibleSections = (type?: string) => {
    const key = type || 'Evolucao';
    return sectionMap[key] || sectionMap.Evolucao;
  };

  const buildRecordHtml = (sections: { demand: string; procedures: string; analysis: string; free: string }) => {
    return [
      `<section data-section="demand">${sections.demand || ''}</section>`,
      `<section data-section="procedures">${sections.procedures || ''}</section>`,
      `<section data-section="analysis">${sections.analysis || ''}</section>`,
      `<section data-section="free">${sections.free || ''}</section>`
    ].join('');
  };

  const parseRecordContent = (content: string) => {
    if (!content) {
      return { demand: '', procedures: '', analysis: '', free: '' };
    }
    if (!content.includes('data-section=')) {
      return { demand: content, procedures: '', analysis: '', free: '' };
    }
    try {
      const doc = new DOMParser().parseFromString(content, 'text/html');
      const grab = (key: string) => {
        const el = doc.querySelector(`section[data-section="${key}"]`);
        return el ? el.innerHTML : '';
      };
      return {
        demand: grab('demand'),
        procedures: grab('procedures'),
        analysis: grab('analysis'),
        free: grab('free')
      };
    } catch {
      return { demand: content, procedures: '', analysis: '', free: '' };
    }
  };

  const updateSection = React.useCallback((key: 'demand' | 'procedures' | 'analysis' | 'free', value: string) => {
    editorSectionsRef.current[key] = value;
  }, []);

  const storeSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    selectionRef.current = sel.getRangeAt(0);

    // Update active styles for the toolbar
    const styles: Record<string, boolean> = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      h1: String(document.queryCommandValue('formatBlock')).toLowerCase() === 'h1',
      h2: String(document.queryCommandValue('formatBlock')).toLowerCase() === 'h2',
      h3: String(document.queryCommandValue('formatBlock')).toLowerCase() === 'h3',
      unorderedList: document.queryCommandState('insertUnorderedList'),
      orderedList: document.queryCommandState('insertOrderedList'),
    };
    setActiveStyles(styles);
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel || !selectionRef.current) return;
    sel.removeAllRanges();
    sel.addRange(selectionRef.current);
  };

  const execCommand = (command: string, value?: string) => {
    // If no section focused, default to first section
    if (!editorActiveRef.current) {
        const sections = document.querySelectorAll('.custom-record-editor');
        if (sections.length > 0) {
            (sections[0] as HTMLDivElement).focus();
            editorActiveRef.current = sections[0] as HTMLDivElement;
        } else {
            return;
        }
    }
    
    editorActiveRef.current.focus();
    
    // Always call restoreSelection if we have one
    if (selectionRef.current) {
        restoreSelection();
    }
    
    document.execCommand(command, false, value);
    storeSelection(); // Refresh icons after action
  };

  const handleInsertLink = () => {
    setLinkUrl('');
    setLinkText('');
    setLinkModalOpen(true);
  };

  const confirmInsertLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    if (linkText.trim()) {
      execCommand(
        'insertHTML',
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText.trim()}</a>`
      );
    } else {
      execCommand('createLink', url);
    }
    setLinkModalOpen(false);
  };

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
        const raw = await api.get<any[]>('/patients');
        const data = (raw || []).map((p: any) => ({
            ...p,
            full_name: p.name || p.full_name || '',
            status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
        })) as Patient[];
        setPatients(data);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId && !selectedPatientId) {
      setSelectedPatientId(patientId);
    }
  }, [searchParams, selectedPatientId]);

  const fetchRecords = async (patientId: string) => {
    try {
      const data = await api.get<any[]>('/medical-records', { patient_id: patientId });
      const mapped = data.map((r) => ({
        id: String(r.id),
        patientId: String(r.patient_id),
        patientName: '',
        date: r.created_at,
        type: r.record_type,
        status: r.status,
        title: r.title,
        startTime: r.start_time || '',
        endTime: r.end_time || '',
        preview: stripHtml(String(r.content || '')).slice(0, 120),
        tags: (() => {
          if (!r.tags) return [];
          if (Array.isArray(r.tags)) return r.tags;
          try {
            return JSON.parse(r.tags);
          } catch (e) {
            return [];
          }
        })()
      })) as ClinicalRecord[];
      setRecords(mapped);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedPatientId) {
      fetchRecords(selectedPatientId);
    }
  }, [selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find(p => String(p.id) === selectedPatientId),
    [selectedPatientId, patients]
  );

  const filteredPatients = useMemo(() =>
    patients.filter(p => (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())),
  [searchTerm, patients]);

  const patientRecords = useMemo(() => 
    records
        .filter(r => r.patientId === selectedPatientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [records, selectedPatientId]);

  const recordStats = useMemo(() => {
      if (patientRecords.length === 0) return { total: 0, lastDate: null as string | null };
      return { total: patientRecords.length, lastDate: patientRecords[0].date };
  }, [patientRecords]);

  const filteredRecords = useMemo(() => {
      const q = recordSearch.trim().toLowerCase();
      return patientRecords.filter(r => {
          const matchesText = !q || (r.title || '').toLowerCase().includes(q) || (r.preview || '').toLowerCase().includes(q);
          const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'draft' && r.status === 'Rascunho') ||
            (statusFilter === 'final' && r.status === 'Finalizado');
          return matchesText && matchesStatus;
      });
  }, [patientRecords, recordSearch, statusFilter]);

  const handlePatientSelect = (id: string) => {
      setSelectedPatientId(String(id));
      setIsMobileListVisible(false);
  };

  const handleNewRecord = () => {
      if (!selectedPatient) return;
      setEditorMode('new');
      setCurrentRecord({
          patientId: selectedPatient.id,
          patientName: selectedPatient.full_name,
          date: new Date().toISOString(),
          type: 'Evolucao',
          status: 'Rascunho',
          appointment_id: appointmentIdParam ? Number(appointmentIdParam) : undefined,
          title: `Sessão - ${new Date().toLocaleDateString()}`,
          startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: '',
          tags: [],
          attachments: []
      });
      editorSectionsRef.current = { demand: '', procedures: '', analysis: '', free: '' };
      setTagInput('');
      setAttachmentName('');
      setAttachmentUrl('');
      setAttachmentType('');
      setAttachmentSize('');
      setIsEditorOpen(true);
  };

  const handleOpenRecord = async (recordId: string) => {
      try {
          const data = await api.get<any>(`/medical-records/${recordId}`);
          const tags = (() => {
              if (!data.tags) return [];
              if (Array.isArray(data.tags)) return data.tags;
              try {
                  return JSON.parse(data.tags);
              } catch (e) {
                  return [];
              }
          })();
          const attachments = Array.isArray(data.attachments)
            ? data.attachments.map((a: any) => ({
                id: String(a.id),
                file_name: a.file_name,
                file_url: a.file_url,
                file_type: a.file_type || undefined,
                file_size: a.file_size ?? null
              }))
            : [];

          setEditorMode('edit');
          setCurrentRecord({
              id: String(data.id),
              patientId: String(data.patient_id),
              patientName: selectedPatient?.full_name || '',
              date: data.created_at,
              type: data.record_type,
              status: data.status,
              title: data.title,
              startTime: data.start_time || '',
              endTime: data.end_time || '',
              tags,
              attachments
          });
          editorSectionsRef.current = parseRecordContent(String(data.content || ''));
          setTagInput(tags.join(', '));
          setAttachmentName('');
          setAttachmentUrl('');
          setAttachmentType('');
          setAttachmentSize('');
          setIsEditorOpen(true);
      } catch (e) {
          console.error(e);
      }
  };

  const handleAddAttachment = () => {
      if (!attachmentUrl.trim()) return;
      const next: RecordAttachment = {
          file_name: attachmentName.trim() || 'Arquivo',
          file_url: attachmentUrl.trim(),
          file_type: attachmentType.trim() || undefined,
          file_size: attachmentSize ? Number(attachmentSize) : null
      };
      const current = currentRecord.attachments || [];
      setCurrentRecord({ ...currentRecord, attachments: [...current, next] });
      setAttachmentName('');
      setAttachmentUrl('');
      setAttachmentType('');
      setAttachmentSize('');
  };

  const appendAttachment = (next: RecordAttachment) => {
      const current = currentRecord.attachments || [];
      setCurrentRecord({ ...currentRecord, attachments: [...current, next] });
  };

  const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
  });

  const uploadFile = async (file: File) => {
      const dataUrl = await fileToDataUrl(file);
      const request = await api.post<{ id: number }>('/uploads/request', {
          file_name: file.name,
          file_type: file.type || null,
          file_size: file.size || null,
          patient_id: selectedPatientId || null
      });
      await api.put(`/uploads/${request.id}/confirm`, {
          file_url: dataUrl,
          status: 'uploaded',
          patient_id: selectedPatientId || null
      });
      appendAttachment({
          file_name: file.name,
          file_url: dataUrl,
          file_type: file.type || undefined,
          file_size: file.size
      });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []) as File[];
      if (!files.length) return;
      setIsUploading(true);
      setUploadError(null);
      try {
          for (const file of files) {
              if (file instanceof File) {
                  await uploadFile(file);
              }
          }
      } catch (e) {
          console.error(e);
          setUploadError('Erro ao enviar arquivo');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleRemoveAttachment = (index: number) => {
      const current = currentRecord.attachments || [];
      const next = current.filter((_, i) => i !== index);
      setCurrentRecord({ ...currentRecord, attachments: next });
  };

  const handlePatientStatusChange = async (newStatus: 'active' | 'inactive') => {
      if (!selectedPatient) return;
      try {
          await api.put(`/patients/${selectedPatient.id}`, {
              ...selectedPatient,
              status: newStatus,
              birth_date: selectedPatient.birth_date || null
          });
          await fetchPatients();
          setIsPatientStatusOpen(false);
      } catch (e) {
          console.error(e);
          pushToast('error', 'Erro ao mudar status do paciente');
      }
  };

  const toggleRecordStatus = async (record: ClinicalRecord) => {
      setIsChangingStatus(record.id);
      try {
          const newStatus = record.status === 'Finalizado' ? 'Rascunho' : 'Finalizado';
          const fullData = await api.get<any>(`/medical-records/${record.id}`);
          await api.put(`/medical-records/${record.id}`, {
              ...fullData,
              status: newStatus
          });
          await fetchRecords(selectedPatientId!);
      } catch (e) {
          console.error(e);
          pushToast('error', 'Erro ao mudar status do registro');
      } finally {
          setIsChangingStatus(null);
      }
  };

  const handleDeleteRecord = (id: string | number) => {
    setRecordToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    try {
        await api.delete(`/medical-records/${recordToDelete}`);
        pushToast('success', 'Registro excluído com sucesso.');
        if (selectedPatientId) fetchRecords(selectedPatientId);
        setIsEditorOpen(false);
        setIsDeleteModalOpen(false);
        setRecordToDelete(null);
    } catch (e: any) {
        pushToast('error', e.message || 'Erro ao excluir registro');
    }
  };

  const handleSaveRecord = async () => {
      if (!selectedPatient) return;
      try {
          const tags = tagInput
              .split(',')
              .map(t => t.trim())
              .filter(Boolean);
          const payload = {
              patient_id: selectedPatient.id,
              appointment_id: currentRecord.appointment_id || (appointmentIdParam ? Number(appointmentIdParam) : null),
              record_type: currentRecord.type || 'Evolucao',
              status: currentRecord.status || 'Rascunho',
              title: currentRecord.title || `Sessão - ${new Date().toLocaleDateString()}`,
              start_time: currentRecord.startTime || null,
              end_time: currentRecord.endTime || null,
              content: buildRecordHtml(editorSectionsRef.current),
              tags,
              attachments: currentRecord.attachments || []
          };

          if (editorMode === 'edit' && currentRecord.id) {
              await api.put(`/medical-records/${currentRecord.id}`, payload);
          } else {
              await api.post('/medical-records', payload);
          }
          await fetchRecords(selectedPatient.id);
          setIsEditorOpen(false);
          pushToast('success', 'Prontuário salvo com sucesso!');
      } catch (e: any) {
          pushToast('error', e.message || 'Erro ao salvar prontuario');
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-slate-50 overflow-hidden animate-fadeIn">
      <style>{`
        .custom-record-editor b, .custom-record-editor strong { font-weight: 900 !important; }
        .custom-record-editor i, .custom-record-editor em { font-style: italic !important; }
        .custom-record-editor u { text-decoration: underline !important; }
        .custom-record-editor h1 { font-size: 1.875rem !important; font-weight: 900 !important; margin-top: 1.5rem !important; margin-bottom: 1rem !important; color: #1e293b !important; }
        .custom-record-editor h2 { font-size: 1.5rem !important; font-weight: 900 !important; margin-top: 1.25rem !important; margin-bottom: 0.75rem !important; color: #1e293b !important; }
        .custom-record-editor h3 { font-size: 1.25rem !important; font-weight: 800 !important; margin-top: 1rem !important; margin-bottom: 0.5rem !important; color: #334155 !important; }
        .custom-record-editor ul { list-style-type: disc !important; padding-left: 2rem !important; margin: 1rem 0 !important; }
        .custom-record-editor ol { list-style-type: decimal !important; padding-left: 2rem !important; margin: 1rem 0 !important; }
        .custom-record-editor li { margin-bottom: 0.5rem !important; }
        .custom-record-editor a { color: #4f46e5 !important; text-decoration: underline !important; font-weight: 600 !important; }
      `}</style>

      {/* HEADER SECTION - Estilo Caixa de Ferramentas */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                  <FileText size={20} />
              </div>
              <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">{t('records.title')}</h1>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Gestão de Evoluções e Documentos Clínicos</p>
              </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200">
              <button 
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 ring-4 ring-indigo-50/10' : 'text-slate-500 hover:bg-white/50'}`}
              >
                  Histórico Clínico
              </button>
              <button 
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reports' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 ring-4 ring-indigo-50/10' : 'text-slate-500 hover:bg-white/50'}`}
              >
                  Relatórios
              </button>
              <button 
                onClick={() => setActiveTab('analysis')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'analysis' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200 ring-4 ring-indigo-50/10' : 'text-slate-500 hover:bg-white/50'}`}
              >
                  Análise de Dados
              </button>
          </div>
      </div>

      {activeTab === 'history' ? (
        <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR - PACIENTES */}
        <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col transition-all z-20 ${isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
            <div className="p-4 bg-slate-50/50 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Users size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listagem de Pacientes</span>
                </div>
                <FilterLineSearch 
                    placeholder={t('records.search')}
                    value={searchTerm}
                    onChange={setSearchTerm}
                />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 bg-white">
                {isLoading ? (
                    <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-400" /></div>
                ) : filteredPatients.map(patient => {
                    const pid = String(patient.id);
                    const isSelected = selectedPatientId === pid;
                    return (
                    <button 
                        key={pid} 
                        onClick={() => handlePatientSelect(pid)} 
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${isSelected ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 active:scale-95' : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-100'}`}
                    >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-all ${isSelected ? 'bg-white/20 text-white rotate-6' : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:rotate-6 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                            {(patient.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`font-black text-[11px] truncate uppercase tracking-tighter ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                                {patient.full_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${patient.status === 'ativo' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                                <p className={`text-[8px] font-black uppercase tracking-[0.15em] opacity-80 ${isSelected ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {patient.status}
                                </p>
                            </div>
                        </div>
                        {isSelected && <ChevronRight size={14} className="text-white/40" />}
                    </button>
                )})}
            </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={`flex-1 flex flex-col bg-slate-50 relative ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {selectedPatient ? (
              <>
                  <div className="bg-white border-b border-slate-200 p-5 flex flex-col gap-5 shadow-sm">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <button onClick={() => setIsMobileListVisible(true)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
                              
                              <div className="p-1 bg-slate-100 rounded-3xl flex items-center gap-4 pr-6 border border-slate-200 shadow-inner group/pinfo transition-all hover:bg-slate-200/50">
                                  <div className="w-12 h-12 rounded-[22px] bg-white flex items-center justify-center text-lg font-black text-indigo-600 border border-slate-200 shadow-sm transform -rotate-3 group-hover/pinfo:rotate-0 transition-all">
                                    {(selectedPatient.full_name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate max-w-[200px]">{selectedPatient.full_name}</h2>
                                    <div className="flex items-center gap-2 mt-0.5 relative">
                                        <button 
                                            onClick={() => setIsPatientStatusOpen(!isPatientStatusOpen)}
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${selectedPatient.status === 'ativo' || selectedPatient.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                        >
                                            <span className={`w-1 h-1 rounded-full ${selectedPatient.status === 'ativo' || selectedPatient.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {selectedPatient.status}
                                        </button>
                                        
                                        {isPatientStatusOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[60] animate-fadeIn">
                                                <button onClick={() => handlePatientStatusChange('active')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-800 transition-all text-left group">
                                                    <span className="text-[10px] font-black uppercase">Ativar Paciente</span>
                                                    <CheckCircle2 size={12} className="text-emerald-500 opacity-0 group-hover:opacity-100" />
                                                </button>
                                                <button onClick={() => handlePatientStatusChange('inactive')} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-rose-50 text-slate-600 transition-all text-left">
                                                    <span className="text-[10px] font-black uppercase">Desativar</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                             {hasPermission('create_medical_record') && (
                                  <Button 
                                    onClick={handleNewRecord} 
                                    variant="primary"
                                    className="!rounded-2xl !bg-indigo-600 !shadow-lg !shadow-indigo-100 !px-6 !h-12 !text-[11px] !font-black !uppercase !tracking-[0.15em] hover:scale-105 active:scale-95 transition-all"
                                    icon={<Plus size={18} />}
                                  >
                                    Novo Atendimento
                                  </Button>
                             )}
                          </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
                         <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100/50 px-3 py-2 rounded-xl shrink-0">
                              <div className="p-1 bg-white rounded-lg text-indigo-500 shadow-xs border border-indigo-100"><FileText size={12} /></div>
                              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">{recordStats.total} Registros</span>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 px-3 py-2 rounded-xl shrink-0">
                              <div className="p-1 bg-white rounded-lg text-slate-400 shadow-xs border border-slate-100"><Calendar size={12} /></div>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Último: {recordStats.lastDate ? new Date(recordStats.lastDate).toLocaleDateString() : '--'}</span>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-64 group/search">
                               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors"><Search size={14}/></div>
                               <input 
                                 type="text"
                                 placeholder="Filtrar histórico..."
                                 value={recordSearch}
                                 onChange={e => setRecordSearch(e.target.value)}
                                 className="w-full h-10 pl-9 pr-4 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 placeholder:text-slate-400 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none"
                               />
                            </div>
                            <select 
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value as any)}
                                className="h-10 px-4 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase tracking-widest outline-none focus:bg-white focus:border-indigo-400 transition-all cursor-pointer"
                            >
                                <option value="all">TODOS</option>
                                <option value="draft">RASCUNHOS</option>
                                <option value="final">FINALIZADOS</option>
                            </select>
                         </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 md:p-10 custom-scrollbar">
                      <div className="max-w-4xl mx-auto relative space-y-6 md:space-y-10 pl-4 md:pl-10 before:absolute before:left-[17px] md:before:left-[35px] before:top-2 before:h-full before:w-0.5 before:bg-slate-200/40 before:rounded-full">
                          {filteredRecords.map((record) => (
                              <div 
                                key={record.id} 
                                className="relative group/record"
                              >
                                  {/* Timeline Indicator */}
                                  <div className={`absolute -left-[23px] md:-left-[47px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-all group-hover/record:scale-125 ${record.status === 'Finalizado' || record.status === 'Final' ? 'bg-indigo-500' : 'bg-amber-400'}`} />
                                  
                                  <div 
                                    className="bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/5 group/card cursor-pointer"
                                    onClick={() => handleOpenRecord(record.id)}
                                  >
                                      <div className="flex flex-col gap-6">
                                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                              <div className="space-y-1 min-w-0">
                                                  <div className="flex items-center gap-3 flex-wrap">
                                                      <h3 className="text-lg font-black text-slate-900 leading-tight group-hover/card:text-indigo-600 transition-colors truncate">{record.title}</h3>
                                                      <StatusBadge status={record.status} />
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-wrap">
                                                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100/50">
                                                        <Calendar size={12} className="text-indigo-400" />
                                                        {new Date(record.date).toLocaleDateString()}
                                                      </div>
                                                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100/50">
                                                        <Tag size={12} className="text-indigo-400" />
                                                        {recordTypeLabel[record.type] || record.type}
                                                      </div>
                                                  </div>
                                              </div>
                                              {hasPermission('edit_medical_record') && (
                                                  <Button 
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); handleOpenRecord(record.id); }}
                                                    icon={<ChevronRight size={16} />}
                                                  >
                                                    Detalhes
                                                  </Button>
                                              )}
                                          </div>

                                          <div className="relative">
                                              <div className="prose prose-slate max-w-none text-slate-600 text-sm leading-relaxed line-clamp-3 font-medium">
                                                  <div dangerouslySetInnerHTML={{ __html: record.content }} />
                                              </div>
                                              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
                                          </div>

                                          {record.tags && record.tags.length > 0 && (
                                              <div className="flex flex-wrap gap-2">
                                                  {record.tags.map(tag => (
                                                      <span key={tag} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-indigo-100/50">
                                                          {tag}
                                                      </span>
                                                  ))}
                                              </div>
                                          )}

                                          {record.attachments && record.attachments.length > 0 && (
                                              <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-50">
                                                  {record.attachments.map((att, idx) => (
                                                      <a
                                                          key={`${att.file_url}-${idx}`}
                                                          href={att.file_url}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          onClick={(e) => e.stopPropagation()}
                                                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-100 rounded-xl transition-all group/att"
                                                      >
                                                          <Paperclip size={12} className="text-slate-400 group-hover/att:text-indigo-500" />
                                                          <span className="text-[10px] font-bold text-slate-600 group-hover/att:text-indigo-700 truncate max-w-[150px]">{att.file_name}</span>
                                                      </a>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {filteredRecords.length === 0 && (
                              <div className="py-20 text-center text-slate-400 italic">
                                  {patientRecords.length === 0 ? t('records.empty') : 'Nenhum registro encontrado para o filtro.'}
                              </div>
                          )}
                      </div>
                  </div>
              </>
          ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center p-8 bg-slate-50/50">
                      <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 border border-slate-100 shadow-sm transition-transform hover:scale-105 active:scale-95">
                          <FileText size={32} className="text-indigo-400" />
                      </div>
                      <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-widest">{t('records.select')}</h2>
                      <p className="text-[12px] font-bold max-w-xs text-slate-400 mt-2 uppercase tracking-wide">{t('records.selectDesc')}</p>
                  </div>
              )}
        </div>
      </div>
      ) : activeTab === 'reports' ? (
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50 animate-fadeIn custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-indigo-100/50 rounded-xl text-indigo-600"><FileDown size={18} /></div>
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Central de Relatórios Clínicos</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 group-hover:scale-110 transition-transform">
                            <FileDown size={24} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Relatório Evolutivo</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">Gere um documento consolidado com todas as evoluções do paciente em um período específico.</p>
                        <Button variant="ghost" className="!text-indigo-600 !font-black !text-[10px] !uppercase !tracking-widest !px-0">Configurar Relatório &rarr;</Button>
                    </div>
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all group cursor-pointer">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                            <Activity size={24} />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2">Sumário Clínico</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-6">Documento resumido contendo queixa principal, diagnóstico e plano terapêutico atual.</p>
                        <Button variant="ghost" className="!text-emerald-600 !font-black !text-[10px] !uppercase !tracking-widest !px-0">Gerar Sumário &rarr;</Button>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-10 bg-slate-50 animate-fadeIn">
            <div className="bg-white p-12 rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 text-center max-w-lg">
                <div className="w-20 h-20 bg-indigo-600 rounded-[30px] flex items-center justify-center text-white mx-auto mb-8 shadow-lg shadow-indigo-100 animate-pulse">
                    <Layers size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-4">Análise em Processamento</h2>
                <p className="text-[13px] text-slate-500 leading-relaxed font-semibold">
                    Estamos preparando o motor de análise estatística para este paciente. Em breve você terá acesso a gráficos de evolução e métricas de engajamento baseadas nos prontuários.
                </p>
                <div className="mt-10 flex flex-col gap-3">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(79,70,229,0.5)]"></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Otimizando banco de dados clínico...</span>
                </div>
            </div>
        </div>
      )}

      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={editorMode === 'new' ? t('records.editor.new') : t('records.editor.edit')}
        subtitle={selectedPatient?.full_name || ''}
        maxWidth="5xl"
        fullHeight
        padding="none"
        footer={
          <div className="flex w-full items-center justify-between">
            <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
              <Info size={14} className="text-amber-400" />
              O registro será salvo com a data atual.
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {editorMode === 'edit' && currentRecord.id && (
                <Button
                  variant="softDanger"
                  size="sm"
                  onClick={() => handleDeleteRecord(currentRecord.id!)}
                  icon={<Trash2 size={14} />}
                >
                  Excluir
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsEditorOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveRecord}
                icon={<Save size={14} />}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col h-full bg-slate-50/30">
          {/* Row de Inputs */}
          <div className="px-6 py-5 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            <Input
              label="Título do Registro"
              value={currentRecord.title || ''}
              onChange={e => setCurrentRecord({ ...currentRecord, title: e.target.value })}
              placeholder="Ex: Sessão de acompanhamento"
              required
            />
            <Select
              label="Documento"
              value={currentRecord.type || 'Evolucao'}
              onChange={e => setCurrentRecord({ ...currentRecord, type: e.target.value })}
            >
              <option value="Evolucao">Evolução</option>
              <option value="Anamnese">Anamnese</option>
              <option value="Avaliacao">Avaliação</option>
              <option value="Encaminhamento">Encaminhamento</option>
              <option value="Plano">Plano Terapêutico</option>
              <option value="Relatorio">Relatório</option>
            </Select>
            <Select
              label="Status"
              value={currentRecord.status || 'Rascunho'}
              onChange={e => setCurrentRecord({ ...currentRecord, status: e.target.value })}
            >
              <option value="Rascunho">Rascunho</option>
              <option value="Finalizado">Finalizado</option>
            </Select>
            <Input
              label="Início"
              type="time"
              icon={<Clock size={14} />}
              value={currentRecord.startTime || ''}
              onChange={e => setCurrentRecord({ ...currentRecord, startTime: e.target.value })}
            />
            <Input
              label="Término"
              type="time"
              icon={<Clock size={14} />}
              value={currentRecord.endTime || ''}
              onChange={e => setCurrentRecord({ ...currentRecord, endTime: e.target.value })}
            />
            <div className="md:col-span-1">
              <Input
                label="Tags (separadas por vírgula)"
                icon={<Tag size={14} />}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Ansiedade, TCC, Emocional"
              />
            </div>
          </div>

          {/* Área do Editor com Toolbar */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-8 pb-10">
              <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-0 z-20">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mr-2 border-r border-slate-100 hidden sm:block">Toolbar</div>
                {[
                  { cmd: 'bold', label: 'B', cls: 'font-black', key: 'bold' },
                  { cmd: 'italic', label: 'I', cls: 'italic', key: 'italic' },
                  { cmd: 'underline', label: 'U', cls: 'underline', key: 'underline' },
                  { cmd: 'formatBlock', val: 'H1', label: 'H1', cls: 'font-black', key: 'h1' },
                  { cmd: 'formatBlock', val: 'H2', label: 'H2', cls: 'font-black', key: 'h2' },
                  { cmd: 'formatBlock', val: 'H3', label: 'H3', cls: 'font-black', key: 'h3' },
                  { cmd: 'insertUnorderedList', label: '• Lista', cls: '', key: 'unorderedList' },
                  { cmd: 'insertOrderedList', label: '1. Lista', cls: '', key: 'orderedList' },
                ].map(btn => {
                  const isActive = activeStyles[btn.key];
                  return (
                    <button
                      key={btn.cmd + (btn.val || '')}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => execCommand(btn.cmd, btn.val)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border shadow-sm ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100 scale-105 ring-4 ring-indigo-50'
                          : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                      } ${btn.cls}`}
                    >
                      {btn.label}
                    </button>
                  );
                })}
                <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                  <button 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => execCommand('justifyLeft')} 
                    className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all hover:shadow-sm"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => execCommand('justifyCenter')} 
                    className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all hover:shadow-sm"
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button 
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => execCommand('justifyRight')} 
                    className="p-1.5 hover:bg-white rounded-lg text-slate-500 transition-all hover:shadow-sm"
                  >
                    <AlignRight size={14} />
                  </button>
                </div>
                <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                <div className="flex items-center gap-1.5 px-2 border-r border-slate-100 relative">
                   <div className="relative">
                       <button 
                        title="Cor do Texto"
                        onClick={() => setActiveColorMenu(activeColorMenu === 'text' ? null : 'text')}
                        className={`p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors border ${activeColorMenu === 'text' ? 'bg-slate-100 border-slate-200 shadow-inner' : 'border-transparent'}`}
                       >
                         <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ background: 'linear-gradient(to right, #4f46e5, #ef4444, #f59e0b)' }} />
                       </button>

                       {activeColorMenu === 'text' && (
                           <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] w-[200px] grid grid-cols-5 gap-1.5 animate-fadeIn">
                               {PRESET_COLORS.map(color => (
                                   <button 
                                    key={color}
                                    style={{ backgroundColor: color }}
                                    onClick={() => { execCommand('foreColor', color); setActiveColorMenu(null); }}
                                    className="w-7 h-7 rounded-lg border border-slate-100 hover:scale-110 transition-transform shadow-sm"
                                   />
                               ))}
                           </div>
                       )}
                   </div>

                   <div className="relative">
                       <button 
                        title="Marcador"
                        onClick={() => setActiveColorMenu(activeColorMenu === 'highlight' ? null : 'highlight')}
                        className={`p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors border ${activeColorMenu === 'highlight' ? 'bg-slate-100 border-slate-200 shadow-inner' : 'border-transparent'}`}
                       >
                         <Highlighter size={16} className="text-amber-500" />
                       </button>

                       {activeColorMenu === 'highlight' && (
                           <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[60] w-[200px] grid grid-cols-5 gap-1.5 animate-fadeIn">
                               {PRESET_COLORS.map(color => (
                                   <button 
                                    key={color}
                                    style={{ backgroundColor: color }}
                                    onClick={() => { execCommand('hiliteColor', color); setActiveColorMenu(null); }}
                                    className="w-7 h-7 rounded-lg border border-slate-100 hover:scale-110 transition-transform shadow-sm"
                                   />
                               ))}
                           </div>
                       )}
                   </div>
                </div>
                <Button
                  variant="ghost"
                  size="xs"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleInsertLink}
                  icon={<Link size={13} />}
                >
                  Link
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {getVisibleSections(currentRecord.type).map(key => {
                  const labels: Record<string, string> = {
                    demand: 'Descrição da Demanda',
                    procedures: 'Procedimentos e Intervenções',
                    analysis: 'Análise e Conclusão',
                    free: 'Texto Complementar'
                  };
                  return (
                    <EditorSection
                      key={`${key}-${currentRecord.id || 'new'}`}
                      label={labels[key]}
                      initialContent={editorSectionsRef.current[key as keyof typeof editorSectionsRef.current]}
                      onInput={(html) => updateSection(key as any, html)}
                      onFocus={(el) => { editorActiveRef.current = el; storeSelection(); }}
                      onSelectionChange={storeSelection}
                      isActive={editorActiveRef.current?.parentElement?.contains(document.activeElement) || false}
                    />
                  );
                })}
              </div>

              {/* Seção de Anexos */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-[11px] font-black text-slate-800 uppercase tracking-widest">
                    <Paperclip size={16} className="text-indigo-600" />
                    Arquivos Anexos
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploading}
                    loadingText="Enviando..."
                    icon={<Plus size={14} />}
                  >
                    Adicionar Arquivo
                  </Button>
                  <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelect} />
                </div>

                {uploadError && <div className="text-xs font-bold text-red-600 mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{uploadError}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(currentRecord.attachments || []).map((att, idx) => (
                    <div key={`${att.file_url}-${idx}`} className="flex items-center justify-between gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl px-4 py-4 group/att hover:bg-slate-50 transition-colors">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-slate-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-extrabold text-slate-800 text-xs truncate">{att.file_name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{att.file_type || 'ARQUIVO'} {att.file_size ? `· ${Math.round(att.file_size / 1024)} KB` : ''}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-2 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(currentRecord.attachments || []).length === 0 && (
                    <div className="sm:col-span-2 py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-2 shadow-sm">
                        <Paperclip size={18} className="text-slate-300" />
                      </div>
                      <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Nenhum anexo encontrado</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        title="Inserir Link"
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLinkModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={confirmInsertLink}>Inserir</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="URL"
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            required
          />
          <Input
            label="Texto (opcional)"
            placeholder="Clique aqui"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirmar Exclusão"
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={confirmDeleteRecord}>Excluir Permanentemente</Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center p-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-2">Excluir Registro?</h3>
          <p className="text-[13px] text-slate-500 font-semibold leading-relaxed">
            Deseja realmente excluir este registro permanentemente? Esta ação não pode ser desfeita e todos os dados serão perdidos.
          </p>
        </div>
      </Modal>

    </div>
  );
};
