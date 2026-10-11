import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Archive, ArchiveRestore, ArrowLeft, ArrowRight, BookOpen, CalendarPlus, ChevronsLeftRight, Copy, ExternalLink,
  FileText, Layout, List, Loader2, Palette, Pencil, Plus, Receipt, Stethoscope, Trash2, User,
} from 'lucide-react';
import { PageWrapper, SectionTitle, ContentCard, StatGrid } from '../components/UI/PageWrapper';
import { Badge, ConfirmModal, EmptyState, ModalFooter, StatCard, Tabs } from '../components/UI';

import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { api } from '../services/api';
import { Modal } from '../components/UI/Modal';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { FilterLine, FilterLineSection, FilterLineItem, FilterLineSearch, FilterLineViewToggle } from '../components/UI/FilterLine';
import { FilterPopover } from '../components/UI/FilterPopover';
import { GridTable } from '../components/UI/GridTable';
import { ActionMenu, ActionMenuItem } from '../components/Boards/ActionMenu';
import { BoardCardData, BoardCardView, fieldDisplay, isCardOverdue } from '../components/Boards/BoardCard';
import { BoardCreateModal, BoardFormValue } from '../components/Boards/BoardCreateModal';
import { CardForm, CardFormTab } from '../components/Boards/CardForm';
import { LinkChips } from '../components/Boards/CardLinks';
import { ColorPicker } from '../components/Boards/ColorPicker';
import {
  BoardTypeDef, CardDraft, CardLink, COLOR_PALETTE, PRIORITIES, emptyDraft, formatDate, formatMoney, getTypeDef,
  iconForBoard, normalizePriority, resolveColor, tint,
} from '../components/Boards/boardConfig';

// --- Types ---
interface ColumnData {
  id: string;
  title: string;
  color: string;
  cards: BoardCardData[];
}

interface BoardData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  columns: ColumnData[];
  columnCount: number;
  cardCount: number;
  board_type: string;
  color?: string;
  icon?: string;
  archived: boolean;
}

interface Filters { assignee: string; color: string; tag: string; patient: string; due: string }
const FILTERS_EMPTY: Filters = { assignee: '', color: '', tag: '', patient: '', due: '' };

const BOARD_VIEW_TABS = [
  { id: 'quadro', label: 'Quadro', icon: Layout },
  { id: 'lista', label: 'Lista', icon: List },
] as const;

const BOARDS_TABS = [
  { id: 'ativos', label: 'Ativos', icon: BookOpen },
  { id: 'arquivados', label: 'Arquivados', icon: Archive },
] as const;

const parseJson = <T,>(value: any, fallback: T): T => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value !== 'string') return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

const parseTags = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
  }
  return [];
};

const mapCard = (card: any): BoardCardData => {
  const details = parseJson<Record<string, any>>(card.details_json, {});
  const dbPriority = card.priority && card.priority !== 'medium' ? card.priority : '';
  return {
    id: String(card.id),
    columnId: String(card.column_id),
    title: card.title || card.patient_name || 'Sem título',
    patientId: card.patient_id ? String(card.patient_id) : undefined,
    patientName: card.patient_name || '',
    description: card.description || '',
    tags: parseTags(card.tags_json),
    color: card.color || '',
    priority: normalizePriority(details.priority) || dbPriority,
    due_date: card.due_date ? String(card.due_date).slice(0, 10) : undefined,
    assignee: card.assignee || undefined,
    amount: card.amount !== null && card.amount !== undefined && card.amount !== '' ? Number(card.amount) : undefined,
    details: details && typeof details === 'object' ? details : {},
    checklist: parseJson(card.checklist_json, []),
    links: parseJson<CardLink[]>(card.links_json, []),
    createdAt: card.created_at || new Date().toISOString(),
  };
};

const mapSummary = (row: any): BoardData => ({
  id: String(row.id),
  title: row.title,
  description: row.description || '',
  createdAt: row.created_at || new Date().toISOString(),
  columns: [],
  columnCount: Number(row.column_count ?? 0),
  cardCount: Number(row.card_count ?? 0),
  board_type: row.board_type || 'geral',
  color: row.color || undefined,
  icon: row.icon || undefined,
  archived: !!row.archived,
});

const mapDetail = (row: any): BoardData => {
  const columns: ColumnData[] = (row.columns || []).map((c: any) => ({
    id: String(c.id),
    title: c.title,
    color: resolveColor(c.color),
    cards: (c.cards || []).map(mapCard),
  }));
  return {
    ...mapSummary(row),
    columns,
    columnCount: columns.length,
    cardCount: columns.reduce((sum, c) => sum + c.cards.length, 0),
  };
};

const draftFromCard = (card: BoardCardData): CardDraft => ({
  title: card.title,
  description: card.description,
  tags: card.tags.join(', '),
  patientId: card.patientId || '',
  patientName: card.patientName,
  color: card.color,
  priority: normalizePriority(card.priority),
  assignee: card.assignee || '',
  due_date: card.due_date || '',
  amount: card.amount !== undefined ? String(card.amount) : '',
  details: { ...card.details },
  checklist: card.checklist,
  links: card.links,
});

const formatHours = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const colorName = (hex: string) => COLOR_PALETTE.find(c => c.hex === hex)?.name || hex;

