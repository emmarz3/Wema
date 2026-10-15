import { Link } from 'react-router-dom';
import { ArrowRight, MonitorPlay, Terminal } from 'lucide-react';
import { buttonClass } from '../ui/Button';

/** Final call to action. Three honest destinations: the sandbox demo, the workspace, the docs. */
export function FinalCta() {
  return (
    <section id="cta" className="section-anchor bg-plum py-16 lg:py-20">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            See it on your own evidence
          </h2>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/70">
            Walk the interactive demonstration above, then open the workspace on
            the labelled sandbox. Nothing here touches real financial data.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#demo" className={buttonClass('primary', 'md')}>
              <MonitorPlay aria-hidden className="size-4" />
              Explore the sandbox
            </a>
            <Link
              to="/app"
              className={buttonClass('secondary', 'md', 'border-white/25 bg-white/10 text-white hover:bg-white/15')}
            >
              Open the application
              <ArrowRight aria-hidden className="size-4" />
            </Link>
            <a
              href="#developers"
              className={buttonClass('ghost', 'md', 'text-white/80 hover:bg-white/10 hover:text-white')}
            >
              <Terminal aria-hidden className="size-4" />
              Read the developer docs
            </a>
          </div>
          <p className="mt-6 text-xs leading-relaxed text-white/50">
            Simulated banking data is not a real bank confirmation. The sandbox
            runs on a labelled simulated data source and never contacts a real
            provider.
          </p>
        </div>
      </div>
    </section>
  );
}
