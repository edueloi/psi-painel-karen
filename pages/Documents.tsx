import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MOCK_DOCUMENTS, DOCUMENT_CATEGORIES } from '../constants';
import { api, getStaticUrl } from '../services/api';
import { Document } from '../types';
import {
  FileText, FileImage, FileSpreadsheet, File, Download, Trash2,
  Plus, CloudUpload, X, FolderOpen, HardDrive, Clock,
  Edit3, Check,
  Film, Music, FileCode, AlignLeft, Presentation,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import {
  PageWrapper, SectionTitle, StatGrid, StatCard, ContentCard, Button, IconButton, Input, Select, Modal, ModalFooter,
  ConfirmModal, Badge, Tabs, EmptyState, GridTable,
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineViewToggle, FilterLineDateRange,
} from '../components/UI';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { Settings2 } from 'lucide-react';

export const Documents: React.FC = () => {
  const navigate = useNavigate();
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
      case 'docx': return <FileText className="text-blue-500" size={size} />;
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
      case 'docx': return 'bg-blue-50 border-blue-100';
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

  const categoryTabs = categories.map(c => ({ id: c, label: c === 'Todos' ? c : c }));

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={FolderOpen}
          title={t('documents.title') || 'Biblioteca Digital'}
          description={t('documents.subtitle') || 'Gestão centralizada de arquivos e modelos'}
          action={
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>Voltar</Button>
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setIsModalOpen(true)}>
                {t('documents.new_file')}
              </Button>
            </>
          }
        />

        <StatGrid cols={3}>
          <StatCard
            title={t('documents.storage')}
            value={`${stats.totalSizeMB.toFixed(1)} MB`}
            description={`${stats.usedPercentage.toFixed(1)}% de 5GB`}
            icon={HardDrive}
          />
          <StatCard title={t('documents.total_files')} value={stats.totalFiles} icon={FileText} color="success" />
          <StatCard title={t('documents.recent')} value={stats.recentCount} icon={Clock} color="warning" />
        </StatGrid>

        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Tabs<string>
              items={categoryTabs}
              value={activeCategory}
              onChange={setActiveCategory}
              label="Categorias de documentos"
            />
          </div>
          <IconButton
            variant="outline"
            size="sm"
            aria-label="Configurar categorias"
            title="Configurar categorias"
            className="mb-1 shrink-0"
            onClick={() => setIsCategoryModalOpen(true)}
          >
            <Settings2 size={14} />
          </IconButton>
        </div>

        <FilterLine>
          <FilterLineSection grow>
            <div className="w-full sm:max-w-[280px]">
              <FilterLineSearch
                aria-label="Buscar arquivo"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t('documents.search') || 'Buscar arquivo...'}
              />
            </div>
          </FilterLineSection>
          <FilterLineSection wrap>
            <FilterLineDateRange
              from={filterDateFrom}
              to={filterDateTo}
              onFromChange={(v) => setFilterDateFrom(v || null)}
              onToChange={(v) => setFilterDateTo(v || null)}
            />
            <FilterLineViewToggle
              value={viewMode}
              onChange={handleViewModeToggle as any}
              gridValue="grid"
              listValue="list"
            />
          </FilterLineSection>
        </FilterLine>

        {viewMode === 'grid' ? (
          visibleDocs.length === 0 ? (
            <ContentCard>
              <EmptyState icon={FileText} title={t('documents.empty') || 'Nenhum arquivo encontrado'} />
            </ContentCard>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {visibleDocs.map(doc => (
                <ContentCard key={doc.id} padding="none" className="group hover:border-primary-200 transition-all overflow-hidden flex flex-col h-full">
                  <div className="p-3 flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 border ${getFileBg(doc.type)}`}>
                        {getFileIcon(doc.type, 18)}
                      </div>
                      <div className="flex gap-1">
                        <IconButton variant="ghost" size="xs" aria-label="Baixar" title="Baixar" onClick={() => handleDownload(doc)}><Download size={14} /></IconButton>
                        <IconButton variant="ghost" size="xs" aria-label="Excluir" title="Excluir" className="text-red-500 hover:text-red-600" onClick={() => setDeleteConfirmId(doc.id)}><Trash2 size={14} /></IconButton>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge size="sm" color="primary">{doc.category}</Badge>
                      <span className="text-[11px] text-slate-500">{doc.type.toUpperCase()}</span>
                    </div>
                    <h3 className="text-sm font-medium text-slate-900 leading-tight line-clamp-2 break-words" title={doc.title}>
                      {doc.title}
                    </h3>
                  </div>
                  <div className="px-3 py-2 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1.5"><HardDrive size={12} /> {doc.size}</span>
                    <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date(doc.date).toLocaleDateString()}</span>
                  </div>
                </ContentCard>
              ))}
            </div>
          )
        ) : (
          <ContentCard padding="none">
            <GridTable<Document>
              data={visibleDocs}
              keyExtractor={(doc) => doc.id}
              noDesktopCard
              emptyMessage={t('documents.empty') || 'Nenhum arquivo encontrado'}
              columns={[
                {
                  header: t('documents.col_type') || 'Tipo',
                  render: (doc) => (
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center border ${getFileBg(doc.type)}`}>
                      {getFileIcon(doc.type, 16)}
                    </div>
                  ),
                },
                {
                  header: t('documents.col_filename') || 'Arquivo',
                  render: (doc) => (
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">{doc.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{doc.type}</div>
                    </div>
                  ),
                },
                {
                  header: t('documents.col_category') || 'Categoria',
                  className: 'hidden sm:table-cell',
                  headerClassName: 'hidden sm:table-cell',
                  render: (doc) => <Badge size="sm" color="primary">{doc.category}</Badge>,
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
                  render: (doc) => <span className="text-xs text-slate-500 whitespace-nowrap">{new Date(doc.date).toLocaleDateString()}</span>,
                },
                {
                  header: t('documents.col_actions') || 'Ações',
                  className: 'text-right',
                  headerClassName: 'text-right',
                  render: (doc) => (
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <IconButton variant="ghost" size="sm" aria-label="Baixar" title="Baixar" onClick={() => handleDownload(doc)}><Download size={14} /></IconButton>
                      <IconButton variant="ghost" size="sm" aria-label="Excluir" title="Excluir" className="text-red-500 hover:text-red-600" onClick={() => setDeleteConfirmId(doc.id)}><Trash2 size={14} /></IconButton>
                    </div>
                  ),
                },
              ]}
            />
          </ContentCard>
        )}
      </div>

      {/* MODAL: DELETE CONFIRMATION */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        variant="danger"
        title={t('documents.delete_title') || 'Excluir arquivo?'}
        cancelLabel={t('documents.keep_file') || 'Cancelar'}
        confirmLabel={t('documents.confirm_delete') || 'Excluir'}
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.title}"? Esta ação não pode ser desfeita.`
            : t('documents.delete_desc')
        }
      />

      {/* MODAL: UPLOAD */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('documents.modal_title') || 'Novo Arquivo'}
        subtitle={t('documents.modal_subtitle') || 'Faça upload de um arquivo para a biblioteca'}
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>{t('documents.cancel')}</Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSaving}
              loadingText={t('documents.uploading') || 'Enviando...'}
              disabled={!uploadData.file || isSaving}
              onClick={async () => {
                if (!uploadData.file || isSaving) return;
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
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Input
            label={t('documents.doc_title_label')}
            type="text"
            value={uploadData.title}
            onChange={e => setUploadData({ ...uploadData, title: e.target.value })}
            placeholder={t('documents.doc_title_placeholder')}
          />
          <Select
            label={t('documents.category_label')}
            value={uploadData.category}
            onChange={e => setUploadData({ ...uploadData, category: e.target.value })}
          >
            {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div>
            <input
              type="file"
              id="file-upload"
              aria-label="Selecionar arquivo"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.txt,.ppt,.pptx,.xml"
              onChange={e => { const f = e.target.files?.[0]; if (f) setUploadData({ ...uploadData, file: f, title: uploadData.title || f.name }); }}
            />
            <label
              htmlFor="file-upload"
              className={`border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center transition-colors hover:bg-primary-50/40 hover:border-primary-300 ${uploadData.file ? 'bg-primary-50 border-primary-400' : 'bg-slate-50 border-slate-300'}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 border ${uploadData.file ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-primary-600 border-slate-200'}`}>
                <CloudUpload size={18} />
              </div>
              <p className="text-[13px] font-medium text-slate-800 mb-0.5 break-all">{uploadData.file ? uploadData.file.name : t('documents.select_file')}</p>
              <p className="text-[11px] text-slate-500">
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
        size="sm"
        footer={
          <ModalFooter align="right">
            <Button variant="primary" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Concluir
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <Input
              aria-label="Nova categoria"
              type="text"
              placeholder={t('documents.new_category') || 'Ex: Documentos Legais...'}
              wrapperClassName="flex-1"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <IconButton variant="primary" size="md" aria-label="Adicionar categoria" title="Adicionar categoria" onClick={handleAddCategory}>
              <Plus size={14} />
            </IconButton>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            <p className="text-xs font-medium text-slate-600">Categorias ativas</p>
            {categories.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                {editingCategoryIndex === idx ? (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Input
                      aria-label="Nome da categoria"
                      type="text"
                      autoFocus
                      wrapperClassName="flex-1 min-w-0"
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                    />
                    <IconButton variant="ghost" size="sm" aria-label="Salvar" title="Salvar" className="text-emerald-600" onClick={() => handleEditCategory(idx)}><Check size={14} /></IconButton>
                    <IconButton variant="ghost" size="sm" aria-label="Cancelar" title="Cancelar" onClick={() => setEditingCategoryIndex(null)}><X size={14} /></IconButton>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${cat === 'Todos' ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-primary-50 border-primary-100 text-primary-600'}`}>
                        <FolderOpen size={14} />
                      </div>
                      <span className={`text-[13px] font-medium truncate ${cat === 'Todos' ? 'text-slate-400' : 'text-slate-800'}`}>{cat}</span>
                    </div>
                    {cat !== 'Todos' && (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={`Renomear ${cat}`}
                        title="Renomear"
                        onClick={() => { setEditingCategoryIndex(idx); setEditingCategoryName(cat); }}
                      >
                        <Edit3 size={14} />
                      </IconButton>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};
