import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, Settings, LogOut, User as UserIcon, ChevronDown, HelpCircle, Shield } from 'lucide-react';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  onMenuClick: () => void;
  user?: Partial<User>;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, user, onLogout }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
    <header className="sticky top-0 z-30 h-20 px-4 md:px-8 flex items-center justify-between transition-all duration-300 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 support-backdrop-blur:bg-white/90">
      
      {/* Left Area: Mobile Menu & Search */}
      <div className="flex items-center gap-4 flex-1">
        <button 
          onClick={onMenuClick}
          className="p-2.5 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
        >
          <Menu size={24} />
        </button>
        
        {/* Global Search */}
        <div className="hidden md:flex items-center relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Pesquisar pacientes, prontuários ou agenda..." 
            className="w-full h-11 pl-11 pr-4 rounded-full bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/10 outline-none text-sm text-slate-600 placeholder:text-slate-400 transition-all shadow-sm"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-focus-within:flex items-center gap-1">
             <span className="text-[10px] font-bold text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</span>
          </div>
        </div>
      </div>

      {/* Right Area: Actions & Profile */}
      <div className="flex items-center gap-3 md:gap-5">
        
        {/* Notifications */}
        <button className="relative p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all group">
          <Bell size={20} className="group-hover:animate-swing" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
           <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer group"
           >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-0.5 shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
                  <div className="h-full w-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                          <span className="font-bold text-indigo-700 text-sm">{user?.name?.charAt(0) || 'D'}</span>
                      )}
                  </div>
              </div>
              <div className="text-right hidden md:block">
                  <p className="text-sm font-bold text-slate-700 leading-none group-hover:text-indigo-700 transition-colors">{user?.name || 'Dr. Silva'}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">{user?.role || 'Psicólogo'}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
           </button>

           {/* Dropdown Menu */}
           {isDropdownOpen && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden origin-top-right animate-[slideUpFade_0.2s_ease-out]">
                 <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Conta Conectada</p>
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                          {user?.name?.charAt(0)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 truncate">{user?.name}</p>
                          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                       </div>
                    </div>
                 </div>

                 <div className="p-2 space-y-1">
                    <button onClick={() => handleNavigate('/profile')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <UserIcon size={16} /> Meu Perfil
                    </button>
                    <button onClick={() => handleNavigate('/settings')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <Settings size={16} /> Configurações
                    </button>
                    <button onClick={() => handleNavigate('/privacy')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <Shield size={16} /> Privacidade
                    </button>
                    <button onClick={() => handleNavigate('/help')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors">
                       <HelpCircle size={16} /> Ajuda e Suporte
                    </button>
                 </div>

                 <div className="p-2 border-t border-slate-50">
                    <button 
                       onClick={() => { setIsDropdownOpen(false); onLogout && onLogout(); }}
                       className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                       <LogOut size={16} /> Sair da conta
                    </button>
                 </div>
              </div>
           )}
        </div>
      </div>
    </header>
  );
};