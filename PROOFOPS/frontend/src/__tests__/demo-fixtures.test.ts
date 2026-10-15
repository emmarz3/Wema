import { describe, expect, it, vi } from 'vitest';
import {
  DEMO_SCENARIOS,
  DEMO_STEPS,
  PREVIEW_DELIVERY_MIX,
  PREVIEW_RESULT_MIX,
  SAMPLE_LABEL,
} from '../components/marketing/demoFixtures';

/**
 * The demonstration fixtures are the only “data” the public homepage
 * shows. These tests pin their integrity: amounts, outcomes and the
 * separation of payment vs delivery status.
 */
describe('demo fixtures', () => {
  it('provides three scenarios with a documented script', () => {
    expect(DEMO_SCENARIOS).toHaveLength(3);
    expect(DEMO_SCENARIOS.map((scenario) => scenario.id)).toEqual([
      'verified',
      'mismatch',
      'delivery-failed',
    ]);
    expect(DEMO_STEPS).toHaveLength(4);
  });

  it('makes the mismatch scenario a real ₦500,000 vs ₦250,000 difference', () => {
    const mismatch = DEMO_SCENARIOS.find((scenario) => scenario.id === 'mismatch');
    expect(mismatch).toBeDefined();
    // Minor units: 500,000.00 NGN = 50,000,000 kobo.
    expect(mismatch?.receipt.amountMinor).toBe(50_000_000);
    expect(mismatch?.source.amountMinor).toBe(25_000_000);
    expect(mismatch?.outcome.result).toBe('mismatch');
    const amountCheck = mismatch?.checks.find((check) => check.key === 'amount');
    expect(amountCheck?.outcome).toBe('failed');
    expect(amountCheck?.observed).toContain('250,000.00');
  });

  it('keeps payment status and delivery status separate in the delivery scenario', () => {
    const scenario = DEMO_SCENARIOS.find((item) => item.id === 'delivery-failed');
    expect(scenario?.source.status).toBe('successful');
    expect(scenario?.outcome.result).toBe('verified');
    expect(scenario?.delivery?.status).toBe('failed');
    expect(scenario?.delivery?.attempts).toHaveLength(3);
    // The failing check is about delivery, not about the payment.
    const deliveryCheck = scenario?.checks.find((check) => check.key === 'delivery');
    expect(deliveryCheck?.outcome).toBe('failed');
    expect(deliveryCheck?.detail).toMatch(/nothing about whether the payment succeeded/i);
  });

  it('gives every check an explanation and an outcome', () => {
    DEMO_SCENARIOS.forEach((scenario) => {
      expect(scenario.checks.length).toBeGreaterThanOrEqual(4);
      scenario.checks.forEach((check) => {
        expect(['passed', 'failed', 'indeterminate']).toContain(check.outcome);
        expect(check.detail.length).toBeGreaterThan(10);
        expect(check.compared.length).toBeGreaterThan(5);
      });
    });
  });

  it('labels sample data with a stable label', () => {
    expect(SAMPLE_LABEL).toMatch(/simulated/i);
  });

  it('keeps preview result counts positive and complete', () => {
    PREVIEW_RESULT_MIX.forEach((entry) => {
      expect(entry.count).toBeGreaterThanOrEqual(0);
    });
    PREVIEW_DELIVERY_MIX.forEach((entry) => {
      expect(entry.count).toBeGreaterThan(0);
    });
  });
});

/**
 * The hero respects the reduced-motion preference by skipping its GSAP
 * entrance entirely (content is visible at rest either way).
 */
describe('reduced motion', () => {
  it('reports the preference from matchMedia', async () => {
    const { prefersReducedMotion } = await import('../lib/motion');
    const spy = vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);
    expect(prefersReducedMotion()).toBe(true);
    spy.mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);
    expect(prefersReducedMotion()).toBe(false);
    spy.mockRestore();
  });
});
