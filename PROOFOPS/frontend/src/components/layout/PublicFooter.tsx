import { Link } from 'react-router-dom';
import { Brand } from './Brand';
import { isSimulated } from '../../api';

const COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Verification', href: '/#platform' },
      { label: 'Evidence comparison', href: '/#platform' },
      { label: 'Proof records', href: '/#platform' },
      { label: 'Reconciliation', href: '/#platform' },
      { label: 'Infrastructure', href: '/#platform' },
    ],
  },
  {
    title: 'Developers',
    links: [
      { label: 'API reference', href: '/#developers' },
      { label: 'Webhook events', href: '/#developers' },
      { label: 'Developer console', href: '/app/developer' },
      { label: 'Sandbox', href: '/#sandbox' },
    ],
  },
  {
    title: 'Security',
    links: [
      { label: 'Verification limits', href: '/#security' },
      { label: 'Access model', href: '/#security' },
      { label: 'Proof sharing', href: '/#security' },
      { label: 'Status', href: '/#security' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { label: 'Sign in', href: '/sign-in' },
      { label: 'Open demo', href: '/app' },
      { label: 'Design system', href: '/design-system' },
      { label: 'Overview', href: '/app' },
    ],
  },
] as const;

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-plum text-white/80">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Brand to="/" className="text-white hover:text-white" />
          <p className="mt-3 max-w-xs text-[0.8125rem] leading-relaxed text-white/60">
            Financial verification and infrastructure intelligence. Verify payment
            records against authoritative sources, investigate discrepancies, and
            preserve evidence you can inspect.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-xs font-semibold tracking-wide text-white/50 uppercase">
              {column.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="rounded text-[0.8125rem] text-white/70 transition-colors duration-fast ease-standard hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} ProofOps. Wema Hackathon Edition.</p>
          <p>
            Simulated banking data is not a real bank confirmation.
            {isSimulated
              ? ' This deployment runs on a labelled simulated data source.'
              : ''}
          </p>
        </div>
      </div>
    </footer>
  );
}
