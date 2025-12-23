
import React, { useState } from 'react';
import { FormQuestion, QuestionType, FormOption, InterpretationRule, FormTheme } from '../../types';
import { 
  Plus, Trash2, GripVertical, Type, AlignLeft, Hash, List, CheckSquare, ChevronDown, Save, FileSignature, Wand2, Settings, Eye, ArrowLeft, Calculator, Target, Palette
} from 'lucide-react';
import { Button } from '../UI/Button';

interface FormBuilderProps {
  initialData?: { title: string; description: string; questions: FormQuestion[]; interpretations?: InterpretationRule[]; theme?: FormTheme };
  onSave: (data: { title: string; description: string; questions: FormQuestion[]; interpretations?: InterpretationRule[]; theme?: FormTheme }) => void;
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
  const [activeTab, setActiveTab] = useState<'editor' | 'logic' | 'settings'>('editor');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [questions, setQuestions] = useState<FormQuestion[]>(initialData?.questions || []);
  const [interpretations, setInterpretations] = useState<InterpretationRule[]>(initialData?.interpretations || []);


  const [theme, setTheme] = useState<FormTheme>(initialData?.theme || {
    primaryColor: '#4f46e5',
    accentColor: '#7c3aed',
    backgroundColor: '#f8fafc',
    cardColor: '#ffffff',
    buttonColor: '#4f46e5',
    headerImageUrl: ''
  });
  const paletteOptions = [
    { label: 'Neutros', colors: ['#0f172a', '#111827', '#1f2937', '#334155', '#475569', '#64748b', '#94a3b8', '#e2e8f0', '#f1f5f9', '#ffffff'] },
    { label: 'Pasteis', colors: ['#fce7f3', '#fde2e2', '#ffe4e6', '#fde68a', '#fef3c7', '#e9d5ff', '#ddd6fe', '#dbeafe', '#cffafe', '#d1fae5'] },
    { label: 'Vibrantes', colors: ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'] },
    { label: 'Tons Azuis', colors: ['#0ea5e9', '#38bdf8', '#60a5fa', '#2563eb', '#1d4ed8', '#1e40af', '#0f172a', '#e0f2fe', '#bae6fd', '#7dd3fc'] },
    { label: 'Tons Verdes', colors: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7', '#064e3b', '#10b981', '#34d399', '#a7f3d0'] },
    { label: 'Terrosos', colors: ['#7f5539', '#9c6644', '#b08968', '#c9ada7', '#a98467', '#6b4423', '#e6ccb2', '#ede0d4', '#ddb892', '#f5ebe0'] },
    { label: 'Roxos', colors: ['#2e1065', '#4c1d95', '#5b21b6', '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff', '#f5f3ff'] },
    { label: 'Laranjas', colors: ['#7c2d12', '#9a3412', '#c2410c', '#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed'] },
    { label: 'Rosas', colors: ['#831843', '#9d174d', '#be185d', '#db2777', '#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8', '#fce7f3', '#fff1f2'] },
    { label: 'Azul Esverdeado', colors: ['#042f2e', '#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1', '#e0fdfa', '#f0fdfa'] }
  ];
  const [selectedPalette, setSelectedPalette] = useState(paletteOptions[1].label);
  const currentPalette = paletteOptions.find(p => p.label === selectedPalette)?.colors || paletteOptions[0].colors;

  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [titleError, setTitleError] = useState('');
  const handleSave = () => {
    if (!title.trim()) {
      setTitleError('Titulo obrigatorio para salvar.');
      return;
    }
    setTitleError('');
    onSave({ title, description, questions, interpretations, theme });
  };

  // --- Logic Helpers ---
  const calculateMaxScore = () => {
      return questions.reduce((acc, q) => {
          if ((q.type === 'radio' || q.type === 'select') && q.options) {
              const maxOption = Math.max(...q.options.map(o => o.value || 0));
              return acc + maxOption;
          }
          if (q.type === 'checkbox' && q.options) {
              const sumOptions = q.options.reduce((sum, o) => sum + (o.value || 0), 0);
              return acc + sumOptions;
          }
          return acc;
      }, 0);
  };

  const addInterpretation = () => {
      const newRule: InterpretationRule = {
          id: Math.random().toString(36).substr(2, 5),
          minScore: 0,
          maxScore: 10,
          resultTitle: '',
          description: '',
          color: 'bg-slate-100 text-slate-800'
      };
      setInterpretations([...interpretations, newRule]);
  };

  const updateInterpretation = (id: string, field: keyof InterpretationRule, value: any) => {
      setInterpretations(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const deleteInterpretation = (id: string) => {
      setInterpretations(prev => prev.filter(i => i.id !== id));
  };

  // --- Question Helpers ---
  const addQuestion = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newQuestion: FormQuestion = {
      id: newId,
      type: 'text',
      text: '',
      required: false,
      options: [{ label: 'Opção 1', value: 0 }]
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
        return { ...q, options: [...(q.options || []), { label: `Opção ${(q.options?.length || 0) + 1}`, value: 0 }] };
      }
      return q;
    }));
  };

