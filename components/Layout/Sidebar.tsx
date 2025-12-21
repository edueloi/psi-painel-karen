
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_SECTIONS } from '../../constants';
import { X, LogOut, BrainCircuit, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onLogout }) => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user, isAdmin } = useAuth();

  // Filtrar seções de navegação baseada no papel
  const visibleSections = NAV_SECTIONS.filter(section => {
    // Se for super_admin, ele só vê o Painel Master
    if (user?.role === 'super_admin') return false; 
    
    // Grupos que exigem permissão administrativa (Gestão e Financeiro)
    const isRestrictedGroup = section.title === 'nav.group.management' || section.title === 'nav.group.financial';
    
    // Se for um grupo restrito e o usuário NÃO for admin, oculta
    if (isRestrictedGroup && !isAdmin) return false;
    
    // Admin, Profissional e Secretário veem os grupos: Geral, Clínico, Comunicação e Sistema
    return true;
  });

  return (
    <>
      <div className={`fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <aside className={`fixed top-0 left-0 z-50 h-full w-[280px] bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-24 flex items-center px-8 border-b border-slate-50 flex-shrink-0">
           <div className="flex items-center gap-3 group cursor-pointer">
              <div className="relative h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <BrainCircuit size={20} />
              </div>
              <div>
                 <h1 className="font-display font-bold text-xl text-slate-800 leading-none">PsiManager</h1>
                 <span className="text-[10px] font-bold text-indigo-500 tracking-widest uppercase">
                   {user?.role === 'super_admin' ? 'Master' : 'Clinic'} Edition
                 </span>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
           <nav className="space-y-6">
              {user?.role === 'super_admin' ? (
                <div>
                   <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Administração Master</h3>
                   <Link to="/painel-master" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold bg-indigo-50 text-indigo-700 shadow-sm">
                      <ShieldAlert size={20} /> Painel Master
                   </Link>
                </div>
              ) : (
                visibleSections.map((section, index) => (
                  <div key={index}>
                    <h3 className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t(section.title)}</h3>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
                        return (
                          <Link 
                            key={item.path} 
                            to={item.path} 
                            onClick={() => window.innerWidth < 1024 && onClose()} 
                            className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${isActive ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                          >
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 rounded-r-full"></div>}
                            <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                            <span>{t(item.label)}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
           </nav>
        </div>

        <div className="p-4 border-t border-slate-50">
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-red-100 text-red-600 bg-red-50 font-bold hover:bg-red-100 transition-colors">
              <LogOut size={18} /> {t('nav.logout')}
           </button>
        </div>
      </aside>
    </>
  );
};
