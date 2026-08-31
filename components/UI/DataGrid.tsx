import React, { ReactNode, useMemo, useState } from 'react';
import { CheckSquare, Square, Eye, EyeOff, ChevronUp, ChevronDown, RotateCcw, Lock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Modal, ModalFooter } from './Modal';
import { Button } from './Button';

// ─────────────────────────────────────────────────────────────────────────────
// DataGrid — grade densa com colunas fixas (sticky) e rolagem dupla
// (horizontal + vertical) dentro de um container de altura limitada — pegada
// de ERP tipo Comexport: primeiras colunas (checkbox / ícone de histórico /
// identificador) ficam fixas enquanto o resto da tabela rola por baixo.
// ─────────────────────────────────────────────────────────────────────────────

export interface DataGridColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  /** Largura em px — obrigatória para colunas `sticky` (usada pro cálculo do offset). */
  width?: number;
  /** Fixa a coluna à esquerda durante o scroll horizontal. Precisa ser uma das primeiras colunas do array. */
  sticky?: boolean;
  align?: 'left' | 'right' | 'center';
  headerClassName?: string;
  cellClassName?: string;
}

export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  /** Ícone fixo por linha (ex: histórico/undo), renderizado como 2ª coluna sticky. */
  rowIcon?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode;
  isLoading?: boolean;
  /** Altura máxima do grid — habilita rolagem vertical interna. Ex: 480 ou '60vh'. */
  maxHeight?: number | string;
  className?: string;
}

const CHECKBOX_COL_WIDTH = 40;
const ROW_ICON_COL_WIDTH = 40;
const DEFAULT_COL_WIDTH = 160;

