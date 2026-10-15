/**
 * Formatting helpers. Money arrives from the data source as minor units
 * (kobo/cents) plus a currency code; the frontend never invents values,
 * it only renders what it was given.
 */

import type { Money } from '../types/domain';

export type { Money };

const currencyFormatters = new Map<string, Intl.NumberFormat>();

function currencyFormatter(currency: string): Intl.NumberFormat {
  let formatter = currencyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    currencyFormatters.set(currency, formatter);
  }
  return formatter;
}

/** e.g. ₦1,250,000.00 — always two decimals, always tabular in the UI. */
export function formatMoney(money: Money): string {
  const major = money.amountMinor / 100;
  const formatted = currencyFormatter(money.currency).format(Math.abs(major));
  return money.amountMinor < 0 ? `-${formatted}` : formatted;
}

/** Compact variant for dashboard tiles: ₦1.25M */
export function formatMoneyCompact(money: Money): string {
  const major = money.amountMinor / 100;
  const sign = money.amountMinor < 0 ? '-' : '';
  const units: Array<[number, string]> = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [factor, suffix] of units) {
    if (Math.abs(major) >= factor) {
      const value = major / factor;
      return `${sign}${money.currency === 'NGN' ? '₦' : ''}${value.toFixed(
        Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2,
      )}${suffix}`;
    }
  }
  return `${sign}${currencyFormatter(money.currency).format(major)}`;
}

/** Positive/negative magnitude for a delta. */
export function formatDelta(money: Money): string {
  return `${money.amountMinor >= 0 ? '+' : '-'}${formatMoney({
    ...money,
    amountMinor: Math.abs(money.amountMinor),
  })}`;
}

/** Percentages with one decimal at most, e.g. 99.4% */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** 13 Oct 2026, 14:32:07 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

/** 13 Oct 2026 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

/** 14:32:07 */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : timeFormatter.format(date);
}

const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const relativeSteps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.348],
  ['month', 12],
];

/** "12 seconds ago", "3 minutes ago", … */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  let delta = (date.getTime() - now.getTime()) / 1000;
  if (Math.abs(delta) < 5) return 'just now';
  for (const [unit, step] of relativeSteps) {
    if (Math.abs(delta) < step) {
      return relativeFormatter.format(Math.round(delta), unit);
    }
    delta /= step;
  }
  return relativeFormatter.format(Math.round(delta), 'year');
}

/** Whole seconds between two ISO timestamps (never negative). */
export function secondsBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.round((to - from) / 1000));
}

/** Truncate a long technical identifier, keeping head and tail. */
export function truncateMiddle(value: string, head = 10, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** Percentage from two counts, safe against division by zero. */
export function ratio(part: number, whole: number): number {
  if (!whole) return 0;
  return (part / whole) * 100;
}

/** File sizes in human units, e.g. 2.4 MB */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
