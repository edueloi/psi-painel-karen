import React, { useState } from 'react';
import { FormQuestion, QuestionType } from '../../types';
import { 
  Plus, Trash2, GripVertical, Type, AlignLeft, Hash, List, CheckSquare, ChevronDown, Save, FileSignature, Wand2, Settings, Eye, ArrowLeft
} from 'lucide-react';
import { Button } from '../UI/Button';

interface FormBuilderProps {
  initialData?: { title: string; description: string; questions: FormQuestion[] };
  onSave: (data: { title: string; description: string; questions: FormQuestion[] }) => void;
  onCancel: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Texto Curto', icon: <Type size={16} /> },
  { type: 'textarea', label: 'Texto Longo', icon: <AlignLeft size={16} /> },
  { type: 'number', label: 'Número', icon: <Hash size={16} /> },
  { type: 'radio', label: 'Múltipla Escolha', icon: <List size={16} /> },
  { type: 'checkbox', label: 'Caixas de Seleção', icon: <CheckSquare size={16} /> },
  { type: 'select', label: 'Lista Suspensa', icon: <ChevronDown size={16} /> },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({ initialData, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'settings'>('editor');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [questions, setQuestions] = useState<FormQuestion[]>(initialData?.questions || []);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const addQuestion = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newQuestion: FormQuestion = {
      id: newId,
      type: 'text',
      text: '',
      required: false,
      options: ['Opção 1']
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newId);
  };

  const updateQuestion = (id: string, field: keyof FormQuestion, value: any) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const removeQuestion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestions(questions.filter(q => q.id !== id));
    if (activeQuestionId === id) setActiveQuestionId(null);
  };

  const addOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return { ...q, options: [...(q.options || []), `Opção ${(q.options?.length || 0) + 1}`] };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[index] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const removeOption = (questionId: string, index: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        return { ...q, options: q.options.filter((_, i) => i !== index) };
      }
      return q;
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-50 rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-[fadeIn_0.3s_ease-out]">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {title || 'Novo Formulário'}
            </h2>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              {questions.length} perguntas • <span className="text-emerald-600">Rascunho salvo</span>
            </span>
          </div>
        </div>

        <div className="flex gap-3">
           <Button variant="ghost" size="sm" className="hidden sm:flex">
             <Eye size={16} className="mr-2" /> Visualizar
           </Button>
           <Button variant="primary" size="sm" onClick={() => onSave({ title, description, questions })}>
             <Save size={16} className="mr-2" /> Salvar
           </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tools (Desktop) */}
        <div className="w-16 md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col hidden md:flex">
           <div className="p-4 border-b border-slate-100">
             <button 
               onClick={addQuestion}
               className="w-full flex items-center justify-center md:justify-start gap-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-3 rounded-xl font-bold transition-all"
             >
               <Plus size={20} />
               <span className="hidden md:inline">Adicionar</span>
             </button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2 space-y-1">
             <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider hidden md:block">Estrutura</div>
             {questions.map((q, idx) => (
               <button
                 key={q.id}
                 onClick={() => {
                    setActiveQuestionId(q.id);
                    document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 }}
                 className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${activeQuestionId === q.id ? 'bg-slate-100 text-indigo-600 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
               >
                 <span className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</span>
                 <span className="truncate hidden md:block">{q.text || 'Sem título'}</span>
               </button>
             ))}
           </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6 pb-20">
            
            {/* Header Card */}
            <div className="bg-white rounded-t-lg rounded-b-xl border-t-8 border-t-indigo-600 shadow-sm p-6 md:p-8">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do Formulário"
                className="w-full text-3xl font-display font-bold text-slate-800 placeholder:text-slate-300 border-none focus:ring-0 p-0 bg-transparent mb-2"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição do formulário"
                className="w-full text-slate-600 placeholder:text-slate-400 border-none focus:ring-0 p-0 bg-transparent resize-none"
                rows={2}
              />
            </div>

            {/* Questions */}
            {questions.map((q, index) => (
              <div 
                key={q.id} 
                id={`q-${q.id}`}
                onClick={() => setActiveQuestionId(q.id)}
                className={`bg-white rounded-xl shadow-sm border transition-all duration-200 overflow-hidden ${
                  activeQuestionId === q.id 
                    ? 'border-indigo-500 ring-4 ring-indigo-500/10 scale-[1.01]' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Drag Handle (Visual only for now) */}
                <div className="h-6 bg-slate-50 border-b border-slate-100 flex items-center justify-center cursor-move text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-colors">
                   <GripVertical size={14} />
                </div>

                <div className="p-6">
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={q.text}
                        onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                        placeholder="Pergunta"
                        className={`w-full p-4 bg-slate-50 border-b-2 border-slate-200 focus:border-indigo-500 focus:bg-white outline-none transition-colors font-medium text-lg ${activeQuestionId === q.id ? 'bg-white' : ''}`}
                      />
                    </div>
                    <div className="w-full md:w-48 shrink-0">
                      <div className="relative">
                        <select
                          value={q.type}
                          onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium text-sm"
                        >
                          {QUESTION_TYPES.map(t => (
                            <option key={t.type} value={t.type}>{t.label}</option>
                          ))}
                        </select>
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                          {QUESTION_TYPES.find(t => t.type === q.type)?.icon}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options Area */}
                  {['radio', 'checkbox', 'select'].includes(q.type) && (
                    <div className="pl-4 space-y-3 mb-6">
                      {q.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-3 group">
                          <div className={`w-4 h-4 rounded border-2 border-slate-300 ${q.type === 'radio' ? 'rounded-full' : 'rounded-sm'}`}></div>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                            className="flex-1 bg-transparent border-b border-transparent focus:border-slate-300 outline-none py-1 text-slate-700 hover:border-slate-200 transition-colors"
                          />
                          <button 
                            onClick={() => removeOption(q.id, optIdx)}
                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all px-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addOption(q.id)}
                        className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 mt-2 px-1"
                      >
                        <Plus size={16} /> Adicionar opção
                      </button>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-6 pt-4 border-t border-slate-50 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 select-none">
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${q.required ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${q.required ? 'left-6' : 'left-1'}`}></div>
                      </div>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={q.required}
                        onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                      />
                      Obrigatória
                    </label>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <button 
                      onClick={(e) => removeQuestion(q.id, e)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
                      title="Excluir pergunta"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Mobile Add Button */}
            <button 
               onClick={addQuestion}
               className="w-full py-4 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 md:hidden"
            >
                <Plus size={20} />
                Adicionar Pergunta
            </button>
            
            {/* Empty State Help */}
            {questions.length === 0 && (
                <div className="text-center py-10 text-slate-400">
                    <Wand2 size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Seu formulário está vazio. <br/> Adicione perguntas para começar.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};