import React, { useState, useMemo } from 'react';
import { MOCK_PRODUCTS } from '../constants';
import { Product } from '../types';
import { 
  Package, Search, Plus, Filter, Edit3, Trash2, AlertTriangle, 
  BarChart, Archive, DollarSign, Calendar, AlertOctagon,
  TrendingUp, Box, CheckCircle, Barcode, X, Image, UploadCloud, BookOpen
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Products: React.FC = () => {
  const { t, language } = useLanguage();
  
  // Helper de formatação de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === 'pt' ? 'pt-BR' : 'en-US', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(value);
  };

  const [activeTab, setActiveTab] = useState<'list' | 'dashboard'>('list');
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 'ALL' é o valor interno para "Todos", o label visual vem do t()
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

  // Categorias dinâmicas baseadas nos produtos
  const categories = useMemo(() => {
      const cats = Array.from(new Set(products.map(p => p.category)));
      return ['ALL', ...cats];
  }, [products]);

  const filteredProducts = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
  });

  const stats = useMemo(() => {
      const totalInventoryValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
      const totalCostValue = products.reduce((acc, p) => acc + (p.cost * p.stock), 0);
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

  const handleSaveProduct = () => {
      if (!editingProduct.name || !editingProduct.price) {
          alert(t('products.fillError'));
          return;
      }

      const categoryToSave = showNewCategoryInput && newCategory ? newCategory : editingProduct.category;

      const finalProduct = {
          ...editingProduct,
          category: categoryToSave,
          id: editingProduct.id || Math.random().toString(36).substr(2, 9),
      } as Product;

      if (editingProduct.id) {
          setProducts(prev => prev.map(p => p.id === finalProduct.id ? finalProduct : p));
      } else {
          setProducts(prev => [...prev, finalProduct]);
      }
      setIsModalOpen(false);
      setNewCategory('');
  };

  const handleDelete = (id: string) => {
      if (window.confirm(t('common.delete') + "?")) {
          setProducts(prev => prev.filter(p => p.id !== id));
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
      <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><DollarSign size={24} /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('products.valueStock')}</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-slate-800">{formatCurrency(stats.totalInventoryValue)}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t('products.totalCost')}: {formatCurrency(stats.totalCostValue)}</p>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={24} /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('products.lowStock')}</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-slate-800">{stats.lowStockItems.length}</h3>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><AlertOctagon size={24} /></div>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{t('products.expiring')}</span>
                  </div>
                  <h3 className="text-3xl font-display font-bold text-slate-800">{stats.expiredItems.length + stats.expiringItems.length}</h3>
                  <p className="text-xs text-slate-500 mt-1">{stats.expiredItems.length} {t('products.expired')}, {stats.expiringItems.length} {t('products.toExpire')}</p>
              </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 bg-amber-50/50 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-600" /><h3 className="font-bold text-slate-800">{t('products.replenish')}</h3></div>
                  <div className="flex-1 p-2">
                      {stats.lowStockItems.length === 0 ? (<div className="text-center py-10 text-slate-400 text-sm">{t('products.healthyStock')}</div>) : (
                          <div className="space-y-2">{stats.lowStockItems.map(p => (<div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors"><div><div className="font-bold text-slate-700 text-sm">{p.name}</div><div className="text-xs text-slate-500">{t('products.minStock')}: {p.minStock}</div></div><div className="text-right"><div className="text-lg font-bold text-amber-600">{p.stock} un</div><button onClick={() => handleOpenModal(p)} className="text-[10px] font-bold text-indigo-600 hover:underline">{t('common.edit')}</button></div></div>))}</div>
                      )}
                  </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 bg-rose-50/50 flex items-center gap-2"><Calendar size={18} className="text-rose-600" /><h3 className="font-bold text-slate-800">{t('products.expirationControl')}</h3></div>
                  <div className="flex-1 p-2">
                      {[...stats.expiredItems, ...stats.expiringItems].length === 0 ? (<div className="text-center py-10 text-slate-400 text-sm">{t('products.noExpiring')}</div>) : (
                          <div className="space-y-2">
                              {stats.expiredItems.map(p => (<div key={p.id} className="flex justify-between items-center p-3 bg-rose-50 rounded-xl border border-rose-100"><div><div className="font-bold text-rose-800 text-sm">{p.name}</div><div className="text-xs text-rose-600 font-bold">{t('products.expired').toUpperCase()}</div></div><div className="text-xs font-medium text-rose-700">{new Date(p.expirationDate!).toLocaleDateString()}</div></div>))}
                              {stats.expiringItems.map(p => (<div key={p.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors"><div><div className="font-bold text-slate-700 text-sm">{p.name}</div><div className="text-xs text-orange-500 font-bold">{t('products.toExpire')}</div></div><div className="text-xs font-medium text-slate-500">{new Date(p.expirationDate!).toLocaleDateString()}</div></div>))}
                          </div>
                      )}
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-indigo-600" /> {t('products.topSellers')}</h3>
              <div className="space-y-4">
                  {stats.topSellers.map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">{idx + 1}</div>
                          <div className="h-10 w-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0">
                              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package size={16} className="m-auto mt-2 text-slate-300" />}
                          </div>
                          <div className="flex-1">
                              <div className="flex justify-between mb-1"><span className="font-bold text-slate-700 text-sm">{p.name}</span><span className="font-bold text-slate-800 text-sm">{p.salesCount} {t('products.sales')}</span></div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(p.salesCount / (stats.topSellers[0]?.salesCount || 1)) * 100}%` }}></div></div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

  const renderList = () => (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fadeIn">
          {filteredProducts.map(product => {
              const isLowStock = product.type === 'physical' && product.stock <= product.minStock;
              const isExpired = product.expirationDate && new Date(product.expirationDate) < new Date();
              
              return (
                  <div key={product.id} className="group bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col relative overflow-hidden">
                      
                      {/* Product Image */}
                      <div className="relative aspect-video bg-slate-50 border-b border-slate-100 overflow-hidden group-hover:opacity-90 transition-opacity">
                          {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                  {product.type === 'digital' ? <BookOpen size={48} /> : <Package size={48} />}
                              </div>
                          )}
                          <div className="absolute top-2 right-2">
                              {product.type === 'digital' ? (
                                  <span className="bg-white/90 backdrop-blur text-purple-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm border border-purple-100 flex items-center gap-1">
                                      <BookOpen size={10} /> {t('products.type.digital')}
                                  </span>
                              ) : (
                                  <span className="bg-white/90 backdrop-blur text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm border border-indigo-100 flex items-center gap-1">
                                      <Box size={10} /> {t('products.type.physical')}
                                  </span>
                              )}
                          </div>
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                          <div className="mb-4">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{product.category}</div>
                              <h3 className="font-bold text-slate-800 leading-tight line-clamp-2 min-h-[1.5rem]" title={product.name}>{product.name}</h3>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-4 mt-auto">
                              <div className="bg-slate-50 p-2 rounded-xl text-center border border-slate-100">
                                  <div className="text-[9px] uppercase font-bold text-slate-400">{t('products.price')}</div>
                                  <div className="font-bold text-emerald-600">{formatCurrency(product.price)}</div>
                              </div>
                              <div className={`p-2 rounded-xl text-center border ${isLowStock ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                                  <div className="text-[9px] uppercase font-bold opacity-70">
                                      {product.type === 'digital' ? t('products.stock.available') : t('products.inventory')}
                                  </div>
                                  <div className="font-bold">
                                      {product.type === 'digital' ? '∞' : `${product.stock} un`}
                                  </div>
                              </div>
                          </div>

                          {product.expirationDate && product.type === 'physical' && (
                              <div className={`text-xs font-medium mb-4 flex items-center gap-1 bg-slate-50 p-2 rounded-lg ${isExpired ? 'text-rose-600 bg-rose-50' : 'text-slate-500'}`}>
                                  <Calendar size={12} /> {t('products.validity')}: {new Date(product.expirationDate).toLocaleDateString()}
                                  {isExpired && <span className="font-bold ml-auto">{t('products.expired').toUpperCase()}</span>}
                              </div>
                          )}

                          <div className="flex gap-2 pt-4 border-t border-slate-100 mt-auto">
                              <button onClick={() => handleOpenModal(product)} className="flex-1 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2">
                                  <Edit3 size={14} /> {t('common.edit')}
                              </button>
                              <button onClick={() => handleDelete(product.id)} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                  </div>
              );
          })}
          {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center">
                  <Box size={48} className="opacity-30 mb-4" />
                  <p>{t('products.noResults')}</p>
              </div>
          )}
      </div>
  );

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 opacity-90"></div>
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm"><Package size={14} /><span>{t('products.management')}</span></div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('products.title')}</h1>
                <p className="text-indigo-200 text-lg leading-relaxed max-w-xl">{t('products.subtitle')}</p>
            </div>
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <button onClick={() => setActiveTab('list')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><Package size={18} /> {t('products.products')}</button>
                <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}><BarChart size={18} /> {t('products.inventory')}</button>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-1 w-full gap-4">
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-indigo-500 transition-colors" />
                    <input type="text" placeholder={t('products.search')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all text-slate-600 shadow-sm" />
                </div>
                <div className="relative group min-w-[150px]">
                     <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full appearance-none bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-2xl px-4 py-3.5 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm cursor-pointer">
                        {categories.map(cat => <option key={cat} value={cat}>{cat === 'ALL' ? t('common.all') : cat}</option>)}
                     </select>
                     <Filter size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>
            {activeTab === 'list' && (
                <button onClick={() => handleOpenModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 whitespace-nowrap">
                    <Plus size={20} /><span className="hidden md:inline">{t('products.new')}</span>
                </button>
            )}
        </div>
      </div>

      {activeTab === 'list' ? renderList() : renderDashboard()}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-4xl rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[95vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-xl font-display font-bold text-slate-800">{editingProduct.id ? t('products.edit') : t('products.new')}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="flex flex-col lg:flex-row gap-8">
                        
                        {/* LEFT COLUMN: IMAGE UPLOAD & TYPE */}
                        <div className="w-full lg:w-1/3 space-y-6">
                            {/* Type Selector */}
                            <div className="bg-slate-100 p-1.5 rounded-xl flex">
                                <button 
                                    onClick={() => setEditingProduct({...editingProduct, type: 'physical'})}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${editingProduct.type === 'physical' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <Box size={16} /> {t('products.type.physical')}
                                </button>
                                <button 
                                    onClick={() => setEditingProduct({...editingProduct, type: 'digital'})}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${editingProduct.type === 'digital' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <BookOpen size={16} /> {t('products.type.digital')}
                                </button>
                            </div>

                            {/* Image Upload Area */}
                            <div className="w-full aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer">
                                {editingProduct.imageUrl ? (
                                    <>
                                        <img src={editingProduct.imageUrl} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white font-bold text-sm">{t('products.image.change')}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                            <Image size={32} />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">{t('products.image.drag')}</p>
                                        <p className="text-xs text-slate-400 mt-1">{t('products.image.click')}</p>
                                    </div>
                                )}
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                        </div>

                        {/* RIGHT COLUMN: FIELDS */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.productName')}</label>
                                <input type="text" className="w-full p-3.5 rounded-xl border border-slate-200 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 text-lg" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder={t('products.placeholder.name')} />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.category')}</label>
                                    {showNewCategoryInput ? (
                                        <div className="flex gap-2"><input type="text" className="flex-1 p-3 rounded-xl border border-indigo-300 outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 bg-indigo-50/30" placeholder={t('products.placeholder.category')} value={newCategory} onChange={e => setNewCategory(e.target.value)} autoFocus /><button onClick={() => setShowNewCategoryInput(false)} className="p-3 bg-slate-100 rounded-xl hover:bg-slate-200"><X size={18} /></button></div>
                                    ) : (
                                        <div className="relative">
                                            <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none font-medium text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-100" value={editingProduct.category || ''} onChange={e => {if(e.target.value === 'new') setShowNewCategoryInput(true); else setEditingProduct({...editingProduct, category: e.target.value});}}>
                                                {categories.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                                                <option value="new" className="font-bold text-indigo-600">{t('products.newCategory')}</option>
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.brand')}</label>
                                    <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" value={editingProduct.brand || ''} onChange={e => setEditingProduct({...editingProduct, brand: e.target.value})} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.price')}</label>
                                    <div className="relative"><DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="number" className="w-full pl-8 p-3 rounded-xl border border-slate-200 outline-none font-bold text-emerald-600 text-lg" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} /></div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.cost')}</label>
                                    <div className="relative"><DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="number" className="w-full pl-8 p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-600" value={editingProduct.cost} onChange={e => setEditingProduct({...editingProduct, cost: parseFloat(e.target.value)})} /></div>
                                </div>
                            </div>

                            {/* Inventory Section - Only for Physical */}
                            {editingProduct.type === 'physical' && (
                                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-[fadeIn_0.3s_ease-out]">
                                    <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Archive size={18} /> {t('products.inventory')}</h4>
                                    <div className="grid grid-cols-2 gap-6 mb-4">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.currentStock')}</label><input type="number" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-bold text-slate-800" value={editingProduct.stock} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})} /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.minStock')}</label><input type="number" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-amber-600" value={editingProduct.minStock} onChange={e => setEditingProduct({...editingProduct, minStock: parseInt(e.target.value)})} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.validity')}</label><input type="date" className="w-full p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" value={editingProduct.expirationDate || ''} onChange={e => setEditingProduct({...editingProduct, expirationDate: e.target.value})} /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('products.barcode')}</label><div className="relative"><Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" className="w-full pl-9 p-3 rounded-xl border border-slate-200 outline-none font-medium text-slate-700" value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} /></div></div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Digital Specific Info */}
                            {editingProduct.type === 'digital' && (
                                <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 animate-[fadeIn_0.3s_ease-out]">
                                    <h4 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><UploadCloud size={18} /> {t('products.digital.title')}</h4>
                                    <p className="text-xs text-purple-600 mb-4">{t('products.digital.desc')}</p>
                                    <div className="border-2 border-dashed border-purple-200 rounded-xl p-4 text-center bg-white cursor-pointer hover:border-purple-400 transition-colors">
                                        <p className="text-sm font-bold text-purple-600">{t('products.digital.select')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200">{t('common.cancel')}</button>
                    <button onClick={handleSaveProduct} className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg flex items-center gap-2"><CheckCircle size={18} /> {t('common.save')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};