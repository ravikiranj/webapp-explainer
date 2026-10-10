// The registry of example apps. Each app builds into site/examples/<slug>/
// and the landing page links to it with a relative path.

export interface AppCard {
  readonly slug: string;
  readonly title: string;
  readonly subtitle: string;
  readonly icon: string;
  readonly domain: string;
  readonly summary: string;
  readonly dataKind: 'mock' | 'real';
  readonly stages: string[];
}

export const APPS: readonly AppCard[] = [
  {
    slug: 'rate-limiter',
    title: 'Rate Limiting',
    subtitle: 'one node to many regions',
    icon: 'bi-speedometer2',
    domain: 'System design',
    summary:
      'How a per-key request limit holds as a service grows from one node ' +
      'to a multi-region fleet. Shows what breaks and the fix at each step.',
    dataKind: 'mock',
    stages: ['1 node', '10 nodes', '50 nodes / 3 regions', 'full scale']
  },
  {
    slug: 'traffic-signal-timing',
    title: 'Traffic Signal Timing',
    subtitle: 'one light to a whole city',
    icon: 'bi-signpost-split',
    domain: 'System design',
    summary:
      'How the 90 second wait rule holds as a city grows from one ' +
      'intersection to a coordinated, adaptive, city-wide system.',
    dataKind: 'mock',
    stages: ['1 intersection', '20 in a line', '500 city-wide']
  },
  {
    slug: 'unique-id-generator',
    title: 'Unique ID Generator',
    subtitle: 'one node to many regions',
    icon: 'bi-123',
    domain: 'System design',
    summary:
      'How IDs stay unique and roughly time sortable as the rate grows ' +
      'from 100 to 1,000,000 IDs per second across regions.',
    dataKind: 'mock',
    stages: ['1 node', '10 nodes', '100 nodes / 5 regions']
  },
  {
    slug: 'insulin-resistance',
    title: 'Insulin Resistance',
    subtitle: 'and higher South Asian risk',
    icon: 'bi-heart-pulse',
    domain: 'Science and health',
    summary:
      'Why South Asians face higher diabetes and heart disease risk at a ' +
      'lower body size. Uses real, cited data from named sources.',
    dataKind: 'real',
    stages: ['normal insulin', 'resistance', 'risk cutoffs', 'disease risk', 'open questions']
  },
  {
    slug: 'chess-endgames',
    title: 'Chess Endgames',
    subtitle: 'an interactive trainer up to 1800 ELO',
    icon: 'bi-puzzle',
    domain: 'Skill and practice',
    summary:
      'Learn core endgame concepts, then solve at least twenty positions ' +
      'for each. A bundled Stockfish engine checks your moves. Progress ' +
      'saves locally, with separate profiles.',
    dataKind: 'mock',
    stages: ['opposition', 'key squares', 'rook endgames', 'and more']
  }
];
