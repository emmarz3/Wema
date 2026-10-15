import { describe, expect, it } from 'vitest';
import {
  formatFileSize,
  formatMoney,
  formatMoneyCompact,
  formatPercent,
  formatRelativeTime,
  ratio,
  truncateMiddle,
} from '../lib/format';

const ngn = (amountMinor: number) => ({ amountMinor, currency: 'NGN' });

describe('money formatting', () => {
  it('formats minor units with two decimals and the narrow symbol', () => {
    expect(formatMoney(ngn(50000000))).toContain('500,000.00');
    expect(formatMoney(ngn(50000000))).toContain('₦');
  });

  it('keeps the sign in front for negatives', () => {
    expect(formatMoney(ngn(-125000))).toMatch(/^-/);
  });

  it('compacts large amounts for tiles', () => {
    expect(formatMoneyCompact(ngn(125000000))).toBe('₦1.25M');
    expect(formatMoneyCompact(ngn(2500000))).toBe('₦25.0K');
    expect(formatMoneyCompact(ngn(5000))).toContain('50.00');
  });

  it('renders whole amounts without decimals in compact mode', () => {
    expect(formatMoneyCompact(ngn(250000000))).toBe('₦2.50M');
    // 1e9 minor units = ₦10,000,000 major.
    expect(formatMoneyCompact(ngn(1000000000))).toBe('₦10.0M');
  });
});

describe('numeric formatting', () => {
  it('formats percentages with one decimal by default', () => {
    expect(formatPercent(99.423)).toBe('99.4%');
    expect(formatPercent(99.423, 0)).toBe('99%');
  });

  it('computes ratios safely', () => {
    expect(ratio(1, 4)).toBe(25);
    expect(ratio(3, 0)).toBe(0);
  });
});

describe('identifier and file formatting', () => {
  it('truncates the middle of long identifiers', () => {
    expect(truncateMiddle('wh_evt_9f21c4ee22a1', 6, 4)).toBe('wh_evt…22a1');
    expect(truncateMiddle('short', 10, 4)).toBe('short');
  });

  it('formats file sizes', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatFileSize(-1)).toBe('—');
  });
});

describe('relative time', () => {
  it('renders "just now" for near-present timestamps', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    expect(formatRelativeTime('2026-10-13T11:59:58Z', now)).toBe('just now');
  });

  it('renders minutes and hours ago', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    expect(formatRelativeTime('2026-10-13T11:30:00Z', now)).toBe('30 minutes ago');
    expect(formatRelativeTime('2026-10-13T09:00:00Z', now)).toBe('3 hours ago');
  });

  it('returns an em dash for invalid input', () => {
    expect(formatRelativeTime('not-a-date')).toBe('—');
  });
});
