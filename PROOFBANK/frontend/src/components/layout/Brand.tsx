/** Brand mark: a stylised ledger stack inside a rounded purple tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      role="img"
      aria-label="ProofBank"
      className={className}
    >
      <rect width="32" height="32" rx="8" fill="#38203B" />
      <rect x="7" y="8" width="18" height="3.4" rx="1.7" fill="#AE328E" />
      <rect x="7" y="14.3" width="13" height="3.4" rx="1.7" fill="#FFFFFF" />
      <rect x="7" y="20.6" width="9" height="3.4" rx="1.7" fill="#FFFFFF" opacity="0.72" />
    </svg>
  );
}

/** Wordmark + product identity line used in the sidebar and sign-in. */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="size-8 shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-plum">
            ProofBank
          </span>
          <span className="text-[0.6875rem] text-ink-secondary">
            Banking simulation console
          </span>
        </span>
      )}
    </span>
  );
}
