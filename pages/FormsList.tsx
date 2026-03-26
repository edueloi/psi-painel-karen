import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClinicalForm, Patient, FormCategory } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, ClipboardList, BarChart3, Pen, Trash2, CheckCircle, Share2,
  Copy, Send, FilePlus2, Eye, ChevronRight,
  Filter, Heart, Brain, FileText, Target, AlertCircle, Settings2, PlusCircle,
  ChevronLeft, ArrowLeft
} from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { AppCard } from '../components/UI/AppCard';
import { Button } from '../components/UI/Button';
import { Input } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Combobox } from '../components/UI/Combobox';
import { 
  FilterLine, 
  FilterLineSection, 
  FilterLineSearch, 
  FilterLineSegmented 
} from '../components/UI/FilterLine';

export const FormsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { preferences, updatePreference, formsArchived: archivedIds, setFormsArchived, formsFavorites: favoriteIds, setFormsFavorites } = useUserPreferences();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilterState] = useState<'Todos' | 'Ativos' | 'Arquivados' | 'Favoritos'>(
    preferences.forms?.activeFilter ?? 'Todos'
  );

  const setActiveFilter = (val: 'Todos' | 'Ativos' | 'Arquivados' | 'Favoritos') => {
    setActiveFilterState(val);
    updatePreference('forms', { activeFilter: val });
  };
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [defaultPatientId, setDefaultPatientId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; type: 'success' | 'error'; message: string }[]>([]);
  
  // Category Management State
  const [userCategories, setUserCategories] = useState<FormCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Deletion Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formToDelete, setFormToDelete] = useState<ClinicalForm | null>(null);

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ClinicalForm | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareTab, setShareTab] = useState<'public' | 'patient'>('public');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [formsData, patientsData, categoriesData] = await Promise.all([
        api.get<any[]>('/forms'),
        api.get<any[]>('/patients'),
        api.get<FormCategory[]>('/forms/categories').catch(() => [])
      ]);
      
      const mapped = (formsData || []).map((f) => ({
        id: String(f.id),
        title: f.title,
        hash: f.hash,
        description: f.description || '',
        questions: [],
        interpretations: [],
        responseCount: f.response_count ?? 0,
        isGlobal: Boolean(f.is_global),
        isSystem: Boolean(f.is_system),
        category: f.category || ''
      })) as ClinicalForm[];
      
      setForms(mapped);
      setUserCategories(categoriesData || []);
      
      const normalizedPatients = (patientsData || []).map((p: any) => ({
        ...p,
        full_name: p.name || p.full_name || '',
        id: String(p.id)
      })) as Patient[];
      setPatients(normalizedPatients);
    } catch (err) {
      console.error(err);
      pushToast('error', 'Ocorreu um erro ao carregar os dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId) {
      setDefaultPatientId(patientId);
      setSelectedPatientId(patientId);
    }
  }, [searchParams]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      await api.post('/forms/categories', { name: newCategoryName });
      setNewCategoryName('');
      loadData();
      pushToast('success', 'Categoria criada com sucesso!');
    } catch (err) {
      pushToast('error', 'Erro ao criar categoria.');
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Excluir esta categoria? Isso não removerá os formulários que a utilizam.')) return;
    try {
      await api.delete(`/forms/categories/${id}`);
      loadData();
      pushToast('success', 'Categoria removida.');
    } catch (err) {
      pushToast('error', 'Erro ao remover categoria.');
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await api.post(`/forms/${id}/duplicate`, {});
      pushToast('success', 'Formulário duplicado com sucesso! Agora você pode editá-lo.');
      loadData();
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao duplicar o formulário.');
    }
  };

  const staticCategories = ['TCC', 'Neuropsicologia', 'Psicopedagogia', 'Psicanálise', 'Anamnese', 'Eventos', 'Humanista'];
  const allAvailableCategories = Array.from(new Set([
    'Todas',
    ...staticCategories,
    ...userCategories.map(c => c.name),
    ...forms.map(f => f.category).filter(Boolean)
  ]));

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'TCC': return <Target size={20} />;
      case 'Neuropsicologia': return <Brain size={20} />;
      case 'Psicopedagogia': return <ClipboardList size={20} />;
      case 'Psicanálise': return <Heart size={20} />;
      case 'Anamnese': return <FileText size={20} />;
      case 'Eventos': return <BarChart3 size={20} />;
      case 'Humanista': return <Heart size={20} />;
      default: return <Filter size={20} />;
    }
  };

  const handleOpenShare = (form: ClinicalForm) => {
    setSelectedForm(form);
    setSelectedPatientId(defaultPatientId || '');
    setShareTab(defaultPatientId ? 'patient' : 'public');
    setCopiedLink(false);
    setIsShareModalOpen(true);
  };

  const getShareLink = () => {
    if (!selectedForm) return '';
    let url = `${window.location.origin}/f/${selectedForm.hash}`;
    const params = new URLSearchParams();
    if (shareTab === 'patient' && selectedPatientId) params.set('p', selectedPatientId);
    if (user?.shareToken) params.set('u', user.shareToken);
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  };

  // URL especial para compartilhamento social (WhatsApp, Telegram, etc.)
  // Passa pelo backend que serve os OG meta tags corretos (logo da clínica, nome do formulário, etc.)
  const getOgShareLink = () => {
    if (!selectedForm) return '';
    const apiBase = (import.meta as any).env?.VITE_API_URL || 'https://psiflux.com.br/api';
    let url = `${apiBase}/forms/og/${selectedForm.hash}`;
    const params = new URLSearchParams();
    if (shareTab === 'patient' && selectedPatientId) params.set('p', selectedPatientId);
    if (user?.shareToken) params.set('u', user.shareToken);
    const qs = params.toString();
    return qs ? `${url}?${qs}` : url;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    const link = getOgShareLink(); // usa rota OG para preview correto
    const patient = patients.find(p => String(p.id) === selectedPatientId);
    const message = patient
      ? `Olá ${patient.full_name}, por favor preencha este formulário: ${link}`
      : `Olá, por favor preencha este formulário: ${link}`;
    const phone = (patient as any)?.whatsapp || (patient as any)?.phone || '';
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const toggleArchive = (id: string) => {
    const next = archivedIds.includes(id)
      ? archivedIds.filter(item => item !== id)
      : [...archivedIds, id];
    setFormsArchived(next);
  };

  const toggleFavorite = (id: string) => {
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter(item => item !== id)
      : [...favoriteIds, id];
    setFormsFavorites(next);
  };

  const confirmDeleteForm = (form: ClinicalForm) => {
    setFormToDelete(form);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteForm = () => {
    if (!formToDelete) return;
    api.delete(`/forms/${formToDelete.id}`)
      .then(() => {
        setForms(prev => prev.filter(f => f.id !== formToDelete.id));
        pushToast('success', 'Formulário excluído com sucesso.');
        setIsDeleteModalOpen(false);
        setFormToDelete(null);
      })
      .catch((e) => pushToast('error', e.message || 'Erro ao remover'));
  };

  const filteredForms = forms.filter(f =>
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(f => !(f as any).isSystem).filter(f => {
    if (activeFilter === 'Arquivados') return archivedIds.includes(f.id);
    if (activeFilter === 'Ativos') return !archivedIds.includes(f.id);
    if (activeFilter === 'Favoritos') return favoriteIds.includes(f.id);
    return true;
  }).filter(f => {
    if (activeCategory === 'Todas') return true;
    return f.category === activeCategory;
  }).sort((a, b) => {
    const aFav = favoriteIds.includes(a.id) ? 0 : 1;
    const bFav = favoriteIds.includes(b.id) ? 0 : 1;
    return aFav - bFav;
  });

  const totalResponses = forms.reduce((sum, f) => sum + (f.responseCount || 0), 0);

  return (
    <div className="space-y-8 pb-24 px-4 sm:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 flex-wrap pt-6 text-left">
        <div className="flex items-center gap-4 text-left">
           <button
             onClick={() => navigate('/formularios')}
             className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200"
             title="Voltar para Formulários"
           >
             <ArrowLeft size={24} />
           </button>
           
           <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <ClipboardList size={26} />
           </div>
           <div className="text-left">
              <h1 className="text-3xl font-black text-slate-800 tracking-tight text-left">Formulários e Avaliações</h1>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest leading-none mt-1 text-left">
                {forms.length} Modelos · {totalResponses} Registros Totais
              </p>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            radius="xl"
            leftIcon={<BarChart3 size={18} />}
            onClick={() => navigate('/formularios/metricas')}
            className="border-slate-200 text-slate-600 hover:text-indigo-600"
          >
            Ver Métricas
          </Button>

          <Button
            variant="outline"
            size="lg"
            radius="xl"
            leftIcon={<Settings2 size={18} />}
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-slate-200 text-slate-600 hover:text-indigo-600"
          >
            Categorias
          </Button>

          <Button
            variant="primary"
            size="lg"
            radius="xl"
            leftIcon={<Plus size={18} />}
            onClick={() => navigate('/formularios/novo')}
            className="bg-slate-900 text-white shadow-xl hover:bg-slate-800"
          >
            Novo Modelo
          </Button>
        </div>
      </div>

      <FilterLine className="shadow-xl shadow-indigo-500/5 py-4 px-6 border-slate-100">
        <FilterLineSection grow>
          <FilterLineSearch 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Pesquisar por título, tema ou área clínica..."
            className="border-none bg-slate-50/50 focus-within:bg-white rounded-2xl py-6"
          />
        </FilterLineSection>

        <div className="h-8 w-px bg-slate-100 hidden xl:block mx-4" />

        <FilterLineSection>
          <FilterLineSegmented
            value={activeFilter}
            onChange={(val) => setActiveFilter(val as any)}
            options={[
              { value: 'Todos', label: 'Todos' },
              { value: 'Ativos', label: 'Ativos' },
              { value: 'Favoritos', label: '★ Favoritos' },
              { value: 'Arquivados', label: 'Arquivados' },
            ]}
            className="bg-slate-50 border-none p-1.5 rounded-[1.4rem]"
          />
        </FilterLineSection>
      </FilterLine>

      {/* Areas Horizontal Scroll Redesigned */}
      <div className="relative w-full">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-5 bg-indigo-500 rounded-full" />
             <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Filtrar por Especialidade</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{allAvailableCategories.length} categorias</span>
        </div>
        
        <div className="relative group/scroll flex items-center gap-2">
            <button
              onClick={() => categoryScrollRef.current?.scrollBy({ left: -250, behavior: 'smooth' })}
              className="shrink-0 w-10 h-10 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all z-10"
              title="Anterior"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>

            <div className="relative flex-1 overflow-hidden">
              <div 
                ref={categoryScrollRef}
                className="flex overflow-x-auto no-scrollbar py-2 scroll-smooth snap-x gap-2.5"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {allAvailableCategories.map(cat => {
                  const isActive = activeCategory === cat;
                  const icon = getCategoryIcon(cat);
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border transition-all shrink-0 snap-start ${
                        isActive 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <div className={`flex-shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}>
                        {React.cloneElement(icon as React.ReactElement, { size: 14, strokeWidth: 3 })}
                      </div>
                      <span className="text-[11px] font-bold tracking-tight whitespace-nowrap">{cat}</span>
                    </button>
                  );
                })}

                <button
                   onClick={() => setIsCategoryModalOpen(true)}
                   className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-dashed border-slate-300 bg-slate-50/50 text-slate-400 hover:border-indigo-400 hover:bg-slate-50 hover:text-indigo-600 transition-all shrink-0 snap-start"
                >
                   <PlusCircle size={14} strokeWidth={3} />
                   <span className="text-[11px] font-bold tracking-tight">Nova</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => categoryScrollRef.current?.scrollBy({ left: 250, behavior: 'smooth' })}
              className="shrink-0 w-10 h-10 bg-white rounded-full shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all z-10"
              title="Próximo"
            >
              <ChevronRight size={20} strokeWidth={3} />
            </button>
        </div>
      </div>

      <div className="space-y-16">
        {['Meus Formulários', 'Modelos e Biblioteca Global'].map((section) => {
          const sectionForms = filteredForms.filter(f => 
            section === 'Meus Formulários' ? !f.isGlobal : f.isGlobal
          );
          
          if (sectionForms.length === 0 && section === 'Meus Formulários' && activeCategory !== 'Todas' && !searchTerm) return null;

          return (
            <div key={section} className="space-y-10 text-left">
              <div className="flex items-center gap-8 text-left">
                <div className="flex flex-col text-left">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-left">{section}</h3>
                  <div className="h-1 w-12 bg-indigo-600 rounded-full mt-2 text-left"></div>
                </div>
                <div className="h-px bg-gradient-to-r from-slate-100 to-transparent flex-1"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {sectionForms.length === 0 ? (
                  <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4 text-slate-200">
                      <FilePlus2 size={32} />
                    </div>
                    <h3 className="text-base font-black text-slate-400 uppercase tracking-widest">Nenhum Formulário</h3>
                    <p className="text-slate-400 text-sm mt-1.5 max-w-xs mx-auto font-medium">
                      Não encontramos registros {section === 'Meus Formulários' ? 'pessoais' : 'globais'} nesta categoria.
                    </p>
                  </div>
                ) : (
                  sectionForms.map((form) => {
                    const isFav = favoriteIds.includes(form.id);

                    return (
                      <AppCard
                        key={form.id}
                        className="group bg-white border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-lg hover:shadow-indigo-500/8 rounded-2xl transition-all duration-300 flex flex-col overflow-hidden"
                      >
                        <div className="flex flex-col h-full">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-3 rounded-xl ${form.isGlobal ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}>
                              {getCategoryIcon(form.category || '')}
                            </div>
                            <div className="flex items-start gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFavorite(form.id); }}
                                className={`p-1.5 rounded-xl transition-all ${isFav ? 'text-amber-500 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-amber-50'}`}
                                title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                              >
                                <Heart size={15} className={isFav ? 'fill-amber-500' : ''} />
                              </button>
                              <div className="flex flex-col items-end gap-1 pt-0.5">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${form.isGlobal ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {form.isGlobal ? 'Global' : 'Pessoal'}
                                </span>
                                {form.category && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    {form.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 mb-4">
                            <h3 className="text-sm font-black text-slate-800 mb-1.5 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {form.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                              {form.description || 'Modelo especializado para avaliação clínica estruturada e acompanhamento terapêutico.'}
                            </p>
                          </div>

                          {/* Footer */}
                          <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                            <button
                              onClick={() => navigate(`/formularios/${form.id}/respostas`)}
                              className="flex flex-col gap-0.5 group/btn"
                            >
                              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Respostas</span>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover/btn:scale-150 transition-transform"></div>
                                <span className="text-lg font-black text-slate-700 group-hover/btn:text-indigo-600 transition-colors leading-none">{form.responseCount}</span>
                                <ChevronRight size={13} className="text-slate-300 group-hover/btn:text-indigo-500 group-hover/btn:translate-x-0.5 transition-all" />
                              </div>
                            </button>

                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => window.open(`/f/${form.hash}`, '_blank')}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Visualizar"
                              >
                                <Eye size={14} />
                              </button>
                              {form.isGlobal ? (
                                <button
                                  onClick={() => handleDuplicate(form.id)}
                                  className="p-2 text-white bg-slate-800 rounded-xl hover:bg-indigo-600 transition-all"
                                  title="Duplicar"
                                >
                                  <Copy size={14} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => navigate(`/formularios/${form.id}`)}
                                  className="p-2 text-indigo-600 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all"
                                  title="Editar"
                                >
                                  <Pen size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenShare(form)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Compartilhar"
                              >
                                <Share2 size={14} />
                              </button>
                              {!form.isGlobal && (
                                <button
                                  onClick={() => confirmDeleteForm(form)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </AppCard>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Gerenciar Categorias"
        maxWidth="md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
             <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCategoryModalOpen(false)}
             >
                Concluir
             </Button>
          </div>
        }
      >
        <div className="space-y-8 p-1 text-left">
          <p className="text-sm text-slate-500 text-left">
            Crie categorias personalizadas para organizar melhor seus formulários.
          </p>

          <div className="flex gap-3 text-left">
            <Input
              label="Nome da Nova Categoria"
              placeholder="Ex: Terapia Infantil, Casal..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="flex-1"
            />
            <div className="pt-7">
              <Button
                variant="primary"
                onClick={handleCreateCategory}
                isLoading={isAddingCategory}
                leftIcon={<Plus size={18} />}
                className="h-[42px]"
              >
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-3 pt-4 text-left">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Suas Categorias</label>
            <div className="grid grid-cols-1 gap-2 text-left">
              {userCategories.length === 0 && (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                   <p className="text-xs text-slate-400 font-medium">Nenhuma categoria personalizada criada ainda.</p>
                </div>
              )}
              {userCategories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition-all text-left">
                  <div className="flex items-center gap-3 text-left">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Filter size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Excluir Formulário"
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsDeleteModalOpen(false)}
            >
                Cancelar
            </Button>
            <Button 
                variant="danger" 
                size="sm" 
                onClick={handleDeleteForm}
            >
                Excluir Definitivamente
            </Button>
          </div>
        }
      >
        <div className="space-y-4 p-1 text-left">
          <div className="flex items-center gap-4 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
             <AlertCircle size={32} />
             <div className="text-left">
                <p className="text-sm font-black uppercase tracking-tight">Ação Irreversível</p>
                <p className="text-xs font-bold opacity-80">Isso excluirá o formulário e todas as respostas vinculadas a ele.</p>
             </div>
          </div>
          <p className="text-sm text-slate-600 text-left">
            Tem certeza que deseja excluir <strong className="font-black text-slate-800">"{formToDelete?.title}"</strong>?
          </p>
        </div>
      </Modal>

      {/* SHARE MODAL */}
      <Modal
        isOpen={isShareModalOpen && !!selectedForm}
        onClose={() => setIsShareModalOpen(false)}
        title="Compartilhar"
        subtitle={selectedForm?.title}
        maxWidth="max-w-lg"
        footer={
          <div className="flex w-full gap-3">
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)} className="flex-1">
              Fechar
            </Button>
            <Button
              variant="primary"
              onClick={handleWhatsAppShare}
              leftIcon={<Send size={18} />}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 border-emerald-500"
            >
              Enviar via WhatsApp
            </Button>
          </div>
        }
      >
        <div className="space-y-5 py-1">
          {/* Tabs */}
          <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl">
            {(['public', 'patient'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setShareTab(tab)}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                  shareTab === tab
                    ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200/50'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'public' ? 'Link Aberto' : 'Individual'}
              </button>
            ))}
          </div>

          {/* Patient selector — only on Individual tab */}
          {shareTab === 'patient' && (
            <Combobox
              label="Destinatário (Paciente)"
              options={patients
                .filter((p: any) => p.status === 'ativo' || p.status === 'active')
                .map(p => ({ id: p.id, label: p.full_name || p.name || '' }))}
              value={selectedPatientId}
              onChange={(val) => setSelectedPatientId(String(val))}
              placeholder="Selecione o paciente..."
            />
          )}

          {/* Link */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link de Acesso</label>
            <div className="flex gap-2">
              <div className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 truncate select-all">
                {getShareLink() || 'Configure os campos acima'}
              </div>
              <Button
                variant={copiedLink ? 'success' : 'secondary'}
                onClick={handleCopyLink}
                iconOnly
                className="shrink-0 w-12 h-12 rounded-xl"
              >
                {copiedLink ? <CheckCircle size={18} /> : <Copy size={18} />}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* TOASTS */}
      <div className="fixed bottom-10 right-10 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-xl border-2 backdrop-blur-md animate-in slide-in-from-right-full duration-500 ${t.type === 'success' ? 'bg-emerald-50/90 text-emerald-600 border-emerald-100' : 'bg-red-50/90 text-red-600 border-red-100'}`}>
            {t.type === 'success' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
