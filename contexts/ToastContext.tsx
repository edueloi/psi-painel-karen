import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { StatusAlert } from '../components/UI/StatusAlert';

type AlertVariant = 'success' | 'warning' | 'error' | 'info';

type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

interface ToastOptions {
  message?: string;
  duration?: number;
  details?: React.ReactNode;
  collapsible?: boolean;
  persistent?: boolean;
  compact?: boolean;
  preventDuplicate?: boolean;
}

interface Toast {
  id: number;
  type: AlertVariant;
  title: string;
  message?: string;
  duration: number;
  details?: React.ReactNode;
  collapsible?: boolean;
  persistent?: boolean;
  compact?: boolean;
  isLeaving?: boolean;
  createdAt: number;
}

interface ToastContextData {
  pushToast: (
    type: AlertVariant,
    title: string,
    messageOrOptions?: string | ToastOptions,
    durationArg?: number
  ) => void;
  removeToast: (id: number) => void;
  clearToasts: () => void;
  success: (title: string, messageOrOptions?: string | ToastOptions, durationArg?: number) => void;
  warning: (title: string, messageOrOptions?: string | ToastOptions, durationArg?: number) => void;
  error: (title: string, messageOrOptions?: string | ToastOptions, durationArg?: number) => void;
  info: (title: string, messageOrOptions?: string | ToastOptions, durationArg?: number) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

const MAX_TOASTS = 4;
const EXIT_ANIMATION_MS = 220;

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

function resolveOptions(
  messageOrOptions?: string | ToastOptions,
  durationArg?: number
): ToastOptions {
  if (typeof messageOrOptions === 'string') {
    return {
      message: messageOrOptions,
      duration: durationArg ?? 4000,
    };
  }

  return {
    duration: 4000,
    compact: true,
    preventDuplicate: true,
    ...messageOrOptions,
  };
}

export const ToastProvider: React.FC<{
  children: React.ReactNode;
  position?: ToastPosition;
}> = ({
  children,
  position = 'bottom-right',
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const idRef = useRef(1);

  const clearTimer = useCallback((id: number) => {
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const finalizeRemove = useCallback((id: number) => {
    clearTimer(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [clearTimer]);

  const removeToast = useCallback((id: number) => {
    clearTimer(id);

    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, isLeaving: true } : toast
      )
    );

    const timeout = setTimeout(() => {
      finalizeRemove(id);
    }, EXIT_ANIMATION_MS);

    timeoutsRef.current.set(id, timeout);
  }, [clearTimer, finalizeRemove]);

  const scheduleRemoval = useCallback((toast: Toast) => {
    if (toast.persistent || toast.duration <= 0) return;

    clearTimer(toast.id);

    const timeout = setTimeout(() => {
      removeToast(toast.id);
    }, toast.duration);

    timeoutsRef.current.set(toast.id, timeout);
  }, [clearTimer, removeToast]);

  const pushToast = useCallback(
    (
      type: AlertVariant,
      title: string,
      messageOrOptions?: string | ToastOptions,
      durationArg?: number
    ) => {
      const options = resolveOptions(messageOrOptions, durationArg);

      setToasts((prev) => {
        const shouldPreventDuplicate = options.preventDuplicate !== false;

        if (shouldPreventDuplicate) {
          const duplicated = prev.find(
            (toast) =>
              toast.title === title &&
              toast.message === options.message &&
              toast.type === type &&
              !toast.isLeaving
          );

          if (duplicated) {
            return prev;
          }
        }

        const id = idRef.current++;
        const newToast: Toast = {
          id,
          type,
          title,
          message: options.message,
          duration: options.duration ?? 4000,
          details: options.details,
          collapsible: options.collapsible,
          persistent: options.persistent,
          compact: options.compact ?? true,
          isLeaving: false,
          createdAt: Date.now(),
        };

        const next = [newToast, ...prev].slice(0, MAX_TOASTS);

        const removed = prev.filter(
          (toast) => !next.some((nextToast) => nextToast.id === toast.id)
        );

        removed.forEach((toast) => clearTimer(toast.id));

        setTimeout(() => {
          scheduleRemoval(newToast);
        }, 0);

        return next;
      });
    },
    [clearTimer, scheduleRemoval]
  );

  const clearToasts = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const success = useCallback<ToastContextData['success']>(
    (title, messageOrOptions, durationArg) =>
      pushToast('success', title, messageOrOptions, durationArg),
    [pushToast]
  );

  const warning = useCallback<ToastContextData['warning']>(
    (title, messageOrOptions, durationArg) =>
      pushToast('warning', title, messageOrOptions, durationArg),
    [pushToast]
  );

  const error = useCallback<ToastContextData['error']>(
    (title, messageOrOptions, durationArg) =>
      pushToast('error', title, messageOrOptions, durationArg),
    [pushToast]
  );

  const info = useCallback<ToastContextData['info']>(
    (title, messageOrOptions, durationArg) =>
      pushToast('info', title, messageOrOptions, durationArg),
    [pushToast]
  );

  const containerPositionClass = useMemo(() => {
    switch (position) {
      case 'top-right':
        return 'top-6 right-6';
      case 'top-left':
        return 'top-6 left-6';
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-center':
        return 'top-6 left-1/2 -translate-x-1/2';
      case 'bottom-center':
        return 'bottom-6 left-1/2 -translate-x-1/2';
      case 'bottom-right':
      default:
        return 'bottom-6 right-6';
    }
  }, [position]);

  const contextValue = useMemo(
    () => ({
      pushToast,
      removeToast,
      clearToasts,
      success,
      warning,
      error,
      info,
    }),
    [pushToast, removeToast, clearToasts, success, warning, error, info]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div
        className={cx(
          'fixed z-[9999] flex w-full max-w-[420px] flex-col gap-3 pointer-events-none',
          containerPositionClass
        )}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cx(
              'pointer-events-auto overflow-hidden rounded-2xl',
              toast.isLeaving
                ? 'animate-[toastOut_.22s_ease-in_forwards]'
                : 'animate-[toastIn_.28s_ease-out]'
            )}
          >
            <div className="relative">
              <StatusAlert
                variant={toast.type}
                title={toast.title}
                message={toast.message}
                details={toast.details}
                collapsible={toast.collapsible}
                onClose={() => removeToast(toast.id)}
                compact={toast.compact}
              />

              {!toast.persistent && toast.duration > 0 && !toast.isLeaving && (
                <div className="absolute bottom-0 left-0 h-[3px] w-full bg-slate-200/60">
                  <div
                    className={cx(
                      'h-full origin-left animate-[toastProgress_var(--toast-duration)_linear_forwards]',
                      toast.type === 'success' && 'bg-emerald-500',
                      toast.type === 'warning' && 'bg-amber-500',
                      toast.type === 'error' && 'bg-red-500',
                      toast.type === 'info' && 'bg-sky-500'
                    )}
                    style={
                      {
                        ['--toast-duration' as any]: `${toast.duration}ms`,
                      } as React.CSSProperties
                    }
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes toastOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
        }

        @keyframes toastProgress {
          from {
            transform: scaleX(1);
          }
          to {
            transform: scaleX(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};