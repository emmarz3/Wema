/**
 * Chart colours. SVG presentation attributes cannot read CSS custom
 * properties, so the palette is mirrored here in hex form.
 *
 * Keep in sync with the design tokens in `src/index.css`:
 *   success  #287D61 · warning #A66B16 · danger #B42318 · info #315E8A
 *   brand    #990D81 · accent  #AE328E · ink    #26212B
 */
export const chartPalette = {
  success: '#287D61',
  warning: '#A66B16',
  danger: '#B42318',
  info: '#315E8A',
  brand: '#990D81',
  accent: '#AE328E',
  ink: '#26212B',
  inkSecondary: '#6D6673',
  grid: '#E4DEE7',
  surface: '#FFFFFF',
} as const;

export const chartAxis = {
  stroke: chartPalette.grid,
  tick: { fill: chartPalette.inkSecondary, fontSize: 11 },
} as const;

export const chartTooltipStyle = {
  contentStyle: {
    background: chartPalette.surface,
    border: `1px solid ${chartPalette.grid}`,
    borderRadius: 8,
    boxShadow: '0 4px 16px rgb(56 32 59 / 12%)',
    fontSize: 12,
    padding: '8px 10px',
  },
  labelStyle: { color: chartPalette.inkSecondary, fontSize: 11 },
  itemStyle: { color: chartPalette.ink, fontSize: 12 },
} as const;
