import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { uuid } from '../lib/utils';
import { durations, easing } from '../lib/motion';
import { cn } from '../lib/utils';

export type ToastTone = 'success' | 'danger' | 'warning' | 'info';

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface Toast extends ToastInput {
  id: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneConfig: Record<
  ToastTone,
  { border: string; icon: ReactNode; iconClass: string }
> = {
  success: {
    border: 'border-success-line',
    icon: <CheckCircle2 aria-hidden className="size-4" />,
    iconClass: 'text-success',
  },
  danger: {
    border: 'border-danger-line',
    icon: <XCircle aria-hidden className="size-4" />,
    iconClass: 'text-danger',
  },
  warning: {
    border: 'border-warning-line',
    icon: <AlertTriangle aria-hidden className="size-4" />,
    iconClass: 'text-warning',
  },
  info: {
    border: 'border-info-line',
    icon: <Info aria-hidden className="size-4" />,
    iconClass: 'text-info',
  },
};

/**
 * Lightweight notifications for the outcome of workspace actions. Announcements
 * are polite and auto-dismiss; they never carry financial data.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const reduceMotion = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = uuid('toast');
      const toast: Toast = { id, tone: input.tone ?? 'info', ...input };
      setToasts((current) => [...current.slice(-2), toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 5000),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 p-4 sm:right-0 sm:left-auto sm:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const config = toneConfig[toast.tone];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: durations.fast, ease: easing.standard }
                }
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-panel border bg-surface px-3.5 py-3 shadow-lg',
                  config.border,
                )}
                role="status"
              >
                <span className={cn('mt-0.5 shrink-0', config.iconClass)}>
                  {config.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss notification"
                  className="-mt-0.5 -mr-1 rounded-control p-1 text-ink-secondary transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-ink"
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
