import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ClinicalForm, Patient } from '../types';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Plus, ClipboardList, ChartPie, Pen, Trash2, CheckCircle, Share2, LayoutTemplate, Copy, Send, Lock
} from 'lucide-react';

export const FormsList: React.FC = () => {
  const navigate = useNavigate();
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Share Modal States
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<ClinicalForm | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [formsData, patientsData] = await Promise.all([
          api.get<any[]>('/forms'),
          api.get<Patient[]>('/patients')
        ]);
        const mapped = formsData.map((f) => ({
          id: String(f.id),
          title: f.title,
          hash: f.hash,
          description: f.description || '',
          questions: [],
          interpretations: [],
          responseCount: f.response_count ?? 0,
          isGlobal: Boolean(f.is_global)
        })) as ClinicalForm[];
        setForms(mapped);
        setPatients(patientsData);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const filteredForms = forms.filter(f => 
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    f.hash.includes(searchTerm.toLowerCase())
  );

  const handleOpenShare = (form: ClinicalForm) => {
      setSelectedForm(form);
      setSelectedPatientId('');
      setCopiedLink(false);
      setIsShareModalOpen(true);
  };

  const getShareLink = () => {
      if (!selectedForm) return '';
      let url = `${window.location.origin}${window.location.pathname}#/f/${selectedForm.hash}`;
      if (selectedPatientId) {
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
        ? `Ola ${patient.full_name}, por favor preencha este formulario: ${link}`
        : `Ola, por favor preencha este formulario: ${link}`;
      
      const phone = patient?.whatsapp || patient?.phone || '';
      window.open(`https://wa.me/${phone.replace(/\\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este formulario? Todas as respostas serao perdidas.')) {
        api.delete(`/forms/${id}`)
          .then(() => setForms(prev => prev.filter(f => f.id !== id)))
          .catch((e) => alert(e.message || 'Erro ao remover'));
    }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-blue-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-blue-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <ClipboardList size={14} />
                    <span>Gestao de Formularios</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Meus Formularios</h1>
                <p className="text-blue-200 text-lg leading-relaxed max-w-xl">
                    Gerencie seus questionarios, acompanhe respostas e compartilhe links seguros com seus pacientes em um unico lugar.
                </p>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
                <button 
                    onClick={() => navigate('/forms/new')}
                    className="w-full lg:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                    <Plus size={20} />
                    Novo Formulario
                </button>
            </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
             <div className="overflow-x-auto w-full lg:w-auto pb-2 -mb-2 no-scrollbar">
                <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-max shadow-sm">
                    {['Todos', 'Ativos', 'Arquivados'].map(cat => (
                        <button
                            key={cat}
                            className={`
                                px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap
                                ${cat === 'Todos' 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}
                            `}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative w-full lg:max-w-md group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-blue-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar formulario..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all text-slate-600 placeholder:text-slate-400 shadow-sm"
                />
            </div>
        </div>
      </div>

      {/* Forms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredForms.length === 0 ? (
             <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <ClipboardList size={32} className="opacity-50 text-slate-400" />
                </div>
                <h3 className="font-bold text-slate-700 text-xl mb-1">Nenhum formulario encontrado</h3>
                <p className="text-slate-500 mb-8 max-w-sm text-center">Parece que voce ainda nao criou nenhum formulario ou sua busca nao retornou resultados.</p>
                <button 
                    onClick={() => navigate('/forms/new')}
                    className="text-blue-600 font-bold hover:underline"
                >
                    Criar meu primeiro formulario
                </button>
             </div>
        ) : (
            filteredForms.map(form => (
                <div key={form.id} className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-blue-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(59,130,246,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col relative">
                    
                    {/* Top: Icon & Actions */}
                    <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 font-display font-bold text-xl ${form.isGlobal ? 'bg-purple-50 border-purple-100 text-purple-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                            {form.isGlobal ? <Lock size={20} /> : form.title.charAt(0)}
                        </div>
                        
                        <div className="relative">
                            <button 
                                onClick={() => handleOpenShare(form)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                            >
                                <Share2 size={14} /> Compartilhar
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${form.isGlobal ? 'bg-purple-100 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
                                {form.isGlobal ? 'Modelo Global' : 'Personalizado'}
                            </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors" title={form.title}>
                            {form.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                             {form.description || 'Sem descricao.'}
                        </p>
                    </div>

                    {/* Footer Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium border-t border-slate-50 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                            <LayoutTemplate size={14} />
                            <span>{form.questions.length} campos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ChartPie size={14} />
                            <span>{form.responseCount} resp.</span>
                        </div>
                    </div>

                    {/* Hover Action Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-white/95 backdrop-blur-sm rounded-b-2xl border-t border-blue-100 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex gap-2">
                        {form.isGlobal ? (
                            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs cursor-not-allowed">
                                <Lock size={16} /> Protegido
                            </button>
                        ) : (
                            <>
                                <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors">
                                    <Pen size={16} /> Editar
                                </button>
                                <button 
                                    onClick={() => handleDelete(form.id)}
                                    className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            ))
        )}
      </div>

      {/* SHARE MODAL */}
      {isShareModalOpen && selectedForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-xl font-display font-bold text-slate-800">Compartilhar Formulario</h3>
                      <p className="text-sm text-slate-500 mt-1">{selectedForm.title}</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                      {/* Tabs Mock */}
                      <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!selectedPatientId ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                            onClick={() => setSelectedPatientId('')}
                          >
                              Link Publico
                          </button>
                          <button 
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedPatientId ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                            onClick={() => setSelectedPatientId(patients[0] ? String(patients[0].id) : '')}
                          >
                              Vincular a Paciente
                          </button>
                      </div>

                      {/* Content */}
                      <div className="space-y-4">
                          {selectedPatientId || selectedPatientId !== '' ? (
                              <div>
                                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione o Paciente</label>
                                  <select 
                                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700"
                                    value={selectedPatientId}
                                    onChange={(e) => setSelectedPatientId(e.target.value)}
                                  >
                                      {patients.map(p => (
                                          <option key={p.id} value={p.id}>{p.full_name}</option>
                                      ))}
                                  </select>
                                  <p className="text-xs text-indigo-600 mt-2 bg-indigo-50 p-2 rounded-lg flex items-center gap-2">
                                      <CheckCircle size={14} />
                                      O paciente nao precisara preencher os dados de identificacao.
                                  </p>
                              </div>
                          ) : (
                              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-500">
                                  <p>Este e um link publico generico. Qualquer pessoa que acessar devera preencher seus dados de identificacao (Nome, E-mail e Telefone) antes de responder.</p>
                              </div>
                          )}

                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Link de Acesso</label>
                              <div className="flex gap-2">
                                  <input 
                                    type="text" 
                                    readOnly 
                                    value={getShareLink()} 
                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm text-slate-600 outline-none"
                                  />
                                  <button 
                                    onClick={handleCopyLink}
                                    className={`p-3 rounded-xl font-bold transition-all flex items-center justify-center ${copiedLink ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                    title="Copiar Link"
                                  >
                                      {copiedLink ? <CheckCircle size={20} /> : <Copy size={20} />}
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
                      <button 
                        onClick={handleWhatsAppShare}
                        className="px-6 py-3 rounded-xl font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors flex items-center gap-2"
                      >
                          <Send size={18} /> Enviar via WhatsApp
                      </button>
                      <button 
                        onClick={() => setIsShareModalOpen(false)}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                      >
                          Fechar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
