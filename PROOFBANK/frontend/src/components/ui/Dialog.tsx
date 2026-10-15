import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';
import { durations, easing } from '../../lib/motion';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

/**
 * Accessible modal: labelled by its title, closes on Escape, moves focus
 * into the panel on open, and animates with motion (respecting the user's
 * reduced-motion preference).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  // Kept in a ref so the focus/Escape effect runs only when the dialog opens,
  // not on every parent re-render — otherwise focus would be pulled out of a
  // field the operator is typing into.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus to the first focusable element inside the dialog.
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusTarget?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: durations.fast, ease: easing.standard };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div
            className="absolute inset-0 bg-plum/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby={description ? 'dialog-description' : undefined}
            className={cn(
              'relative z-10 w-full rounded-panel border border-line bg-surface p-5 shadow-lg',
              'max-h-[92dvh] overflow-y-auto',
              sizeClasses[size],
            )}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={transition}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="dialog-title" className="text-base font-semibold text-ink">
                  {title}
                </h2>
                {description && (
                  <p id="dialog-description" className="mt-1 text-sm text-ink-secondary">
                    {description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mt-1 -mr-2 px-2"
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            {children && <div className="mt-4 text-sm text-ink">{children}</div>}
            {footer && (
              <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
