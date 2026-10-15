import { ExternalLink, Link2Off } from 'lucide-react';
import { Button, buttonClass } from '../ui/Button';
import { proofOpsConfigured, proofOpsEventsUrl, proofOpsLabel } from '../../api';

/**
 * Contextual cross-link into the sibling ProofOps workspace.
 *
 * When an authorised base URL is configured (`VITE_PROOFOPS_URL`) this renders
 * a real link filtered to the event type and correlation id of the record
 * being viewed. When it is not configured, it renders a clearly disabled
 * control that explains why — the interface never presents a ProofOps link it
 * cannot resolve, and never claims an authorised integration it does not have.
 */
export function ProofOpsEventLink({
  eventType,
  correlationId,
  size = 'sm',
  label,
}: {
  eventType: string;
  correlationId: string;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const url = proofOpsEventsUrl({ eventType, correlationId });
  const text = label ?? `Open in ${proofOpsLabel}`;

  if (!proofOpsConfigured) {
    return (
      <Button
        variant="secondary"
        size={size}
        disabled
        title={`No authorised ${proofOpsLabel} link is configured for this environment.`}
        icon={<Link2Off aria-hidden className="size-4" />}
      >
        {text}
      </Button>
    );
  }

  if (!url) {
    return (
      <Button
        variant="secondary"
        size={size}
        disabled
        title={`The configured ${proofOpsLabel} URL is not a valid address.`}
        icon={<Link2Off aria-hidden className="size-4" />}
      >
        {text}
      </Button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClass('secondary', size)}
      title={`Open this event's context in ${proofOpsLabel}`}
    >
      <ExternalLink aria-hidden className="size-4" />
      {text}
    </a>
  );
}
