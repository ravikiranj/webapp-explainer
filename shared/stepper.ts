// A step-through diagram. A list of steps sits on the left. The diagram sits
// on the right. The nodes of the selected step are drawn in full colour. All
// other nodes are dimmed. A step can mark a node as bad (red) or good (green).
// Prev and Next buttons move through the steps. The text of the step shows
// below the diagram. The colours come from CSS variables, so the diagram
// follows the theme.

import { cssVar } from './theme.ts';
import { h, icon } from './dom.ts';

export type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'grey' | 'red';

export interface FlowNode {
  readonly id: string;
  readonly label: string;
  readonly sub?: string;
  readonly x: number;
  readonly y: number;
  readonly w?: number;
  readonly h?: number;
  readonly tone?: Tone;
}

export interface FlowEdge {
  readonly from: string;
  readonly to: string;
}

export interface FlowStep {
  readonly title: string;
  readonly text: string;
  /** The ids of the nodes that are active in this step. */
  readonly nodes: string[];
  /** Mark an active node as bad or good for this step. */
  readonly marks?: Record<string, 'bad' | 'good'>;
}

export interface FlowSpec {
  readonly nodes: FlowNode[];
  readonly edges: FlowEdge[];
  readonly steps: FlowStep[];
  readonly height?: number;
}

const SVG = 'http://www.w3.org/2000/svg';
const WIDTH = 760;
let counter = 0;

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function box(n: FlowNode): Box {
  return { x: n.x, y: n.y, w: n.w ?? 130, h: n.h ?? 50 };
}

/** The point on the border of a box, in the direction of a target point. */
function anchor(b: Box, tx: number, ty: number): { x: number; y: number } {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  const sx = dx === 0 ? Infinity : b.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : b.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: cx + dx * s, y: cy + dy * s };
}

/** Draw the diagram for one step into a host element. */
function drawDiagram(host: HTMLElement, spec: FlowSpec, step: FlowStep): void {
  host.innerHTML = '';
  const height = spec.height ?? 280;
  const uid = ++counter;
  const svg = svgEl('svg', { viewBox: `0 0 ${WIDTH} ${height}`, width: '100%', role: 'img' });
  svg.setAttribute('aria-label', step.title);

  const ink = cssVar('--ink');
  const inkDim = cssVar('--ink-dim');
  const line = cssVar('--chart-axis');
  const panel = cssVar('--panel');
  const accent = cssVar('--accent');

  // Arrow heads for dim and active edges.
  const defs = svgEl('defs', {});
  for (const [name, colour] of [['dim', line], ['on', inkDim]] as const) {
    const marker = svgEl('marker', {
      id: `arrow-${name}-${uid}`,
      viewBox: '0 0 10 10',
      refX: 9,
      refY: 5,
      markerWidth: 7,
      markerHeight: 7,
      orient: 'auto-start-reverse'
    });
    marker.append(svgEl('path', { d: 'M0,0 L10,5 L0,10 z', fill: colour }));
    defs.append(marker);
  }
  svg.append(defs);

  const byId = new Map(spec.nodes.map((n) => [n.id, n]));
  const active = new Set(step.nodes);

  for (const edge of spec.edges) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b) {
      continue;
    }
    const ba = box(a);
    const bb = box(b);
    const p1 = anchor(ba, bb.x + bb.w / 2, bb.y + bb.h / 2);
    const p2 = anchor(bb, ba.x + ba.w / 2, ba.y + ba.h / 2);
    const on = active.has(edge.from) && active.has(edge.to);
    svg.append(
      svgEl('line', {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        stroke: on ? inkDim : line,
        'stroke-width': on ? 2 : 1.2,
        'marker-end': `url(#arrow-${on ? 'on' : 'dim'}-${uid})`
      })
    );
  }

  for (const node of spec.nodes) {
    const b = box(node);
    const isActive = active.has(node.id);
    const mark = step.marks?.[node.id];
    const tone: Tone = mark === 'bad' ? 'red' : mark === 'good' ? 'green' : (node.tone ?? 'blue');
    const colour = cssVar(`--tone-${tone}`);
    const group = svgEl('g', { opacity: isActive ? 1 : 0.32 });
    group.append(svgEl('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 9, fill: panel }));
    group.append(
      svgEl('rect', {
        x: b.x,
        y: b.y,
        width: b.w,
        height: b.h,
        rx: 9,
        fill: colour,
        'fill-opacity': 0.13,
        stroke: isActive ? colour : line,
        'stroke-width': isActive ? 2.4 : 1.2
      })
    );
    const label = svgEl('text', {
      x: b.x + b.w / 2,
      y: node.sub ? b.y + b.h / 2 - 3 : b.y + b.h / 2 + 5,
      'text-anchor': 'middle',
      'font-size': 13,
      'font-weight': 600,
      fill: ink
    });
    label.textContent = node.label;
    group.append(label);
    if (node.sub) {
      const sub = svgEl('text', {
        x: b.x + b.w / 2,
        y: b.y + b.h / 2 + 12,
        'text-anchor': 'middle',
        'font-size': 10.5,
        fill: inkDim
      });
      sub.textContent = node.sub;
      group.append(sub);
    }
    svg.append(group);
  }
  // A thin accent underline marks that the diagram is live.
  svg.append(svgEl('rect', { x: 0, y: height - 2, width: 0, height: 2, fill: accent }));
  host.append(svg);
}

/** Mount a step-through diagram into an element. */
export function mountStepper(el: HTMLElement, spec: FlowSpec): void {
  let index = 0;

  const list = h('div', { class: 'list-group flow-steps' });
  const diagram = h('div', { class: 'card flow-diagram' });
  const textCard = h('div', { class: 'card flow-text' });
  const prev = h('button', { class: 'btn btn-sm btn-outline-secondary', type: 'button' }, [
    icon('bi-chevron-left'),
    ' Prev'
  ]) as HTMLButtonElement;
  const next = h('button', { class: 'btn btn-sm btn-primary', type: 'button' }, [
    'Next ',
    icon('bi-chevron-right')
  ]) as HTMLButtonElement;
  const counterLabel = h('span', { class: 'small text-secondary ms-2' });

  const items = spec.steps.map((step, i) => {
    const item = h('button', { class: 'list-group-item list-group-item-action', type: 'button' }, [
      h('strong', {}, [`${i + 1}. `]),
      step.title
    ]);
    item.addEventListener('click', () => select(i));
    list.append(item);
    return item;
  });

  function select(i: number): void {
    index = Math.max(0, Math.min(spec.steps.length - 1, i));
    const step = spec.steps[index];
    items.forEach((item, k) => item.classList.toggle('active', k === index));
    drawDiagram(diagram, spec, step);
    textCard.innerHTML = '';
    textCard.append(
      h('div', { class: 'card-body' }, [
        h('h3', { class: 'h6 mb-2' }, [`${index + 1}. ${step.title}`]),
        h('p', { class: 'mb-0' }, [step.text])
      ])
    );
    prev.disabled = index === 0;
    next.disabled = index === spec.steps.length - 1;
    counterLabel.textContent = `Step ${index + 1} of ${spec.steps.length}`;
  }

  prev.addEventListener('click', () => select(index - 1));
  next.addEventListener('click', () => select(index + 1));

  const right = h('div', { class: 'col-lg-8' }, [
    diagram,
    h('div', { class: 'd-flex align-items-center gap-2 my-2' }, [prev, next, counterLabel]),
    textCard
  ]);
  const left = h('div', { class: 'col-lg-4' }, [list]);
  el.append(h('div', { class: 'row g-3 flow' }, [left, right]));
  select(0);
}
