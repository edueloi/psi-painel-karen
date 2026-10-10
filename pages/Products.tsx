import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { MOCK_PRODUCTS } from '../constants';
import { Product } from '../types';
import { 
  Package, Search, Plus, Filter, Edit3, Trash2, AlertTriangle, 
  BarChart, Archive, DollarSign, Calendar, AlertOctagon,
  TrendingUp, Box, CheckCircle, Barcode, X, Image, UploadCloud, BookOpen,
  ShoppingBag, ArrowUpRight, Clock, CheckCircle2, AlertCircle, FileText,
  Sparkles, Layers, List as ListIcon, LayoutGrid,
  CreditCard, ArrowLeft
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Alert, Badge, Button, ConfirmModal, ContentCard, EmptyState, FilterLine, FilterLineSearch, FilterLineSection, FilterLineSegmented, FormRow, IconButton, Input, Modal, ModalFooter, PageWrapper, PanelCard, SectionTitle, Select, StatCard, StatGrid, Tabs } from "../components/UI";

const PRODUCT_TABS = [
  { id: 'list', labelKey: 'products.products', icon: Package },
  { id: 'dashboard', labelKey: 'products.inventory', icon: BarChart },
] as const;
type ProductsTab = typeof PRODUCT_TABS[number]['id'];

const PRODUCT_MODAL_TABS = [
  { id: 'dados', label: 'Dados', icon: Package },
  { id: 'preco', label: 'Preço e estoque', icon: DollarSign },
  { id: 'imagem', label: 'Imagem', icon: Image },
] as const;
type ProductModalTab = typeof PRODUCT_MODAL_TABS[number]['id'];

