import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatRelativeTime,
  secondsBetween,
  truncateMiddle,
} from '../lib/format';

describe('money formatting', () => {
  it('renders minor units as a major-unit currency amount', () => {
    expect(formatMoney({ amountMinor: 125_000_000, currency: 'NGN' })).toBe(
      '₦1,250,000.00',
    );
  });

  it('always shows two decimals for tabular alignment', () => {
    expect(formatMoney({ amountMinor: 5, currency: 'NGN' })).toBe('₦0.05');
  });

  it('marks negatives with a leading sign', () => {
    expect(formatMoney({ amountMinor: -2_500, currency: 'NGN' })).toBe('-₦25.00');
  });

  it('compacts large amounts for dashboard tiles', () => {
    expect(formatMoneyCompact({ amountMinor: 123_456_789, currency: 'NGN' })).toBe(
      '₦1.23M',
    );
    expect(formatMoneyCompact({ amountMinor: 123_456, currency: 'NGN' })).toBe(
      '₦1.23K',
    );
    expect(formatMoneyCompact({ amountMinor: 999, currency: 'NGN' })).toBe('₦9.99');
  });
});

describe('date formatting', () => {
  it('formats local timestamps deterministically', () => {
    expect(formatDateTime('2026-10-13T14:32:07')).toBe('13 Oct 2026, 14:32:07');
    expect(formatDate('2026-10-13T14:32:07')).toBe('13 Oct 2026');
  });

  it('renders invalid input as an em dash rather than crashing', () => {
    expect(formatDateTime('not-a-date')).toBe('—');
  });
});

describe('relative time', () => {
  it('describes recent timestamps in words', () => {
    const now = new Date('2026-10-13T12:00:00');
    const thirtySecondsAgo = new Date('2026-10-13T11:59:30').toISOString();
    expect(formatRelativeTime(thirtySecondsAgo, now)).toBe('30 seconds ago');
  });

  it('treats the immediate past as "just now"', () => {
    const now = new Date('2026-10-13T12:00:03');
    expect(formatRelativeTime('2026-10-13T12:00:00', now)).toBe('just now');
  });
});

describe('identifier helpers', () => {
  it('truncates long references in the middle', () => {
    expect(truncateMiddle('txn_01H8XGJ4K2M9P0Q7', 10, 4)).toBe('txn_01H8XG…P0Q7');
  });

  it('leaves short identifiers untouched', () => {
    expect(truncateMiddle('txn_123', 10, 4)).toBe('txn_123');
  });

  it('measures whole seconds between timestamps', () => {
    expect(
      secondsBetween('2026-10-13T12:00:00', '2026-10-13T12:00:07'),
    ).toBe(7);
  });
});
