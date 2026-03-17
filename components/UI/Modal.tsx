import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Define a largura máxima do modal. Padrão é '2xl' */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full' | string;
  className?: string;
  headerClassName?: string;
  /** Permite esconder o botão de fechar (X), caso seja necessário forçar uma ação do utilizador */
  hideCloseButton?: boolean;
}

// Mapa de tamanhos padronizados para o Modal
const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-[95vw] md:max-w-[90vw]',
};

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  children, 
  footer,
  maxWidth = '2xl',
  className = '',
  headerClassName = '',
  hideCloseButton = false
}) => {
  // Impede que o fundo da página role enquanto o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Resolve a classe de largura baseada na prop, mantendo compatibilidade com strings customizadas
  const maxWidthClass = maxWidthClasses[maxWidth] || maxWidth;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      {/* Overlay: Clicar fora fecha o modal */}
      <div 
        className="absolute inset-0 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Container Principal do Modal */}
      <div className={`relative w-full ${maxWidthClass} bg-white rounded-xl sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-scaleIn border border-slate-200 transform transition-all ${className}`}>
        
        {/* Cabeçalho (Header) */}
        <div className={`px-6 py-4 flex items-start justify-between border-b border-slate-100 bg-white ${headerClassName}`}>
          <div className="pr-4">
            <h3 className="text-lg font-semibold text-slate-800 leading-snug">{title}</h3>
            {subtitle && (
                <p className="text-sm font-normal text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {!hideCloseButton && (
            <button 
              onClick={onClose}
              className="p-1.5 mt-0.5 bg-transparent hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Conteúdo (Body) */}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[75vh] custom-scrollbar text-slate-600">
          {children}
        </div>

        {/* Rodapé (Footer) */}
        {footer && (
          <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl sm:rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};