export const Products: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value);
  };

  const [activeTab, setActiveTab] = useState<ProductsTab>('list');
  const [modalTab, setModalTab] = useState<ProductModalTab>('dados');
  const [savingProduct, setSavingProduct] = useState(false);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Carregar Dados
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const data = await api.get<Product[]>('/products');
        setProducts(data || MOCK_PRODUCTS);
      } catch (e) {
        console.error('Erro ao buscar produtos:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
      const cats = Array.from(new Set(products.map(p => p.category)));
      return ['ALL', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
  }), [products, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
      const totalInventoryValue = products.reduce((acc, p) => acc + (Number(p.price || 0) * Number(p.stock || 0)), 0);
      const totalCostValue = products.reduce((acc, p) => acc + (Number(p.cost || 0) * Number(p.stock || 0)), 0);
      const lowStockItems = products.filter(p => p.type === 'physical' && p.stock <= p.minStock);
      
      const today = new Date();
      const next30Days = new Date();
      next30Days.setDate(today.getDate() + 30);

      const expiringItems = products.filter(p => {
          if (!p.expirationDate || p.type === 'digital') return false;
          const expDate = new Date(p.expirationDate);
          return expDate <= next30Days && expDate >= today;
      });

      const expiredItems = products.filter(p => {
          if (!p.expirationDate || p.type === 'digital') return false;
          return new Date(p.expirationDate) < today;
      });

      const topSellers = [...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5);

      return {
          totalInventoryValue,
          totalCostValue,
          profitPotential: totalInventoryValue - totalCostValue,
          lowStockItems,
          expiringItems,
          expiredItems,
          topSellers
      };
  }, [products]);

  const handleOpenModal = (product?: Product) => {
      if (product) {
          setEditingProduct({ ...product });
      } else {
          setEditingProduct({
              name: '',
              category: categories.length > 1 && categories[1] !== 'ALL' ? categories[1] : t('products.category.general'),
              price: 0,
              cost: 0,
              stock: 0,
              minStock: 5,
              brand: '',
              salesCount: 0,
              type: 'physical',
              imageUrl: ''
          });
      }
      setShowNewCategoryInput(false);
      setModalTab('dados');
      setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
      if (!editingProduct.name || !editingProduct.price) return;

      const categoryToSave = showNewCategoryInput && newCategory ? newCategory : editingProduct.category;
      const finalProduct = {
          ...editingProduct,
          category: categoryToSave,
      };

      try {
          if (editingProduct.id) {
              const updated = await api.put<Product>(`/products/${editingProduct.id}`, finalProduct);
              setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
          } else {
              const saved = await api.post<Product>('/products', finalProduct);
              setProducts(prev => [saved, ...prev]);
          }
          setIsModalOpen(false);
          setNewCategory('');
      } catch (err) {
          console.error('Erro ao salvar produto:', err);
      }
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
          await api.delete(`/products/${deleteConfirmId}`);
          setProducts(prev => prev.filter(p => p.id !== deleteConfirmId));
          setDeleteConfirmId(null);
      } catch (err) {
          console.error('Erro ao deletar produto:', err);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setEditingProduct(prev => ({ ...prev, imageUrl: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const submitProduct = async () => {
      if (savingProduct) return;
      if (!editingProduct.name) { setModalTab('dados'); return; }
      if (!editingProduct.price) { setModalTab('preco'); return; }
      setSavingProduct(true);
      try {
          await handleSaveProduct();
      } finally {
          setSavingProduct(false);
      }
  };

  const productThumb = (p: Product, tone: string = 'border-slate-200') => (
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-white ${tone}`}>
          {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <Package size={16} className="text-slate-300" />}
      </div>
  );

  const renderDashboard = () => (
      <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <PanelCard title={t('products.replenish')} icon={AlertTriangle}>
                  <div className="p-3">
                      {stats.lowStockItems.length === 0 ? (
                          <EmptyState icon={CheckCircle} title={t('products.healthyStock')} />
                      ) : (
                          <div className="space-y-2">
                              {stats.lowStockItems.map(p => (
                                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                                      <div className="flex min-w-0 items-center gap-3">
                                          {productThumb(p)}
                                          <div className="min-w-0">
                                              <div className="truncate text-[13px] font-medium text-slate-800">{p.name}</div>
                                              <div className="text-[11px] text-slate-500">{t('products.minStock')}: {p.minStock}</div>
                                          </div>
                                      </div>
                                      <div className="flex shrink-0 items-center gap-3">
                                          <div className="text-sm font-semibold tabular-nums text-amber-600">{p.stock} <span className="text-[11px] font-normal text-slate-500">UN</span></div>
                                          <IconButton variant="outline" size="sm" aria-label={t('common.edit')} onClick={() => handleOpenModal(p)}><Edit3 size={14} /></IconButton>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </PanelCard>

              <PanelCard title={t('products.expirationControl')} icon={Calendar}>
                  <div className="p-3">
                      {[...stats.expiredItems, ...stats.expiringItems].length === 0 ? (
                          <EmptyState icon={CheckCircle2} title={t('products.noExpiring')} />
                      ) : (
                          <div className="space-y-2">
                              {stats.expiredItems.map(p => (
                                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 p-2">
                                      <div className="flex min-w-0 items-center gap-3">
                                          {productThumb(p, 'border-red-200')}
                                          <div className="min-w-0">
                                              <div className="truncate text-[13px] font-medium text-red-800">{p.name}</div>
                                              <div className="text-[11px] text-red-600">{t('products.expired')}</div>
                                          </div>
                                      </div>
                                      <div className="shrink-0 text-xs font-medium tabular-nums text-red-700">{new Date(p.expirationDate!).toLocaleDateString()}</div>
                                  </div>
                              ))}
                              {stats.expiringItems.map(p => (
                                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-100 bg-amber-50 p-2">
                                      <div className="flex min-w-0 items-center gap-3">
                                          {productThumb(p, 'border-amber-200')}
                                          <div className="min-w-0">
                                              <div className="truncate text-[13px] font-medium text-amber-800">{p.name}</div>
                                              <div className="text-[11px] text-amber-600">{t('products.toExpire')}</div>
                                          </div>
                                      </div>
                                      <div className="shrink-0 text-xs font-medium tabular-nums text-amber-700">{new Date(p.expirationDate!).toLocaleDateString()}</div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </PanelCard>
          </div>

          <PanelCard title={t('products.topSellers')} icon={TrendingUp}>
              <div className="space-y-3 p-3">
                  {stats.topSellers.map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-3">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary-100 bg-primary-50 text-xs font-medium text-primary-700">{idx + 1}</div>
                          {productThumb(p)}
                          <div className="min-w-0 flex-1">
                              <div className="mb-1 flex justify-between gap-2">
                                  <span className="truncate text-[13px] font-medium text-slate-700">{p.name}</span>
                                  <span className="shrink-0 text-xs font-medium tabular-nums text-primary-700">{p.salesCount} <span className="text-[11px] font-normal text-slate-500">vendas</span></span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-primary-600 transition-all duration-700" style={{ width: `${(p.salesCount / (stats.topSellers[0]?.salesCount || 1)) * 100}%` }}></div></div>
                          </div>
                      </div>
                  ))}
              </div>
          </PanelCard>
      </div>
  );

  const renderList = () => (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map(product => {
              const isLowStock = product.type === 'physical' && product.stock <= product.minStock;

              return (
                  <ContentCard key={product.id} padding="none" className="group flex h-full flex-col overflow-hidden transition-all hover:border-primary-200">
                      <div className="relative aspect-[4/3] overflow-hidden border-b border-slate-100 bg-slate-50">
                          {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                              <div className="flex h-full w-full flex-col items-center justify-center text-slate-300">
                                  {product.type === 'digital' ? <BookOpen size={40} /> : <Package size={40} />}
                              </div>
                          )}
                          <div className="absolute right-2 top-2">
                              {product.type === 'digital' ? (
                                  <Badge color="purple" size="sm" icon={<BookOpen size={11} />}>{t('products.type.digital')}</Badge>
                              ) : (
                                  <Badge color="primary" size="sm" icon={<Box size={11} />}>{t('products.type.physical')}</Badge>
                              )}
                          </div>
                          {isLowStock && (
                              <div className="absolute left-2 top-2">
                                  <Badge color="warning" size="sm">Estoque Baixo</Badge>
                              </div>
                          )}
                      </div>

                      <div className="flex flex-1 flex-col p-3">
                          <div className="mb-3 flex-1">
                              <div className="mb-1 text-[11px] text-primary-600">{product.category}</div>
                              <h3 className="line-clamp-2 text-sm font-medium text-slate-900" title={product.name}>{product.name}</h3>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2">
                                  <div className="mb-0.5 text-[11px] text-emerald-600">{t('products.price')}</div>
                                  <div className="text-xs font-semibold tabular-nums text-emerald-700">{formatCurrency(product.price)}</div>
                              </div>
                              <div className={`rounded-lg border p-2 ${isLowStock ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                                  <div className="mb-0.5 text-[11px] opacity-70">
                                      {product.type === 'digital' ? t('products.stock.available') : t('products.inventory')}
                                  </div>
                                  <div className="text-xs font-semibold tabular-nums">
                                      {product.type === 'digital' ? '∞' : `${product.stock} un`}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2 border-t border-slate-100 bg-slate-50/50 p-3">
                          <Button variant="outline" size="xs" className="flex-1" iconLeft={<Edit3 size={14} />} onClick={() => handleOpenModal(product)}>
                              {t('common.edit')}
                          </Button>
                          <IconButton variant="ghost" size="xs" aria-label="Remover produto" onClick={() => setDeleteConfirmId(product.id)}>
                              <Trash2 size={14} />
                          </IconButton>
                      </div>
                  </ContentCard>
              );
          })}
          {filteredProducts.length === 0 && (
              <ContentCard className="col-span-full">
                  <EmptyState icon={Box} title={t('products.noResults')} />
              </ContentCard>
          )}
      </div>
  );

  return (
    <PageWrapper>
      <div className="space-y-4">
        <SectionTitle
          icon={Package}
          title={t('products.title')}
          description={t('products.management')}
          action={
            <>
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/')}>
                Voltar
              </Button>
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => handleOpenModal()}>
                {t('products.new')}
              </Button>
            </>
          }
        />

        <StatGrid cols={4}>
          <StatCard title={t('products.valueStock')} value={formatCurrency(stats.totalInventoryValue)} icon={DollarSign} />
          <StatCard title={t('products.lowStock')} value={stats.lowStockItems.length} icon={AlertTriangle} color="warning" />
          <StatCard title="Expira em breve" value={stats.expiredItems.length + stats.expiringItems.length} icon={AlertOctagon} color="danger" />
          <StatCard title="Mais Vendidos" value={stats.topSellers[0]?.salesCount || 0} icon={TrendingUp} color="success" />
        </StatGrid>

        <Tabs<ProductsTab> items={PRODUCT_TABS.map(tab => ({ ...tab, label: t(tab.labelKey) }))} value={activeTab} onChange={setActiveTab} label="Visões de produtos">
          <div className="space-y-3">
            {/* FILTERS & SEARCH */}
            <FilterLine>
              <FilterLineSection grow>
                <FilterLineSearch
                  value={searchTerm}
                  onChange={setSearchTerm}
                  placeholder={t('products.search')}
                  aria-label={t('products.search')}
                  className="max-w-[280px]"
                />
              </FilterLineSection>

              <FilterLineSection align="right">
                <Select
                  aria-label={t('products.category')}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat === 'ALL' ? t('common.all') : cat}</option>)}
                </Select>
              </FilterLineSection>
            </FilterLine>

            {activeTab === 'list' ? renderList() : renderDashboard()}
          </div>
        </Tabs>
      </div>

      {/* PRODUCT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct.id ? t('products.edit') : t('products.new')}
        subtitle={editingProduct.id ? `#${editingProduct.id}` : t('products.creation')}
        size="2xl"
        mobileStyle="fullscreen"
        footer={
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={savingProduct}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={submitProduct}
              loading={savingProduct}
              iconLeft={<CheckCircle2 size={14} />}
            >
              {t('profile.saveChanges')}
            </Button>
          </ModalFooter>
        }
      >
        <Tabs<ProductModalTab> items={PRODUCT_MODAL_TABS} value={modalTab} onChange={setModalTab} label="Seções do produto">
          {modalTab === 'dados' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="ds-label">{t('products.nature')}</label>
                <FilterLineSegmented<'physical' | 'digital'>
                  value={(editingProduct.type as 'physical' | 'digital') || 'physical'}
                  onChange={(type) => setEditingProduct({ ...editingProduct, type })}
                  options={[
                    { value: 'physical', label: t('products.type.physical'), icon: <Box size={14} /> },
                    { value: 'digital', label: t('products.type.digital'), icon: <BookOpen size={14} /> },
                  ]}
                />
              </div>

              <Input label={t('products.productName')} value={editingProduct.name || ''} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} placeholder={t('products.placeholder.name')} />

              <FormRow cols={2}>
                {showNewCategoryInput ? (
                  <div className="flex items-end gap-2">
                    <Input wrapperClassName="flex-1" label={t('products.category')} placeholder="Nova categoria" value={newCategory} onChange={e => setNewCategory(e.target.value)} autoFocus />
                    <IconButton variant="outline" size="md" aria-label={t('common.cancel')} onClick={() => setShowNewCategoryInput(false)}><X size={14} /></IconButton>
                  </div>
                ) : (
                  <Select label={t('products.category')} value={editingProduct.category || ''} onChange={e => { if (e.target.value === 'new') setShowNewCategoryInput(true); else setEditingProduct({ ...editingProduct, category: e.target.value }); }}>
                    {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="new">+ {t('products.newCategory')}</option>
                  </Select>
                )}
                <Input label={t('products.brand')} value={editingProduct.brand || ''} onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })} />
              </FormRow>
            </div>
          )}

          {modalTab === 'preco' && (
            <div className="space-y-3">
              <PanelCard title={t('products.price')} icon={DollarSign}>
                <div className="p-3">
                  <FormRow cols={2}>
                    <Input label={t('products.price')} type="number" leftIcon={<DollarSign size={14} className="text-emerald-500" />} value={editingProduct.price ?? 0} onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })} />
                    <Input label={t('products.cost')} type="number" leftIcon={<CreditCard size={14} />} value={editingProduct.cost ?? 0} onChange={e => setEditingProduct({ ...editingProduct, cost: parseFloat(e.target.value) || 0 })} />
                  </FormRow>
                </div>
              </PanelCard>

              {editingProduct.type === 'physical' && (
                <PanelCard title={t('products.stockParams')} icon={Archive}>
                  <div className="p-3">
                    <FormRow cols={3}>
                      <Input label={t('products.inventory')} type="number" value={editingProduct.stock ?? 0} onChange={e => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })} />
                      <Input label={t('products.minStock')} type="number" value={editingProduct.minStock ?? 0} onChange={e => setEditingProduct({ ...editingProduct, minStock: parseInt(e.target.value) || 0 })} />
                      <Input label={t('products.validity')} type="date" value={editingProduct.expirationDate || ''} onChange={e => setEditingProduct({ ...editingProduct, expirationDate: e.target.value })} />
                    </FormRow>
                  </div>
                </PanelCard>
              )}

              {editingProduct.type === 'digital' && (
                <Alert
                  variant="info"
                  title={t('products.digital.title')}
                  action={<Button variant="outline" size="sm" iconLeft={<UploadCloud size={14} />}>{t('products.digital.select')}</Button>}
                >
                  {t('products.digital.desc')}
                </Alert>
              )}
            </div>
          )}

          {modalTab === 'imagem' && (
            <div className="space-y-1.5">
              <label className="ds-label">{t('products.visual')}</label>
              <div className="group relative flex aspect-[16/9] max-h-72 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 transition-all hover:border-primary-400 hover:bg-primary-50/30">
                {editingProduct.imageUrl ? (
                  <>
                    <img src={editingProduct.imageUrl} alt="" className="h-full w-full rounded-lg object-contain p-2" />
                    <div className="absolute inset-0 flex items-center justify-center bg-primary-600/80 opacity-0 transition-all group-hover:opacity-100">
                      <span className="flex items-center gap-2 text-xs font-medium text-white"><UploadCloud size={14} /> {t('products.image.change')}</span>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-primary-500">
                      <Image size={20} />
                    </div>
                    <p className="mb-1 text-xs font-medium text-slate-600">{t('products.image.drag')}</p>
                    <p className="text-[11px] text-slate-500">{t('products.image.click')}</p>
                  </div>
                )}
                <input type="file" accept="image/*" aria-label={t('products.visual')} onChange={handleImageUpload} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              </div>
            </div>
          )}
        </Tabs>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        variant="danger"
        title="Remover produto"
        message="Esta ação irá remover o item do inventário permanentemente. Relatórios de vendas passadas não serão afetados."
        confirmLabel="Confirmar exclusão"
        cancelLabel="Manter no estoque"
      />
    </PageWrapper>
  );
};
