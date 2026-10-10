import type { Section } from '../section.ts';
import { STAGES, naiveOutcome } from '../domain.ts';
import { card, h, num, tps, vizPanel } from '../dom.ts';
import { drawOvershoot } from '../viz/charts.ts';

const names = STAGES.map((s) => s.name);
const limits = STAGES.map((s) => s.perKeyLimit);
const admitted = STAGES.map((s) => naiveOutcome(s).effectiveAdmitted);

export const overview: Section = {
  id: 'overview',
  group: 'Start here',
  title: 'Overview',
  icon: 'bi-bullseye',
  badge: 'concept',
  caption:
    'Rate limiting caps the request rate per key. One node is simple. ' +
    'Many nodes make the cap hard to hold. This app shows each step with numbers.',
  render(el) {
    const first = STAGES[0];
    const last = STAGES[STAGES.length - 1];

    el.append(
      h('div', { class: 'cards' }, [
        card('Per-key limit', `${tps(first.perKeyLimit)} → ${tps(last.perKeyLimit)}`, '', 'start to full scale'),
        card('Total load', `${tps(first.totalAvg)} → ${tps(last.totalAvg)}`, '', 'average rate'),
        card('Nodes', `${num(first.nodes)} → ${num(last.nodes)}`, '', `across ${last.regions} regions`),
        card('Steps', num(STAGES.length), '', 'simple to complex')
      ])
    );

    el.append(
      h('div', { class: 'break-fix' }, [
        h('div', { class: 'box breaks' }, [
          h('h3', {}, ['The core problem']),
          h('ul', {}, [
            h('li', {}, ['Each node counts requests on its own.']),
            h('li', {}, ['With many nodes, one key reaches many counters.']),
            h('li', {}, ['The admitted rate grows with the node count.'])
          ])
        ]),
        h('div', { class: 'box fix' }, [
          h('h3', {}, ['The path of fixes']),
          h('ul', {}, [
            h('li', {}, ['One node: count in memory.']),
            h('li', {}, ['Ten nodes: count in a shared store.']),
            h('li', {}, ['Fifty nodes: split the limit into regional quotas.']),
            h('li', {}, ['Full scale: local buckets with background sync.'])
          ])
        ])
      ])
    );

    const { panel, host } = vizPanel('Wanted limit against naive admitted rate (log scale)');
    el.append(panel);

    let dispose: (() => void) | undefined;
    requestAnimationFrame(() => {
      dispose = drawOvershoot(host, names, limits, admitted);
    });
    return () => dispose?.();
  }
};
