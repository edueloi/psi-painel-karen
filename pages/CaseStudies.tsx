
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import { Patient } from '../types';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Combobox } from '../components/UI/Combobox';
import { Input, Select, TextArea } from '../components/UI/Input';

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

interface CaseDetails {
  complaint: string;
  history: string;
  hypothesis: string;
  objectives: string;
  interventions: string;
  risk_level: string;
  priority: string;
  next_steps: string;
  observations: string;
}

interface CaseCard {
  id: string;
  columnId: string;
  patientId?: string;
  patientName: string;
  description: string;
  tags: string[];
  details?: CaseDetails;
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
  const { pushToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // View State
  const [currentView, setCurrentView] = useState<'list' | 'board'>('list');
  const [boards, setBoards] = useState<CaseBoard[]>(EMPTY_BOARDS);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => searchParams.get('board'));
  const [history, setHistory] = useState<{ msg: string; time: string }[]>([]);
  const [boardSearch, setBoardSearch] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardLoading, setBoardLoading] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Drag & Drop
  const [draggedCard, setDraggedCard] = useState<{ card: CaseCard; sourceColumnId: string } | null>(null);

  // Modals & UI States
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string>('');
  const [isCardDetailOpen, setIsCardDetailOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CaseCard | null>(null);
  const [isEditingCard, setIsEditingCard] = useState(false);

  // New Item States
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newCardPatientId, setNewCardPatientId] = useState('');
  const [newCardPatientName, setNewCardPatientName] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardTags, setNewCardTags] = useState('');
  const [newCardDetails, setNewCardDetails] = useState<CaseDetails>({
      complaint: '',
      history: '',
      hypothesis: '',
      objectives: '',
      interventions: '',
      risk_level: '',
      priority: '',
      next_steps: '',
      observations: ''
  });
  const [editCardPatientId, setEditCardPatientId] = useState('');
  const [editCardPatientName, setEditCardPatientName] = useState('');
  const [editCardDesc, setEditCardDesc] = useState('');
  const [editCardTags, setEditCardTags] = useState('');
  const [editCardDetails, setEditCardDetails] = useState<CaseDetails>({
      complaint: '',
      history: '',
      hypothesis: '',
      objectives: '',
      interventions: '',
      risk_level: '',
      priority: '',
      next_steps: '',
      observations: ''
  });

  // Column Management States
  const [openColumnMenuId, setOpenColumnMenuId] = useState<string | null>(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [editingColumnColor, setEditingColumnColor] = useState('bg-slate-400');

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
      setNewCardDetails({
        complaint: '',
        history: '',
        hypothesis: '',
        objectives: '',
        interventions: '',
        risk_level: '',
        priority: '',
        next_steps: '',
        observations: ''
      });
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

  const parseDetails = (value: any): CaseDetails => {
      const empty = {
        complaint: '',
        history: '',
        hypothesis: '',
        objectives: '',
        interventions: '',
        risk_level: '',
        priority: '',
        next_steps: '',
        observations: ''
      };
      if (!value) return empty;
      if (typeof value === 'string') {
          try {
              const parsed = JSON.parse(value);
              return { ...empty, ...(parsed || {}) };
          } catch {
              return empty;
          }
      }
      if (typeof value === 'object') {
          return { ...empty, ...(value || {}) };
      }
      return empty;
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
              columnId: String(card.column_id),
              patientId: card.patient_id ? String(card.patient_id) : undefined,
              patientName: card.patient_name || card.title || 'Sem paciente',
              description: card.description || '',
              tags: parseTags(card.tags_json),
              details: parseDetails(card.details_json),
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
          const data = await api.get<any[]>('/patients');
          const normalized = Array.isArray(data) ? data.map((p: any) => ({
              ...p,
              full_name: p.full_name || p.name || '',
              status: p.status === 'active' ? 'ativo' : p.status === 'inactive' ? 'inativo' : (p.status || ''),
          })) : [];
          setPatients(normalized as Patient[]);
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
          setSearchParams({ board: activeBoardId }, { replace: true });
      } else {
          setSearchParams({}, { replace: true });
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

  const openEditColumn = (col: CaseColumn) => {
      setEditingColumnId(col.id);
      setEditingColumnTitle(col.title);
      setEditingColumnColor(col.color || 'bg-slate-400');
      setIsColumnModalOpen(true);
      setOpenColumnMenuId(null);
  };

  const handleUpdateColumn = async () => {
      if (!activeBoardId || !editingColumnId || !editingColumnTitle.trim()) return;
      const board = boards.find(b => b.id === activeBoardId);
      const col = board?.columns.find(c => c.id === editingColumnId);
      const sortOrder = col ? board?.columns.indexOf(col) ?? 0 : 0;
      try {
          await api.put(`/case-studies/boards/${activeBoardId}/columns/${editingColumnId}`, {
              title: editingColumnTitle.trim(),
              color: editingColumnColor,
              sort_order: sortOrder
          });
          await loadBoardDetail(activeBoardId);
          setIsColumnModalOpen(false);
      } catch (e) {
          console.error(e);
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
      if (!patientName && !patientId) {
          pushToast('error', 'Selecione ou informe um paciente.');
          return;
      }
      if (!newCardDesc.trim()) {
          pushToast('error', 'Informe uma descrição para o caso.');
          return;
      }

      const tags = newCardTags.split(',').map((tg: string) => tg.trim()).filter(Boolean);

      setIsSavingCard(true);
      try {
          await api.post(`/case-studies/boards/${activeBoardId}/cards`, {
              column_id: targetColumnId,
              patient_id: patientId || null,
              title: patientId ? null : patientName,
              description: newCardDesc.trim(),
              tags,
              details: newCardDetails,
              sort_order: activeBoard?.columns.find(c => c.id === targetColumnId)?.cards.length || 0
          });

          await loadBoardDetail(activeBoardId);
          logActivity(`${t('cases.created')} "${patientName || 'Paciente'}"`);
          pushToast('success', 'Caso criado com sucesso!');
          resetCardForm();
          setIsCardModalOpen(false);
      } catch (e) {
          console.error(e);
          pushToast('error', 'Erro ao criar caso. Tente novamente.');
      } finally {
          setIsSavingCard(false);
      }
  };

  const openCardDetail = (card: CaseCard) => {
      setSelectedCard(card);
      setEditCardPatientId(card.patientId || '');
      setEditCardPatientName(card.patientId ? '' : card.patientName);
      setEditCardDesc(card.description || '');
      setEditCardTags(card.tags.join(', '));
      setEditCardDetails(card.details || {
        complaint: '',
        history: '',
        hypothesis: '',
        objectives: '',
        interventions: '',
        risk_level: '',
        priority: '',
        next_steps: '',
        observations: ''
      });
      setIsEditingCard(false);
      setIsCardDetailOpen(true);
  };

  const handleUpdateCard = async () => {
      if (!selectedCard || !activeBoardId) return;
      const patientName = editCardPatientName.trim();
      const patientId = editCardPatientId || undefined;
      if (!patientName && !patientId) return;
      if (!editCardDesc.trim()) return;

      const tags = editCardTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

      try {
          await api.put(`/case-studies/cards/${selectedCard.id}`, {
              column_id: selectedCard.columnId,
              patient_id: patientId || null,
              title: patientId ? null : patientName,
              description: editCardDesc.trim(),
              tags,
              details: editCardDetails,
              sort_order: 0
          });
          await loadBoardDetail(activeBoardId);
          setIsEditingCard(false);
          setIsCardDetailOpen(false);
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s_ease-out] font-sans pb-20 h-[calc(100vh-6rem)] flex flex-col px-4 sm:px-6 lg:px-0">
      {!activeBoardId ? (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
            <div>
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100"><BookOpen size={20} /></div>
                    {t('cases.boards')}
                </h1>
                <p className="text-slate-400 text-xs mt-1 font-bold">
                    {boardStats.boardCount} quadros · {boardStats.columnCount} colunas · {boardStats.cardCount} casos
                </p>
            </div>
            <Button
                variant="primary"
                leftIcon={<Plus size={16} />}
                onClick={() => setIsBoardModalOpen(true)}
            >
                {t('cases.newBoard')}
            </Button>
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
              <div className="flex gap-4 h-full px-2 min-w-0">
                  {boardLoading && (
                      <div className="w-full flex items-center justify-center text-slate-400 text-sm font-bold py-10">
                          Carregando...
                      </div>
                  )}
                  {activeBoard?.columns.map(col => (
                      <div
                        key={col.id}
                        className="w-[85vw] sm:w-80 flex-shrink-0 flex flex-col bg-slate-50 rounded-2xl border border-slate-200 max-h-full"
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
                                          <button
                                            onClick={() => openEditColumn(col)}
                                            className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg flex items-center gap-2"
                                          >
                                              <FileText size={14} /> Editar
                                          </button>
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
                                          {card.details?.priority && (
                                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                                {card.details.priority}
                                              </span>
                                          )}
                                          {card.details?.risk_level && (
                                              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-md uppercase tracking-wider">
                                                {card.details.risk_level}
                                              </span>
                                          )}
                                      </div>
                                      <h5
                                        className="font-bold text-slate-800 text-sm mb-1 cursor-pointer hover:text-indigo-600"
                                        onClick={() => openCardDetail({ ...card, columnId: col.id })}
                                      >
                                        {card.patientName}
                                      </h5>
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
      <Modal
        isOpen={isBoardModalOpen}
        onClose={() => setIsBoardModalOpen(false)}
        title={t('cases.newBoard')}
        subtitle="Estruture trilhas de acompanhamento clínico."
        maxWidth="md"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsBoardModalOpen(false)}>{t('cases.cancel')}</Button>
            <Button variant="primary" size="sm" onClick={handleAddBoard}>{t('cases.create')}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label={t('cases.boardName')}
            required
            value={newBoardTitle}
            onChange={(e) => setNewBoardTitle(e.target.value)}
            placeholder="Ex: Supervisão Clínica"
          />
          <TextArea
            label={t('cases.desc')}
            rows={3}
            value={newBoardDesc}
            onChange={(e) => setNewBoardDesc(e.target.value)}
            placeholder="Objetivo e foco do quadro..."
          />
        </div>
      </Modal>

      {/* --- MODAL: NEW CARD --- */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={() => { resetCardForm(); setIsCardModalOpen(false); }}
        title="Novo Caso"
        subtitle="Preencha os dados clínicos do caso"
        maxWidth="lg"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => { resetCardForm(); setIsCardModalOpen(false); }}>
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateCard} isLoading={isSavingCard} loadingText="Criando...">
              Criar Caso
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Paciente — Combobox com apenas ativos */}
          <Combobox
            label="Paciente *"
            placeholder="Buscar paciente ativo..."
            options={patients
              .filter((p: any) => p.status === 'ativo' || p.active === true || p.active === 1)
              .map((p: any) => ({ id: String(p.id), label: p.full_name || p.name || '' }))}
            value={newCardPatientId}
            onChange={(val: any, label?: string) => {
              setNewCardPatientId(String(val || ''));
              setNewCardPatientName(label || '');
            }}
            size="md"
          />

          {/* Descrição */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descrição *</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm text-slate-700 placeholder:text-slate-300 resize-none transition-colors"
              rows={3}
              placeholder="Resumo do caso, queixa principal, contexto..."
              value={newCardDesc}
              onChange={(e) => setNewCardDesc(e.target.value)}
            />
          </div>

          {/* Prioridade + Risco */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Prioridade</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium text-slate-700 transition-colors"
                value={newCardDetails.priority}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">Selecione...</option>
                <option value="Baixa">Baixa</option>
                <option value="Media">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Risco / Alerta</label>
              <select
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm font-medium text-slate-700 transition-colors"
                value={newCardDetails.risk_level}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, risk_level: e.target.value }))}
              >
                <option value="">Selecione...</option>
                <option value="Baixo">Baixo</option>
                <option value="Moderado">Moderado</option>
                <option value="Alto">Alto</option>
              </select>
            </div>
          </div>

          {/* Histórico Clínico */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Histórico Clínico</label>
            <textarea
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm text-slate-700 placeholder:text-slate-300 resize-none transition-colors"
              rows={2}
              placeholder="Diagnósticos anteriores, histórico familiar..."
              value={newCardDetails.history}
              onChange={(e) => setNewCardDetails(prev => ({ ...prev, history: e.target.value }))}
            />
          </div>

          {/* Hipóteses + Objetivos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Hipóteses</label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm text-slate-700 placeholder:text-slate-300 resize-none transition-colors"
                rows={2}
                placeholder="Hipóteses diagnósticas..."
                value={newCardDetails.hypothesis}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, hypothesis: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Objetivos Terapêuticos</label>
              <textarea
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm text-slate-700 placeholder:text-slate-300 resize-none transition-colors"
                rows={2}
                placeholder="Metas e objetivos..."
                value={newCardDetails.objectives}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, objectives: e.target.value }))}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tags</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-sm text-slate-700 placeholder:text-slate-300 transition-colors"
              placeholder="TCC, Ansiedade, Luto... (separados por vírgula)"
              value={newCardTags}
              onChange={(e) => setNewCardTags(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      {/* --- MODAL: CARD DETAIL --- */}
      <Modal
        isOpen={isCardDetailOpen && !!selectedCard}
        onClose={() => { setIsCardDetailOpen(false); setSelectedCard(null); setIsEditingCard(false); }}
        title={selectedCard?.patientName || ''}
        subtitle="Detalhes clínicos do caso"
        maxWidth="3xl"
        footer={isEditingCard ? (
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsEditingCard(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleUpdateCard}>Salvar</Button>
          </div>
        ) : (
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setIsEditingCard(true)}>Editar</Button>
          </div>
        )}
      >
        {selectedCard && (
          isEditingCard ? (
            <div className="space-y-4">
              <Combobox
                label="Paciente"
                placeholder="Buscar paciente ativo..."
                options={patients
                  .filter((p: any) => p.status === 'ativo' || p.active === true || p.active === 1)
                  .map((p: any) => ({ id: String(p.id), label: p.full_name || p.name || '' }))}
                value={editCardPatientId}
                onChange={(val: any, label?: string) => {
                  setEditCardPatientId(String(val || ''));
                  setEditCardPatientName(label || '');
                }}
                size="md"
              />
              <TextArea
                label="Resumo / Queixa principal"
                rows={4}
                value={editCardDesc}
                onChange={(e) => setEditCardDesc(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Prioridade"
                  value={editCardDetails.priority}
                  onChange={(e) => setEditCardDetails(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  <option value="Baixa">Baixa</option>
                  <option value="Media">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </Select>
                <Select
                  label="Risco / Alerta"
                  value={editCardDetails.risk_level}
                  onChange={(e) => setEditCardDetails(prev => ({ ...prev, risk_level: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  <option value="Baixo">Baixo</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Alto">Alto</option>
                </Select>
              </div>
              <TextArea label="Histórico Clínico" rows={3} value={editCardDetails.history} onChange={(e) => setEditCardDetails(prev => ({ ...prev, history: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <TextArea label="Hipóteses" rows={3} value={editCardDetails.hypothesis} onChange={(e) => setEditCardDetails(prev => ({ ...prev, hypothesis: e.target.value }))} />
                <TextArea label="Objetivos Terapêuticos" rows={3} value={editCardDetails.objectives} onChange={(e) => setEditCardDetails(prev => ({ ...prev, objectives: e.target.value }))} />
              </div>
              <TextArea label="Intervenções Realizadas" rows={3} value={editCardDetails.interventions} onChange={(e) => setEditCardDetails(prev => ({ ...prev, interventions: e.target.value }))} />
              <TextArea label="Próximos Passos" rows={3} value={editCardDetails.next_steps} onChange={(e) => setEditCardDetails(prev => ({ ...prev, next_steps: e.target.value }))} />
              <TextArea label="Observações" rows={3} value={editCardDetails.observations} onChange={(e) => setEditCardDetails(prev => ({ ...prev, observations: e.target.value }))} />
              <Input label="Tags" placeholder="TCC, Ansiedade... (separados por vírgula)" value={editCardTags} onChange={(e) => setEditCardTags(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                {selectedCard.details?.priority && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">Prioridade: {selectedCard.details.priority}</span>
                )}
                {selectedCard.details?.risk_level && (
                  <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">Risco: {selectedCard.details.risk_level}</span>
                )}
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo / Queixa principal</div>
                <div className="text-sm text-slate-700 whitespace-pre-line">{selectedCard.description || 'Sem resumo.'}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Histórico Clínico', value: selectedCard.details?.history },
                  { label: 'Hipóteses', value: selectedCard.details?.hypothesis },
                  { label: 'Objetivos Terapêuticos', value: selectedCard.details?.objectives },
                  { label: 'Intervenções Realizadas', value: selectedCard.details?.interventions },
                  { label: 'Próximos Passos', value: selectedCard.details?.next_steps },
                  { label: 'Observações', value: selectedCard.details?.observations },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white border border-slate-100 rounded-2xl p-4">
                    <div className="text-xs font-bold text-slate-500 uppercase mb-2">{label}</div>
                    <div className="text-sm text-slate-700 whitespace-pre-line">{value || '-'}</div>
                  </div>
                ))}
              </div>
              {selectedCard.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedCard.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md uppercase tracking-wider">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )
        )}
      </Modal>

      {/* --- MODAL: EDIT COLUMN --- */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Editar Coluna"
        subtitle="Altere o nome e a cor."
        maxWidth="sm"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsColumnModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleUpdateColumn}>Salvar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome"
            value={editingColumnTitle}
            onChange={(e) => setEditingColumnTitle(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-slate-600">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setEditingColumnColor(color)}
                  className={`w-7 h-7 rounded-full ${color} border-2 ${editingColumnColor === color ? 'border-slate-900' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
