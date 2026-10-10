import type { Section } from '../section.ts';
import {
  STAGES,
  TECHNIQUE_LABEL,
  naiveOutcome,
  quotaShares,
  simulateBucket,
  type Stage
} from '../domain.ts';
import { breakFix, card, h, num, tps, vizPanel } from '../dom.ts';
import { drawBucket } from '../viz/charts.ts';
import { mountStepper } from '../../../../../shared/stepper.ts';
import { flowFor } from '../flows.ts';

const ICONS: Record<string, string> = {
  'stage-1-node': 'bi-1-circle',
  'stage-10-nodes': 'bi-hdd-stack',
  'stage-50-nodes': 'bi-diagram-3',
  'stage-full-scale': 'bi-globe2'
};

/** Text for what breaks and how the fix works, keyed by stage id. */
function narrative(stage: Stage): { lead: string; breaks: string[]; fixes: string[] } {
  const n = naiveOutcome(stage);
  switch (stage.id) {
    case 'stage-1-node':
      return {
        lead:
          'Start simple. One server handles the key, so it sees every request and can count them in its own memory. ' +
          'This is the base case: get it right here, then watch what the next step breaks.',
        breaks: [
          'Nothing breaks yet. One node sees every request for the key.',
          `A burst of ${tps(stage.totalBurst)} can still overload one host.`
        ],
        fixes: [
          `An in-memory token bucket holds the ${tps(stage.perKeyLimit)} limit exactly.`,
          'The bucket smooths bursts. It admits the limit and rejects the rest.'
        ]
      };
    case 'stage-10-nodes':
      return {
        lead:
          'Traffic grew, so the service runs on ten servers behind a load balancer. Each server still counts in its own ' +
          'memory, and that is the trap: no server sees the whole picture, so each one thinks it is within the limit.',
        breaks: [
          `Each of ${num(stage.nodes)} nodes keeps its own counter.`,
          `Each node admits ${tps(stage.perKeyLimit)}. The real admitted rate is ${tps(n.effectiveAdmitted)}.`,
          `That is ${num(n.overshootFactor)} times the wanted limit.`
        ],
        fixes: [
          'Move the counter to one shared store, for example Redis.',
          'Every node reads and writes the same count for the key.',
          `The admitted rate drops back to ${tps(stage.perKeyLimit)}.`
        ]
      };
    case 'stage-50-nodes':
      return {
        lead:
          'The fleet is now fifty servers across three regions. The shared counter fixed the count, but every request ' +
          'must now ask one store that may sit in another region. That store turns into a bottleneck and a latency cost.',
        breaks: [
          `${num(stage.nodes)} nodes across ${num(stage.regions)} regions hit one shared store.`,
          'Cross-region reads add latency. The store becomes a hot spot.',
          `A central count would need near ${tps(stage.totalAvg)} of store operations.`
        ],
        fixes: [
          `Split the ${tps(stage.perKeyLimit)} limit into equal node quotas.`,
          `Each node gets ${tps(quotaShares(stage.perKeyLimit, stage.nodes))}.`,
          'Each node checks its own quota. No read is needed per request.'
        ]
      };
    case 'stage-full-scale':
      return {
        lead:
          'At full scale the limit is huge and the load is uneven. A fixed quota per node is safe but wasteful: a busy ' +
          'node rejects traffic while quiet nodes leave budget unused. The last step shares budget without a central read.',
        breaks: [
          `A fixed quota wastes room when load is not even across ${num(stage.nodes)} nodes.`,
          'Some nodes reject while others sit idle under their quota.',
          `At ${tps(stage.perKeyLimit)} per key, small errors cost a lot of traffic.`
        ],
        fixes: [
          'Each node runs a local token bucket for fast decisions.',
          'A background job syncs used tokens every short interval.',
          'Nodes lend spare tokens to busy nodes. The global limit still holds.'
        ]
      };
    default:
      return { lead: '', breaks: [], fixes: [] };
  }
}

/** Build one Section for one deployment stage. */
export function stageSection(stage: Stage): Section {
  const n = naiveOutcome(stage);
  const story = narrative(stage);
  const limitOk = stage.id === 'stage-1-node';

  return {
    id: stage.id,
    group: 'Deployment steps',
    title: stage.name,
    icon: ICONS[stage.id] ?? 'bi-circle',
    badge: TECHNIQUE_LABEL[stage.technique],
    caption:
      `${num(stage.nodes)} node(s), ${num(stage.regions)} region(s). ` +
      `Hold a per-key limit of ${tps(stage.perKeyLimit)}.`,
    render(el) {
      el.append(h('div', { class: 'prose lead' }, [h('p', {}, [story.lead])]));

      const flowHost = h('div', { class: 'mb-3' });
      el.append(flowHost);
      mountStepper(flowHost, flowFor(stage));

      el.append(
        h('div', { class: 'cards' }, [
          card('Per-key limit', tps(stage.perKeyLimit), ''),
          card('Nodes', num(stage.nodes), '', `${num(stage.regions)} region(s)`),
          card(
            'Naive admitted',
            tps(n.effectiveAdmitted),
            limitOk ? 'good' : 'bad',
            limitOk ? 'limit holds' : `${num(n.overshootFactor)}x over limit`
          ),
          card('Technique', TECHNIQUE_LABEL[stage.technique], stage.proposed ? 'warn' : 'good')
        ])
      );

      el.append(breakFix(story.breaks, story.fixes));

      const bucket = vizPanel('Token bucket for one key over 24 seconds');
      el.append(bucket.panel);
      el.append(
        h('p', { class: 'chart-note' }, [
          'How to read this chart: the green area is admitted traffic, the red bars are rejected traffic, ' +
            'and the dotted line is the limit. Admitted traffic should stay at or under the limit.'
        ])
      );

      // Simulate a bucket at the per-key limit. The mean arrival sits a little
      // above the limit, so the chart shows real rejections.
      const sim = simulateBucket(
        stage.perKeyLimit,
        stage.perKeyLimit,
        24,
        stage.order * 7919,
        stage.perKeyLimit * 1.3
      );

      let disposeBucket: (() => void) | undefined;
      requestAnimationFrame(() => {
        disposeBucket = drawBucket(
          bucket.host,
          sim.map((r) => r.tick),
          sim.map((r) => r.arrivals),
          sim.map((r) => r.admitted),
          sim.map((r) => r.rejected),
          stage.perKeyLimit
        );
      });

      return () => disposeBucket?.();
    }
  };
}

export const stageSections: Section[] = STAGES.map(stageSection);
