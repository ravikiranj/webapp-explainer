import type { Section } from '../section.ts';
import { ORDER_PROFILES, SCHEME_LABEL, SOURCE_NOTE } from '../domain.ts';
import { h, num, vizPanel } from '../dom.ts';
import { drawTimeOrder } from '../viz/charts.ts';
import { seededRandom } from '../domain.ts';

export const techniques: Section = {
  id: 'techniques',
  group: 'Compare',
  title: 'Schemes',
  icon: '⚖️',
  badge: 'trade-offs',
  caption:
    'Each scheme trades uniqueness, time order, and the ability to sort ' +
    'across nodes. Snowflake balances all three.',
  render(el) {
    const rows = ORDER_PROFILES.map((p) =>
      h('tr', {}, [
        h('td', {}, [SCHEME_LABEL[p.scheme]]),
        h('td', {}, [num(p.timeOrderScore)]),
        h('td', {}, [p.collisionRisk]),
        h('td', {}, [p.sortableAcrossNodes ? 'yes' : 'no'])
      ])
    );
    el.append(
      h('div', { class: 'viz' }, [
        h('h2', {}, ['Side by side']),
        h('table', { class: 'cmp-table' }, [
          h('thead', {}, [
            h('tr', {}, [
              h('th', {}, ['Scheme']),
              h('th', {}, ['Time order score']),
              h('th', {}, ['Collision risk']),
              h('th', {}, ['Sortable across nodes'])
            ])
          ]),
          h('tbody', {}, rows)
        ])
      ])
    );

    const { panel, host } = vizPanel('Time order: a rising line means IDs sort by time');
    el.append(panel);
    el.append(h('div', { class: 'note' }, ['Source: ' + SOURCE_NOTE]));

    const rand = seededRandom(99);
    const ordered: [number, number][] = [];
    const random: [number, number][] = [];
    for (let i = 0; i < 50; i++) {
      ordered.push([i, i + rand() * 2]);
      random.push([i, rand() * 50]);
    }
    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawTimeOrder(host, ordered, random);
    });
    return () => dispose?.();
  }
};
