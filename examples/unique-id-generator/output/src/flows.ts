import type { FlowSpec } from '../../../../shared/stepper.ts';
import {
  maxNodes,
  naiveCounterOutcome,
  sequencePerMs,
  snowflakeCeilingPerSecond,
  uuidCollisionsPerSecond,
  type Stage
} from './domain.ts';
import { num } from './dom.ts';

/** The step-through diagram for one growth stage. */
export function flowFor(stage: Stage): FlowSpec {
  const n = naiveCounterOutcome(stage);

  if (stage.id === 'stage-1') {
    return {
      height: 230,
      nodes: [
        { id: 'client', label: 'Request', sub: `${num(stage.idsPerSecond)} per second`, x: 30, y: 90, tone: 'grey' },
        { id: 'node', label: 'Node', sub: 'counter in memory', x: 290, y: 90, w: 170, tone: 'blue' },
        { id: 'id', label: 'ID', sub: '1, 2, 3 ...', x: 590, y: 90, tone: 'green' }
      ],
      edges: [
        { from: 'client', to: 'node' },
        { from: 'node', to: 'id' }
      ],
      steps: [
        { title: 'A request needs an ID', nodes: ['client', 'node'], text: 'One node serves every request, so it sees every ID that it ever gave.' },
        { title: 'Add one to the counter', nodes: ['node'], text: 'The node adds one to its counter and returns the value. A set in memory can check for any repeat at once.' },
        { title: 'Unique and sorted', nodes: ['node', 'id'], marks: { id: 'good' }, text: 'No two IDs match. The counter only rises, so the IDs sort by time without any extra work.' }
      ]
    };
  }

  if (stage.id === 'stage-10') {
    return {
      height: 260,
      nodes: [
        { id: 'client', label: 'Requests', sub: `${num(stage.idsPerSecond)} per second`, x: 15, y: 105, tone: 'grey' },
        { id: 'a', label: 'Node 1', sub: 'counter', x: 300, y: 25, tone: 'blue' },
        { id: 'b', label: 'Node 2', sub: 'counter', x: 300, y: 105, tone: 'blue' },
        { id: 'c', label: 'Node 10', sub: 'counter', x: 300, y: 185, tone: 'blue' },
        { id: 'ids', label: 'IDs', sub: 'one stream of IDs', x: 580, y: 105, tone: 'green' }
      ],
      edges: [
        { from: 'client', to: 'a' },
        { from: 'client', to: 'b' },
        { from: 'client', to: 'c' },
        { from: 'a', to: 'ids' },
        { from: 'b', to: 'ids' },
        { from: 'c', to: 'ids' }
      ],
      steps: [
        { title: 'What breaks: the same counter', nodes: ['a', 'b', 'c'], marks: { a: 'bad', b: 'bad', c: 'bad' }, text: `All ${num(stage.nodes)} nodes start their counter at 1, and no node sees the others. Each node gives out 1, 2, 3 and so on. About ${num(n.collisionsPerSecond)} IDs per second collide.` },
        { title: 'The fix: random IDs', nodes: ['a', 'b', 'c', 'ids'], marks: { a: 'good', b: 'good', c: 'good' }, text: `Each node draws a random UUID with 122 random bits. The expected collisions drop below ${uuidCollisionsPerSecond(stage.idsPerSecond).toExponential(1)} per second.` },
        { title: 'The new problem: no time order', nodes: ['ids'], marks: { ids: 'bad' }, text: 'A random ID has no link to time. A newer ID can sort before an older one. Rule two, sort by time, now fails.' }
      ]
    };
  }

  return {
    height: 270,
    nodes: [
      { id: 'clock', label: 'Clock', sub: '41 bits of time', x: 20, y: 25, w: 140, tone: 'green' },
      { id: 'node', label: 'Node id', sub: '10 bits', x: 20, y: 110, w: 140, tone: 'blue' },
      { id: 'seq', label: 'Sequence', sub: '12 bits per millisecond', x: 20, y: 195, w: 160, tone: 'orange' },
      { id: 'gen', label: 'ID generator', sub: 'Snowflake style', x: 310, y: 110, w: 150, tone: 'purple' },
      { id: 'out', label: '64 bit ID', sub: 'unique and sortable', x: 580, y: 110, w: 150, tone: 'green' }
    ],
    edges: [
      { from: 'clock', to: 'gen' },
      { from: 'node', to: 'gen' },
      { from: 'seq', to: 'gen' },
      { from: 'gen', to: 'out' }
    ],
    steps: [
      { title: 'What breaks: order and regions', nodes: ['gen'], marks: { gen: 'bad' }, text: 'A random UUID is unique but not sortable. A shared counter needs a call between 5 regions for every ID, and that is slow.' },
      { title: 'Time goes first', nodes: ['clock', 'gen'], marks: { clock: 'good' }, text: 'Put the time in the high bits. A plain numeric sort is now also a sort by time.' },
      { title: 'Then the node id', nodes: ['node', 'gen'], marks: { node: 'good' }, text: `Add a node id in the middle bits. Two nodes cannot issue the same ID, because their node ids differ. The field fits ${num(maxNodes())} nodes.` },
      { title: 'Then a sequence', nodes: ['seq', 'gen'], marks: { seq: 'good' }, text: `Add a sequence for IDs in the same millisecond. One node can issue ${num(sequencePerMs())} IDs per millisecond.` },
      { title: 'The result', nodes: ['gen', 'out'], marks: { out: 'good' }, text: `No node calls another node. The IDs stay unique and roughly sorted by time. The ceiling is near ${num(snowflakeCeilingPerSecond())} IDs per second. This step is proposed. Plan for clock skew across regions.` }
    ]
  };
}
