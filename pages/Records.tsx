import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ClinicalRecord, Patient } from '../types';
import { api } from '../services/api';
import { 
  Search, Plus, User, 
  X, ArrowLeft, Loader2, Tag, Filter, FileText, Paperclip, Trash2,
  Calendar, ChevronRight, Link, Info, Save, Clock, Video, Activity, Package, Briefcase, UserCheck, Repeat, CheckCircle2, Layers,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';

type RecordAttachment = {
  id?: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size?: number | null;
};

const SectionCard: React.FC<{
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  }> = ({ title, subtitle, icon, right, children, className }) => (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-extrabold text-slate-900">{title}</h3>
          </div>
          {subtitle && <p className="text-xs font-bold text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

  const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
    const v = (status || '').toLowerCase();
    const isFinal = v === 'finalizado' || v === 'final';
    return (
      <span
        className={[
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide border',
          isFinal ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100',
        ].join(' ')}
      >
        <span className={['h-1.5 w-1.5 rounded-full', isFinal ? 'bg-indigo-600' : 'bg-amber-500'].join(' ')} />
        {status}
      </span>
    );
  };

export const Records: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [recordSearch, setRecordSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [records, setRecords] = useState<ClinicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit' | 'view'>('new');
  const [currentRecord, setCurrentRecord] = useState<Partial<ClinicalRecord> & { attachments?: RecordAttachment[] }>({});
  const [editorSections, setEditorSections] = useState({
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
  const [toasts, setToasts] = useState<{id: number, type: 'success' | 'error', message: string}[]>([]);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorActiveRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

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

  const updateSection = (key: 'demand' | 'procedures' | 'analysis' | 'free', value: string) => {
    setEditorSections(prev => ({ ...prev, [key]: value }));
  };

  const storeSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    selectionRef.current = sel.getRangeAt(0);
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (!sel || !selectionRef.current) return;
    sel.removeAllRanges();
    sel.addRange(selectionRef.current);
  };

  const execCommand = (command: string, value?: string) => {
    if (!editorActiveRef.current) return;
    editorActiveRef.current.focus();
    restoreSelection();
    document.execCommand(command, false, value);
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
          title: `Sessão - ${new Date().toLocaleDateString()}`,
          tags: [],
          attachments: []
      });
      setEditorSections({ demand: '', procedures: '', analysis: '', free: '' });
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
              tags,
              attachments
          });
          setEditorSections(parseRecordContent(String(data.content || '')));
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
          file_size: file.size || null
      });
      await api.put(`/uploads/${request.id}/confirm`, {
          file_url: dataUrl,
          status: 'uploaded'
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

  const handleSaveRecord = async () => {
      if (!selectedPatient) return;
      try {
          const tags = tagInput
              .split(',')
              .map(t => t.trim())
              .filter(Boolean);
          const payload = {
              patient_id: selectedPatient.id,
              record_type: currentRecord.type || 'Evolucao',
              status: currentRecord.status || 'Rascunho',
              title: currentRecord.title || `Sessão - ${new Date().toLocaleDateString()}`,
              content: buildRecordHtml(editorSections),
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
      } catch (e: any) {
          pushToast('error', e.message || 'Erro ao salvar prontuario');
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-[24px] border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
      
      <div className={`w-full md:w-80 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col transition-all ${isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-5 border-b border-slate-200 bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                    <User size={16} className="text-white" /> 
                </div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-widest">{t('records.title')}</h2>
              </div>
              <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                    type="text" 
                    placeholder={t('records.search')} 
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-100 outline-none transition-all" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                  />
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {isLoading ? (
                  <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-400" /></div>
              ) : filteredPatients.map(patient => {
                  const pid = String(patient.id);
                  const isSelected = selectedPatientId === pid;
                  return (
                  <button 
                    key={pid} 
                    onClick={() => handlePatientSelect(pid)} 
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left group ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 ring-2 ring-indigo-50' : 'hover:bg-white hover:shadow-sm text-slate-600 hover:border-slate-300 border border-transparent'}`}
                  >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm transition-transform group-hover:scale-105 ${isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-100'}`}>
                        {(patient.full_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-extrabold text-sm truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                            {patient.full_name}
                        </p>
                        <p className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            {patient.status}
                        </p>
                      </div>
                  </button>
              )})}
          </div>
      </div>

      <div className={`flex-1 flex flex-col bg-slate-50/30 relative ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {selectedPatient ? (
              <>
                  <div className="bg-white border-b border-slate-200 p-6 z-10 flex flex-col gap-6">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-5">
                              <button onClick={() => setIsMobileListVisible(true)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><ArrowLeft size={20} /></button>
                              <div className="flex items-center gap-4">
                                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-xl font-black text-indigo-600 border border-indigo-100 shadow-sm transition-transform hover:scale-105">
                                    {(selectedPatient.full_name || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <h2 className="text-xl font-extrabold text-slate-900 leading-none">{selectedPatient.full_name}</h2>
                                    <div className="flex items-center gap-2 mt-2 relative">
                                        <button 
                                            onClick={() => setIsPatientStatusOpen(!isPatientStatusOpen)}
                                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all hover:ring-4 hover:ring-slate-100 ${selectedPatient.status === 'ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${selectedPatient.status === 'ativo' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                            {selectedPatient.status}
                                            < ChevronRight size={10} className={`ml-1 transition-transform ${isPatientStatusOpen ? 'rotate-90' : ''}`} />
                                        </button>

                                        {isPatientStatusOpen && (
                                            <div className="absolute top-full left-0 mt-2 w-44 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[60] animate-in fade-in zoom-in duration-200">
                                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2">Mudar Status</div>
                                                <button 
                                                    onClick={() => handlePatientStatusChange('active')}
                                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-all text-left"
                                                >
                                                    <span className="text-[11px] font-bold">Ativo</span>
                                                    {selectedPatient.status === 'ativo' && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                </button>
                                                <button 
                                                    onClick={() => handlePatientStatusChange('inactive')}
                                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-600 transition-all text-left"
                                                >
                                                    <span className="text-[11px] font-bold">Inativo</span>
                                                    {selectedPatient.status === 'inativo' && <CheckCircle2 size={14} className="text-slate-400" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                  </div>
                              </div>
                          </div>
                          <button onClick={handleNewRecord} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95"><Plus size={16} /> {t('records.new')}</button>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-4">
                              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                                <FileText size={14} className="text-indigo-500" /> 
                                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">{recordStats.total} {t('nav.records')}</span>
                              </div>
                              {recordStats.lastDate && (
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Atualizado em {new Date(recordStats.lastDate).toLocaleDateString()}
                                  </div>
                              )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                  <input
                                    type="text"
                                    placeholder="Buscar no histórico..."
                                    className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                    value={recordSearch}
                                    onChange={e => setRecordSearch(e.target.value)}
                                  />
                              </div>
                              <div className="relative">
                                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                  <select
                                    className="w-full sm:w-48 pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none appearance-none cursor-pointer"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'final')}
                                  >
                                      <option value="all">TODOS OS STATUS</option>
                                      <option value="draft">RASCUNHOS</option>
                                      <option value="final">FINALIZADOS</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 md:p-10 custom-scrollbar">
                      <div className="max-w-4xl mx-auto relative space-y-6 md:space-y-10 pl-4 md:pl-10 before:absolute before:left-[17px] md:before:left-[35px] before:top-2 before:h-full before:w-0.5 before:bg-slate-200/40 before:rounded-full">
                          {filteredRecords.map((record) => (
                              <div key={record.id} className="relative group animate-[slideUpFade_0.3s_source-out]">
                                  <div className={`absolute -left-[23px] md:-left-[47px] top-5 md:top-6 w-4 md:h-5 md:w-5 h-4 rounded-full border-[3px] md:border-[4px] border-white shadow-sm z-10 transition-transform group-hover:scale-110 ${record.status === 'Finalizado' ? 'bg-indigo-600' : 'bg-amber-400'}`}></div>
                                  
                                  <div
                                    className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 p-4 md:p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-50/50 transition-all cursor-pointer group/card"
                                    onClick={() => handleOpenRecord(record.id)}
                                  >
                                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4">
                                          <div className="min-w-0">
                                              <h3 className="font-extrabold text-slate-900 text-sm md:text-base group-hover/card:text-indigo-600 transition-colors truncate">{record.title}</h3>
                                              <div className="flex items-center gap-2 mt-1">
                                                <Calendar size={12} className="text-slate-400" />
                                                <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(record.date).toLocaleString()}</span>
                                              </div>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                                              <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest">{recordTypeLabel[record.type] || record.type}</span>
                                              
                                              <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleRecordStatus(record);
                                                }}
                                                disabled={isChangingStatus === record.id}
                                                className="group/status"
                                              >
                                                  <StatusBadge status={record.status} />
                                                  {record.status === 'Rascunho' && (
                                                      <span className="hidden group-hover/status:flex absolute top-0 right-0 bg-indigo-600 text-white text-[8px] px-1.5 py-0.5 rounded-full font-black animate-in fade-in duration-200">Finalizar?</span>
                                                  )}
                                              </button>
                                          </div>
                                      </div>
                                      
                                      <div className="prose prose-sm max-w-none text-slate-600 mb-4 md:mb-5 line-clamp-2 md:line-clamp-3 leading-relaxed font-medium text-xs md:text-sm">
                                        {record.preview ? record.preview.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : 'Sem conteúdo...'}
                                      </div>
                                      
                                      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                                          <div className="flex flex-wrap gap-2">
                                              {record.tags && record.tags.length > 0 ? (
                                                record.tags.map(tag => (
                                                    <span key={tag} className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-500 px-2.5 py-1 rounded-lg border border-indigo-100/50">#{tag}</span>
                                                ))
                                              ) : (
                                                <span className="text-[10px] font-bold text-slate-300 italic uppercase tracking-widest">Sem tags</span>
                                              )}
                                          </div>
                                          <div className="text-indigo-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                            Acessar Detalhes <ChevronRight size={14} />
                                          </div>
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

      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-[92vh] md:w-[92vw] md:max-w-5xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                          </div>
                          <h3 className="text-base font-bold text-slate-800">{editorMode === 'new' ? t('records.editor.new') : t('records.editor.edit')}</h3>
                      </div>
                      <button onClick={() => setIsEditorOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18}/></button>
                  </div>
                  
                  {/* Row de Inputs */}
                  <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 shrink-0">
                      <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Título do Registro</label>
                          <input
                            type="text"
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-700 transition-all"
                            value={currentRecord.title || ''}
                            onChange={e => setCurrentRecord({ ...currentRecord, title: e.target.value })}
                            placeholder="Ex: Sessão de acompanhamento"
                          />
                      </div>
                      <div className="w-full md:w-48">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Documento</label>
                          <select
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                            value={currentRecord.type || 'Evolucao'}
                            onChange={e => setCurrentRecord({ ...currentRecord, type: e.target.value })}
                          >
                              <option value="Evolucao">Evolução</option>
                              <option value="Anamnese">Anamnese</option>
                              <option value="Avaliacao">Avaliação</option>
                              <option value="Encaminhamento">Encaminhamento</option>
                              <option value="Plano">Plano Terapêutico</option>
                              <option value="Relatorio">Relatório</option>
                          </select>
                      </div>
                      <div className="w-full md:w-36">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                          <select
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-700 transition-all appearance-none cursor-pointer"
                            value={currentRecord.status || 'Rascunho'}
                            onChange={e => setCurrentRecord({ ...currentRecord, status: e.target.value })}
                          >
                              <option value="Rascunho">Rascunho</option>
                              <option value="Finalizado">Finalizado</option>
                          </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tags (separadas por vírgula)</label>
                          <div className="relative">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-3.5 w-3.5" />
                              <input
                                type="text"
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-700 transition-all"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                placeholder="Ansiedade, TCC, Emocional"
                              />
                          </div>
                      </div>
                  </div>

                  {/* Área do Editor com Toolbar */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/50 p-6 space-y-8 custom-scrollbar">
                      <div className="max-w-4xl mx-auto space-y-8">
                          <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl shadow-sm sticky top-0 z-10">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mr-2">Estilos</div>
                              {[
                                { cmd: 'bold', label: 'B', cls: 'font-black' },
                                { cmd: 'italic', label: 'I', cls: 'italic' },
                                { cmd: 'underline', label: 'U', cls: 'underline' },
                                { cmd: 'formatBlock', val: 'H2', label: 'H2', cls: 'font-black' },
                                { cmd: 'insertUnorderedList', label: '• List', cls: '' },
                                { cmd: 'insertOrderedList', label: '1. List', cls: '' },
                              ].map(btn => (
                                <button
                                    key={btn.cmd + (btn.val || '')}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand(btn.cmd, btn.val)}
                                    className={`px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all border border-slate-100 ${btn.cls}`}
                                >
                                    {btn.label}
                                </button>
                              ))}
                              <div className="w-[1px] h-6 bg-slate-200 mx-1" />
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={handleInsertLink}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold transition-all border border-indigo-100/50 flex items-center gap-1.5"
                              >
                                <Link size={13} /> Link
                              </button>
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
                                    <div key={key}>
                                        <div className="flex items-center gap-2 mb-2 ml-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">{labels[key]}</label>
                                        </div>
                                        <div
                                            className="min-h-[220px] p-6 rounded-3xl border border-slate-200 bg-white text-sm leading-relaxed outline-none focus:ring-8 focus:ring-indigo-100 transition-all shadow-sm focus:border-indigo-300 custom-record-editor"
                                            contentEditable
                                            suppressContentEditableWarning
                                            onFocus={(e) => { editorActiveRef.current = e.currentTarget; }}
                                            onMouseUp={storeSelection}
                                            onKeyUp={storeSelection}
                                            onInput={(e) => updateSection(key as any, (e.currentTarget as HTMLDivElement).innerHTML)}
                                            dangerouslySetInnerHTML={{ __html: editorSections[key as keyof typeof editorSections] }}
                                        />
                                    </div>
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
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60 transition-all active:scale-95 shadow-lg shadow-slate-200"
                                    disabled={isUploading}
                                >
                                    {isUploading ? 'Enviando...' : 'Adicionar Arquivo'}
                                </button>
                                <input ref={fileInputRef} type="file" className="hidden" multiple onChange={handleFileSelect} />
                            </div>

                            {uploadError && <div className="text-xs font-bold text-red-600 mb-4 bg-red-50 p-3 rounded-xl border border-red-100">{uploadError}</div>}
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(currentRecord.attachments || []).map((att, idx) => (
                                    <div key={`${att.file_url}-${idx}`} className="flex items-center justify-between gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl px-4 py-4 group/att">
                                        <div className="min-w-0 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                <FileText size={18} className="text-slate-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-extrabold text-slate-800 text-xs truncate">{att.file_name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{att.file_type || 'ARQUIVO'} {att.file_size ? `· ${Math.round(att.file_size/1024)} KB` : ''}</div>
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
                                    <div className="sm:col-span-2 py-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2">
                                            <Paperclip size={18} className="text-slate-300" />
                                        </div>
                                        <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Nenhum anexo encontrado</div>
                                    </div>
                                )}
                            </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Rodapé do Editor */}
                  <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                        <Info size={14} className="text-amber-400" />
                        O registro será salvo com a data atual.
                      </div>
                      <div className="flex items-center gap-3">
                          <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
                          <button onClick={handleSaveRecord} className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2">
                            <Save size={16} /> {t('common.save')}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {linkModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-slate-800">Inserir link</div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">URL</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Texto (opcional)</label>
                <input
                  type="text"
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Clique aqui"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setLinkModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmInsertLink}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold"
              >
                Inserir
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border animate-slideIn ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {t.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
