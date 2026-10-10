
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  FileText,
  History,
  Layout,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Pencil,
  ClipboardList,
  Brain,
  Rocket,
  Wallet,
  Zap,
  Loader2
} from 'lucide-react';
import { PageWrapper, SectionTitle, ContentCard, FormRow, StatGrid } from '../components/UI/PageWrapper';
import { Badge, ConfirmModal, EmptyState, ModalFooter, StatCard, Tabs } from '../components/UI';

import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { api } from '../services/api';
import { Patient } from '../types';
import { Modal } from '../components/UI/Modal';
import { Button, IconButton } from '../components/UI/Button';
import { Combobox } from '../components/UI/Combobox';
import { Input, Select, Textarea } from '../components/UI/Input';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineViewToggle } from '../components/UI/FilterLine';
import { GridTable } from '../components/UI/GridTable';

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
  title: string;
  description: string;
  tags: string[];
  details?: CaseDetails;
  attachments: Attachment[];
  comments: Comment[];
  createdAt: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  card_type?: string;
  assignee?: string;
  amount?: number;
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
  board_type?: string;
  color?: string;
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

const CARD_TABS = [
  { id: 'geral', label: 'Geral', icon: FileText },
  { id: 'clinico', label: 'Clínico', icon: Brain },
] as const;

const DETAIL_TABS = [
  { id: 'resumo', label: 'Resumo', icon: FileText },
  { id: 'clinico', label: 'Dados clínicos', icon: Brain },
] as const;

