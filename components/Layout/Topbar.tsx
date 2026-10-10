
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Bell, Search, Settings, LogOut, User as UserIcon, ChevronDown, HelpCircle, Shield, Crown } from 'lucide-react';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getStaticUrl } from '../../services/api';
import { SystemAlerts } from '../SystemAlerts';
import { SubscriptionAlert } from '../SubscriptionAlert';


interface TopbarProps {
   onMenuClick: () => void;
   onLogout?: () => void;
   user?: User;
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
    <header className="sticky top-0 z-[100] h-14 px-3 sm:px-5 flex items-center justify-between bg-white/95 backdrop-blur-sm border-b border-slate-200">

      {/* Left Area: Mobile Menu & Search */}
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMenuClick}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
        >
          <Menu size={16} />
        </button>
      </div>

      {/* Right Area: Actions & Profile */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* Assinatura vencendo/vencida */}
        <SubscriptionAlert />

        {/* Notifications */}
        <SystemAlerts />

        <div className="h-5 w-px bg-slate-200 hidden md:block"></div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
           <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 p-1 pr-2 rounded-md hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors duration-150 cursor-pointer group"
           >
              <div className="h-8 w-8 rounded-full bg-primary-600 p-0.5">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                       {user?.avatarUrl ? (
                          <img src={getStaticUrl(user.avatarUrl)} alt={user.name} className="h-full w-full object-cover" />
                       ) : (
                          <span className="font-semibold text-primary-700 text-xs">{user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}</span>
                       )}
                  </div>
              </div>
                     <div className="text-right hidden md:block">
                           <p className="text-[13px] font-medium text-slate-800 leading-none group-hover:text-primary-700 transition-colors">{user?.name || 'Usuário'}</p>
                           <p className="text-[11px] text-slate-500 font-normal mt-0.5">
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
              <div className="absolute top-full right-0 mt-2 w-64 z-[200] bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden origin-top-right animate-[slideDownFade_0.18s_ease-out]">
                 <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[11px] font-medium text-slate-500 mb-2">{t('topbar.connected')}</p>
                    <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold overflow-hidden border border-slate-200">
                          {user?.avatarUrl ? (
                             <img src={getStaticUrl(user.avatarUrl)} alt={user.name} className="h-full w-full object-cover" />
                          ) : (
                             user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'
                          )}
                       </div>
                       <div className="flex-1 min-w-0">
                                       <p className="text-[13px] font-medium text-slate-800 truncate">{user?.name}</p>
                                       <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                       <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                                          {user?.role === 'super_admin' && 'Super Admin'}
                                          {user?.role === 'admin' && 'Administrador'}
                                          {user?.role === 'profissional' && 'Profissional'}
                                          {user?.role === 'secretario' && 'Secretário'}
                                       </p>
                       </div>
                    </div>
                 </div>

                 <div className="p-1.5 space-y-0.5">
                    <button onClick={() => handleNavigate('/perfil')} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-700 transition-colors">
                       <UserIcon size={15} /> {t('topbar.profile')}
                    </button>
                    {user?.role !== 'super_admin' && (
                      <button onClick={() => handleNavigate('/assinatura')} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-violet-700 hover:bg-violet-50 transition-colors">
                        <Crown size={15} /> Minha Assinatura
                      </button>
                    )}
                    <button onClick={() => handleNavigate('/configuracoes')} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-700 transition-colors">
                       <Settings size={15} /> {t('topbar.settings')}
                    </button>
                    <button onClick={() => handleNavigate('/privacidade')} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-700 transition-colors">
                       <Shield size={15} /> {t('topbar.privacy')}
                    </button>
                    <button onClick={() => handleNavigate('/ajuda')} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-primary-700 transition-colors">
                       <HelpCircle size={15} /> {t('topbar.help')}
                    </button>
                 </div>

                 <div className="p-1.5 border-t border-slate-100">
                    <button 
                       onClick={() => { setIsDropdownOpen(false); onLogout && onLogout(); }}
                       className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[13px] font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                       <LogOut size={15} /> {t('topbar.logout')}
                    </button>
                 </div>
              </div>
           )}
        </div>
      </div>
    </header>
  );
};
