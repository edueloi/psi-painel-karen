import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { Modal, ModalFooter } from '../UI/Modal';
import { Button, IconButton } from '../UI/Button';
import { Input, Textarea } from '../UI/Input';
import { Tabs } from '../UI/Tabs';
import { Alert } from '../UI/Alert';
import { ColorPicker } from './ColorPicker';
import {
  BOARD_ICONS, BOARD_TYPES, BOARD_TYPE_ORDER, BoardTypeKey, ColumnDraft, getTypeDef, iconForBoard, newKey, resolveColor, tint,
} from './boardConfig';

const STEPS = [
  { id: 'modelo', label: 'Modelo', icon: LayoutGrid },
  { id: 'detalhes', label: 'Detalhes', icon: Check },
] as const;
type Step = typeof STEPS[number]['id'];

export interface BoardFormValue {
  title: string;
  description: string;
  board_type: BoardTypeKey;
  color: string;
  icon: string;
  columns: { title: string; color: string }[];
}

interface BoardCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: BoardFormValue) => Promise<void> | void;
  saving?: boolean;
  /** Quando informado, edita só nome, descrição, cor e ícone. */
  editing?: { title: string; description: string; board_type: string; color?: string; icon?: string } | null;
}

const columnsFor = (type: BoardTypeKey): ColumnDraft[] =>
  BOARD_TYPES[type].columns.map(c => ({ key: newKey(), title: c.title, color: c.color }));

