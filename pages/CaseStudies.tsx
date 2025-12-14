
import React, { useState, useRef, useEffect } from 'react';
import { 
  BookOpen, Plus, MoreHorizontal, Clock, Search, 
  Trash2, Edit3, X, History, ArrowLeft, Layout, 
  Calendar, MessageSquare, Paperclip, Filter, ChevronDown,
  Palette, Send, FileText, Image as ImageIcon, Download, Check, Copy
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { MOCK_PATIENTS } from '../constants';

// --- Types ---
interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'pdf' | 'doc';
  url: string;
  size: string;
}

interface CaseCard {
  id: string;
  patientId?: string;
  patientName: string;
  description: string;
  tags: string[];
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
}

interface CaseColumn {
  id: string;
  title: string;
  color: string;
  cards: CaseCard[];
}

interface CaseBoard {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  columns: CaseColumn[];
}

// --- Constants ---
const COLUMN_COLORS = [
  'bg-slate-400', 'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
  'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 
  'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-pink-500'
];

// --- Mock Data ---
const MOCK_BOARDS: CaseBoard[] = [
  {
    id: 'b1',
    title: 'Supervisão Clínica: Ansiedade',
    description: 'Acompanhamento de casos focados em TAG e Ansiedade Social.',
    createdAt: '2023-08-15',
    columns: [
      { id: 'c1', title: 'Triagem', color: 'bg-slate-400', cards: [
        { 
          id: 'cd1', 
          patientId: '1', 
          patientName: 'Carlos Oliveira', 
          description: 'Queixa de ansiedade social severa em ambiente de trabalho. Relata dificuldade em reuniões.', 
          tags: ['TCC', 'Ansiedade'], 
          attachments: [
            { id: 'a1', name: 'Escala Beck de Ansiedade.pdf', type: 'pdf', size: '2MB', url: '#' },
            { id: 'a2', name: 'Registro de Pensamentos.jpg', type: 'image', size: '1.5MB', url: '#' }
          ], 
          comments: [
            { id: 'cm1', author: 'Karen Gomes', text: 'Iniciar psicoeducação na próxima sessão.', createdAt: '2023-10-02T10:00:00' }
          ], 
          createdAt: '2023-10-01' 
        }
      ]},
      { id: 'c2', title: 'Em Análise', color: 'bg-blue-500', cards: [] },
      { id: 'c3', title: 'Concluídos', color: 'bg-emerald-500', cards: [
         { 
           id: 'cd2', 
           patientId: '2', 
           patientName: 'Mariana Souza', 
           description: 'Alta clínica prevista. Sintomas em remissão.', 
           tags: ['Luto', 'Depressão'], 
           attachments: [], 
           comments: [], 
           createdAt: '2023-09-10' 
         }
      ]}
    ]
  },
  {
    id: 'b2',
    title: 'Terapia Infantil & Lúdica',
    description: 'Quadros para organização de materiais e evolução de pacientes mirins.',
    createdAt: '2023-09-01',
    columns: [
      { id: 'c4', title: 'Avaliação Inicial', color: 'bg-purple-500', cards: [] },
      { id: 'c5', title: 'Intervenção', color: 'bg-pink-500', cards: [] }
    ]
  }
];

