import React, { ReactNode, useMemo } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { cn } from '@/src/lib/utils';

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

export function DataGrid<T>({
  columns, data, keyExtractor, selectable = false, selectedIds, onToggleSelect, onToggleSelectAll,
  rowIcon, onRowClick, emptyMessage = 'Nenhum registro encontrado.', isLoading = false,
  maxHeight, className,
}: DataGridProps<T>) {
  const isSelectable = selectable && !!selectedIds && !!onToggleSelect;
  const allSelected = isSelectable && data.length > 0 && data.every((row) => selectedIds!.has(String(keyExtractor(row))));

  // Offset acumulado (px) de cada coluna sticky, considerando checkbox + ícone de linha fixos antes.
  const stickyOffsets = useMemo(() => {
    let offset = (isSelectable ? CHECKBOX_COL_WIDTH : 0) + (rowIcon ? ROW_ICON_COL_WIDTH : 0);
    const offsets: Record<string, number> = {};
    for (const col of columns) {
      if (col.sticky) {
        offsets[col.key] = offset;
        offset += col.width ?? 140;
      }
    }
    return offsets;
  }, [columns, isSelectable, rowIcon]);

  const lastStickyKey = useMemo(() => {
    const stickyCols = columns.filter((c) => c.sticky);
    return stickyCols.length ? stickyCols[stickyCols.length - 1].key : (rowIcon ? '__rowicon__' : (isSelectable ? '__checkbox__' : null));
  }, [columns, rowIcon, isSelectable]);

  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={cn('w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm', className)}>
      <div
        className="overflow-auto custom-scrollbar"
        style={{ maxHeight: maxHeight ?? undefined }}
      >
        <table className="w-full border-collapse text-left" style={{ minWidth: 640 }}>
          <thead>
            <tr>
              {isSelectable && (
                <th
                  className="sticky top-0 left-0 z-40 w-10 shrink-0 border-b border-zinc-200 bg-zinc-50 px-3 py-3 text-center"
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
                    'sticky top-0 z-40 w-10 shrink-0 border-b border-zinc-200 bg-zinc-50 px-2 py-3',
                    lastStickyKey === '__rowicon__' && 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]',
                  )}
                  style={{ left: isSelectable ? CHECKBOX_COL_WIDTH : 0 }}
                />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 whitespace-nowrap',
                    col.sticky && 'sticky top-0 z-30',
                    !col.sticky && 'sticky top-0 z-20',
                    alignClass(col.align),
                    col.sticky && col.key === lastStickyKey && 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]',
                    col.headerClassName,
                  )}
                  style={col.sticky ? { left: stickyOffsets[col.key], width: col.width, position: 'sticky' } : undefined}
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
                const rowBg = isSelected ? 'bg-primary-50/50' : rowIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50';
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    className={cn('group transition-colors', onRowClick && 'cursor-pointer hover:brightness-[0.98]')}
                  >
                    {isSelectable && (
                      <td
                        className={cn('sticky left-0 z-10 w-10 shrink-0 border-b border-zinc-100 px-3 py-3.5 text-center', rowBg)}
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
                          'sticky z-10 w-10 shrink-0 border-b border-zinc-100 px-2 py-3.5',
                          rowBg,
                          lastStickyKey === '__rowicon__' && 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]',
                        )}
                        style={{ left: isSelectable ? CHECKBOX_COL_WIDTH : 0, position: 'sticky' }}
                      >
                        {rowIcon(row)}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn(
                          'border-b border-zinc-100 px-4 py-3.5 text-[13px] text-zinc-700 whitespace-nowrap',
                          col.sticky && 'sticky z-10',
                          rowBg,
                          alignClass(col.align),
                          col.sticky && col.key === lastStickyKey && 'after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-zinc-200 after:shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)]',
                          col.cellClassName,
                        )}
                        style={col.sticky ? { left: stickyOffsets[col.key], width: col.width, position: 'sticky' } : undefined}
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
