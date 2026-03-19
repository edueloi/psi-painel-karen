import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClinicalForm, Patient, FormCategory } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Plus, ClipboardList, BarChart3, Pen, Trash2, CheckCircle, Share2,
  Copy, Send, FilePlus2, X, Eye, ChevronRight,
  Filter, Heart, Brain, FileText, Target, AlertCircle, Settings2, PlusCircle, Trash
} from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { AppCard } from '../components/UI/AppCard';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { 
  FilterLine, 
  FilterLineSection, 
  FilterLineSearch, 
  FilterLineSegmented 
} from '../components/UI/FilterLine';

export const FormsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formsArchived: archivedIds, setFormsArchived } = useUserPreferences();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'Todos' | 'Ativos' | 'Arquivados'>('Todos');
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
    if (shareTab === 'patient' && selectedPatientId) {
      url += `?p=${selectedPatientId}`;
    }
    return url;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareLink()).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    const link = getShareLink();
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
  ).filter(f => {
    if (activeFilter === 'Arquivados') return archivedIds.includes(f.id);
    if (activeFilter === 'Ativos') return !archivedIds.includes(f.id);
    return true;
  }).filter(f => {
    if (activeCategory === 'Todas') return true;
    return f.category === activeCategory;
  });

  const totalResponses = forms.reduce((sum, f) => sum + (f.responseCount || 0), 0);

  return (
    <div className="space-y-8 pb-24 px-4 sm:px-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-left">
      {/* Header */}
      <div className="flex items-center justify-between gap-6 flex-wrap pt-6 text-left">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-4 text-left">
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
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            radius="xl"
            leftIcon={<Settings2 size={18} />}
            onClick={() => setIsCategoryModalOpen(true)}
            className="border-slate-200 text-slate-600 hover:text-indigo-600"
          >
            Gerenciar Categorias
          </Button>

          <Button
            variant="primary"
            size="lg"
            radius="xl"
            leftIcon={<Plus size={18} />}
            onClick={() => navigate('/formularios/novo')}
            className="bg-slate-900 text-white shadow-xl hover:bg-slate-800"
          >
            Novo Formulário
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
              { value: 'Arquivados', label: 'Arquivados' },
            ]}
            className="bg-slate-50 border-none p-1.5 rounded-[1.4rem]"
          />
        </FilterLineSection>
      </FilterLine>

      {/* Areas Horizontal Scroll */}
      <div className="overflow-x-auto no-scrollbar pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x">
        <div className="flex gap-4 min-w-max pr-12 pb-2">
          {allAvailableCategories.map(cat => {
            const isActive = activeCategory === cat;
            
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 transition-all group shrink-0 ${
                  isActive 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-indigo-500 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-indigo-500'
                }`}>
                  {React.cloneElement(getCategoryIcon(cat) as React.ReactElement, { size: 16 })}
                </div>
                <span className="text-xs font-bold tracking-tight">{cat}</span>
              </button>
            );
          })}

          <button
             onClick={() => setIsCategoryModalOpen(true)}
             className="flex items-center gap-3 px-5 py-2.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30 text-slate-400 hover:border-indigo-300 hover:bg-slate-50 hover:text-indigo-600 transition-all shrink-0"
          >
             <PlusCircle size={16} />
             <span className="text-xs font-bold tracking-tight">Nova Categoria</span>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 text-left">
                {sectionForms.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-slate-200">
                      <FilePlus2 size={40} />
                    </div>
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nenhum Formulário</h3>
                    <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto font-medium">
                      Não encontramos registros {section === 'Meus Formulários' ? 'pessoais' : 'globais'} nesta categoria.
                    </p>
                  </div>
                ) : (
                  sectionForms.map((form) => {
                    const isArchived = archivedIds.includes(form.id);

                    return (
                      <AppCard 
                        key={form.id} 
                        className="group bg-white border-slate-100 hover:border-indigo-500/20 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-indigo-500/10 rounded-[2.5rem] transition-all duration-500 flex flex-col h-full overflow-visible"
                      >
                        <div className="text-left flex flex-col h-full">
                          <div className="flex justify-between items-start mb-6 text-left">
                            <div className={`p-4 rounded-2xl shadow-lg transition-all group-hover:scale-110 group-hover:rotate-6 ${
                              form.isGlobal ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'
                            }`}>
                              {getCategoryIcon(form.category || '')}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 text-right">
                               <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${
                                  form.isGlobal ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                } shadow-sm`}>
                                  {form.isGlobal ? 'Global' : 'Pessoal'}
                                </span>
                                {form.category && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">
                                    {form.category}
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="flex-1 text-left mb-8">
                            <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[2.8rem] text-left">
                              {form.title}
                            </h3>
                            <p className="text-xs text-slate-400 line-clamp-3 font-medium leading-relaxed text-left">
                              {form.description || 'Modelo especializado para avaliação clínica estruturada e acompanhamento terapêutico.'}
                            </p>
                          </div>

                          <div className="pt-6 border-t border-slate-50 flex items-center justify-between mt-auto text-left">
                            <div className="flex flex-col text-left">
                              <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 text-left">Entradas</span>
                              <button 
                                onClick={() => navigate(`/formularios/${form.id}/respostas`)}
                                className="flex items-center gap-2 group/btn text-left"
                              >
                                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover/btn:scale-150 transition-transform"></div>
                                 <span className="text-xl font-black text-slate-700 group-hover/btn:text-indigo-600 transition-colors">{form.responseCount}</span>
                                 <ChevronRight size={14} className="text-slate-300 group-hover/btn:text-indigo-600 transition-all group-hover/btn:translate-x-1" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                               <button
                                 onClick={() => window.open(`/f/${form.hash}`, '_blank')}
                                 className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                                 title="Visualizar"
                               >
                                 <Eye size={16} />
                               </button>
                               {form.isGlobal ? (
                                  <button
                                    onClick={() => handleDuplicate(form.id)}
                                    className="p-3.5 text-white bg-slate-900 rounded-2xl shadow-lg hover:bg-indigo-600 hover:-translate-y-1 transition-all"
                                    title="Duplicar"
                                  >
                                    <Copy size={16} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => navigate(`/formularios/${form.id}`)}
                                    className="p-3.5 text-indigo-600 bg-indigo-50 rounded-2xl hover:bg-indigo-100 hover:-translate-y-1 transition-all"
                                    title="Editar"
                                  >
                                    <Pen size={16} />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenShare(form)}
                                  className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                                  title="Compartilhar"
                                >
                                  <Share2 size={16} />
                                </button>
                                {!form.isGlobal && (
                                  <button
                                    onClick={() => confirmDeleteForm(form)}
                                    className="p-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
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
        primaryAction={{
          label: 'Concluir',
          onClick: () => setIsCategoryModalOpen(false),
          variant: 'primary'
        }}
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
        primaryAction={{
          label: 'Excluir Definitivamente',
          onClick: handleDeleteForm,
          variant: 'danger'
        }}
        secondaryAction={{
          label: 'Cancelar',
          onClick: () => setIsDeleteModalOpen(false)
        }}
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
      {isShareModalOpen && selectedForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 text-left">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsShareModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden text-left">
            <div className="p-8 text-left">
              <div className="flex justify-between items-start mb-8 text-left">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                    <Share2 size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight leading-none mb-2 text-left">Compartilhar</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px] text-left">{selectedForm.title}</p>
                  </div>
                </div>
                <button onClick={() => setIsShareModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6 text-left">
                <div className="flex p-1 bg-slate-50 border border-slate-100 rounded-2xl text-left">
                  {['public', 'patient'].map((tab) => (
                    <button
                       key={tab}
                       onClick={() => setShareTab(tab as any)}
                       className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xl ${
                         shareTab === tab ? 'bg-white text-indigo-600 shadow-md ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-slate-600'
                       }`}
                    >
                      {tab === 'public' ? 'Link Aberto' : 'Individual'}
                    </button>
                  ))}
                </div>

                {shareTab === 'patient' && (
                  <Select
                    label="Destinatário (Paciente)"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">Selecione o paciente...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.full_name}</option>
                    ))}
                  </Select>
                )}

                <div className="space-y-2 text-left">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-left">Link de Acesso</label>
                  <div className="flex gap-2 text-left">
                    <div className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-medium text-slate-600 truncate select-all">
                      {getShareLink() || 'Configure os campos acima' }
                    </div>
                    <Button
                       variant={copiedLink ? 'success' : 'secondary'}
                       onClick={handleCopyLink}
                       className="shrink-0 rounded-2xl w-14 h-14"
                       iconOnly
                    >
                       {copiedLink ? <CheckCircle size={20} /> : <Copy size={20} />}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 text-left">
                  <Button
                    variant="primary"
                    fullWidth
                    size="xl"
                    radius="xl"
                    onClick={handleWhatsAppShare}
                    leftIcon={<Send size={20} />}
                    className="bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 py-8"
                  >
                    Enviar via WhatsApp
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
