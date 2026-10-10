import type { FlowSpec } from '../../../../shared/stepper.ts';
import {
  WAIT_LIMIT_SECONDS,
  coordinatedWait,
  demandPerApproach,
  uncoordinatedWait,
  type Stage
} from './domain.ts';
import { num } from './dom.ts';

function secs(n: number): string {
  return Math.round(n) + ' s';
}

/** The step-through diagram for one growth stage. */
export function flowFor(stage: Stage): FlowSpec {
  const dpa = demandPerApproach(stage);
  const naive = secs(uncoordinatedWait(stage, dpa));
  const coord = secs(coordinatedWait(stage, dpa));
  const rule = `${WAIT_LIMIT_SECONDS} s`;

  if (stage.id === 'stage-1') {
    return {
      height: 240,
      nodes: [
        { id: 'cars', label: 'Cars', sub: `${num(stage.carsPerHour)} per hour`, x: 30, y: 95, tone: 'grey' },
        { id: 'light', label: 'Traffic light', sub: `fixed ${stage.cycle} s cycle`, x: 290, y: 95, w: 170, tone: 'blue' },
        { id: 'exit', label: 'Cars pass', sub: 'on to the next street', x: 580, y: 95, w: 150, tone: 'green' }
      ],
      edges: [
        { from: 'cars', to: 'light' },
        { from: 'light', to: 'exit' }
      ],
      steps: [
        { title: 'Cars arrive', nodes: ['cars', 'light'], text: `About ${num(stage.carsPerHour)} cars reach the light each hour. That is fewer than 9 cars a minute.` },
        { title: 'Red phase', nodes: ['light'], text: `The light repeats a fixed ${stage.cycle} s cycle. In the red half, cars wait in a short queue.` },
        { title: 'Green phase', nodes: ['light', 'exit'], marks: { exit: 'good' }, text: 'In the green half, the queue clears and the cars pass. The light has spare capacity, so nothing builds up.' },
        { title: 'The result', nodes: ['light'], marks: { light: 'good' }, text: `The mean wait is about ${coord}. The rule is ${rule}. One light with a fixed cycle is enough.` }
      ]
    };
  }

  if (stage.id === 'stage-20') {
    return {
      height: 250,
      nodes: [
        { id: 'cars', label: 'Cars', sub: `${num(stage.carsPerHour)} per hour`, x: 10, y: 100, w: 110, tone: 'grey' },
        { id: 'l1', label: 'Light 1', x: 175, y: 100, w: 100, tone: 'blue' },
        { id: 'l2', label: 'Light 2', x: 325, y: 100, w: 100, tone: 'blue' },
        { id: 'l3', label: 'Light 3', x: 475, y: 100, w: 100, tone: 'blue' },
        { id: 'l20', label: 'Light 20', x: 625, y: 100, w: 110, tone: 'blue' }
      ],
      edges: [
        { from: 'cars', to: 'l1' },
        { from: 'l1', to: 'l2' },
        { from: 'l2', to: 'l3' },
        { from: 'l3', to: 'l20' }
      ],
      steps: [
        { title: 'What breaks: clashing phases', nodes: ['l1', 'l2', 'l3'], marks: { l2: 'bad' }, text: 'Each light runs its own timer. A group of cars leaves Light 1 on green and arrives at Light 2 on red.' },
        { title: 'The waits add up', nodes: ['l1', 'l2', 'l3', 'l20'], marks: { l1: 'bad', l2: 'bad', l3: 'bad', l20: 'bad' }, text: `Over 20 lights, a car can meet a red at many of them. The mean wait climbs to about ${naive}. That is over the ${rule} rule.` },
        { title: 'The fix: a green wave', nodes: ['l1', 'l2', 'l3', 'l20'], marks: { l1: 'good', l2: 'good', l3: 'good', l20: 'good' }, text: 'Offset each light by the travel time from the light before. The group of cars then meets green at each light.' },
        { title: 'The result', nodes: ['cars', 'l1', 'l20'], marks: { l20: 'good' }, text: `The mean wait drops to about ${coord}, under the ${rule} rule. The wave only helps one direction, which is the next problem.` }
      ]
    };
  }

  return {
    height: 270,
    nodes: [
      { id: 'sensors', label: 'Road sensors', sub: 'cars counted by lane', x: 15, y: 105, w: 150, tone: 'grey' },
      { id: 'ctrl', label: 'City controller', sub: 'adaptive timing', x: 270, y: 105, w: 160, tone: 'purple' },
      { id: 'd1', label: 'Downtown', sub: 'about 150 lights', x: 560, y: 25, w: 160, tone: 'blue' },
      { id: 'd2', label: 'Midtown', sub: 'about 200 lights', x: 560, y: 105, w: 160, tone: 'blue' },
      { id: 'd3', label: 'Suburbs', sub: 'about 150 lights', x: 560, y: 185, w: 160, tone: 'blue' }
    ],
    edges: [
      { from: 'sensors', to: 'ctrl' },
      { from: 'ctrl', to: 'd1' },
      { from: 'ctrl', to: 'd2' },
      { from: 'ctrl', to: 'd3' }
    ],
    steps: [
      { title: 'What breaks: the rush flips', nodes: ['d1', 'd2', 'd3'], marks: { d1: 'bad', d3: 'bad' }, text: `The morning rush flows toward downtown. The evening rush flows away. A fixed wave helps one direction only, so the mean wait reaches about ${naive} at peak.` },
      { title: 'Sensors measure demand', nodes: ['sensors', 'ctrl'], text: 'Sensors count cars on each approach. The city controller reads the counts all day.' },
      { title: 'The controller re-times lights', nodes: ['ctrl', 'd1', 'd2', 'd3'], marks: { ctrl: 'good' }, text: 'It turns the green wave toward downtown in the morning and away from it at night. It lengthens green where queues grow.' },
      { title: 'The result', nodes: ['d1', 'd2', 'd3'], marks: { d1: 'good', d2: 'good', d3: 'good' }, text: `The mean wait holds near ${coord} for most cars, under the ${rule} rule. This step is proposed. Test it with real traffic data first.` }
    ]
  };
}
