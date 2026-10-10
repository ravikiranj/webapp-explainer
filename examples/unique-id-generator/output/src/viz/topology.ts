// d3 custom views for the unique ID generator explainer: a node and region
// layout, and a snowflake 64 bit layout bar.

import * as d3 from 'd3';
import { cssVar } from '../theme.ts';
import { SNOWFLAKE_LAYOUT } from '../domain.ts';

let INK_DIM = '#c2cce0';
let LINE = '#2a3350';
let ACCENT = '#4f9dff';
let GOOD = '#37d39b';
let BAD = '#ff6b6b';
let PANEL2 = '#1e2740';

function syncColors(): void {
  INK_DIM = cssVar('--ink-dim') || INK_DIM;
  LINE = cssVar('--line') || LINE;
  ACCENT = cssVar('--accent') || ACCENT;
  GOOD = cssVar('--good') || GOOD;
  BAD = cssVar('--bad') || BAD;
  PANEL2 = cssVar('--panel-2') || PANEL2;
}

export interface NodesInput {
  readonly nodes: number;
  readonly regions: number;
  /** 'in-memory-counter' | 'random-uuid' | 'snowflake' */
  readonly scheme: 'in-memory-counter' | 'random-uuid' | 'snowflake';
}

/** Draw nodes grouped by region. Red ring marks a collision risk. */
export function drawNodes(host: HTMLElement, input: NodesInput): () => void {
  syncColors();
  const width = host.clientWidth || 600;
  const height = 300;
  const svg = d3
    .select(host)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const collisionRisk = input.scheme === 'in-memory-counter' && input.nodes > 1;
  const regionCount = Math.max(1, input.regions);
  const shown = Math.min(input.nodes, 15);
  const perRegion = Math.ceil(shown / regionCount);
  const colGap = (width - 60) / regionCount;

  let drawn = 0;
  for (let r = 0; r < regionCount; r++) {
    const cx = 30 + colGap * r + colGap / 2;
    const regionNodes = Math.min(perRegion, shown - drawn);
    if (regionCount > 1) {
      svg.append('rect').attr('x', 30 + colGap * r + 6).attr('y', 20).attr('width', colGap - 12).attr('height', height - 60)
        .attr('rx', 10).attr('fill', 'none').attr('stroke', LINE).attr('stroke-dasharray', '4 4');
      svg.append('text').attr('x', cx).attr('y', height - 24).attr('text-anchor', 'middle').attr('fill', INK_DIM).attr('font-size', 11).text('region ' + (r + 1));
    }
    const cols = Math.ceil(Math.sqrt(regionNodes));
    const cellW = (colGap - 24) / cols;
    const cellH = (height - 90) / Math.ceil(regionNodes / cols);
    for (let n = 0; n < regionNodes; n++) {
      const row = Math.floor(n / cols);
      const col = n % cols;
      const x = 30 + colGap * r + 16 + col * cellW + cellW / 2;
      const y = 36 + row * cellH + cellH / 2;
      svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 9)
        .attr('fill', PANEL2).attr('stroke', collisionRisk ? BAD : (input.scheme === 'snowflake' ? GOOD : ACCENT)).attr('stroke-width', 1.5);
      drawn++;
    }
  }

  svg.append('text').attr('x', width / 2).attr('y', 14).attr('text-anchor', 'middle').attr('fill', INK_DIM).attr('font-size', 11)
    .text(
      (collisionRisk ? 'red rings: nodes issue the same IDs — collisions' : 'each node issues its own IDs — no collisions') +
        (input.nodes > shown ? ` (showing ${shown} of ${input.nodes})` : '')
    );

  return () => d3.select(host).selectAll('*').remove();
}

/** Draw the snowflake 64 bit layout as a proportional bar. */
export function drawSnowflakeLayout(host: HTMLElement): () => void {
  syncColors();
  const width = host.clientWidth || 600;
  const height = 150;
  const svg = d3.select(host).append('svg').attr('width', '100%').attr('height', height).attr('viewBox', `0 0 ${width} ${height}`);

  const parts = [
    { label: 'sign', bits: SNOWFLAKE_LAYOUT.signBit, color: LINE },
    { label: 'timestamp (41 bits)', bits: SNOWFLAKE_LAYOUT.timestampBits, color: GOOD },
    { label: 'node (10 bits)', bits: SNOWFLAKE_LAYOUT.nodeBits, color: ACCENT },
    { label: 'sequence (12 bits)', bits: SNOWFLAKE_LAYOUT.sequenceBits, color: '#ffc24b' }
  ];
  const totalBits = parts.reduce((a, p) => a + p.bits, 0);
  const barW = width - 40;
  const barH = 44;
  const y = 46;
  let x = 20;
  for (const part of parts) {
    const w = (part.bits / totalBits) * barW;
    svg.append('rect').attr('x', x).attr('y', y).attr('width', Math.max(2, w - 2)).attr('height', barH).attr('rx', 4)
      .attr('fill', part.color).attr('opacity', part.label === 'sign' ? 0.5 : 0.85);
    if (w > 50) {
      svg.append('text').attr('x', x + w / 2).attr('y', y + barH / 2 + 4).attr('text-anchor', 'middle')
        .attr('fill', '#06111f').attr('font-size', 11).attr('font-weight', 600).text(part.label);
    }
    x += w;
  }
  svg.append('text').attr('x', 20).attr('y', 28).attr('fill', INK_DIM).attr('font-size', 12).text('64 bit ID: time orders it, node keeps it unique, sequence packs each millisecond');
  svg.append('text').attr('x', 20).attr('y', height - 10).attr('fill', INK_DIM).attr('font-size', 11).text('higher time bits sit on the left, so a plain numeric sort is also a time sort');

  return () => d3.select(host).selectAll('*').remove();
}
