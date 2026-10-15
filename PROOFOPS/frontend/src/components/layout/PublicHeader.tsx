import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Brand } from './Brand';
import { buttonClass } from '../ui/Button';
import { cn } from '../../lib/utils';
import { appEnvironment, isSimulated } from '../../api';

const NAV_LINKS = [
  { label: 'Platform', hash: '#platform' },
  { label: 'How it works', hash: '#how-it-works' },
  { label: 'Developers', hash: '#developers' },
  { label: 'Security', hash: '#security' },
] as const;

/**
 * Anchor link that works from any public page: on the homepage it is a
 * plain in-page anchor (no navigation, no reload); elsewhere it routes
 * home first and then scrolls to the section.
 */
function AnchorLink({
  hash,
  children,
  className,
}: {
  hash: string;
  children: ReactNode;
  className?: string;
}) {
  const location = useLocation();
  const onHome = location.pathname === '/';

  if (onHome) {
    return (
      <a href={hash} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={{ pathname: '/', hash }} className={className}>
      {children}
    </Link>
  );
}

/**
 * Public marketing navigation. Section links point at the homepage
 * sections; workspace links use router links so they keep working from
 * any public page.
 */
export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setMobileOpen(false), [location.pathname, location.hash]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b bg-surface/95 backdrop-blur transition-colors duration-fast ease-standard',
        scrolled ? 'border-line' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Brand />
          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((link) => (
              <AnchorLink
                key={link.hash}
                hash={link.hash}
                className="rounded-control px-2.5 py-1.5 text-[0.8125rem] font-medium text-ink-secondary transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-ink"
              >
                {link.label}
              </AnchorLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <span className="rounded-full border border-warning-line bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
            {appEnvironment} — {isSimulated ? 'simulated data' : 'live source'}
          </span>
          <Link to="/sign-in" className={buttonClass('ghost', 'sm')}>
            Sign in
          </Link>
          <Link to="/app" className={buttonClass('primary', 'sm')}>
            Open demo
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-control border border-line-strong bg-surface text-ink lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="public-mobile-menu"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMobileOpen((value) => !value)}
        >
          {mobileOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div id="public-mobile-menu" className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="Primary mobile" className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <AnchorLink
                key={link.hash}
                hash={link.hash}
                className="rounded-control px-2.5 py-2 text-sm font-medium text-ink-secondary transition-colors duration-fast ease-standard hover:bg-surface-muted hover:text-ink"
              >
                {link.label}
              </AnchorLink>
            ))}
            <div className="mt-2 flex items-center gap-2 border-t border-line pt-3">
              <Link to="/sign-in" className={buttonClass('secondary', 'sm', 'flex-1')}>
                Sign in
              </Link>
              <Link to="/app" className={buttonClass('primary', 'sm', 'flex-1')}>
                Open demo
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
