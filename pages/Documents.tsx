
import React, { useState, useMemo } from 'react';
import { MOCK_DOCUMENTS, DOCUMENT_CATEGORIES } from '../constants';
import { Document } from '../types';
import { 
  FileText, FileImage, FileSpreadsheet, File, Download, Trash2, 
  Search, Plus, CloudUpload, X, FolderOpen, HardDrive, Clock, MoreVertical, FileCode, Film, Music,
  Settings, Edit3, Check
} from 'lucide-react';

export const Documents: React.FC = () => {
  const [categories, setCategories] = useState<string[]>(DOCUMENT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCUMENTS);

  // Category Management States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // --- Logic & Stats ---

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = activeCategory === 'Todos' || doc.category === activeCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  // --- Category Logic ---
  const handleAddCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
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
      
      // Update documents linked to this category
      setDocuments(prev => prev.map(d => d.category === oldName ? { ...d, category: newName } : d));
      
      // Update active tab if needed
      if (activeCategory === oldName) setActiveCategory(newName);
      
      setEditingCategoryIndex(null);
      setEditingCategoryName('');
    }
  };

  const handleDeleteCategory = (index: number) => {
    const catToDelete = categories[index];
    if (catToDelete === 'Todos') return; 
    
    if (confirm(`Excluir categoria "${catToDelete}"?`)) {
       const newCats = categories.filter((_, i) => i !== index);
       setCategories(newCats);
       if (activeCategory === catToDelete) setActiveCategory('Todos');
    }
  };

  const getFileIcon = (type: string, size: number = 24) => {
    switch(type) {
      case 'pdf': return <FileText className="text-red-500" size={size} />;
      case 'doc': return <FileText className="text-blue-500" size={size} />;
      case 'sheet': return <FileSpreadsheet className="text-emerald-500" size={size} />;
      case 'image': return <FileImage className="text-purple-500" size={size} />;
      case 'video': return <Film className="text-pink-500" size={size} />;
      case 'audio': return <Music className="text-amber-500" size={size} />;
      default: return <File className="text-slate-400" size={size} />;
    }
  };

  const getFileBg = (type: string) => {
    switch(type) {
      case 'pdf': return 'bg-red-50 border-red-100';
      case 'doc': return 'bg-blue-50 border-blue-100';
      case 'sheet': return 'bg-emerald-50 border-emerald-100';
      case 'image': return 'bg-purple-50 border-purple-100';
      default: return 'bg-slate-50 border-slate-100';
    }
  };

  // Mock Storage Calculation
  const parseSizeToMB = (sizeStr: string) => {
    const num = parseFloat(sizeStr.split(' ')[0]);
    if (sizeStr.includes('GB')) return num * 1024;
    if (sizeStr.includes('KB')) return num / 1024;
    return num; 
  };

  const stats = useMemo(() => {
    const totalSizeMB = documents.reduce((acc, doc) => acc + parseSizeToMB(doc.size), 0);
    const storageLimitMB = 5 * 1024; // 5GB limit
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
         return diffDays <= 30; // Last 30 days
      }).length
    };
  }, [documents]);

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-teal-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-teal-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <FolderOpen size={14} />
                    <span>Gestão de Arquivos</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Biblioteca Digital</h1>
                <p className="text-teal-200 text-lg leading-relaxed max-w-xl">
                    Centralize contratos, modelos clínicos e arquivos importantes com segurança e backup automático.
                </p>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="w-full lg:w-auto bg-teal-600 hover:bg-teal-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-teal-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                    <Plus size={20} />
                    Novo Documento
                </button>
            </div>
        </div>
      </div>

      {/* --- STATS OVERVIEW --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Storage Card */}
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Armazenamento</h3>
                      <div className="text-2xl font-display font-bold text-slate-800 mt-1">
                          {stats.totalSizeMB.toFixed(1)} MB <span className="text-slate-400 text-sm font-normal">/ 5 GB</span>
                      </div>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                      <HardDrive size={20} />
                  </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full transition-all duration-1000 ease-out" 
                    style={{ width: `${stats.usedPercentage}%` }}
                  ></div>
              </div>
              <p className="text-xs text-slate-400">
                  {stats.usedPercentage.toFixed(1)}% utilizado
              </p>
          </div>

          {/* Files Count Card */}
          <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
               <div className="flex justify-between items-start mb-2">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Total de Arquivos</h3>
                      <div className="text-2xl font-display font-bold text-slate-800 mt-1">
                          {stats.totalFiles}
                      </div>
                  </div>
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                      <File size={20} />
                  </div>
              </div>
              <div className="mt-4 flex gap-2 overflow-hidden">
                 {/* Mini visualization of categories */}
                 {categories.slice(1, 5).map((cat, i) => (
                    <div key={cat} className="h-1.5 flex-1 rounded-full bg-slate-100" title={cat}>
                        <div className={`h-full rounded-full w-2/3 ${['bg-blue-400', 'bg-purple-400', 'bg-amber-400', 'bg-rose-400'][i]}`}></div>
                    </div>
                 ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">Distribuídos em {categories.length - 1} categorias</p>
          </div>

           {/* Recent Activity Card */}
           <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden group">
               <div className="flex justify-between items-start mb-4">
                  <div>
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">Recentes (30d)</h3>
                      <div className="text-2xl font-display font-bold text-slate-800 mt-1">
                          {stats.recentCount} <span className="text-sm text-slate-500 font-normal">uploads</span>
                      </div>
                  </div>
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                      <Clock size={20} />
                  </div>
              </div>
              <div className="flex -space-x-2 mt-2">
                 {/* Fake user avatars for activity */}
                 {[1,2,3].map(i => (
                     <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                         {['D', 'A', 'S'][i-1]}
                     </div>
                 ))}
                 <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                     +2
                 </div>
              </div>
          </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        
        {/* Search & Categories Layout */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* Category Tabs */}
            <div className="overflow-x-auto w-full lg:w-auto pb-2 -mb-2 no-scrollbar flex items-center gap-2">
                <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-max shadow-sm">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`
                                px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                ${activeCategory === cat 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <button 
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors shadow-sm shrink-0"
                    title="Gerenciar Categorias"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-teal-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Pesquisar por nome do arquivo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all text-slate-600 placeholder:text-slate-400 shadow-sm"
                />
            </div>
        </div>
      </div>

      {/* --- DOCUMENTS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDocs.map(doc => (
            <div key={doc.id} className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-teal-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(20,184,166,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col relative">
                
                {/* Top: Icon & Actions */}
                <div className="flex items-start justify-between mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${getFileBg(doc.type)}`}>
                        {getFileIcon(doc.type, 28)}
                    </div>
                    <button className="p-2 text-slate-300 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                        <MoreVertical size={18} />
                    </button>
                </div>

                {/* Info */}
                <div className="flex-1 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-100 text-[10px] font-bold uppercase tracking-wider">
                            {doc.category}
                        </span>
                        {/* Fake "New" badge for recent items */}
                        {new Date(doc.date).getFullYear() === 2023 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                        )}
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors" title={doc.title}>
                        {doc.title}
                    </h3>
                </div>

                {/* Footer Meta */}
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium border-t border-slate-50 pt-4 mt-auto">
                    <div className="flex items-center gap-2">
                        <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{doc.type.toUpperCase()}</span>
                        <span>{doc.size}</span>
                    </div>
                    <span>{new Date(doc.date).toLocaleDateString()}</span>
                </div>

                {/* Hover Action Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-white/95 backdrop-blur-sm rounded-b-2xl border-t border-teal-100 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                     <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-50 text-teal-700 font-bold text-xs hover:bg-teal-100 transition-colors">
                        <Download size={16} /> Baixar
                    </button>
                    <button 
                        onClick={() => handleDelete(doc.id)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        ))}

        {/* Empty State */}
        {filteredDocs.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Search size={32} className="opacity-50" />
                </div>
                <h3 className="font-bold text-slate-700 text-xl mb-1">Nenhum documento encontrado</h3>
                <p className="text-slate-500 mb-8 max-w-sm text-center">Não encontramos arquivos com os filtros atuais. Tente buscar por outro termo ou categoria.</p>
                <button 
                    onClick={() => { setSearchTerm(''); setActiveCategory('Todos'); }}
                    className="text-teal-600 font-bold hover:underline"
                >
                    Limpar filtros
                </button>
            </div>
        )}
      </div>

      {/* --- CATEGORY MANAGER MODAL --- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-xl font-display font-bold text-slate-800">Gerenciar Categorias</h3>
                    <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                    {/* Add New */}
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="Nova Categoria..." 
                            className="flex-1 p-3 rounded-xl border border-slate-200 outline-none focus:border-teal-400 text-sm font-medium"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <button onClick={handleAddCategory} className="p-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"><Plus size={20} /></button>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                {editingCategoryIndex === idx ? (
                                    <div className="flex items-center gap-2 flex-1">
                                        <input 
                                            type="text" 
                                            autoFocus
                                            className="flex-1 p-1.5 rounded-lg border border-indigo-200 outline-none text-sm font-bold text-slate-700"
                                            value={editingCategoryName}
                                            onChange={(e) => setEditingCategoryName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleEditCategory(idx)}
                                        />
                                        <button onClick={() => handleEditCategory(idx)} className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"><Check size={16} /></button>
                                        <button onClick={() => setEditingCategoryIndex(null)} className="p-1.5 bg-slate-200 text-slate-500 rounded-lg hover:bg-slate-300"><X size={16} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <span className={`text-sm font-medium ${cat === 'Todos' ? 'text-slate-400 italic' : 'text-slate-700'}`}>{cat}</span>
                                        {cat !== 'Todos' && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingCategoryIndex(idx); setEditingCategoryName(cat); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"><Edit3 size={16} /></button>
                                                <button onClick={() => handleDeleteCategory(idx)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"><Trash2 size={16} /></button>
                                            </div>
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

      {/* --- NEW DOCUMENT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-800">Novo Documento</h2>
                        <p className="text-xs text-slate-500 mt-1">Preencha os dados para adicionar à biblioteca</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Título do Arquivo</label>
                        <input type="text" placeholder="Ex: Contrato Terapêutico 2024" className="w-full p-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-teal-50 focus:border-teal-400 outline-none transition-all font-medium text-slate-700" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                        <select className="w-full p-4 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-teal-50 focus:border-teal-400 outline-none transition-all font-medium text-slate-600">
                            {categories.filter(c => c !== 'Todos').map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Upload de Arquivo</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-teal-50/30 hover:border-teal-300 transition-all group">
                            <div className="w-16 h-16 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-teal-100 transition-all shadow-sm">
                                <CloudUpload size={32} />
                            </div>
                            <p className="text-base font-bold text-slate-700 mb-1">Clique para selecionar</p>
                            <p className="text-xs text-slate-400">ou arraste e solte aqui</p>
                            <div className="mt-4 flex gap-2 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                <span className="bg-slate-100 px-2 py-1 rounded">PDF</span>
                                <span className="bg-slate-100 px-2 py-1 rounded">DOCX</span>
                                <span className="bg-slate-100 px-2 py-1 rounded">JPG</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={() => { setIsModalOpen(false); alert('Documento salvo com sucesso! (Demo)'); }}
                        className="px-8 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200 hover:-translate-y-0.5 transition-all"
                    >
                        Salvar Arquivo
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
