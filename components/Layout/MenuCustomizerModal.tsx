import React, { useState, useRef } from 'react';
import { NAV_SECTIONS } from '../../constants';
import { Modal, ModalFooter, Button, Input } from '../UI';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import type { MenuLayout, MenuLayoutSection, MenuLayoutItem } from '../../contexts/UserPreferencesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus, Trash2, GripVertical, PenLine, Check, X,
  LayoutGrid, ChevronDown, ChevronRight, Copy, Star,
  Inbox, ArrowRight,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from '../UI';

// ─── helpers ─────────────────────────────────────────────────────────────────

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function buildDefaultLayout(
  t: (k: string) => string,
  visibleSections: typeof NAV_SECTIONS,
): MenuLayout {
  return {
    id: genId(),
    name: 'Meu Menu',
    createdAt: new Date().toISOString(),
    sections: visibleSections.map(s => ({
      id: genId(),
      label: t(s.title),
      items: s.items.map((item: any) => ({ navItemPath: item.path })),
    })),
  };
}

// ─── types ────────────────────────────────────────────────────────────────────

interface NavMeta {
  path: string;
  label: string;
  icon: React.ReactNode;
}

// ─── drag data (passed via dataTransfer as JSON) ──────────────────────────────
type DragPayload =
  | { type: 'available-item'; path: string }
  | { type: 'section-item'; sectionId: string; path: string }
  | { type: 'section'; sectionId: string };

// ─── hook: all permitted nav items ────────────────────────────────────────────

function useAllNavItems(): NavMeta[] {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  return React.useMemo(() => {
    const result: NavMeta[] = [];
    for (const section of NAV_SECTIONS) {
      for (const item of section.items as any[]) {
        if (item.requiredFeature && !user?.plan_features?.includes(item.requiredFeature)) continue;
        if (item.requiredPermission && typeof hasPermission === 'function' && !hasPermission(item.requiredPermission)) continue;
        result.push({ path: item.path, label: t(item.label), icon: item.icon });
      }
    }
    return result;
  }, [t, user, hasPermission]);
}

// ─── AvailableItem ────────────────────────────────────────────────────────────

interface AvailableItemProps {
  item: NavMeta;
  isDark: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onAdd: () => void;
}

const AvailableItem: React.FC<AvailableItemProps> = ({ item, isDark, onDragStart, onAdd }) => (
  <div
    draggable
    onDragStart={onDragStart}
    className={cn(
      'group flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing select-none transition-all',
      isDark
        ? 'bg-slate-800/60 border-slate-700/50 hover:border-indigo-500/40 hover:bg-slate-700/60'
        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 shadow-xs',
    )}
  >
    <GripVertical size={13} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.icon}</span>
    <span className={cn('flex-1 text-[12px] font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-700')}>
      {item.label}
    </span>
    <button
      onClick={onAdd}
      title="Adicionar ao menu"
      className={cn(
        'opacity-0 group-hover:opacity-100 flex items-center justify-center h-5 w-5 rounded-lg transition-all',
        isDark ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/40' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200',
      )}
    >
      <ArrowRight size={11} />
    </button>
  </div>
);

// ─── SectionItem ──────────────────────────────────────────────────────────────

interface SectionItemProps {
  item: NavMeta;
  sectionId: string;
  isDark: boolean;
  isDropTarget: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: () => void;
}

const SectionItem: React.FC<SectionItemProps> = ({
  item, isDark, isDropTarget, onDragStart, onDragOver, onDrop, onRemove,
}) => (
  <div
    draggable
    onDragStart={onDragStart}
    onDragOver={onDragOver}
    onDrop={onDrop}
    className={cn(
      'group flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-grab active:cursor-grabbing select-none transition-all duration-100',
      isDropTarget
        ? isDark ? 'border-indigo-400/60 bg-indigo-500/15 ring-1 ring-indigo-400/20' : 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-100'
        : isDark ? 'bg-slate-700/40 border-slate-700/50 hover:bg-slate-700/70' : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100',
    )}
  >
    <GripVertical size={13} className={isDark ? 'text-slate-600' : 'text-slate-300'} />
    <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{item.icon}</span>
    <span className={cn('flex-1 text-[12px] font-semibold truncate', isDark ? 'text-slate-200' : 'text-slate-700')}>
      {item.label}
    </span>
    <button
      onClick={onRemove}
      className={cn(
        'opacity-0 group-hover:opacity-100 flex items-center justify-center h-5 w-5 rounded-lg transition-all',
        isDark ? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50',
      )}
    >
      <X size={11} />
    </button>
  </div>
);

