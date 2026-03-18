import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type MobileBehavior = 'bottom-sheet' | 'full-screen';

interface ActionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  hideCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  mobileBehavior?: MobileBehavior;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'md:w-[420px]',
  md: 'md:w-[540px]',
  lg: 'md:w-[680px]',
  xl: 'md:w-[920px]',
  full: 'md:w-[94vw] md:max-w-[1280px]',
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const ActionDrawer: React.FC<ActionDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  hideCloseButton = false,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  mobileBehavior = 'bottom-sheet',
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

  const mobilePanelClasses =
    mobileBehavior === 'full-screen'
      ? 'inset-0 h-full w-full rounded-none'
      : 'left-0 right-0 bottom-0 top-auto h-[90vh] w-full rounded-t-[28px]';

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-[fadeIn_.18s_ease-out]"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Mobile */}
      <div
        className={cx(
          'absolute flex flex-col overflow-hidden bg-white shadow-[0_-16px_40px_rgba(15,23,42,0.16)] animate-[drawerUp_.22s_ease-out]',
          'md:hidden',
          mobilePanelClasses,
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title-mobile"
      >
        {mobileBehavior === 'bottom-sheet' && (
          <div className="flex justify-center pt-3">
            <div className="h-1.5 w-12 rounded-full bg-slate-300" />
          </div>
        )}

        <div
          className={cx(
            'sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4',
            headerClassName
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                id="drawer-title-mobile"
                className="text-[17px] font-semibold text-slate-800 leading-tight"
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
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar painel"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div
          className={cx(
            'flex-1 overflow-y-auto bg-slate-50 px-4 py-4 custom-scrollbar',
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cx(
              'sticky bottom-0 border-t border-slate-200 bg-white px-4 py-4',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>

      {/* Desktop / Tablet */}
      <div
        className={cx(
          'absolute right-0 top-0 hidden h-full max-w-full flex-col border-l border-slate-200 bg-white shadow-[-18px_0_40px_rgba(15,23,42,0.12)] md:flex',
          sizeClasses[size],
          'animate-[drawerRight_.22s_ease-out]',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title-desktop"
      >
        <div
          className={cx(
            'sticky top-0 z-10 border-b border-slate-200 bg-white px-6 py-5',
            headerClassName
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3
                id="drawer-title-desktop"
                className="text-[18px] font-semibold text-slate-800 leading-tight"
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
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar painel"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        <div
          className={cx(
            'flex-1 overflow-y-auto bg-slate-50 px-6 py-6 custom-scrollbar',
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer && (
          <div
            className={cx(
              'sticky bottom-0 border-t border-slate-200 bg-white px-6 py-4',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes drawerRight {
          from {
            opacity: 0;
            transform: translateX(24px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes drawerUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
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