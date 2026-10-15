import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { HeroVerificationPreview } from './HeroVerificationPreview';
import { prefersReducedMotion } from '../../lib/motion';
import { buttonClass } from '../ui/Button';
import { SAMPLE_LABEL } from './demoFixtures';

const TRUST_POINTS = [
  'Server-side verification',
  'Auditable evidence',
  'Role-based access',
] as const;

/**
 * Homepage hero. The entrance is a GSAP sequence (the one place on the
 * site GSAP is used, per the motion plan) and is skipped entirely when
 * the user prefers reduced motion — content is simply visible.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
      timeline
        .from('[data-hero="badge"]', { y: 10, opacity: 0, duration: 0.4 })
        .from(
          '[data-hero="line"]',
          { y: 26, opacity: 0, duration: 0.6, stagger: 0.08 },
          '-=0.15',
        )
        .from('[data-hero="copy"]', { y: 14, opacity: 0, duration: 0.45 }, '-=0.3')
        .from('[data-hero="cta"]', { y: 12, opacity: 0, duration: 0.4, stagger: 0.07 }, '-=0.25')
        .from(
          '[data-hero="trust"]',
          { opacity: 0, duration: 0.4 },
          '-=0.2',
        )
        .from(
          '[data-hero="preview"]',
          { y: 26, opacity: 0, scale: 0.985, duration: 0.7 },
          '-=0.55',
        );
    }, root);
    return () => context.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden border-b border-line bg-surface"
      aria-labelledby="hero-heading"
    >
      <div aria-hidden className="hero-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 pt-14 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pt-20 lg:pb-24">
        <div>
          <p
            data-hero="badge"
            className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase"
          >
            <ShieldCheck aria-hidden className="size-3.5" />
            Wema Hackathon Edition
          </p>

          <h1
            id="hero-heading"
            className="mt-5 text-4xl leading-[1.08] font-semibold tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]"
          >
            <span data-hero="line" className="block">
              Know what happened
            </span>
            <span data-hero="line" className="block">
              to every transaction.
            </span>
          </h1>

          <p
            data-hero="copy"
            className="mt-5 max-w-xl text-base leading-relaxed text-ink-secondary sm:text-[1.0625rem]"
          >
            Verify payment records, identify discrepancies, and trace the
            infrastructure events behind every outcome — with evidence you can
            inspect.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#demo" data-hero="cta" className={buttonClass('primary', 'md')}>
              Explore the demo
              <ArrowRight aria-hidden className="size-4" />
            </a>
            <a
              href="#how-it-works"
              data-hero="cta"
              className={buttonClass('secondary', 'md')}
            >
              How it works
            </a>
          </div>

          <ul
            data-hero="trust"
            className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {TRUST_POINTS.map((point) => (
              <li
                key={point}
                className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-secondary"
              >
                <Check aria-hidden className="size-3.5 text-success" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div data-hero="preview" className="lg:pl-4">
          <HeroVerificationPreview />
        </div>
      </div>

      <p className="relative mx-auto max-w-6xl px-4 pb-6 text-xs text-ink-secondary sm:px-6">
        {SAMPLE_LABEL}. Simulated banking data is not a real bank confirmation.
      </p>
    </section>
  );
}
