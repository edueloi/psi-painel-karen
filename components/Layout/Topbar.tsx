
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Bell, Search, Settings, LogOut, User as UserIcon, ChevronDown, HelpCircle, Shield } from 'lucide-react';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getStaticUrl } from '../../services/api';
import { SystemAlerts } from '../SystemAlerts';


interface TopbarProps {
   onMenuClick: () => void;
   onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, onLogout }) => {
   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
   const dropdownRef = useRef<HTMLDivElement>(null);
   const navigate = useNavigate();
   const { t } = useLanguage();
   const { user } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigate = (path: string) => {
      navigate(path);
      setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-[100] h-[72px] px-4 md:px-8 flex items-center justify-between transition-all duration-300 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.04)]">

      {/* Left Area: Mobile Menu & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 active:scale-95"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Right Area: Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-4">

        {/* Notifications */}
        <SystemAlerts />

        <div className="h-7 w-px bg-slate-200/70 hidden md:block"></div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
           <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all duration-200 cursor-pointer group"
           >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-primary-600 p-0.5 shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                       {user?.avatarUrl ? (
                          <img src={getStaticUrl(user.avatarUrl)} alt={user.name} className="h-full w-full object-cover" />
                       ) : (
                          <span className="font-bold text-indigo-700 text-sm">{user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}</span>
                       )}
                  </div>
              </div>
                     <div className="text-right hidden md:block">
                           <p className="text-sm font-bold text-slate-700 leading-none group-hover:text-indigo-700 transition-colors">{user?.name || 'Usuário'}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                              {user?.role === 'super_admin' && 'Super Admin'}
                              {user?.role === 'admin' && 'Administrador'}
                              {user?.role === 'profissional' && 'Profissional'}
                              {user?.role === 'secretario' && 'Secretário'}
                           </p>
                     </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
           </button>

           {/* Dropdown Menu */}
           {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 z-[200] bg-white rounded-2xl shadow-[0_8px_32px_-4px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden origin-top-right animate-[slideDownFade_0.18s_ease-out]">
                 <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t('topbar.connected')}</p>
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold overflow-hidden border border-slate-200">
                          {user?.avatarUrl ? (
                             <img src={getStaticUrl(user.avatarUrl)} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                             user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                                       <p className="font-bold text-slate-800 truncate">{user?.name}</p>
                                       <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                                          {user?.role === 'super_admin' && 'Super Admin'}
                                          {user?.role === 'admin' && 'Administrador'}
                                          {user?.role === 'profissional' && 'Profissional'}
                                          {user?.role === 'secretario' && 'Secretário'}
                                       </p>
                       </div>
                    </div>
                 </div>

                 <div className="p-2 space-y-1">
                    <button onClick={() => handleNavigate('/perfil')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <UserIcon size={16} /> {t('topbar.profile')}
                    </button>
                    <button onClick={() => handleNavigate('/configuracoes')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <Settings size={16} /> {t('topbar.settings')}
                    </button>
                    <button onClick={() => handleNavigate('/privacidade')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <Shield size={16} /> {t('topbar.privacy')}
                    </button>
                    <button onClick={() => handleNavigate('/ajuda')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <HelpCircle size={16} /> {t('topbar.help')}
                    </button>
                 </div>

                 <div className="p-2 border-t border-slate-50">
                    <button 
                       onClick={() => { setIsDropdownOpen(false); onLogout && onLogout(); }}
                       className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                       <LogOut size={16} /> {t('topbar.logout')}
                    </button>
                 </div>
              </div>
           )}
        </div>
      </div>
    </header>
  );
};
