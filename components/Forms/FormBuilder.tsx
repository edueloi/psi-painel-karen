
import React, { useState } from 'react';
import { FormQuestion, QuestionType, FormOption, InterpretationRule, FormTheme } from '../../types';
import {
  Plus, Trash2, GripVertical, Type, AlignLeft, Hash, List, CheckSquare, ChevronDown, Save, Wand2, ArrowLeft, Calculator, Target, Palette, Settings, Eye, Copy, MoveVertical, AlertCircle, Sparkles
} from 'lucide-react';
import { Button } from '../UI/Button';
import { Input, Select, TextArea } from '../UI/Input';
import { AppCard } from '../UI/AppCard';

interface FormBuilderProps {
  initialData?: { title: string; description: string; questions: FormQuestion[]; interpretations?: InterpretationRule[]; theme?: FormTheme };
  onSave: (data: { title: string; description: string; questions: FormQuestion[]; interpretations?: InterpretationRule[]; theme?: FormTheme }) => void;
  onCancel: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'text', label: 'Texto Curto', icon: <Type size={16} />, color: 'bg-blue-50 text-blue-600' },
  { type: 'textarea', label: 'Texto Longo', icon: <AlignLeft size={16} />, color: 'bg-indigo-50 text-indigo-600' },
  { type: 'number', label: 'Número', icon: <Hash size={16} />, color: 'bg-emerald-50 text-emerald-600' },
  { type: 'radio', label: 'Múltipla Escolha', icon: <List size={16} />, color: 'bg-amber-50 text-amber-600' },
  { type: 'checkbox', label: 'Caixas de Seleção', icon: <CheckSquare size={16} />, color: 'bg-rose-50 text-rose-600' },
  { type: 'select', label: 'Lista Suspensa', icon: <ChevronDown size={16} />, color: 'bg-violet-50 text-violet-600' },
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
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-5">
          <button 
            onClick={onCancel} 
            className="group flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 hover:bg-white hover:shadow-md transition-all duration-300"
          >
            <ArrowLeft size={18} className="text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              {title || 'Novo Formulário'}
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">Editor</span>
            </h2>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Target size={12} /> {questions.length} perguntas
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1 italic">
                <Sparkles size={11} /> Rascunho automático ativo
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher in Header */}
        <div className="hidden lg:flex bg-slate-100/80 p-1.5 rounded-2xl gap-1">
            {[
              { id: 'editor' as const, label: 'Editor', icon: <Settings size={14} /> },
              { id: 'logic' as const, label: 'Cálculo', icon: <Calculator size={14} /> },
              { id: 'settings' as const, label: 'Identidade', icon: <Palette size={14} /> }
            ].map(tab => (
              <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-white text-indigo-600 shadow-sm transform scale-105' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
              >
                  {tab.icon} {tab.label}
              </button>
            ))}
        </div>

        <div className="flex items-center gap-3">
           <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors hidden sm:block">
             <Eye size={20} />
           </button>
           <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
           <Button variant="primary" size="md" onClick={handleSave} className="rounded-2xl px-6 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
             <Save size={18} className="mr-2" /> Salvar Projeto
           </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* --- TAB: EDITOR --- */}
        {activeTab === 'editor' && (
            <>
                {/* Sidebar Tools (Desktop) */}
                <div className="w-16 lg:w-72 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col hidden md:flex animate-in slide-in-from-left duration-500">
                <div className="p-5 border-b border-slate-100">
                    <Button
                      variant="primary"
                      size="md"
                      fullWidth
                      leftIcon={<Plus size={18} />}
                      onClick={addQuestion}
                      className="rounded-2xl shadow-sm"
                    >
                      <span className="hidden lg:inline">Nova Pergunta</span>
                    </Button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden lg:block mb-2">Estrutura do Form</div>
                    {questions.length === 0 ? (
                      <div className="px-4 py-8 text-center hidden lg:block">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-dashed border-slate-300">
                          <Plus size={20} className="text-slate-300" />
                        </div>
                        <p className="text-[11px] font-medium text-slate-400">Nenhum campo adicionado ainda</p>
                      </div>
                    ) : (
                      questions.map((q, idx) => {
                        const typeInfo = QUESTION_TYPES.find(t => t.type === q.type);
                        return (
                          <button
                              key={q.id}
                              onClick={() => {
                                  setActiveQuestionId(q.id);
                                  document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }}
                              className={`w-full group flex items-center gap-3 px-3 py-3 rounded-2xl text-sm transition-all duration-300 ${
                                activeQuestionId === q.id 
                                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                                  : 'text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-100'
                              }`}
                          >
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 transition-transform group-hover:scale-110 ${
                                activeQuestionId === q.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {idx + 1}
                              </div>
                              <div className="flex-1 text-left min-w-0 hidden lg:block">
                                <p className={`truncate font-bold text-xs ${activeQuestionId === q.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                  {q.text || 'Sem título...'}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className={`p-1 rounded ${typeInfo?.color || 'bg-slate-100'}`}>
                                    {React.cloneElement(typeInfo?.icon as React.ReactElement, { size: 10 })}
                                  </span>
                                  <span className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">{typeInfo?.label}</span>
                                </div>
                              </div>
                              <div className={`opacity-0 group-hover:opacity-100 transition-opacity hidden lg:block ${activeQuestionId === q.id ? 'text-indigo-400' : 'text-slate-300'}`}>
                                <GripVertical size={14} />
                              </div>
                          </button>
                        );
                      })
                    )}
                </div>
                </div>

                {/* Main Canvas */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-12 scroll-smooth custom-scrollbar">
                <div className="max-w-3xl mx-auto space-y-10 pb-32">
                    
                    {/* Header Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8 md:p-12 relative overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-100">
                      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-50 rounded-full opacity-50 blur-3xl group-hover:bg-indigo-100 transition-colors"></div>
                      
                      <div className="relative">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => {
                              setTitle(e.target.value);
                              if (titleError) setTitleError('');
                            }}
                            placeholder="Título do Formulário"
                            className={`w-full text-4xl font-black placeholder:text-slate-200 border-none focus:ring-0 p-0 bg-transparent mb-4 tracking-tight transition-all ${
                              titleError ? 'text-red-600' : 'text-slate-800'
                            }`}
                        />
                        {titleError && (
                          <div className="flex items-center gap-2 text-red-500 text-xs font-bold mb-4 animate-bounce">
                            <AlertCircle size={14} /> {titleError}
                          </div>
                        )}
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descreva o objetivo deste formulário para quem irá responder..."
                            className="w-full text-slate-500 placeholder:text-slate-300 border-none focus:ring-0 p-0 bg-transparent resize-none leading-relaxed font-medium"
                            rows={2}
                        />
                      </div>
                    </div>

                    {/* Questions Area */}
                    <div className="space-y-8">
                      {questions.map((q, index) => {
                        const typeInfo = QUESTION_TYPES.find(t => t.type === q.type);
                        const isActive = activeQuestionId === q.id;
                        
                        return (
                          <div 
                              key={q.id} 
                              id={`q-${q.id}`}
                              onClick={() => setActiveQuestionId(q.id)}
                              className={`group relative transition-all duration-500 ${
                                isActive ? 'scale-100 opacity-100' : 'scale-[0.98] opacity-90 grayscale-[0.2]'
                              }`}
                          >
                            <div className={`absolute -left-12 top-8 hidden lg:flex flex-col items-center gap-2 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                              <button onClick={(e) => {e.stopPropagation(); addQuestion();}} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:shadow-md transition-all">
                                <Plus size={16} />
                              </button>
                            </div>

                            <div className={`bg-white rounded-[32px] shadow-sm border transition-all duration-500 overflow-hidden ${
                            isActive 
                                ? 'border-indigo-500/30 shadow-2xl shadow-indigo-200/50 ring-1 ring-indigo-500/20' 
                                : 'border-slate-200 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50'
                            }`}>
                                {/* Drag Handle Area */}
                                <div className={`h-8 flex items-center justify-center cursor-move transition-colors ${isActive ? 'bg-indigo-50/50 text-indigo-300' : 'bg-slate-50/50 text-slate-200'}`}>
                                  <MoveVertical size={14} className="group-hover:text-slate-400 transition-colors" />
                                </div>

                                <div className="p-6 md:p-8 pt-2">
                                  <div className="flex flex-col lg:flex-row gap-6 mb-8">
                                      <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-black">{index + 1}</span>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enunciado da Pergunta</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={q.text}
                                            onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                                            placeholder="Ex: Como você se sentiu hoje?"
                                            className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-lg text-slate-800 placeholder:text-slate-200"
                                        />
                                      </div>
                                      <div className="w-full lg:w-56 shrink-0">
                                        <div className="flex items-center gap-2 mb-3">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Tipo de Resposta</span>
                                        </div>
                                        <Select
                                            label=""
                                            labelClassName="hidden"
                                            value={q.type}
                                            onChange={(e) => updateQuestion(q.id, 'type', e.target.value as QuestionType)}
                                            leftIcon={React.cloneElement(typeInfo?.icon as React.ReactElement, { size: 16, className: typeInfo?.color })}
                                            className="rounded-xl bg-slate-50 border-none font-semibold text-slate-700 h-11"
                                        >
                                            {QUESTION_TYPES.map(t => (
                                                <option key={t.type} value={t.type}>{t.label}</option>
                                            ))}
                                        </Select>
                                      </div>
                                  </div>

                                  {/* Options Area with richer aesthetics */}
                                  {['radio', 'checkbox', 'select'].includes(q.type) && (
                                      <div className="mt-6 p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-4">
                                          <div className="flex justify-between items-center mb-4">
                                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Opções de Resposta</span>
                                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-12">Valor/Peso</div>
                                          </div>
                                          <div className="space-y-3">
                                            {q.options?.map((opt, optIdx) => (
                                                <div key={optIdx} className="flex items-center gap-4 group/opt animate-in fade-in slide-in-from-top-1 duration-300">
                                                  <div className={`w-5 h-5 rounded-lg border-2 border-slate-300 flex items-center justify-center shrink-0 ${q.type === 'radio' ? 'rounded-full' : 'rounded-md'}`}>
                                                    <div className="w-2 h-2 rounded-full bg-transparent group-hover/opt:bg-slate-200 transition-colors"></div>
                                                  </div>
                                                  <input
                                                      type="text"
                                                      value={opt.label}
                                                      onChange={(e) => updateOption(q.id, optIdx, 'label', e.target.value)}
                                                      className="flex-1 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none py-1.5 text-sm font-semibold text-slate-700 placeholder:text-slate-300 transition-all"
                                                      placeholder={`Opção ${optIdx + 1}`}
                                                  />
                                                  <div className="w-20 shrink-0">
                                                      <input
                                                          type="number"
                                                          value={opt.value}
                                                          onChange={(e) => updateOption(q.id, optIdx, 'value', parseInt(e.target.value) || 0)}
                                                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-center font-black text-indigo-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                                      />
                                                  </div>
                                                  <button
                                                      onClick={() => removeOption(q.id, optIdx)}
                                                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/opt:opacity-100"
                                                  >
                                                      <Trash2 size={14} />
                                                  </button>
                                                </div>
                                            ))}
                                          </div>
                                          <button
                                              onClick={() => addOption(q.id)}
                                              className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all group"
                                          >
                                              <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Adicionar nova opção
                                          </button>
                                      </div>
                                  )}

                                  {/* Footer Actions */}
                                  <div className="flex items-center justify-between pt-8 mt-8 border-t border-slate-100">
                                      <div className="flex items-center gap-6">
                                        <label className="flex items-center gap-3 cursor-pointer group/switch">
                                          <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ${q.required ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-slate-200'}`}>
                                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${q.required ? 'left-6' : 'left-1'}`}></div>
                                          </div>
                                          <input 
                                              type="checkbox" 
                                              className="hidden" 
                                              checked={q.required}
                                              onChange={(e) => updateQuestion(q.id, 'required', e.target.checked)}
                                          />
                                          <span className={`text-[11px] font-black uppercase tracking-wider transition-colors ${q.required ? 'text-indigo-600' : 'text-slate-400'}`}>Obrigatória</span>
                                        </label>
                                        <div className="h-4 w-px bg-slate-200"></div>
                                        <button className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors">
                                          <Copy size={14} />
                                          <span className="text-[11px] font-black uppercase tracking-wider">Duplicar</span>
                                        </button>
                                      </div>

                                      <button
                                        onClick={(e) => removeQuestion(q.id, e)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all font-black text-[10px] uppercase tracking-widest"
                                      >
                                        <Trash2 size={14} /> Excluir Campo
                                      </button>
                                  </div>
                                </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Question Empty state or terminal */}
                      <button 
                        onClick={addQuestion}
                        className="w-full flex flex-col items-center justify-center p-12 rounded-[40px] border-4 border-dashed border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-500 hover:bg-white hover:shadow-2xl hover:shadow-indigo-100 transition-all duration-500 group"
                      >
                        <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                          <Plus size={32} className="group-hover:rotate-90 transition-all duration-500" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight">Qual a próxima pergunta?</h3>
                        <p className="text-sm font-medium opacity-60 mt-1">Clique para inserir um novo campo de resposta</p>
                      </button>
                    </div>
                </div>
                </div>
            </>
        )}

        {/* --- TAB: LOGIC & CALCULATION --- */}
        {activeTab === 'logic' && (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-12 animate-in fade-in zoom-in-95 duration-500 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-10 pb-32">
                    <div className="bg-white rounded-[40px] p-10 lg:p-14 border border-slate-200 shadow-2xl shadow-indigo-100/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-60"></div>
                        <div className="relative flex flex-col md:flex-row items-center gap-10">
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-[32px] flex items-center justify-center shadow-xl shadow-indigo-200 shrink-0">
                                <Calculator size={40} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Motor de Pontuação</h3>
                                <p className="text-slate-500 font-medium leading-relaxed max-w-lg">Configuramos a soma automática para que você possa criar avaliações clínicas precisas em segundos.</p>
                            </div>
                            <div className="bg-slate-50 rounded-[32px] p-8 border border-indigo-100 text-center min-w-[200px] shadow-inner">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Teto de Pontos</p>
                                <p className="text-5xl font-black text-indigo-600 tracking-tighter">{calculateMaxScore()}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex justify-between items-end px-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                                  <Target size={24} className="text-indigo-500" /> Interpretador Dinâmico
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">Defina o que cada faixa de pontuação significa</p>
                            </div>
                            <Button variant="primary" size="md" leftIcon={<Plus size={18} />} onClick={addInterpretation} className="rounded-2xl shadow-lg shadow-indigo-200">
                                Adicionar Filtro
                            </Button>
                        </div>

                        {interpretations.length === 0 ? (
                            <div className="text-center py-24 bg-white border-4 border-dashed border-slate-200 rounded-[48px] px-10">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                  <AlertCircle size={32} className="text-slate-300" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 mb-2">Nenhuma regra de cálculo</h4>
                                <p className="text-slate-400 font-medium max-w-sm mx-auto mb-8">O formulário apenas salvará as respostas sem interpretá-las. Adicione uma regra para automatizar sua análise.</p>
                                <Button variant="soft" onClick={addInterpretation}>Criar primeira regra agora</Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-6">
                                {interpretations.map((rule, idx) => (
                                    <div key={rule.id} className="group bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-500 animate-in slide-in-from-bottom-4">
                                        <div className="flex flex-col lg:flex-row items-start gap-8">
                                            <div className="flex flex-col items-center gap-3 shrink-0">
                                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500 shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">{idx + 1}</div>
                                              <button onClick={() => deleteInterpretation(rule.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                                            </div>

                                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
                                                <div className="lg:col-span-4 space-y-4">
                                                  <div className="flex items-center gap-4">
                                                      <div className="flex-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Mínimo</label>
                                                        <input 
                                                            type="number" 
                                                            value={rule.minScore} 
                                                            onChange={e => updateInterpretation(rule.id, 'minScore', parseInt(e.target.value))}
                                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-indigo-600 text-center focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                        />
                                                      </div>
                                                      <div className="pt-6 font-bold text-slate-300">até</div>
                                                      <div className="flex-1">
                                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Máximo</label>
                                                        <input 
                                                            type="number" 
                                                            value={rule.maxScore} 
                                                            onChange={e => updateInterpretation(rule.id, 'maxScore', parseInt(e.target.value))}
                                                            className="w-full bg-slate-50 border-none rounded-2xl p-4 font-black text-indigo-600 text-center focus:ring-4 focus:ring-indigo-500/10 transition-all"
                                                        />
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="pt-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Estilo do Resultado</label>
                                                    <Select
                                                        label=""
                                                        labelClassName="hidden"
                                                        value={rule.color}
                                                        onChange={e => updateInterpretation(rule.id, 'color', e.target.value)}
                                                        className="rounded-2xl bg-white border-slate-200 font-bold text-sm h-12"
                                                    >
                                                        <option value="bg-slate-100 text-slate-800">Neutral (Cinza)</option>
                                                        <option value="bg-emerald-100 text-emerald-800">Excellent (Verde)</option>
                                                        <option value="bg-blue-100 text-blue-800">Standard (Azul)</option>
                                                        <option value="bg-amber-100 text-amber-800">Attention (Amarelo)</option>
                                                        <option value="bg-red-100 text-red-800">Critical (Vermelho)</option>
                                                    </Select>
                                                  </div>
                                                </div>

                                                <div className="lg:col-span-8 space-y-6">
                                                  <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Nomenclatura do Resultado</label>
                                                    <Input
                                                        label=""
                                                        labelClassName="hidden"
                                                        placeholder="Ex: Nível de Ansiedade Elevado"
                                                        value={rule.resultTitle}
                                                        onChange={e => updateInterpretation(rule.id, 'resultTitle', e.target.value)}
                                                        className="rounded-2xl bg-white border-slate-200 font-black text-slate-800 h-12"
                                                    />
                                                  </div>
                                                  <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Instruções / Relatório Gerado</label>
                                                    <TextArea
                                                        label=""
                                                        labelClassName="hidden"
                                                        rows={3}
                                                        placeholder="Escreva a análise clínica que será exibida quando esta pontuação for atingida..."
                                                        value={rule.description}
                                                        onChange={e => updateInterpretation(rule.id, 'description', e.target.value)}
                                                        className="rounded-2xl bg-slate-50 border-none font-medium leading-relaxed"
                                                    />
                                                  </div>
                                                </div>
                                            </div>
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
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 lg:p-12 animate-in fade-in zoom-in-95 duration-500 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-10 pb-32">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      
                      {/* Brand Config */}
                      <div className="lg:col-span-7 bg-white rounded-[48px] p-10 lg:p-14 border border-slate-200 shadow-xl space-y-12">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[24px] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                                <Palette size={28} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Design Experience</h3>
                                <p className="text-sm font-medium text-slate-400">Configure a identidade visual do formulário público.</p>
                            </div>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Curadoria de Paletas</label>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                  {paletteOptions.map((palette) => (
                                      <button 
                                        key={palette.label} 
                                        onClick={() => setSelectedPalette(palette.label)}
                                        className={`p-3 rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 ${
                                          selectedPalette === palette.label ? 'border-indigo-500 bg-indigo-50 shadow-md transform scale-105' : 'border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200'
                                        }`}
                                      >
                                          <div className="grid grid-cols-2 w-full gap-0.5 rounded overflow-hidden">
                                            {palette.colors.slice(0, 4).map((c, i) => <div key={i} className="h-3 w-full" style={{backgroundColor: c}}></div>)}
                                          </div>
                                          <span className={`text-[9px] font-black uppercase tracking-tighter ${selectedPalette === palette.label ? 'text-indigo-700' : 'text-slate-400'}`}>{palette.label}</span>
                                      </button>
                                  ))}
                                </div>
                            </div>

                            <div className="space-y-8 p-8 rounded-[32px] bg-slate-50 border border-slate-100">
                                {[
                                  { label: 'Cor Primária / Ação', field: 'primaryColor' },
                                  { label: 'Cor de Destaque', field: 'accentColor' },
                                  { label: 'Plano de Fundo', field: 'backgroundColor' },
                                  { label: 'Interface de Card', field: 'cardColor' }
                                ].map(colorField => (
                                  <div key={colorField.field} className="space-y-3">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">{colorField.label}</span>
                                      <div className="flex flex-wrap gap-2.5">
                                      {currentPalette.map(color => (
                                          <button
                                              key={`${colorField.field}-${color}`}
                                              type="button"
                                              onClick={() => setTheme(prev => ({ ...prev, [colorField.field]: color }))}
                                              className={`h-7 w-7 rounded-lg border-2 border-white shadow-xl transition-all duration-300 hover:scale-125 ${theme[colorField.field as keyof FormTheme] === color ? 'ring-2 ring-indigo-500 ring-offset-2 scale-110' : 'ring-1 ring-slate-200'}`}
                                              style={{ backgroundColor: color }}
                                              title={color}
                                          />
                                      ))}
                                  </div>
                                  </div>
                                ))}
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 px-1">Imagem de Capa (Header)</label>
                                <Input
                                    label=""
                                    labelClassName="hidden"
                                    type="text"
                                    value={theme.headerImageUrl || ''}
                                    onChange={e => setTheme(prev => ({ ...prev, headerImageUrl: e.target.value }))}
                                    placeholder="https://sua-imagem.com/banner.jpg"
                                    className="rounded-2xl border-slate-200 bg-white font-medium h-12"
                                    leftIcon={<Plus size={18} />}
                                />
                                <p className="text-[10px] text-slate-400 font-medium mt-3 px-1">Formatos suportados: JPG, PNG ou WebP. Proporção recomendada 16:9.</p>
                            </div>
                        </div>
                      </div>

                      {/* Preview Mobile Rendering */}
                      <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="bg-slate-800 rounded-[60px] p-6 shadow-2xl relative border-[8px] border-slate-700 h-[600px] w-full max-w-[320px] mx-auto overflow-hidden">
                          {/* iPhone Notch */}
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded-b-2xl z-20"></div>
                          
                          {/* Inner Screen */}
                          <div className="w-full h-full bg-white rounded-[40px] overflow-hidden flex flex-col" style={{backgroundColor: theme.backgroundColor}}>
                            {theme.headerImageUrl ? (
                              <img src={theme.headerImageUrl} className="h-24 w-full object-cover" />
                            ) : (
                              <div className="h-24 w-full" style={{backgroundColor: theme.primaryColor}}></div>
                            )}
                            <div className="p-4 flex-1 overflow-y-auto no-scrollbar">
                              <div className="p-6 rounded-[24px] shadow-sm mb-4" style={{backgroundColor: theme.cardColor}}>
                                <div className="h-4 w-2/3 bg-slate-100 rounded mb-2"></div>
                                <div className="h-2 w-full bg-slate-50 rounded"></div>
                              </div>
                              {[1,2,3].map(i => (
                                <div key={i} className="p-4 rounded-[20px] shadow-sm mb-3 border border-slate-100/10" style={{backgroundColor: theme.cardColor}}>
                                  <div className="h-3 w-3/4 bg-slate-100 rounded mb-6"></div>
                                  <div className="space-y-3">
                                    <div className="h-5 w-full bg-slate-50 rounded-lg"></div>
                                    <div className="h-5 w-full bg-slate-50 rounded-lg"></div>
                                  </div>
                                </div>
                              ))}
                              <div className="mt-4 p-3 rounded-xl text-white text-center font-bold text-xs" style={{backgroundColor: theme.buttonColor}}>ENVIAR RESPOSTAS</div>
                            </div>
                          </div>
                        </div>
                        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview Instantâneo (Mobile)</p>
                      </div>

                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