// ─── LayoutPill ───────────────────────────────────────────────────────────────

interface LayoutPillProps {
  layout: MenuLayout;
  isActive: boolean;
  isSelected: boolean;
  isDefault?: boolean;
  isDark: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onSetActive: () => void;
}

const LayoutPill: React.FC<LayoutPillProps> = ({
  layout, isActive, isSelected, isDefault, isDark, onSelect, onDelete, onSetActive,
}) => (
  <div
    className={cn(
      'group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border cursor-pointer transition-all select-none',
      isSelected
        ? isDark ? 'bg-indigo-600/25 border-indigo-500/40 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        : isDark ? 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-200' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
    )}
    onClick={onSelect}
  >
    <LayoutGrid size={11} className="shrink-0" />
    <span className="text-[11px] font-bold truncate max-w-[90px]">{layout.name}</span>
    {isActive && !isDefault && (
      <Star size={9} className={isDark ? 'text-amber-400' : 'text-amber-500'} />
    )}
    {isDefault ? (
      <span className={cn(
        'text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0',
        isDark ? 'bg-slate-700 text-slate-500' : 'bg-slate-100 text-slate-400',
      )}>
        padrão
      </span>
    ) : (
    <div className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={e => { e.stopPropagation(); onSetActive(); }}
        title="Usar este layout"
        className={cn(
          'flex items-center justify-center h-4 w-4 rounded transition-all',
          isDark ? 'hover:bg-amber-500/20 text-slate-500 hover:text-amber-400' : 'hover:bg-amber-50 text-slate-400 hover:text-amber-500',
        )}
      >
        <Star size={9} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title="Remover layout"
        className={cn(
          'flex items-center justify-center h-4 w-4 rounded transition-all',
          isDark ? 'hover:bg-red-500/20 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500',
        )}
      >
        <X size={9} />
      </button>
    </div>
    )}
  </div>
);

// ─── main component ────────────────────────────────────────────────────────────

