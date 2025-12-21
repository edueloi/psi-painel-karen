import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ClinicalRecord, Patient } from '../types';
import { api } from '../services/api';
import { 
  Search, Plus, User, 
  X, ArrowLeft, Loader2, Tag, Filter, FileText, Paperclip, Trash2
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
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorActiveRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

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
        const data = await api.get<Patient[]>('/patients');
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
    patients.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())),
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
          title: `Sessao - ${new Date().toLocaleDateString()}`,
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
              title: currentRecord.title || `Sessao - ${new Date().toLocaleDateString()}`,
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
          alert(e.message || 'Erro ao salvar prontuario');
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-[24px] border border-slate-200 shadow-xl overflow-hidden animate-fadeIn">
      
      <div className={`w-full md:w-80 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col transition-all ${isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <h2 className="text-lg font-display font-bold text-slate-800 mb-3 flex items-center gap-2"><User size={20} className="text-indigo-600" /> {t('records.title')}</h2>
              <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                  <input type="text" placeholder={t('records.search')} className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {isLoading ? (
                  <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-indigo-400" /></div>
              ) : filteredPatients.map(patient => {
                  const pid = String(patient.id);
                  const isSelected = selectedPatientId === pid;
                  return (
                  <button key={pid} onClick={() => handlePatientSelect(pid)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white hover:shadow-sm text-slate-600'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 ${isSelected ? 'bg-white/20 border-white/20' : 'bg-slate-200 border-white text-slate-500'}`}>{patient.full_name.charAt(0)}</div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{patient.full_name}</p><p className={`text-[10px] uppercase font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{patient.status}</p></div>
                  </button>
              )})}
          </div>
      </div>

      <div className={`flex-1 flex flex-col bg-slate-50/30 relative ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {selectedPatient ? (
              <>
                  <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <button onClick={() => setIsMobileListVisible(true)} className="md:hidden p-2 -ml-2 text-slate-500"><ArrowLeft size={20} /></button>
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600 border-2 border-white shadow-sm">{selectedPatient.full_name.charAt(0)}</div>
                                  <div><h2 className="text-xl font-display font-bold text-slate-800 leading-none">{selectedPatient.full_name}</h2><p className="text-xs text-slate-400 mt-1">{selectedPatient.status.toUpperCase()}</p></div>
                              </div>
                          </div>
                          <button onClick={handleNewRecord} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg"><Plus size={18} /> {t('records.new')}</button>
                      </div>
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                              <span className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full"><FileText size={14} /> {recordStats.total} registros</span>
                              {recordStats.lastDate && (
                                  <span className="bg-slate-100 px-3 py-1.5 rounded-full">Ultima atualizacao: {new Date(recordStats.lastDate).toLocaleDateString()}</span>
                              )}
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                              <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                  <input
                                    type="text"
                                    placeholder="Buscar registro..."
                                    className="w-full sm:w-56 pl-9 pr-3 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                    value={recordSearch}
                                    onChange={e => setRecordSearch(e.target.value)}
                                  />
                              </div>
                              <div className="relative">
                                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                  <select
                                    className="w-full sm:w-44 pl-9 pr-3 py-2 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'final')}
                                  >
                                      <option value="all">Todos</option>
                                      <option value="draft">Rascunho</option>
                                      <option value="final">Finalizado</option>
                                  </select>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                      <div className="relative space-y-8 pl-4 md:pl-8 before:absolute before:left-[19px] md:before:left-[35px] before:top-0 before:h-full before:w-0.5 before:bg-slate-200/80">
                          {filteredRecords.map((record) => (
                              <div key={record.id} className="relative group animate-[slideUpFade_0.3s_ease-out]">
                                  <div className={`absolute -left-[27px] md:-left-[43px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 ${record.status === 'Finalizado' ? 'bg-indigo-600' : 'bg-amber-400'}`}></div>
                                  <div
                                    className="bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => handleOpenRecord(record.id)}
                                  >
                                      <div className="flex items-start justify-between gap-3">
                                          <div>
                                              <h3 className="font-bold text-slate-800 text-base">{record.title}</h3>
                                              <p className="text-xs text-slate-500">{new Date(record.date).toLocaleString()}</p>
                                          </div>
                                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase">
                                              <span className="px-2 py-1 rounded-full border border-slate-200 text-slate-500">{record.type}</span>
                                              <span className={`px-2 py-1 rounded-full border ${record.status === 'Finalizado' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>{record.status}</span>
                                          </div>
                                      </div>
                                      <div className="prose prose-sm max-w-none text-slate-600 mb-4 mt-3 line-clamp-3">{record.preview}</div>
                                      {record.tags && record.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-2">
                                              {record.tags.map(tag => (
                                                  <span key={tag} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{tag}</span>
                                              ))}
                                          </div>
                                      )}
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
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6"><Search size={40} className="opacity-30" /></div>
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">{t('records.select')}</h2>
                  <p className="max-w-sm">{t('records.selectDesc')}</p>
              </div>
          )}
      </div>

      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-5xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0">
                      <h3 className="text-xl font-bold">{editorMode === 'new' ? t('records.editor.new') : t('records.editor.edit')}</h3>
                      <button onClick={() => setIsEditorOpen(false)}><X size={24}/></button>
                  </div>
                  <div className="p-6 border-b border-slate-200 bg-white grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Titulo</label>
                          <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={currentRecord.title || ''}
                            onChange={e => setCurrentRecord({ ...currentRecord, title: e.target.value })}
                            placeholder="Ex: Sessao de acompanhamento"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                          <select
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={currentRecord.type || 'Evolucao'}
                            onChange={e => setCurrentRecord({ ...currentRecord, type: e.target.value })}
                          >
                              <option value="Evolucao">Evolucao</option>
                              <option value="Anamnese">Anamnese</option>
                              <option value="Avaliacao">Avaliacao</option>
                              <option value="Encaminhamento">Encaminhamento</option>
                              <option value="Plano">Plano</option>
                              <option value="Relatorio">Relatorio</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                          <select
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={currentRecord.status || 'Rascunho'}
                            onChange={e => setCurrentRecord({ ...currentRecord, status: e.target.value })}
                          >
                              <option value="Rascunho">Rascunho</option>
                              <option value="Finalizado">Finalizado</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tags</label>
                          <div className="relative">
                              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                              <input
                                type="text"
                                className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                placeholder="Ansiedade, TCC, Emocional"
                              />
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      <div className="px-6 md:px-8 pt-6 space-y-6">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                              <span>Editor</span>
                              <div className="flex flex-wrap gap-2">
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('bold')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Negrito
                                  </button>
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('italic')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Italico
                                  </button>
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('underline')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Sublinhado
                                  </button>
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('formatBlock', 'H2')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Titulo
                                  </button>
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('insertUnorderedList')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Topicos
                                  </button>
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => execCommand('insertOrderedList')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Numerado
                                  </button>
                                  <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={handleInsertLink}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600"
                                  >
                                    Link
                                  </button>
                              </div>
                          </div>

                          {getVisibleSections(currentRecord.type).includes('demand') ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Descricao da demanda</label>
                                <div
                                className="min-h-[160px] p-4 rounded-2xl border border-slate-200 bg-white text-sm leading-relaxed outline-none focus:ring-4 focus:ring-indigo-100"
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={(e) => { editorActiveRef.current = e.currentTarget; }}
                                onMouseUp={storeSelection}
                                onKeyUp={storeSelection}
                                onInput={(e) => updateSection('demand', (e.currentTarget as HTMLDivElement).innerHTML)}
                                dangerouslySetInnerHTML={{ __html: editorSections.demand }}
                              />
                            </div>
                          ) : null}

                          {getVisibleSections(currentRecord.type).includes('procedures') ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Procedimentos</label>
                                <div
                                className="min-h-[160px] p-4 rounded-2xl border border-slate-200 bg-white text-sm leading-relaxed outline-none focus:ring-4 focus:ring-indigo-100"
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={(e) => { editorActiveRef.current = e.currentTarget; }}
                                onMouseUp={storeSelection}
                                onKeyUp={storeSelection}
                                onInput={(e) => updateSection('procedures', (e.currentTarget as HTMLDivElement).innerHTML)}
                                dangerouslySetInnerHTML={{ __html: editorSections.procedures }}
                              />
                            </div>
                          ) : null}

                          {getVisibleSections(currentRecord.type).includes('analysis') ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Analise e conclusao</label>
                                <div
                                className="min-h-[160px] p-4 rounded-2xl border border-slate-200 bg-white text-sm leading-relaxed outline-none focus:ring-4 focus:ring-indigo-100"
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={(e) => { editorActiveRef.current = e.currentTarget; }}
                                onMouseUp={storeSelection}
                                onKeyUp={storeSelection}
                                onInput={(e) => updateSection('analysis', (e.currentTarget as HTMLDivElement).innerHTML)}
                                dangerouslySetInnerHTML={{ __html: editorSections.analysis }}
                              />
                            </div>
                          ) : null}

                          {getVisibleSections(currentRecord.type).includes('free') ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Texto livre</label>
                                <div
                                className="min-h-[120px] p-4 rounded-2xl border border-slate-200 bg-white text-sm leading-relaxed outline-none focus:ring-4 focus:ring-indigo-100"
                                contentEditable
                                suppressContentEditableWarning
                                onFocus={(e) => { editorActiveRef.current = e.currentTarget; }}
                                onMouseUp={storeSelection}
                                onKeyUp={storeSelection}
                                onInput={(e) => updateSection('free', (e.currentTarget as HTMLDivElement).innerHTML)}
                                dangerouslySetInnerHTML={{ __html: editorSections.free }}
                              />
                            </div>
                          ) : null}
                      </div>
                      <div className="px-8 pb-8">
                          <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                                  <Paperclip size={14} /> Anexos
                              </div>
                              <div className="flex items-center gap-2">
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    multiple
                                    onChange={handleFileSelect}
                                  />
                                  <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                                    disabled={isUploading}
                                  >
                                      {isUploading ? 'Enviando...' : 'Selecionar arquivo'}
                                  </button>
                              </div>
                          </div>
                          {uploadError && <div className="text-xs text-red-600 mb-2">{uploadError}</div>}
                          <div className="space-y-3">
                              {(currentRecord.attachments || []).map((att, idx) => (
                                  <div key={`${att.file_url}-${idx}`} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                                      <div className="min-w-0">
                                          <div className="font-bold text-slate-700 truncate">{att.file_name}</div>
                                          <div className="text-xs text-slate-500 truncate">{att.file_url}</div>
                                          {(att.file_type || att.file_size) && (
                                              <div className="text-[11px] text-slate-400">
                                                  {att.file_type || 'arquivo'}{att.file_size ? ` · ${att.file_size} bytes` : ''}
                                              </div>
                                          )}
                                      </div>
                                      <button
                                        onClick={() => handleRemoveAttachment(idx)}
                                        className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              ))}
                              {(currentRecord.attachments || []).length === 0 && (
                                  <div className="text-xs text-slate-400">Nenhum anexo adicionado.</div>
                              )}
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-3">
                              <input
                                type="text"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                                placeholder="Nome do arquivo"
                                value={attachmentName}
                                onChange={e => setAttachmentName(e.target.value)}
                              />
                              <input
                                type="text"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                                placeholder="Tipo (pdf, jpg...)"
                                value={attachmentType}
                                onChange={e => setAttachmentType(e.target.value)}
                              />
                              <input
                                type="text"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700 md:col-span-2"
                                placeholder="URL do arquivo"
                                value={attachmentUrl}
                                onChange={e => setAttachmentUrl(e.target.value)}
                              />
                              <input
                                type="number"
                                className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                                placeholder="Tamanho (bytes)"
                                value={attachmentSize}
                                onChange={e => setAttachmentSize(e.target.value)}
                              />
                              <button
                                onClick={handleAddAttachment}
                                className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800"
                              >
                                  Adicionar anexo
                              </button>
                          </div>
                      </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                      <button onClick={() => setIsEditorOpen(false)} className="px-6 py-2.5 font-bold text-slate-500">{t('records.editor.cancel')}</button>
                      <button onClick={handleSaveRecord} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg">{t('records.editor.save')}</button>
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
    </div>
  );
};
