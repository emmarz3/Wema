import { Outlet } from 'react-router-dom';
import { Brand } from './Brand';
import { ShieldCheck, LockKeyhole, ScrollText } from 'lucide-react';
import { isSimulated, authoritativeSourceLabel } from '../../api';

/**
 * Authentication layout. Split panel on desktop with the product proof
 * points; single centred card on mobile. The sign-in form itself arrives
 * with the authentication phase.
 */
export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Brand size="lg" to="/" />
          <Outlet />
        </div>
      </div>

      <aside className="relative hidden flex-col justify-between bg-plum px-12 py-12 lg:flex xl:px-16">
        <div>
          <p className="text-xs font-semibold tracking-wide text-white/50 uppercase">
            Wema Hackathon Edition
          </p>
          <h2 className="mt-4 max-w-md text-2xl leading-snug font-semibold text-white">
            Know what happened to every transaction.
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/60">
            Verify payment records against authoritative sources, investigate
            discrepancies, and preserve evidence your team can inspect.
          </p>
        </div>
        <ul className="space-y-4">
          {[
            {
              icon: ShieldCheck,
              title: 'Server-side verification',
              body: 'Outcomes are produced by the source, never by the interface.',
            },
            {
              icon: ScrollText,
              title: 'Auditable evidence',
              body: 'Every check, event and decision stays attached to the record.',
            },
            {
              icon: LockKeyhole,
              title: 'Controlled proof sharing',
              body: 'Share links expose only authorised fields, until they expire.',
            },
          ].map((item) => (
            <li key={item.title} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-white/15 bg-white/5">
                <item.icon aria-hidden className="size-4.5 text-accent" />
              </span>
              <div>
                <p className="text-sm font-medium text-white">{item.title}</p>
                <p className="text-[0.8125rem] text-white/60">{item.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="max-w-md text-xs leading-relaxed text-white/40">
          {isSimulated
            ? `This environment runs against the ${authoritativeSourceLabel.toLowerCase()}. All records shown are simulated and are not real bank confirmations.`
            : 'This environment runs against a live ProofOps source.'}
        </p>
      </aside>
    </div>
  );
}
