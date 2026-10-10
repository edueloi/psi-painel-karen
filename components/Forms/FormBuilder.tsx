
import React, { useState } from 'react';
import { api } from '../../services/api';
import { FormQuestion, QuestionType, FormOption, InterpretationRule, FormTheme } from '../../types';
import {
  Plus, Trash2, GripVertical, Type, AlignLeft, Hash, List, CheckSquare, ChevronDown, Save, Wand2, ArrowLeft, Calculator, Target, Palette, Settings, Copy, MoveVertical, AlertCircle, Sparkles
} from 'lucide-react';
import {
  Button, IconButton, Input, Textarea, Combobox, Switch, Tabs, SectionTitle, PanelCard, ContentCard, FormRow, EmptyState,
} from '../UI';

const builderTabs = [
  { id: 'editor', label: 'Perguntas', icon: Settings },
  { id: 'logic', label: 'Cálculo', icon: Calculator },
  { id: 'settings', label: 'Identidade', icon: Palette },
] as const;
type BuilderTabId = typeof builderTabs[number]['id'];

interface FormBuilderProps {
  initialData?: { title: string; description: string; category?: string; questions: FormQuestion[]; interpretations?: InterpretationRule[]; theme?: FormTheme };
  onSave: (data: { title: string; description: string; category?: string; questions: FormQuestion[]; interpretations?: InterpretationRule[]; theme?: FormTheme }) => void | Promise<void>;
  onCancel: () => void;
}

const QUESTION_TYPES: { type: QuestionType; label: string; Icon: React.ElementType; color: string }[] = [
  { type: 'text', label: 'Texto Curto', Icon: Type, color: 'bg-blue-50 text-blue-600' },
  { type: 'textarea', label: 'Texto Longo', Icon: AlignLeft, color: 'bg-indigo-50 text-indigo-600' },
  { type: 'number', label: 'Número', Icon: Hash, color: 'bg-emerald-50 text-emerald-600' },
  { type: 'radio', label: 'Múltipla Escolha', Icon: List, color: 'bg-amber-50 text-amber-600' },
  { type: 'checkbox', label: 'Caixas de Seleção', Icon: CheckSquare, color: 'bg-rose-50 text-rose-600' },
  { type: 'select', label: 'Lista Suspensa', Icon: ChevronDown, color: 'bg-violet-50 text-violet-600' },
];

