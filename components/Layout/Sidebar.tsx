import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../constants';
import { LogOut, ShieldAlert, ChevronDown } from 'lucide-react';
import logoUrl from '../../images/logo-psiflux.png';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { t } = useLanguage();
  const { user, isAdmin, hasPermission } = useAuth();
  const { resolvedMode } = useTheme();
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

  /* ── Theme tokens ── */
  const sidebarSurface = isDark ? 'bg-slate-950 border-slate-800/60' : 'bg-white border-slate-100/80';
  const headerBorder   = isDark ? 'border-slate-800/60' : 'border-slate-100';
  const headerBg       = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-indigo-50/60 via-white to-primary-50/40';
  const activeItem  = isDark
    ? 'bg-gradient-to-r from-indigo-500/25 to-primary-500/15 text-indigo-100 shadow-sm border border-indigo-400/20'
    : 'bg-gradient-to-r from-indigo-50 to-primary-50/60 text-indigo-700 shadow-sm border border-indigo-100/60';
  const inactiveItem = isDark
    ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
    : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-800';
  const activeIcon   = isDark ? 'text-indigo-300' : 'text-indigo-600';
  const inactiveIcon = isDark ? 'text-slate-500' : 'text-slate-400';
  const activeBar    = isDark
    ? 'bg-gradient-to-b from-indigo-400 to-primary-400'
    : 'bg-gradient-to-b from-indigo-600 to-primary-600';
  const logoutStyle  = isDark
    ? 'border border-red-500/20 text-red-300 bg-red-500/10 hover:bg-red-500/20'
    : 'border border-red-100 text-red-600 bg-red-50 hover:bg-red-100';
  const sectionHeaderCls = isDark
    ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
    : 'text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/60';

  const toggleSection = useCallback((title: string) => {
    setCollapsed(prev => {
      const next = { ...prev, [title]: !prev[title] };
      saveCollapsed(next);
      return next;
    });
  }, []);

  const visibleSections = React.useMemo(() => {
    return NAV_SECTIONS.map(section => ({
      ...section,
      items: section.items.filter((item: any) => {
        if (item.requiredFeature && !user?.plan_features?.includes(item.requiredFeature)) return false;
        if (!item.requiredPermission) return true;
        return typeof hasPermission === 'function' ? hasPermission(item.requiredPermission) : true;
      })
    })).filter(section => {
      if (user?.role === 'super_admin') return false;
      const isRestricted = section.title === 'nav.group.management' || section.title === 'nav.group.financial';
      if (isRestricted && !isAdmin) return false;
      return section.items.length > 0;
    });
  }, [user, isAdmin, hasPermission]);

  const tourMap: Record<string, string> = {
    '/agenda': 'agenda', '/pacientes': 'pacientes', '/prontuario': 'prontuarios',
    '/formularios': 'formularios', '/instrumentos': 'instrumentos',
    '/servicos': 'servicos', '/comandas': 'comandas', '/financeiro': 'financeiro',
  };

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={`fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`fixed top-0 left-0 z-50 h-full w-[256px] ${sidebarSurface} border-r flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-lg ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

        {/* Logo */}
        <div className={`h-[88px] flex items-center px-5 border-b ${headerBorder} ${headerBg} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className="h-[60px] w-[60px] rounded-2xl overflow-hidden shadow-md flex-shrink-0 bg-white ring-2 ring-white/80">
              <img src={logoUrl} alt="PsiFlux" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="font-display font-bold text-[28px] leading-none tracking-tight flex items-baseline">
                <span className={isDark ? 'text-slate-100' : 'text-[#1e295b]'}>Psi</span>
                <span className="text-[#00bcd4]">Flux</span>
              </h1>
              <span className={`text-[10px] whitespace-nowrap font-medium ${isDark ? 'text-slate-400' : 'text-[#1e295b]'} tracking-tight opacity-60`}>
                Onde o seu consultório flui.
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          <nav className="space-y-0.5">
            {user?.role === 'super_admin' ? (
              <div className="px-2 py-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Master</span>
                <Link to="/painel-master" className={`mt-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold ${activeItem}`}>
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
                  <div key={section.title} className="mb-1">
                    {/* Section header — clicável para colapsar */}
                    <button
                      onClick={() => toggleSection(section.title)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all duration-150 group ${sectionHeaderCls}`}
                    >
                      <div className="flex items-center gap-1.5">
                        {(section as any).icon && (
                          <span className="opacity-60 group-hover:opacity-100 transition-opacity">
                            {(section as any).icon}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                          {t(section.title)}
                        </span>
                        {hasActiveItem && isCollapsed && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`}/>
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
                              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${isActive ? activeItem : inactiveItem}`}
                            >
                              {isActive && (
                                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 ${activeBar} rounded-r-full`}/>
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

        {/* Logout */}
        <div className={`p-3 border-t ${headerBorder} ${isDark ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${logoutStyle}`}>
            <LogOut size={15}/> {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  );
};
