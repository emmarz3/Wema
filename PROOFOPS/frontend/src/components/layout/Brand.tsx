import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';

/** ProofOps wordmark with a restrained shield/check icon. */
export function Brand({
  className,
  to = '/',
  showWordmark = true,
  size = 'md',
}: {
  className?: string;
  to?: string;
  showWordmark?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize = size === 'lg' ? 'size-7' : size === 'sm' ? 'size-5' : 'size-6';
  const textSize = size === 'lg' ? 'text-lg' : size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center gap-2 rounded-control font-semibold text-ink transition-colors duration-fast ease-standard hover:text-brand',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex items-center justify-center rounded-[7px] bg-brand text-white',
          iconSize,
        )}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-[68%]">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      {showWordmark ? <span className={cn('tracking-tight', textSize)}>ProofOps</span> : null}
    </Link>
  );
}