export const FormBuilder: React.FC<FormBuilderProps> = ({ initialData, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<BuilderTabId>('editor');
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [questions, setQuestions] = useState<FormQuestion[]>(initialData?.questions || []);
  const [interpretations, setInterpretations] = useState<InterpretationRule[]>(initialData?.interpretations || []);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = React.useRef(false);

  React.useEffect(() => {
    api.get<any[]>('/forms/categories').then(data => {
      setCategories(data || []);
    }).catch(() => {});
  }, []);

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

  const handleSave = async () => {
    if (savingRef.current) return;
    if (!title.trim()) {
      setTitleError('Titulo obrigatorio para salvar.');
      setActiveTab('editor');
      return;
    }
    setTitleError('');
    savingRef.current = true;
    setIsSaving(true);
    try {
      await onSave({ title, description, category, questions, interpretations, theme });
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
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
    
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById(`q-${newId}`)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
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
    <div className="space-y-4">
      <SectionTitle
        icon={Settings}
        title={title || 'Novo Formulário'}
        description="Editor dinâmico de formulários e testes clínicos"
        action={
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={onCancel}>
            Voltar
          </Button>
        }
      />

      <Tabs<BuilderTabId>
        items={builderTabs}
        value={activeTab}
        onChange={setActiveTab}
        label="Seções do editor de formulário"
      >
        {/* --- ABA: PERGUNTAS --- */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 items-start">
            {/* Estrutura (visível em telas largas) */}
            <PanelCard
              title="Estrutura"
              description={`${questions.length} questões ativas`}
              className="hidden lg:block lg:sticky lg:top-4"
            >
              <div className="space-y-2">
                <Button variant="primary" size="sm" fullWidth iconLeft={<Plus size={14} />} onClick={addQuestion}>
                  Nova pergunta
                </Button>
                <div className="max-h-[60vh] overflow-y-auto space-y-1">
                  {questions.length === 0 ? (
                    <p className="py-4 text-center text-[11px] text-slate-500">Nenhum campo adicionado ainda</p>
                  ) : (
                    questions.map((q, idx) => {
                      const typeInfo = QUESTION_TYPES.find(t => t.type === q.type);
                      return (
                        <button
                          type="button"
                          key={q.id}
                          onClick={() => {
                            setActiveQuestionId(q.id);
                            document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors border ${
                            activeQuestionId === q.id
                              ? 'bg-primary-50 border-primary-200 text-primary-800'
                              : 'border-transparent text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-medium shrink-0 ${
                            activeQuestionId === q.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{q.text || 'Sem título...'}</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              {typeInfo && <typeInfo.Icon size={11} />}
                              {typeInfo?.label}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </PanelCard>

            <div className="space-y-3 min-w-0">
              <ContentCard>
                <div className="space-y-3">
                  <FormRow cols={2}>
                    <Input
                      label="Título do formulário"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (titleError) setTitleError('');
                      }}
                      placeholder="Título do Formulário"
                      error={titleError || undefined}
                    />
                    <div>
                      <label className="ds-label mb-1 block">Área / categoria</label>
                      <Combobox
                        label=""
                        placeholder="Selecione ou digite..."
                        value={category}
                        onChange={(val) => setCategory(val)}
                        options={[
                          { id: 'TCC', label: 'TCC' },
                          { id: 'Neuropsicologia', label: 'Neuropsicologia' },
                          { id: 'Psicopedagogia', label: 'Psicopedagogia' },
                          { id: 'Psicanálise', label: 'Psicanálise' },
                          { id: 'Anamnese', label: 'Anamnese' },
                          { id: 'Eventos', label: 'Eventos' },
                          { id: 'Humanista', label: 'Humanista' },
                          ...categories.map(c => ({ id: c.name, label: c.name }))
                        ]}
                        size="sm"
                      />
                    </div>
                  </FormRow>
                  <Textarea
                    label="Descrição"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o objetivo deste formulário para quem irá responder..."
                    rows={2}
                  />
                </div>
              </ContentCard>

              {questions.map((q, index) => {
                const typeInfo = QUESTION_TYPES.find(t => t.type === q.type);
                const isActive = activeQuestionId === q.id;

                return (
                  <ContentCard
                    key={q.id}
                    id={`q-${q.id}`}
                    onClick={() => setActiveQuestionId(q.id)}
                    className={`transition-colors ${isActive ? 'border-primary-300 ring-1 ring-primary-200' : 'hover:border-slate-300'}`}
                  >
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-3">
                        <div className="flex items-end gap-2 min-w-0">
                          <span className="mb-1.5 w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[11px] font-medium shrink-0">{index + 1}</span>
                          <Input
                            label="Enunciado da pergunta"
                            value={q.text}
                            onChange={(e) => updateQuestion(q.id, 'text', e.target.value)}
                            placeholder="Ex: Como você se sentiu hoje?"
                            wrapperClassName="flex-1 min-w-0"
                          />
                        </div>
                        <div>
                          <label className="ds-label mb-1 block">Tipo de resposta</label>
                          <Combobox
                            label=""
                            placeholder="Selecione o tipo..."
                            options={QUESTION_TYPES.map(t => ({ id: t.type, label: t.label }))}
                            value={q.type}
                            onChange={(val) => updateQuestion(q.id, 'type', val as QuestionType)}
                            icon={typeInfo ? <typeInfo.Icon size={14} /> : <Plus size={14} />}
                            size="sm"
                          />
                        </div>
                      </div>

                      {['radio', 'checkbox', 'select'].includes(q.type) && (
                        <div className="p-3 rounded-lg bg-slate-50/60 border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-600">Opções de resposta</span>
                            <span className="text-[11px] text-slate-500 pr-10">Valor / peso</span>
                          </div>
                          {q.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <div className={`w-4 h-4 border-2 border-slate-300 shrink-0 ${q.type === 'radio' ? 'rounded-full' : 'rounded-md'}`} />
                              <Input
                                aria-label={`Opção ${optIdx + 1}`}
                                value={opt.label}
                                onChange={(e) => updateOption(q.id, optIdx, 'label', e.target.value)}
                                placeholder={`Opção ${optIdx + 1}`}
                                wrapperClassName="flex-1 min-w-0"
                              />
                              <Input
                                aria-label={`Peso da opção ${optIdx + 1}`}
                                type="number"
                                value={opt.value}
                                onChange={(e) => updateOption(q.id, optIdx, 'value', parseInt(e.target.value) || 0)}
                                className="text-center"
                                wrapperClassName="w-20 shrink-0"
                              />
                              <IconButton
                                variant="ghost"
                                size="sm"
                                aria-label={`Remover opção ${optIdx + 1}`}
                                title="Remover opção"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => removeOption(q.id, optIdx)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" fullWidth iconLeft={<Plus size={14} />} onClick={() => addOption(q.id)}>
                            Adicionar nova opção
                          </Button>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                        <Switch
                          checked={q.required}
                          onCheckedChange={(checked) => updateQuestion(q.id, 'required', checked)}
                          label="Obrigatória"
                        />
                        <Button
                          variant="ghost"
                          size="xs"
                          iconLeft={<Trash2 size={14} />}
                          className="text-red-500 hover:text-red-600"
                          onClick={(e) => removeQuestion(q.id, e)}
                        >
                          Excluir campo
                        </Button>
                      </div>
                    </div>
                  </ContentCard>
                );
              })}

              <button
                type="button"
                onClick={addQuestion}
                className="w-full flex flex-col items-center justify-center gap-1 p-6 rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50/40 transition-colors"
              >
                <Plus size={18} />
                <span className="text-sm font-medium">Qual a próxima pergunta?</span>
                <span className="text-[11px]">Clique para inserir um novo campo de resposta</span>
              </button>
            </div>
          </div>
        )}

        {/* --- ABA: CÁLCULO --- */}
        {activeTab === 'logic' && (
          <div className="space-y-3">
            <PanelCard title="Motor de pontuação" icon={Calculator} description="Configuramos a soma automática para que você possa criar avaliações clínicas precisas em segundos.">
              <div className="inline-flex items-baseline gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2">
                <span className="text-[11px] text-slate-500">Teto de pontos</span>
                <span className="text-base font-medium text-primary-700">{calculateMaxScore()}</span>
              </div>
            </PanelCard>

            <PanelCard
              title="Interpretador dinâmico"
              icon={Target}
              description="Defina o que cada faixa de pontuação significa"
              action={
                <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={addInterpretation}>
                  Adicionar filtro
                </Button>
              }
            >
              {interpretations.length === 0 ? (
                <EmptyState
                  icon={AlertCircle}
                  title="Nenhuma regra de cálculo"
                  description="O formulário apenas salvará as respostas sem interpretá-las. Adicione uma regra para automatizar sua análise."
                  action={<Button variant="outline" size="sm" onClick={addInterpretation}>Criar primeira regra agora</Button>}
                />
              ) : (
                <div className="space-y-3">
                  {interpretations.map((rule, idx) => (
                    <div key={rule.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-medium text-slate-600">{idx + 1}</div>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label={`Excluir regra ${idx + 1}`}
                            title="Excluir regra"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => deleteInterpretation(rule.id)}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </div>

                        <div className="flex-1 min-w-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
                          <div className="lg:col-span-4 space-y-3">
                            <div className="flex items-end gap-2">
                              <Input
                                label="Mínimo"
                                type="number"
                                value={rule.minScore}
                                onChange={e => updateInterpretation(rule.id, 'minScore', parseInt(e.target.value))}
                                className="text-center"
                                wrapperClassName="flex-1"
                              />
                              <span className="pb-2 text-xs text-slate-500">até</span>
                              <Input
                                label="Máximo"
                                type="number"
                                value={rule.maxScore}
                                onChange={e => updateInterpretation(rule.id, 'maxScore', parseInt(e.target.value))}
                                className="text-center"
                                wrapperClassName="flex-1"
                              />
                            </div>
                            <div>
                              <label className="ds-label mb-1 block">Estilo do resultado</label>
                              <Combobox
                                label=""
                                placeholder="Selecione o estilo..."
                                value={rule.color}
                                onChange={val => updateInterpretation(rule.id, 'color', val)}
                                options={[
                                  { id: 'bg-slate-100 text-slate-800', label: 'Neutral (Cinza)' },
                                  { id: 'bg-emerald-100 text-emerald-800', label: 'Excellent (Verde)' },
                                  { id: 'bg-blue-100 text-blue-800', label: 'Standard (Azul)' },
                                  { id: 'bg-amber-100 text-amber-800', label: 'Attention (Amarelo)' },
                                  { id: 'bg-red-100 text-red-800', label: 'Critical (Vermelho)' }
                                ]}
                                size="sm"
                              />
                            </div>
                          </div>

                          <div className="lg:col-span-8 space-y-3">
                            <Input
                              label="Nomenclatura do resultado"
                              placeholder="Ex: Nível de Ansiedade Elevado"
                              value={rule.resultTitle}
                              onChange={e => updateInterpretation(rule.id, 'resultTitle', e.target.value)}
                            />
                            <Textarea
                              label="Instruções / relatório gerado"
                              rows={3}
                              placeholder="Escreva a análise clínica que será exibida quando esta pontuação for atingida..."
                              value={rule.description}
                              onChange={e => updateInterpretation(rule.id, 'description', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
        )}

        {/* --- ABA: IDENTIDADE --- */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
            <PanelCard
              title="Identidade visual"
              icon={Palette}
              description="Configure a identidade visual do formulário público."
              className="lg:col-span-7"
            >
              <div className="space-y-4">
                <div>
                  <p className="ds-label mb-2">Curadoria de paletas</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {paletteOptions.map((palette) => (
                      <button
                        type="button"
                        key={palette.label}
                        onClick={() => setSelectedPalette(palette.label)}
                        className={`p-2 rounded-lg border transition-colors flex flex-col items-center gap-1.5 ${
                          selectedPalette === palette.label ? 'border-primary-500 bg-primary-50' : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <div className="grid grid-cols-2 w-full gap-0.5 rounded overflow-hidden">
                          {palette.colors.slice(0, 4).map((c, i) => <div key={i} className="h-3 w-full" style={{ backgroundColor: c }}></div>)}
                        </div>
                        <span className={`text-[11px] font-medium ${selectedPalette === palette.label ? 'text-primary-700' : 'text-slate-500'}`}>{palette.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  {[
                    { label: 'Cor primária / ação', field: 'primaryColor' },
                    { label: 'Cor de destaque', field: 'accentColor' },
                    { label: 'Plano de fundo', field: 'backgroundColor' },
                    { label: 'Interface de card', field: 'cardColor' }
                  ].map(colorField => (
                    <div key={colorField.field} className="space-y-1.5">
                      <span className="ds-label">{colorField.label}</span>
                      <div className="flex flex-wrap gap-2">
                        {currentPalette.map(color => (
                          <button
                            key={`${colorField.field}-${color}`}
                            type="button"
                            onClick={() => setTheme(prev => ({ ...prev, [colorField.field]: color }))}
                            aria-label={`${colorField.label}: ${color}`}
                            className={`h-7 w-7 rounded-md border border-white transition-transform hover:scale-110 ${theme[colorField.field as keyof FormTheme] === color ? 'ring-2 ring-primary-500 ring-offset-2' : 'ring-1 ring-slate-200'}`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Input
                  label="Imagem de capa (header)"
                  type="text"
                  value={theme.headerImageUrl || ''}
                  onChange={e => setTheme(prev => ({ ...prev, headerImageUrl: e.target.value }))}
                  placeholder="https://sua-imagem.com/banner.jpg"
                  leftIcon={<Plus size={14} />}
                  hint="Formatos suportados: JPG, PNG ou WebP. Proporção recomendada 16:9."
                />
              </div>
            </PanelCard>

            {/* Preview mobile */}
            <PanelCard title="Preview instantâneo (mobile)" className="lg:col-span-5">
              <div className="bg-slate-800 rounded-lg p-2 border-4 border-slate-700 h-[520px] w-full max-w-[300px] mx-auto overflow-hidden">
                <div className="w-full h-full rounded-md overflow-hidden flex flex-col" style={{ backgroundColor: theme.backgroundColor }}>
                  {theme.headerImageUrl ? (
                    <img src={theme.headerImageUrl} alt="Capa do formulário" className="h-24 w-full object-cover" />
                  ) : (
                    <div className="h-24 w-full" style={{ backgroundColor: theme.primaryColor }}></div>
                  )}
                  <div className="p-3 flex-1 overflow-y-auto no-scrollbar">
                    <div className="p-4 rounded-lg mb-3" style={{ backgroundColor: theme.cardColor }}>
                      <div className="h-4 w-2/3 bg-slate-100 rounded mb-2"></div>
                      <div className="h-2 w-full bg-slate-50 rounded"></div>
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-3 rounded-lg mb-2 border border-slate-100/10" style={{ backgroundColor: theme.cardColor }}>
                        <div className="h-3 w-3/4 bg-slate-100 rounded mb-4"></div>
                        <div className="space-y-2">
                          <div className="h-5 w-full bg-slate-50 rounded-lg"></div>
                          <div className="h-5 w-full bg-slate-50 rounded-lg"></div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 p-2 rounded-lg text-white text-center font-medium text-xs" style={{ backgroundColor: theme.buttonColor }}>Enviar respostas</div>
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        )}
      </Tabs>

      {/* Rodapé fixo */}
      <div className="sticky bottom-2 z-20 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Save size={14} />}
          onClick={handleSave}
          loading={isSaving}
          disabled={isSaving}
        >
          Salvar projeto
        </Button>
      </div>
    </div>
  );
};