export const CaseStudies: React.FC = () => {
  const { t } = useLanguage();
  const { pushToast } = useToast();
  const { hasPermission } = useAuth();
  const { preferences, updatePreference } = useUserPreferences();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Boards list
  const [boards, setBoards] = useState<BoardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [boardSearch, setBoardSearch] = useState('');
  const [boardsTab, setBoardsTab] = useState<typeof BOARDS_TABS[number]['id']>('ativos');
  const [listView, setListView] = useState<'grid' | 'list'>(preferences.caseStudies.viewMode);

  // Active board
  const [activeBoardId, setActiveBoardId] = useState<string | null>(() => searchParams.get('board'));
  const [detail, setDetail] = useState<BoardData | null>(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardView, setBoardView] = useState<typeof BOARD_VIEW_TABS[number]['id']>('quadro');
  const [cardSearch, setCardSearch] = useState('');
  const [filters, setFilters] = useState<Filters>(FILTERS_EMPTY);
  const [draftFilters, setDraftFilters] = useState<Filters>(FILTERS_EMPTY);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [draggedCard, setDraggedCard] = useState<{ id: string; from: string } | null>(null);
  const [dropColumnId, setDropColumnId] = useState<string | null>(null);

  // Board modal
  const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardData | null>(null);
  const [savingBoard, setSavingBoard] = useState(false);

  // Card modal
  const [cardModal, setCardModal] = useState<{ card: BoardCardData | null; columnId: string } | null>(null);
  const [draft, setDraft] = useState<CardDraft>(emptyDraft());
  const [cardTab, setCardTab] = useState<CardFormTab>('geral');
  const [applyToColumn, setApplyToColumn] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [patientError, setPatientError] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);

  // Column modal
  const [columnModal, setColumnModal] = useState<{ id: string | null; title: string; color: string } | null>(null);

  // Delete confirmation
  const [deleteConfig, setDeleteConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const activeBoard = detail && detail.id === activeBoardId ? detail : null;
  const def: BoardTypeDef = getTypeDef(activeBoard?.board_type);

  // --- Loading ---
  const loadBoards = async () => {
    try {
      const data = await api.get<any[]>('/case-studies/boards');
      setBoards(Array.isArray(data) ? data.map(mapSummary) : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadBoardDetail = async (boardId: string, silent = false) => {
    if (!silent) setBoardLoading(true);
    try {
      const data = await api.get<any>(`/case-studies/boards/${boardId}`);
      setDetail(mapDetail(data));
    } catch (e) {
      console.error(e);
      if (!silent) pushToast('error', 'Não foi possível carregar o quadro.');
    } finally {
      setBoardLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await api.get<any[]>('/patients');
      const list = Array.isArray(data) ? data : [];
      setPatientOptions(
        list
          .filter((p: any) => p.status === 'active' || p.status === 'ativo' || p.active === true || p.active === 1 || p.status === undefined)
          .map((p: any) => ({ value: String(p.id), label: p.full_name || p.name || '' }))
          .filter(o => o.label)
      );
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
      setDetail(null);
      setSearchParams({}, { replace: true });
    }
  }, [activeBoardId]);

  const backToBoards = () => {
    setActiveBoardId(null);
    setCardSearch('');
    setFilters(FILTERS_EMPTY);
    void loadBoards();
  };

  // --- Board actions ---
  const openNewBoard = () => { setEditingBoard(null); setIsBoardModalOpen(true); };
  const openEditBoard = (board: BoardData) => { setEditingBoard(board); setIsBoardModalOpen(true); };

  const submitBoard = async (value: BoardFormValue) => {
    setSavingBoard(true);
    try {
      if (editingBoard) {
        await api.put(`/case-studies/boards/${editingBoard.id}`, {
          title: value.title,
          description: value.description || null,
          color: value.color || null,
          icon: value.icon || null,
        });
        pushToast('success', 'Quadro atualizado com sucesso!');
        await loadBoards();
        if (activeBoardId === editingBoard.id) await loadBoardDetail(editingBoard.id, true);
      } else {
        const created = await api.post<{ id: number }>('/case-studies/boards', {
          title: value.title,
          description: value.description || null,
          board_type: value.board_type,
          color: value.color || null,
          icon: value.icon || null,
          columns: value.columns,
        });
        pushToast('success', 'Quadro criado com sucesso!');
        await loadBoards();
        setActiveBoardId(String(created.id));
      }
      setIsBoardModalOpen(false);
      setEditingBoard(null);
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao salvar quadro.');
    } finally {
      setSavingBoard(false);
    }
  };

  const duplicateBoard = async (board: BoardData) => {
    try {
      await api.post(`/case-studies/boards/${board.id}/duplicate`, { with_cards: false });
      pushToast('success', 'Quadro duplicado (colunas copiadas, sem cartões).');
      await loadBoards();
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao duplicar quadro.');
    }
  };

  const archiveBoard = async (board: BoardData, archived: boolean) => {
    try {
      await api.patch(`/case-studies/boards/${board.id}/archive`, { archived });
      pushToast('success', archived ? 'Quadro arquivado.' : 'Quadro restaurado.');
      if (archived && activeBoardId === board.id) setActiveBoardId(null);
      await loadBoards();
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao atualizar quadro.');
    }
  };

  const deleteBoard = (board: BoardData) => {
    setDeleteConfig({
      title: 'Excluir quadro',
      message: `Tem certeza que deseja excluir o quadro "${board.title}" e todos os seus cartões? Esta ação não pode ser desfeita. Se preferir guardar, use Arquivar.`,
      onConfirm: async () => {
        try {
          await api.delete(`/case-studies/boards/${board.id}`);
          setBoards(prev => prev.filter(b => b.id !== board.id));
          if (activeBoardId === board.id) setActiveBoardId(null);
          pushToast('success', 'Quadro excluído.');
        } catch (err) {
          console.error(err);
          pushToast('error', 'Erro ao excluir quadro.');
        }
      },
    });
  };

  const boardMenu = (board: BoardData): ActionMenuItem[] => [
    { key: 'open', label: 'Abrir', icon: ExternalLink, onClick: () => setActiveBoardId(board.id) },
    { key: 'edit', label: 'Editar', icon: Pencil, onClick: () => openEditBoard(board) },
    { key: 'dup', label: 'Duplicar quadro', icon: Copy, onClick: () => duplicateBoard(board) },
    board.archived
      ? { key: 'arch', label: 'Restaurar', icon: ArchiveRestore, onClick: () => archiveBoard(board, false) }
      : { key: 'arch', label: 'Arquivar', icon: Archive, onClick: () => archiveBoard(board, true) },
    { key: 'del', label: 'Excluir', icon: Trash2, danger: true, separated: true, onClick: () => deleteBoard(board) },
  ];

  // --- Column actions ---
  const saveColumn = async () => {
    if (!activeBoardId || !columnModal || !columnModal.title.trim()) return;
    try {
      if (columnModal.id) {
        await api.put(`/case-studies/boards/${activeBoardId}/columns/${columnModal.id}`, { title: columnModal.title.trim(), color: columnModal.color });
      } else {
        await api.post(`/case-studies/boards/${activeBoardId}/columns`, { title: columnModal.title.trim(), color: columnModal.color });
      }
      await loadBoardDetail(activeBoardId, true);
      setColumnModal(null);
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao salvar coluna.');
    }
  };

  const deleteColumn = (col: ColumnData) => {
    if (!activeBoardId) return;
    const boardId = activeBoardId;
    setDeleteConfig({
      title: 'Excluir coluna',
      message: col.cards.length > 0
        ? `A coluna "${col.title}" contém ${col.cards.length} cartão(ões), que também serão excluídos. Deseja continuar?`
        : `Tem certeza que deseja excluir a coluna "${col.title}"?`,
      onConfirm: async () => {
        try {
          await api.delete(`/case-studies/boards/${boardId}/columns/${col.id}`);
          await loadBoardDetail(boardId, true);
        } catch (err) {
          console.error(err);
          pushToast('error', 'Erro ao excluir coluna.');
        }
      },
    });
  };

  const moveColumn = async (colId: string, delta: number) => {
    if (!activeBoard) return;
    const ids = activeBoard.columns.map(c => c.id);
    const from = ids.indexOf(colId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    setDetail(prev => prev && ({ ...prev, columns: ids.map(id => prev.columns.find(c => c.id === id)!) }));
    try {
      await api.put(`/case-studies/boards/${activeBoard.id}/columns-order`, { ids });
    } catch (e) {
      console.error(e);
      await loadBoardDetail(activeBoard.id, true);
    }
  };

  const toggleCollapsed = (colId: string) =>
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });

  // --- Card actions ---
  const openNewCard = (columnId: string) => {
    setDraft(emptyDraft());
    setCardTab('geral');
    setApplyToColumn(false);
    setTitleError('');
    setPatientError('');
    setCardModal({ card: null, columnId });
  };

  const openCard = (card: BoardCardData) => {
    setDraft(draftFromCard(card));
    setCardTab('geral');
    setApplyToColumn(false);
    setTitleError('');
    setPatientError('');
    setCardModal({ card, columnId: card.columnId });
  };

  const closeCardModal = () => { if (!savingCard) setCardModal(null); };

  const buildPayload = () => {
    const prio = draft.priority;
    const prioLegacy = PRIORITIES.find(p => p.key === prio)?.legacy || '';
    const details: Record<string, any> = { ...draft.details };
    if (def.common.priority) details.priority = prioLegacy;
    return {
      patient_id: draft.patientId || null,
      title: draft.title.trim() || draft.patientName,
      description: draft.description.trim() || null,
      tags: draft.tags.split(',').map(tg => tg.trim()).filter(Boolean),
      details,
      priority: prio || undefined,
      due_date: draft.due_date || null,
      assignee: draft.assignee.trim() || null,
      amount: draft.amount !== '' && !Number.isNaN(parseFloat(draft.amount)) ? parseFloat(draft.amount) : null,
      color: draft.color || null,
      links: draft.links,
      checklist: draft.checklist,
      card_type: def.key,
    };
  };

  const saveCard = async () => {
    if (!activeBoardId || !cardModal) return;
    if (def.patientRequired && !draft.patientId) {
      setPatientError('Selecione o paciente deste caso.');
      setCardTab('geral');
      return;
    }
    if (!draft.title.trim() && !draft.patientName) {
      setTitleError('Informe um título.');
      setCardTab('geral');
      return;
    }
    setSavingCard(true);
    try {
      const payload = buildPayload();
      if (cardModal.card) {
        await api.put(`/case-studies/cards/${cardModal.card.id}`, payload);
      } else {
        const col = activeBoard?.columns.find(c => c.id === cardModal.columnId);
        await api.post(`/case-studies/boards/${activeBoardId}/cards`, {
          ...payload,
          column_id: cardModal.columnId,
          sort_order: col ? col.cards.length : 0,
        });
      }
      if (applyToColumn && draft.color) {
        await api.post(`/case-studies/boards/${activeBoardId}/columns/${cardModal.columnId}/apply-color`, { color: draft.color });
      }
      await loadBoardDetail(activeBoardId, true);
      pushToast('success', cardModal.card ? 'Cartão atualizado!' : `${def.cardNoun.charAt(0).toUpperCase()}${def.cardNoun.slice(1)} criado!`);
      setCardModal(null);
    } catch (e) {
      console.error(e);
      pushToast('error', 'Erro ao salvar o cartão. Tente novamente.');
    } finally {
      setSavingCard(false);
    }
  };

  const deleteCard = (card: BoardCardData) => {
    if (!activeBoardId) return;
    const boardId = activeBoardId;
    setDeleteConfig({
      title: 'Excluir cartão',
      message: `Tem certeza que deseja excluir "${card.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        try {
          await api.delete(`/case-studies/cards/${card.id}`);
          await loadBoardDetail(boardId, true);
          pushToast('success', 'Cartão excluído.');
          setCardModal(null);
        } catch (err) {
          console.error(err);
          pushToast('error', 'Erro ao excluir cartão.');
        }
      },
    });
  };

  /** Move o cartão para outra coluna (arrastar e soltar ou menu "Mover para…"). */
  const moveCardTo = async (cardId: string, fromColumnId: string, toColumnId: string) => {
    if (!activeBoard || fromColumnId === toColumnId) return;
    const from = activeBoard.columns.find(c => c.id === fromColumnId);
    const to = activeBoard.columns.find(c => c.id === toColumnId);
    const card = from?.cards.find(c => c.id === cardId);
    if (!from || !to || !card) return;
    const sortOrder = to.cards.length;
    setDetail(prev => prev && ({
      ...prev,
      columns: prev.columns.map(c => {
        if (c.id === fromColumnId) return { ...c, cards: c.cards.filter(x => x.id !== cardId) };
        if (c.id === toColumnId) return { ...c, cards: [...c.cards, { ...card, columnId: toColumnId }] };
        return c;
      }),
    }));
    try {
      await api.patch(`/case-studies/cards/${cardId}/move`, { column_id: toColumnId, sort_order: sortOrder });
      // Sugestão (nunca automática): lançar no Livro Caixa ao concluir recebimento/pagamento.
      if (def.key === 'financeiro' && /recebido|pago/i.test(to.title) && hasPermission('view_financial_reports')) {
        pushToast('info', `Movido para "${to.title}"`, {
          message: 'Quer registrar este valor no Livro Caixa? Nada é lançado sem a sua confirmação.',
          duration: 12000,
          details: (
            <Button type="button" variant="outline" size="xs" onClick={() => navigate('/livro-caixa')}>Abrir Livro Caixa</Button>
          ),
        });
      }
    } catch (err) {
      console.error(err);
      pushToast('error', 'Erro ao mover o cartão.');
      if (activeBoardId) await loadBoardDetail(activeBoardId, true);
    }
  };

  const handleDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    setDropColumnId(null);
    if (!draggedCard) return;
    const { id, from } = draggedCard;
    setDraggedCard(null);
    void moveCardTo(id, from, toColumnId);
  };

  const cardMenu = (card: BoardCardData, col: ColumnData): ActionMenuItem[] => [
    { key: 'open', label: 'Abrir', icon: ExternalLink, onClick: () => openCard(card) },
    { key: 'h', label: 'Mover para…', heading: true, onClick: () => undefined },
    ...(activeBoard?.columns || []).map(c => ({
      key: `mv-${c.id}`, label: c.title, icon: ArrowRight, disabled: c.id === col.id, onClick: () => moveCardTo(card.id, col.id, c.id),
    })),
    { key: 'del', label: 'Excluir', icon: Trash2, danger: true, separated: true, onClick: () => deleteCard(card) },
  ];

  const columnMenu = (col: ColumnData, index: number, total: number): ActionMenuItem[] => [
    { key: 'edit', label: 'Editar coluna', icon: Pencil, onClick: () => setColumnModal({ id: col.id, title: col.title, color: col.color }) },
    { key: 'collapse', label: 'Recolher coluna', icon: ChevronsLeftRight, onClick: () => toggleCollapsed(col.id) },
    { key: 'left', label: 'Mover para a esquerda', icon: ArrowLeft, disabled: index === 0, onClick: () => moveColumn(col.id, -1) },
    { key: 'right', label: 'Mover para a direita', icon: ArrowRight, disabled: index === total - 1, onClick: () => moveColumn(col.id, 1) },
    { key: 'del', label: 'Excluir coluna', icon: Trash2, danger: true, separated: true, onClick: () => deleteColumn(col) },
  ];

  // --- Filters ---
  const allCards = useMemo(() => (activeBoard ? activeBoard.columns.flatMap(c => c.cards.map(card => ({ card, col: c }))) : []), [activeBoard]);

  const filterOptions = useMemo(() => {
    const assignees = new Set<string>();
    const tags = new Set<string>();
    const colors = new Set<string>();
    const patients = new Map<string, string>();
    allCards.forEach(({ card }) => {
      if (card.assignee) assignees.add(card.assignee);
      card.tags.forEach(tg => tags.add(tg));
      if (card.color) colors.add(resolveColor(card.color));
      if (card.patientId) patients.set(card.patientId, card.patientName);
    });
    return {
      assignees: [...assignees].sort(),
      tags: [...tags].sort(),
      colors: [...colors],
      patients: [...patients.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [allCards]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const matches = (card: BoardCardData, col: ColumnData) => {
    if (cardSearch.trim()) {
      const q = cardSearch.trim().toLowerCase();
      const hay = [card.title, card.patientName, card.description, card.assignee || '', ...card.tags, ...Object.values(card.details).map(v => String(v ?? ''))].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.assignee && card.assignee !== filters.assignee) return false;
    if (filters.tag && !card.tags.includes(filters.tag)) return false;
    if (filters.patient && card.patientId !== filters.patient) return false;
    if (filters.color === 'none' && card.color) return false;
    if (filters.color && filters.color !== 'none' && resolveColor(card.color, '') !== filters.color) return false;
    if (filters.due === 'none' && card.due_date) return false;
    if (filters.due === 'overdue' && !isCardOverdue(card, def, col.title)) return false;
    if (filters.due === 'week') {
      if (!card.due_date) return false;
      const limit = new Date(); limit.setDate(limit.getDate() + 7);
      const limitIso = `${limit.getFullYear()}-${String(limit.getMonth() + 1).padStart(2, '0')}-${String(limit.getDate()).padStart(2, '0')}`;
      if (card.due_date < todayIso() || card.due_date > limitIso) return false;
    }
    return true;
  };

  const filtersLabels: { key: keyof Filters; text: string }[] = [
    filters.assignee && { key: 'assignee' as const, text: `Responsável: ${filters.assignee}` },
    filters.tag && { key: 'tag' as const, text: `Etiqueta: ${filters.tag}` },
    filters.patient && { key: 'patient' as const, text: `Paciente: ${filterOptions.patients.find(p => p[0] === filters.patient)?.[1] || ''}` },
    filters.color && { key: 'color' as const, text: filters.color === 'none' ? 'Sem cor' : `Cor: ${colorName(filters.color)}` },
    filters.due && { key: 'due' as const, text: { overdue: 'Atrasados', week: 'Próximos 7 dias', none: 'Sem prazo' }[filters.due] || '' },
  ].filter(Boolean) as { key: keyof Filters; text: string }[];

  // --- Derived: boards list ---
  const visibleBoards = useMemo(() => {
    const q = boardSearch.trim().toLowerCase();
    return boards
      .filter(b => (boardsTab === 'arquivados' ? b.archived : !b.archived))
      .filter(b => !q || b.title.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q));
  }, [boards, boardSearch, boardsTab]);

  const stats = useMemo(() => {
    const active = boards.filter(b => !b.archived);
    return {
      boards: active.length,
      cards: active.reduce((s, b) => s + b.cardCount, 0),
      archived: boards.length - active.length,
    };
  }, [boards]);

  // --- Quick actions (cartão aberto) ---
  const quickActions = (card: BoardCardData) => {
    const pid = draft.patientId;
    const actions: { key: string; label: string; icon: React.ElementType; run: () => void }[] = [];
    if (pid && hasPermission('view_patients')) {
      actions.push({ key: 'patient', label: 'Abrir paciente', icon: User, run: () => navigate(`/pacientes/${pid}`) });
    }
    if (pid && def.links.includes('record') && hasPermission('view_medical_records')) {
      actions.push({ key: 'prontuario', label: 'Abrir prontuário', icon: FileText, run: () => navigate(`/prontuario?patient_id=${pid}`) });
    }
    if (pid && def.actions.includes('record') && hasPermission('create_medical_record')) {
      actions.push({ key: 'evolucao', label: 'Nova evolução', icon: Stethoscope, run: () => navigate(`/prontuario?patient_id=${pid}&new_session=1`) });
    }
    if (def.actions.includes('appointment') && hasPermission('create_appointment')) {
      const when = String(draft.details.next_session || draft.details.event_at || draft.due_date || '').slice(0, 10) || todayIso();
      const params = new URLSearchParams({ newAppointment: '1', date: `${when}T12:00:00` });
      if (pid) params.set('patientId', pid);
      actions.push({ key: 'agendar', label: 'Criar agendamento', icon: CalendarPlus, run: () => navigate(`/agenda?${params.toString()}`) });
    }
    if (def.actions.includes('comanda') && hasPermission('view_all_comandas')) {
      actions.push({ key: 'comanda', label: 'Abrir comandas', icon: Receipt, run: () => navigate('/comandas') });
    }
    void card;
    return actions;
  };

  // --- Render helpers ---
  const BoardGlyph: React.FC<{ board: BoardData; size?: number }> = ({ board, size = 36 }) => {
    const Icon = iconForBoard(board.icon, board.board_type);
    return (
      <span className="flex shrink-0 items-center justify-center rounded-lg text-white" style={{ width: size, height: size, backgroundColor: resolveColor(board.color, getTypeDef(board.board_type).color) }}>
        <Icon size={Math.round(size * 0.45)} />
      </span>
    );
  };

  const columnTotal = (col: ColumnData, cards: BoardCardData[]) => {
    if (def.total === 'money') {
      const sum = cards.reduce((s, c) => s + (c.amount || 0), 0);
      return cards.some(c => c.amount) ? formatMoney(sum) : '';
    }
    if (def.total === 'hours') {
      const minutes = cards.reduce((s, c) => s + (Number(c.details.duration) || 0), 0);
      return minutes > 0 ? formatHours(minutes) : '';
    }
    void col;
    return '';
  };

  const filtersActive = activeFilterCount > 0 || !!cardSearch.trim();

  // ─────────────────────────────── JSX ───────────────────────────────
  return (
    <PageWrapper>
      <div className="space-y-4">
        {!activeBoardId ? (
          <SectionTitle
            icon={BookOpen}
            title={t('cases.boards')}
            description={`${stats.boards} quadros · ${stats.cards} cartões${stats.archived ? ` · ${stats.archived} arquivados` : ''}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate('/caixa-ferramentas')}>Voltar</Button>
                <Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openNewBoard}>{t('cases.newBoard')}</Button>
              </div>
            }
          />
        ) : (
          <SectionTitle
            icon={activeBoard ? iconForBoard(activeBoard.icon, activeBoard.board_type) : BookOpen}
            title={activeBoard?.title || ''}
            description={activeBoard ? `${def.label}${activeBoard.description ? ` · ${activeBoard.description}` : ''}` : undefined}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={backToBoards}>Quadros</Button>
                <Button variant="outline" size="sm" iconLeft={<Plus size={14} />} onClick={() => setColumnModal({ id: null, title: '', color: '#94a3b8' })}>{t('cases.addColumn')}</Button>
                {activeBoard && <ActionMenu size="sm" label="Ações do quadro" items={boardMenu(activeBoard)} />}
              </div>
            }
          />
        )}

        {!activeBoardId ? (
          <div className="space-y-4">
            <StatGrid cols={3}>
              <StatCard title="Quadros ativos" value={stats.boards} icon={Layout} color="default" />
              <StatCard title="Cartões" value={stats.cards} icon={FileText} color="success" />
              <StatCard title="Arquivados" value={stats.archived} icon={Archive} color="info" />
            </StatGrid>

            <Tabs<typeof BOARDS_TABS[number]['id']> items={BOARDS_TABS} value={boardsTab} onChange={setBoardsTab} label="Situação dos quadros" />

            <FilterLine>
              <FilterLineSection grow>
                <FilterLineItem grow minWidth={200}>
                  <FilterLineSearch value={boardSearch} onChange={setBoardSearch} placeholder="Buscar quadro por nome ou descrição" aria-label="Buscar quadro" />
                </FilterLineItem>
              </FilterLineSection>
              <FilterLineSection>
                <FilterLineItem>
                  <FilterLineViewToggle
                    value={listView}
                    onChange={(v) => { const mode = v as 'grid' | 'list'; setListView(mode); updatePreference('caseStudies', { viewMode: mode }); }}
                    gridValue="grid"
                    listValue="list"
                  />
                </FilterLineItem>
              </FilterLineSection>
            </FilterLine>

            {isLoading ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Carregando…</div>
            ) : visibleBoards.length === 0 ? (
              <ContentCard>
                <EmptyState
                  icon={Layout}
                  title={boards.length === 0 ? 'Nenhum quadro ainda' : boardsTab === 'arquivados' ? 'Nenhum quadro arquivado' : 'Nenhum quadro encontrado'}
                  description={boards.length === 0 ? 'Crie o primeiro quadro a partir de um modelo: clínico, projeto, financeiro, funil de pacientes e mais.' : 'Ajuste a busca ou crie um novo quadro.'}
                  action={<Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={openNewBoard}>{t('cases.newBoard')}</Button>}
                />
              </ContentCard>
            ) : listView === 'grid' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleBoards.map(board => {
                  const bDef = getTypeDef(board.board_type);
                  const bColor = resolveColor(board.color, bDef.color);
                  return (
                    <div
                      key={board.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveBoardId(board.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setActiveBoardId(board.id); }}
                      aria-label={`Abrir quadro ${board.title}`}
                      className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-primary-300 focus-visible:outline-primary-500 lg:p-4"
                      style={{ borderTopColor: bColor, borderTopWidth: 3, backgroundColor: board.archived ? undefined : tint(bColor, 0.04) }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <BoardGlyph board={board} />
                        <ActionMenu label={`Ações do quadro ${board.title}`} items={boardMenu(board)} />
                      </div>
                      <h3 className="mb-1 truncate text-sm font-medium text-slate-800 group-hover:text-primary-700">{board.title}</h3>
                      <p className="mb-3 line-clamp-2 min-h-[2rem] text-xs text-slate-500">{board.description || bDef.description}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                        <Badge color="default" size="sm">{bDef.short}</Badge>
                        <div className="flex items-center gap-3">
                          <span>{board.columnCount} colunas</span>
                          <span>{board.cardCount} {board.cardCount === 1 ? bDef.cardNoun : bDef.cardNounPlural}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ContentCard padding="none" className="overflow-hidden">
                <GridTable<BoardData>
                  data={visibleBoards}
                  keyExtractor={(b) => b.id}
                  onRowClick={(b) => setActiveBoardId(b.id)}
                  emptyMessage="Nenhum quadro encontrado"
                  columns={[
                    {
                      header: 'Quadro',
                      render: (board) => (
                        <div className="flex items-center gap-3">
                          <BoardGlyph board={board} size={32} />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-slate-800">{board.title}</div>
                            {board.description && <div className="truncate text-[11px] text-slate-500 sm:max-w-[260px]">{board.description}</div>}
                          </div>
                        </div>
                      ),
                    },
                    { header: 'Modelo', className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell', render: (board) => <Badge color="default" size="sm">{getTypeDef(board.board_type).short}</Badge> },
                    { header: 'Colunas', className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell', render: (board) => <span className="text-xs text-slate-600">{board.columnCount}</span> },
                    { header: 'Cartões', className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell', render: (board) => <span className="text-xs text-slate-600">{board.cardCount}</span> },
                    { header: 'Criado em', className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell', render: (board) => <span className="whitespace-nowrap text-xs text-slate-600">{new Date(board.createdAt).toLocaleDateString('pt-BR')}</span> },
                    { header: '', className: 'text-right', render: (board) => <div className="flex justify-end"><ActionMenu label={`Ações do quadro ${board.title}`} items={boardMenu(board)} /></div> },
                  ]}
                />
              </ContentCard>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Tabs<typeof BOARD_VIEW_TABS[number]['id']> items={BOARD_VIEW_TABS} value={boardView} onChange={setBoardView} label="Visão do quadro" />

            <FilterLine>
              <FilterLineSection grow>
                <FilterLineItem grow minWidth={200}>
                  <FilterLineSearch value={cardSearch} onChange={setCardSearch} placeholder={`Buscar ${def.cardNoun}, paciente ou etiqueta...`} aria-label="Buscar cartões" />
                </FilterLineItem>
                <FilterLineItem>
                  <FilterPopover
                    activeCount={activeFilterCount}
                    onOpen={() => setDraftFilters(filters)}
                    onApply={() => setFilters(draftFilters)}
                    onClear={() => { setFilters(FILTERS_EMPTY); setDraftFilters(FILTERS_EMPTY); }}
                  >
                    <div className="space-y-3">
                      <Select label="Responsável" value={draftFilters.assignee} onChange={(e) => setDraftFilters(p => ({ ...p, assignee: e.target.value }))}>
                        <option value="">Todos</option>
                        {filterOptions.assignees.map(a => <option key={a} value={a}>{a}</option>)}
                      </Select>
                      <Select label="Paciente" value={draftFilters.patient} onChange={(e) => setDraftFilters(p => ({ ...p, patient: e.target.value }))}>
                        <option value="">Todos</option>
                        {filterOptions.patients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                      </Select>
                      <Select label="Etiqueta" value={draftFilters.tag} onChange={(e) => setDraftFilters(p => ({ ...p, tag: e.target.value }))}>
                        <option value="">Todas</option>
                        {filterOptions.tags.map(tg => <option key={tg} value={tg}>{tg}</option>)}
                      </Select>
                      <Select label="Cor do cartão" value={draftFilters.color} onChange={(e) => setDraftFilters(p => ({ ...p, color: e.target.value }))}>
                        <option value="">Todas</option>
                        <option value="none">Sem cor</option>
                        {filterOptions.colors.map(c => <option key={c} value={c}>{colorName(c)}</option>)}
                      </Select>
                      <Select label="Prazo" value={draftFilters.due} onChange={(e) => setDraftFilters(p => ({ ...p, due: e.target.value }))}>
                        <option value="">Qualquer</option>
                        <option value="overdue">Atrasados</option>
                        <option value="week">Próximos 7 dias</option>
                        <option value="none">Sem prazo</option>
                      </Select>
                    </div>
                  </FilterPopover>
                </FilterLineItem>
              </FilterLineSection>
            </FilterLine>

            {filtersLabels.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {filtersLabels.map(f => (
                  <button key={f.key} type="button" onClick={() => setFilters(p => ({ ...p, [f.key]: '' }))} aria-label={`Remover filtro ${f.text}`} className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-0.5 text-[11px] text-primary-700 hover:bg-primary-100">
                    {f.text} <span aria-hidden="true">×</span>
                  </button>
                ))}
                <Button type="button" variant="ghost" size="xs" onClick={() => setFilters(FILTERS_EMPTY)}>Limpar filtros</Button>
              </div>
            )}

            {boardLoading || !activeBoard ? (
              <div role="status" className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Carregando…</div>
            ) : activeBoard.columns.length === 0 ? (
              <ContentCard>
                <EmptyState icon={Layout} title="Este quadro não tem colunas" description="Crie a primeira coluna para começar a organizar os cartões." action={<Button variant="primary" size="sm" iconLeft={<Plus size={14} />} onClick={() => setColumnModal({ id: null, title: '', color: '#94a3b8' })}>{t('cases.addColumn')}</Button>} />
              </ContentCard>
            ) : boardView === 'quadro' ? (
              <div className="-mx-1 overflow-x-auto px-1">
                <div className="flex min-w-max items-start gap-3 pb-3" style={{ minHeight: 'calc(100vh - 320px)' }}>
                  {activeBoard.columns.map((col, index) => {
                    const cards = col.cards.filter(c => matches(c, col));
                    const total = columnTotal(col, cards);
                    const isCollapsed = collapsed.has(col.id);
                    if (isCollapsed) {
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => toggleCollapsed(col.id)}
                          aria-label={`Expandir coluna ${col.title} (${cards.length})`}
                          onDragOver={(e) => { e.preventDefault(); }}
                          onDrop={(e) => handleDrop(e, col.id)}
                          className="flex w-11 shrink-0 flex-col items-center gap-2 self-stretch rounded-lg border border-slate-200 bg-slate-50 py-3 text-slate-600 hover:border-slate-300"
                          style={{ borderTopColor: col.color, borderTopWidth: 3 }}
                        >
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-medium">{cards.length}</span>
                          <span className="text-xs font-medium" style={{ writingMode: 'vertical-rl' }}>{col.title}</span>
                        </button>
                      );
                    }
                    return (
                      <section
                        key={col.id}
                        aria-label={`Coluna ${col.title}`}
                        className={`flex w-[284px] shrink-0 flex-col rounded-lg border bg-slate-50/80 ${dropColumnId === col.id ? 'border-primary-400 ring-2 ring-primary-200' : 'border-slate-200'}`}
                        style={{ borderTopColor: col.color, borderTopWidth: 3 }}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropColumnId !== col.id) setDropColumnId(col.id); }}
                        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropColumnId(null); }}
                        onDrop={(e) => handleDrop(e, col.id)}
                      >
                        <header className="flex items-center justify-between gap-2 border-b border-slate-200/70 px-3 py-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-xs font-medium text-slate-700">{col.title}</span>
                              <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[11px] text-slate-600">{cards.length}{filtersActive && cards.length !== col.cards.length ? `/${col.cards.length}` : ''}</span>
                            </div>
                            {total && <div className="text-[11px] text-slate-500">{total}</div>}
                          </div>
                          <ActionMenu label={`Opções da coluna ${col.title}`} items={columnMenu(col, index, activeBoard.columns.length)} />
                        </header>

                        <div className="max-h-[calc(100vh-340px)] min-h-[72px] space-y-2 overflow-y-auto p-2 custom-scrollbar">
                          {cards.map(card => (
                            <BoardCardView
                              key={card.id}
                              card={card}
                              def={def}
                              columnTitle={col.title}
                              dragging={draggedCard?.id === card.id}
                              onOpen={() => openCard(card)}
                              onDragStart={(e) => { setDraggedCard({ id: card.id, from: col.id }); e.dataTransfer.effectAllowed = 'move'; }}
                              onDragEnd={() => { setDraggedCard(null); setDropColumnId(null); }}
                              menu={<ActionMenu label={`Ações de ${card.title}`} items={cardMenu(card, col)} />}
                            />
                          ))}
                          {col.cards.length === 0 && <p className="py-6 text-center text-[11px] text-slate-500">Nenhum {def.cardNoun} aqui</p>}
                          {col.cards.length > 0 && cards.length === 0 && <p className="py-6 text-center text-[11px] text-slate-500">Sem resultados para os filtros</p>}
                        </div>

                        <div className="p-2">
                          <Button type="button" variant="ghost" size="sm" fullWidth iconLeft={<Plus size={14} />} onClick={() => openNewCard(col.id)}>
                            {def.newCardLabel}
                          </Button>
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ContentCard padding="none" className="overflow-hidden">
                <GridTable<{ card: BoardCardData; col: ColumnData }>
                  data={allCards.filter(({ card, col }) => matches(card, col))}
                  keyExtractor={({ card }) => card.id}
                  onRowClick={({ card }) => openCard(card)}
                  emptyMessage={filtersActive ? 'Nenhum cartão encontrado para os filtros' : `Nenhum ${def.cardNoun} ainda`}
                  columns={[
                    {
                      header: 'Título',
                      render: ({ card }) => (
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 shrink-0 rounded-full border border-slate-300" style={{ backgroundColor: card.color ? resolveColor(card.color) : '#fff' }} />
                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-slate-800">{card.title}</div>
                            {card.patientName && card.patientName !== card.title && <div className="truncate text-[11px] text-slate-500">{card.patientName}</div>}
                          </div>
                        </div>
                      ),
                    },
                    {
                      header: 'Coluna',
                      render: ({ col }) => (
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />{col.title}</span>
                      ),
                    },
                    ...(def.total === 'money' ? [{ header: 'Valor', className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell', render: ({ card }: { card: BoardCardData }) => <span className="text-xs text-slate-700">{card.amount !== undefined ? formatMoney(card.amount) : '-'}</span> }] : []),
                    ...def.fields.filter(f => f.showOnCard && f.root !== 'amount' && f.root !== 'due_date').slice(0, 2).map(f => ({
                      header: f.label, className: 'hidden lg:table-cell', headerClassName: 'hidden lg:table-cell',
                      render: ({ card }: { card: BoardCardData }) => <span className="text-xs text-slate-600">{fieldDisplay(card, f) || '-'}</span>,
                    })),
                    {
                      header: def.dueLabel, className: 'hidden sm:table-cell', headerClassName: 'hidden sm:table-cell',
                      render: ({ card, col }) => {
                        const late = isCardOverdue(card, def, col.title);
                        return <span className={`whitespace-nowrap text-xs ${late ? 'font-medium text-red-700' : 'text-slate-600'}`}>{card.due_date ? formatDate(card.due_date) : '-'}{late ? ' (atrasado)' : ''}</span>;
                      },
                    },
                    { header: def.assigneeLabel, className: 'hidden md:table-cell', headerClassName: 'hidden md:table-cell', render: ({ card }) => <span className="text-xs text-slate-600">{card.assignee || '-'}</span> },
                    { header: '', className: 'text-right', render: ({ card, col }) => <div className="flex justify-end"><ActionMenu label={`Ações de ${card.title}`} items={cardMenu(card, col)} /></div> },
                  ]}
                />
              </ContentCard>
            )}
          </div>
        )}
      </div>

      {/* --- MODAL: NOVO / EDITAR QUADRO --- */}
      <BoardCreateModal
        isOpen={isBoardModalOpen}
        onClose={() => { if (!savingBoard) { setIsBoardModalOpen(false); setEditingBoard(null); } }}
        onSubmit={submitBoard}
        saving={savingBoard}
        editing={editingBoard ? { title: editingBoard.title, description: editingBoard.description, board_type: editingBoard.board_type, color: editingBoard.color, icon: editingBoard.icon } : null}
      />

      {/* --- MODAL: CARTÃO --- */}
      <Modal
        isOpen={!!cardModal}
        onClose={closeCardModal}
        title={cardModal?.card ? cardModal.card.title : def.newCardLabel}
        subtitle={cardModal ? `${def.label} · ${activeBoard?.columns.find(c => c.id === cardModal.columnId)?.title || ''}` : undefined}
        size="xl"
        mobileStyle="fullscreen"
        footer={
          <ModalFooter align="between">
            {cardModal?.card ? (
              <Button variant="danger" size="sm" iconLeft={<Trash2 size={14} />} onClick={() => deleteCard(cardModal.card!)} disabled={savingCard}>Excluir</Button>
            ) : <span />}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={closeCardModal} disabled={savingCard}>Cancelar</Button>
              <Button variant="primary" size="sm" loading={savingCard} disabled={savingCard} onClick={saveCard}>{cardModal?.card ? 'Salvar' : 'Criar'}</Button>
            </div>
          </ModalFooter>
        }
      >
        {cardModal && (
          <div className="space-y-3">
            {cardModal.card && (
              <>
                {quickActions(cardModal.card).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {quickActions(cardModal.card).map(a => (
                      <Button key={a.key} type="button" variant="outline" size="xs" iconLeft={<a.icon size={14} />} onClick={a.run}>{a.label}</Button>
                    ))}
                  </div>
                )}
                {(draft.patientId || draft.links.length > 0) && (
                  <LinkChips
                    patientId={draft.patientId}
                    links={[...(draft.patientId ? [{ type: 'patient' as const, id: draft.patientId, label: draft.patientName || 'Paciente' }] : []), ...draft.links]}
                  />
                )}
                <p className="text-[11px] text-slate-500">As ações acima abrem outro módulo; salve antes para não perder alterações.</p>
              </>
            )}
            <CardForm
              def={def}
              draft={draft}
              onChange={(patch) => { setDraft(prev => ({ ...prev, ...patch })); if (patch.title !== undefined) setTitleError(''); if (patch.patientId) setPatientError(''); }}
              patientOptions={patientOptions}
              tab={cardTab}
              onTab={setCardTab}
              titleError={titleError}
              patientError={patientError}
              applyToColumn={applyToColumn}
              onApplyToColumn={setApplyToColumn}
            />
          </div>
        )}
      </Modal>

      {/* --- MODAL: COLUNA --- */}
      <Modal
        isOpen={!!columnModal}
        onClose={() => setColumnModal(null)}
        title={columnModal?.id ? 'Editar coluna' : 'Nova coluna'}
        size="sm"
        footer={
          <ModalFooter align="between">
            <Button variant="ghost" size="sm" onClick={() => setColumnModal(null)}>Cancelar</Button>
            <Button variant="primary" size="sm" disabled={!columnModal?.title.trim()} onClick={saveColumn}>Salvar</Button>
          </ModalFooter>
        }
      >
        {columnModal && (
          <div className="space-y-3">
            <Input label="Nome" required value={columnModal.title} onChange={(e) => setColumnModal(prev => prev && ({ ...prev, title: e.target.value }))} />
            <ColorPicker label="Cor da coluna" value={columnModal.color} onChange={(hex) => setColumnModal(prev => prev && ({ ...prev, color: hex || '#94a3b8' }))} />
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Palette size={12} />A cor de cada cartão é escolhida dentro do cartão.</p>
          </div>
        )}
      </Modal>

      {/* --- CONFIRMAR EXCLUSÃO --- */}
      <ConfirmModal
        isOpen={!!deleteConfig}
        onClose={() => setDeleteConfig(null)}
        title={deleteConfig?.title || 'Excluir'}
        message={deleteConfig?.message || ''}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={() => {
          const cfg = deleteConfig;
          setDeleteConfig(null);
          cfg?.onConfirm();
        }}
      />
    </PageWrapper>
  );
};