interface MenuCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MenuCustomizerModal: React.FC<MenuCustomizerModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { resolvedMode } = useTheme();
  const { preferences, saveMenuLayout, deleteMenuLayout, setActiveMenuLayout } = useUserPreferences();
  const allNavItems = useAllNavItems();
  const isDark = resolvedMode === 'dark';
  const { user, isAdmin, hasPermission } = useAuth();

  const visibleSections = React.useMemo(() => {
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter((item: any) => {
        if (item.requiredFeature && !user?.plan_features?.includes(item.requiredFeature)) return false;
        if (!item.requiredPermission) return true;
        return typeof hasPermission === 'function' ? hasPermission(item.requiredPermission) : true;
      }),
    })).filter(section => {
      if (user?.role === 'super_admin') return false;
      const isRestricted = section.title === 'nav.group.management' || section.title === 'nav.group.financial';
      if (isRestricted && !isAdmin) return false;
      return section.items.length > 0;
    });
  }, [user, isAdmin, hasPermission]);

  // Layout padrão virtual — nunca salvo, sempre reflete NAV_SECTIONS
  const DEFAULT_LAYOUT_ID = '__default__';
  const defaultLayout = React.useMemo<MenuLayout>(() => ({
    id: DEFAULT_LAYOUT_ID,
    name: 'Padrão',
    createdAt: '',
    sections: visibleSections.map(s => ({
      id: s.title,
      label: t(s.title),
      items: s.items.map((item: any) => ({ navItemPath: item.path })),
    })),
  }), [visibleSections, t]);

  // ── editing state ─────────────────────────────────────────────────────────
  const [layout, setLayout] = useState<MenuLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null); // null = unsaved new

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  // drag state
  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dropSectionId, setDropSectionId] = useState<string | null>(null); // section drop zone
  const [dropItemPath, setDropItemPath] = useState<string | null>(null);   // item drop zone
  const [dropSectionForSection, setDropSectionForSection] = useState<string | null>(null); // section reorder

  // ── init on open ──────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!isOpen) return;
    const layouts = preferences.menuLayouts;
    const activeId = preferences.activeMenuLayoutId;
    if (layouts.length === 0 || !activeId || activeId === DEFAULT_LAYOUT_ID) {
      // Mostra o layout padrão (read-only)
      setLayout(defaultLayout);
      setSelectedId(DEFAULT_LAYOUT_ID);
    } else {
      const target = layouts.find(l => l.id === activeId) ?? layouts[0];
      setLayout(JSON.parse(JSON.stringify(target)));
      setSelectedId(target.id);
    }
    setEditingName(false);
    setRenamingSection(null);
    setCollapsedSections({});
  }, [isOpen]);

  // ── available items (not in any section) ──────────────────────────────────
  const usedPaths = React.useMemo(() => {
    if (!layout) return new Set<string>();
    return new Set(layout.sections.flatMap(s => s.items.map(i => i.navItemPath)));
  }, [layout]);

  const availableItems = allNavItems.filter(item => !usedPaths.has(item.path));

  // ── layout CRUD ───────────────────────────────────────────────────────────
  const doSave = (l: MenuLayout) => {
    saveMenuLayout(l);
    setSelectedId(l.id);
  };

  const handleSaveAndClose = () => {
    if (!layout) return;
    if (isDefaultSelected) { onClose(); return; }
    doSave(layout);
    setActiveMenuLayout(layout.id);
    onClose();
  };

  const handleSaveOnly = () => {
    if (!layout || isDefaultSelected) return;
    doSave(layout);
    setActiveMenuLayout(layout.id);
  };

  const isDefaultSelected = selectedId === DEFAULT_LAYOUT_ID;

  const handleNew = () => {
    // só salva se não for o padrão (que é read-only e não existe nos saves)
    if (layout && !isDefaultSelected) doSave(layout);
    const blank: MenuLayout = {
      id: genId(),
      name: 'Novo Layout',
      createdAt: new Date().toISOString(),
      sections: [],
    };
    setLayout(blank);
    setSelectedId(null);
    setEditingName(true);
    setNameValue('Novo Layout');
  };

  const handleDuplicate = () => {
    if (!layout || isDefaultSelected) return;
    const copy: MenuLayout = {
      ...JSON.parse(JSON.stringify(layout)),
      id: genId(),
      name: layout.name + ' (cópia)',
      createdAt: new Date().toISOString(),
    };
    setLayout(copy);
    setSelectedId(null);
    setEditingName(false);
  };

  const handleSelectLayout = (l: MenuLayout) => {
    // salva o atual se não for o padrão
    if (layout && !isDefaultSelected) doSave(layout);
    if (l.id === DEFAULT_LAYOUT_ID) {
      setLayout(defaultLayout);
      setSelectedId(DEFAULT_LAYOUT_ID);
    } else {
      setLayout(JSON.parse(JSON.stringify(l)));
      setSelectedId(l.id);
    }
    setEditingName(false);
    setRenamingSection(null);
  };

  const confirmAndDelete = (id: string) => {
    const target = preferences.menuLayouts.find(l => l.id === id);
    if (!target) return;
    setConfirmDelete({ id, name: target.name });
  };

  const handleDeleteLayout = (id: string) => {
    setConfirmDelete(null);
    deleteMenuLayout(id);
    const remaining = preferences.menuLayouts.filter(l => l.id !== id);
    if (remaining.length > 0) {
      const next = remaining[0];
      setLayout(JSON.parse(JSON.stringify(next)));
      setSelectedId(next.id);
    } else {
      // sem layouts salvos → volta ao padrão
      setLayout(defaultLayout);
      setSelectedId(DEFAULT_LAYOUT_ID);
    }
  };

  // ── section CRUD ──────────────────────────────────────────────────────────
  const addSection = () => {
    if (!layout) return;
    const newSec: MenuLayoutSection = { id: genId(), label: 'Nova Seção', items: [] };
    setLayout({ ...layout, sections: [...layout.sections, newSec] });
    setRenamingSection(newSec.id);
    setSectionName(newSec.label);
  };

  const deleteSection = (id: string) => {
    if (!layout) return;
    setLayout({ ...layout, sections: layout.sections.filter(s => s.id !== id) });
  };

  const commitRenameSection = (id: string) => {
    if (!layout) return;
    setLayout({ ...layout, sections: layout.sections.map(s => s.id === id ? { ...s, label: sectionName } : s) });
    setRenamingSection(null);
  };

  // ── item CRUD ─────────────────────────────────────────────────────────────
  const addItemToSection = (sectionId: string, path: string) => {
    if (!layout) return;
    if (usedPaths.has(path)) return;
    setLayout({
      ...layout,
      sections: layout.sections.map(s =>
        s.id === sectionId ? { ...s, items: [...s.items, { navItemPath: path }] } : s,
      ),
    });
  };

  const removeItemFromSection = (sectionId: string, path: string) => {
    if (!layout) return;
    setLayout({
      ...layout,
      sections: layout.sections.map(s =>
        s.id === sectionId ? { ...s, items: s.items.filter(i => i.navItemPath !== path) } : s,
      ),
    });
  };

  const moveItemToSection = (fromSectionId: string | null, path: string, toSectionId: string, beforePath?: string) => {
    if (!layout) return;
    let sections = layout.sections.map(s => ({ ...s, items: [...s.items] }));

    // remove from source (if it came from a section)
    if (fromSectionId) {
      const src = sections.find(s => s.id === fromSectionId);
      if (src) src.items = src.items.filter(i => i.navItemPath !== path);
    }

    // insert at destination
    const dst = sections.find(s => s.id === toSectionId);
    if (!dst) return;
    const newItem: MenuLayoutItem = { navItemPath: path };
    if (beforePath) {
      const idx = dst.items.findIndex(i => i.navItemPath === beforePath);
      if (idx >= 0) {
        dst.items.splice(idx, 0, newItem);
      } else {
        dst.items.push(newItem);
      }
    } else {
      dst.items.push(newItem);
    }

    setLayout({ ...layout, sections });
  };

  const reorderSection = (fromId: string, toId: string) => {
    if (!layout || fromId === toId) return;
    const sections = [...layout.sections];
    const fromIdx = sections.findIndex(s => s.id === fromId);
    const toIdx = sections.findIndex(s => s.id === toId);
    const [moved] = sections.splice(fromIdx, 1);
    sections.splice(toIdx, 0, moved);
    setLayout({ ...layout, sections });
  };

  // ── drag & drop handlers ──────────────────────────────────────────────────

  const encodeDrag = (payload: DragPayload, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    setDragPayload(payload);
  };

  const decodeDrag = (e: React.DragEvent): DragPayload | null => {
    try { return JSON.parse(e.dataTransfer.getData('application/json')); } catch { return null; }
  };

  const clearDrag = () => {
    setDragPayload(null);
    setDropSectionId(null);
    setDropItemPath(null);
    setDropSectionForSection(null);
  };

  // Drop on a section drop-zone (empty section or section header)
  const onSectionDropZoneDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropSectionId(sectionId);
    setDropItemPath(null);
  };

  const onSectionDropZoneDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = decodeDrag(e);
    if (!payload) { clearDrag(); return; }
    if (payload.type === 'available-item') {
      moveItemToSection(null, payload.path, sectionId);
    } else if (payload.type === 'section-item') {
      if (payload.sectionId !== sectionId) {
        moveItemToSection(payload.sectionId, payload.path, sectionId);
      }
    }
    clearDrag();
  };

  // Drop on a specific item slot (for ordering within / between sections)
  const onItemDropZoneDragOver = (e: React.DragEvent, sectionId: string, itemPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropSectionId(sectionId);
    setDropItemPath(itemPath);
  };

  const onItemDropZoneDrop = (e: React.DragEvent, sectionId: string, beforePath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = decodeDrag(e);
    if (!payload) { clearDrag(); return; }
    if (payload.type === 'available-item') {
      moveItemToSection(null, payload.path, sectionId, beforePath);
    } else if (payload.type === 'section-item') {
      if (payload.path === beforePath && payload.sectionId === sectionId) { clearDrag(); return; }
      moveItemToSection(payload.sectionId, payload.path, sectionId, beforePath);
    }
    clearDrag();
  };

  // Drop for section reorder
  const onSectionHeaderDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    if (dragPayload?.type === 'section') setDropSectionForSection(sectionId);
  };

  const onSectionHeaderDrop = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault();
    const payload = decodeDrag(e);
    if (payload?.type === 'section') reorderSection(payload.sectionId, sectionId);
    clearDrag();
  };

  // ── theme ─────────────────────────────────────────────────────────────────
  const panelBg = isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/80 border-slate-200';
  const sectionCardBg = isDark ? 'bg-slate-800/70 border-slate-700/50' : 'bg-white border-slate-200 shadow-xs';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-800';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const divider = isDark ? 'border-slate-700/60' : 'border-slate-200';

  const isCurrentActive = isDefaultSelected
    ? (!preferences.activeMenuLayoutId || preferences.activeMenuLayoutId === DEFAULT_LAYOUT_ID)
    : preferences.activeMenuLayoutId === selectedId;

  if (!layout) return null;

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className={cn('p-1.5 rounded-xl', isDark ? 'bg-indigo-500/15' : 'bg-indigo-50')}>
            <LayoutGrid size={15} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          </div>
          <div>
            <div className={cn('text-[14px] font-black tracking-wide uppercase', textPrimary)}>Personalizar Menu</div>
            <div className={cn('text-[11px] font-medium', textMuted)}>Arraste itens para organizar sua barra lateral</div>
          </div>
        </div>
      }
      size="full"
      mobileStyle="fullscreen"
      hideCloseButton={false}
      footer={
        <ModalFooter align="between">
          <button
            onClick={onClose}
            className={cn('h-9 px-4 rounded-xl border text-sm font-bold transition-all', isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            Fechar sem salvar
          </button>
          <div className="flex items-center gap-2">
            {isDefaultSelected ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Check size={13} />}
                disabled={isCurrentActive}
                onClick={() => { setActiveMenuLayout(null); onClose(); }}
              >
                {isCurrentActive ? 'Padrão já ativo' : 'Ativar layout padrão'}
              </Button>
            ) : (
              <>
                {!isCurrentActive && selectedId && (
                  <button
                    onClick={() => setActiveMenuLayout(selectedId)}
                    className={cn('h-9 px-3.5 rounded-xl border text-[12px] font-bold transition-all flex items-center gap-1.5', isDark ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10' : 'border-amber-200 text-amber-600 hover:bg-amber-50')}
                  >
                    <Star size={12} /> Ativar
                  </button>
                )}
                <Button variant="primary" size="sm" leftIcon={<Check size={13} />} onClick={handleSaveAndClose}>
                  Salvar e ativar
                </Button>
              </>
            )}
          </div>
        </ModalFooter>
      }
    >
      <div className="flex flex-col gap-4 h-full min-h-[520px]">

        {/* ── Layouts row ── */}
        <div className={cn('flex items-center gap-2 p-3 rounded-2xl border flex-wrap', panelBg)}>
          <span className={cn('text-[10px] font-black uppercase tracking-widest mr-1', textMuted)}>Layouts</span>

          {/* Layout padrão — sempre visível, imutável */}
          <LayoutPill
            layout={defaultLayout}
            isActive={!preferences.activeMenuLayoutId || preferences.activeMenuLayoutId === DEFAULT_LAYOUT_ID}
            isSelected={selectedId === DEFAULT_LAYOUT_ID}
            isDefault
            isDark={isDark}
            onSelect={() => handleSelectLayout(defaultLayout)}
            onDelete={() => {}}
            onSetActive={() => {}}
          />

          {/* Layouts salvos */}
          {preferences.menuLayouts.map(l => (
            <LayoutPill
              key={l.id}
              layout={l}
              isActive={preferences.activeMenuLayoutId === l.id}
              isSelected={selectedId === l.id}
              isDark={isDark}
              onSelect={() => handleSelectLayout(l)}
              onDelete={() => confirmAndDelete(l.id)}
              onSetActive={() => setActiveMenuLayout(l.id)}
            />
          ))}

          {/* Layout novo ainda não salvo */}
          {selectedId === null && layout && (
            <LayoutPill
              layout={layout}
              isActive={false}
              isSelected={true}
              isDark={isDark}
              onSelect={() => {}}
              onDelete={() => {}}
              onSetActive={() => {}}
            />
          )}

          <div className={cn('w-px h-5 mx-1', divider)} />
          <button
            onClick={handleNew}
            className={cn('flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-bold transition-all', isDark ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/35' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100')}
          >
            <Plus size={11} /> Novo
          </button>
          {!isDefaultSelected && (
            <button
              onClick={handleDuplicate}
              className={cn('flex items-center gap-1 h-7 px-2.5 rounded-xl text-[11px] font-bold transition-all', isDark ? 'text-slate-500 hover:bg-slate-700 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600')}
            >
              <Copy size={11} /> Duplicar
            </button>
          )}
        </div>

        {/* ── Layout name ── */}
        <div className="flex items-center gap-2.5">
          {!isDefaultSelected && editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') { setLayout({ ...layout, name: nameValue }); setEditingName(false); }
                  if (e.key === 'Escape') setEditingName(false);
                }}
                className="flex-1 max-w-xs"
              />
              <button onClick={() => { setLayout({ ...layout, name: nameValue }); setEditingName(false); }} className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all shrink-0 border border-emerald-200">
                <Check size={14} />
              </button>
              <button onClick={() => setEditingName(false)} className="h-8 w-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-all shrink-0">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className={cn('font-black text-[16px]', textPrimary)}>{layout.name}</h3>
              {isDefaultSelected ? (
                <span className={cn('text-[11px] font-medium', textMuted)}>— layout padrão do sistema, não editável</span>
              ) : (
                <>
                  <button
                    onClick={() => { setEditingName(true); setNameValue(layout.name); }}
                    className={cn('h-6 w-6 rounded-lg flex items-center justify-center transition-all', isDark ? 'text-slate-600 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100')}
                  >
                    <PenLine size={12} />
                  </button>
                  {isCurrentActive && (
                    <span className={cn('flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full', isDark ? 'bg-amber-500/15 text-amber-400' : 'bg-amber-50 text-amber-600 border border-amber-100')}>
                      <Star size={8} /> Ativo
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Two-column canvas ── */}
        <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: 380 }}>

          {/* ── LEFT: available items (oculto no padrão) ── */}
          {!isDefaultSelected && (
            <div className={cn('flex flex-col w-[220px] shrink-0 rounded-2xl border overflow-hidden', panelBg)}>
              <div className={cn('px-3 py-2.5 border-b', divider)}>
                <span className={cn('text-[10px] font-black uppercase tracking-widest', textMuted)}>Itens disponíveis</span>
                <p className={cn('text-[11px] mt-0.5', textMuted)}>Arraste para uma seção →</p>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {availableItems.length === 0 ? (
                  <div className={cn('flex flex-col items-center justify-center gap-2 py-8 text-center', textMuted)}>
                    <Inbox size={20} className="opacity-40" />
                    <span className="text-[11px]">Todos os itens já estão no menu</span>
                  </div>
                ) : (
                  availableItems.map(item => (
                    <AvailableItem
                      key={item.path}
                      item={item}
                      isDark={isDark}
                      onDragStart={e => encodeDrag({ type: 'available-item', path: item.path }, e)}
                      onAdd={() => {
                        if (layout.sections.length > 0) {
                          addItemToSection(layout.sections[0].id, item.path);
                        } else {
                          const newSec: MenuLayoutSection = { id: genId(), label: 'Seção', items: [{ navItemPath: item.path }] };
                          setLayout({ ...layout, sections: [newSec] });
                        }
                      }}
                    />
                  ))
                )}
              </div>

              {/* Resetar para o padrão */}
              <div className={cn('p-2 border-t', divider)}>
                <button
                  onClick={() => {
                    if (!layout) return;
                    const reset: MenuLayout = {
                      ...layout,
                      sections: defaultLayout.sections.map(s => ({ ...s, id: genId(), items: [...s.items] })),
                    };
                    setLayout(reset);
                  }}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 h-7 rounded-xl text-[11px] font-bold transition-all',
                    isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
                  )}
                  title="Restaura as seções e itens do layout padrão do sistema"
                >
                  ↺ Resetar para o padrão
                </button>
              </div>
            </div>
          )}

          {/* ── RIGHT: sections canvas ── */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-0.5">
            <AnimatePresence initial={false}>
              {layout.sections.map(section => {
                const isReordering = !isDefaultSelected && dropSectionForSection === section.id && dragPayload?.type === 'section';
                const isCollapsed = collapsedSections[section.id];

                return (
                  <motion.div
                    key={section.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    draggable={!isDefaultSelected}
                    onDragStart={e => !isDefaultSelected && encodeDrag({ type: 'section', sectionId: section.id }, e)}
                    onDragOver={e => !isDefaultSelected && onSectionHeaderDragOver(e, section.id)}
                    onDrop={e => !isDefaultSelected && onSectionHeaderDrop(e, section.id)}
                    onDragEnd={clearDrag}
                    className={cn(
                      'rounded-2xl border flex-shrink-0 transition-all duration-100',
                      sectionCardBg,
                      isReordering && (isDark ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-indigo-300 ring-1 ring-indigo-100'),
                    )}
                  >
                    {/* Section header */}
                    <div className={cn('flex items-center gap-2 px-3 py-2.5 border-b', divider)}>
                      <GripVertical size={14} className={cn('shrink-0', isDefaultSelected ? 'opacity-20 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing', isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500')} />

                      {!isDefaultSelected && renamingSection === section.id ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            className={cn('flex-1 text-[12px] font-black uppercase tracking-widest bg-transparent border-b outline-none', isDark ? 'text-slate-100 border-indigo-500' : 'text-slate-700 border-indigo-400')}
                            value={sectionName}
                            onChange={e => setSectionName(e.target.value)}
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRenameSection(section.id);
                              if (e.key === 'Escape') setRenamingSection(null);
                            }}
                          />
                          <button onClick={() => commitRenameSection(section.id)} className="text-emerald-500 hover:text-emerald-600 shrink-0"><Check size={12} /></button>
                          <button onClick={() => setRenamingSection(null)} className="text-slate-400 hover:text-slate-500 shrink-0"><X size={12} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => !isDefaultSelected && (setRenamingSection(section.id), setSectionName(section.label))}
                          className={cn(
                            'flex-1 text-left text-[10px] font-black uppercase tracking-widest transition-all group',
                            isDefaultSelected
                              ? isDark ? 'text-slate-500 cursor-default' : 'text-slate-400 cursor-default'
                              : isDark ? 'text-slate-500 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600',
                          )}
                        >
                          {section.label}
                          {!isDefaultSelected && <PenLine size={10} className="inline ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
                        </button>
                      )}

                      <div className="flex items-center gap-1 ml-auto shrink-0">
                        <span className={cn('text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md', isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400')}>
                          {section.items.length}
                        </span>
                        <button
                          onClick={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                          className={cn('h-6 w-6 flex items-center justify-center rounded-lg transition-all', isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100')}
                        >
                          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {!isDefaultSelected && (
                          <button
                            onClick={() => deleteSection(section.id)}
                            className={cn('h-6 w-6 flex items-center justify-center rounded-lg transition-all', isDark ? 'text-slate-600 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-300 hover:text-red-500 hover:bg-red-50')}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    {!isCollapsed && (
                      <div
                        className="p-2.5 space-y-1.5 min-h-[52px]"
                        onDragOver={e => !isDefaultSelected && onSectionDropZoneDragOver(e, section.id)}
                        onDrop={e => !isDefaultSelected && onSectionDropZoneDrop(e, section.id)}
                        onDragLeave={() => !isDefaultSelected && (setDropSectionId(null), setDropItemPath(null))}
                      >
                        {section.items.length === 0 && (
                          <div className={cn(
                            'flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed text-[11px] font-medium transition-all',
                            !isDefaultSelected && dropSectionId === section.id && !dropItemPath
                              ? isDark ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400' : 'border-indigo-300 bg-indigo-50 text-indigo-500'
                              : isDark ? 'border-slate-700 text-slate-600' : 'border-slate-200 text-slate-400',
                          )}>
                            {isDefaultSelected ? 'Seção vazia' : 'Arraste itens aqui'}
                          </div>
                        )}

                        {section.items.map(layoutItem => {
                          const navItem = allNavItems.find(n => n.path === layoutItem.navItemPath);
                          if (!navItem) return null;
                          const isDropHere = !isDefaultSelected && dropSectionId === section.id && dropItemPath === layoutItem.navItemPath;
                          return (
                            <SectionItem
                              key={layoutItem.navItemPath}
                              item={navItem}
                              sectionId={section.id}
                              isDark={isDark}
                              isDropTarget={isDropHere}
                              onDragStart={e => !isDefaultSelected && encodeDrag({ type: 'section-item', sectionId: section.id, path: layoutItem.navItemPath }, e)}
                              onDragOver={e => !isDefaultSelected && onItemDropZoneDragOver(e, section.id, layoutItem.navItemPath)}
                              onDrop={e => !isDefaultSelected && onItemDropZoneDrop(e, section.id, layoutItem.navItemPath)}
                              onRemove={() => !isDefaultSelected && removeItemFromSection(section.id, layoutItem.navItemPath)}
                            />
                          );
                        })}

                        {/* Drop at end of section */}
                        {!isDefaultSelected && section.items.length > 0 && (
                          <div
                            className={cn(
                              'h-6 rounded-xl border-2 border-dashed transition-all',
                              dropSectionId === section.id && !dropItemPath
                                ? isDark ? 'border-indigo-500/50 bg-indigo-500/8' : 'border-indigo-300 bg-indigo-50/60'
                                : 'border-transparent',
                            )}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropSectionId(section.id); setDropItemPath(null); }}
                            onDrop={e => onSectionDropZoneDrop(e, section.id)}
                          />
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Add section — apenas para layouts editáveis */}
            {!isDefaultSelected && <button
              onClick={addSection}
              className={cn(
                'flex items-center justify-center gap-2 h-11 rounded-2xl border-2 border-dashed text-[12px] font-bold transition-all flex-shrink-0',
                isDark ? 'border-slate-700 text-slate-600 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5' : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/40',
              )}
            >
              <Plus size={13} /> Adicionar seção
            </button>}
          </div>
        </div>

      </div>
    </Modal>

    <ConfirmModal
      isOpen={!!confirmDelete}
      onClose={() => setConfirmDelete(null)}
      onConfirm={() => confirmDelete && handleDeleteLayout(confirmDelete.id)}
      title="Excluir layout"
      message={
        confirmDelete ? (
          <span>
            Tem certeza que deseja excluir o layout{' '}
            <strong className="text-slate-800">"{confirmDelete.name}"</strong>?
            {preferences.activeMenuLayoutId === confirmDelete.id && (
              <span className="block mt-2 text-amber-600 text-[12px] font-semibold">
                Este é o layout ativo. O menu voltará ao padrão após a exclusão.
              </span>
            )}
          </span>
        ) : ''
      }
      confirmLabel="Excluir layout"
      cancelLabel="Cancelar"
      variant="danger"
    />
    </>
  );
};
