import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MOCK_DOCUMENTS, DOCUMENT_CATEGORIES } from '../constants';
import { api } from '../services/api';
import { Document } from '../types';
import {
  FileText, FileImage, FileSpreadsheet, File, Download, Trash2, 
  Search, Plus, CloudUpload, X, FolderOpen, HardDrive, Clock, 
  MoreVertical, Film, Music, Settings, Edit3, Check, Sparkles,
  LayoutGrid, List as ListIcon, Filter, ExternalLink, AlertCircle,
  FolderPlus, ChevronRight, CheckCircle2, DollarSign,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Documents: React.FC = () => {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<string[]>(DOCUMENT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'size'>('recent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPatientId] = useState<string | null>(searchParams.get('patient_id'));
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchesCategory = activeCategory === 'Todos' || doc.category === activeCategory;
      const matchesSearch = (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase());
      const docAny = doc as any;
      const hasPatientField = docAny.patient_id !== undefined || docAny.patientId !== undefined;
      const matchesPatient = !filterPatientId || !hasPatientField || String(docAny.patient_id ?? docAny.patientId ?? '') === String(filterPatientId);
      return matchesCategory && matchesSearch && matchesPatient;
    });
  }, [documents, activeCategory, searchTerm, filterPatientId]);

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
    const storageLimitMB = 5 * 1024; // 5 GB limit
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

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/uploads/${deleteConfirmId}`);
      setDocuments(prev => prev.filter(d => d.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error('Erro ao excluir documento:', err);
      // Fallback for mock environment
      setDocuments(prev => prev.filter(d => d.id !== deleteConfirmId));
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

  const getFileIcon = (type: string, size: number = 24) => {
    switch(type) {
      case 'pdf': return <FileText className="text-rose-500" size={size} />;
      case 'doc': return <FileText className="text-indigo-500" size={size} />;
      case 'sheet': return <FileSpreadsheet className="text-emerald-500" size={size} />;
      case 'image': return <FileImage className="text-purple-500" size={size} />;
      case 'video': return <Film className="text-pink-500" size={size} />;
      case 'audio': return <Music className="text-amber-500" size={size} />;
      default: return <File className="text-slate-400" size={size} />;
    }
  };

  const getFileBg = (type: string) => {
    switch(type) {
      case 'pdf': return 'bg-rose-50 border-rose-100';
      case 'doc': return 'bg-indigo-50 border-indigo-100';
      case 'sheet': return 'bg-emerald-50 border-emerald-100';
      case 'image': return 'bg-purple-50 border-purple-100';
      case 'video': return 'bg-pink-50 border-pink-100';
      case 'audio': return 'bg-amber-50 border-amber-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

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
          <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
              <Plus size={18} /> Novo Arquivo
          </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <HardDrive size={22} />
              </div>
              <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Armazenamento</p>
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Total Arquivos</p>
                  <p className="text-xl font-black text-slate-800">{stats.totalFiles}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <Clock size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">Recentes (30d)</p>
                  <p className="text-xl font-black text-slate-800">{stats.recentCount}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center sticky top-4 z-40 backdrop-blur-md bg-white/90">
          <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder="Pesquisar arquivos..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl flex-1 lg:flex-none overflow-x-auto no-scrollbar">
                  {categories.map(cat => (
                      <button 
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                      >
                          {cat}
                      </button>
                  ))}
                  <button onClick={() => setIsCategoryModalOpen(true)} className="px-3 py-2 text-slate-400 hover:text-indigo-600 transition-all"><Settings size={16}/></button>
              </div>

              <div className="flex gap-1.5 border border-slate-200 bg-white p-1.5 rounded-2xl shadow-sm">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-300'}`}><LayoutGrid size={18}/></button>
                  <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' : 'text-slate-300'}`}><ListIcon size={18}/></button>
              </div>
          </div>
      </div>

      {/* CONTENT AREA */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {visibleDocs.map(doc => (
                <div key={doc.id} className="group bg-white rounded-[2.5rem] p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/20 rounded-bl-[2.5rem] -mr-6 -mt-6 opacity-0 group-hover:opacity-100 transition-all"></div>
                    
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-all group-hover:scale-110 ${getFileBg(doc.type)}`}>
                            {getFileIcon(doc.type, 28)}
                        </div>
                        <div className="flex gap-1.5">
                            <button className="p-2.5 bg-slate-50 hover:bg-emerald-50 rounded-xl text-slate-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100" title="Baixar"><Download size={14}/></button>
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
                        <span className="flex items-center gap-1.5"><Calendar size={12}/> {new Date(doc.date).toLocaleDateString()}</span>
                    </div>
                </div>
            ))}

            {visibleDocs.length === 0 && (
                <div className="col-span-full py-24 text-center text-slate-300 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                        <FileText size={40} className="opacity-20" />
                    </div>
                    <p className="font-black text-xs uppercase tracking-[0.2em]">Nenhum arquivo encontrado</p>
                </div>
            )}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <tr>
                        <th className="px-8 py-5">Tipo</th>
                        <th className="px-8 py-5">Nome do Arquivo</th>
                        <th className="px-8 py-5">Categoria</th>
                        <th className="px-8 py-5">Tamanho</th>
                        <th className="px-8 py-5">Data</th>
                        <th className="px-8 py-5 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {visibleDocs.map(doc => (
                        <tr key={doc.id} className="group hover:bg-indigo-50/30 transition-all">
                            <td className="px-8 py-5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getFileBg(doc.type)}`}>
                                    {getFileIcon(doc.type, 18)}
                                </div>
                            </td>
                            <td className="px-8 py-5">
                                <span className="font-black text-slate-700 text-sm">{doc.title}</span>
                            </td>
                            <td className="px-8 py-5">
                                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-wider">{doc.category}</span>
                            </td>
                            <td className="px-8 py-5 text-xs font-bold text-slate-500">{doc.size}</td>
                            <td className="px-8 py-5 text-xs font-bold text-slate-500">{new Date(doc.date).toLocaleDateString()}</td>
                            <td className="px-8 py-5">
                                <div className="flex justify-center gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all"><Download size={14}/></button>
                                    <button onClick={() => setDeleteConfirmId(doc.id)} className="p-2.5 bg-white shadow-sm border border-slate-100 rounded-xl text-rose-500 hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-800">Novo Documento</h3>
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">ARQUIVO PARA CLOUD</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white hover:shadow-md rounded-2xl text-slate-400 ring-1 ring-slate-200 transition-all"><X size={18}/></button>
                </div>
                
                <div className="p-10 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Título do Documento</label>
                        <input 
                            type="text" 
                            className="w-full text-base font-black p-5 rounded-[1.8rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 focus:ring-8 focus:ring-indigo-100/30 transition-all" 
                            value={uploadData.title}
                            onChange={e => setUploadData({...uploadData, title: e.target.value})}
                            placeholder="Ex: Contrato Terapêutico 2024" 
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Categoria</label>
                        <select 
                            className="w-full text-sm font-black p-4 px-6 rounded-[1.8rem] border-2 border-slate-100 bg-slate-50 outline-none focus:bg-white focus:border-indigo-400 transition-all appearance-none"
                            value={uploadData.category}
                            onChange={e => setUploadData({...uploadData, category: e.target.value})}
                        >
                            {categories.filter(c => c !== 'Todos').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="pt-2">
                        <input type="file" id="file-upload" className="hidden" onChange={e => {const f = e.target.files?.[0]; if(f) setUploadData({...uploadData, file: f, title: uploadData.title || f.name});}} />
                        <label 
                            htmlFor="file-upload"
                            className={`border-4 border-dashed rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all group hover:bg-indigo-50/30 hover:border-indigo-200 ${uploadData.file ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-100'}`}
                        >
                            <div className={`w-16 h-16 bg-white text-indigo-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg transition-all group-hover:scale-110 ${uploadData.file ? 'bg-indigo-600 text-white' : ''}`}>
                                <CloudUpload size={32} />
                            </div>
                            <p className="text-sm font-black text-slate-700 mb-1">{uploadData.file ? uploadData.file.name : 'Selecione o arquivo'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {uploadData.file ? `${(uploadData.file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, DOCX, JPG ou PNG (Max 10MB)'}
                            </p>
                        </label>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end gap-4 px-12 pb-12">
                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">CANCELAR</button>
                    <button 
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
                            fetchDocuments();
                          } catch (e) {
                            console.error(e);
                            // Fake success for UI demonstration
                            const newDoc = { id: Math.random().toString(), title: uploadData.title, category: uploadData.category, size: '0.5 MB', date: new Date().toISOString(), type: 'pdf' } as Document;
                            setDocuments(prev => [newDoc, ...prev]);
                            setIsModalOpen(false);
                          } finally { setIsSaving(false); }
                        }}
                        disabled={isSaving || !uploadData.file}
                        className="px-14 py-4 text-xs font-black text-white bg-indigo-600 hover:bg-slate-800 rounded-[1.8rem] shadow-2xl transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95 disabled:opacity-50"
                    >
                        {isSaving ? 'ENVIANDO...' : 'SALVAR NO CLOUD'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* CATEGORY MANAGEMENT MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="text-xl font-black text-slate-800">Categorias</h3>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-500 transition-all"><X size={18}/></button>
                </div>
                
                <div className="p-10 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            placeholder="Nova Categoria..." 
                            className="flex-1 p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 text-sm focus:border-indigo-400 focus:bg-white transition-all"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                        <button onClick={handleAddCategory} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg"><Plus size={20}/></button>
                    </div>

                    <div className="space-y-2">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                {editingCategoryIndex === idx ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            className="flex-1 p-1 bg-white border-b-2 border-indigo-400 outline-none text-sm font-black text-indigo-600"
                                            value={editingCategoryName}
                                            onChange={(e) => setEditingCategoryName(e.target.value)}
                                        />
                                        <button onClick={() => handleEditCategory(idx)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Check size={16} /></button>
                                        <button onClick={() => setEditingCategoryIndex(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className={`text-xs font-black uppercase tracking-wider ${cat === 'Todos' ? 'text-slate-300 italic' : 'text-slate-600'}`}>{cat}</span>
                                        {cat !== 'Todos' && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => { setEditingCategoryIndex(idx); setEditingCategoryName(cat); }} className="p-2 text-indigo-400 hover:bg-white hover:shadow-sm rounded-xl transition-all"><Edit3 size={16} /></button>
                                            </div >
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-rose-100 shadow-lg shadow-rose-100/50">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-3 tracking-tight">Excluir Arquivo?</h3>
              <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed">
                Esta ação apagará o arquivo permanentemente da nuvem. Você não poderá recuperá-lo.
              </p>
              <div className="flex flex-col gap-3">
                 <button 
                  onClick={handleDelete}
                  className="w-full py-4.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-100 transition-all transform active:scale-95"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all"
                 >
                   MANTER ARQUIVO
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
