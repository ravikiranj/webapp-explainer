// A d3 diagram of intersections on a road grid. It shows the signal state and
// whether neighbors are coordinated. This is a custom view, so it uses d3.

import * as d3 from 'd3';
import { cssVar } from '../theme.ts';

export interface GridInput {
  readonly intersections: number;
  /** 'fixed-cycle' | 'green-wave' | 'adaptive' */
  readonly control: 'fixed-cycle' | 'green-wave' | 'adaptive';
}

let INK_DIM = '#c2cce0';
let LINE = '#2a3350';
let GREEN = '#37d39b';
let RED = '#ff6b6b';
let ACCENT = '#4f9dff';

function syncColors(): void {
  INK_DIM = cssVar('--ink-dim') || INK_DIM;
  LINE = cssVar('--line') || LINE;
  GREEN = cssVar('--good') || GREEN;
  RED = cssVar('--bad') || RED;
  ACCENT = cssVar('--accent') || ACCENT;
}

/** Draw the intersection layout. Return a dispose function. */
export function drawGrid(host: HTMLElement, input: GridInput): () => void {
  syncColors();
  const width = host.clientWidth || 600;
  const height = 300;
  const svg = d3
    .select(host)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const coordinated = input.control !== 'fixed-cycle';

  if (input.intersections === 1) {
    // One intersection: draw a cross with signal heads.
    const cx = width / 2;
    const cy = height / 2;
    svg.append('line').attr('x1', cx - 120).attr('y1', cy).attr('x2', cx + 120).attr('y2', cy).attr('stroke', LINE).attr('stroke-width', 10);
    svg.append('line').attr('x1', cx).attr('y1', cy - 90).attr('x2', cx).attr('y2', cy + 90).attr('stroke', LINE).attr('stroke-width', 10);
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', 10).attr('fill', GREEN);
    svg.append('text').attr('x', cx).attr('y', cy + 120).attr('text-anchor', 'middle').attr('fill', INK_DIM).attr('font-size', 12).text('one intersection, fixed cycle');
    return () => d3.select(host).selectAll('*').remove();
  }

  // Many intersections: draw a line (and a second row for the city case).
  const rows = input.intersections > 40 ? 3 : 1;
  const perRow = Math.min(12, Math.ceil(Math.min(input.intersections, 12) / rows));
  const marginX = 50;
  const gapX = (width - marginX * 2) / Math.max(1, perRow - 1);
  const rowGap = rows > 1 ? (height - 80) / rows : 0;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const y = rows > 1 ? 50 + rowGap * r + rowGap / 2 : height / 2;
    // Road line
    svg.append('line').attr('x1', marginX - 20).attr('y1', y).attr('x2', width - marginX + 20).attr('y2', y).attr('stroke', LINE).attr('stroke-width', 8);
    for (let c = 0; c < perRow; c++) {
      const x = marginX + gapX * c;
      // Coordination link between neighbors.
      if (c > 0 && coordinated) {
        svg.append('line').attr('x1', x - gapX).attr('y1', y - 16).attr('x2', x).attr('y2', y - 16)
          .attr('stroke', GREEN).attr('stroke-width', 2).attr('stroke-dasharray', '4 3');
      }
      // Signal: in the naive line case, alternate red to show clashing phases.
      const isRed = !coordinated && c % 2 === 1;
      svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 8)
        .attr('fill', isRed ? RED : GREEN).attr('stroke', ACCENT).attr('stroke-width', 1);
      idx++;
    }
  }

  svg.append('text').attr('x', width / 2).attr('y', height - 12).attr('text-anchor', 'middle').attr('fill', INK_DIM).attr('font-size', 11)
    .text(
      (coordinated ? 'green links show coordinated neighbors' : 'red heads show phases that clash') +
        ` — showing ${Math.min(input.intersections, idx)} of ${input.intersections}`
    );

  return () => d3.select(host).selectAll('*').remove();
}
