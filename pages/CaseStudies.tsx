
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
      if (!draggedCard || !activeBoard) return;
      if (draggedCard.sourceColumnId === targetColumnId) return;

      const newBoards = [...boards];
      const boardIdx = newBoards.findIndex(b => b.id === activeBoardId);
      const sourceColIdx = newBoards[boardIdx].columns.findIndex(c => c.id === draggedCard.sourceColumnId);
      const targetColIdx = newBoards[boardIdx].columns.findIndex(c => c.id === targetColumnId);

      // Move logic
      newBoards[boardIdx].columns[sourceColIdx].cards = newBoards[boardIdx].columns[sourceColIdx].cards.filter(c => c.id !== draggedCard.card.id);
      newBoards[boardIdx].columns[targetColIdx].cards.push(draggedCard.card);

      setBoards(newBoards);
      
      const sourceTitle = newBoards[boardIdx].columns[sourceColIdx].title;
      const targetTitle = newBoards[boardIdx].columns[targetColIdx].title;
      logActivity(`${t('cases.moved')} "${draggedCard.card.patientName}" ${t('cases.from')} ${sourceTitle} ${t('cases.to')} ${targetTitle}`);
      
      setDraggedCard(null);
  };

  const handleSaveCard = () => {
      if (!editingCard || !activeBoardId) return;

      const isNew = !boards.some(b => b.columns.some(c => c.cards.some(card => card.id === editingCard.id)));

      setBoards(prev => prev.map(b => {
          if (b.id !== activeBoardId) return b;

          const newColumns = [...b.columns];
          
          if (isNew) {
              // Add new card
              const colIdx = newColumns.findIndex(c => c.id === targetColumnId);
              if (colIdx !== -1) {
                  newColumns[colIdx].cards.push({
                      ...editingCard,
                      id: editingCard.id || Math.random().toString(36).substr(2, 9),
                      createdAt: new Date().toISOString()
                  });
                  logActivity(`${t('cases.created')} "${editingCard.patientName}"`);
              }
          } else {
              // Update existing card
              newColumns.forEach(col => {
                  col.cards = col.cards.map(c => c.id === editingCard.id ? editingCard : c);
              });
          }
          return { ...b, columns: newColumns };
      }));

      setIsCardModalOpen(false);
      setEditingCard(null);
  };

  const openNewCard = (colId: string) => {
      setTargetColumnId(colId);
      setEditingCard({
          id: '',
          patientName: '',
          description: '',
          tags: [],
          attachments: [],
          comments: [],
          createdAt: ''
      });
      setActiveCardTab('details');
      setIsCardModalOpen(true);
  };

  const openEditCard = (card: CaseCard) => {
      setEditingCard({ ...card });
      setActiveCardTab('details');
      setIsCardModalOpen(true);
  };

  const handleAddComment = () => {
      if (!newCommentText.trim() || !editingCard) return;
      const newComment: Comment = {
          id: Math.random().toString(36).substr(2, 9),
          author: 'Você',
          text: newCommentText,
          createdAt: new Date().toISOString()
      };
      setEditingCard({
          ...editingCard,
          comments: [newComment, ...editingCard.comments]
      });
      setNewCommentText('');
  };

  const getProgress = (board: CaseBoard) => {
      const total = board.columns.reduce((acc, col) => acc + col.cards.length, 0);
      if (total === 0) return 0;
      const done = board.columns.find(c => c.title.toLowerCase().includes('concluído') || c.title.toLowerCase().includes('done'))?.cards.length || 0;
      return Math.round((done / total) * 100);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] font-sans pb-10 h-full flex flex-col">
      
      {/* --- DASHBOARD VIEW (LIST OF BOARDS) --- */}
      {currentView === 'list' && (
        <>
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-[26px] p-8 bg-slate-900 shadow-2xl shadow-indigo-900/20 border border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-90"></div>
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-300 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                            <BookOpen size={14} />
                            <span>{t('cases.title')}</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">Meus Estudos de Caso</h1>
                        <p className="text-indigo-100/70 text-lg leading-relaxed max-w-xl">
                            {t('cases.subtitle')}
                        </p>
                    </div>

                    <div className="flex gap-4 w-full lg:w-auto">
                        <button 
                            onClick={() => setIsBoardModalOpen(true)}
                            className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-2 transition-all hover:-translate-y-1 active:translate-y-0"
                        >
                            <Plus size={20} />
                            {t('cases.newBoard')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Boards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {boards.map(board => {
                    const progress = getProgress(board);
                    const totalCards = board.columns.reduce((acc, col) => acc + col.cards.length, 0);
                    
                    return (
                        <div 
                            key={board.id}
                            onClick={() => { setActiveBoardId(board.id); setCurrentView('board'); }}
                            className="group bg-white rounded-[24px] p-6 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col h-full"
                        >
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300">
                                    <Layout size={24} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 px-2 py-1 rounded-lg border border-slate-100">
                                        {new Date(board.createdAt).toLocaleDateString()}
                                    </span>
                                    <button 
                                        onClick={(e) => handleDeleteBoard(e, board.id)}
                                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 mb-6 relative z-10">
                                <h3 className="font-display font-bold text-xl text-slate-800 mb-2 leading-tight group-hover:text-indigo-700 transition-colors">
                                    {board.title}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                                    {board.description}
                                </p>
                            </div>

                            <div className="relative z-10 pt-4 border-t border-slate-50">
                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex -space-x-2">
                                        {[...Array(Math.min(3, totalCards))].map((_, i) => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                {String.fromCharCode(65 + i)}
                                            </div>
                                        ))}
                                        {totalCards > 3 && (
                                            <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                                                +{totalCards - 3}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold text-slate-400 uppercase block mb-0.5">Progresso</span>
                                        <span className="text-sm font-bold text-slate-700">{progress}%</span>
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Add New Placeholder Card */}
                <button 
                    onClick={() => setIsBoardModalOpen(true)}
                    className="group rounded-[24px] border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/10 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 transition-all min-h-[250px]"
                >
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <Plus size={32} />
                    </div>
                    <span className="font-bold text-sm">Criar Novo Quadro</span>
                </button>
            </div>
        </>
      )}

      {/* --- BOARD VIEW (KANBAN) --- */}
      {currentView === 'board' && activeBoard && (
        <div className="flex flex-col h-full overflow-hidden">
            
            {/* Board Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-[20px] border border-slate-100 shadow-sm mb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setCurrentView('list')}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                        title="Voltar"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-display font-bold text-slate-800 flex items-center gap-2">
                            {activeBoard.title}
                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-slate-200">
                                {activeBoard.columns.reduce((acc, c) => acc + c.cards.length, 0)} Casos
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{activeBoard.description}</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filtrar cartões..." 
                            className="w-full lg:w-64 pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                    </div>
                    <button className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 lg:hidden">
                        <History size={18} />
                    </button>
                </div>
            </div>

            {/* Kanban Area */}
            <div className="flex-1 flex gap-6 overflow-hidden">
                
                {/* Columns Container */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-2">
                    <div className="flex gap-6 h-full min-w-max px-1">
                        {activeBoard.columns.map(column => (
                            <div 
                                key={column.id}
                                className="w-80 flex flex-col bg-slate-50/80 rounded-2xl max-h-full border border-slate-200/60 transition-all"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.id)}
                            >
                                {/* Column Header */}
                                <div className="p-4 flex items-center justify-between shrink-0 border-b border-slate-100/50 group/col relative">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                                        
                                        {/* Edit Title Mode */}
                                        {editingColumnId === column.id ? (
                                            <input 
                                                autoFocus
                                                type="text" 
                                                className="w-full bg-white border border-indigo-200 rounded px-1 py-0.5 text-sm font-bold outline-none"
                                                value={tempColumnTitle}
                                                onChange={(e) => setTempColumnTitle(e.target.value)}
                                                onBlur={() => {
                                                    if(tempColumnTitle.trim()) updateColumn(column.id, { title: tempColumnTitle });
                                                    setEditingColumnId(null);
                                                }}
                                                onKeyDown={(e) => {
                                                    if(e.key === 'Enter') {
                                                        if(tempColumnTitle.trim()) updateColumn(column.id, { title: tempColumnTitle });
                                                        setEditingColumnId(null);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <h3 
                                                onClick={() => { setTempColumnTitle(column.title); setEditingColumnId(column.id); }}
                                                className="font-bold text-slate-700 text-sm uppercase tracking-wide cursor-pointer hover:bg-slate-100 px-1 rounded transition-colors"
                                            >
                                                {column.title}
                                            </h3>
                                        )}
                                        <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{column.cards.length}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={() => setOpenColumnMenuId(openColumnMenuId === column.id ? null : column.id)}
                                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    {/* Column Menu Popover */}
                                    {openColumnMenuId === column.id && (
                                        <div className="absolute top-10 right-2 z-50 bg-white rounded-xl shadow-xl border border-slate-100 w-48 p-2 animate-[fadeIn_0.1s_ease-out]">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">Ações da Coluna</div>
                                            <button 
                                                onClick={() => { setTempColumnTitle(column.title); setEditingColumnId(column.id); setOpenColumnMenuId(null); }}
                                                className="w-full text-left px-2 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                            >
                                                <Edit3 size={14} /> Renomear
                                            </button>
                                            <button 
                                                onClick={() => deleteColumn(column.id)}
                                                className="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
                                            >
                                                <Trash2 size={14} /> Excluir
                                            </button>
                                            
                                            <div className="border-t border-slate-100 my-1 pt-1">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1"><Palette size={10} /> Cor</div>
                                                <div className="grid grid-cols-6 gap-1 p-1">
                                                    {COLUMN_COLORS.map(c => (
                                                        <button 
                                                            key={c}
                                                            onClick={() => updateColumn(column.id, { color: c })}
                                                            className={`w-5 h-5 rounded-full ${c} hover:scale-110 transition-transform ${column.color === c ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Cards List */}
                                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
                                    {column.cards.map(card => (
                                        <div 
                                            key={card.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, card, column.id)}
                                            onClick={() => openEditCard(card)}
                                            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 hover:ring-2 hover:ring-indigo-50/50 transition-all group select-none relative"
                                        >
                                            {/* Tags */}
                                            {card.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mb-3">
                                                    {card.tags.map((tag, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-slate-50 text-slate-600 text-[9px] font-bold uppercase tracking-wider rounded border border-slate-100">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            {/* Title */}
                                            <div className="flex items-start gap-2.5 mb-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-indigo-700 border border-white shadow-sm shrink-0">
                                                    {card.patientName.charAt(0)}
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm leading-snug pt-0.5">{card.patientName}</h4>
                                            </div>

                                            <p className="text-xs text-slate-500 mb-4 line-clamp-3 leading-relaxed pl-1">
                                                {card.description}
                                            </p>

                                            {/* Footer */}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-slate-400 text-[10px]">
                                                <span className="flex items-center gap-1 font-medium bg-slate-50 px-1.5 py-0.5 rounded text-slate-500">
                                                    <Calendar size={10} /> {new Date(card.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                </span>
                                                <div className="flex gap-3">
                                                    {card.attachments.length > 0 && <span className="flex items-center gap-1 text-slate-500"><Paperclip size={12} /> {card.attachments.length}</span>}
                                                    {card.comments.length > 0 && <span className="flex items-center gap-1 text-slate-500"><MessageSquare size={12} /> {card.comments.length}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Card Button */}
                                <div className="p-3 pt-0">
                                    <button 
                                        onClick={() => openNewCard(column.id)}
                                        className="w-full py-2.5 rounded-xl border border-transparent bg-white text-slate-500 font-bold text-xs hover:text-indigo-600 hover:shadow-sm transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus size={14} /> {t('cases.newCard')}
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {/* Add Column Button */}
                        <button 
                            onClick={handleAddColumn}
                            className="w-80 h-16 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all shrink-0"
                        >
                            <Plus size={18} className="mr-2" /> {t('cases.addColumn')}
                        </button>
                    </div>
                </div>

                {/* History Sidebar (Desktop Only) */}
                <div className="w-80 bg-white rounded-[20px] border border-slate-100 shadow-sm flex flex-col hidden xl:flex shrink-0">
                    <div className="p-5 border-b border-slate-100">
                        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                            <History size={16} className="text-indigo-500" /> {t('cases.history')}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                        {history.length === 0 && (
                            <div className="text-center py-10">
                                <Clock size={32} className="mx-auto text-slate-200 mb-2" />
                                <p className="text-xs text-slate-400 italic">Nenhuma atividade recente neste quadro.</p>
                            </div>
                        )}
                        {history.map((h, i) => (
                            <div key={i} className="flex gap-4 relative">
                                {/* Timeline Line */}
                                {i !== history.length - 1 && (
                                    <div className="absolute left-[5px] top-3 bottom-[-24px] w-0.5 bg-slate-100"></div>
                                )}
                                <div className="w-3 h-3 rounded-full bg-indigo-100 border-2 border-indigo-500 shrink-0 mt-1.5 relative z-10"></div>
                                <div>
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">{h.msg}</p>
                                    <span className="text-[10px] text-slate-400 font-bold mt-1 block">{h.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL: CARD DETAILS (EDIT/VIEW) --- */}
      {isCardModalOpen && editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-2xl rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                            {editingCard.patientName ? editingCard.patientName.charAt(0) : <Plus size={20} />}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 leading-none">
                                {editingCard.id ? 'Detalhes do Cartão' : t('cases.newCard')}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                                {editingCard.id ? `Criado em ${new Date(editingCard.createdAt).toLocaleDateString()}` : 'Adicionar novo caso'}
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setIsCardModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>

                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                    
                    {/* LEFT: Main Content */}
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-slate-100">
                        {/* Tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mb-6">
                            <button onClick={() => setActiveCardTab('details')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeCardTab === 'details' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Detalhes</button>
                            <button onClick={() => setActiveCardTab('comments')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeCardTab === 'comments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Comentários <span className="bg-slate-200 px-1.5 rounded-full text-[9px]">{editingCard.comments.length}</span></button>
                            <button onClick={() => setActiveCardTab('attachments')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeCardTab === 'attachments' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Anexos <span className="bg-slate-200 px-1.5 rounded-full text-[9px]">{editingCard.attachments.length}</span></button>
                        </div>

                        {activeCardTab === 'details' && (
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('cases.selectPatient')}</label>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-100"
                                            value={editingCard.patientId || ''}
                                            onChange={(e) => {
                                                const p = MOCK_PATIENTS.find(pat => pat.id === e.target.value);
                                                if(p) setEditingCard({...editingCard, patientId: p.id, patientName: p.name});
                                                else setEditingCard({...editingCard, patientId: '', patientName: e.target.value});
                                            }}
                                        >
                                            <option value="">Selecione...</option>
                                            {MOCK_PATIENTS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                                    </div>
                                    {!editingCard.patientId && (
                                        <input 
                                            type="text" 
                                            placeholder="Ou digite um título manual..." 
                                            className="w-full mt-2 p-3 bg-white border border-slate-200 rounded-xl outline-none text-sm"
                                            value={editingCard.patientName || ''}
                                            onChange={(e) => setEditingCard({...editingCard, patientName: e.target.value})}
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('cases.tags')}</label>
                                    <input 
                                        type="text" 
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700"
                                        placeholder="TCC, Ansiedade..."
                                        value={editingCard.tags.join(', ')}
                                        onChange={(e) => setEditingCard({...editingCard, tags: e.target.value.split(',').map(s => s.trim())})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('cases.desc')}</label>
                                    <textarea 
                                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 resize-none h-40 leading-relaxed"
                                        value={editingCard.description}
                                        onChange={(e) => setEditingCard({...editingCard, description: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}

                        {activeCardTab === 'comments' && (
                            <div className="space-y-4">
                                <div className="space-y-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                    {editingCard.comments.length === 0 && <p className="text-center text-slate-400 text-sm py-4">Nenhum comentário ainda.</p>}
                                    {editingCard.comments.map((comment) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                                                {comment.author.charAt(0)}
                                            </div>
                                            <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-bold text-xs text-slate-700">{comment.author}</span>
                                                    <span className="text-[10px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-600">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Escreva um comentário..."
                                        className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 text-sm"
                                        value={newCommentText}
                                        onChange={(e) => setNewCommentText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                                    />
                                    <button onClick={handleAddComment} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeCardTab === 'attachments' && (
                            <div className="space-y-4">
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer">
                                    <Paperclip size={24} className="mb-2" />
                                    <span className="text-xs font-bold">Clique para anexar arquivo</span>
                                </div>
                                <div className="space-y-2">
                                    {editingCard.attachments.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-lg text-slate-500 shadow-sm">
                                                    {file.type === 'image' ? <ImageIcon size={16} /> : <FileText size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{file.name}</p>
                                                    <p className="text-[10px] text-slate-400">{file.size}</p>
                                                </div>
                                            </div>
                                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors">
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Meta/Actions (Desktop) */}
                    <div className="w-48 p-6 bg-slate-50 hidden md:flex flex-col gap-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ações</div>
                        <button className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <Clock size={14} /> Mover
                        </button>
                        <button className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600 transition-colors flex items-center gap-2">
                            <Copy size={14} /> Duplicar
                        </button>
                        <button className="w-full text-left px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors flex items-center gap-2">
                            <Trash2 size={14} /> Arquivar
                        </button>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                    <button onClick={() => setIsCardModalOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-sm">
                        Cancelar
                    </button>
                    <button onClick={handleSaveCard} className="px-6 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg flex items-center gap-2 text-sm">
                        <Check size={16} /> Salvar Alterações
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL: NEW BOARD (Simple) --- */}
      {isBoardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl animate-[slideUpFade_0.3s_ease-out] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
                    <h3 className="text-lg font-bold text-slate-800">{t('cases.newBoard')}</h3>
                    <button onClick={() => setIsBoardModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t('cases.boardName')}</label>
                        <input 
                            type="text" 
                            autoFocus
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100"
                            value={newBoardTitle}
                            onChange={(e) => setNewBoardTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descrição (Opcional)</label>
                        <textarea 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 resize-none h-20"
                            value={newBoardDesc}
                            onChange={(e) => setNewBoardDesc(e.target.value)}
                        />
                    </div>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsBoardModalOpen(false)} className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-200">{t('cases.cancel')}</button>
                    <button onClick={handleAddBoard} className="px-6 py-2 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg">{t('cases.create')}</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
