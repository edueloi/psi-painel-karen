import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClinicalForm, Patient } from '../types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Plus, ClipboardList, BarChart3, Pen, Trash2, CheckCircle, Share2,
  Copy, Send, Lock, ArrowLeft, Eye, Archive, RotateCcw, FilePlus2, Globe, X
} from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

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

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [formsData, patientsData] = await Promise.all([
          api.get<any[]>('/forms'),
          api.get<any[]>('/patients')
        ]);
        const mapped = formsData.map((f) => ({
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
        const normalizedPatients = (patientsData || []).map((p: any) => ({
          ...p,
          full_name: p.name || p.full_name || '',
        })) as Patient[];
        setPatients(normalizedPatients);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const patientId = searchParams.get('patient_id');
    if (patientId) setDefaultPatientId(patientId);
  }, [searchParams]);

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

  const categories = ['Todas', ...Array.from(new Set(forms.map(f => f.category).filter(Boolean)))];

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

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este formulário? Todas as respostas serão perdidas.')) {
      api.delete(`/forms/${id}`)
        .then(() => {
          setForms(prev => prev.filter(f => f.id !== id));
          pushToast('success', 'Formulário excluído com sucesso.');
        })
        .catch((e) => pushToast('error', e.message || 'Erro ao remover'));
    }
  };

  const totalResponses = forms.reduce((sum, f) => sum + (f.responseCount || 0), 0);

  return (
    <div className="space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/formularios')}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
            <ClipboardList size={18} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Meus Formulários</h1>
            <p className="text-xs text-slate-400">{forms.length} formulário{forms.length !== 1 ? 's' : ''} · {totalResponses} resposta{totalResponses !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/formularios/novo')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm transition-colors"
        >
          <Plus size={16} /> Novo formulário
        </button>
      </div>

      {/* Stats pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: forms.length, color: 'text-slate-700' },
          { label: 'Ativos', value: forms.length - archivedIds.length, color: 'text-emerald-600' },
          { label: 'Arquivados', value: archivedIds.length, color: 'text-slate-500' },
          { label: 'Respostas', value: totalResponses, color: 'text-indigo-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-extrabold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm shrink-0">
          {(['Todos', 'Ativos', 'Arquivados'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                cat === activeFilter ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Buscar por título, descrição ou categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 shadow-sm"
          />
        </div>
        {categories.length > 1 && (
          <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar max-w-[300px]">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all shrink-0 ${
                  activeCategory === cat ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-sm text-slate-400">Carregando formulários...</div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-center gap-4">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
            <FilePlus2 size={26} className="text-slate-300" />
          </div>
          <div>
            <h3 className="font-bold text-slate-700">Nenhum formulário encontrado</h3>
            <p className="text-sm text-slate-400 mt-1">
              {searchTerm ? 'Tente buscar por outro termo.' : 'Crie seu primeiro formulário para começar.'}
            </p>
          </div>
          {!searchTerm && (
            <button
              onClick={() => navigate('/formularios/novo')}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
            >
              Criar formulário
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredForms.map(form => {
            const isArchived = archivedIds.includes(form.id);
            return (
              <div
                key={form.id}
                className={`bg-white rounded-2xl border shadow-sm flex flex-col transition-all hover:shadow-md hover:-translate-y-0.5 ${
                  isArchived ? 'border-slate-200 opacity-70' : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                {/* Card header */}
                <div className="p-4 flex items-start gap-3 border-b border-slate-100">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg ${
                    form.isGlobal ? 'bg-purple-50 border border-purple-100 text-purple-600' : 'bg-indigo-50 border border-indigo-100 text-indigo-600'
                  }`}>
                    {form.isGlobal ? <Lock size={18} /> : form.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${
                        form.isGlobal ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {form.isGlobal ? 'Global' : 'Personalizado'}
                      </span>
                      {form.category && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                          {form.category}
                        </span>
                      )}
                      {isArchived && (
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          Arquivado
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-slate-800 leading-snug line-clamp-2 mt-1" title={form.title}>
                      {form.title}
                    </h3>
                  </div>
                </div>

                {/* Description */}
                <div className="px-4 py-3 flex-1">
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {form.description || 'Sem descrição.'}
                  </p>
                </div>

                {/* Response count */}
                <div className="px-4 py-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Respostas</span>
                    <span className="text-xs font-extrabold text-indigo-600">{form.responseCount || 0}</span>
                  </div>
                  <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((form.responseCount || 0) / Math.max(1, Math.max(...forms.map(f => f.responseCount || 0)))) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleOpenShare(form)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors"
                  >
                    <Globe size={13} /> Compartilhar
                  </button>
                  <button
                    onClick={() => navigate(`/formularios/${form.id}/respostas`)}
                    className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                  >
                    <BarChart3 size={13} /> Respostas
                  </button>
                  {!form.isGlobal && (
                    <>
                      <button
                        onClick={() => navigate(`/formularios/${form.id}`)}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                      >
                        <Pen size={13} /> Editar
                      </button>
                      <button
                        onClick={() => toggleArchive(form.id)}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                      >
                        {isArchived ? <><RotateCcw size={13} /> Restaurar</> : <><Archive size={13} /> Arquivar</>}
                      </button>
                      <button
                        onClick={() => handleDelete(form.id)}
                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        <Trash2 size={13} /> Excluir formulário
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && selectedForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">Compartilhar Formulário</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedForm.title}</p>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Tabs */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setShareTab('public')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${shareTab === 'public' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Globe size={12} className="inline mr-1" /> Link Público
                </button>
                <button
                  onClick={() => setShareTab('patient')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${shareTab === 'patient' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Eye size={12} className="inline mr-1" /> Vincular Paciente
                </button>
              </div>

              {shareTab === 'public' ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                  <p>Link público genérico. Qualquer pessoa que acessar precisará preencher seus dados de identificação antes de responder.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Selecione o paciente</label>
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 text-sm font-medium text-slate-700"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                  >
                    <option value="">— Selecione —</option>
                    {patients.map(p => (
                      <option key={p.id} value={String(p.id)}>{p.full_name || (p as any).name}</option>
                    ))}
                  </select>
                  {selectedPatientId && (
                    <p className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg flex items-center gap-2">
                      <CheckCircle size={13} /> O paciente não precisará preencher os dados de identificação.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Link de acesso</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getShareLink()}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-600 outline-none font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${copiedLink ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  >
                    {copiedLink ? <><CheckCircle size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={handleWhatsAppShare}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
              >
                <Send size={14} /> Enviar via WhatsApp
              </button>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-slate-500 text-xs font-bold hover:bg-slate-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOASTS */}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border animate-slideIn ${t.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
            {t.type === 'success' ? <CheckCircle size={18}/> : <X size={18}/>}
            <span className="text-xs font-black uppercase tracking-widest">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