export function DataGrid<T>({
  columns, data, keyExtractor, selectable = false, selectedIds, onToggleSelect, onToggleSelectAll,
  rowIcon, onRowClick, emptyMessage = 'Nenhum registro encontrado.', isLoading = false,
  maxHeight, className,
}: DataGridProps<T>) {
  const isSelectable = selectable && !!selectedIds && !!onToggleSelect;
  const allSelected = isSelectable && data.length > 0 && data.every((row) => selectedIds!.has(String(keyExtractor(row))));

  // Offset acumulado (px) de cada coluna sticky, considerando checkbox + ícone de linha fixos antes.
  // Precisa bater exatamente com as larguras do <colgroup> abaixo — por isso a
  // tabela usa table-layout:fixed + <col> em vez de deixar o navegador
  // recalcular largura por conteúdo (senão colunas fixas e as que rolam por
  // baixo desalinham e o texto de uma "vaza" por cima da outra durante o scroll).
  const stickyOffsets = useMemo(() => {
    let offset = (isSelectable ? CHECKBOX_COL_WIDTH : 0) + (rowIcon ? ROW_ICON_COL_WIDTH : 0);
    const offsets: Record<string, number> = {};
    for (const col of columns) {
      if (col.sticky) {
        offsets[col.key] = offset;
        offset += col.width ?? DEFAULT_COL_WIDTH;
      }
    }
    return offsets;
  }, [columns, isSelectable, rowIcon]);

  const lastStickyKey = useMemo(() => {
    const stickyCols = columns.filter((c) => c.sticky);
    return stickyCols.length ? stickyCols[stickyCols.length - 1].key : (rowIcon ? '__rowicon__' : (isSelectable ? '__checkbox__' : null));
  }, [columns, rowIcon, isSelectable]);

  const totalWidth = useMemo(
    () => (isSelectable ? CHECKBOX_COL_WIDTH : 0) + (rowIcon ? ROW_ICON_COL_WIDTH : 0)
      + columns.reduce((sum, c) => sum + (c.width ?? DEFAULT_COL_WIDTH), 0),
    [columns, isSelectable, rowIcon],
  );

  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={cn('w-full h-full flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}>
      <div
        className="flex-1 min-h-0 overflow-auto custom-scrollbar"
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        {/* border-separate (em vez de collapse) evita artefato de fundo/borda
            "vazando" nas células sticky em Chrome/Safari durante o scroll. */}
        <table className="text-left" style={{ tableLayout: 'fixed', width: totalWidth, borderCollapse: 'separate', borderSpacing: 0 }}>
          <colgroup>
            {isSelectable && <col style={{ width: CHECKBOX_COL_WIDTH }} />}
            {rowIcon && <col style={{ width: ROW_ICON_COL_WIDTH }} />}
            {columns.map((col) => <col key={col.key} style={{ width: col.width ?? DEFAULT_COL_WIDTH }} />)}
          </colgroup>
          <thead>
            <tr>
              {isSelectable && (
                <th
                  className={cn(
                    'sticky top-0 left-0 z-40 border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-center',
                    lastStickyKey === '__checkbox__'
                      ? 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]'
                      : 'border-r border-zinc-200',
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={onToggleSelectAll} className="text-zinc-400 hover:text-primary-600 transition-colors focus:outline-none">
                    {allSelected ? <CheckSquare size={15} className="text-primary-600" /> : <Square size={15} />}
                  </button>
                </th>
              )}
              {rowIcon && (
                <th
                  className={cn(
                    'sticky top-0 z-40 border-b border-zinc-200 bg-zinc-50 px-2 py-3',
                    lastStickyKey === '__rowicon__'
                      ? 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]'
                      : 'border-r border-zinc-200',
                  )}
                  style={{ left: isSelectable ? CHECKBOX_COL_WIDTH : 0 }}
                />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap overflow-hidden text-ellipsis',
                    col.sticky ? 'sticky top-0 z-30' : 'sticky top-0 z-20',
                    alignClass(col.align),
                    col.key === lastStickyKey
                      ? 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]'
                      : 'border-r border-zinc-200',
                    col.headerClassName,
                  )}
                  style={col.sticky ? { left: stickyOffsets[col.key] } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {isSelectable && <td className="px-3 py-3.5"><div className="h-4 w-4 bg-zinc-200 rounded mx-auto" /></td>}
                  {rowIcon && <td className="px-2 py-3.5" />}
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3.5"><div className="h-4 bg-zinc-100 rounded-md w-full max-w-[80%]" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (isSelectable ? 1 : 0) + (rowIcon ? 1 : 0)}
                  className="py-12 bg-white text-center text-xs font-bold text-zinc-400 uppercase tracking-widest"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => {
                const id = String(keyExtractor(row));
                const isSelected = isSelectable && selectedIds!.has(id);
                const rowBg = isSelected ? 'bg-primary-50/60' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50';
                // group-hover (não :hover isolado) pra garantir que TODAS as
                // células da linha — incluindo as sticky, que têm seu próprio
                // fundo opaco explícito — mudem de cor juntas ao passar o mouse
                // em qualquer ponto da linha, não só nas colunas não fixas.
                const hoverBg = isSelected ? 'group-hover:bg-primary-100/70' : 'group-hover:bg-amber-50/70';
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn('group', onRowClick && 'cursor-pointer')}
                  >
                    {isSelectable && (
                      <td
                        className={cn(
                          'sticky left-0 z-10 border-b border-zinc-100 px-3 py-3.5 text-center transition-colors',
                          rowBg, hoverBg,
                          lastStickyKey === '__checkbox__'
                            ? 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]'
                            : 'border-r border-zinc-100',
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button onClick={() => onToggleSelect!(id)} className="text-zinc-300 hover:text-primary-500 transition-colors">
                          {isSelected ? <CheckSquare size={15} className="text-primary-500" /> : <Square size={15} />}
                        </button>
                      </td>
                    )}
                    {rowIcon && (
                      <td
                        className={cn(
                          'sticky z-10 border-b border-zinc-100 px-2 py-3.5 transition-colors',
                          rowBg,
                          hoverBg,
                          lastStickyKey === '__rowicon__'
                            ? 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]'
                            : 'border-r border-zinc-100',
                        )}
                        style={{ left: isSelectable ? CHECKBOX_COL_WIDTH : 0 }}
                      >
                        {rowIcon(row)}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'border-b border-zinc-100 px-4 py-3.5 text-[13px] text-zinc-700 whitespace-nowrap overflow-hidden text-ellipsis transition-colors',
                          col.sticky && 'sticky z-10',
                          rowBg,
                          hoverBg,
                          alignClass(col.align),
                          col.key === lastStickyKey
                            ? 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]'
                            : 'border-r border-zinc-100',
                          col.cellClassName,
                        )}
                        style={col.sticky ? { left: stickyOffsets[col.key] } : undefined}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useFillHeight — mede a distância do topo do elemento até o fim da viewport
// e devolve uma altura que preenche o espaço restante, mantendo `offsetBottom`
// px de respiro no final (ex: pra a paginação encostar quase na borda da
// página, sem sobrar vão nem cortar conteúdo). Reagride em resize da janela.
// ─────────────────────────────────────────────────────────────────────────────

export function useFillHeight<E extends HTMLElement = HTMLDivElement>(offsetBottom = 10, minHeight = 260) {
  const ref = React.useRef<E>(null);
  const [height, setHeight] = useState<number>(420);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const compute = () => {
      const top = el.getBoundingClientRect().top;
      setHeight(Math.max(minHeight, window.innerHeight - top - offsetBottom));
    };

    compute();
    window.addEventListener('resize', compute);
    const ro = new ResizeObserver(compute);
    ro.observe(document.body);
    return () => {
      window.removeEventListener('resize', compute);
      ro.disconnect();
    };
  }, [offsetBottom, minHeight]);

  return { ref, height };
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridToolbar — fileira de ícones com contador (badge), estilo Comexport:
// cada ícone representa uma ação em lote com quantos itens ela afeta.
// ─────────────────────────────────────────────────────────────────────────────

export interface DataGridToolbarIcon {
  icon: ReactNode;
  count?: number;
  label?: string;
  onClick?: () => void;
}

interface DataGridToolbarProps {
  icons: DataGridToolbarIcon[];
  onApplyAll?: () => void;
  className?: string;
}

export function DataGridToolbar({ icons, onApplyAll, className }: DataGridToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {icons.map((it, i) => (
        <button
          key={i}
          type="button"
          title={it.label}
          onClick={it.onClick}
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-primary-300 hover:text-primary-600"
        >
          {it.icon}
          {!!it.count && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary-600 px-1 text-[9px] font-black text-white">
              {it.count}
            </span>
          )}
        </button>
      ))}
      {onApplyAll && (
        <button
          type="button"
          onClick={onApplyAll}
          className="ml-1 text-left text-[10px] font-bold leading-tight text-zinc-500 hover:text-primary-600 transition-colors"
        >
          aplicar<br />todos
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useDataGridColumns — controla ordem + visibilidade das colunas de um DataGrid,
// com persistência opcional em localStorage. A coluna de checkbox/seleção do
// DataGrid nunca entra aqui: ela é sempre a primeira e fixa, fora deste controle.
// ─────────────────────────────────────────────────────────────────────────────

export function useDataGridColumns<T>(baseColumns: DataGridColumn<T>[], storageKey?: string) {
  const defaultOrder = useMemo(() => baseColumns.map((c) => c.key), [baseColumns]);

  const [order, setOrder] = useState<string[]>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${storageKey}:order`);
        if (saved) {
          const parsed: string[] = JSON.parse(saved);
          // Descarta ordem salva se as colunas disponíveis mudaram desde então.
          if (parsed.length === defaultOrder.length && parsed.every((k) => defaultOrder.includes(k))) {
            return parsed;
          }
        }
      } catch { /* ignora storage corrompido */ }
    }
    return defaultOrder;
  });

  const [hidden, setHidden] = useState<Set<string>>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(`${storageKey}:hidden`);
        if (saved) return new Set(JSON.parse(saved));
      } catch { /* ignora storage corrompido */ }
    }
    return new Set();
  });

  const save = (nextOrder: string[], nextHidden: Set<string>) => {
    setOrder(nextOrder);
    setHidden(nextHidden);
    if (storageKey) {
      try {
        localStorage.setItem(`${storageKey}:order`, JSON.stringify(nextOrder));
        localStorage.setItem(`${storageKey}:hidden`, JSON.stringify(Array.from(nextHidden)));
      } catch { /* localStorage indisponível (modo privado etc.) — segue só em memória */ }
    }
  };

  const reset = () => save(defaultOrder, new Set());

  const byKey = useMemo(() => new Map(baseColumns.map((c) => [c.key, c])), [baseColumns]);
  const columns = useMemo(
    () => order.map((k) => byKey.get(k)).filter((c): c is DataGridColumn<T> => !!c && !hidden.has(c.key)),
    [order, hidden, byKey],
  );

  return { columns, order, hidden, setOrder: (o: string[]) => save(o, hidden), setHidden: (h: Set<string>) => save(order, h), reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// DataGridCustomizeModal — painel "Personalizar": reordenar colunas (setas
// cima/baixo) e mostrar/ocultar cada uma. A coluna de seleção é sempre fixa
// e nem aparece na lista — não precisa de controle.
// ─────────────────────────────────────────────────────────────────────────────

interface DataGridCustomizeModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  allColumns: DataGridColumn<T>[];
  order: string[];
  hidden: Set<string>;
  onSave: (order: string[], hidden: Set<string>) => void;
  onReset: () => void;
}

export function DataGridCustomizeModal<T>({
  isOpen, onClose, allColumns, order, hidden, onSave, onReset,
}: DataGridCustomizeModalProps<T>) {
  const [draftOrder, setDraftOrder] = useState(order);
  const [draftHidden, setDraftHidden] = useState(hidden);

  // Ressincroniza o rascunho sempre que o modal é reaberto.
  React.useEffect(() => {
    if (isOpen) { setDraftOrder(order); setDraftHidden(hidden); }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const byKey = useMemo(() => new Map(allColumns.map((c) => [c.key, c])), [allColumns]);

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= draftOrder.length) return;
    const next = [...draftOrder];
    [next[index], next[target]] = [next[target], next[index]];
    setDraftOrder(next);
  };

  const toggleHidden = (key: string) => {
    setDraftHidden((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Personalizar"
      subtitle="Reordene e escolha quais colunas aparecem na grade"
      size="md"
      footer={
        <ModalFooter align="between">
          <button
            type="button"
            onClick={() => { onReset(); onClose(); }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            <RotateCcw size={13} /> Resetar Campos
          </button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={() => { onSave(draftOrder, draftHidden); onClose(); }}>Salvar</Button>
          </div>
        </ModalFooter>
      }
    >
      <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] font-semibold text-zinc-400 mb-3">
        <Lock size={12} /> A coluna de seleção fica sempre fixa na primeira posição.
      </div>

      <div className="space-y-1.5">
        {draftOrder.map((key, idx) => {
          const col = byKey.get(key);
          if (!col) return null;
          const isHidden = draftHidden.has(key);
          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors',
                isHidden ? 'border-zinc-100 bg-zinc-50/60 opacity-60' : 'border-zinc-200 bg-white',
              )}
            >
              <button
                type="button"
                onClick={() => toggleHidden(key)}
                className="shrink-0 text-zinc-400 hover:text-primary-600 transition-colors"
                title={isHidden ? 'Mostrar coluna' : 'Ocultar coluna'}
              >
                {isHidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>

              <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-zinc-700">
                {col.header}
              </span>

              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-25 disabled:pointer-events-none"
                  title="Mover para cima"
                >
                  <ChevronUp size={15} />
                </button>
                <button
                  type="button"
                  disabled={idx === draftOrder.length - 1}
                  onClick={() => move(idx, 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-25 disabled:pointer-events-none"
                  title="Mover para baixo"
                >
                  <ChevronDown size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
