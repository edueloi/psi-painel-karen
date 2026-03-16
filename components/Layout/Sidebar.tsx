import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../constants';
import { X, LogOut, BrainCircuit, ShieldAlert } from 'lucide-react';
import logoUrl from '../../images/logo-psiflux.png';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { resolvedMode } = useTheme();

  const isDark = resolvedMode === 'dark';
  const sidebarSurface = isDark ? 'bg-slate-950 border-slate-800/60' : 'bg-white border-slate-100/80';
  const headerBorder = isDark ? 'border-slate-800/60' : 'border-slate-100';
  const headerBg = isDark
    ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950'
    : 'bg-gradient-to-br from-indigo-50/60 via-white to-violet-50/40';
  const titleText = isDark ? 'text-slate-100' : 'text-slate-800';
  const subtitleText = isDark ? 'text-indigo-300' : 'text-indigo-500';
  const sectionTitle = isDark ? 'text-slate-500' : 'text-slate-400';
  const activeItem = isDark
    ? 'bg-gradient-to-r from-indigo-500/25 to-violet-500/15 text-indigo-100 shadow-sm border border-indigo-400/20'
    : 'bg-gradient-to-r from-indigo-50 to-violet-50/60 text-indigo-700 shadow-sm border border-indigo-100/60';
  const inactiveItem = isDark
    ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
    : 'text-slate-500 hover:bg-slate-50/80 hover:text-slate-800';
  const activeIcon = isDark ? 'text-indigo-300' : 'text-indigo-600';
  const inactiveIcon = isDark ? 'text-slate-500' : 'text-slate-400';
  const activeBar = isDark ? 'bg-gradient-to-b from-indigo-400 to-violet-400' : 'bg-gradient-to-b from-indigo-600 to-violet-600';
  const logoRing = isDark ? 'ring-2 ring-indigo-500/20 bg-slate-800/50' : 'ring-2 ring-indigo-100 bg-indigo-50/50';
  const logoutStyle = isDark
    ? 'border border-red-500/20 text-red-300 bg-red-500/10 hover:bg-red-500/20'
    : 'border border-red-100 text-red-600 bg-red-50 hover:bg-red-100';

  const visibleSections = NAV_SECTIONS.filter(section => {
    if (user?.role === 'super_admin') return false;
    const isRestrictedGroup = section.title === 'nav.group.management' || section.title === 'nav.group.financial';
    if (isRestrictedGroup && !isAdmin) return false;
    return true;
  });

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] ${sidebarSurface} border-r flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-lg ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className={`h-[88px] flex items-center px-6 border-b ${headerBorder} ${headerBg} flex-shrink-0`}>
          <div className="flex items-center gap-3.5 group cursor-pointer">
            <div className={`relative h-14 w-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 ${logoRing}`}>
              <img src={logoUrl} alt="PsiFlux" className="w-full h-full object-contain p-1" />
            </div>
            <div>
              <h1 className={`font-display font-bold text-[22px] ${titleText} leading-none tracking-tight`}>PsiFlux</h1>
              <span className={`text-[10px] font-bold ${subtitleText} tracking-widest uppercase`}>
                {user?.role === 'super_admin' ? 'Master' : 'Clinic'} Edition
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-5 px-3 custom-scrollbar">
          <nav className="space-y-5">
            {user?.role === 'super_admin' ? (
              <div>
                <h3 className={`px-4 text-[10px] font-bold ${sectionTitle} uppercase tracking-widest mb-2`}>Administracao Master</h3>
                <Link to="/painel-master" className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold ${activeItem}`}>
                  <ShieldAlert size={18} /> Painel Master
                </Link>
              </div>
            ) : (
              visibleSections.map((section, index) => (
                <div key={index}>
                  <h3 className={`px-4 text-[10px] font-bold ${sectionTitle} uppercase tracking-widest mb-1.5`}>{t(section.title)}</h3>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => window.innerWidth < 1024 && onClose()}
                          className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${isActive ? activeItem : inactiveItem}`}
                        >
                          {isActive && <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 ${activeBar} rounded-r-full`}></div>}
                          <span className={`flex-shrink-0 ${isActive ? activeIcon : inactiveIcon}`}>{item.icon}</span>
                          <span className="truncate">{t(item.label)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </nav>
        </div>

        <div className={`p-4 border-t ${headerBorder} ${isDark ? 'bg-slate-950/50' : 'bg-slate-50/50'}`}>
          <button onClick={onLogout} className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold transition-all duration-200 ${logoutStyle}`}>
            <LogOut size={16} /> {t('nav.logout')}
          </button>
        </div>
      </aside>
    </>
  );
};
