// A d3 diagram of the insulin mechanism. It shows blood glucose, insulin, and
// a muscle or fat cell with a gate. In the normal case the gate opens and
// glucose moves into the cell. In the resistant case the gate stays mostly
// shut, so glucose stays in the blood and the pancreas makes more insulin.

import * as d3 from 'd3';
import { cssVar } from '../theme.ts';

let INK_DIM = '#c2cce0';
let GLUCOSE = '#ffc24b';
let INSULIN = '#4f9dff';
let CELL = '#37d39b';
let BAD = '#ff6b6b';

function syncColors(): void {
  INK_DIM = cssVar('--ink-dim') || INK_DIM;
  GLUCOSE = cssVar('--warn') || GLUCOSE;
  INSULIN = cssVar('--accent') || INSULIN;
  CELL = cssVar('--good') || CELL;
  BAD = cssVar('--bad') || BAD;
}

export interface MechanismInput {
  /** 'normal' | 'resistant' */
  readonly state: 'normal' | 'resistant';
}

/** Draw the mechanism. Return a dispose function. */
export function drawMechanism(host: HTMLElement, input: MechanismInput): () => void {
  syncColors();
  const width = host.clientWidth || 600;
  const height = 320;
  const svg = d3
    .select(host)
    .append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`);

  const resistant = input.state === 'resistant';

  // Blood vessel band across the top.
  svg.append('rect').attr('x', 0).attr('y', 30).attr('width', width).attr('height', 90).attr('fill', 'rgba(255,107,107,0.06)');
  svg.append('text').attr('x', 14).attr('y', 24).attr('fill', INK_DIM).attr('font-size', 12).text('blood');

  // Glucose dots in blood. More stay in blood when resistant.
  const glucoseInBlood = resistant ? 14 : 6;
  for (let i = 0; i < glucoseInBlood; i++) {
    const x = 40 + (i % 7) * ((width - 80) / 7);
    const y = 50 + Math.floor(i / 7) * 34;
    svg.append('circle').attr('cx', x).attr('cy', y).attr('r', 7).attr('fill', GLUCOSE);
  }

  // Pancreas marker and insulin supply. More insulin when resistant.
  svg.append('text').attr('x', 14).attr('y', 150).attr('fill', INK_DIM).attr('font-size', 12).text('pancreas makes insulin');
  const insulinCount = resistant ? 9 : 4;
  for (let i = 0; i < insulinCount; i++) {
    const x = 40 + i * 26;
    svg.append('rect').attr('x', x).attr('y', 158).attr('width', 14).attr('height', 14).attr('rx', 3).attr('fill', INSULIN);
  }

  // The cell at the bottom with a gate.
  const cellY = 210;
  const cellH = 90;
  svg.append('rect').attr('x', 40).attr('y', cellY).attr('width', width - 80).attr('height', cellH).attr('rx', 12)
    .attr('fill', 'rgba(55,211,155,0.08)').attr('stroke', resistant ? BAD : CELL).attr('stroke-width', 2);
  svg.append('text').attr('x', 54).attr('y', cellY + 24).attr('fill', INK_DIM).attr('font-size', 12).text('muscle or fat cell');

  // Gate in the top edge of the cell.
  const gateX = width / 2;
  const gateOpen = !resistant;
  svg.append('rect').attr('x', gateX - 26).attr('y', cellY - 6).attr('width', 52).attr('height', 12).attr('rx', 3)
    .attr('fill', gateOpen ? CELL : BAD);
  svg.append('text').attr('x', gateX).attr('y', cellY - 12).attr('text-anchor', 'middle').attr('fill', INK_DIM).attr('font-size', 11)
    .text(gateOpen ? 'gate open' : 'gate mostly shut');

  // Glucose that made it into the cell.
  const glucoseInCell = resistant ? 2 : 8;
  for (let i = 0; i < glucoseInCell; i++) {
    const x = 70 + (i % 8) * ((width - 150) / 8);
    svg.append('circle').attr('cx', x).attr('cy', cellY + 56).attr('r', 7).attr('fill', GLUCOSE).attr('opacity', 0.9);
  }

  // Arrow from blood to cell.
  svg.append('text').attr('x', gateX + 40).attr('y', cellY + 40).attr('fill', INK_DIM).attr('font-size', 11)
    .text(resistant ? 'little glucose enters' : 'glucose enters');

  return () => d3.select(host).selectAll('*').remove();
}
