import type { Section } from '../section.ts';
import { SOURCE_NOTE, TECHNIQUE_LABEL, TECHNIQUE_PROFILES } from '../domain.ts';
import { h, num, vizPanel } from '../dom.ts';
import { drawTradeoff } from '../viz/charts.ts';

export const techniques: Section = {
  id: 'techniques',
  group: 'Compare',
  title: 'Techniques',
  icon: '⚖️',
  badge: 'trade-offs',
  caption:
    'Each technique trades accuracy against coordination cost and latency. ' +
    'No technique wins at every scale.',
  render(el) {
    const rows = TECHNIQUE_PROFILES.map((p) =>
      h('tr', {}, [
        h('td', {}, [TECHNIQUE_LABEL[p.technique]]),
        h('td', {}, [p.accuracy + '%']),
        h('td', {}, [num(p.coordinationCost)]),
        h('td', {}, [p.addedLatencyMs + ' ms']),
        h('td', {}, ['up to ' + num(p.scaleCeiling) + ' nodes'])
      ])
    );

    const table = h('table', { class: 'cmp-table' }, [
      h('thead', {}, [
        h('tr', {}, [
          h('th', {}, ['Technique']),
          h('th', {}, ['Accuracy']),
          h('th', {}, ['Coordination cost']),
          h('th', {}, ['Added latency']),
          h('th', {}, ['Scale ceiling'])
        ])
      ]),
      h('tbody', {}, rows)
    ]);
    el.append(h('div', { class: 'viz' }, [h('h2', {}, ['Side by side']), table]));

    const { panel, host } = vizPanel('Accuracy against coordination cost (bubble size is latency)');
    el.append(panel);

    el.append(h('div', { class: 'note' }, ['Source: ' + SOURCE_NOTE]));

    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawTradeoff(
        host,
        TECHNIQUE_PROFILES.map((p) => ({
          name: TECHNIQUE_LABEL[p.technique],
          accuracy: p.accuracy,
          cost: p.coordinationCost,
          latency: p.addedLatencyMs
        }))
      );
    });
    return () => dispose?.();
  }
};
