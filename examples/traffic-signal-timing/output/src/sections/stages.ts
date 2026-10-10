import type { Section } from '../section.ts';
import {
  CONTROL_LABEL,
  STAGES,
  WAIT_LIMIT_SECONDS,
  coordinatedWait,
  demandPerApproach,
  saturation,
  uncoordinatedWait,
  type Stage
} from '../domain.ts';
import { breakFix, card, h, num, vizPanel } from '../dom.ts';
import { drawWaveProfile } from '../viz/charts.ts';
import { drawGrid } from '../viz/topology.ts';

const ICONS: Record<string, string> = {
  'stage-1': '①',
  'stage-20': '⑳',
  'stage-500': '🏙️'
};

function s(n: number): string {
  return Math.round(n) + ' s';
}

function narrative(stage: Stage): { breaks: string[]; fixes: string[] } {
  const dpa = demandPerApproach(stage);
  const x = saturation(dpa, stage.approachCapacity);
  const naive = uncoordinatedWait(stage, dpa);
  const coord = coordinatedWait(stage, dpa);
  switch (stage.id) {
    case 'stage-1':
      return {
        breaks: [
          'Nothing breaks yet. One light serves a light demand.',
          `Demand per approach is near ${num(Math.round(dpa))} cars per hour. Saturation is ${(x * 100).toFixed(0)} percent.`
        ],
        fixes: [
          `A fixed cycle of ${stage.cycle} s holds the mean wait near ${s(coord)}.`,
          `That is well under the ${WAIT_LIMIT_SECONDS} s rule.`
        ]
      };
    case 'stage-20':
      return {
        breaks: [
          'Each of 20 lights keeps its own cycle. Phases clash.',
          `A clump of cars hits a red at many stops. The mean wait climbs to about ${s(naive)}.`,
          `That is over the ${WAIT_LIMIT_SECONDS} s rule.`
        ],
        fixes: [
          'Offset each light so a clump meets green at the next stop.',
          'This is a green wave. It links the phases along the road.',
          `The mean wait drops to about ${s(coord)}, under the rule.`
        ]
      };
    case 'stage-500':
      return {
        breaks: [
          'A fixed green wave points one way. The morning rush points downtown.',
          'The evening rush points away. A fixed plan fails for half the day.',
          `Peak demand pushes the uncoordinated mean wait near ${s(naive)}.`
        ],
        fixes: [
          'Adaptive control reads sensors and re-times lights through the day.',
          'It turns the wave toward downtown in the morning and away at night.',
          `The mean wait holds near ${s(coord)} for most cars, under the rule.`
        ]
      };
    default:
      return { breaks: [], fixes: [] };
  }
}

export function stageSection(stage: Stage): Section {
  const dpa = demandPerApproach(stage);
  const naive = uncoordinatedWait(stage, dpa);
  const coord = coordinatedWait(stage, dpa);
  const story = narrative(stage);
  const naiveOk = naive <= WAIT_LIMIT_SECONDS;

  return {
    id: stage.id,
    group: 'Growth steps',
    title: stage.name,
    icon: ICONS[stage.id] ?? '•',
    badge: CONTROL_LABEL[stage.control],
    caption:
      `${num(stage.intersections)} intersection(s), ${num(stage.carsPerHour)} cars per hour. ` +
      `Hold the mean wait at or under ${WAIT_LIMIT_SECONDS} s.`,
    render(el) {
      el.append(
        h('div', { class: 'cards' }, [
          card('Wait rule', WAIT_LIMIT_SECONDS + ' s', ''),
          card('Each light alone', s(naive), naiveOk ? 'good' : 'bad', naiveOk ? 'rule holds' : 'over the rule'),
          card('Coordinated', s(coord), 'good', 'under the rule'),
          card('Control', CONTROL_LABEL[stage.control], stage.proposed ? 'warn' : 'good')
        ])
      );

      el.append(breakFix(story.breaks, story.fixes));

      const grid = vizPanel('Road layout and signal state', 'chart short');
      const wave = vizPanel('Mean wait as a car crosses successive stops');
      el.append(h('div', { class: 'two-col' }, [grid.panel, wave.panel]));

      // Build the per-stop mean-wait profile. Naive grows with each stop,
      // coordinated stays flat.
      const stopCount = Math.min(stage.intersections, 12);
      const stops: number[] = [];
      const naiveSeries: number[] = [];
      const coordSeries: number[] = [];
      const base = coord;
      const redPhase = stage.cycle * (1 - stage.greenShare);
      for (let i = 1; i <= Math.max(1, stopCount); i++) {
        stops.push(i);
        naiveSeries.push(base + (i - 1) * redPhase * 0.18);
        coordSeries.push(base);
      }

      let disposeGrid: (() => void) | undefined;
      let disposeWave: (() => void) | undefined;
      requestAnimationFrame(() => {
        disposeGrid = drawGrid(grid.host, { intersections: stage.intersections, control: stage.control });
        disposeWave = drawWaveProfile(wave.host, stops, naiveSeries, coordSeries, WAIT_LIMIT_SECONDS);
      });
      return () => {
        disposeGrid?.();
        disposeWave?.();
      };
    }
  };
}

export const stageSections: Section[] = STAGES.map(stageSection);
