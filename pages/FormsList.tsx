import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClinicalForm, Patient, FormCategory } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, ClipboardList, BarChart3, Pen, Trash2, CheckCircle, Share2,
  Copy, Send, FilePlus2, Eye, ChevronRight,
  Filter, Heart, Brain, FileText, Target, Settings2,
  Mail, Loader2
} from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useAuth } from '../contexts/AuthContext';
import { getPublicBaseUrl } from '@/src/lib/publicLinks';
import { getGenderedSpecialty } from '@/src/lib/professionalTitle';
import {
  PageWrapper, SectionTitle, StatGrid, StatCard, ContentCard, Button, IconButton, Input, Modal, ModalFooter,
  ConfirmModal, Combobox, Badge, Alert, Tabs, EmptyState,
  FilterLine, FilterLineSection, FilterLineSearch, FilterLineSegmented, FilterLineSelect,
} from '../components/UI';
import { FormsTabs } from '../components/Forms/FormsTabs';

const shareTabs = [
  { id: 'public', label: 'Link aberto' },
  { id: 'patient', label: 'Individual' },
] as const;
type ShareTabId = typeof shareTabs[number]['id'];

export const FormsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { preferences, updatePreference, formsArchived: archivedIds, setFormsArchived, formsFavorites: favoriteIds, setFormsFavorites } = useUserPreferences();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
  const [shareTab, setShareTab] = useState<ShareTabId>('public');

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
      case 'TCC': return <Target size={14} />;
      case 'Neuropsicologia': return <Brain size={14} />;
      case 'Psicopedagogia': return <ClipboardList size={14} />;
      case 'Psicanálise': return <Heart size={14} />;
      case 'Anamnese': return <FileText size={14} />;
      case 'Eventos': return <BarChart3 size={14} />;
      case 'Humanista': return <Heart size={14} />;
      default: return <Filter size={14} />;
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
    let url = `${getPublicBaseUrl()}/f/${selectedForm.hash}`;
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
    const apiBase = `${getPublicBaseUrl()}/api`;
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
    const greeting = patient ? `Olá, ${patient.full_name}! 😊` : 'Olá! 😊';
    const genderedSpecialty = getGenderedSpecialty(user?.specialty, user?.gender);
    const professionalLine = user?.name ? `\n\n*${user.name}${genderedSpecialty ? ` | ${genderedSpecialty}` : ''}*` : '';
    const message = `${greeting}\n\nVocê está recebendo o formulário "${selectedForm?.title || 'de avaliação'}" para o levantamento de dados importantes para o acompanhamento do seu processo terapêutico.\n\nPoderia, por gentileza, dedicar alguns minutos para preenchê-lo?\n\n${link}\n\nAgradeço pela atenção e colaboração! 💙${professionalLine}`;
    const phone = (patient as any)?.whatsapp || (patient as any)?.phone || '';
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const handleEmailShare = async () => {
    const patient = patients.find(p => String(p.id) === selectedPatientId);
    if (!patient) { pushToast('error', 'Selecione um paciente.'); return; }
    if (!(patient as any)?.email) { pushToast('error', 'Este paciente não tem e-mail cadastrado.'); return; }
    if (!selectedForm) return;
    setIsSendingEmail(true);
    try {
      await api.post(`/forms/${selectedForm.hash}/send-email`, { patient_id: patient.id });
      pushToast('success', 'Formulário enviado por e-mail!');
    } catch (err: any) {
      pushToast('error', err?.message || 'Não foi possível enviar o e-mail.');
    } finally {
      setIsSendingEmail(false);
    }
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
  const visibleForms = forms.filter(f => !(f as any).isSystem);
  const personalCount = visibleForms.filter(f => !f.isGlobal).length;
  const globalCount = visibleForms.filter(f => f.isGlobal).length;

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={ClipboardList}
          title="Formulários e Avaliações"
          description={`${forms.length} modelos · ${totalResponses} registros totais`}
          action={
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/formularios')}>Voltar</Button>
              <Button variant="outline" size="sm" iconLeft={<Settings2 size={14} />} onClick={() => setIsCategoryModalOpen(true)}>
                Categorias
              </Button>
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => navigate('/formularios/novo')}>
                Novo modelo
              </Button>
            </>
          }
        />

        <StatGrid cols={4}>
          <StatCard title="Modelos" value={visibleForms.length} icon={ClipboardList} />
          <StatCard title="Pessoais" value={personalCount} icon={Pen} color="success" />
          <StatCard title="Biblioteca global" value={globalCount} icon={Share2} color="info" />
          <StatCard title="Respostas" value={totalResponses} icon={BarChart3} color="warning" />
        </StatGrid>

        <FormsTabs />

        <FilterLine>
          <FilterLineSection grow>
            <div className="w-full sm:max-w-[280px]">
              <FilterLineSearch
                aria-label="Pesquisar formulários"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Pesquisar por título, tema ou área..."
              />
            </div>
          </FilterLineSection>
          <FilterLineSection wrap>
            <FilterLineSelect
              label="Especialidade"
              value={activeCategory}
              onChange={setActiveCategory}
              options={allAvailableCategories.map(c => ({ value: c, label: c }))}
            />
            <FilterLineSegmented
              value={activeFilter}
              onChange={(val) => setActiveFilter(val as any)}
              options={[
                { value: 'Todos', label: 'Todos' },
                { value: 'Ativos', label: 'Ativos' },
                { value: 'Favoritos', label: 'Favoritos' },
                { value: 'Arquivados', label: 'Arquivados' },
              ]}
            />
          </FilterLineSection>
        </FilterLine>

        {isLoading ? (
          <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 size={18} className="animate-spin" />Carregando...
          </div>
        ) : (
          <div className="space-y-4">
            {['Meus Formulários', 'Modelos e Biblioteca Global'].map((section) => {
              const sectionForms = filteredForms.filter(f =>
                section === 'Meus Formulários' ? !f.isGlobal : f.isGlobal
              );

              if (sectionForms.length === 0 && section === 'Meus Formulários' && activeCategory !== 'Todas' && !searchTerm) return null;

              return (
                <section key={section} className="space-y-3">
                  <h2 className="text-sm font-medium text-slate-900">
                    {section} <span className="text-[11px] font-normal text-slate-500">({sectionForms.length})</span>
                  </h2>

                  {sectionForms.length === 0 ? (
                    <ContentCard>
                      <EmptyState
                        icon={FilePlus2}
                        title="Nenhum formulário"
                        description={`Não encontramos registros ${section === 'Meus Formulários' ? 'pessoais' : 'globais'} nesta categoria.`}
                      />
                    </ContentCard>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {sectionForms.map((form) => {
                        const isFav = favoriteIds.includes(form.id);

                        return (
                          <ContentCard
                            key={form.id}
                            padding="none"
                            className="group hover:border-primary-200 transition-all overflow-hidden flex flex-col h-full"
                          >
                            <div className="p-3 flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className={`w-7 h-7 rounded-md border flex items-center justify-center shrink-0 ${form.isGlobal ? 'bg-primary-50 border-primary-100 text-primary-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                                  {getCategoryIcon(form.category || '')}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Badge size="sm" dot color={form.isGlobal ? 'primary' : 'success'}>{form.isGlobal ? 'Global' : 'Pessoal'}</Badge>
                                  <IconButton
                                    variant="ghost"
                                    size="xs"
                                    aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                    title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                    onClick={(e) => { e.stopPropagation(); toggleFavorite(form.id); }}
                                    className={isFav ? 'text-amber-500' : 'text-slate-400'}
                                  >
                                    <Heart size={14} className={isFav ? 'fill-amber-500' : ''} />
                                  </IconButton>
                                </div>
                              </div>
                              <h3 className="text-sm font-medium text-slate-900 leading-tight line-clamp-2 break-words">{form.title}</h3>
                              {form.category && <p className="text-[11px] text-slate-500 mt-0.5">{form.category}</p>}
                              <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-1.5">
                                {form.description || 'Modelo especializado para avaliação clínica estruturada e acompanhamento terapêutico.'}
                              </p>
                            </div>

                            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                              <Button
                                variant="ghost"
                                size="xs"
                                iconRight={<ChevronRight size={12} />}
                                onClick={() => navigate(`/formularios/${form.id}/respostas`)}
                              >
                                {form.responseCount} respostas
                              </Button>

                              <div className="flex items-center gap-0.5">
                                <IconButton variant="ghost" size="xs" aria-label="Visualizar" title="Visualizar" onClick={() => window.open(`/f/${form.hash}`, '_blank')}>
                                  <Eye size={14} />
                                </IconButton>
                                {form.isGlobal ? (
                                  <IconButton variant="ghost" size="xs" aria-label="Duplicar" title="Duplicar" onClick={() => handleDuplicate(form.id)}>
                                    <Copy size={14} />
                                  </IconButton>
                                ) : (
                                  <IconButton variant="ghost" size="xs" aria-label="Editar" title="Editar" onClick={() => navigate(`/formularios/${form.id}`)}>
                                    <Pen size={14} />
                                  </IconButton>
                                )}
                                <IconButton variant="ghost" size="xs" aria-label="Compartilhar" title="Compartilhar" onClick={() => handleOpenShare(form)}>
                                  <Share2 size={14} />
                                </IconButton>
                                {!form.isGlobal && (
                                  <IconButton variant="ghost" size="xs" aria-label="Excluir" title="Excluir" className="text-red-500 hover:text-red-600" onClick={() => confirmDeleteForm(form)}>
                                    <Trash2 size={14} />
                                  </IconButton>
                                )}
                              </div>
                            </div>
                          </ContentCard>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Gerenciar categorias"
        size="md"
        footer={
          <ModalFooter align="right">
            <Button variant="primary" size="sm" onClick={() => setIsCategoryModalOpen(false)}>
              Concluir
            </Button>
          </ModalFooter>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Crie categorias personalizadas para organizar melhor seus formulários.
          </p>

          <div className="flex items-end gap-2">
            <Input
              label="Nome da nova categoria"
              placeholder="Ex: Terapia Infantil, Casal..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              wrapperClassName="flex-1"
            />
            <Button
              variant="primary"
              size="md"
              onClick={handleCreateCategory}
              loading={isAddingCategory}
              disabled={isAddingCategory}
              iconLeft={<Plus size={14} />}
            >
              Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Suas categorias</p>
            {userCategories.length === 0 && (
              <EmptyState title="Nenhuma categoria personalizada criada ainda." />
            )}
            {userCategories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between gap-2 p-2.5 bg-white border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-md border border-primary-100 bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                    <Filter size={14} />
                  </div>
                  <span className="text-[13px] font-medium text-slate-800 truncate">{cat.name}</span>
                </div>
                <IconButton
                  variant="ghost"
                  size="sm"
                  aria-label={`Excluir categoria ${cat.name}`}
                  title="Excluir categoria"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => handleDeleteCategory(cat.id)}
                >
                  <Trash2 size={14} />
                </IconButton>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteForm}
        variant="danger"
        title="Excluir formulário?"
        confirmLabel="Excluir definitivamente"
        message={
          <>
            Esta ação não pode ser desfeita: isso excluirá o formulário{' '}
            <strong className="font-semibold text-slate-800">"{formToDelete?.title}"</strong> e todas as respostas vinculadas a ele.
          </>
        }
      />

      {/* SHARE MODAL */}
      <Modal
        isOpen={isShareModalOpen && !!selectedForm}
        onClose={() => setIsShareModalOpen(false)}
        title="Compartilhar"
        subtitle={selectedForm?.title}
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsShareModalOpen(false)}>
              Fechar
            </Button>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {shareTab === 'patient' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmailShare}
                  loading={isSendingEmail}
                  disabled={isSendingEmail}
                  iconLeft={<Mail size={14} />}
                >
                  E-mail
                </Button>
              )}
              <Button
                variant="success"
                size="sm"
                onClick={handleWhatsAppShare}
                iconLeft={<Send size={14} />}
              >
                Enviar via WhatsApp
              </Button>
            </div>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Tabs<ShareTabId>
            items={shareTabs}
            value={shareTab}
            onChange={setShareTab}
            label="Tipo de compartilhamento"
          >
            <div className="space-y-3">
              {shareTab === 'patient' && (
                <Combobox
                  label="Destinatário (paciente)"
                  options={patients
                    .filter((p: any) => p.status === 'ativo' || p.status === 'active')
                    .map(p => ({ id: p.id, label: p.full_name || p.name || '' }))}
                  value={selectedPatientId}
                  onChange={(val) => setSelectedPatientId(String(val))}
                  placeholder="Selecione o paciente..."
                />
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Link de acesso</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 truncate select-all">
                    {getShareLink() || 'Configure os campos acima'}
                  </div>
                  <IconButton
                    variant={copiedLink ? 'success' : 'outline'}
                    size="md"
                    aria-label="Copiar link"
                    title="Copiar link"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? <CheckCircle size={14} /> : <Copy size={14} />}
                  </IconButton>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      </Modal>

      {/* TOASTS */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-[200] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        {toasts.map(t => (
          <Alert key={t.id} variant={t.type === 'success' ? 'success' : 'error'} className="shadow-sm bg-white">
            {t.message}
          </Alert>
        ))}
      </div>
    </PageWrapper>
  );
};
