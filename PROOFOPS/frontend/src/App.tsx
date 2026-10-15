import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MarketingLayout } from './components/layout/MarketingLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { AppShell } from './components/layout/AppShell';
import { PageHeader } from './components/layout/AppShell';
import { Panel } from './components/ui/Panel';
import { Spinner } from './components/ui/Loading';
import { canSeeSection } from './lib/permissions';
import { Workflow } from 'lucide-react';
import { HomePage } from './pages/HomePage';
import { DesignSystemPage } from './pages/DesignSystemPage';
import { SignInPage } from './pages/SignInPage';
import { NotFoundPage } from './pages/PublicNotices';
import { SectionInProgress } from './pages/SectionInProgress';
import { AuthProvider, useAuth } from './state/auth';

/** Workspace sections and the routes that deliver them. */
const WORKSPACE_SECTIONS = [
  { path: '/app', section: 'overview' },
  { path: '/app/verification', section: 'verification' },
  { path: '/app/proof', section: 'proof' },
  { path: '/app/reconciliation', section: 'reconciliation' },
  { path: '/app/infrastructure', section: 'infrastructure' },
  { path: '/app/incidents', section: 'incidents' },
  { path: '/app/investigator', section: 'investigator' },
  { path: '/app/developer', section: 'developer' },
  { path: '/app/notifications', section: 'notifications' },
  { path: '/app/settings', section: 'settings' },
] as const;

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="shell-height flex flex-col items-center justify-center gap-3 bg-canvas">
      <Spinner label={label} />
      <p className="text-sm text-ink-secondary">{label}</p>
    </div>
  );
}

/** Blocks the workspace until a valid session exists. */
function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Restoring your session" />;
  if (status === 'signedOut') {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: location.pathname, reason: location.state?.reason }}
      />
    );
  }
  return <AuthenticatedShell />;
}

/** The shell, wired to the signed-in session's role. */
function AuthenticatedShell() {
  const { role } = useAuth();
  return <AppShell role={role} />;
}

/** Sends already-signed-in users to their destination. */
function SignInRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <FullPageLoader label="Restoring your session" />;
  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/sign-in' ? from : '/app'} replace />;
  }
  return <SignInPage />;
}

/** Honest state for a section the signed-in role may not access. */
function SectionRestricted({ sectionId }: { sectionId: string }) {
  return (
    <>
      <PageHeader
        title="Not available for your role"
        description="Your role does not include access to this area of the workspace."
      />
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <Panel className="p-8 text-center">
          <span className="mx-auto flex size-10 items-center justify-center rounded-panel border border-line bg-surface-muted">
            <Workflow aria-hidden className="size-5 text-ink-secondary" />
          </span>
          <h2 className="mt-3 text-sm font-semibold text-ink">
            {sectionId} is outside your role's access
          </h2>
          <p className="mx-auto mt-1 max-w-md text-[0.8125rem] text-ink-secondary">
            Access is decided by the role your account carries. If you need this
            area, ask an administrator — the change is made server-side, never
            in the interface.
          </p>
        </Panel>
      </div>
    </>
  );
}

/** Route for one workspace section: role check first, then the screen. */
function SectionRoute({ section }: { section: string }) {
  const { role } = useAuth();
  if (role && !canSeeSection(role, section)) {
    return <SectionRestricted sectionId={section} />;
  }
  return <SectionInProgress />;
}

/**
 * Route table.
 *
 * Public marketing routes live under the marketing layout; `/sign-in`
 * under the auth layout; the authenticated workspace under the app shell.
 * Workspace sections whose product screens arrive in later phases render
 * an honest in-progress state — never fabricated content.
 */
export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="/sign-in" element={<SignInRoute />} />
        </Route>

        <Route element={<RequireAuth />}>
          {WORKSPACE_SECTIONS.map(({ path, section }) => (
            <Route
              key={path}
              path={path}
              element={<SectionRoute section={section} />}
            />
          ))}
          <Route path="/app/*" element={<NotFoundPage withinWorkspace />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
