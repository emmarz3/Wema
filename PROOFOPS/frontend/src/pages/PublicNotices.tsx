import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Panel, PanelBody, PanelHeader } from '../components/ui/Panel';
import { pageVariants } from '../lib/motion';

export function NotFoundPage({ withinWorkspace = false }: { withinWorkspace?: boolean }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      className={withinWorkspace ? '' : 'mx-auto max-w-2xl px-4 py-20 sm:px-6'}
    >
      <Panel>
        <PanelHeader title="Page not found" description="The address you opened does not exist." />
        <PanelBody className="space-y-3 text-[0.8125rem] text-ink-secondary">
          <p>Check the address for typos, or head back to a section that exists.</p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={withinWorkspace ? '/app' : '/'}
              className="inline-flex h-8 items-center rounded-control border border-transparent bg-brand px-3 text-[0.8125rem] font-medium text-white transition-colors duration-fast ease-standard hover:bg-brand-hover"
            >
              {withinWorkspace ? 'Workspace overview' : 'Homepage'}
            </Link>
            <Link
              to="/design-system"
              className="inline-flex h-8 items-center rounded-control border border-line-strong bg-surface px-3 text-[0.8125rem] font-medium text-ink transition-colors duration-fast ease-standard hover:bg-surface-muted"
            >
              Design system
            </Link>
          </div>
        </PanelBody>
      </Panel>
    </motion.div>
  );
}
