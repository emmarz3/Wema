import { Outlet } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

/** Public marketing layout: sticky header, content, footer. */
export function MarketingLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <PublicHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
