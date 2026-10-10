import type { Section } from '../section.ts';
import { STAGES, naiveCounterOutcome, uuidCollisionsPerSecond } from '../domain.ts';
import { card, h, num, vizPanel } from '../dom.ts';
import { drawCollisions } from '../viz/charts.ts';

function ips(n: number): string {
  return num(n) + ' IDs/s';
}

const names = STAGES.map((s) => s.name);
const naive = STAGES.map((s) => naiveCounterOutcome(s).collisionsPerSecond);
const fixed = STAGES.map((s) => (s.scheme === 'random-uuid' ? uuidCollisionsPerSecond(s.idsPerSecond) : 0));

export const overview: Section = {
  id: 'overview',
  group: 'Start here',
  title: 'Overview',
  icon: 'bi-bullseye',
  badge: 'concept',
  caption:
    'A unique ID generator must never give two requests the same ID. ' +
    'It must also keep IDs roughly sortable by time. Scale makes both hard.',
  render(el) {
    const first = STAGES[0];
    const last = STAGES[STAGES.length - 1];
    el.append(
      h('div', { class: 'cards' }, [
        card('Rate', `${ips(first.idsPerSecond)} → ${ips(last.idsPerSecond)}`, ''),
        card('Nodes', `${num(first.nodes)} → ${num(last.nodes)}`, '', `across ${last.regions} regions`),
        card('Rule 1', 'No duplicates', '', 'ever'),
        card('Rule 2', 'Time sortable', '', 'at every step')
      ])
    );
    el.append(
      h('div', { class: 'break-fix' }, [
        h('div', { class: 'box breaks' }, [
          h('h3', {}, ['The core problem']),
          h('ul', {}, [
            h('li', {}, ['A shared counter on each node gives the same IDs.']),
            h('li', {}, ['Pure random IDs avoid clashes but lose time order.']),
            h('li', {}, ['Clocks drift across regions, so order is hard.'])
          ])
        ]),
        h('div', { class: 'box fix' }, [
          h('h3', {}, ['The path of fixes']),
          h('ul', {}, [
            h('li', {}, ['One node: an in-memory counter is enough.']),
            h('li', {}, ['Ten nodes: give each node its own ID space.']),
            h('li', {}, ['Many regions: use time, node, and sequence bits.'])
          ])
        ])
      ])
    );

    const { panel, host } = vizPanel('Collisions per second: naive counter against the fix (log)');
    el.append(panel);
    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawCollisions(host, names, naive, fixed);
    });
    return () => dispose?.();
  }
};
