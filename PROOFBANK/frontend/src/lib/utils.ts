/**
 * Tiny class-name joiner. Keeps conditional class lists readable without
 * pulling in a dependency.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Deterministic pseudo-random generator so simulated data is repeatable. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Pick a deterministic element from a list. */
export function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

/** Pad a number to a fixed width with leading zeroes. */
export function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** Best-effort UUID that works in every browser the demo needs. */
export function uuid(prefix = ''): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  const raw =
    cryptoObj && 'randomUUID' in cryptoObj
      ? cryptoObj.randomUUID()
      : `${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`;
  return prefix ? `${prefix}_${raw}` : raw;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
