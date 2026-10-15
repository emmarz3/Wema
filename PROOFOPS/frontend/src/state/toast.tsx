import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { transition } from '../lib/motion';

/**
 * Toast notifications.
 *
 * Toasts are only ever raised *after* an operation's result is known —
 * never as a guess that something will succeed. They are polite live
 * announcements so screen readers hear the outcome.
 */

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneIcons: Record<ToastTone, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleX,
  warning: CircleAlert,
  info: Info,
};

const toneClasses: Record<ToastTone, string> = {
  success: 'border-success-line text-success',
  error: 'border-danger-line text-danger',
  warning: 'border-warning-line text-warning',
  info: 'border-info-line text-info',
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      counter += 1;
      const id = `toast-${counter}`;
      setToasts((current) => [...current.slice(-3), { ...toast, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), toast.tone === 'error' ? 9000 : 6000),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:inset-auto sm:bottom-4 sm:right-4 sm:items-end"
        role="region"
        aria-label="Notifications"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toneIcons[toast.tone];
            return (
              <motion.output
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.98, transition: transition.fast }}
                transition={transition.base}
                className={cn(
                  'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-panel border bg-surface p-3 shadow-md',
                  toneClasses[toast.tone],
                )}
              >
                <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-0.5 text-[0.8125rem] text-ink-secondary">
                      {toast.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-control p-1 text-ink-secondary transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-ink"
                  aria-label={`Dismiss: ${toast.title}`}
                >
                  <X aria-hidden className="size-3.5" />
                </button>
              </motion.output>
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
