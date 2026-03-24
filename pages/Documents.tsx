import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MOCK_DOCUMENTS, DOCUMENT_CATEGORIES } from '../constants';
import { api, getStaticUrl } from '../services/api';
import { Document } from '../types';
import {
  FileText, FileImage, FileSpreadsheet, File, Download, Trash2,
  Plus, CloudUpload, X, FolderOpen, HardDrive, Clock,
  Edit3, Check, Settings,
  Film, Music, FileCode, AlignLeft, Presentation,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { GridTable } from '../components/UI/GridTable';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import {
  FilterLine,
  FilterLineSection,
  FilterLineItem,
  FilterLineSearch,
  FilterLineViewToggle,
} from '../components/UI/FilterLine';
import { DatePicker } from '../components/UI/DatePicker';
import { Combobox } from '../components/UI/Combobox';
import { Settings2 } from 'lucide-react';

export const Documents: React.FC = () => {
  const { t, language } = useLanguage();
  const { pushToast } = useToast();
  const [searchParams] = useSearchParams();
  const { preferences, updatePreference } = useUserPreferences();
  const [categories, setCategories] = useState<string[]>(DOCUMENT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(preferences.documents?.viewMode || 'grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPatientId] = useState<string | null>(searchParams.get('patient_id'));
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Date filter
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null);

  // Upload States
  const [uploadData, setUploadData] = useState({
      title: '',
      category: 'Geral',
      file: null as File | null
  });
  const [isSaving, setIsSaving] = useState(false);

  // Category Management States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  useEffect(() => {
    fetchDocuments();
  }, [filterPatientId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (filterPatientId) {
        params.patient_id = filterPatientId;
      }
      const data = await api.get<any[]>('/uploads', params);
      setDocuments(data || MOCK_DOCUMENTS);
    } catch (err) {
      console.error('Erro ao buscar documentos:', err);
      if (documents.length === 0) setDocuments(MOCK_DOCUMENTS);
    } finally {
      setIsLoading(false);
    }
  };

  const parseSizeToMB = (sizeStr: string) => {
    if (!sizeStr) return 0;
    const num = parseFloat(sizeStr.split(' ')[0]);
    if (sizeStr.includes('GB')) return num * 1024;
    if (sizeStr.includes('KB')) return num / 1024;
    return num;
  };

  const handleDownload = (doc: Document) => {
    const fileUrl = (doc as any).file_url;
    if (!fileUrl) return;
    const fullUrl = getStaticUrl(fileUrl);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = (doc as any).file_name || doc.title;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/uploads/${deleteConfirmId}`);
      setDocuments(prev => prev.filter(d => String(d.id) !== String(deleteConfirmId)));
      pushToast('success', 'Digital Library', 'Arquivo excluído com sucesso!');
    } catch (err: any) {
      console.error('Erro ao excluir documento:', err);
      pushToast('error', 'Erro', err?.message || 'Falha ao excluir arquivo.');
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      const name = newCategoryName.trim();
      setCategories([...categories, name]);
      setNewCategoryName('');
    }
  };

  const handleEditCategory = (index: number) => {
    const newName = editingCategoryName.trim();
    if (newName && !categories.includes(newName)) {
      const oldName = categories[index];
      const newCats = [...categories];
      newCats[index] = newName;
      setCategories(newCats);
      setDocuments(prev => prev.map(d => d.category === oldName ? { ...d, category: newName } : d));
      if (activeCategory === oldName) setActiveCategory(newName);
      setEditingCategoryIndex(null);
    }
  };

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = activeCategory === 'Todos' || doc.category === activeCategory;
      const matchesSearch = (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const docAny = doc as any;
      const hasPatientField = docAny.patient_id !== undefined || docAny.patientId !== undefined;
      const matchesPatient = !filterPatientId || !hasPatientField || String(docAny.patient_id ?? docAny.patientId ?? '') === String(filterPatientId);
      const docDate = new Date(doc.date).getTime();
      const matchesFrom = !filterDateFrom || docDate >= new Date(filterDateFrom).getTime();
      const matchesTo = !filterDateTo || docDate <= new Date(filterDateTo + 'T23:59:59').getTime();
      return matchesCategory && matchesSearch && matchesPatient && matchesFrom && matchesTo;
    });
  }, [documents, activeCategory, searchTerm, filterPatientId, filterDateFrom, filterDateTo]);

  const visibleDocs = useMemo(() => {
    const docs = [...filteredDocs];
    if (sortBy === 'recent') {
      return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    if (sortBy === 'name') {
      return docs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    return docs.sort((a, b) => parseSizeToMB(b.size) - parseSizeToMB(a.size));
  }, [filteredDocs, sortBy]);

  const stats = useMemo(() => {
    const totalSizeMB = documents.reduce((acc, doc) => acc + parseSizeToMB(doc.size), 0);
    const storageLimitMB = 5 * 1024;
    const usedPercentage = Math.min((totalSizeMB / storageLimitMB) * 100, 100);
    return {
      totalFiles: documents.length,
      totalSizeMB,
      storageLimitMB,
      usedPercentage,
      recentCount: documents.filter(d => {
         const dDate = new Date(d.date);
         const now = new Date();
         const diffTime = Math.abs(now.getTime() - dDate.getTime());
         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
         return diffDays <= 30;
      }).length
    };
  }, [documents]);

  const handleViewModeToggle = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    updatePreference('documents', { viewMode: mode });
  };

  // Limit visible categories for cleaner UI (Top 4)
  const mainCategories = useMemo(() => {
    return categories.slice(0, 4); 
  }, [categories]);

  const otherCategories = useMemo(() => {
    return categories.slice(4);
  }, [categories]);

  const getFileIcon = (type: string, size: number = 24) => {
    const t = type.toLowerCase();
    switch(t) {
      case 'pdf': return <FileText className="text-rose-500" size={size} />;
      case 'doc':
      case 'docx': return <FileText className="text-indigo-500" size={size} />;
      case 'sheet':
      case 'xls':
      case 'xlsx':
      case 'csv': return <FileSpreadsheet className="text-emerald-500" size={size} />;
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg': return <FileImage className="text-purple-500" size={size} />;
      case 'video': return <Film className="text-pink-500" size={size} />;
      case 'audio': return <Music className="text-amber-500" size={size} />;
      case 'ppt':
      case 'pptx': return <Presentation className="text-orange-500" size={size} />;
      case 'txt': return <AlignLeft className="text-slate-500" size={size} />;
      case 'xml': return <FileCode className="text-cyan-500" size={size} />;
      default: return <File className="text-slate-400" size={size} />;
    }
  };

  const getFileBg = (type: string) => {
    const t = type.toLowerCase();
    switch(t) {
      case 'pdf': return 'bg-rose-50 border-rose-100';
      case 'doc':
      case 'docx': return 'bg-indigo-50 border-indigo-100';
      case 'sheet':
      case 'xls':
      case 'xlsx':
      case 'csv': return 'bg-emerald-50 border-emerald-100';
      case 'image':
      case 'png':
      case 'jpg':
      case 'jpeg': return 'bg-purple-50 border-purple-100';
      case 'video': return 'bg-pink-50 border-pink-100';
      case 'audio': return 'bg-amber-50 border-amber-100';
      case 'ppt':
      case 'pptx': return 'bg-orange-50 border-orange-100';
      case 'txt': return 'bg-slate-50 border-slate-200';
      case 'xml': return 'bg-cyan-50 border-cyan-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  const deleteTarget = documents.find(d => String(d.id) === String(deleteConfirmId));

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">

      {/* HEADER HERO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm"><FolderOpen size={20}/></div>
                  {t('documents.title') || 'Biblioteca Digital'}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('documents.subtitle') || 'Gestão centralizada de arquivos e modelos'}</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> {t('documents.new_file')}
          </Button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <HardDrive size={22} />
              </div>
              <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('documents.storage')}</p>
                  <p className="text-xl font-black text-slate-800">{stats.totalSizeMB.toFixed(1)} MB <span className="text-[10px] font-bold text-slate-300">/ 5GB</span></p>
                  <div className="w-full bg-slate-50 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-100">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.usedPercentage}%` }}></div>
                  </div>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <FileText size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">{t('documents.total_files')}</p>
                  <p className="text-xl font-black text-slate-800">{stats.totalFiles}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Clock size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">{t('documents.recent')}</p>
                  <p className="text-xl font-black text-slate-800">{stats.recentCount}</p>
              </div>
          </div>
      </div>

      {/* FILTER LINE */}
      <FilterLine>
        <FilterLineSection grow>
          <FilterLineItem grow>
            <FilterLineSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={t('documents.search') || 'Buscar arquivo...'}
            />
          </FilterLineItem>

          <FilterLineItem className="min-w-[160px]">
             <Combobox
                label=""
                options={categories.map(c => ({ id: c, label: c }))}
                value={activeCategory}
                onChange={(val) => setActiveCategory(val)}
                placeholder="Categoria"
                icon={<FolderOpen size={14} />}
                showSelectedBadge={false}
                showResultCount={false}
             />
          </FilterLineItem>

          <button 
             onClick={() => setIsCategoryModalOpen(true)} 
             className="shrink-0 p-2.5 bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all border border-slate-200 hover:border-indigo-200 shadow-sm"
             title="Configurar categorias"
          >
             <Settings2 size={18}/>
          </button>

          <div className="h-8 w-px bg-slate-100 hidden xl:block mx-1" />

          <FilterLineItem>
            <DatePicker
              value={filterDateFrom || ''}
              onChange={(v) => setFilterDateFrom(v || null)}
              placeholder="De"
            />
          </FilterLineItem>
          <FilterLineItem>
            <DatePicker
              value={filterDateTo || ''}
              onChange={(v) => setFilterDateTo(v || null)}
              placeholder="Até"
            />
          </FilterLineItem>
        </FilterLineSection>

        <FilterLineSection align="right">
          <FilterLineItem>
            <FilterLineViewToggle
              value={viewMode}
              onChange={handleViewModeToggle as any}
              gridValue="grid"
              listValue="list"
            />
          </FilterLineItem>
        </FilterLineSection>
      </FilterLine>

      {/* CONTENT AREA */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {visibleDocs.map(doc => (
                <div key={doc.id} className="group bg-white rounded-[2.5rem] p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col relative overflow-hidden">
                    {/* Decorative Background - Pointer events none to avoid blocking clicks */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-bl-[2.5rem] -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-all pointer-events-none"></div>

                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-all group-hover:scale-110 ${getFileBg(doc.type)}`}>
                            {getFileIcon(doc.type, 28)}
                        </div>
                        <div className="flex gap-1.5">
                            <button onClick={() => handleDownload(doc)} className="p-2.5 bg-slate-50 hover:bg-emerald-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100" title="Baixar"><Download size={14}/></button>
                            <button onClick={() => setDeleteConfirmId(doc.id)} className="p-2.5 bg-slate-50 hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100" title="Excluir"><Trash2 size={14}/></button>
                        </div>
                    </div>

                    <div className="flex-1 mb-6">
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{doc.category}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{doc.type.toUpperCase()}</span>
                        </div>
                        <h3 className="font-black text-slate-800 text-sm leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2" title={doc.title}>
                            {doc.title}
                        </h3>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-50 text-[10px] font-black text-slate-400">
                        <span className="flex items-center gap-1.5"><HardDrive size={12}/> {doc.size}</span>
                        <span className="flex items-center gap-1.5"><Clock size={12}/> {new Date(doc.date).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}

            {visibleDocs.length === 0 && (
                <div className="col-span-full py-24 text-center text-slate-300 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                        <FileText size={40} className="opacity-20" />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.2em]">{t('documents.empty')}</p>
                </div>
            )}
        </div>
      ) : (
        <GridTable<Document>
          data={visibleDocs}
          keyExtractor={(doc) => doc.id}
          emptyMessage={t('documents.empty') || 'Nenhum arquivo encontrado'}
          columns={[
            {
              header: t('documents.col_type') || 'Tipo',
              render: (doc) => (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${getFileBg(doc.type)}`}>
                  {getFileIcon(doc.type, 16)}
                </div>
              ),
            },
            {
              header: t('documents.col_filename') || 'Arquivo',
              render: (doc) => (
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800 truncate">{doc.title}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{doc.type}</div>
                </div>
              ),
            },
            {
              header: t('documents.col_category') || 'Categoria',
              className: 'hidden sm:table-cell',
              headerClassName: 'hidden sm:table-cell',
              render: (doc) => (
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full uppercase tracking-wider">{doc.category}</span>
              ),
            },
            {
              header: t('documents.col_size') || 'Tamanho',
              className: 'hidden md:table-cell',
              headerClassName: 'hidden md:table-cell',
              render: (doc) => <span className="text-xs text-slate-500">{doc.size}</span>,
            },
            {
              header: t('documents.col_date') || 'Data',
              className: 'hidden lg:table-cell',
              headerClassName: 'hidden lg:table-cell',
              render: (doc) => <span className="text-xs text-slate-500">{new Date(doc.date).toLocaleDateString()}</span>,
            },
            {
              header: t('documents.col_actions') || 'Ações',
              className: 'text-right',
              headerClassName: 'text-right',
              render: (doc) => (
                <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleDownload(doc)} className="p-1.5 text-indigo-500 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-all" title="Baixar"><Download size={13}/></button>
                  <button onClick={() => setDeleteConfirmId(doc.id)} className="p-1.5 text-rose-500 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-100 transition-all" title="Excluir"><Trash2 size={13}/></button>
                </div>
              ),
            },
          ]}
        />
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t('documents.delete_title') || 'Excluir Arquivo'}
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
              {t('documents.keep_file') || 'Cancelar'}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              {t('documents.confirm_delete') || 'Excluir'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.title}"? Esta ação não pode ser desfeita.`
            : t('documents.delete_desc')}
        </p>
      </Modal>

      {/* MODAL: UPLOAD */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('documents.modal_title') || 'Novo Arquivo'}
        subtitle={t('documents.modal_subtitle') || 'Faça upload de um arquivo para a biblioteca'}
        maxWidth="md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>{t('documents.cancel')}</Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSaving}
              loadingText={t('documents.uploading') || 'Enviando...'}
              disabled={!uploadData.file}
              onClick={async () => {
                if (!uploadData.file) return;
                setIsSaving(true);
                try {
                  const formData = new FormData();
                  formData.append('file', uploadData.file);
                  formData.append('title', uploadData.title || uploadData.file.name);
                  formData.append('category', uploadData.category);
                  await api.request('/uploads', { method: 'POST', body: formData });
                  setIsModalOpen(false);
                  setUploadData({ title: '', category: 'Geral', file: null });
                  pushToast('success', 'Biblioteca Digital', 'Arquivo enviado com sucesso!');
                  fetchDocuments();
                } catch (e: any) {
                  console.error(e);
                  pushToast('error', 'Erro no Upload', e?.message || 'Erro ao enviar arquivo. Tente novamente.');
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              {t('documents.save') || 'Salvar'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('documents.doc_title_label')}</label>
            <input
              type="text"
              className="w-full text-sm font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all"
              value={uploadData.title}
              onChange={e => setUploadData({...uploadData, title: e.target.value})}
              placeholder={t('documents.doc_title_placeholder')}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('documents.category_label')}</label>
            <select
              className="w-full text-sm font-bold p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all appearance-none"
              value={uploadData.category}
              onChange={e => setUploadData({...uploadData, category: e.target.value})}
            >
              {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.txt,.ppt,.pptx,.xml"
              onChange={e => { const f = e.target.files?.[0]; if(f) setUploadData({...uploadData, file: f, title: uploadData.title || f.name}); }} 
            />
            <label
              htmlFor="file-upload"
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-indigo-50/30 hover:border-indigo-200 ${uploadData.file ? 'bg-indigo-50 border-indigo-400' : 'bg-slate-50 border-slate-200'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-all ${uploadData.file ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-500'}`}>
                <CloudUpload size={24} />
              </div>
              <p className="text-sm font-black text-slate-700 mb-1">{uploadData.file ? uploadData.file.name : t('documents.select_file')}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {uploadData.file ? `${(uploadData.file.size / 1024 / 1024).toFixed(2)} MB` : t('documents.file_hint')}
              </p>
            </label>
          </div>
        </div>
      </Modal>

      {/* MODAL: CATEGORY MANAGEMENT */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={t('documents.categories') || 'Gerenciar Categorias'}
        maxWidth="sm"
        footer={
          <div className="flex w-full justify-end">
            <Button 
               variant="primary" 
               radius="xl"
               size="sm" 
               onClick={() => setIsCategoryModalOpen(false)}
            >
               Concluir
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 items-center">
            <input
              type="text"
              placeholder={t('documents.new_category') || 'Ex: Documentos Legais...'}
              className="flex-1 bg-transparent p-1 outline-none font-bold text-slate-700 text-xs placeholder:text-slate-400"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <Button 
                variant="primary" 
                size="sm" 
                radius="lg"
                onClick={handleAddCategory}
                className="w-10 h-10 p-0"
            >
                <Plus size={18} strokeWidth={3} />
            </Button>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-2">Categorias Ativas</div>
            {categories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 group hover:border-indigo-100 transition-all shadow-sm">
                {editingCategoryIndex === idx ? (
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                       <Check size={16} />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      className="flex-1 bg-transparent outline-none text-sm font-black text-indigo-600"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => handleEditCategory(idx)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl" title="Salvar"><Check size={16} strokeWidth={3}/></button>
                        <button onClick={() => setEditingCategoryIndex(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl" title="Cancelar"><X size={16} strokeWidth={3}/></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                       <div className={`p-2 rounded-lg ${cat === 'Todos' ? 'bg-slate-50 text-slate-300' : 'bg-indigo-50 text-indigo-500'}`}>
                          <FolderOpen size={16} />
                       </div>
                       <span className={`text-xs font-black uppercase tracking-wider ${cat === 'Todos' ? 'text-slate-300' : 'text-slate-700'}`}>{cat}</span>
                    </div>
                    {cat !== 'Todos' && (
                      <button 
                        onClick={() => { setEditingCategoryIndex(idx); setEditingCategoryName(cat); }} 
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="Renomear"
                      >
                         <Edit3 size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};
