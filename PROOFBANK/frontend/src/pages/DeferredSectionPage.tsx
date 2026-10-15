import { useLocation, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Construction, ShieldOff } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Panel } from '../components/ui/Panel';
import { SimulatedNotice } from '../components/layout/Environment';
import { Button, buttonClass } from '../components/ui/Button';
import { navSections } from '../components/layout/Sidebar';
import { useAuth } from '../state/auth';
import { roleLabels } from '../lib/permissions';

/**
 * Deferred section page. Shows what the section will do, which phase
 * delivers it, and — when the backend contract does not yet exist for it —
 * says so plainly instead of rendering dead controls.
 */
export function DeferredSectionPage({ sectionId }: { sectionId: string }) {
  const section = navSections.find((item) => item.id === sectionId);
  const location = useLocation();
  const navigate = useNavigate();

  if (!section) {
    return (
      <Panel title="Section not found">
        <p className="text-sm text-ink-secondary">
          No workspace section matches <span className="font-technical">{location.pathname}</span>.
        </p>
      </Panel>
    );
  }

  return (
    <>
      <PageHeader
        title={section.label}
        sectionId={section.id}
        description={section.description}
      />
      <Panel
        title={
          <span className="flex items-center gap-2">
            <Construction aria-hidden className="size-4 text-warning" />
            Delivered in Phase {section.deliveredInPhase}
          </span>
        }
        description={`This workspace screen is scheduled in the approved implementation plan. It will be built against the API contract defined for Phase ${section.deliveredInPhase}.`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-secondary">
            Until then this screen is intentionally inert: no controls are
            shown that the data source cannot answer for, and no simulated
            values are displayed as if they were real.
          </p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-control border border-line bg-surface-muted/50 p-3">
              <dt className="text-xs font-medium text-ink-secondary">Route</dt>
              <dd className="mt-1 font-technical text-ink">{section.path}</dd>
            </div>
            <div className="rounded-control border border-line bg-surface-muted/50 p-3">
              <dt className="text-xs font-medium text-ink-secondary">
                Implementation phase
              </dt>
              <dd className="mt-1 text-sm text-ink">Phase {section.deliveredInPhase}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
              Go back
            </Button>
            <Link to="/overview" className={buttonClass('ghost', 'sm')}>
              Back to Overview
            </Link>
          </div>
        </div>
      </Panel>
    </>
  );
}

/** Shown when a role may not open a section at all. */
export function SectionRestricted({ sectionId }: { sectionId: string }) {
  const section = navSections.find((item) => item.id === sectionId);
  const { role } = useAuth();
  return (
    <>
      <PageHeader title={section?.label ?? 'Restricted'} sectionId={sectionId} />
      <Panel>
        <div className="flex flex-col items-start gap-3 rounded-control border border-warning-line bg-warning-soft px-4 py-4">
          <span className="flex items-center gap-2 text-sm font-semibold text-warning">
            <ShieldOff aria-hidden className="size-4" />
            Your role cannot open this section
          </span>
          <p className="text-sm text-ink-secondary">
            Signed in as <strong>{role ? roleLabels[role] : 'unknown role'}</strong>.
            The data source grants access to this section to other roles. Ask a
            simulator administrator for elevated access.
          </p>
          <SimulatedNotice />
        </div>
      </Panel>
    </>
  );
}
