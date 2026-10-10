import type { Section } from '../section.ts';
import {
  STAGES,
  WAIT_LIMIT_SECONDS,
  coordinatedWait,
  demandPerApproach,
  uncoordinatedWait
} from '../domain.ts';
import { card, h, num, vizPanel } from '../dom.ts';
import { drawWaitCompare } from '../viz/charts.ts';

const names = STAGES.map((s) => s.name);
const naive = STAGES.map((s) => uncoordinatedWait(s, demandPerApproach(s)));
const coord = STAGES.map((s) => coordinatedWait(s, demandPerApproach(s)));

export const overview: Section = {
  id: 'overview',
  group: 'Start here',
  title: 'Overview',
  icon: '🎯',
  badge: 'concept',
  caption:
    'Signal timing sets how long each light stays green. One light is simple. ' +
    'A city of lights needs coordination to hold the wait rule.',
  render(el) {
    const first = STAGES[0];
    const last = STAGES[STAGES.length - 1];
    el.append(
      h('div', { class: 'cards' }, [
        card('Wait rule', WAIT_LIMIT_SECONDS + ' s', '', 'average, per car'),
        card('Intersections', `${num(first.intersections)} → ${num(last.intersections)}`, ''),
        card('Cars per hour', `${num(first.carsPerHour)} → ${num(last.carsPerHour)}`, ''),
        card('Steps', num(STAGES.length), '', 'simple to complex')
      ])
    );

    el.append(
      h('div', { class: 'break-fix' }, [
        h('div', { class: 'box breaks' }, [
          h('h3', {}, ['The core problem']),
          h('ul', {}, [
            h('li', {}, ['Each light times on its own.']),
            h('li', {}, ['Cars arrive in clumps from the light before.']),
            h('li', {}, ['A clump can hit a red at every stop. The wait grows.'])
          ])
        ]),
        h('div', { class: 'box fix' }, [
          h('h3', {}, ['The path of fixes']),
          h('ul', {}, [
            h('li', {}, ['One light: a fixed cycle holds the rule.']),
            h('li', {}, ['A line of lights: a green wave links the phases.']),
            h('li', {}, ['A whole city: adaptive control shifts with the rush.'])
          ])
        ])
      ])
    );

    const { panel, host } = vizPanel('Average wait: each light alone against coordinated');
    el.append(panel);
    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawWaitCompare(host, names, naive, coord, WAIT_LIMIT_SECONDS);
    });
    return () => dispose?.();
  }
};
