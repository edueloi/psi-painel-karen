
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MOCK_RECORDS, MOCK_PATIENTS } from '../constants';
import { ClinicalRecord, Patient } from '../types';
import { 
  FileText, Search, Plus, User, Clock, Calendar, Hash, Tag, Filter, 
  CheckCircle, Edit3, MoreHorizontal, ChevronRight, Stethoscope, 
  Paperclip, Printer, Share2, Lock, Unlock, Mic, Save, X, 
  LayoutTemplate, Bold, Italic, List, ArrowLeft, Brain, Activity,
  AlertCircle, History, ChevronDown, Trash2, MicOff, Lightbulb
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

// --- TEMPLATES PADRONIZADOS ---
const TEMPLATES = [
    { 
        id: 'soap', 
        label: 'Evolução SOAP', 
        desc: 'Padrão ouro para evolução clínica.',
        content: '**S (Subjetivo):**\nPaciente relata...\n\n**O (Objetivo):**\nObserva-se...\n\n**A (Avaliação):**\nImpressão diagnóstica...\n\n**P (Plano):**\nConduta...' 
    },
    { 
        id: 'dap', 
        label: 'Nota DAP', 
        desc: 'Focado em dados e avaliação.',
        content: '**D (Dados):**\n\n**A (Avaliação):**\n\n**P (Plano):**\n' 
    },
    { 
        id: 'anamnese', 
        label: 'Anamnese Adulto', 
        desc: 'Estrutura básica de entrevista.',
        content: '**Queixa Principal:**\n\n**Histórico da Moléstia Atual:**\n\n**Histórico Familiar:**\n\n**Histórico Social:**\n' 
    },
    { 
        id: 'basic', 
        label: 'Evolução Livre', 
        desc: 'Texto corrido simples.',
        content: 'Paciente compareceu à sessão pontualmente. Apresenta humor estável. Trabalhamos questões relacionadas a...' 
    },
];

export const Records: React.FC = () => {
  const { t } = useLanguage();
  
  // --- STATES ---
  // Navigation
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // Data
  const [searchTerm, setSearchTerm] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState('Todos');
  const [localRecords, setLocalRecords] = useState<ClinicalRecord[]>(MOCK_RECORDS);

  // Editor Logic
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<'new' | 'edit' | 'view'>('new');
  const [currentRecord, setCurrentRecord] = useState<Partial<ClinicalRecord> & { attachments?: string[] }>({});
  const [editorContent, setEditorContent] = useState('');
  const [editorTab, setEditorTab] = useState<'write' | 'history'>('write'); 
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastSessionInfo, setLastSessionInfo] = useState<string | null>(null);

  // Refs for Text Manipulation
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dictationIntervalRef = useRef<number | null>(null);

  // --- DERIVED DATA ---
  const selectedPatient = useMemo(() => 
    MOCK_PATIENTS.find(p => p.id === selectedPatientId), 
  [selectedPatientId]);

  const filteredPatients = useMemo(() => 
    MOCK_PATIENTS.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
  [searchTerm]);

  const patientRecords = useMemo(() => 
    localRecords
        .filter(r => r.patientId === selectedPatientId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [localRecords, selectedPatientId]);

  const filteredRecords = useMemo(() => {
      if (recordTypeFilter === 'Todos') return patientRecords;
      return patientRecords.filter(r => r.type === recordTypeFilter);
  }, [patientRecords, recordTypeFilter]);

  // --- HANDLERS ---
  
  const handlePatientSelect = (id: string) => {
      setSelectedPatientId(id);
      setIsMobileListVisible(false);
  };

  const handleBackToList = () => {
      setIsMobileListVisible(true);
      setSelectedPatientId(null);
  };

  // Logica de Continuidade: Busca o último registro para dar contexto
  const handleNewRecord = () => {
      if (!selectedPatient) return;
      
      // Encontrar última sessão para o "Recap"
      const lastRec = patientRecords.find(r => r.type === 'Evolução' || r.type === 'Anamnese');
      if (lastRec) {
          // Tenta extrair o "Plano" ou pega os últimos 100 chars
          const preview = lastRec.preview.length > 150 ? lastRec.preview.substring(0, 150) + '...' : lastRec.preview;
          setLastSessionInfo(`Em ${new Date(lastRec.date).toLocaleDateString()}: "${preview}"`);
      } else {
          setLastSessionInfo(null);
      }

      setEditorMode('new');
      setEditorTab('write');
      setCurrentRecord({
          patientId: selectedPatient.id,
          patientName: selectedPatient.name,
          date: new Date().toISOString(), // Agora
          type: 'Evolução',
          status: 'Rascunho',
          title: `Sessão - ${new Date().toLocaleDateString()}`,
          tags: [],
          attachments: []
      });
      setEditorContent('');
      setIsEditorOpen(true);
  };

  const handleOpenRecord = (record: ClinicalRecord) => {
      setCurrentRecord({ ...record, attachments: [] }); // attachments mock
      setEditorContent(record.preview || '');
      setEditorTab('write');
      setLastSessionInfo(null);
      
      if (record.status === 'Finalizado') {
          setEditorMode('view');
      } else {
          setEditorMode('edit');
      }
      setIsEditorOpen(true);
  };

  const handleSaveRecord = () => {
      if (!currentRecord.title || !selectedPatient) return;

      setIsSaving(true);

      setTimeout(() => {
          const recordToSave = {
              ...currentRecord,
              id: currentRecord.id || Math.random().toString(36).substr(2, 9),
              preview: editorContent, 
              date: currentRecord.date || new Date().toISOString(),
              patientId: selectedPatient.id,
              patientName: selectedPatient.name,
          } as ClinicalRecord;

          if (editorMode === 'new') {
              setLocalRecords(prev => [recordToSave, ...prev]);
          } else {
              setLocalRecords(prev => prev.map(r => r.id === recordToSave.id ? recordToSave : r));
          }
          
          setIsSaving(false);
          setIsEditorOpen(false);
          setLastSessionInfo(null);
      }, 600);
  };

  const handleDeleteRecord = () => {
      if (confirm('Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.')) {
          setLocalRecords(prev => prev.filter(r => r.id !== currentRecord.id));
          setIsEditorOpen(false);
      }
  };

  // --- TEXT MANIPULATION ---

  const insertAtCursor = (textToInsert: string) => {
      if (!textareaRef.current || editorMode === 'view') return;
      
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editorContent;
      
      const newText = text.substring(0, start) + textToInsert + text.substring(end);
      setEditorContent(newText);
      
      // Restaurar foco e posição
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      }, 0);
  };

  const wrapSelection = (wrapper: string) => {
      if (!textareaRef.current || editorMode === 'view') return;
      
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = editorContent;
      
      if (start === end) {
          // Nada selecionado, insere o wrapper vazio ou placeholder
          insertAtCursor(wrapper + wrapper);
          return;
      }

      const selectedText = text.substring(start, end);
      const newText = text.substring(0, start) + wrapper + selectedText + wrapper + text.substring(end);
      setEditorContent(newText);
  };

  // --- DICTATION SIMULATION ---
  const toggleDictation = () => {
      if (isRecording) {
          setIsRecording(false);
          if (dictationIntervalRef.current) clearInterval(dictationIntervalRef.current);
      } else {
          setIsRecording(true);
          // Simula texto chegando
          const phrases = [
              " O paciente relata melhora no sono.", 
              " Demonstra ansiedade ao falar sobre o trabalho.", 
              " Discutimos estratégias de enfrentamento.", 
              " Sugeri exercícios de respiração."
          ];
          let i = 0;
          dictationIntervalRef.current = window.setInterval(() => {
              if (i < phrases.length) {
                  setEditorContent(prev => prev + phrases[i]);
                  i++;
              } else {
                  setIsRecording(false);
                  if (dictationIntervalRef.current) clearInterval(dictationIntervalRef.current);
              }
          }, 1500);
      }
  };

  // --- ATTACHMENTS ---
  const handleAddAttachment = () => {
      const fileName = `Documento_Anexo_${Math.floor(Math.random() * 100)}.pdf`;
      setCurrentRecord(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), fileName]
      }));
  };

  const handlePrint = () => {
      window.print();
  };

  // --- UI HELPERS ---
  const getRecordIcon = (type: string) => {
      switch(type) {
          case 'Anamnese': return <FileText size={18} className="text-blue-600" />;
          case 'Avaliação': return <Brain size={18} className="text-purple-600" />;
          case 'Encaminhamento': return <Share2 size={18} className="text-orange-600" />;
          default: return <Stethoscope size={18} className="text-emerald-600" />;
      }
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row bg-white rounded-[24px] border border-slate-200 shadow-xl overflow-hidden font-sans animate-[fadeIn_0.4s_ease-out]">
      
      {/* --- SIDEBAR: PATIENT LIST --- */}
      <div className={`
          w-full md:w-80 lg:w-96 bg-slate-50 border-r border-slate-200 flex flex-col transition-all
          ${isMobileListVisible ? 'flex' : 'hidden md:flex'}
      `}>
          {/* Header List */}
          <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
              <h2 className="text-lg font-display font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <User size={20} className="text-indigo-600" /> Prontuários
              </h2>
              <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                  <input 
                      type="text" 
                      placeholder="Buscar paciente..." 
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-transparent rounded-xl text-sm focus:bg-white focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* Patient List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {filteredPatients.map(patient => (
                  <button
                      key={patient.id}
                      onClick={() => handlePatientSelect(patient.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left group ${selectedPatientId === patient.id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white hover:shadow-sm text-slate-600'}`}
                  >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border-2 transition-colors ${selectedPatientId === patient.id ? 'bg-white/20 border-white/20 text-white' : 'bg-slate-200 border-white text-slate-500'}`}>
                          {patient.photoUrl ? <img src={patient.photoUrl} className="w-full h-full rounded-full object-cover" /> : patient.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${selectedPatientId === patient.id ? 'text-white' : 'text-slate-800'}`}>{patient.name}</p>
                          <p className={`text-xs truncate ${selectedPatientId === patient.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                              Última: {patientRecords[0] ? new Date(patientRecords[0].date).toLocaleDateString() : 'Nunca'}
                          </p>
                      </div>
                      <ChevronRight size={16} className={`opacity-0 group-hover:opacity-100 transition-opacity ${selectedPatientId === patient.id ? 'text-white opacity-100' : 'text-slate-400'}`} />
                  </button>
              ))}
          </div>
      </div>

      {/* --- MAIN CONTENT: RECORDS TIMELINE --- */}
      <div className={`
          flex-1 flex flex-col bg-slate-50/30 relative
          ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}
      `}>
          
          {selectedPatient ? (
              <>
                  {/* Patient Header (Sticky) */}
                  <div className="bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <button onClick={handleBackToList} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                                  <ArrowLeft size={20} />
                              </button>
                              <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-lg font-bold text-slate-600 border-2 border-white shadow-sm">
                                      {selectedPatient.name.charAt(0)}
                                  </div>
                                  <div>
                                      <h2 className="text-xl font-display font-bold text-slate-800 leading-none">{selectedPatient.name}</h2>
                                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                          <span className="flex items-center gap-1"><Clock size={12}/> 32 anos</span>
                                          <span className="text-slate-300">•</span>
                                          <span className="flex items-center gap-1">{selectedPatient.active ? <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> : <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>} {selectedPatient.active ? 'Ativo' : 'Inativo'}</span>
                                      </div>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="flex gap-2">
                              <button className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-colors" title="Exportar Prontuário">
                                  <Printer size={18} />
                              </button>
                              <button 
                                  onClick={handleNewRecord}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
                              >
                                  <Plus size={18} /> <span className="hidden sm:inline">Novo Registro</span>
                              </button>
                          </div>
                      </div>

                      {/* Filters */}
                      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                          {['Todos', 'Evolução', 'Anamnese', 'Avaliação', 'Documentos'].map(type => (
                              <button 
                                  key={type}
                                  onClick={() => setRecordTypeFilter(type)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${recordTypeFilter === type ? 'bg-slate-800 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                              >
                                  {type}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Timeline Feed */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                      <div className="relative space-y-8 pl-4 md:pl-8 before:absolute before:left-[19px] md:before:left-[35px] before:top-0 before:h-full before:w-0.5 before:bg-slate-200/80">
                          
                          {filteredRecords.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                      <FileText size={32} className="opacity-30" />
                                  </div>
                                  <p className="font-medium">Nenhum registro encontrado.</p>
                                  <button onClick={handleNewRecord} className="mt-2 text-sm text-indigo-600 font-bold hover:underline">Criar o primeiro registro</button>
                              </div>
                          )}

                          {filteredRecords.map((record, index) => (
                              <div key={record.id} className="relative group animate-[slideUpFade_0.3s_ease-out]" style={{ animationDelay: `${index * 0.05}s` }}>
                                  {/* Connector Dot */}
                                  <div className={`absolute -left-[27px] md:-left-[43px] top-6 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10 transition-colors ${record.status === 'Finalizado' ? 'bg-indigo-600' : 'bg-amber-400'}`}></div>
                                  
                                  {/* Date Badge */}
                                  <div className="absolute -left-[85px] md:-left-[120px] top-6 text-right w-12 md:w-16 hidden sm:block">
                                      <div className="text-xs font-bold text-slate-800">{new Date(record.date).toLocaleDateString(undefined, {day: '2-digit', month: 'short'})}</div>
                                      <div className="text-[10px] text-slate-400">{new Date(record.date).getFullYear()}</div>
                                  </div>

                                  {/* Card */}
                                  <div 
                                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group/card ${record.status === 'Finalizado' ? 'border-slate-200 hover:border-indigo-200' : 'border-amber-200 bg-amber-50/30'}`} 
                                    onClick={() => handleOpenRecord(record)}
                                  >
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100 group-hover/card:bg-white transition-colors">
                                                  {getRecordIcon(record.type)}
                                              </div>
                                              <div>
                                                  <h3 className="font-bold text-slate-800 text-base">{record.title}</h3>
                                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                                      <span className="sm:hidden">{new Date(record.date).toLocaleDateString()} • </span>
                                                      <span>{new Date(record.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                      <span>•</span>
                                                      {record.status === 'Finalizado' ? (
                                                          <span className="flex items-center gap-1 text-emerald-600 font-bold"><Lock size={10} /> Finalizado</span>
                                                      ) : (
                                                          <span className="flex items-center gap-1 text-amber-600 font-bold"><Edit3 size={10} /> Rascunho</span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex gap-2 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                              <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600"><Printer size={16} /></button>
                                          </div>
                                      </div>

                                      <div className="prose prose-sm max-w-none text-slate-600 mb-4 line-clamp-3">
                                          {record.preview?.split('\n').map((line, i) => <p key={i} className="mb-1">{line}</p>)}
                                      </div>

                                      {record.tags.length > 0 && (
                                          <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                                              {record.tags.map(tag => (
                                                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 text-slate-500 text-[10px] font-bold border border-slate-100">
                                                      <Hash size={10} /> {tag}
                                                  </span>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </>
          ) : (
              // Empty State
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30 p-8 text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 animate-pulse">
                      <Search size={40} className="opacity-30" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-700 mb-2">Selecione um Paciente</h2>
                  <p className="max-w-sm">Navegue pela lista ao lado para visualizar o histórico clínico ou iniciar um novo atendimento.</p>
              </div>
          )}
      </div>

      {/* --- EDITOR MODAL (Overlay Full Screen) --- */}
      {isEditorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full h-full md:h-[95vh] md:w-[95vw] md:max-w-7xl md:rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-[slideUpFade_0.3s_ease-out]">
                  
                  {/* Editor Header */}
                  <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-4">
                          <button onClick={() => setIsEditorOpen(false)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                              <X size={24} />
                          </button>
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  {editorMode === 'view' ? (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                          <Lock size={10} /> Registro Finalizado
                                      </span>
                                  ) : (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                                          <Edit3 size={10} /> Rascunho - Editando
                                      </span>
                                  )}
                                  <span className="text-xs text-slate-400 font-mono">#{currentRecord.id || 'NOVO'}</span>
                              </div>
                              <input 
                                  type="text" 
                                  value={currentRecord.title} 
                                  disabled={editorMode === 'view'}
                                  onChange={(e) => setCurrentRecord({...currentRecord, title: e.target.value})}
                                  className="text-xl md:text-2xl font-display font-bold text-slate-800 outline-none placeholder:text-slate-300 w-full bg-transparent disabled:opacity-80"
                                  placeholder="Título da Sessão"
                              />
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                          {isSaving && <span className="text-xs text-slate-400 flex items-center gap-1 animate-pulse"><Activity size={12} /> Salvando...</span>}
                          
                          {editorMode !== 'view' && (
                              <>
                                  {currentRecord.id && (
                                      <button 
                                        onClick={handleDeleteRecord}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Excluir Rascunho"
                                      >
                                          <Trash2 size={20} />
                                      </button>
                                  )}
                                  <button 
                                      onClick={handleSaveRecord}
                                      disabled={isSaving}
                                      className="px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:transform-none"
                                  >
                                      <Save size={18} /> Salvar
                                  </button>
                              </>
                          )}
                          {editorMode === 'view' && (
                              <button 
                                onClick={handlePrint}
                                className="px-6 py-2.5 rounded-xl font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
                              >
                                  <Printer size={18} /> Imprimir
                              </button>
                          )}
                      </div>
                  </div>

                  {/* Main Editor Layout */}
                  <div className="flex-1 flex overflow-hidden">
                      
                      {/* Left: Text Area */}
                      <div className="flex-1 flex flex-col relative bg-slate-50/30">
                          {/* Formatting Toolbar */}
                          {editorMode !== 'view' && (
                              <div className="px-6 py-2 border-b border-slate-100 flex items-center gap-1 bg-white shadow-sm z-10">
                                  <button onClick={() => wrapSelection('**')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Negrito"><Bold size={16}/></button>
                                  <button onClick={() => wrapSelection('_')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Itálico"><Italic size={16}/></button>
                                  <div className="w-px h-4 bg-slate-200 mx-2"></div>
                                  <button onClick={() => insertAtCursor('- ')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500" title="Lista"><List size={16}/></button>
                                  <div className="flex-1"></div>
                                  <button 
                                    onClick={toggleDictation}
                                    className={`p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${isRecording ? 'bg-red-50 text-red-500 animate-pulse' : 'hover:bg-indigo-50 text-indigo-600'}`} 
                                    title="Ditado de Voz"
                                  >
                                      {isRecording ? <MicOff size={16} /> : <Mic size={16} />} 
                                      <span className="hidden sm:inline">{isRecording ? 'Gravando...' : 'Ditar'}</span>
                                  </button>
                              </div>
                          )}

                          {/* Last Session Recap Alert */}
                          {lastSessionInfo && editorMode === 'new' && (
                              <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3 relative animate-[slideUpFade_0.3s_ease-out]">
                                  <Lightbulb size={16} className="mt-0.5 shrink-0" />
                                  <div className="flex-1">
                                      <strong>Continuidade do Cuidado:</strong>
                                      <p className="opacity-90 italic mt-1">{lastSessionInfo}</p>
                                  </div>
                                  <button onClick={() => setLastSessionInfo(null)} className="hover:bg-amber-100 p-1 rounded"><X size={14}/></button>
                              </div>
                          )}

                          <textarea 
                              ref={textareaRef}
                              value={editorContent}
                              disabled={editorMode === 'view'}
                              onChange={(e) => setEditorContent(e.target.value)}
                              className="flex-1 w-full p-6 md:p-10 resize-none outline-none text-slate-700 text-lg leading-relaxed font-medium bg-transparent disabled:bg-slate-50 disabled:text-slate-600"
                              placeholder="Comece a escrever aqui..."
                          />
                      </div>

                      {/* Right: Sidebar Tools */}
                      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-10">
                          
                          {/* Tabs */}
                          <div className="flex border-b border-slate-100">
                              <button 
                                onClick={() => setEditorTab('write')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${editorTab === 'write' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                  Detalhes
                              </button>
                              <button 
                                onClick={() => setEditorTab('history')}
                                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${editorTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                              >
                                  Histórico
                              </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                              
                              {/* TAB: WRITE/DETAILS */}
                              {editorTab === 'write' && (
                                  <div className="space-y-8 animate-fadeIn">
                                      {/* Metadata */}
                                      <div className="space-y-4">
                                          <div>
                                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Data e Hora</label>
                                              <input 
                                                  type="datetime-local" 
                                                  disabled={editorMode === 'view'}
                                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium outline-none focus:border-indigo-300 disabled:opacity-70"
                                                  value={currentRecord.date ? new Date(currentRecord.date).toISOString().slice(0, 16) : ''}
                                                  onChange={(e) => setCurrentRecord({...currentRecord, date: e.target.value})}
                                              />
                                          </div>
                                          <div>
                                              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tipo</label>
                                              <div className="relative">
                                                  <select 
                                                      disabled={editorMode === 'view'}
                                                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium outline-none focus:border-indigo-300 appearance-none disabled:opacity-70"
                                                      value={currentRecord.type}
                                                      onChange={(e) => setCurrentRecord({...currentRecord, type: e.target.value as any})}
                                                  >
                                                      <option>Evolução</option>
                                                      <option>Anamnese</option>
                                                      <option>Avaliação</option>
                                                      <option>Encaminhamento</option>
                                                  </select>
                                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                              </div>
                                          </div>
                                      </div>

                                      {/* Templates (Only in Edit Mode) */}
                                      {editorMode !== 'view' && (
                                          <div>
                                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                  <LayoutTemplate size={14} /> Templates Rápidos
                                              </h4>
                                              <div className="space-y-2">
                                                  {TEMPLATES.map(tpl => (
                                                      <button 
                                                          key={tpl.id}
                                                          onClick={() => insertAtCursor(tpl.content)}
                                                          className="w-full text-left p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-300 hover:shadow-sm transition-all group"
                                                      >
                                                          <div className="flex justify-between items-center mb-1">
                                                              <span className="text-sm font-bold text-slate-700">{tpl.label}</span>
                                                              <Plus size={14} className="opacity-0 group-hover:opacity-100 text-indigo-600 transition-opacity" />
                                                          </div>
                                                          <p className="text-[10px] text-slate-400 leading-tight">{tpl.desc}</p>
                                                      </button>
                                                  ))}
                                              </div>
                                          </div>
                                      )}

                                      {/* Tags */}
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tags</label>
                                          <div className="flex flex-wrap gap-2 mb-2">
                                              {currentRecord.tags?.map(t => (
                                                  <span key={t} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-bold flex items-center gap-1">
                                                      {t} 
                                                      {editorMode !== 'view' && (
                                                          <button onClick={() => setCurrentRecord({...currentRecord, tags: currentRecord.tags?.filter(tag => tag !== t)})}>
                                                              <X size={10}/>
                                                          </button>
                                                      )}
                                                  </span>
                                              ))}
                                          </div>
                                          {editorMode !== 'view' && (
                                              <input 
                                                  type="text" 
                                                  placeholder="+ Adicionar tag"
                                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-300"
                                                  onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                          const val = e.currentTarget.value.trim();
                                                          if (val && !currentRecord.tags?.includes(val)) {
                                                              setCurrentRecord({...currentRecord, tags: [...(currentRecord.tags || []), val]});
                                                              e.currentTarget.value = '';
                                                          }
                                                      }
                                                  }}
                                              />
                                          )}
                                      </div>

                                      {/* Attachments */}
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Anexos</label>
                                          <div className="space-y-2 mb-2">
                                              {currentRecord.attachments?.map((att, idx) => (
                                                  <div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                                      <Paperclip size={12} className="text-slate-400" />
                                                      <span className="flex-1 truncate">{att}</span>
                                                      {editorMode !== 'view' && (
                                                          <button onClick={() => setCurrentRecord(prev => ({...prev, attachments: prev.attachments?.filter((_, i) => i !== idx)}))} className="text-red-400 hover:text-red-600"><X size={12} /></button>
                                                      )}
                                                  </div>
                                              ))}
                                          </div>
                                          {editorMode !== 'view' && (
                                              <div 
                                                onClick={handleAddAttachment}
                                                className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 hover:border-indigo-300 transition-colors"
                                              >
                                                  <Paperclip size={20} className="mx-auto text-slate-300 mb-2" />
                                                  <p className="text-xs text-slate-400">Clique para anexar arquivo</p>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              )}

                              {/* TAB: HISTORY (Side-by-side view) */}
                              {editorTab === 'history' && (
                                  <div className="space-y-4 animate-fadeIn">
                                      <p className="text-xs text-slate-400 mb-2">Consulte registros anteriores sem sair da tela.</p>
                                      {patientRecords.filter(r => r.id !== currentRecord.id).map(r => (
                                          <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm hover:border-indigo-200 transition-colors">
                                              <div className="flex justify-between items-center mb-1">
                                                  <span className="font-bold text-slate-700">{new Date(r.date).toLocaleDateString()}</span>
                                                  <span className="text-[10px] uppercase bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-500">{r.type}</span>
                                              </div>
                                              <p className="text-slate-500 line-clamp-3 text-xs leading-relaxed">{r.preview}</p>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>

                          {/* Footer Actions / Security */}
                          <div className="p-5 bg-slate-50 border-t border-slate-200">
                              {editorMode !== 'view' ? (
                                  <>
                                      <label className="flex items-start gap-3 cursor-pointer select-none group">
                                          <div className="relative flex items-center mt-0.5">
                                              <input 
                                                  type="checkbox" 
                                                  className="peer sr-only"
                                                  checked={currentRecord.status === 'Finalizado'}
                                                  onChange={(e) => setCurrentRecord({...currentRecord, status: e.target.checked ? 'Finalizado' : 'Rascunho'})}
                                              />
                                              <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all"></div>
                                              <CheckCircle size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                          </div>
                                          <div className="flex-1">
                                              <span className="block text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Finalizar e Assinar</span>
                                              <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
                                                  Bloqueia edições futuras. Gera hash de segurança.
                                              </span>
                                          </div>
                                      </label>
                                  </>
                              ) : (
                                  <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                                      <Lock size={16} />
                                      <div>
                                          <p className="text-xs font-bold uppercase">Registro Protegido</p>
                                          <p className="text-[10px] opacity-80">Assinado em {new Date(currentRecord.date || '').toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
