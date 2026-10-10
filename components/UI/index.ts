// ── Interação ──────────────────────────────────────────────────────────────
export { Button, IconButton } from './Button';
export { Modal, ModalFooter, ConfirmModal } from './Modal';
export type { ModalProps } from './Modal';
export { uiTheme, iconButtonVariants } from './theme';

// ── Formulários ────────────────────────────────────────────────────────────
export { Input, Textarea, Select } from './Input';
export { Switch, SwitchGroup } from './Switch';
export { DatePicker } from './DatePicker';
export { Calendar } from './Calendar';
export { Combobox } from './Combobox';
export { RichTextEditor } from './RichTextEditor';

// ── Feedback ───────────────────────────────────────────────────────────────
export { Toast, ToastProvider, useToast } from './Toast';
export type { ToastType } from './Toast';
export { Badge, StatusBadge, PaymentBadge, ActiveBadge, OrderStatusBadge, FinanceTypeBadge } from './Badge';
export { Alert } from './Alert';
export type { AlertProps } from './Alert';
export { Tabs, TabList, Tab, TabPanel } from './Tabs';

// ── Layout / Estrutura ─────────────────────────────────────────────────────
export { PageWrapper, SectionTitle, StatGrid, ContentCard, FormRow, Divider } from './PageWrapper';
export { PanelCard } from './PanelCard';
export { EmptyState } from './EmptyState';
export { DetailField } from './DetailField';

// ── Dados ──────────────────────────────────────────────────────────────────
export { StatCard } from './StatCard';
export { GridTable } from './GridTable';
export type { Column, GridTableProps } from './GridTable';
export { Pagination, usePagination } from './Pagination';
export type { PaginationProps, UsePaginationReturn } from './Pagination';

// ── Filtros / Toolbar ──────────────────────────────────────────────────────
export {
  FilterLine,
  FilterLineSection,
  FilterLineItem,
  FilterLineGroup,
  FilterLineSegmented,
  FilterLineViewToggle,
  FilterLineSearch,
  FilterLineSelect,
  FilterLineDateRange,
} from './FilterLine';

export { FilterPopover } from './FilterPopover';

// ── Pagamentos ─────────────────────────────────────────────────────────────
export { PaymentModal } from './PaymentModal';

// ── Utilitários de edição ──────────────────────────────────────────────────
export { TokenTextarea } from './TokenTextarea';
