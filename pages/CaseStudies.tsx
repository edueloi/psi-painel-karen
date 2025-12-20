
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
  History,
  Layout,
  LayoutGrid,
  List as ListIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../services/api';
import { Patient } from '../types';

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
  columnCount?: number;
  cardCount?: number;
}

// --- Constants ---
const COLUMN_COLORS = [
  'bg-slate-400',
  'bg-red-500',
  'bg-orange-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-purple-500',
  'bg-pink-500'
];

const EMPTY_BOARDS: CaseBoard[] = [];

export const CaseStudies: React.FC = () => {
  const { t } = useLanguage();

  // View State
  const [currentView, setCurrentView] = useState<'list' | 'board'>('list');
  const [boards, setBoards] = useState<CaseBoard[]>(EMPTY_BOARDS);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ msg: string; time: string }[]>([]);
  const [boardSearch, setBoardSearch] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);

  // Drag & Drop
  const [draggedCard, setDraggedCard] = useState<{ card: CaseCard; sourceColumnId: string } | null>(null);

  // Modals & UI States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string>('');

  // New Item States
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newCardPatientId, setNewCardPatientId] = useState('');
  const [newCardPatientName, setNewCardPatientName] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardTags, setNewCardTags] = useState('');

  // Column Management States
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);

  const activeBoard = boards.find(b => b.id === activeBoardId);
  const getBoardColumnCount = (b: CaseBoard) => (b.columns && b.columns.length ? b.columns.length : b.columnCount || 0);
  const getBoardCardCount = (b: CaseBoard) => {
      if (b.columns && b.columns.length) {
          return b.columns.reduce((sum, c) => sum + c.cards.length, 0);
      }
      return b.cardCount || 0;
  };
  const boardStats = useMemo(() => {
      const boardCount = boards.length;
      const columnCount = boards.reduce((sum, b) => sum + getBoardColumnCount(b), 0);
      const cardCount = boards.reduce((sum, b) => sum + getBoardCardCount(b), 0);
      return { boardCount, columnCount, cardCount };
  }, [boards]);

  const filteredBoards = useMemo(() => {
      if (!boardSearch.trim()) return boards;
      const q = boardSearch.toLowerCase();
      return boards.filter(b => b.title.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q));
  }, [boards, boardSearch]);

  const logActivity = (msg: string) => {
      setHistory(prev => [{ msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev.slice(0, 9)]);
  };

  const resetCardForm = () => {
      setNewCardPatientId('');
      setNewCardPatientName('');
      setNewCardDesc('');
      setNewCardTags('');
  };

  const parseTags = (value: any): string[] => {
      if (!value) return [];
      if (Array.isArray(value)) return value.filter(Boolean);
      if (typeof value === 'string') {
          try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) return parsed.filter(Boolean);
          } catch (e) {
              return value.split(',').map(v => v.trim()).filter(Boolean);
          }
      }
      return [];
  };

  const mapBoardSummary = (row: any): CaseBoard => ({
      id: String(row.id),
      title: row.title,
      description: row.description || '',
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      columns: [],
      columnCount: row.column_count ?? 0,
      cardCount: row.card_count ?? 0
  });

  const mapBoardDetail = (row: any): CaseBoard => {
      const columns: CaseColumn[] = (row.columns || []).map((c: any) => ({
          id: String(c.id),
          title: c.title,
          color: c.color || 'bg-slate-400',
          cards: []
      }));

      const columnMap = new Map(columns.map(c => [c.id, c]));
      (row.cards || []).forEach((card: any) => {
          const mapped: CaseCard = {
              id: String(card.id),
              patientId: card.patient_id ? String(card.patient_id) : undefined,
              patientName: card.patient_name || card.title || 'Sem paciente',
              description: card.description || '',
              tags: parseTags(card.tags_json),
              attachments: [],
              comments: [],
              createdAt: card.created_at || new Date().toISOString()
          };
          const col = columnMap.get(String(card.column_id));
          if (col) col.cards.push(mapped);
      });

      return {
          id: String(row.id),
          title: row.title,
          description: row.description || '',
          createdAt: row.created_at || row.createdAt || new Date().toISOString(),
          columns,
          columnCount: columns.length,
          cardCount: columns.reduce((sum, c) => sum + c.cards.length, 0)
      };
  };

  const loadBoards = async () => {
      setIsLoading(true);
      try {
          const data = await api.get<any[]>('/case-studies/boards');
          setBoards(Array.isArray(data) ? data.map(mapBoardSummary) : []);
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const loadBoardDetail = async (boardId: string) => {
      setBoardLoading(true);
      try {
          const data = await api.get<any>(`/case-studies/boards/${boardId}`);
          const mapped = mapBoardDetail(data);
          setBoards(prev => prev.map(b => (b.id === boardId ? mapped : b)));
      } catch (e) {
          console.error(e);
      } finally {
          setBoardLoading(false);
      }
  };

  const loadPatients = async () => {
      try {
          const data = await api.get<Patient[]>('/patients');
          setPatients(Array.isArray(data) ? data : []);
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
      void loadBoards();
      void loadPatients();
  }, []);

  useEffect(() => {
      if (activeBoardId) {
          void loadBoardDetail(activeBoardId);
      }
  }, [activeBoardId]);
  // --- Board Logic ---
  const handleAddBoard = async () => {
      if (!newBoardTitle.trim()) return;
      try {
          const data = await api.post<{ id: number }>('/case-studies/boards', {
              title: newBoardTitle.trim(),
              description: newBoardDesc.trim() || null
          });
          const boardId = String(data.id);

          const defaultColumns = [
              { title: 'A Fazer', color: 'bg-slate-400' },
              { title: 'Em Progresso', color: 'bg-blue-500' },
              { title: 'Concluido', color: 'bg-emerald-500' }
          ];
          await Promise.all(
              defaultColumns.map((col, idx) =>
                  api.post(`/case-studies/boards/${boardId}/columns`, {
                      title: col.title,
                      color: col.color,
                      sort_order: idx
                  })
              )
          );

          await loadBoards();
          setActiveBoardId(boardId);
          setIsBoardModalOpen(false);
          setNewBoardTitle('');
          setNewBoardDesc('');
      } catch (e) {
          console.error(e);
      }
  };

  const handleDeleteBoard = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!window.confirm('Tem certeza que deseja excluir este quadro?')) return;
      try {
          await api.delete(`/case-studies/boards/${id}`);
          setBoards(prev => prev.filter(b => b.id !== id));
          if (activeBoardId === id) setActiveBoardId(null);
      } catch (e) {
          console.error(e);
      }
  };

  // --- Column Logic ---
  const handleAddColumn = async () => {
      if (!activeBoardId) return;
      const color = COLUMN_COLORS[Math.floor(Math.random() * COLUMN_COLORS.length)];
      try {
          const sortOrder = activeBoard ? activeBoard.columns.length : 0;
          await api.post(`/case-studies/boards/${activeBoardId}/columns`, {
              title: 'Nova Coluna',
              color,
              sort_order: sortOrder
          });
          await loadBoardDetail(activeBoardId);
      } catch (e) {
          console.error(e);
      }
  };

  const deleteColumn = async (columnId: string) => {
      if (!activeBoardId) return;
      const board = boards.find(b => b.id === activeBoardId);
      const col = board?.columns.find(c => c.id === columnId);

      if (col && col.cards.length > 0) {
          if (!window.confirm('Esta coluna contem cartoes. Deseja exclui-la mesmo assim?')) return;
      }

      try {
          await api.delete(`/case-studies/boards/${activeBoardId}/columns/${columnId}`);
          await loadBoardDetail(activeBoardId);
      } catch (e) {
          console.error(e);
      } finally {
          setOpenColumnMenuId(null);
      }
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

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
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

                  const moved = {
                      ...b,
                      columns: b.columns.map(c => {
                          if (c.id === sourceColumnId) return { ...c, cards: newSourceCards };
                          if (c.id === targetColumnId) return { ...c, cards: newTargetCards };
                          return c;
                      })
                  };
                  return moved;
              }
          }
          return b;
      }));
      setDraggedCard(null);

      try {
          const targetCol = activeBoard?.columns.find(c => c.id === targetColumnId);
          const sortOrder = targetCol ? targetCol.cards.length : 0;
          await api.patch(`/case-studies/cards/${card.id}/move`, {
              column_id: targetColumnId,
              sort_order: sortOrder
          });
      } catch (err) {
          console.error(err);
          await loadBoardDetail(activeBoardId);
      }
  };

  const handleCreateCard = async () => {
      if (!activeBoardId) return;
      const patientName = newCardPatientName.trim();
      const patientId = newCardPatientId || undefined;
      if (!patientName && !patientId) return;
      if (!newCardDesc.trim()) return;

      const tags = newCardTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

      try {
          await api.post(`/case-studies/boards/${activeBoardId}/cards`, {
              column_id: targetColumnId,
              patient_id: patientId || null,
              title: patientId ? null : patientName,
              description: newCardDesc.trim(),
              tags,
              sort_order: activeBoard?.columns.find(c => c.id === targetColumnId)?.cards.length || 0
          });

          await loadBoardDetail(activeBoardId);
          logActivity(`${t('cases.created')} "${patientName || 'Paciente'}"`);
          resetCardForm();
          setIsCardModalOpen(false);
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20 h-[calc(100vh-6rem)] flex flex-col px-4 sm:px-6 lg:px-0">
      {!activeBoardId ? (
        <div className="relative overflow-hidden rounded-[28px] p-8 bg-slate-950 shadow-2xl shadow-indigo-900/30 border border-slate-800 text-white shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 opacity-95"></div>
            <div className="absolute -right-24 -top-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-[110px] pointer-events-none"></div>
            <div className="absolute -left-16 bottom-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)]"></div>

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-slate-800/80 border border-slate-700 text-indigo-200 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                        <BookOpen size={14} />
                        <span>{t('cases.title')}</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 leading-tight">{t('cases.boards')}</h1>
                    <p className="text-indigo-100 text-lg leading-relaxed max-w-xl">
                        {t('cases.subtitle')}
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold text-indigo-100/80">
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">{boardStats.boardCount} quadros</span>
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">{boardStats.columnCount} colunas</span>
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/10">{boardStats.cardCount} casos</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => setIsBoardModalOpen(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all"
                    >
                        <Plus size={20} />
                        {t('cases.newBoard')}
                    </button>
                </div>
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
               <div className="hidden md:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                   <Search size={16} className="text-slate-400" />
                   <input
                     value={cardSearch}
                     onChange={(e) => setCardSearch(e.target.value)}
                     className="w-48 bg-transparent text-sm outline-none text-slate-600 placeholder:text-slate-400"
                     placeholder="Buscar por paciente ou tag"
                   />
               </div>
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

      {!activeBoardId ? (
          <div className="space-y-6 overflow-y-auto pb-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-1">
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                      <Search size={16} className="text-slate-400" />
                      <input
                        value={boardSearch}
                        onChange={(e) => setBoardSearch(e.target.value)}
                        className="w-full lg:w-80 bg-transparent text-sm outline-none text-slate-600 placeholder:text-slate-400"
                        placeholder="Buscar quadro por nome ou descricao"
                      />
                  </div>
                  <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentView('list')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${currentView === 'list' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'}`}
                      >
                          <LayoutGrid size={14} /> Grade
                      </button>
                      <button
                        onClick={() => setCurrentView('board')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border ${currentView === 'board' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'}`}
                      >
                          <ListIcon size={14} /> Lista
                      </button>
                  </div>
              </div>

              {isLoading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <Layout size={48} className="opacity-20 mb-4" />
                      <p>Carregando...</p>
                  </div>
              ) : currentView === 'list' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredBoards.map(board => (
                          <div 
                            key={board.id}
                            onClick={() => setActiveBoardId(board.id)}
                            className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-indigo-200 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative"
                          >
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-indigo-50/60 via-white to-white rounded-2xl"></div>
                              <div className="relative z-10">
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
                                      <span className="flex items-center gap-1"><Layout size={14} /> {getBoardColumnCount(board)} colunas</span>
                                      <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(board.createdAt).toLocaleDateString()}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="space-y-4">
                      {filteredBoards.map(board => (
                          <div
                            key={board.id}
                            onClick={() => setActiveBoardId(board.id)}
                            className="group bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                          >
                              <div className="flex items-center gap-4 min-w-0">
                                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">
                                      {board.title.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                      <h3 className="font-bold text-slate-800 truncate">{board.title}</h3>
                                      <p className="text-sm text-slate-500 line-clamp-1">{board.description}</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-slate-400">
                                  <span className="flex items-center gap-1"><Layout size={14} /> {getBoardColumnCount(board)} colunas</span>
                                  <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(board.createdAt).toLocaleDateString()}</span>
                                  <button onClick={(e) => handleDeleteBoard(e, board.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}

              {!isLoading && filteredBoards.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                      <Layout size={48} className="opacity-20 mb-4" />
                      <p>Nenhum quadro encontrado</p>
                  </div>
              )}
          </div>
      ) : (
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
              <div className="flex gap-6 h-full px-2 min-w-max">
                  {boardLoading && (
                      <div className="w-full flex items-center justify-center text-slate-400 text-sm font-bold py-10">
                          Carregando...
                      </div>
                  )}
                  {activeBoard?.columns.map(col => (
                      <div
                        key={col.id}
                        className="w-80 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 max-h-full"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.id)}
                      >
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

                          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">
                              {col.cards
                                .filter(card => {
                                    if (!cardSearch.trim()) return true;
                                    const q = cardSearch.toLowerCase();
                                    const tagMatch = card.tags.some(tag => tag.toLowerCase().includes(q));
                                    return card.patientName.toLowerCase().includes(q) || card.description.toLowerCase().includes(q) || tagMatch;
                                })
                                .map(card => (
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
                              {col.cards.length === 0 && (
                                  <div className="text-center text-xs text-slate-400 py-6">Sem casos nesta coluna</div>
                              )}
                              {col.cards.length > 0 && cardSearch.trim() && col.cards.filter(card => {
                                  const q = cardSearch.toLowerCase();
                                  const tagMatch = card.tags.some(tag => tag.toLowerCase().includes(q));
                                  return card.patientName.toLowerCase().includes(q) || card.description.toLowerCase().includes(q) || tagMatch;
                              }).length === 0 && (
                                  <div className="text-center text-xs text-slate-400 py-6">Sem resultados para o filtro</div>
                              )}
                          </div>

                          <div className="p-3 pt-0 shrink-0">
                              <button
                                onClick={() => { setTargetColumnId(col.id); setIsCardModalOpen(true); }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-[slideUpFade_0.3s_ease-out] border border-slate-100">
                  <div className="relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900"></div>
                      <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_60%)]"></div>
                      <div className="relative p-6 flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
                                  <Layout size={18} />
                              </div>
                              <div>
                                  <h3 className="text-xl font-display font-bold">{t('cases.newBoard')}</h3>
                                  <p className="text-xs text-indigo-100">Estruture trilhas de acompanhamento clinico.</p>
                              </div>
                          </div>
                          <button onClick={() => setIsBoardModalOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                              <X size={18} />
                          </button>
                      </div>
                  </div>

                  <div className="p-6 space-y-4 bg-gradient-to-b from-white via-white to-slate-50/60">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.boardName')}</label>
                          <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={newBoardTitle}
                            onChange={(e) => setNewBoardTitle(e.target.value)}
                            placeholder="Ex: Supervisao Clinica"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.desc')}</label>
                          <textarea
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700 resize-none h-24"
                            value={newBoardDesc}
                            onChange={(e) => setNewBoardDesc(e.target.value)}
                            placeholder="Objetivo e foco do quadro..."
                          />
                      </div>
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex justify-end gap-3">
                      <button onClick={() => setIsBoardModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg">{t('cases.cancel')}</button>
                      <button onClick={handleAddBoard} className="px-6 py-2 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-lg">{t('cases.create')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL: NEW CARD --- */}
      {isCardModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white w-full max-w-lg rounded-[28px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-[slideUpFade_0.3s_ease-out] border border-slate-100">
                  <div className="relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-800 to-indigo-600"></div>
                      <div className="absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)]"></div>
                      <div className="relative p-6 flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20">
                                  <FileText size={18} />
                              </div>
                              <div>
                                  <h3 className="text-xl font-display font-bold">{t('cases.newCard')}</h3>
                                  <p className="text-xs text-indigo-100">Adicione detalhes do caso e observacoes.</p>
                              </div>
                          </div>
                          <button onClick={() => setIsCardModalOpen(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                              <X size={18} />
                          </button>
                      </div>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 bg-gradient-to-b from-white via-white to-slate-50/60">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.selectPatient')}</label>
                          <select
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 font-medium text-slate-700"
                            value={newCardPatientId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setNewCardPatientId(id);
                                const patient = patients.find(p => String(p.id) === id);
                                setNewCardPatientName(patient?.full_name || '');
                            }}
                          >
                              <option value="">Selecione...</option>
                              {patients.map(p => <option key={p.id} value={String(p.id)}>{p.full_name}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Paciente (novo)</label>
                          <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                            placeholder="Digite um novo paciente"
                            value={newCardPatientName}
                            onChange={(e) => {
                                setNewCardPatientName(e.target.value);
                                if (newCardPatientId) setNewCardPatientId('');
                            }}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.desc')}</label>
                          <textarea
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700 resize-none h-32"
                            placeholder="Resumo do caso, sinais e contexto..."
                            value={newCardDesc}
                            onChange={(e) => setNewCardDesc(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('cases.tags')}</label>
                          <input
                            type="text"
                            className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 font-medium text-slate-700"
                            placeholder="TCC, Ansiedade, Luto..."
                            value={newCardTags}
                            onChange={(e) => setNewCardTags(e.target.value)}
                          />
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/80">
                      <button onClick={() => { resetCardForm(); setIsCardModalOpen(false); }} className="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-lg">{t('cases.cancel')}</button>
                      <button
                        onClick={handleCreateCard}
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
