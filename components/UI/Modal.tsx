import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
  headerClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title,
  subtitle,
  children, 
  footer,
  maxWidth = 'max-w-2xl',
  className = '',
  headerClassName = ''
}) => {
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      {/* Overlay */}
      <div 
        className="absolute inset-0 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className={`relative w-full ${maxWidth} bg-white rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-scaleIn border border-white/20 transform ${className}`}>
        {/* Header */}
        <div className={`px-10 py-8 flex items-center justify-between border-b border-slate-50 bg-slate-50/30 ${headerClassName}`}>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">{title}</h3>
            {subtitle && (
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">{subtitle}</p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white hover:bg-slate-50 rounded-[1.2rem] text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all active:scale-90"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="px-10 py-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-10 py-8 bg-slate-50/20 border-t border-slate-50 flex justify-end gap-3 pb-10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
