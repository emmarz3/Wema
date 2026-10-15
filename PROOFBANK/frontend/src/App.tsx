import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './state/auth';
import { AppShell } from './components/layout/AppShell';
import { PageHeader } from './components/layout/PageHeader';
import { Panel } from './components/ui/Panel';
import { Spinner } from './components/ui/Loading';
import { canSeeSection } from './lib/permissions';
import { SignInPage } from './pages/SignInPage';
import { OverviewPage } from './pages/OverviewPage';
import { CustomersPage } from './pages/CustomersPage';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { AccountsPage } from './pages/AccountsPage';
import { AccountDetailPage } from './pages/AccountDetailPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { TransactionDetailPage } from './pages/TransactionDetailPage';
import { LedgerPage } from './pages/LedgerPage';
import { SimulationControlPage } from './pages/SimulationControlPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { InfrastructurePage } from './pages/InfrastructurePage';
import { EventDeliveryPage } from './pages/EventDeliveryPage';
import {
  DeferredSectionPage,
  SectionRestricted,
} from './pages/DeferredSectionPage';

const SECTION_IDS = ['audit', 'settings'] as const;

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
        state={{ from: { pathname: location.pathname } }}
      />
    );
  }
  return <AppShell />;
}

/** Sends already-signed-in users straight to the workspace. */
function SignInRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageLoader label="Restoring your session" />;
  if (status === 'signedIn') return <Navigate to="/overview" replace />;
  return <SignInPage />;
}

function SectionRoute({ sectionId }: { sectionId: string }) {
  const { role } = useAuth();
  if (role && !canSeeSection(role, sectionId)) {
    return <SectionRestricted sectionId={sectionId} />;
  }
  return <DeferredSectionPage sectionId={sectionId} />;
}

function NotFoundRoute(): ReactNode {
  return (
    <>
      <PageHeader title="Page not found" />
      <Panel>
        <p className="text-sm text-ink-secondary">
          The address you opened does not exist in the workspace.
        </p>
      </Panel>
    </>
  );
}

/** Route table. Exported separately so tests can supply MemoryRouter. */
export function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/sign-in" element={<SignInRoute />} />
        <Route element={<RequireAuth />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:customerId" element={<CustomerDetailPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:accountId" element={<AccountDetailPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/simulation" element={<SimulationControlPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/infrastructure" element={<InfrastructurePage />} />
          <Route path="/events" element={<EventDeliveryPage />} />
          {SECTION_IDS.map((id) => (
            <Route
              key={id}
              path={`/${id}`}
              element={<SectionRoute sectionId={id} />}
            />
          ))}
          <Route path="*" element={<NotFoundRoute />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default function App() {
  return <AppRoutes />;
}
