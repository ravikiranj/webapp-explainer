import type { Section } from '../section.ts';
import {
  SCHEME_LABEL,
  STAGES,
  buildSnowflake,
  maxNodes,
  naiveCounterOutcome,
  seededRandom,
  sequencePerMs,
  snowflakeCeilingPerSecond,
  uuidCollisionsPerSecond,
  type Stage
} from '../domain.ts';
import { breakFix, card, h, num, vizPanel } from '../dom.ts';
import { drawTimeOrder } from '../viz/charts.ts';
import { drawSnowflakeLayout } from '../viz/topology.ts';
import { mountStepper } from '../../../../../shared/stepper.ts';
import { flowFor } from '../flows.ts';

const ICONS: Record<string, string> = {
  'stage-1': 'bi-1-circle',
  'stage-10': 'bi-hdd-stack',
  'stage-100': 'bi-globe2'
};

function narrative(stage: Stage): { lead: string; breaks: string[]; fixes: string[] } {
  const n = naiveCounterOutcome(stage);
  switch (stage.id) {
    case 'stage-1':
      return {
        lead: 'Start with one node and 100 IDs per second. One counter in memory is enough. Learn this base case first, then watch what more nodes do to it.',
        breaks: [
          'Nothing breaks yet. One node sees every ID it ever gave.',
          'An in-memory set finds any repeat at once.'
        ],
        fixes: [
          'A single counter adds one for each ID. No two IDs match.',
          'The counter rises with time, so IDs sort by time for free.'
        ]
      };
    case 'stage-10':
      return {
        lead: 'The generator now runs on 10 nodes. Each node still counts alone, and no node sees the IDs that the others issue. That is the trap: every node thinks its next ID is new.',
        breaks: [
          `All ${num(stage.nodes)} nodes start the same counter at the same value.`,
          `Each value repeats on every node. About ${num(n.collisionsPerSecond)} IDs per second collide.`,
          `That is ${n.collisionPercent.toFixed(0)} percent of all IDs.`
        ],
        fixes: [
          'Give each node its own ID space. A random version 4 UUID is one way.',
          `A UUID has 122 random bits. The expected clashes drop below ${uuidCollisionsPerSecond(stage.idsPerSecond).toExponential(1)} per second.`,
          'But a random UUID has no time order. That breaks rule two.'
        ]
      };
    case 'stage-100':
      return {
        lead: 'At 1,000,000 IDs per second across 5 regions, a call between nodes for every ID is too slow, and random IDs lose the time order. The last step builds order and uniqueness into the ID itself.',
        breaks: [
          'A random UUID is unique but not sortable by time.',
          'A plain counter cannot sync across 5 regions with network delay.',
          'Clock skew across regions makes a shared clock unsafe.'
        ],
        fixes: [
          `Build each ID from time, node, and sequence bits (Snowflake).`,
          `Time bits sit high, so IDs sort by time. ${num(maxNodes())} nodes fit the node field.`,
          `Each node packs ${num(sequencePerMs())} IDs per millisecond. The ceiling is near ${num(snowflakeCeilingPerSecond())} IDs/s.`
        ]
      };
    default:
      return { lead: '', breaks: [], fixes: [] };
  }
}

export function stageSection(stage: Stage): Section {
  const n = naiveCounterOutcome(stage);
  const story = narrative(stage);
  const safe = stage.scheme !== 'in-memory-counter' || stage.nodes <= 1;

  return {
    id: stage.id,
    group: 'Growth steps',
    title: stage.name,
    icon: ICONS[stage.id] ?? 'bi-circle',
    badge: SCHEME_LABEL[stage.scheme],
    caption:
      `${num(stage.nodes)} node(s), ${num(stage.regions)} region(s), ${num(stage.idsPerSecond)} IDs per second. ` +
      'Keep every ID unique and roughly time sortable.',
    render(el) {
      el.append(h('div', { class: 'prose lead' }, [h('p', {}, [story.lead])]));

      const flowHost = h('div', { class: 'mb-3' });
      el.append(flowHost);
      mountStepper(flowHost, flowFor(stage));

      el.append(
        h('div', { class: 'cards' }, [
          card('Rate', num(stage.idsPerSecond) + ' /s', ''),
          card('Nodes', num(stage.nodes), '', `${num(stage.regions)} region(s)`),
          card(
            'Naive collisions',
            n.collisionsPerSecond > 0 ? num(n.collisionsPerSecond) + ' /s' : 'none',
            safe ? 'good' : 'bad',
            safe ? 'safe' : `${n.collisionPercent.toFixed(0)}% of IDs`
          ),
          card('Scheme', SCHEME_LABEL[stage.scheme], stage.proposed ? 'warn' : 'good')
        ])
      );

      el.append(breakFix(story.breaks, story.fixes));

      const second =
        stage.scheme === 'snowflake'
          ? vizPanel('Snowflake 64 bit layout', 'chart short')
          : vizPanel('Time order: snowflake against random UUID');
      el.append(second.panel);
      el.append(
        h('p', { class: 'chart-note' }, [
          stage.scheme === 'snowflake'
            ? 'How to read this: the bar is one 64 bit ID. The time bits sit on the left, so a plain numeric sort is also a sort by time.'
            : 'How to read this: each dot is one ID. A rising line of green dots means the IDs sort by time. A cloud of red dots means they do not.'
        ])
      );

      // A small time-order sample for the non-snowflake stages.
      const rand = seededRandom(stage.order * 1361);
      const ordered: [number, number][] = [];
      const random: [number, number][] = [];
      for (let i = 0; i < 40; i++) {
        ordered.push([i, i + rand() * 2]);
        random.push([i, rand() * 40]);
      }

      let d2: (() => void) | undefined;
      requestAnimationFrame(() => {
        if (stage.scheme === 'snowflake') {
          d2 = drawSnowflakeLayout(second.host);
          second.panel.append(
            h('div', { class: 'note' }, ['Example ID now: ' + buildSnowflake(Date.now(), 7, 42)])
          );
        } else {
          d2 = drawTimeOrder(second.host, ordered, random);
        }
      });

      return () => d2?.();
    }
  };
}

export const stageSections: Section[] = STAGES.map(stageSection);
