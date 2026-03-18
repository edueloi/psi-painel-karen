import React, { ReactNode } from 'react';
import { CheckSquare, Square } from 'lucide-react';

export interface Column<T> {
  header: ReactNode | string;
  accessor?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string; // Apply to td
  headerClassName?: string; // Apply to th
}

interface GridTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string | number;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: ReactNode | string;
}

export function GridTable<T>({
  data,
  columns,
  keyExtractor,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado."
}: GridTableProps<T>) {
  const isSelectable = !!selectedIds && !!onToggleSelect;
  const allSelected = isSelectable && data.length > 0 && data.every(row => selectedIds.has(String(keyExtractor(row))));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto md:overflow-x-visible">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-100/80">
          <tr className="border-b border-slate-200 divide-x divide-slate-200/50">
            {isSelectable && (
              <th className="px-4 py-3 w-8 text-center" onClick={(e) => e.stopPropagation()}>
                <button onClick={onToggleSelectAll} className="text-slate-400 hover:text-indigo-600 transition-colors">
                  {allSelected ? <CheckSquare size={15} className="text-indigo-600" /> : <Square size={15} />}
                </button>
              </th>
            )}
            {columns.map((col, idx) => (
              <th key={idx} className={`text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wide ${col.headerClassName || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (isSelectable ? 1 : 0)} className="py-8 text-center text-sm text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map(row => {
              const id = String(keyExtractor(row));
              const isSelected = isSelectable && selectedIds.has(id);
              return (
                <tr 
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    border-b border-slate-50 cursor-pointer group divide-x divide-slate-200/50 transition-colors
                    ${isSelected 
                      ? 'bg-amber-50/60 hover:bg-amber-100/50 border-amber-100/50' 
                      : 'hover:bg-slate-200/50 even:bg-slate-100'} 
                  `}
                >
                  {isSelectable && (
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onToggleSelect(id)} className="text-slate-300 hover:text-indigo-600 transition-colors">
                        {isSelected ? <CheckSquare size={15} className="text-indigo-600" /> : <Square size={15} />}
                      </button>
                    </td>
                  )}
                  {columns.map((col, idx) => (
                    <td key={idx} className={`px-4 py-3 ${col.className || ''}`}>
                      {col.render ? col.render(row) : String(row[col.accessor as keyof T] || '')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
