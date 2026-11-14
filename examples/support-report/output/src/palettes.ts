// Colour palettes. A palette sets every colour that carries a meaning. The choice is saved and goes in the link.

export interface Palette {
  readonly name: string;
  readonly accent: string;
  /** One colour for each product, in the order of PRODUCTS. */
  readonly items: string[];
  readonly overall: [string, string];
  readonly causes: Record<string, string>;
}

export const PRODUCTS = ['Checkout', 'Search', 'Accounts', 'Notifications', 'Catalog'];

export const PALETTES: Record<string, Palette> = {
  classic: {
    name: 'Classic', accent: '#2a5bd7', items: ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f'], overall: ['#3f37c9', '#9d9bff'],
    causes: { dependency: '#e67e22', ours: '#c0392b', 'false-alarm': '#7f8c8d', transient: '#3498db', unclear: '#bdc3c7' }
  },
  colorblind: {
    name: 'Colour-blind safe', accent: '#0072B2', items: ['#0072B2', '#E69F00', '#009E73', '#D55E00', '#CC79A7'], overall: ['#332288', '#b3a8ff'],
    causes: { dependency: '#E69F00', ours: '#D55E00', 'false-alarm': '#999999', transient: '#56B4E9', unclear: '#cfcfcf' }
  },
  vivid: {
    name: 'Vivid', accent: '#2563eb', items: ['#2563eb', '#f97316', '#10b981', '#ef4444', '#8b5cf6'], overall: ['#9d174d', '#f9a8d4'],
    causes: { dependency: '#f97316', ours: '#dc2626', 'false-alarm': '#94a3b8', transient: '#06b6d4', unclear: '#cbd5e1' }
  },
  calm: {
    name: 'Calm', accent: '#332288', items: ['#332288', '#88CCEE', '#44AA99', '#117733', '#CC6677'], overall: ['#d95f02', '#ffb27a'],
    causes: { dependency: '#DDCC77', ours: '#CC6677', 'false-alarm': '#a8a8a8', transient: '#88CCEE', unclear: '#d4d4d4' }
  },
  ocean: {
    name: 'Ocean', accent: '#0b6e99', items: ['#0b6e99', '#38b6c9', '#7a5cc7', '#f2a33a', '#2f9e6f'], overall: ['#0a3d62', '#8ec9e8'],
    causes: { dependency: '#f2a33a', ours: '#c2415d', 'false-alarm': '#8393a0', transient: '#38b6c9', unclear: '#c5d0d8' }
  },
  sunset: {
    name: 'Sunset', accent: '#c2410c', items: ['#c2410c', '#f59e0b', '#be185d', '#7c3aed', '#0f766e'], overall: ['#7f1d1d', '#fca5a5'],
    causes: { dependency: '#f59e0b', ours: '#be123c', 'false-alarm': '#9a8c86', transient: '#7c3aed', unclear: '#d6cdc9' }
  },
  forest: {
    name: 'Forest', accent: '#2f7d32', items: ['#2f7d32', '#8bc34a', '#00897b', '#f9a825', '#6d4c41'], overall: ['#1b4d1e', '#a5d6a7'],
    causes: { dependency: '#f9a825', ours: '#b3402a', 'false-alarm': '#85938a', transient: '#26a69a', unclear: '#cdd6cf' }
  },
  berry: {
    name: 'Berry', accent: '#a21caf', items: ['#a21caf', '#e11d74', '#3b82f6', '#14b8a6', '#eab308'], overall: ['#581c87', '#e9a8f5'],
    causes: { dependency: '#eab308', ours: '#e11d74', 'false-alarm': '#928aa0', transient: '#3b82f6', unclear: '#d3cedc' }
  },
  earth: {
    name: 'Earth', accent: '#8d5a2b', items: ['#8d5a2b', '#c9a227', '#5f7a4a', '#b5503c', '#5b7c99'], overall: ['#4a2f14', '#d9bb8f'],
    causes: { dependency: '#c9a227', ours: '#a8432f', 'false-alarm': '#8c8579', transient: '#5b7c99', unclear: '#d2cdc2' }
  },
  contrast: {
    name: 'High contrast', accent: '#0033cc', items: ['#0033cc', '#e60000', '#e6a800', '#007a3d', '#8a2be2'], overall: ['#000000', '#ffffff'],
    causes: { dependency: '#e6a800', ours: '#e60000', 'false-alarm': '#6b6b6b', transient: '#0033cc', unclear: '#b5b5b5' }
  }
};

export const PALETTE_KEYS = Object.keys(PALETTES);
