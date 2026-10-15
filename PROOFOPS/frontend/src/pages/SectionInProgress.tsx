import { Navigate, useLocation } from 'react-router-dom';

export function SectionInProgress() {
  const location = useLocation();
  const path = location.pathname;

  // Check if we're on a phase 4 section that has been implemented
  const sectionFromPath = path.split('/').pop() as string | undefined;
  const phase4Sections = ['verification'];
  
  if (sectionFromPath && phase4Sections.includes(sectionFromPath)) {
    return <Navigate to="/app/verification" replace />;
  }

  // For other sections, show the in-progress message
  const isWorkspaceSection = path.startsWith('/app/') && path !== '/app';
  if (isWorkspaceSection) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="text-center py-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-panel border border-line bg-surface-muted">
            <span className="text-ink-secondary">🔧</span>
          </div>
          <h2 className="mt-4 text-sm font-semibold text-ink">
            Section implementation in progress
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[0.8125rem] text-ink-secondary">
            This workspace section is being developed. The foundation and API integration are built, but the user interface is arriving in its scheduled phase.
          </p>
        </div>
      </div>
    );
  }

  // For non-workspace paths, redirect to homepage
  return <Navigate to="/" replace />;
}

