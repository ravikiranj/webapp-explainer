// A d3 topology diagram. It shows one key, the shared store (if any), and the
// nodes grouped by region. It draws how the per-key traffic spreads across
// nodes. This is a custom view, so it uses d3 and not ECharts.

import * as d3 from 'd3';
import { cssVar } from '../theme.ts';

export interface TopologyInput {
  readonly nodes: number;
  readonly regions: number;
  /** 'none' | 'central' | 'regional' | 'local' */
  readonly store: 'none' | 'central' | 'regional' | 'local';
}

/** Draw the topology. Return a dispose function that clears the host. */
export function drawTopology(host: HTMLElement, input: TopologyInput): () => void {
  const INK_DIM = cssVar('--ink-dim') || '#c2cce0';
  const LINE = cssVar('--line') || '#2a3350';
  const ACCENT = cssVar('--accent') || '#4f9dff';
  const GOOD = cssVar('--good') || '#37d39b';
  const BAD = cssVar('--bad') || '#ff6b6b';
  const PANEL2 = cssVar('--panel-2') || '#1e2740';
  const width = host.clientWidth || 600;
  const height = 340;
  const svg = d3
    .select(host)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  // The key sits on the left.
  const keyX = 70;
  const keyY = height / 2;
  svg
    .append('circle')
    .attr('cx', keyX)
    .attr('cy', keyY)
    .attr('r', 22)
    .attr('fill', ACCENT);
  svg
    .append('text')
    .attr('x', keyX)
    .attr('y', keyY + 4)
    .attr('text-anchor', 'middle')
    .attr('fill', '#06111f')
    .attr('font-size', 11)
    .attr('font-weight', 700)
    .text('key');

  // The store, if any, sits in the middle.
  const storeX = width / 2;
  const storeY = 40;
  const showCentral = input.store === 'central';
  if (showCentral) {
    svg
      .append('rect')
      .attr('x', storeX - 60)
      .attr('y', storeY - 20)
      .attr('width', 120)
      .attr('height', 36)
      .attr('rx', 8)
      .attr('fill', 'none')
      .attr('stroke', GOOD);
    svg
      .append('text')
      .attr('x', storeX)
      .attr('y', storeY + 3)
      .attr('text-anchor', 'middle')
      .attr('fill', GOOD)
      .attr('font-size', 12)
      .text('shared counter');
  }

  // Lay out the nodes in region columns on the right.
  const regionCount = Math.max(1, input.regions);
  const shownNodes = Math.min(input.nodes, 12);
  const perRegion = Math.ceil(shownNodes / regionCount);
  const rightStart = width * 0.45;
  const colGap = (width - rightStart - 40) / regionCount;

  let drawn = 0;
  for (let r = 0; r < regionCount; r++) {
    const cx = rightStart + colGap * r + colGap / 2;
    const regionNodes = Math.min(perRegion, shownNodes - drawn);
    const vGap = (height - 90) / Math.max(1, regionNodes);
    if (regionCount > 1) {
      svg
        .append('text')
        .attr('x', cx)
        .attr('y', height - 18)
        .attr('text-anchor', 'middle')
        .attr('fill', INK_DIM)
        .attr('font-size', 11)
        .text('region ' + (r + 1));
    }
    for (let n = 0; n < regionNodes; n++) {
      const ny = 70 + vGap * n + vGap / 2;
      // Edge from the key (or via the store) to the node.
      if (showCentral) {
        svg
          .append('path')
          .attr('d', `M${keyX + 22},${keyY} Q${storeX},${storeY} ${cx - 14},${ny}`)
          .attr('fill', 'none')
          .attr('stroke', LINE)
          .attr('stroke-width', 1);
      } else {
        svg
          .append('line')
          .attr('x1', keyX + 22)
          .attr('y1', keyY)
          .attr('x2', cx - 14)
          .attr('y2', ny)
          .attr('stroke', LINE)
          .attr('stroke-width', 1);
      }
      svg
        .append('circle')
        .attr('cx', cx)
        .attr('cy', ny)
        .attr('r', 13)
        .attr('fill', PANEL2)
        .attr('stroke', input.store === 'none' && input.nodes > 1 ? BAD : ACCENT);
      drawn++;
    }
  }

  if (input.nodes > shownNodes) {
    svg
      .append('text')
      .attr('x', width - 20)
      .attr('y', 24)
      .attr('text-anchor', 'end')
      .attr('fill', INK_DIM)
      .attr('font-size', 11)
      .text(`showing ${shownNodes} of ${input.nodes} nodes`);
  }

  return () => {
    d3.select(host).selectAll('*').remove();
  };
}
