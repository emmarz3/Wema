/**
 * Chart palette. Purple is the brand colour but not the colour of every
 * component — charts mostly use it as a single accent among restrained,
 * distinguishable tones. Every series below remains readable in legends
 * and tooltips without relying on colour alone (charts always label
 * series in text as well).
 */

export const chartPalette = {
  brand: '#990d81',
  accent: '#ae328e',
  info: '#315e8a',
  success: '#287d61',
  warning: '#a66b16',
  danger: '#b42318',
  plum: '#38203b',
} as const;

/** Ordered categorical sequence for multi-series charts. */
export const chartSeries: readonly string[] = [
  chartPalette.brand,
  chartPalette.info,
  chartPalette.success,
  chartPalette.warning,
  chartPalette.accent,
  chartPalette.danger,
  chartPalette.plum,
];

/** Maps a status tone to its hex value for chart elements. */
export const toneHex = {
  brand: chartPalette.brand,
  accent: chartPalette.accent,
  info: chartPalette.info,
  success: chartPalette.success,
  warning: chartPalette.warning,
  danger: chartPalette.danger,
  neutral: '#6d6673',
} as const;

/** Chart grid / axis defaults so every chart reads the same way. */
export const chartAxis = {
  stroke: '#cdc4ce',
  grid: '#ebe7ee',
  tick: { fill: '#6d6673', fontSize: 12 },
  tooltip: {
    contentStyle: {
      borderRadius: 8,
      border: '1px solid #e4dee7',
      boxShadow: '0 4px 16px rgb(38 33 43 / 8%)',
      fontSize: 12,
    },
  },
} as const;