  const updateOption = (questionId: string, index: number, field: keyof FormOption, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[index] = { ...newOptions[index], [field]: value };
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

        {/* Tab Switcher in Header */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
                onClick={() => setActiveTab('editor')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'editor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                Editor
            </button>
            <button 
                onClick={() => setActiveTab('logic')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'logic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Calculator size={14} /> Cálculo & Resultados
            </button>
            <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Palette size={14} /> Aparencia
            </button>
        </div>

        <div className="flex gap-3">
           <Button variant="primary" size="sm" onClick={handleSave}>
             <Save size={16} className="mr-2" /> Salvar
           </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- TAB: EDITOR --- */}
        {activeTab === 'editor' && (
            <>
                {/* Sidebar Tools (Desktop) */}
                <div className="w-16 md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col hidden md:flex">
                <div className="p-4 border-b border-slate-100">
                    <button 
                    onClick={addQuestion}
                    className="w-full flex items-center justify-center md:justify-start gap-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 p-3 rounded-xl font-bold transition-all"
                    >
                    <Plus size={20} />
                    <span className="hidden md:inline">Adicionar Pergunta</span>
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
                        onChange={(e) => {
                          setTitle(e.target.value);
                          if (titleError) setTitleError('');
                        }}
                        placeholder="Título do Formulário"
                        className={`w-full text-3xl font-display font-bold placeholder:text-slate-300 border-none focus:ring-0 p-0 bg-transparent mb-2 ${
                          titleError ? 'text-red-600' : 'text-slate-800'
                        }`}
                    />
                    {titleError ? (
                      <p className="text-xs font-bold text-red-600 mb-2">
                        {titleError}
                      </p>
                    ) : null}
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
                                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase px-1">
                                    <span>Opção</span>
                                    <span>Pontos (Score)</span>
                                </div>
                                {q.options?.map((opt, optIdx) => (
                                    <div key={optIdx} className="flex items-center gap-3 group">
                                    <div className={`w-4 h-4 rounded border-2 border-slate-300 ${q.type === 'radio' ? 'rounded-full' : 'rounded-sm'}`}></div>
                                    <input
                                        type="text"
                                        value={opt.label}
                                        onChange={(e) => updateOption(q.id, optIdx, 'label', e.target.value)}
                                        className="flex-1 bg-transparent border-b border-transparent focus:border-slate-300 outline-none py-1 text-slate-700 hover:border-slate-200 transition-colors"
                                    />
                                    {/* Score Input */}
                                    <div className="w-20 relative">
                                        <input
                                            type="number"
                                            value={opt.value}
                                            onChange={(e) => updateOption(q.id, optIdx, 'value', parseInt(e.target.value) || 0)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-center font-bold text-indigo-600 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
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
            </>
        )}

        {/* --- TAB: LOGIC & CALCULATION --- */}
        {activeTab === 'logic' && (
            <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">Simulador de Pontuação</h3>
                                <p className="text-slate-500 text-sm">O sistema soma automaticamente os valores atribuídos às opções.</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 text-center">
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Pontuação Máxima Possível</p>
                            <p className="text-4xl font-display font-bold text-indigo-600">{calculateMaxScore()} pontos</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <Target size={24} className="text-indigo-600" />
                                <h3 className="text-xl font-bold text-slate-800">Regras de Interpretação</h3>
                            </div>
                            <button onClick={addInterpretation} className="flex items-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg transition-colors">
                                <Plus size={16} /> Nova Regra
                            </button>
                        </div>

                        {interpretations.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-400">Nenhuma regra definida. O resultado mostrará apenas a soma total.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {interpretations.map((rule, idx) => (
                                    <div key={rule.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-500 text-sm">{idx + 1}</div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-bold text-slate-600">De</span>
                                                <input 
                                                    type="number" 
                                                    value={rule.minScore} 
                                                    onChange={e => updateInterpretation(rule.id, 'minScore', parseInt(e.target.value))}
                                                    className="w-16 p-2 rounded-lg border border-slate-300 text-center font-bold outline-none focus:border-indigo-500"
                                                />
                                                <span className="text-sm font-bold text-slate-600">até</span>
                                                <input 
                                                    type="number" 
                                                    value={rule.maxScore} 
                                                    onChange={e => updateInterpretation(rule.id, 'maxScore', parseInt(e.target.value))}
                                                    className="w-16 p-2 rounded-lg border border-slate-300 text-center font-bold outline-none focus:border-indigo-500"
                                                />
                                                <span className="text-sm font-bold text-slate-600">pontos</span>
                                            </div>
                                            <div className="flex-1"></div>
                                            <button onClick={() => deleteInterpretation(rule.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18} /></button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Título do Resultado</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ex: Sono Preservado"
                                                    value={rule.resultTitle}
                                                    onChange={e => updateInterpretation(rule.id, 'resultTitle', e.target.value)}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cor do Card</label>
                                                <select 
                                                    value={rule.color}
                                                    onChange={e => updateInterpretation(rule.id, 'color', e.target.value)}
                                                    className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-white"
                                                >
                                                    <option value="bg-slate-100 text-slate-800">Cinza (Neutro)</option>
                                                    <option value="bg-emerald-100 text-emerald-800">Verde (Positivo)</option>
                                                    <option value="bg-blue-100 text-blue-800">Azul (Informativo)</option>
                                                    <option value="bg-amber-100 text-amber-800">Amarelo (Atenção)</option>
                                                    <option value="bg-red-100 text-red-800">Vermelho (Crítico)</option>
                                                </select>
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descrição Clínica / Orientação</label>
                                            <textarea 
                                                rows={2}
                                                placeholder="Texto que aparecerá na conclusão..."
                                                value={rule.description}
                                                onChange={e => updateInterpretation(rule.id, 'description', e.target.value)}
                                                className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 resize-none"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}



{/* --- TAB: SETTINGS --- */}
{activeTab === 'settings' && (
    <div className="flex-1 overflow-y-auto bg-slate-100/50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Palette size={18} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Tema do Formulario Publico</h3>
                        <p className="text-sm text-slate-500">Personalize as cores e o cabecalho.</p>
                    </div>
                </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="space-y-2 md:col-span-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Paleta</span>
                            <select
                                value={selectedPalette}
                                onChange={e => setSelectedPalette(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 bg-white"
                            >
                                {paletteOptions.map((palette) => (
                                    <option key={palette.label} value={palette.label}>{palette.label}</option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Cor primaria</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                            {currentPalette.map(color => (
                                <button
                                    key={`primary-${color}`}
                                    type="button"
                                    onClick={() => setTheme(prev => ({ ...prev, primaryColor: color }))}
                                    className={`h-6 w-6 rounded-full border border-slate-200 shadow-sm transition ring-2 ring-offset-2 ring-offset-white ${theme.primaryColor === color ? 'ring-indigo-500' : 'ring-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Cor secundaria</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                            {currentPalette.map(color => (
                                <button
                                    key={`accent-${color}`}
                                    type="button"
                                    onClick={() => setTheme(prev => ({ ...prev, accentColor: color }))}
                                    className={`h-6 w-6 rounded-full border border-slate-200 shadow-sm transition ring-2 ring-offset-2 ring-offset-white ${theme.accentColor === color ? 'ring-indigo-500' : 'ring-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Fundo</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                            {currentPalette.map(color => (
                                <button
                                    key={`bg-${color}`}
                                    type="button"
                                    onClick={() => setTheme(prev => ({ ...prev, backgroundColor: color }))}
                                    className={`h-6 w-6 rounded-full border border-slate-200 shadow-sm transition ring-2 ring-offset-2 ring-offset-white ${theme.backgroundColor === color ? 'ring-indigo-500' : 'ring-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Card</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                            {currentPalette.map(color => (
                                <button
                                    key={`card-${color}`}
                                    type="button"
                                    onClick={() => setTheme(prev => ({ ...prev, cardColor: color }))}
                                    className={`h-6 w-6 rounded-full border border-slate-200 shadow-sm transition ring-2 ring-offset-2 ring-offset-white ${theme.cardColor === color ? 'ring-indigo-500' : 'ring-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                        </label>
                        <label className="space-y-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Botao</span>
                            <div className="flex flex-wrap gap-2 pt-1">
                            {currentPalette.map(color => (
                                <button
                                    key={`button-${color}`}
                                    type="button"
                                    onClick={() => setTheme(prev => ({ ...prev, buttonColor: color }))}
                                    className={`h-6 w-6 rounded-full border border-slate-200 shadow-sm transition ring-2 ring-offset-2 ring-offset-white ${theme.buttonColor === color ? 'ring-indigo-500' : 'ring-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>
                    </label>
                    <label className="space-y-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Imagem do cabecalho (URL)</span>
                        <input type="text" value={theme.headerImageUrl || ''} onChange={e => setTheme(prev => ({ ...prev, headerImageUrl: e.target.value }))} placeholder="https://" className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                    </label>
                </div>
            </div>
        </div>
    </div>
)}

      </div>
    </div>
  );
};

