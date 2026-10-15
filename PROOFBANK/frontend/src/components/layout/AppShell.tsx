import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Wordmark } from './Brand';
import { SidebarNav } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../state/auth';
import { durations, easing, pageVariants } from '../../lib/motion';

/**
 * Authenticated workspace shell: fixed sidebar on desktop, drawer on
 * mobile, environment top bar, and a main region that animates entrances
 * only when the OS allows motion.
 */
export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const { role } = useAuth();
  const reduceMotion = useReducedMotion();
  const mainRef = useRef<HTMLElement>(null);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setNavOpen(false);
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="shell-height flex bg-canvas">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-line px-4">
          <Wordmark />
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <SidebarNav />
        </div>
        <div className="border-t border-line px-4 py-3">
          <p className="text-[0.6875rem] leading-relaxed text-ink-secondary">
            Simulated environment for demonstration and testing. Not affiliated
            with Wema Bank&apos;s production banking systems.
          </p>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {navOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-plum/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : durations.fast }}
              onClick={() => setNavOpen(false)}
              aria-hidden
            />
            <motion.div
              className="relative z-10 flex h-full w-72 max-w-[85vw] flex-col border-r border-line bg-surface"
              initial={reduceMotion ? { x: 0 } : { x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { x: -16, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : durations.fast, ease: easing.standard }}
              role="dialog"
              aria-modal="true"
              aria-label="Workspace navigation"
            >
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <Wordmark />
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Close navigation"
                  className="rounded-control p-1.5 text-ink-secondary hover:bg-surface-muted hover:text-ink"
                >
                  <X aria-hidden className="size-4.5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <SidebarNav onNavigate={() => setNavOpen(false)} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main
          ref={mainRef}
          id="main-content"
          className="flex-1 overflow-y-auto"
          tabIndex={-1}
        >
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            transition={reduceMotion ? { duration: 0 } : undefined}
            className="mx-auto w-full max-w-[92rem] px-4 py-5 sm:px-6 sm:py-6"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      {/* Screen-reader announcement of the active section context. */}
      <p aria-live="polite" className="sr-only">
        {role ? 'Workspace ready' : 'Workspace'}
      </p>
    </div>
  );
}
