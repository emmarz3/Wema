import '@testing-library/jest-dom/vitest';

// jsdom does not implement matchMedia; the app uses it to honour
// prefers-reduced-motion, so provide a controllable stub.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
