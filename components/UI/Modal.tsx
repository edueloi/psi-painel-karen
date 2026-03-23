import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | 'full' | string;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

const maxWidthClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  full: 'max-w-[96vw] md:max-w-[92vw]',
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
  bodyClassName = '',
  footerClassName = '',
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
}) => {
  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow = 'unset';
      return;
    }

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, closeOnEsc]);

  if (!isOpen) return null;

  const maxWidthClass = maxWidthClasses[maxWidth] || maxWidth;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 !m-0">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/45 animate-[fadeIn_.18s_ease-out]"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className={`
          relative w-full ${maxWidthClass}
          bg-white
          rounded-2xl sm:rounded-3xl
          border border-slate-200
          shadow-[0_20px_70px_rgba(15,23,42,0.18)]
          flex flex-col
          max-h-[88vh]
          overflow-hidden
          animate-[modalIn_.2s_ease-out]
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div
          className={`
            px-5 sm:px-6 py-4
            flex items-start justify-between gap-4
            border-b border-slate-100
            bg-white
            ${headerClassName}
          `}
        >
          <div className="min-w-0">
            <h3
              id="modal-title"
              className="text-[17px] sm:text-lg font-semibold text-slate-800 leading-tight"
            >
              {title}
            </h3>

            {subtitle && (
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {!hideCloseButton && (
            <button
              onClick={onClose}
              className="
                shrink-0
                inline-flex items-center justify-center
                w-9 h-9
                rounded-xl
                text-slate-400
                hover:text-slate-700
                hover:bg-slate-100
                transition-all
                focus:outline-none
                focus:ring-2
                focus:ring-violet-500/30
              "
              aria-label="Fechar modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className={`
            px-5 sm:px-6 py-5
            overflow-y-auto
            max-h-[calc(88vh-140px)]
            text-slate-600
            bg-white
            custom-scrollbar
            ${bodyClassName}
          `}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={`
              px-5 sm:px-6 py-4
              border-t border-slate-100
              bg-white
              flex items-center justify-end gap-3
              ${footerClassName}
            `}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 999px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};