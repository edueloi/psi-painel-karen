

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../constants';
import { X, LogOut, BrainCircuit, Sparkles, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  const location = useLocation();
  const { t } = useLanguage();

  return (
    <>
      {/* Mobile Overlay - Only visible on mobile when open */}
      <div 
        className={`fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <aside 
        className={`
          fixed top-0 left-0 z-50 h-full w-[280px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          shadow-2xl lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header Logo */}
        <div className="h-24 flex items-center px-8 border-b border-slate-50 flex-shrink-0">
           <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                  <BrainCircuit size={20} />
                </div>
              </div>
              <div>
                 <h1 className="font-display font-bold text-xl text-slate-800 leading-none">PsiManager</h1>
                 <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase">Pro Edition</span>
              </div>
           </div>
           <button onClick={onClose} className="ml-auto lg:hidden text-slate-400 hover:text-slate-600">
             <X size={20} />
           </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
           <nav className="space-y-6">
              {NAV_SECTIONS.map((section, index) => (
                <div key={index}>
                  <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    {t(section.title)}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = item.path === '/' 
                        ? location.pathname === '/' 
                        : location.pathname.startsWith(item.path);

                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => window.innerWidth < 1024 && onClose()}
                          className={`
                            relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-300 group overflow-hidden
                            ${isActive 
                              ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
                          `}
                        >
                          {isActive && (
                             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full"></div>
                          )}
                          
                          <span className={`transition-colors duration-300 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            {item.icon}
                          </span>
                          <span className="relative z-10">{t(item.label)}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
           </nav>
        </div>

        {/* Bottom Banner & Logout */}
        <div className="p-4 bg-slate-50/50 space-y-4 flex-shrink-0">
           {/* Pro Banner */}
           <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 text-white shadow-lg group cursor-pointer">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
              
              <div className="relative z-10 flex items-start gap-3">
                 <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                    <Sparkles size={16} className="text-yellow-300" />
                 </div>
                 <div>
                    <h4 className="font-bold text-sm leading-tight mb-1">{t('nav.premium')}</h4>
                    <p className="text-[10px] text-slate-300 leading-relaxed mb-3">{t('nav.premium.desc')}</p>
                    <button className="text-[10px] font-bold bg-white text-slate-900 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-indigo-50 transition-colors">
                       {t('nav.upgrade')} <ExternalLink size={10} />
                    </button>
                 </div>
              </div>
           </div>

           {/* Mobile Logout (Desktop uses Topbar) */}
           <button 
              onClick={onLogout}
              className="lg:hidden w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-100 text-red-600 bg-red-50 font-bold hover:bg-red-100 transition-colors"
           >
              <LogOut size={18} /> {t('nav.logout')}
           </button>
        </div>
      </aside>
    </>
  );
};
