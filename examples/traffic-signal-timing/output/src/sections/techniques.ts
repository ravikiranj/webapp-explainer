import type { Section } from '../section.ts';
import { CONTROL_LABEL, CONTROL_PROFILES, SOURCE_NOTE } from '../domain.ts';
import { h, num, vizPanel } from '../dom.ts';
import { drawControlTradeoff } from '../viz/charts.ts';

export const techniques: Section = {
  id: 'techniques',
  group: 'Compare',
  title: 'Control strategies',
  icon: '⚖️',
  badge: 'trade-offs',
  caption:
    'Each control strategy trades on-time share against operating cost and ' +
    'the ability to follow shifting rush patterns.',
  render(el) {
    const rows = CONTROL_PROFILES.map((p) =>
      h('tr', {}, [
        h('td', {}, [CONTROL_LABEL[p.control]]),
        h('td', {}, [p.onTimeShare + '%']),
        h('td', {}, [num(p.operatingCost)]),
        h('td', {}, [num(p.adaptability)]),
        h('td', {}, ['up to ' + num(p.scaleCeiling)])
      ])
    );
    el.append(
      h('div', { class: 'viz' }, [
        h('h2', {}, ['Side by side']),
        h('table', { class: 'cmp-table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, ['Strategy']),
              h('th', {}, ['On-time share']),
              h('th', {}, ['Operating cost']),
              h('th', {}, ['Adaptability']),
              h('th', {}, ['Scale ceiling'])
            ])
          ]),
          h('tbody', {}, rows)
        ])
      ])
    );

    const { panel, host } = vizPanel('Adaptability against operating cost (bubble size is on-time share)');
    el.append(panel);
    el.append(h('div', { class: 'note' }, ['Source: ' + SOURCE_NOTE]));

    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawControlTradeoff(
        host,
        CONTROL_PROFILES.map((p) => ({
          name: CONTROL_LABEL[p.control],
          adaptability: p.adaptability,
          cost: p.operatingCost,
          onTime: p.onTimeShare
        }))
      );
    });
    return () => dispose?.();
  }
};
