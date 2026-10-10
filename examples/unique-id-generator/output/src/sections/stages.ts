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
import { drawNodes, drawSnowflakeLayout } from '../viz/topology.ts';

const ICONS: Record<string, string> = {
  'stage-1': '①',
  'stage-10': '⑩',
  'stage-100': '🌐'
};

function narrative(stage: Stage): { breaks: string[]; fixes: string[] } {
  const n = naiveCounterOutcome(stage);
  switch (stage.id) {
    case 'stage-1':
      return {
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
      return { breaks: [], fixes: [] };
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
    icon: ICONS[stage.id] ?? '•',
    badge: SCHEME_LABEL[stage.scheme],
    caption:
      `${num(stage.nodes)} node(s), ${num(stage.regions)} region(s), ${num(stage.idsPerSecond)} IDs per second. ` +
      'Keep every ID unique and roughly time sortable.',
    render(el) {
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

      const nodes = vizPanel('Nodes and regions', 'chart short');
      const second = stage.scheme === 'snowflake'
        ? vizPanel('Snowflake 64 bit layout', 'chart short')
        : vizPanel('Time order: snowflake against random UUID');
      el.append(h('div', { class: 'two-col' }, [nodes.panel, second.panel]));

      // Build a small time-order sample for the non-snowflake stages.
      const rand = seededRandom(stage.order * 1361);
      const ordered: [number, number][] = [];
      const random: [number, number][] = [];
      for (let i = 0; i < 40; i++) {
        ordered.push([i, i + rand() * 2]);
        random.push([i, rand() * 40]);
      }

      let d1: (() => void) | undefined;
      let d2: (() => void) | undefined;
      requestAnimationFrame(() => {
        d1 = drawNodes(nodes.host, { nodes: stage.nodes, regions: stage.regions, scheme: stage.scheme });
        if (stage.scheme === 'snowflake') {
          d2 = drawSnowflakeLayout(second.host);
          const sample = h('div', { class: 'note' }, [
            'Example ID now: ' + buildSnowflake(Date.now(), 7, 42)
          ]);
          second.panel.append(sample);
        } else {
          d2 = drawTimeOrder(second.host, ordered, random);
        }
      });

      return () => {
        d1?.();
        d2?.();
      };
    }
  };
}

export const stageSections: Section[] = STAGES.map(stageSection);
