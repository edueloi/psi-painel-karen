
import React, { useState } from 'react';
import { MOCK_MESSAGE_TEMPLATES } from '../constants';
import { MessageTemplate } from '../types';
import { 
  MessageCircle, Search, Plus, Edit3, Trash2, Send, Variable, X, Copy, Check
} from 'lucide-react';

// Variáveis disponíveis para uso nos templates
const AVAILABLE_VARIABLES = [
  { label: 'Nome do Cliente', tag: '{{nome_paciente}}' },
  { label: 'Data Agendamento', tag: '{{data_agendamento}}' },
  { label: 'Horário', tag: '{{horario}}' },
  { label: 'Serviço', tag: '{{servico}}' },
  { label: 'Nome Profissional', tag: '{{nome_profissional}}' },
  { label: 'Valor Total', tag: '{{valor_total}}' },
  { label: 'Nome da Clínica', tag: '{{nome_clinica}}' },
];

export const Messages: React.FC = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>(MOCK_MESSAGE_TEMPLATES);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<MessageTemplate>>({});
  
  // States for "Copy" feedback simulation
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTemplates = templates.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (template?: MessageTemplate) => {
    if (template) {
      setCurrentTemplate({ ...template });
    } else {
      setCurrentTemplate({ category: 'Lembrete', content: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!currentTemplate.title || !currentTemplate.content) {
      alert('Preencha o título e o conteúdo da mensagem.');
      return;
    }

    if (currentTemplate.id) {
      // Edit
      setTemplates(prev => prev.map(t => t.id === currentTemplate.id ? { ...t, ...currentTemplate } as MessageTemplate : t));
    } else {
      // Create
      const newTemplate = { 
        ...currentTemplate, 
        id: Math.random().toString(36).substr(2, 9),
        lastUsed: new Date().toISOString().split('T')[0]
      } as MessageTemplate;
      setTemplates(prev => [...prev, newTemplate]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este modelo?')) {
      setTemplates(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleInsertVariable = (tag: string) => {
    const textarea = document.getElementById('message-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = currentTemplate.content || '';
      const newText = text.substring(0, start) + tag + text.substring(end);
      
      setCurrentTemplate(prev => ({ ...prev, content: newText }));
      
      // Restore focus (timeout needed for React re-render)
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    } else {
      // Fallback if textarea ref not found
      setCurrentTemplate(prev => ({ ...prev, content: (prev.content || '') + tag }));
    }
  };

  const handleWhatsAppSimulation = (template: MessageTemplate) => {
    const fakeMessage = encodeURIComponent(template.content);
    window.open(`https://wa.me/?text=${fakeMessage}`, '_blank');
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-sky-900/20 border border-slate-800 text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-900 via-slate-900 to-indigo-950 opacity-90"></div>
        <div className="absolute -right-32 -top-32 w-96 h-96 bg-sky-500/20 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute left-10 bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-sky-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                    <MessageCircle size={14} />
                    <span>Comunicação</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Mensagens Pré-definidas</h1>
                <p className="text-sky-200 text-lg leading-relaxed max-w-xl">
                    Crie modelos inteligentes com variáveis dinâmicas para agilizar seu atendimento via WhatsApp e E-mail.
                </p>
            </div>

            <div className="flex gap-4 w-full lg:w-auto">
                <button 
                    onClick={() => handleOpenModal()}
                    className="w-full lg:w-auto bg-sky-600 hover:bg-sky-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-sky-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                    <Plus size={20} />
                    Nova Mensagem
                </button>
            </div>
        </div>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col gap-6 sticky top-0 bg-slate-50/95 backdrop-blur z-20 py-4 -my-4 px-1">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            {/* Search Bar */}
            <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5 group-focus-within:text-sky-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Buscar por título ou conteúdo..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-300 transition-all text-slate-600 placeholder:text-slate-400 shadow-sm"
                />
            </div>
        </div>
      </div>

      {/* --- GRID DE MENSAGENS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredTemplates.map(template => (
            <div key={template.id} className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-sky-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_30px_rgba(14,165,233,0.1)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative">
                
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                        <MessageCircle size={24} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100">
                        {template.category}
                    </span>
                </div>

                <h3 className="font-bold text-lg text-slate-800 mb-3">{template.title}</h3>
                
                <div className="flex-1 bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 relative group/preview">
                    <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap line-clamp-4 group-hover/preview:line-clamp-none transition-all">
                        {template.content}
                    </p>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-50 mt-auto">
                    <button 
                        onClick={() => handleWhatsAppSimulation(template)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs hover:bg-emerald-100 transition-colors"
                        title="Enviar via WhatsApp"
                    >
                        <Send size={16} /> WhatsApp
                    </button>
                    
                    <button 
                        onClick={() => handleOpenModal(template)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Editar"
                    >
                        <Edit3 size={18} />
                    </button>
                    
                    <button 
                        onClick={() => handleDelete(template.id)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Excluir"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        ))}
        
        {/* Add New Card (Visual shortcut) */}
        <button 
            onClick={() => handleOpenModal()}
            className="group border-2 border-dashed border-slate-200 hover:border-sky-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-50/10 transition-all min-h-[280px]"
        >
            <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-white flex items-center justify-center mb-4 transition-colors shadow-sm">
                <Plus size={32} />
            </div>
            <span className="font-bold">Criar Nova Mensagem</span>
        </button>
      </div>

      {/* --- MODAL DE EDIÇÃO/CRIAÇÃO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-2xl rounded-[28px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-800">
                           {currentTemplate.id ? 'Editar Modelo' : 'Novo Modelo'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1">Configure o texto e insira variáveis dinâmicas.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 shadow-sm transition-all">
                        <X size={20} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Identificador (Título)</label>
                            <input 
                                type="text" 
                                value={currentTemplate.title || ''}
                                onChange={e => setCurrentTemplate({...currentTemplate, title: e.target.value})}
                                placeholder="Ex: Lembrete Padrão" 
                                className="w-full p-3 rounded-xl border border-slate-200 focus:ring-4 focus:ring-sky-50 focus:border-sky-400 outline-none transition-all font-medium text-slate-700" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Categoria</label>
                            <select 
                                value={currentTemplate.category || 'Lembrete'}
                                onChange={e => setCurrentTemplate({...currentTemplate, category: e.target.value as any})}
                                className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:ring-4 focus:ring-sky-50 focus:border-sky-400 outline-none transition-all font-medium text-slate-600"
                            >
                                <option value="Lembrete">Lembrete</option>
                                <option value="Financeiro">Financeiro</option>
                                <option value="Aniversário">Aniversário</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                             <label className="block text-sm font-bold text-slate-700">Conteúdo da Mensagem</label>
                             <span className="text-xs text-slate-400">Use as variáveis abaixo para personalizar</span>
                        </div>
                        
                        {/* Variables Toolbar */}
                        <div className="flex flex-wrap gap-2 mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                            {AVAILABLE_VARIABLES.map(v => (
                                <button
                                    key={v.tag}
                                    onClick={() => handleInsertVariable(v.tag)}
                                    className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-sky-600 hover:border-sky-200 hover:shadow-sm transition-all flex items-center gap-1 active:scale-95"
                                    title={`Inserir ${v.label}`}
                                >
                                    <Variable size={10} className="text-slate-400" />
                                    {v.label}
                                </button>
                            ))}
                        </div>

                        <textarea 
                            id="message-content"
                            value={currentTemplate.content || ''}
                            onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
                            placeholder="Olá, gostaria de confirmar..." 
                            className="w-full p-4 h-40 rounded-xl border border-slate-200 focus:ring-4 focus:ring-sky-50 focus:border-sky-400 outline-none transition-all font-medium text-slate-700 resize-none leading-relaxed" 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-8 py-3 rounded-xl font-bold bg-sky-600 text-white hover:bg-sky-700 shadow-lg shadow-sky-200 hover:-translate-y-0.5 transition-all"
                    >
                        Salvar Modelo
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
