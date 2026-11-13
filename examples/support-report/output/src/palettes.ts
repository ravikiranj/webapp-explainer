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
  }
};
