import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_SECTIONS } from '../constants';
import { PageWrapper, SectionTitle, Button, IconButton, Input, ConfirmModal, EmptyState, Badge } from '../components/UI';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { MenuLayout, MenuLayoutSection, MenuLayoutItem } from '../contexts/UserPreferencesContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Plus, Trash2, GripVertical, PenLine, Check, X,
  LayoutGrid, ChevronDown, ChevronRight, Copy, Star,
  Inbox, ArrowRight, ArrowLeft, ChevronUp, CheckCircle2, Save,
} from 'lucide-react';

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

interface NavMeta {
  path: string;
  label: string;
  icon: React.ReactNode;
}

type DragPayload =
  | { type: 'available-item'; path: string }
  | { type: 'section-item'; sectionId: string; path: string }
  | { type: 'section'; sectionId: string };

function useAllNavItems(): NavMeta[] {
  const { t } = useLanguage();
  const { user, hasPermission } = useAuth();
  return useMemo(() => {
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

const DEFAULT_LAYOUT_ID = '__default__';

const AUTO_SCROLL_ZONE = 64;
const AUTO_SCROLL_SPEED = 12;

export const MenuCustomizer: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAdmin, hasPermission } = useAuth();
  const { preferences, saveMenuLayout, deleteMenuLayout, setActiveMenuLayout } = useUserPreferences();
  const allNavItems = useAllNavItems();
  const sectionsScrollRef = useRef<HTMLDivElement>(null);
  const autoScrollDir = useRef<0 | -1 | 1>(0);
  const autoScrollRaf = useRef<number | null>(null);

  const visibleSections = useMemo(() => {
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

  const defaultLayout = useMemo<MenuLayout>(() => ({
    id: DEFAULT_LAYOUT_ID,
    name: 'Padrão',
    createdAt: '',
    sections: visibleSections.map(s => ({
      id: s.title,
      label: t(s.title),
      items: s.items.map((item: any) => ({ navItemPath: item.path })),
    })),
  }), [visibleSections, t]);

  const [layout, setLayout] = useState<MenuLayout | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [renamingSection, setRenamingSection] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const [dragPayload, setDragPayload] = useState<DragPayload | null>(null);
  const [dropSectionId, setDropSectionId] = useState<string | null>(null);
  const [dropItemPath, setDropItemPath] = useState<string | null>(null);
  const [dropBefore, setDropBefore] = useState(true);
  const [dropSectionForSection, setDropSectionForSection] = useState<string | null>(null);

  const isDefaultSelected = selectedId === DEFAULT_LAYOUT_ID;

  // Sincroniza com a preferência ativa — tanto ao montar quanto se ela mudar
  // externamente enquanto a página está aberta (ex: outra aba).
  useEffect(() => {
    const layouts = preferences.menuLayouts;
    const activeId = preferences.activeMenuLayoutId;
    if (layout) return; // já inicializado nesta sessão de edição
    if (layouts.length === 0 || !activeId || activeId === DEFAULT_LAYOUT_ID) {
      setLayout(defaultLayout);
      setSelectedId(DEFAULT_LAYOUT_ID);
    } else {
      const target = layouts.find(l => l.id === activeId) ?? layouts[0];
      setLayout(JSON.parse(JSON.stringify(target)));
      setSelectedId(target.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.menuLayouts, preferences.activeMenuLayoutId, defaultLayout]);

  const usedPaths = useMemo(() => {
    if (!layout) return new Set<string>();
    return new Set(layout.sections.flatMap(s => s.items.map(i => i.navItemPath)));
  }, [layout]);

  const availableItems = allNavItems.filter(item => !usedPaths.has(item.path));

  const isCurrentActive = isDefaultSelected
    ? (!preferences.activeMenuLayoutId || preferences.activeMenuLayoutId === DEFAULT_LAYOUT_ID)
    : preferences.activeMenuLayoutId === selectedId;

  // ── layout CRUD ──────────────────────────────────────────────────────────
  const doSave = (l: MenuLayout) => {
    saveMenuLayout(l);
    setSelectedId(l.id);
  };

  const handleActivate = () => {
    if (!layout) return;
    if (isDefaultSelected) {
      setActiveMenuLayout(null);
      return;
    }
    doSave(layout);
    setActiveMenuLayout(layout.id);
  };

  // Ativa um layout específico diretamente (usado na lista lateral) — não depende
  // do state `layout` em edição, evitando ativar o layout errado por closure stale.
  const handleActivateLayout = (l: MenuLayout, isDefault?: boolean) => {
    if (isDefault) {
      setActiveMenuLayout(null);
      return;
    }
    setActiveMenuLayout(l.id);
  };

  const handleEditLayout = (l: MenuLayout) => {
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

  const handleNew = () => {
    if (layout && !isDefaultSelected) doSave(layout);
    const blank: MenuLayout = { id: genId(), name: 'Novo Layout', createdAt: new Date().toISOString(), sections: [] };
    doSave(blank);
    setLayout(blank);
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
    doSave(copy);
    setLayout(copy);
  };

  const handleSave = () => {
    if (!layout || isDefaultSelected) return;
    doSave(layout);
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
      setLayout(defaultLayout);
      setSelectedId(DEFAULT_LAYOUT_ID);
    }
  };

  // ── section CRUD ─────────────────────────────────────────────────────────
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

  // ── item CRUD ────────────────────────────────────────────────────────────
  const addItemToSection = (sectionId: string, path: string) => {
    if (!layout) return;
    if (usedPaths.has(path)) return;
    setLayout({
      ...layout,
      sections: layout.sections.map(s => s.id === sectionId ? { ...s, items: [...s.items, { navItemPath: path }] } : s),
    });
  };

  const removeItemFromSection = (sectionId: string, path: string) => {
    if (!layout) return;
    setLayout({
      ...layout,
      sections: layout.sections.map(s => s.id === sectionId ? { ...s, items: s.items.filter(i => i.navItemPath !== path) } : s),
    });
  };

  const moveItemToSection = (fromSectionId: string | null, path: string, toSectionId: string, beforePath?: string, insertAfter?: boolean) => {
    if (!layout) return;
    let sections = layout.sections.map(s => ({ ...s, items: [...s.items] }));

    if (fromSectionId) {
      const src = sections.find(s => s.id === fromSectionId);
      if (src) src.items = src.items.filter(i => i.navItemPath !== path);
    }

    const dst = sections.find(s => s.id === toSectionId);
    if (!dst) return;
    const newItem: MenuLayoutItem = { navItemPath: path };
    if (beforePath) {
      const idx = dst.items.findIndex(i => i.navItemPath === beforePath);
      if (idx >= 0) {
        dst.items.splice(insertAfter ? idx + 1 : idx, 0, newItem);
      } else {
        dst.items.push(newItem);
      }
    } else {
      dst.items.push(newItem);
    }

    setLayout({ ...layout, sections });
  };

  const moveItemWithinSection = (sectionId: string, path: string, direction: -1 | 1) => {
    if (!layout) return;
    const sections = layout.sections.map(s => ({ ...s, items: [...s.items] }));
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return;
    const idx = sec.items.findIndex(i => i.navItemPath === path);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sec.items.length) return;
    [sec.items[idx], sec.items[targetIdx]] = [sec.items[targetIdx], sec.items[idx]];
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

  const moveSection = (id: string, direction: -1 | 1) => {
    if (!layout) return;
    const sections = [...layout.sections];
    const idx = sections.findIndex(s => s.id === id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sections.length) return;
    [sections[idx], sections[targetIdx]] = [sections[targetIdx], sections[idx]];
    setLayout({ ...layout, sections });
  };

  // ── drag & drop ──────────────────────────────────────────────────────────
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
    stopAutoScroll();
  };

  // Auto-scroll do container de seções quando o cursor se aproxima da borda superior/inferior.
  const stopAutoScroll = () => {
    autoScrollDir.current = 0;
    if (autoScrollRaf.current) {
      cancelAnimationFrame(autoScrollRaf.current);
      autoScrollRaf.current = null;
    }
  };

  const tickAutoScroll = () => {
    const el = sectionsScrollRef.current;
    if (el && autoScrollDir.current !== 0) {
      el.scrollTop += autoScrollDir.current * AUTO_SCROLL_SPEED;
      autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
    } else {
      autoScrollRaf.current = null;
    }
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    const el = sectionsScrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = e.clientY;
    let dir: 0 | -1 | 1 = 0;
    if (y < rect.top + AUTO_SCROLL_ZONE) dir = -1;
    else if (y > rect.bottom - AUTO_SCROLL_ZONE) dir = 1;
    autoScrollDir.current = dir;
    if (dir !== 0 && !autoScrollRaf.current) {
      autoScrollRaf.current = requestAnimationFrame(tickAutoScroll);
    }
  };

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
      if (payload.sectionId !== sectionId) moveItemToSection(payload.sectionId, payload.path, sectionId);
    }
    clearDrag();
  };

  // Decide inserir antes ou depois do item sob o cursor, com base na metade vertical do elemento.
  const onItemDragOver = (e: React.DragEvent, sectionId: string, itemPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    setDropSectionId(sectionId);
    setDropItemPath(itemPath);
    setDropBefore(isTopHalf);
  };

  const onItemDrop = (e: React.DragEvent, sectionId: string, itemPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = decodeDrag(e);
    if (!payload) { clearDrag(); return; }
    if (payload.type === 'available-item') {
      moveItemToSection(null, payload.path, sectionId, itemPath, !dropBefore);
    } else if (payload.type === 'section-item') {
      if (payload.path === itemPath && payload.sectionId === sectionId) { clearDrag(); return; }
      moveItemToSection(payload.sectionId, payload.path, sectionId, itemPath, !dropBefore);
    }
    clearDrag();
  };

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

  if (!layout) return null;

  const allLayoutRows: { l: MenuLayout; isDefault?: boolean }[] = [
    { l: defaultLayout, isDefault: true },
    ...preferences.menuLayouts.map(l => ({ l })),
  ];

  return (
    <PageWrapper>
      <div className="space-y-4">
      <SectionTitle
        icon={LayoutGrid}
        title="Personalizar Menu"
        description="Organize os itens da sua barra lateral em seções e na ordem que preferir"
        action={
          <Button variant="ghost" size="sm" iconLeft={<ArrowLeft size={14} />} onClick={() => navigate(-1)}>
            Voltar
          </Button>
        }
      />

      <div>
        <div className="flex flex-col lg:flex-row gap-3" style={{ minHeight: 560 }}>

          {/* ── Painel de layouts ── */}
          <div className="w-full lg:w-64 shrink-0 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-slate-600">Layouts</span>
              <Button variant="ghost" size="xs" iconLeft={<Plus size={14} />} onClick={handleNew}>Novo</Button>
            </div>

            <div className="space-y-1.5">
              {allLayoutRows.map(({ l, isDefault }) => {
                const isActive = isDefault
                  ? (!preferences.activeMenuLayoutId || preferences.activeMenuLayoutId === DEFAULT_LAYOUT_ID)
                  : preferences.activeMenuLayoutId === l.id;
                const isEditing = isDefault ? isDefaultSelected : selectedId === l.id;
                return (
                  <div
                    key={l.id}
                    onClick={() => handleEditLayout(l)}
                    className={`group rounded-lg border p-3 cursor-pointer transition-all ${
                      isEditing ? 'border-primary-300 bg-primary-50/60 ring-1 ring-primary-100' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={13} className={isEditing ? 'text-primary-600' : 'text-slate-400'} />
                      <span className={`flex-1 text-[13px] font-medium truncate ${isEditing ? 'text-primary-700' : 'text-slate-700'}`}>{l.name}</span>
                      {isActive && (
                        <Badge size="sm" color="success" icon={<CheckCircle2 size={10} />} className="shrink-0">Ativo</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {!isActive && (
                        <Button
                          variant="outline"
                          size="xs"
                          className="flex-1"
                          onClick={e => { e.stopPropagation(); handleActivateLayout(l, isDefault); }}
                        >
                          Ativar
                        </Button>
                      )}
                      {!isDefault && (
                        <IconButton
                          variant="ghost"
                          size="xs"
                          aria-label="Excluir layout"
                          title="Excluir layout"
                          onClick={e => { e.stopPropagation(); confirmAndDelete(l.id); }}
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Área de edição ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">

            {/* Nome + ações do layout em edição */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                {!isDefaultSelected && editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameValue}
                      onChange={e => setNameValue(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') { setLayout({ ...layout, name: nameValue }); setEditingName(false); }
                        if (e.key === 'Escape') setEditingName(false);
                      }}
                      className="max-w-xs"
                    />
                    <IconButton variant="success" size="sm" aria-label="Confirmar nome" onClick={() => { setLayout({ ...layout, name: nameValue }); setEditingName(false); }}><Check size={14} /></IconButton>
                    <IconButton variant="outline" size="sm" aria-label="Cancelar edição do nome" onClick={() => setEditingName(false)}><X size={14} /></IconButton>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-medium text-slate-900">{layout.name}</h3>
                    {isDefaultSelected ? (
                      <span className="text-[11px] text-slate-500">— layout padrão do sistema, não editável</span>
                    ) : (
                      <IconButton variant="ghost" size="xs" aria-label="Renomear layout" onClick={() => { setEditingName(true); setNameValue(layout.name); }}>
                        <PenLine size={14} />
                      </IconButton>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!isDefaultSelected && (
                  <>
                    <Button variant="outline" size="sm" iconLeft={<Copy size={14} />} onClick={handleDuplicate}>Duplicar</Button>
                    <Button variant="outline" size="sm" iconLeft={<Save size={14} />} onClick={handleSave}>Salvar</Button>
                  </>
                )}
                <Button
                  variant={isCurrentActive ? 'secondary' : 'primary'}
                  size="sm"
                  iconLeft={<Check size={14} />}
                  disabled={isCurrentActive}
                  onClick={handleActivate}
                >
                  {isCurrentActive ? 'Já é o menu ativo' : 'Ativar este layout'}
                </Button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0" style={{ minHeight: 460 }}>

              {/* Itens disponíveis */}
              {!isDefaultSelected && (
                <div className="flex flex-col w-full md:w-56 shrink-0 rounded-lg border border-slate-200 bg-slate-50/80 overflow-hidden">
                  <div className="px-3 py-2.5 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Itens disponíveis</span>
                    <p className="text-[11px] mt-0.5 text-slate-500">Arraste ou clique na seta →</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {availableItems.length === 0 ? (
                      <EmptyState icon={Inbox} title="Todos os itens já estão no menu" className="border-none bg-transparent py-8" />
                    ) : (
                      availableItems.map(item => (
                        <div
                          key={item.path}
                          draggable
                          onDragStart={e => encodeDrag({ type: 'available-item', path: item.path }, e)}
                          className="group flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/40 cursor-grab active:cursor-grabbing select-none transition-all"
                        >
                          <GripVertical size={13} className="text-slate-300" />
                          <span className="text-slate-500">{item.icon}</span>
                          <span className="flex-1 text-xs font-medium truncate text-slate-700">{item.label}</span>
                          <IconButton
                            variant="ghost"
                            size="xs"
                            aria-label="Adicionar ao menu"
                            title="Adicionar ao menu"
                            className="md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              if (layout.sections.length > 0) addItemToSection(layout.sections[0].id, item.path);
                              else setLayout({ ...layout, sections: [{ id: genId(), label: 'Seção', items: [{ navItemPath: item.path }] }] });
                            }}
                          >
                            <ArrowRight size={14} />
                          </IconButton>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-200">
                    <Button
                      variant="ghost"
                      size="xs"
                      fullWidth
                      onClick={() => setLayout({ ...layout, sections: defaultLayout.sections.map(s => ({ ...s, id: genId(), items: [...s.items] })) })}
                      title="Restaura as seções e itens do layout padrão do sistema"
                    >
                      ↺ Resetar para o padrão
                    </Button>
                  </div>
                </div>
              )}

              {/* Canvas de seções — scroll único, com auto-scroll durante drag */}
              <div
                ref={sectionsScrollRef}
                onDragOver={handleCanvasDragOver}
                onDragLeave={stopAutoScroll}
                className="flex-1 flex flex-col gap-3 overflow-y-auto pr-0.5"
              >
                {layout.sections.map((section, sectionIdx) => {
                  const isReordering = !isDefaultSelected && dropSectionForSection === section.id && dragPayload?.type === 'section';
                  const isCollapsed = collapsedSections[section.id];

                  return (
                    <div
                      key={section.id}
                      draggable={!isDefaultSelected}
                      onDragStart={e => !isDefaultSelected && encodeDrag({ type: 'section', sectionId: section.id }, e)}
                      onDragOver={e => !isDefaultSelected && onSectionHeaderDragOver(e, section.id)}
                      onDrop={e => !isDefaultSelected && onSectionHeaderDrop(e, section.id)}
                      onDragEnd={clearDrag}
                      className={`rounded-lg border bg-white shadow-xs flex-shrink-0 transition-all duration-100 ${
                        isReordering ? 'border-primary-300 ring-1 ring-primary-100' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200">
                        <GripVertical size={14} className={`shrink-0 ${isDefaultSelected ? 'opacity-20 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500'}`} />

                        {!isDefaultSelected && renamingSection === section.id ? (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <Input
                              size="sm"
                              wrapperClassName="flex-1"
                              aria-label="Nome da seção"
                              value={sectionName}
                              onChange={e => setSectionName(e.target.value)}
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') commitRenameSection(section.id);
                                if (e.key === 'Escape') setRenamingSection(null);
                              }}
                            />
                            <IconButton variant="success" size="xs" aria-label="Confirmar nome da seção" onClick={() => commitRenameSection(section.id)}><Check size={14} /></IconButton>
                            <IconButton variant="outline" size="xs" aria-label="Cancelar" onClick={() => setRenamingSection(null)}><X size={14} /></IconButton>
                          </div>
                        ) : (
                          <button
                            onClick={() => !isDefaultSelected && (setRenamingSection(section.id), setSectionName(section.label))}
                            className={`flex-1 text-left text-xs font-medium transition-all group ${
                              isDefaultSelected ? 'text-slate-500 cursor-default' : 'text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            {section.label}
                            {!isDefaultSelected && <PenLine size={10} className="inline ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />}
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto shrink-0">
                          <Badge size="sm">{section.items.length}</Badge>
                          {!isDefaultSelected && (
                            <>
                              <IconButton variant="ghost" size="xs" aria-label="Mover seção para cima" disabled={sectionIdx === 0} onClick={() => moveSection(section.id, -1)} title="Mover seção para cima">
                                <ChevronUp size={14} />
                              </IconButton>
                              <IconButton variant="ghost" size="xs" aria-label="Mover seção para baixo" disabled={sectionIdx === layout.sections.length - 1} onClick={() => moveSection(section.id, 1)} title="Mover seção para baixo">
                                <ChevronDown size={14} />
                              </IconButton>
                            </>
                          )}
                          <IconButton
                            variant="ghost"
                            size="xs"
                            aria-label={isCollapsed ? 'Expandir seção' : 'Recolher seção'}
                            onClick={() => setCollapsedSections(prev => ({ ...prev, [section.id]: !prev[section.id] }))}
                          >
                            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                          </IconButton>
                          {!isDefaultSelected && (
                            <IconButton variant="ghost" size="xs" aria-label="Excluir seção" onClick={() => deleteSection(section.id)}>
                              <Trash2 size={14} />
                            </IconButton>
                          )}
                        </div>
                      </div>

                      {!isCollapsed && (
                        <div
                          className="p-2.5 space-y-1.5 min-h-[52px]"
                          onDragOver={e => !isDefaultSelected && onSectionDropZoneDragOver(e, section.id)}
                          onDrop={e => !isDefaultSelected && onSectionDropZoneDrop(e, section.id)}
                          onDragLeave={() => !isDefaultSelected && (setDropSectionId(null), setDropItemPath(null))}
                        >
                          {section.items.length === 0 && (
                            <div className={`flex items-center justify-center gap-2 h-10 rounded-lg border-2 border-dashed text-[11px] font-medium transition-all ${
                              !isDefaultSelected && dropSectionId === section.id && !dropItemPath
                                ? 'border-primary-300 bg-primary-50 text-primary-500'
                                : 'border-slate-200 text-slate-400'
                            }`}>
                              {isDefaultSelected ? 'Seção vazia' : 'Arraste itens aqui'}
                            </div>
                          )}

                          {section.items.map((layoutItem, itemIdx) => {
                            const navItem = allNavItems.find(n => n.path === layoutItem.navItemPath);
                            if (!navItem) return null;
                            const isDropHere = !isDefaultSelected && dropSectionId === section.id && dropItemPath === layoutItem.navItemPath;
                            return (
                              <div
                                key={layoutItem.navItemPath}
                                draggable={!isDefaultSelected}
                                onDragStart={e => { if (isDefaultSelected) return; e.stopPropagation(); encodeDrag({ type: 'section-item', sectionId: section.id, path: layoutItem.navItemPath }, e); }}
                                onDragOver={e => !isDefaultSelected && onItemDragOver(e, section.id, layoutItem.navItemPath)}
                                onDrop={e => !isDefaultSelected && onItemDrop(e, section.id, layoutItem.navItemPath)}
                                className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-grab active:cursor-grabbing select-none transition-all duration-100 ${
                                  isDropHere
                                    ? (dropBefore ? 'border-primary-300 border-t-2 border-t-primary-500' : 'border-primary-300 border-b-2 border-b-primary-500') + 'bg-primary-50'
                                    : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100'
                                }`}
                              >
                                <GripVertical size={13} className="text-slate-300" />
                                <span className="text-slate-500">{navItem.icon}</span>
                                <span className="flex-1 text-xs font-medium truncate text-slate-700">{navItem.label}</span>
                                {!isDefaultSelected && (
                                  <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <IconButton variant="ghost" size="xs" aria-label="Mover para cima" title="Mover para cima" disabled={itemIdx === 0}
                                      onClick={() => moveItemWithinSection(section.id, layoutItem.navItemPath, -1)}>
                                      <ChevronUp size={14} />
                                    </IconButton>
                                    <IconButton variant="ghost" size="xs" aria-label="Mover para baixo" title="Mover para baixo" disabled={itemIdx === section.items.length - 1}
                                      onClick={() => moveItemWithinSection(section.id, layoutItem.navItemPath, 1)}>
                                      <ChevronDown size={14} />
                                    </IconButton>
                                    <IconButton variant="ghost" size="xs" aria-label="Remover do menu" title="Remover do menu"
                                      onClick={() => removeItemFromSection(section.id, layoutItem.navItemPath)}>
                                      <X size={14} />
                                    </IconButton>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {!isDefaultSelected && section.items.length > 0 && (
                            <div
                              className={`h-6 rounded-lg border-2 border-dashed transition-all ${
                                dropSectionId === section.id && !dropItemPath ? 'border-primary-300 bg-primary-50/60' : 'border-transparent'
                              }`}
                              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropSectionId(section.id); setDropItemPath(null); }}
                              onDrop={e => onSectionDropZoneDrop(e, section.id)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {!isDefaultSelected && (
                  <Button variant="outline" size="md" fullWidth iconLeft={<Plus size={14} />} onClick={addSection} className="shrink-0 border-dashed">
                    Adicionar seção
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>

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
                <span className="block mt-2 text-amber-600 text-xs font-medium">
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
    </PageWrapper>
  );
};