/** Prévia mini do quadro: colunas com cartões fictícios nas cores das colunas. */
const MiniPreview: React.FC<{ columns: readonly { title: string; color: string }[] }> = ({ columns }) => (
  <div className="flex gap-1" aria-hidden="true">
    {columns.slice(0, 5).map((c, i) => (
      <div key={`${c.title}-${i}`} className="min-w-0 flex-1 rounded border border-slate-200 bg-slate-50 p-1">
        <div className="mb-1 h-1 rounded-full" style={{ backgroundColor: c.color }} />
        <div className="space-y-0.5">
          {Array.from({ length: i % 2 === 0 ? 2 : 1 }).map((_, k) => (
            <div key={k} className="h-2 rounded-sm border-l-2" style={{ backgroundColor: tint(resolveColor(c.color), 0.14), borderLeftColor: c.color }} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export const BoardCreateModal: React.FC<BoardCreateModalProps> = ({ isOpen, onClose, onSubmit, saving = false, editing = null }) => {
  const [step, setStep] = useState<Step>('modelo');
  const [type, setType] = useState<BoardTypeKey>('geral');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string>(BOARD_TYPES.geral.color);
  const [icon, setIcon] = useState('');
  const [columns, setColumns] = useState<ColumnDraft[]>(() => columnsFor('geral'));
  const [titleError, setTitleError] = useState('');
  const [columnsError, setColumnsError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitleError('');
    setColumnsError('');
    if (editing) {
      setStep('detalhes');
      setType((editing.board_type as BoardTypeKey) in BOARD_TYPES ? (editing.board_type as BoardTypeKey) : 'geral');
      setTitle(editing.title);
      setDescription(editing.description || '');
      setColor(editing.color ? resolveColor(editing.color) : '');
      setIcon(editing.icon || '');
    } else {
      setStep('modelo');
      setType('geral');
      setTitle('');
      setDescription('');
      setColor(BOARD_TYPES.geral.color);
      setIcon('');
      setColumns(columnsFor('geral'));
    }
    // abre uma vez por abertura; "editing" muda de identidade a cada render do pai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const pickType = (next: BoardTypeKey) => {
    setType(next);
    setColor(BOARD_TYPES[next].color);
    setColumns(columnsFor(next));
    setColumnsError('');
  };

  const updateColumn = (key: string, patch: Partial<ColumnDraft>) =>
    setColumns(prev => prev.map(c => (c.key === key ? { ...c, ...patch } : c)));
  const moveColumn = (index: number, delta: number) =>
    setColumns(prev => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const submit = async () => {
    if (!title.trim()) {
      setTitleError('Nome do quadro é obrigatório');
      setStep('detalhes');
      return;
    }
    const cleaned = columns.filter(c => c.title.trim());
    if (!editing && cleaned.length === 0) {
      setColumnsError('Mantenha ao menos uma coluna com nome.');
      setStep('detalhes');
      return;
    }
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      board_type: type,
      color,
      icon,
      columns: cleaned.map(c => ({ title: c.title.trim(), color: c.color })),
    });
  };

  const def = getTypeDef(type);
  const PreviewIcon = iconForBoard(icon, type);
  const boardColor = color ? resolveColor(color) : '#64748b';

  const templates = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {BOARD_TYPE_ORDER.map(key => {
        const tpl = BOARD_TYPES[key];
        const selected = type === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => pickType(key)}
            aria-pressed={selected}
            className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${selected ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-300' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: tpl.color }}>
                <tpl.icon size={16} />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{tpl.label}</span>
              {selected && <Check size={16} className="shrink-0 text-primary-600" />}
            </div>
            <p className="text-[11px] leading-snug text-slate-500">{tpl.description}</p>
            <MiniPreview columns={tpl.columns} />
            <p className="truncate text-[11px] text-slate-500">{tpl.columns.map(c => c.title).join(' · ')}</p>
          </button>
        );
      })}
    </div>
  );

  const details = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <Input
          label="Nome do quadro"
          required
          error={titleError}
          value={title}
          onChange={(e) => { setTitle(e.target.value); if (titleError) setTitleError(''); }}
          placeholder="Ex: Acompanhamento clínico, Contas do mês..."
        />
        <Textarea
          label="Descrição (opcional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Objetivo e foco do quadro..."
        />
        <ColorPicker label="Cor do quadro" value={color} onChange={setColor} allowNone />
        <div>
          <div className="mb-1.5 text-xs font-medium text-slate-600">Ícone</div>
          <div role="group" aria-label="Ícone do quadro" className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setIcon('')}
              aria-pressed={!icon}
              title="Ícone do modelo"
              className={`flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] ${!icon ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
            >
              Padrão
            </button>
            {Object.entries(BOARD_ICONS).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setIcon(key)}
                aria-label={item.label}
                aria-pressed={icon === key}
                title={item.label}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border ${icon === key ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              >
                <item.icon size={14} />
              </button>
            ))}
          </div>
        </div>

        {!editing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-slate-600">Colunas ({columns.length})</div>
              <Button
                variant="outline"
                size="xs"
                iconLeft={<Plus size={14} />}
                onClick={() => setColumns(prev => [...prev, { key: newKey(), title: '', color: '#94a3b8' }])}
              >
                Adicionar coluna
              </Button>
            </div>
            {columnsError && <Alert variant="error">{columnsError}</Alert>}
            <ul className="space-y-2">
              {columns.map((col, index) => (
                <li key={col.key} className="rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: col.color }} />
                    <div className="min-w-0 flex-1">
                      <Input
                        aria-label={`Nome da coluna ${index + 1}`}
                        value={col.title}
                        onChange={(e) => updateColumn(col.key, { title: e.target.value })}
                        placeholder="Nome da coluna"
                        showCount={false}
                      />
                    </div>
                    <IconButton variant="ghost" size="sm" aria-label="Mover coluna para cima" disabled={index === 0} onClick={() => moveColumn(index, -1)}><ArrowUp size={14} /></IconButton>
                    <IconButton variant="ghost" size="sm" aria-label="Mover coluna para baixo" disabled={index === columns.length - 1} onClick={() => moveColumn(index, 1)}><ArrowDown size={14} /></IconButton>
                    <IconButton variant="danger" size="sm" aria-label="Remover coluna" disabled={columns.length <= 1} onClick={() => setColumns(prev => prev.filter(c => c.key !== col.key))}><Trash2 size={14} /></IconButton>
                  </div>
                  <div className="mt-2 pl-3.5">
                    <ColorPicker size="sm" value={col.color} onChange={(hex) => updateColumn(col.key, { color: hex || '#94a3b8' })} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <aside aria-label="Prévia do quadro" className="space-y-2 lg:sticky lg:top-0 lg:self-start">
        <div className="text-xs font-medium text-slate-600">Prévia</div>
        <div className="rounded-lg border border-slate-200 bg-white p-3" style={{ borderTopColor: boardColor, borderTopWidth: 3 }}>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: boardColor }}>
              <PreviewIcon size={16} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-800">{title.trim() || 'Nome do quadro'}</div>
              <div className="truncate text-[11px] text-slate-500">{def.label}</div>
            </div>
          </div>
          {description.trim() && <p className="mt-2 line-clamp-2 text-xs text-slate-500">{description.trim()}</p>}
          <div className="mt-3">
            <MiniPreview columns={editing ? def.columns : columns.map(c => ({ title: c.title, color: c.color }))} />
          </div>
        </div>
        <p className="text-[11px] leading-snug text-slate-500">
          O modelo <span className="font-medium text-slate-700">{def.label}</span> define os campos dos cartões: {def.fields.length > 0
            ? def.fields.map(f => f.label.toLowerCase()).slice(0, 4).join(', ')
            : 'título, descrição, responsável, prazo e checklist'}.
        </p>
      </aside>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Editar quadro' : 'Novo quadro'}
      subtitle={editing ? undefined : 'Escolha um modelo e ajuste os detalhes antes de criar.'}
      size={editing ? 'xl' : 'full'}
      mobileStyle="fullscreen"
      className={editing ? undefined : 'md:h-[calc(100dvh-32px)]'}
      footer={
        <ModalFooter align="between">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancelar</Button>
          <div className="flex items-center gap-2">
            {!editing && step === 'modelo' ? (
              <Button variant="primary" size="sm" onClick={() => setStep('detalhes')}>Continuar</Button>
            ) : (
              <>
                {!editing && <Button variant="outline" size="sm" onClick={() => setStep('modelo')} disabled={saving}>Voltar</Button>}
                <Button variant="primary" size="sm" loading={saving} disabled={saving} onClick={submit}>
                  {editing ? 'Salvar alterações' : 'Criar quadro'}
                </Button>
              </>
            )}
          </div>
        </ModalFooter>
      }
    >
      {editing ? details : (
        <Tabs<Step> items={STEPS} value={step} onChange={setStep} label="Etapas do novo quadro">
          <div className="pt-4">{step === 'modelo' ? templates : details}</div>
        </Tabs>
      )}
    </Modal>
  );
};
