import React, { useState, useMemo, useEffect } from 'react';
import { api } from '../services/api';
import { MOCK_PRODUCTS } from '../constants';
import { Product } from '../types';
import { 
  Package, Search, Plus, Filter, Edit3, Trash2, AlertTriangle, 
  BarChart, Archive, DollarSign, Calendar, AlertOctagon,
  TrendingUp, Box, CheckCircle, Barcode, X, Image, UploadCloud, BookOpen,
  ShoppingBag, ArrowUpRight, Clock, CheckCircle2, AlertCircle, FileText,
  Sparkles, Layers, List as ListIcon, LayoutGrid,
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Products: React.FC = () => {
  const { t, language } = useLanguage();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value);
  };

  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
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

  const renderDashboard = () => (
      <div className="space-y-8 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-emerald-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-500 group-hover:text-white transition-all">
                        <DollarSign size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">{t('products.valueStock')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{formatCurrency(stats.totalInventoryValue)}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tighter">{t('products.totalCost')}: {formatCurrency(stats.totalCostValue)}</p>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-amber-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all">
                        <AlertTriangle size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">{t('products.lowStock')}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{stats.lowStockItems.length}</h3>
                  <p className="text-[10px] font-bold text-amber-500 mt-2 uppercase tracking-tighter">Itens que precisam de reposição</p>
              </div>
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:border-rose-200 transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl group-hover:bg-rose-500 group-hover:text-white transition-all">
                        <AlertOctagon size={24} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 capitalize tracking-widest">Vencimento</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">{stats.expiredItems.length + stats.expiringItems.length}</h3>
                  <p className="text-[10px] font-bold text-rose-500 mt-2 uppercase tracking-tighter">{stats.expiredItems.length} {t('products.expired').toLowerCase()} / {stats.expiringItems.length} {t('products.toExpire').toLowerCase()}</p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 bg-amber-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                        <AlertTriangle size={20} />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm">{t('products.replenish')}</h3>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                      {stats.lowStockItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <CheckCircle className="mx-auto mb-3 text-emerald-400" size={32} />
                          <p className="text-xs font-bold uppercase tracking-widest">{t('products.healthyStock')}</p>
                        </div>
                      ) : (
                          <div className="space-y-3">
                            {stats.lowStockItems.map(p => (
                              <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200/50 rounded-3xl hover:bg-white hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
                                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package size={18} className="m-auto text-slate-300" />}
                                  </div>
                                  <div>
                                    <div className="font-black text-slate-800 text-sm whitespace-nowrap">{p.name}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">{t('products.minStock')}: {p.minStock}</div>
                                  </div>
                                </div>
                                <div className="text-right flex items-center gap-4">
                                  <div className="text-lg font-black text-amber-600 tabular-nums">{p.stock} <span className="text-[10px] font-bold opacity-60">UN</span></div>
                                  <button onClick={() => handleOpenModal(p)} className="p-2.5 bg-white rounded-xl text-indigo-500 shadow-sm border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"><Edit3 size={14}/></button>
                                </div>
                              </div>
                            ))}
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-slate-50 bg-rose-50/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
                        <Calendar size={20} />
                      </div>
                      <h3 className="font-black text-slate-800 text-sm">{t('products.expirationControl')}</h3>
                    </div>
                  </div>
                  <div className="flex-1 p-4">
                      {[...stats.expiredItems, ...stats.expiringItems].length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                           <CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={32} />
                           <p className="text-xs font-bold uppercase tracking-widest">{t('products.noExpiring')}</p>
                        </div>
                      ) : (
                          <div className="space-y-3">
                              {stats.expiredItems.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-4 bg-rose-50 border border-rose-100 rounded-3xl group">
                                  <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-white border border-rose-200 overflow-hidden shadow-sm">
                                      {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package size={18} className="m-auto text-rose-300" />}
                                    </div>
                                    <div>
                                      <div className="font-black text-rose-800 text-sm">{p.name}</div>
                                      <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{t('products.expired')}</div>
                                    </div>
                                  </div>
                                  <div className="text-right font-black text-rose-700 text-xs tabular-nums">
                                    {new Date(p.expirationDate!).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                              {stats.expiringItems.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-4 bg-amber-50 border border-amber-100 rounded-3xl group">
                                  <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-2xl bg-white border border-amber-200 overflow-hidden shadow-sm">
                                      {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package size={18} className="m-auto text-amber-300" />}
                                    </div>
                                    <div>
                                      <div className="font-black text-amber-800 text-sm">{p.name}</div>
                                      <div className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t('products.toExpire')}</div>
                                    </div>
                                  </div>
                                  <div className="text-right font-black text-amber-700 text-xs tabular-nums">
                                    {new Date(p.expirationDate!).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8">
              <h3 className="font-black text-slate-800 mb-8 flex items-center gap-3"><TrendingUp size={24} className="text-indigo-600" /> {t('products.topSellers')}</h3>
              <div className="space-y-6">
                  {stats.topSellers.map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-6 group">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm border border-indigo-100 shadow-sm">{idx + 1}</div>
                          <div className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 overflow-hidden shrink-0 shadow-sm p-1 group-hover:border-indigo-200 transition-all">
                              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover rounded-xl" /> : <Box size={20} className="m-auto mt-3 text-slate-200" />}
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between mb-2"><span className="font-black text-slate-700 text-base">{p.name}</span><span className="font-black text-indigo-600 text-base tabular-nums">{p.salesCount} <span className="text-[10px] font-bold text-slate-400 uppercase">vendas</span></span></div>
                              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner"><div className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-full rounded-full transition-all duration-1000" style={{ width: `${(p.salesCount / (stats.topSellers[0]?.salesCount || 1)) * 100}%` }}></div></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderList = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fadeIn">
          {filteredProducts.map(product => {
              const isLowStock = product.type === 'physical' && product.stock <= product.minStock;
              const isExpired = product.expirationDate && new Date(product.expirationDate) < new Date();
              
              return (
                  <div key={product.id} className="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col relative overflow-hidden">
                      
                      {/* Product Image */}
                      <div className="relative aspect-square bg-slate-50 border-b border-slate-50 overflow-hidden">
                          {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                          ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                                  {product.type === 'digital' ? <BookOpen size={64} /> : <Package size={64} />}
                              </div>
                          )}
                          <div className="absolute top-4 right-4">
                              {product.type === 'digital' ? (
                                  <span className="bg-purple-600 text-white px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                      <BookOpen size={12} /> {t('products.type.digital')}
                                  </span>
                              ) : (
                                  <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                      <Box size={12} /> {t('products.type.physical')}
                                  </span>
                              )}
                          </div>
                          
                          {isLowStock && (
                            <div className="absolute top-4 left-4 bg-amber-500 text-white px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-xl animate-pulse">
                              Estoque Baixo
                            </div>
                          )}
                      </div>

                      <div className="p-6 flex flex-col flex-1">
                          <div className="mb-5 flex-1">
                              <div className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-2 px-1">{product.category}</div>
                              <h3 className="font-black text-slate-800 text-base leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2" title={product.name}>{product.name}</h3>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-emerald-50/50 p-4 rounded-3xl border border-emerald-100/50">
                                  <div className="text-[9px] uppercase font-black text-emerald-500 tracking-widest mb-1">{t('products.price')}</div>
                                  <div className="font-black text-emerald-700 text-base tabular-nums">{formatCurrency(product.price)}</div>
                              </div>
                              <div className={`p-4 rounded-3xl border transition-all ${isLowStock ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                  <div className="text-[9px] uppercase font-black tracking-widest opacity-60 mb-1">
                                      {product.type === 'digital' ? t('products.stock.available') : t('products.inventory')}
                                  </div>
                                  <div className="font-black text-base tabular-nums">
                                      {product.type === 'digital' ? '∞' : `${product.stock} un`}
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-2 pt-6 border-t border-slate-50">
                              <button onClick={() => handleOpenModal(product)} className="flex-1 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all flex items-center justify-center gap-2 tracking-widest uppercase">
                                  <Edit3 size={14} /> {t('common.edit')}
                              </button>
                              <button onClick={() => setDeleteConfirmId(product.id)} className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition-all shadow-sm">
                                  <Trash2 size={18} />
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}
          {filteredProducts.length === 0 && (
              <div className="col-span-full py-24 text-center text-slate-400 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                    <Box size={40} className="opacity-20" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest">{t('products.noResults')}</p>
              </div>
          )}
      </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-24">
      
      {/* HEADER & TOP CONTROLS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><Package size={20}/></div>
                  {t('products.title')}
              </h1>
              <p className="text-slate-400 text-xs mt-1 font-bold">{t('products.management')}</p>
          </div>
          <button 
              onClick={() => handleOpenModal()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95"
          >
              <Plus size={18} /> {t('products.new')}
          </button>
      </div>

      {/* STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-indigo-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <DollarSign size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('products.valueStock')}</p>
                  <p className="text-lg font-black text-slate-800">{formatCurrency(stats.totalInventoryValue)}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-amber-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <AlertTriangle size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-amber-500">{t('products.lowStock')}</p>
                  <p className="text-xl font-black text-slate-800">{stats.lowStockItems.length}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-rose-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-all">
                  <AlertOctagon size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">Expira em breve</p>
                  <p className="text-xl font-black text-slate-800">{stats.expiredItems.length + stats.expiringItems.length}</p>
              </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <TrendingUp size={22} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Mais Vendidos</p>
                  <p className="text-xl font-black text-slate-800">{stats.topSellers[0]?.salesCount || 0}</p>
              </div>
          </div>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                  type="text" 
                  placeholder={t('products.search')} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold focus:bg-white focus:border-indigo-200 transition-all placeholder:text-slate-400" 
              />
          </div>

          <div className="flex gap-3 w-full lg:w-auto overflow-x-auto no-scrollbar">
              {/* Category Filter */}
              <select 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)} 
                  className="bg-slate-50 border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl px-4 py-2 outline-none focus:border-indigo-200 transition-all cursor-pointer"
              >
                  {categories.map(cat => <option key={cat} value={cat}>{cat === 'ALL' ? t('common.all') : cat}</option>)}
              </select>

              {/* View/Tab Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                  {[
                      { id: 'list', label: t('products.products'), icon: <Package size={14}/> },
                      { id: 'dashboard', label: t('products.inventory'), icon: <BarChart size={14}/> }
                  ].map(tab => (
                      <button 
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-400'}`}
                      >
                          {tab.icon}
                          {tab.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      {/* Main Content Render */}
      <div className="animate-fadeIn">
        {activeTab === 'list' ? renderList() : renderDashboard()}
      </div>

      {/* PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fadeIn">
            <div className="bg-white w-full max-w-5xl rounded-[3.5rem] shadow-2xl animate-bounceIn overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
                <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-indigo-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-100">
                        {editingProduct.id ? <Edit3 size={24} /> : <Plus size={28} />}
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">{editingProduct.id ? t('products.edit') : t('products.new')}</h3>
                        <p className="text-[9px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{editingProduct.id ? `#${editingProduct.id}` : t('products.creation')}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 shadow-sm ring-1 ring-slate-200 transition-all active:scale-95"><X size={20} /></button>
                </div>
                
                <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex flex-col lg:flex-row gap-8 md:gap-12">
                        
                        {/* LEFT: IMAGE & TYPE */}
                        <div className="w-full lg:w-80 space-y-8">
                            <div className="space-y-4">
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">{t('products.nature')}</label>
                              <div className="bg-slate-50 p-1 rounded-2xl flex border border-slate-100 shadow-inner">
                                  <button onClick={() => setEditingProduct({...editingProduct, type: 'physical'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black flex items-center justify-center gap-3 uppercase tracking-widest transition-all ${editingProduct.type === 'physical' ? 'bg-white shadow-lg text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                      <Box size={16} /> {t('products.type.physical')}
                                  </button>
                                  <button onClick={() => setEditingProduct({...editingProduct, type: 'digital'})} className={`flex-1 py-3 rounded-xl text-[9px] font-black flex items-center justify-center gap-3 uppercase tracking-widest transition-all ${editingProduct.type === 'digital' ? 'bg-white shadow-xl text-purple-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                      <BookOpen size={16} /> {t('products.type.digital')}
                                  </button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest px-1">{t('products.visual')}</label>
                              <div className="w-full aspect-square md:aspect-auto md:h-64 bg-slate-50 border-4 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-inner">
                                  {editingProduct.imageUrl ? (
                                      <>
                                          <img src={editingProduct.imageUrl} className="w-full h-full object-cover rounded-2xl p-2" />
                                          <div className="absolute inset-0 bg-indigo-600/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-full group-hover:translate-y-0">
                                              <span className="text-white font-black text-[10px] uppercase tracking-widest flex items-center gap-2"><UploadCloud size={16}/> {t('products.image.change')}</span>
                                          </div>
                                      </>
                                  ) : (
                                      <div className="text-center p-6">
                                          <div className="w-16 h-16 bg-white shadow-lg text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all">
                                              <Image size={28} />
                                          </div>
                                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{t('products.image.drag')}</p>
                                          <p className="text-[8px] text-slate-400 font-bold uppercase">{t('products.image.click')}</p>
                                      </div>
                                  )}
                                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                              </div>
                            </div>
                        </div>

                        {/* RIGHT: DATA FIELDS */}
                        <div className="flex-1 space-y-10">
                            <div className="group">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('products.productName')}</label>
                                <input type="text" className="w-full p-4.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 focus:bg-white focus:border-indigo-400 transition-all text-lg tracking-tight" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder={t('products.placeholder.name')} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{t('products.category')}</label>
                                    {showNewCategoryInput ? (
                                        <div className="flex gap-2 animate-fadeIn">
                                          <input type="text" className="flex-1 p-4.5 rounded-2xl border-2 border-indigo-400 bg-indigo-50/30 outline-none font-black text-indigo-700 text-sm" placeholder="Nova Categoria..." value={newCategory} onChange={e => setNewCategory(e.target.value)} autoFocus />
                                          <button onClick={() => setShowNewCategoryInput(false)} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:bg-white transition-all"><X size={20} /></button>
                                        </div>
                                    ) : (
                                        <div className="relative group">
                                            <select className="w-full p-4.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-600 text-sm appearance-none focus:bg-white focus:border-indigo-400 transition-all cursor-pointer" value={editingProduct.category || ''} onChange={e => {if(e.target.value === 'new') setShowNewCategoryInput(true); else setEditingProduct({...editingProduct, category: e.target.value});}}>
                                                {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                                                <option value="new" className="font-black text-indigo-600">+ {t('products.newCategory')}</option>
                                            </select>
                                            <ChevronRight className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 rotate-90 pointer-events-none group-focus-within:text-indigo-600" size={20} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">{t('products.brand')}</label>
                                    <input type="text" className="w-full p-4.5 rounded-2xl border-2 border-slate-100 bg-slate-50 outline-none font-black text-slate-700 text-sm focus:bg-white focus:border-indigo-400 transition-all" value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('products.price')}</label>
                                    <div className="relative group">
                                       <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                                       <input type="number" className="w-full pl-12 p-4 rounded-xl border-2 border-slate-100 bg-white outline-none font-black text-emerald-600 text-xl focus:border-emerald-400 transition-all tabular-nums" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('products.cost')}</label>
                                    <div className="relative group">
                                      <CreditCard size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                      <input type="number" className="w-full pl-12 p-4 rounded-xl border-2 border-slate-100 bg-white outline-none font-black text-slate-500 text-xl focus:border-indigo-400 transition-all tabular-nums" value={editingProduct.cost} onChange={e => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value)})} />
                                    </div>
                                </div>
                            </div>

                            {/* PHYSICAL ONLY ARTEFACTS */}
                            {editingProduct.type === 'physical' && (
                                <div className="space-y-6 animate-slideIn">
                                    <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] flex items-center gap-3 px-2">
                                       <Archive size={16} /> {t('products.stockParams')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('products.inventory')}</label>
                                          <input type="number" className="w-full p-2.5 bg-slate-50 border-b-2 border-slate-200 outline-none font-black text-slate-800 text-xl focus:border-indigo-500 transition-all text-center" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} />
                                        </div>
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('products.minStock')}</label>
                                          <input type="number" className="w-full p-2.5 bg-slate-50 border-b-2 border-slate-200 outline-none font-black text-amber-600 text-xl focus:border-amber-500 transition-all text-center" value={editingProduct.minStock} onChange={e => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})} />
                                        </div>
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
                                          <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('products.validity')}</label>
                                          <input type="date" className="w-full p-2.5 bg-slate-50 border-b-2 border-slate-200 outline-none font-black text-slate-700 text-base focus:border-indigo-500 transition-all" value={editingProduct.expirationDate || ''} onChange={e => setEditingProduct({...editingProduct, expirationDate: e.target.value})} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {editingProduct.type === 'digital' && (
                                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-8 rounded-[2.5rem] text-white animate-slideIn relative overflow-hidden shadow-2xl shadow-indigo-200">
                                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                       <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[2rem] border border-white/20 flex items-center justify-center">
                                          <UploadCloud size={40} />
                                       </div>
                                       <div className="flex-1 text-center md:text-left">
                                          <h4 className="text-xl font-black tracking-tight mb-2 uppercase tracking-widest">{t('products.digital.title')}</h4>
                                          <p className="text-xs font-bold text-indigo-100 mb-6 leading-relaxed opacity-80">{t('products.digital.desc')}</p>
                                          <button className="px-8 py-4 bg-white text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-50 transition-all">{t('products.digital.select')}</button>
                                       </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 border-t border-slate-50 bg-slate-50/30 flex justify-end items-center gap-4 px-8 md:px-12">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">{t('common.cancel')}</button>
                    <button onClick={handleSaveProduct} className="px-10 py-4 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl shadow-xl shadow-indigo-600/20 transition-all font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transform active:scale-95">
                        <CheckCircle2 size={20} /> {t('profile.saveChanges')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-fadeIn">
           <div className="bg-white rounded-[3.5rem] p-12 max-w-sm w-full text-center shadow-2xl border border-white/20 transform animate-bounceIn">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-red-100 shadow-lg shadow-red-50">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight leading-none">Remover Produto?</h3>
              <p className="text-sm font-bold text-slate-400 mb-10 leading-relaxed">
                Esta ação irá remover o item do inventário permanentemente. Relatórios de vendas passadas não serão afetados.
              </p>
              <div className="flex flex-col gap-4">
                 <button 
                  onClick={confirmDelete}
                  className="w-full py-5 bg-red-500 hover:bg-red-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.1em] shadow-xl shadow-red-100 transition-all transform active:scale-95"
                 >
                   CONFIRMAR EXCLUSÃO
                 </button>
                 <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 text-[11px] font-black uppercase tracking-[0.1em] transition-all font-black"
                 >
                   MANTER NO ESTOQUE
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};