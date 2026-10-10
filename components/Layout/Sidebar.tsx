import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAV_SECTIONS } from '../../constants';
import { LogOut, ShieldAlert, ChevronDown, LayoutGrid } from 'lucide-react';
import logoUrl from '../../images/logo-sistema/logo.png';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const STORAGE_KEY = 'sidebar_collapsed_sections';

function loadCollapsed(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveCollapsed(state: Record<string, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, isAdmin, hasPermission } = useAuth();
  const { resolvedMode } = useTheme();
  const { preferences } = useUserPreferences();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(loadCollapsed);

  // Expand all sections when the guided tour starts
  useEffect(() => {
    const handleExpandAll = () => {
      saveCollapsed({});
      setCollapsed({});
    };
    window.addEventListener('psiflux:expand-sidebar', handleExpandAll);
    return () => window.removeEventListener('psiflux:expand-sidebar', handleExpandAll);
  }, []);

  const isDark = resolvedMode === 'dark';

  /* ── Theme tokens (padrão MFC: limpo, denso, sem sombras fortes) ── */
  const sidebarSurface = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200';
  const headerBorder   = isDark ? 'border-slate-800' : 'border-slate-200';
  const headerBg       = isDark ? 'bg-slate-950' : 'bg-white';
  const activeItem  = isDark
    ? 'bg-primary-500/15 text-primary-200'
    : 'bg-primary-50 text-primary-700';
  const inactiveItem = isDark
    ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900';
  const activeIcon   = isDark ? 'text-primary-300' : 'text-primary-600';
  const inactiveIcon = isDark ? 'text-slate-500' : 'text-slate-400';
  const activeBar    = isDark ? 'bg-primary-400' : 'bg-primary-600';
  const logoutStyle  = isDark
    ? 'border border-red-500/20 text-red-300 bg-red-500/10 hover:bg-red-500/20'
    : 'border border-red-100 text-red-600 bg-red-50 hover:bg-red-100';
  const sectionHeaderCls = isDark
    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50';

  const toggleSection = useCallback((title: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [title]: !prev[title] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  // Item "Nota Fiscal" só aparece se a clínica ativou a NFS-e em Configurações > Dados
  // Fiscais — evitamos poluir NAV_SECTIONS (array estático) com esse caso especial.
  //
  // requiredCapability restringe itens de conteúdo específico de uma área de atuação
  // (ex: psicoterapia) — só vale para quem não é admin, que continua vendo tudo.
  const isNavItemVisible = React.useCallback((item: any) => {
    if (item.path === '/nota-fiscal' && !user?.nfseEnabled) return false;
    if (item.requiredCapability === 'does_psychotherapy' && !isAdmin && !user?.doesPsychotherapy) return false;
    return true;
  }, [user, isAdmin]);

  // All permitted nav items (path → meta)
  const allNavMeta = React.useMemo(() => {
    const map: Record<string, { label: string; icon: React.ReactNode; path: string }> = {};
    for (const section of NAV_SECTIONS) {
      for (const item of section.items as any[]) {
        if (item.requiredFeature && !user?.plan_features?.includes(item.requiredFeature)) continue;
        if (item.requiredPermission && typeof hasPermission === 'function' && !hasPermission(item.requiredPermission)) continue;
        if (!isNavItemVisible(item)) continue;
        map[item.path] = { label: item.label, icon: item.icon, path: item.path };
      }
    }
    return map;
  }, [user, hasPermission, isNavItemVisible]);

  // Default sections (no custom layout active)
  const defaultSections = React.useMemo(() => {
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter((item: any) => {
        if (item.requiredFeature && !user?.plan_features?.includes(item.requiredFeature)) return false;
        if (!isNavItemVisible(item)) return false;
        if (!item.requiredPermission) return true;
        return typeof hasPermission === 'function' ? hasPermission(item.requiredPermission) : true;
      })
    })).filter(section => {
      if (user?.role === 'super_admin') return false;
      const isRestricted = section.title === 'nav.group.management' || section.title === 'nav.group.financial';
      if (isRestricted && !isAdmin) return false;
      return section.items.length > 0;
    });
  }, [user, isAdmin, hasPermission, isNavItemVisible]);

  // Active custom layout sections (if set)
  const activeLayout = React.useMemo(() => {
    const { menuLayouts, activeMenuLayoutId } = preferences;
    if (!activeMenuLayoutId) return null;
    return menuLayouts.find(l => l.id === activeMenuLayoutId) ?? null;
  }, [preferences.menuLayouts, preferences.activeMenuLayoutId]);

  const visibleSections = React.useMemo(() => {
    if (!activeLayout) return defaultSections;
    return activeLayout.sections
      .map(section => ({
        title: section.label,
        icon: null as React.ReactNode,
        id: section.id,
        items: section.items
          .map(i => allNavMeta[i.navItemPath])
          .filter(Boolean)
          .map(meta => ({
            label: meta.label,
            path: meta.path,
            icon: meta.icon,
          })),
      }))
      .filter(s => s.items.length > 0);
  }, [activeLayout, defaultSections, allNavMeta]);

  const tourMap: Record<string, string> = {
    '/agenda': 'agenda', '/pacientes': 'pacientes', '/prontuario': 'prontuarios',
    '/formularios': 'formularios', '/instrumentos': 'instrumentos',
    '/servicos': 'servicos', '/comandas': 'comandas', '/financeiro': 'financeiro',
  };

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 bg-slate-900/40 z-[105] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed top-0 left-0 z-[110] h-full w-[240px] ${sidebarSurface} border-r flex flex-col transition-transform duration-300 shadow-lg lg:translate-x-0 lg:z-auto lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo */}
        <div className={`h-14 flex items-center px-3 border-b ${headerBorder} ${headerBg} flex-shrink-0`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-primary-50 border border-primary-100 p-1">
              <img src={logoUrl} alt="Plaelo" className="w-full h-full object-contain" />
            </div>
            <div className={`min-w-0 border-l pl-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <h1 className={`font-display font-semibold text-[15px] leading-none tracking-tight ${isDark ? 'text-slate-100' : 'text-[#1e295b]'}`}>
                Plaelo
              </h1>
              <span className={`text-[10px] whitespace-nowrap font-normal mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Conectando cuidado e gestão.
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-2.5 px-2 custom-scrollbar">
          <nav className="space-y-0.5">
            {user?.role === 'super_admin' ? (
              <div className="px-2 py-1">
                <span className="text-[11px] font-semibold text-slate-500 px-1">Master</span>
                <Link to="/painel-master" className={`mt-1 flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium ${activeItem}`}>
                  <ShieldAlert size={16}/> Painel Master
                </Link>
              </div>
            ) : (
              visibleSections.map((section) => {
                const isCollapsed = collapsed[section.title];
                const hasActiveItem = section.items.some((item: any) =>
                  item.path === '/dashboard' ? location.pathname === '/dashboard' : location.pathname.startsWith(item.path)
                );

                return (
                  <div key={section.title} className="mb-1.5">
                    {/* Section header — clicável para colapsar */}
                    <button
                      onClick={() => toggleSection(section.title)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors duration-150 group ${sectionHeaderCls}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {(section as any).icon && (
                          <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                            {(section as any).icon}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold">
                          {t(section.title)}
                        </span>
                        {hasActiveItem && isCollapsed && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-primary-400' : 'bg-primary-500'}`}/>
                        )}
                      </div>
                      <ChevronDown
                        size={12}
                        className={`opacity-50 group-hover:opacity-100 transition-all duration-200 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`}
                      />
                    </button>

                    {/* Items */}
                    {!isCollapsed && (
                      <div className="mt-0.5 space-y-0.5">
                        {section.items.map((item: any) => {
                          const isActive = item.path === '/dashboard'
                            ? location.pathname === '/dashboard'
                            : location.pathname.startsWith(item.path);

                          return (
                            <Link
                              key={item.label}
                              to={item.path}
                              onClick={() => window.innerWidth < 1024 && onClose()}
                              data-tour={tourMap[item.path]}
                              className={`relative flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors duration-150 ${isActive ? activeItem : inactiveItem}`}
                            >
                              {isActive && (
                                <div className={`absolute left-0 top-2 bottom-2 w-[3px] ${activeBar} rounded-r-full`}/>
                              )}
                              <span className={`flex-shrink-0 ${isActive ? activeIcon : inactiveIcon}`}>
                                {item.icon}
                              </span>
                              <span className="truncate">{t(item.label)}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </nav>
        </div>

        {/* Footer actions */}
        <div className={`p-2.5 border-t ${headerBorder} ${isDark ? 'bg-slate-950' : 'bg-slate-50/70'} space-y-1.5`}>
          {/* Personalizar menu */}
          <button
            onClick={() => navigate('/personalizar-menu')}
            className={`w-full flex items-center justify-center gap-2 h-8 px-2 rounded-lg text-xs font-medium transition-colors duration-150 ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700' : 'text-slate-600 hover:text-primary-700 hover:bg-primary-50 border border-slate-200 hover:border-primary-300'}`}
          >
            <LayoutGrid size={13}/>
            <span>Personalizar menu</span>
            {activeLayout && (
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full ${isDark ? 'bg-primary-500/20 text-primary-300' : 'bg-primary-50 text-primary-600'}`}>
                {activeLayout.name}
              </span>
            )}
          </button>

          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-2 h-8 px-2 rounded-lg text-xs font-medium transition-colors duration-150 ${logoutStyle}`}>
            <LogOut size={14}/> {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  );
};