export const CaseStudies: React.FC = () => {
  const { t } = useLanguage();
  const { pushToast } = useToast();
  const { user: currentUser, hasPermission } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // View State
  const [currentView, setCurrentView] = useState<'grid' | 'list'>(preferences.caseStudies.viewMode);
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
  const [cardTab, setCardTab] = useState<typeof CARD_TABS[number]['id']>('geral');
  const [detailTab, setDetailTab] = useState<typeof DETAIL_TABS[number]['id']>('resumo');

  // New Item States
  const [newBoardTitle, setNewBoardTitle] = useState('');
  const [newBoardTitleError, setNewBoardTitleError] = useState('');
  const [newBoardDesc, setNewBoardDesc] = useState('');
  const [newBoardType, setNewBoardType] = useState<string>('geral');
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);

  const [newCardTitle, setNewCardTitle] = useState('');
  const [newCardPatientId, setNewCardPatientId] = useState('');
  const [newCardDesc, setNewCardDesc] = useState('');
  const [newCardTags, setNewCardTags] = useState('');
  const [newCardPriority, setNewCardPriority] = useState<'low'|'medium'|'high'|'urgent'>('medium');
  const [newCardDueDate, setNewCardDueDate] = useState('');
  const [newCardType, setNewCardType] = useState('');
  const [newCardAmount, setNewCardAmount] = useState('');
  const [newCardAssignee, setNewCardAssignee] = useState('');
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

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalConfig, setDeleteModalConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const openDeleteModal = (title: string, message: string, onConfirm: () => void) => {
    setDeleteModalConfig({ title, message, onConfirm });
    setIsDeleteModalOpen(true);
  };

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
      setNewCardTitle('');
      setNewCardPatientId('');

      setNewCardDesc('');
      setNewCardTags('');
      setNewCardPriority('medium');
      setNewCardDueDate('');
      setNewCardType('');
      setNewCardAmount('');
      setNewCardAssignee('');
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
      cardCount: row.card_count ?? 0,
      board_type: row.board_type || 'geral',
      color: row.color || undefined,
  });

  const mapBoardDetail = (row: any): CaseBoard => {
      const columns: CaseColumn[] = (row.columns || []).map((c: any) => ({
          id: String(c.id),
          title: c.title,
          color: c.color || 'bg-slate-400',
          cards: (c.cards || []).map((card: any): CaseCard => ({
              id: String(card.id),
              columnId: String(card.column_id),
              patientId: card.patient_id ? String(card.patient_id) : undefined,
              patientName: card.patient_name || '',
              title: card.title || card.patient_name || 'Sem título',
              description: card.description || '',
              tags: parseTags(card.tags_json),
              details: parseDetails(card.details_json),
              attachments: [],
              comments: [],
              createdAt: card.created_at || new Date().toISOString(),
              priority: card.priority || 'medium',
              due_date: card.due_date || undefined,
              card_type: card.card_type || undefined,
              assignee: card.assignee || undefined,
              amount: card.amount || undefined,
          }))
      }));

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
      if (!newBoardTitle.trim()) {
          setNewBoardTitleError('Nome do quadro é obrigatório');
          return;
      }
      setNewBoardTitleError('');
      try {
          if (editingBoardId) {
              await api.put(`/case-studies/boards/${editingBoardId}`, {
                  title: newBoardTitle.trim(),
                  description: newBoardDesc.trim() || null
              });
              pushToast('success', 'Quadro atualizado com sucesso!');
          } else {
              const data = await api.post<{ id: number }>('/case-studies/boards', {
                  title: newBoardTitle.trim(),
                  description: newBoardDesc.trim() || null,
                  board_type: newBoardType,
              });
              const boardId = String(data.id);
              setActiveBoardId(boardId);
              pushToast('success', 'Quadro criado com sucesso!');
          }

          await loadBoards();
          setIsBoardModalOpen(false);
          setNewBoardTitle('');
          setNewBoardDesc('');
          setNewBoardType('geral');
          setEditingBoardId(null);
      } catch (e) {
          console.error(e);
          pushToast('error', 'Erro ao salvar quadro.');
      }
  };

  const openEditBoard = (e: React.MouseEvent, board: CaseBoard) => {
      e.stopPropagation();
      setEditingBoardId(board.id);
      setNewBoardTitle(board.title);
      setNewBoardTitleError('');
      setNewBoardDesc(board.description || '');
      setIsBoardModalOpen(true);
  };

  const handleDeleteBoard = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const board = boards.find(b => b.id === id);
      openDeleteModal(
          'Excluir Quadro',
          `Tem certeza que deseja excluir o quadro "${board?.title || ''}"? Esta ação não pode ser desfeita.`,
          async () => {
              try {
                  await api.delete(`/case-studies/boards/${id}`);
                  setBoards(prev => prev.filter(b => b.id !== id));
                  if (activeBoardId === id) setActiveBoardId(null);
              } catch (err) {
                  console.error(err);
              }
          }
      );
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

  const deleteColumn = (columnId: string) => {
      if (!activeBoardId) return;
      const board = boards.find(b => b.id === activeBoardId);
      const col = board?.columns.find(c => c.id === columnId);
      setOpenColumnMenuId(null);

      const hasCards = col && col.cards.length > 0;
      const message = hasCards
          ? `A coluna "${col?.title || ''}" contém ${col.cards.length} cartão(ões). Deseja excluí-la mesmo assim?`
          : `Tem certeza que deseja excluir a coluna "${col?.title || ''}"?`;

      openDeleteModal('Excluir Coluna', message, async () => {
          try {
              await api.delete(`/case-studies/boards/${activeBoardId}/columns/${columnId}`);
              await loadBoardDetail(activeBoardId);
          } catch (err) {
              console.error(err);
          }
      });
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
      if (!newCardTitle.trim()) {
          pushToast('error', 'Informe um título para o card.');
          return;
      }

      const tags = newCardTags.split(',').map((tg: string) => tg.trim()).filter(Boolean);

      setIsSavingCard(true);
      try {
          await api.post(`/case-studies/boards/${activeBoardId}/cards`, {
              column_id: targetColumnId,
              patient_id: newCardPatientId || null,
              title: newCardTitle.trim(),
              description: newCardDesc.trim() || null,
              tags,
              details: newCardDetails,
              priority: newCardPriority,
              due_date: newCardDueDate || null,
              card_type: newCardType || null,
              amount: newCardAmount ? parseFloat(newCardAmount) : null,
              assignee: newCardAssignee.trim() || null,
              sort_order: activeBoard?.columns.find(c => c.id === targetColumnId)?.cards.length || 0
          });

          await loadBoardDetail(activeBoardId);
          logActivity(`Card criado: "${newCardTitle.trim()}"`);
          pushToast('success', 'Card criado com sucesso!');
          resetCardForm();
          setIsCardModalOpen(false);
      } catch (e) {
          console.error(e);
          pushToast('error', 'Erro ao criar card. Tente novamente.');
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
      setDetailTab('resumo');
      setIsCardDetailOpen(true);
  };

  const handleDeleteCard = () => {
      if (!selectedCard || !activeBoardId) return;
      const card = selectedCard;
      const boardId = activeBoardId;
      openDeleteModal(
          'Excluir Card',
          `Tem certeza que deseja excluir "${card.patientName || card.title}"? Esta ação não pode ser desfeita.`,
          async () => {
              try {
                  await api.delete(`/case-studies/cards/${card.id}`);
                  await loadBoardDetail(boardId);
                  logActivity(`Card excluído: "${card.patientName || card.title}"`);
                  pushToast('success', 'Card excluído com sucesso!');
                  setIsCardDetailOpen(false);
                  setSelectedCard(null);
                  setIsEditingCard(false);
              } catch (err) {
                  console.error(err);
                  pushToast('error', 'Erro ao excluir card.');
              }
          }
      );
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

  const patientOptions = patients
      .filter((p: any) => p.status === 'ativo' || p.active === true || p.active === 1)
      .map((p: any) => ({ value: String(p.id), label: p.full_name || p.name || '' }));

  const closeBoardModal = () => {
      setIsBoardModalOpen(false);
      setEditingBoardId(null);
      setNewBoardTitle('');
      setNewBoardTitleError('');
      setNewBoardDesc('');
      setNewBoardType('geral');
  };

  const closeCardModal = () => {
      resetCardForm();
      setCardTab('geral');
      setIsCardModalOpen(false);
  };

  const isClinicalBoard = activeBoard?.board_type === 'clinico';

  const cardFormContent = (
    <>
        {(!isClinicalBoard || cardTab === 'geral') && (
          <div className="space-y-3">
            {/* Título — comum a todos os tipos */}
            <Input
              label="Título *"
              placeholder="Ex: Sessão de avaliação, Cobrança pendente, Entrega do relatório..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
            />

            {/* Paciente — só faz sentido em quadros clínicos ou gerais da clínica */}
            {activeBoard?.board_type !== 'projeto' && activeBoard?.board_type !== 'atividade' && (
              <Combobox
                label={`Paciente${isClinicalBoard ? ' *' : ' (opcional)'}`}
                placeholder="Buscar paciente ativo..."
                options={patientOptions}
                value={newCardPatientId}
                onChange={(val: any) => {
                  setNewCardPatientId(String(val || ''));
                }}
                size="md"
              />
            )}

            <FormRow cols={2}>
              {/* Responsável — projeto, financeiro e atividade */}
              {(activeBoard?.board_type === 'projeto' || activeBoard?.board_type === 'financeiro' || activeBoard?.board_type === 'atividade') && (
                <Input
                  label="Responsável"
                  placeholder="Quem vai executar/acompanhar..."
                  value={newCardAssignee}
                  onChange={(e) => setNewCardAssignee(e.target.value)}
                />
              )}

              {/* Valor — só financeiro */}
              {activeBoard?.board_type === 'financeiro' && (
                <Input
                  label="Valor (R$)"
                  type="number"
                  placeholder="0,00"
                  value={newCardAmount}
                  onChange={(e) => setNewCardAmount(e.target.value)}
                />
              )}

              {/* Prioridade + Data de entrega — comum a todos */}
              <Select
                label="Prioridade"
                value={newCardDetails.priority}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, priority: e.target.value }))}
              >
                <option value="">Selecione...</option>
                <option value="Baixa">Baixa</option>
                <option value="Media">Média</option>
                <option value="Alta">Alta</option>
                <option value="Urgente">Urgente</option>
              </Select>
              <Input
                label="Data de entrega"
                type="date"
                value={newCardDueDate}
                onChange={(e) => setNewCardDueDate(e.target.value)}
              />
            </FormRow>

            {/* Descrição */}
            <Textarea
              label={`Descrição${isClinicalBoard ? ' *' : ' (opcional)'}`}
              rows={3}
              placeholder={isClinicalBoard ? 'Resumo do caso, queixa principal, contexto...' : 'Detalhes adicionais...'}
              value={newCardDesc}
              onChange={(e) => setNewCardDesc(e.target.value)}
            />

            {/* Tags */}
            <Input
              label="Tags"
              placeholder="TCC, Ansiedade, Luto... (separados por vírgula)"
              value={newCardTags}
              onChange={(e) => setNewCardTags(e.target.value)}
            />
          </div>
        )}

        {/* Campos clínicos — só quadro do tipo Clínico */}
        {isClinicalBoard && cardTab === 'clinico' && (
          <div className="space-y-3">
            <Select
              label="Risco / Alerta"
              value={newCardDetails.risk_level}
              onChange={(e) => setNewCardDetails(prev => ({ ...prev, risk_level: e.target.value }))}
            >
              <option value="">Selecione...</option>
              <option value="Baixo">Baixo</option>
              <option value="Moderado">Moderado</option>
              <option value="Alto">Alto</option>
            </Select>

            <Textarea
              label="Histórico Clínico"
              rows={2}
              placeholder="Diagnósticos anteriores, histórico familiar..."
              value={newCardDetails.history}
              onChange={(e) => setNewCardDetails(prev => ({ ...prev, history: e.target.value }))}
            />

            <FormRow cols={2}>
              <Textarea
                label="Hipóteses"
                rows={2}
                placeholder="Hipóteses diagnósticas..."
                value={newCardDetails.hypothesis}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, hypothesis: e.target.value }))}
              />
              <Textarea
                label="Objetivos Terapêuticos"
                rows={2}
                placeholder="Metas e objetivos..."
                value={newCardDetails.objectives}
                onChange={(e) => setNewCardDetails(prev => ({ ...prev, objectives: e.target.value }))}
              />
            </FormRow>
          </div>
        )}
    </>
  );

  return (
    <PageWrapper>
      <div className="space-y-4">

      {!activeBoardId ? (
        <SectionTitle
          icon={BookOpen}
          title={t('cases.boards')}
          description={`${boardStats.boardCount} quadros · ${boardStats.columnCount} colunas · ${boardStats.cardCount} casos`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>
                Voltar
              </Button>
              <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setIsBoardModalOpen(true)}>
                {t('cases.newBoard')}
              </Button>
            </div>
          }
        />
      ) : (
        <SectionTitle
          icon={BookOpen}
          title={activeBoard?.title || ''}
          description={activeBoard?.description || undefined}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => setActiveBoardId(null)}>
                Quadros
              </Button>
              <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={handleAddColumn}>
                {t('cases.addColumn')}
              </Button>
            </div>
          }
        />
      )}

      {!activeBoardId ? (
          <div className="space-y-4">
              <StatGrid cols={3}>
                  <StatCard title="Quadros" value={boardStats.boardCount} icon={Layout} color="default" />
                  <StatCard title="Colunas" value={boardStats.columnCount} icon={BookOpen} color="info" />
                  <StatCard title="Casos" value={boardStats.cardCount} icon={FileText} color="success" />
              </StatGrid>

              <FilterLine>
                  <FilterLineSection grow>
                      <FilterLineItem grow minWidth={200}>
                          <FilterLineSearch
                            value={boardSearch}
                            onChange={setBoardSearch}
                            placeholder="Buscar quadro por nome ou descrição"
                            aria-label="Buscar quadro"
                          />
                      </FilterLineItem>
                  </FilterLineSection>
                  <FilterLineSection>
                      <FilterLineItem>
                          <FilterLineViewToggle
                            value={currentView}
                            onChange={(v) => {
                                const mode = v as 'grid' | 'list';
                                setCurrentView(mode);
                                updatePreference('caseStudies', { viewMode: mode });
                            }}
                            gridValue="grid"
                            listValue="list"
                          />
                      </FilterLineItem>
                  </FilterLineSection>
              </FilterLine>

              {isLoading ? (
                  <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                      <Loader2 size={18} className="animate-spin" />Carregando…
                  </div>
              ) : currentView === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredBoards.map(board => (
                          <div
                            key={board.id}
                            onClick={() => setActiveBoardId(board.id)}
                            className="group bg-white rounded-lg border border-slate-200 hover:border-primary-200 transition-colors cursor-pointer relative overflow-hidden"
                          >
                              <div className="p-3 lg:p-4">
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center font-medium text-sm">
                                          {board.title.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                          <IconButton variant="ghost" size="xs" aria-label="Editar quadro" title="Editar" onClick={(e) => openEditBoard(e, board)}>
                                            <Pencil size={14} />
                                          </IconButton>
                                          <IconButton variant="danger" size="xs" aria-label="Excluir quadro" title="Excluir" onClick={(e) => handleDeleteBoard(e, board.id)}>
                                            <Trash2 size={14} />
                                          </IconButton>
                                      </div>

                                  </div>
                                  <h3 className="text-sm font-medium text-slate-800 mb-1 group-hover:text-primary-700 transition-colors truncate">{board.title}</h3>
                                  <p className="text-xs text-slate-500 mb-3 line-clamp-2 min-h-[2rem]">{board.description || 'Sem descrição'}</p>

                                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
                                      <div className="flex items-center gap-3">
                                          <span className="flex items-center gap-1"><Layout size={12} /> {getBoardColumnCount(board)} col.</span>
                                          <span className="flex items-center gap-1"><FileText size={12} /> {getBoardCardCount(board)} casos</span>
                                      </div>
                                      <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(board.createdAt).toLocaleDateString('pt-BR')}</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <ContentCard padding="none" className="overflow-hidden">
                  <GridTable<CaseBoard>
                    data={filteredBoards}
                    keyExtractor={(b) => b.id}
                    onRowClick={(b) => setActiveBoardId(b.id)}
                    emptyMessage="Nenhum quadro encontrado"
                    columns={[
                      {
                        header: 'Quadro',
                        render: (board) => (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center font-medium text-xs shrink-0">
                              {board.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-slate-800 truncate">{board.title}</div>
                              {board.description && <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{board.description}</div>}
                            </div>
                          </div>
                        ),
                      },
                      {
                        header: 'Colunas',
                        className: 'hidden sm:table-cell',
                        headerClassName: 'hidden sm:table-cell',
                        render: (board) => (
                          <span className="flex items-center gap-1 text-xs text-slate-600"><Layout size={12} /> {getBoardColumnCount(board)}</span>
                        ),
                      },
                      {
                        header: 'Casos',
                        className: 'hidden sm:table-cell',
                        headerClassName: 'hidden sm:table-cell',
                        render: (board) => (
                          <span className="flex items-center gap-1 text-xs text-slate-600"><FileText size={12} /> {getBoardCardCount(board)}</span>
                        ),
                      },
                      {
                        header: 'Criado em',
                        className: 'hidden md:table-cell',
                        headerClassName: 'hidden md:table-cell',
                        render: (board) => (
                          <span className="text-xs text-slate-600 whitespace-nowrap">{new Date(board.createdAt).toLocaleDateString('pt-BR')}</span>
                        ),
                      },
                      {
                        header: '',
                        className: 'text-right',
                        render: (board) => (
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <IconButton variant="ghost" size="xs" aria-label="Editar quadro" title="Editar" onClick={(e) => openEditBoard(e, board)}>
                              <Pencil size={14} />
                            </IconButton>
                            <IconButton variant="danger" size="xs" aria-label="Excluir quadro" title="Excluir" onClick={(e) => handleDeleteBoard(e, board.id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          </div>
                        ),
                      },
                    ]}
                  />
                  </ContentCard>
              )}

              {!isLoading && filteredBoards.length === 0 && (
                  <ContentCard>
                      <EmptyState icon={Layout} title="Nenhum quadro encontrado" description="Crie um novo quadro ou ajuste a busca." />
                  </ContentCard>
              )}
          </div>
      ) : (
          <div className="space-y-3">
              <FilterLine>
                  <FilterLineSection grow>
                      <FilterLineItem grow minWidth={200}>
                          <FilterLineSearch
                            value={cardSearch}
                            onChange={setCardSearch}
                            placeholder="Buscar caso ou tag..."
                            aria-label="Buscar caso ou tag"
                          />
                      </FilterLineItem>
                  </FilterLineSection>
                  {history.length > 0 && (
                      <FilterLineSection align="right">
                          <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-[11px] text-slate-500">
                              <History size={12} />
                              <span className="font-medium">{history[0].time}:</span>
                              <span className="truncate max-w-[200px]">{history[0].msg}</span>
                          </div>
                      </FilterLineSection>
                  )}
              </FilterLine>

          <div className="overflow-x-auto">
              <div className="flex gap-3 min-w-max pb-3" style={{ minHeight: 'calc(100vh - 260px)' }}>
                  {boardLoading ? (
                      <div role="status" className="flex items-center justify-center gap-2 text-slate-500 text-sm py-10 w-64">
                          <Loader2 size={18} className="animate-spin" />Carregando…
                      </div>
                  ) : activeBoard?.columns.map(col => {
                      const filtered = col.cards.filter(card => {
                          if (!cardSearch.trim()) return true;
                          const q = cardSearch.toLowerCase();
                          return card.patientName.toLowerCase().includes(q)
                              || card.description.toLowerCase().includes(q)
                              || card.tags.some(tag => tag.toLowerCase().includes(q));
                      });
                      return (
                          <div
                            key={col.id}
                            className="w-[268px] flex-shrink-0 flex flex-col bg-slate-50/80 rounded-lg border border-slate-200 max-h-full"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                          >
                              {/* Header da coluna */}
                              <div className="px-3 py-2.5 flex items-center justify-between shrink-0 group/col-header border-b border-slate-200/70">
                                  <div className="flex items-center gap-2 min-w-0">
                                      <div className={`w-2 h-2 rounded-full shrink-0 ${col.color}`} />
                                      <span className="text-xs font-medium text-slate-600 truncate">{col.title}</span>
                                      <span className="text-[11px] text-slate-500 shrink-0">{col.cards.length}</span>
                                  </div>
                                  <div className="relative shrink-0">
                                      <IconButton
                                        variant="ghost"
                                        size="xs"
                                        aria-label="Opções da coluna"
                                        onClick={() => setOpenColumnMenuId(openColumnMenuId === col.id ? null : col.id)}
                                      >
                                          <MoreHorizontal size={14} />
                                      </IconButton>
                                      {openColumnMenuId === col.id && (
                                          <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-sm border border-slate-200 p-1 z-20 w-32">
                                              <button type="button" onClick={() => openEditColumn(col)} className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 rounded-md flex items-center gap-2">
                                                  <FileText size={14} /> Editar
                                              </button>
                                              <button type="button" onClick={() => deleteColumn(col.id)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-md flex items-center gap-2">
                                                  <Trash2 size={14} /> Excluir
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </div>

                              {/* Cards */}
                              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                  {filtered.map(card => (
                                      <div
                                        key={card.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, card, col.id)}
                                        onClick={() => openCardDetail({ ...card, columnId: col.id })}
                                        className="bg-white p-3 rounded-lg border border-slate-200 cursor-pointer hover:border-primary-200 transition-colors group/card"
                                      >
                                          {(card.tags.length > 0 || card.details?.priority || card.details?.risk_level) && (
                                              <div className="flex flex-wrap gap-1 mb-2">
                                                  {card.tags.map(tag => (
                                                      <Badge key={tag} color="default" size="sm">{tag}</Badge>
                                                  ))}
                                                  {card.details?.priority && (
                                                      <Badge color="primary" size="sm">{card.details.priority}</Badge>
                                                  )}
                                                  {card.details?.risk_level && (
                                                      <Badge color="danger" size="sm">{card.details.risk_level}</Badge>
                                                  )}
                                              </div>
                                          )}
                                          <p className="font-medium text-slate-800 text-xs leading-snug mb-1 group-hover/card:text-primary-700 transition-colors">
                                              {card.patientName}
                                          </p>
                                          {card.description && (
                                              <p className="text-[11px] text-slate-500 line-clamp-2 mb-2">{card.description}</p>
                                          )}
                                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                  {card.attachments.length > 0 && (
                                                      <span className="flex items-center gap-1"><Paperclip size={12} /> {card.attachments.length}</span>
                                                  )}
                                                  {card.comments.length > 0 && (
                                                      <span className="flex items-center gap-1"><MessageSquare size={12} /> {card.comments.length}</span>
                                                  )}
                                              </div>
                                              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[11px] font-medium">
                                                  {card.patientName.charAt(0).toUpperCase()}
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                  {col.cards.length === 0 && (
                                      <p className="text-center text-[11px] text-slate-500 py-8">Sem casos</p>
                                  )}
                                  {col.cards.length > 0 && cardSearch.trim() && filtered.length === 0 && (
                                      <p className="text-center text-[11px] text-slate-500 py-8">Sem resultados</p>
                                  )}
                              </div>

                              {/* Botão adicionar */}
                              <div className="p-2 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    fullWidth
                                    iconLeft={<Plus size={14} />}
                                    onClick={() => { setTargetColumnId(col.id); setCardTab('geral'); setIsCardModalOpen(true); }}
                                  >
                                      {t('cases.newCard')}
                                  </Button>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
          </div>
      )}

      </div>

      {/* --- MODAL: NEW BOARD --- */}
      <Modal
        isOpen={isBoardModalOpen}
        onClose={closeBoardModal}
        title={editingBoardId ? 'Editar Quadro' : 'Novo Quadro'}
        size="md"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={closeBoardModal}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleAddBoard}>{editingBoardId ? 'Salvar Alterações' : 'Criar Quadro'}</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nome do Quadro"
            required
            error={newBoardTitleError}
            value={newBoardTitle}
            onChange={(e) => { setNewBoardTitle(e.target.value); if (newBoardTitleError) setNewBoardTitleError(''); }}
            placeholder="Ex: Acompanhamento Clínico, Projetos da Clínica..."
          />
          {!editingBoardId && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de Quadro</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {([
                  { value: 'geral',      label: 'Geral',       icon: ClipboardList, desc: 'A Fazer · Em Progresso · Concluído' },
                  { value: 'clinico',    label: 'Clínico',     icon: Brain,         desc: 'Avaliação · Acompanhamento · Alta' },
                  { value: 'projeto',    label: 'Projeto',     icon: Rocket,        desc: 'Backlog · Andamento · Revisão · Entregue' },
                  { value: 'financeiro', label: 'Financeiro',  icon: Wallet,        desc: 'A Receber · Recebido · A Pagar · Pago' },
                  { value: 'atividade',  label: 'Atividade',   icon: Zap,           desc: 'Planejado · Execução · Finalizado' },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewBoardType(opt.value)}
                    aria-pressed={newBoardType === opt.value}
                    className={`p-3 rounded-lg border text-left transition-colors ${newBoardType === opt.value ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                  >
                    <opt.icon size={16} className={`mb-1 ${newBoardType === opt.value ? 'text-primary-600' : 'text-slate-500'}`} />
                    <div className={`text-xs font-medium ${newBoardType === opt.value ? 'text-primary-700' : 'text-slate-700'}`}>{opt.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <Textarea
            label="Descrição (opcional)"
            rows={2}
            value={newBoardDesc}
            onChange={(e) => setNewBoardDesc(e.target.value)}
            placeholder="Objetivo e foco do quadro..."
          />
        </div>
      </Modal>

      {/* --- MODAL: NEW CARD --- */}
      <Modal
        isOpen={isCardModalOpen}
        onClose={closeCardModal}
        title={isClinicalBoard ? 'Novo Caso' : 'Novo Card'}
        size="xl"
        mobileStyle="fullscreen"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={closeCardModal}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSavingCard}
              disabled={isSavingCard}
              onClick={() => {
                if (!newCardTitle.trim()) setCardTab('geral');
                handleCreateCard();
              }}
            >
              {isClinicalBoard ? 'Criar Caso' : 'Criar Card'}
            </Button>
          </ModalFooter>
        }
      >
        {isClinicalBoard ? (
          <Tabs<typeof CARD_TABS[number]['id']> items={CARD_TABS} value={cardTab} onChange={setCardTab} label="Seções do card">
            {cardFormContent}
          </Tabs>
        ) : cardFormContent}
      </Modal>

      {/* --- MODAL: CARD DETAIL --- */}
      <Modal
        isOpen={isCardDetailOpen && !!selectedCard}
        onClose={() => { setIsCardDetailOpen(false); setSelectedCard(null); setIsEditingCard(false); setDetailTab('resumo'); }}
        title={selectedCard?.patientName || ''}
        size="xl"
        mobileStyle="fullscreen"
        footer={isEditingCard ? (
          <ModalFooter align="between">
            <Button variant="danger" size="sm" iconLeft={<Trash2 size={14} />} onClick={handleDeleteCard}>Excluir</Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingCard(false)}>Cancelar</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if ((!editCardPatientName.trim() && !editCardPatientId) || !editCardDesc.trim()) setDetailTab('resumo');
                  handleUpdateCard();
                }}
              >
                Salvar
              </Button>
            </div>
          </ModalFooter>
        ) : (
          <ModalFooter align="between">
            <Button variant="danger" size="sm" iconLeft={<Trash2 size={14} />} onClick={handleDeleteCard}>Excluir</Button>
            <Button variant="outline" size="sm" iconLeft={<Pencil size={14} />} onClick={() => setIsEditingCard(true)}>Editar</Button>
          </ModalFooter>
        )}
      >
        {selectedCard && (
          <Tabs<typeof DETAIL_TABS[number]['id']> items={DETAIL_TABS} value={detailTab} onChange={setDetailTab} label="Seções do caso">
            {isEditingCard ? (
              detailTab === 'resumo' ? (
                <div className="space-y-3">
                  <Combobox
                    label="Paciente"
                    placeholder="Buscar paciente ativo..."
                    options={patientOptions}
                    value={editCardPatientId}
                    onChange={(val: any, label?: string) => {
                      setEditCardPatientId(String(val || ''));
                      setEditCardPatientName(label || '');
                    }}
                    size="md"
                  />
                  <Textarea
                    label="Resumo / Queixa principal"
                    rows={4}
                    value={editCardDesc}
                    onChange={(e) => setEditCardDesc(e.target.value)}
                  />
                  <FormRow cols={2}>
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
                  </FormRow>
                  <Input label="Tags" placeholder="TCC, Ansiedade... (separados por vírgula)" value={editCardTags} onChange={(e) => setEditCardTags(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-3">
                  <Textarea label="Histórico Clínico" rows={3} value={editCardDetails.history} onChange={(e) => setEditCardDetails(prev => ({ ...prev, history: e.target.value }))} />
                  <FormRow cols={2}>
                    <Textarea label="Hipóteses" rows={3} value={editCardDetails.hypothesis} onChange={(e) => setEditCardDetails(prev => ({ ...prev, hypothesis: e.target.value }))} />
                    <Textarea label="Objetivos Terapêuticos" rows={3} value={editCardDetails.objectives} onChange={(e) => setEditCardDetails(prev => ({ ...prev, objectives: e.target.value }))} />
                  </FormRow>
                  <Textarea label="Intervenções Realizadas" rows={3} value={editCardDetails.interventions} onChange={(e) => setEditCardDetails(prev => ({ ...prev, interventions: e.target.value }))} />
                  <Textarea label="Próximos Passos" rows={3} value={editCardDetails.next_steps} onChange={(e) => setEditCardDetails(prev => ({ ...prev, next_steps: e.target.value }))} />
                  <Textarea label="Observações" rows={3} value={editCardDetails.observations} onChange={(e) => setEditCardDetails(prev => ({ ...prev, observations: e.target.value }))} />
                </div>
              )
            ) : (
              detailTab === 'resumo' ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.details?.priority && (
                      <Badge color="primary">Prioridade: {selectedCard.details.priority}</Badge>
                    )}
                    {selectedCard.details?.risk_level && (
                      <Badge color="danger">Risco: {selectedCard.details.risk_level}</Badge>
                    )}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs font-medium text-slate-600 mb-1.5">Resumo / Queixa principal</div>
                    <div className="text-xs text-slate-700 whitespace-pre-line">{selectedCard.description || 'Sem resumo.'}</div>
                  </div>
                  {selectedCard.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCard.tags.map(tag => (
                        <Badge key={tag} color="default" size="sm">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Histórico Clínico', value: selectedCard.details?.history },
                    { label: 'Hipóteses', value: selectedCard.details?.hypothesis },
                    { label: 'Objetivos Terapêuticos', value: selectedCard.details?.objectives },
                    { label: 'Intervenções Realizadas', value: selectedCard.details?.interventions },
                    { label: 'Próximos Passos', value: selectedCard.details?.next_steps },
                    { label: 'Observações', value: selectedCard.details?.observations },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white border border-slate-200 rounded-lg p-3">
                      <div className="text-xs font-medium text-slate-600 mb-1.5">{label}</div>
                      <div className="text-xs text-slate-700 whitespace-pre-line">{value || '-'}</div>
                    </div>
                  ))}
                </div>
              )
            )}
          </Tabs>
        )}
      </Modal>

      {/* --- MODAL: DELETE CONFIRMATION --- */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title={deleteModalConfig?.title || 'Excluir'}
        message={deleteModalConfig?.message || ''}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => {
          deleteModalConfig?.onConfirm();
          setIsDeleteModalOpen(false);
        }}
      />

      {/* --- MODAL: EDIT COLUMN --- */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Editar Coluna"
        size="sm"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setIsColumnModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={handleUpdateColumn}>Salvar</Button>
          </ModalFooter>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nome"
            value={editingColumnTitle}
            onChange={(e) => setEditingColumnTitle(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Cor ${color.replace('bg-', '')}`}
                  aria-pressed={editingColumnColor === color}
                  onClick={() => setEditingColumnColor(color)}
                  className={`w-7 h-7 rounded-full ${color} border-2 ${editingColumnColor === color ? 'border-slate-900' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};