export const CaseStudies: React.FC = () => {
  const { t } = useLanguage();
  
  // View State
  const [currentView, setCurrentView] = useState<'list' | 'board'>('list');
  const [boards, setBoards] = useState<CaseBoard[]>(MOCK_BOARDS);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [history, setHistory] = useState<{msg: string, time: string}[]>([]);
  
  // Drag & Drop
  const [draggedCard, setDraggedCard] = useState<{ card: CaseCard, sourceColumnId: string } | null>(null);
  
  // Modals & UI States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CaseCard | null>(null); // For Detail/Edit Mode
  const [targetColumnId, setTargetColumnId] = useState<string>('');
  
  // New Item States
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  
  // Column Management States
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [tempColumnTitle, setTempColumnTitle] = useState('');

  // Card Details Modal Tabs
  const [activeCardTab, setActiveCardTab] = useState<'details' | 'comments' | 'attachments'>('details');
  const [newCommentText, setNewCommentText] = useState('');

  const activeBoard = boards.find(b => b.id === activeBoardId);

  const logActivity = (msg: string) => {
      setHistory(prev => [{ msg, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }, ...prev.slice(0, 9)]);
  };

  // --- Board Logic ---
  const handleAddBoard = () => {
      if(!newBoardTitle) return;
      const newBoard: CaseBoard = {
          id: Math.random().toString(36).substr(2, 9),
          title: newBoardTitle,
          description: newBoardDesc || 'Sem descrição',
          createdAt: new Date().toISOString(),
          columns: [
              { id: Math.random().toString(36), title: 'A Fazer', color: 'bg-slate-400', cards: [] },
              { id: Math.random().toString(36), title: 'Em Progresso', color: 'bg-blue-500', cards: [] },
              { id: Math.random().toString(36), title: 'Concluído', color: 'bg-emerald-500', cards: [] }
          ]
      };
      setBoards([...boards, newBoard]);
      setIsBoardModalOpen(false);
      setNewBoardTitle('');
      setNewBoardDesc('');
  };

  const handleDeleteBoard = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(window.confirm('Tem certeza que deseja excluir este quadro?')) {
          setBoards(prev => prev.filter(b => b.id !== id));
      }
  };

  // --- Column Logic ---
  const handleAddColumn = () => {
      if (!activeBoardId) return;
      const newCol: CaseColumn = {
          id: Math.random().toString(36).substr(2, 9),
          title: 'Nova Coluna',
          color: 'bg-slate-400',
          cards: []
      };
      setBoards(prev => prev.map(b => {
          if (b.id === activeBoardId) {
              return { ...b, columns: [...b.columns, newCol] };
          }
          return b;
      }));
  };

  const updateColumn = (columnId: string, updates: Partial<CaseColumn>) => {
      if (!activeBoardId) return;
      setBoards(prev => prev.map(b => {
          if (b.id === activeBoardId) {
              return {
                  ...b,
                  columns: b.columns.map(c => c.id === columnId ? { ...c, ...updates } : c)
              };
          }
          return b;
      }));
  };

  const deleteColumn = (columnId: string) => {
      if (!activeBoardId) return;
      const board = boards.find(b => b.id === activeBoardId);
      const col = board?.columns.find(c => c.id === columnId);
      
      if (col && col.cards.length > 0) {
          if (!window.confirm('Esta coluna contém cartões. Deseja excluí-la mesmo assim?')) return;
      }

      setBoards(prev => prev.map(b => {
          if (b.id === activeBoardId) {
              return { ...b, columns: b.columns.filter(c => c.id !== columnId) };
          }
          return b;
      }));
      setOpenColumnMenuId(null);
  };

  // --- Card Logic ---
  const handleDragStart = (e: React.DragEvent, card: CaseCard, sourceColumnId: string) => {
      setDraggedCard({ card, sourceColumnId });
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
      e.preventDefault();
      if (!draggedCard || !activeBoardId) return;
      
      const { card, sourceColumnId } = draggedCard;
      if (sourceColumnId === targetColumnId) return;

      setBoards(prev => prev.map(b => {
          if (b.id === activeBoardId) {
              const sourceCol = b.columns.find(c => c.id === sourceColumnId);
              const targetCol = b.columns.find(c => c.id === targetColumnId);
              
              if (sourceCol && targetCol) {
                  const newSourceCards = sourceCol.cards.filter(c => c.id !== card.id);
                  const newTargetCards = [...targetCol.cards, card];
                  
                  logActivity(`${t('cases.moved')} "${card.patientName}" ${t('cases.from')} ${sourceCol.title} ${t('cases.to')} ${targetCol.title}`);

                  return {
                      ...b,
                      columns: b.columns.map(c => {
                          if (c.id === sourceColumnId) return { ...c, cards: newSourceCards };
                          if (c.id === targetColumnId) return { ...c, cards: newTargetCards };
                          return c;
                      })
                  };
              }
          }
          return b;
      }));
      setDraggedCard(null);
  };

  // ... Render ...
  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20 h-[calc(100vh-6rem)] flex flex-col">
      
      {/* Hero Section */}
      {!activeBoardId ? (
        <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800 text-white shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
            <div className="absolute -right-32 -top-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                        <BookOpen size={14} />
                        <span>{t('cases.title')}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('cases.boards')}</h1>
                    <p className="text-indigo-200 text-lg leading-relaxed max-w-xl">
                        {t('cases.subtitle')}
                    </p>
                </div>
                <button 
                    onClick={() => setIsBoardModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all"
                >
                    <Plus size={20} />
                    {t('cases.newBoard')}
                </button>
            </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-2 shrink-0">
            <div className="flex items-center gap-4">
                <button onClick={() => setActiveBoardId(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{activeBoard?.title}</h2>
                    <p className="text-sm text-slate-500">{activeBoard?.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
               {/* History Ticker */}
               {history.length > 0 && (
                   <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs text-slate-500 animate-[fadeIn_0.5s_ease-out]">
                       <History size={12} />
                       <span className="font-bold">{history[0].time}:</span>
                       <span className="truncate max-w-[200px]">{history[0].msg}</span>
                   </div>
               )}
               <button 
                 onClick={handleAddColumn}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
               >
                   <Plus size={16} /> {t('cases.addColumn')}
               </button>
            </div>
        </div>
      )}

      {/* Content Area */}
      {!activeBoardId ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4">
              {boards.map(board => (
                  <div 
                    key={board.id}
                    onClick={() => setActiveBoardId(board.id)}
                    className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
                  >
                      <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                              {board.title.charAt(0)}
                          </div>
                          <button onClick={(e) => handleDeleteBoard(e, board.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={18} />
                          </button>
                      </div>
                      <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">{board.title}</h3>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">{board.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-50">
                          <span className="flex items-center gap-1"><Layout size={14} /> {board.columns.length} colunas</span>
                          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(board.createdAt).toLocaleDateString()}</span>
                      </div>
                  </div>
              ))}
              {boards.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <Layout size={48} className="opacity-20 mb-4" />
                      <p>{t('cases.noBoards')}</p>
                  </div>
              )}
          </div>
      ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
              <div className="flex gap-6 h-full px-2 min-w-max">
                  {activeBoard?.columns.map(col => (
                      <div 
                        key={col.id} 
                        className="w-80 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 max-h-full"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                      >
                          {/* Column Header */}
                          <div className="p-4 flex items-center justify-between shrink-0 group/col-header">
                              <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${col.color}`}></div>
                                  <h4 className="font-bold text-slate-700 text-sm">{col.title}</h4>
                                  <span className="bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{col.cards.length}</span>
                              </div>
                              <div className="relative">
                                  <button onClick={() => setOpenColumnMenuId(openColumnMenuId === col.id ? null : col.id)} className="p-1 hover:bg-slate-200 rounded text-slate-400 opacity-0 group-hover/col-header:opacity-100 transition-opacity">
                                      <MoreHorizontal size={16} />
                                  </button>
                                  {openColumnMenuId === col.id && (
                                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-20 w-32 animate-[scaleIn_0.1s_ease-out]">
                                          <button onClick={() => deleteColumn(col.id)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                              <Trash2 size={14} /> Excluir
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Cards List */}
                          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                              {col.cards.map(card => (
                                  <div 
                                    key={card.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, card, col.id)}
                                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing group hover:border-indigo-200 transition-all"
                                  >
                                      <div className="flex flex-wrap gap-1 mb-2">
                                          {card.tags.map(tag => (
                                              <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase tracking-wider">{tag}</span>
                                          ))}
                                      </div>
                                      <h5 className="font-bold text-slate-800 text-sm mb-1">{card.patientName}</h5>
                                      <p className="text-xs text-slate-500 line-clamp-3 mb-3">{card.description}</p>
                                      
                                      <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-slate-400">
                                          <div className="flex items-center gap-3 text-xs">
                                              {card.attachments.length > 0 && <span className="flex items-center gap-1 hover:text-indigo-500"><Paperclip size={12} /> {card.attachments.length}</span>}
                                              {card.comments.length > 0 && <span className="flex items-center gap-1 hover:text-indigo-500"><MessageSquare size={12} /> {card.comments.length}</span>}
                                          </div>
                                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                              {card.patientName.charAt(0)}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>

                          {/* Add Card Button */}
                          <div className="p-3 pt-0 shrink-0">
                              <button 
                                onClick={() => { setTargetColumnId(col.id); setEditingCard(null); setIsCardModalOpen(true); }}
                                className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:bg-slate-200/50 hover:text-slate-700 rounded-lg transition-colors border border-dashed border-slate-300"
                              >
                                  <Plus size={14} /> {t('cases.newCard')}
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* --- MODAL: NEW BOARD --- */}
      {isBoardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden p-6 animate-[slideUpFade_0.3s_ease-out]">
                  <h3 className="text-xl font-bold text-slate-800 mb-4">{t('cases.newBoard')}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.boardName')}</label>
                          <input 
                            type="text" 
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700" 
                            value={newBoardTitle}
                            onChange={(e) => setNewBoardTitle(e.target.value)}
                            placeholder="Ex: Supervisão Clínica"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.desc')}</label>
                          <textarea 
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700 resize-none h-24" 
                            value={newBoardDesc}
                            onChange={(e) => setNewBoardDesc(e.target.value)}
                            placeholder="Objetivo deste quadro..."
                          />
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setIsBoardModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg">{t('cases.cancel')}</button>
                      <button onClick={handleAddBoard} className="px-6 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg">{t('cases.create')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: NEW CARD --- */}
      {isCardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[slideUpFade_0.3s_ease-out]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-slate-800">{t('cases.newCard')}</h3>
                      <button onClick={() => setIsCardModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.selectPatient')}</label>
                          <select className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 font-medium text-slate-700">
                              <option value="">Selecione...</option>
                              {MOCK_PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.desc')}</label>
                          <textarea className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700 resize-none h-32" placeholder="Resumo do caso..." />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.tags')}</label>
                          <input type="text" className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700" placeholder="TCC, Ansiedade, Luto..." />
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                      <button onClick={() => setIsCardModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg">{t('cases.cancel')}</button>
                      <button 
                        onClick={() => {
                            // Mock card creation
                            if (!activeBoardId) return;
                            const newCard: CaseCard = {
                                id: Math.random().toString(36),
                                patientName: 'Novo Paciente (Mock)',
                                description: 'Descrição do caso...',
                                tags: ['Novo'],
                                attachments: [],
                                comments: [],
                                createdAt: new Date().toISOString()
                            };
                            setBoards(prev => prev.map(b => {
                                if (b.id === activeBoardId) {
                                    return {
                                        ...b,
                                        columns: b.columns.map(c => c.id === targetColumnId ? { ...c, cards: [...c.cards, newCard] } : c)
                                    };
                                }
                                return b;
                            }));
                            logActivity(`${t('cases.created')} "Novo Paciente (Mock)"`);
                            setIsCardModalOpen(false);
                        }}
                        className="px-6 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg"
                      >
                          {t('cases.create')}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};
