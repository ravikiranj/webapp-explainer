import type { FlowSpec } from '../../../../shared/stepper.ts';
import { naiveOutcome, quotaShares, type Stage } from './domain.ts';
import { num, tps } from './dom.ts';

/** The step-through diagram for one deployment stage. */
export function flowFor(stage: Stage): FlowSpec {
  const n = naiveOutcome(stage);
  const limit = tps(stage.perKeyLimit);

  switch (stage.id) {
    case 'stage-1-node':
      return {
        height: 260,
        nodes: [
          { id: 'client', label: 'Client', sub: 'key: user-42', x: 20, y: 105, tone: 'grey' },
          { id: 'node', label: 'Node', sub: 'token bucket in memory', x: 260, y: 105, w: 200, tone: 'blue' },
          { id: 'svc', label: 'Service', sub: 'handles the request', x: 590, y: 45, tone: 'green' },
          { id: 'rej', label: 'Reject', sub: 'HTTP 429', x: 590, y: 165, tone: 'red' }
        ],
        edges: [
          { from: 'client', to: 'node' },
          { from: 'node', to: 'svc' },
          { from: 'node', to: 'rej' }
        ],
        steps: [
          {
            title: 'A request arrives',
            nodes: ['client', 'node'],
            text: 'The client sends a request with its key. With one node, this node sees every request for the key.'
          },
          {
            title: 'Check the bucket',
            nodes: ['node'],
            text: `The node keeps a bucket of tokens in memory. The bucket refills at ${limit}. Each request needs one token.`
          },
          {
            title: 'Admit the request',
            nodes: ['node', 'svc'],
            marks: { svc: 'good' },
            text: 'If a token is left, the node takes it and passes the request to the service.'
          },
          {
            title: 'Reject the extra requests',
            nodes: ['node', 'rej'],
            text: `If the bucket is empty, the node rejects the request. The limit of ${limit} holds exactly.`
          }
        ]
      };

    case 'stage-10-nodes':
      return {
        height: 280,
        nodes: [
          { id: 'client', label: 'Client', sub: 'key: user-42', x: 15, y: 115, tone: 'grey' },
          { id: 'lb', label: 'Load balancer', x: 165, y: 115, w: 140, tone: 'grey' },
          { id: 'n1', label: 'Node 1', sub: 'own counter', x: 375, y: 30, tone: 'blue' },
          { id: 'n2', label: 'Node 2', sub: 'own counter', x: 375, y: 115, tone: 'blue' },
          { id: 'n3', label: 'Node 10', sub: 'own counter', x: 375, y: 200, tone: 'blue' },
          { id: 'store', label: 'Shared counter', sub: 'one store, for example Redis', x: 585, y: 115, w: 160, tone: 'purple' }
        ],
        edges: [
          { from: 'client', to: 'lb' },
          { from: 'lb', to: 'n1' },
          { from: 'lb', to: 'n2' },
          { from: 'lb', to: 'n3' },
          { from: 'n1', to: 'store' },
          { from: 'n2', to: 'store' },
          { from: 'n3', to: 'store' }
        ],
        steps: [
          {
            title: 'Requests spread out',
            nodes: ['client', 'lb', 'n1', 'n2', 'n3'],
            text: `The service now runs on ${num(stage.nodes)} nodes. A load balancer sends each request to any node, so no node sees all the requests for the key.`
          },
          {
            title: 'What breaks: private counters',
            nodes: ['n1', 'n2', 'n3'],
            marks: { n1: 'bad', n2: 'bad', n3: 'bad' },
            text: `Each node counts alone, so each node admits up to ${limit}. Together the nodes admit ${tps(n.effectiveAdmitted)}. That is ${num(n.overshootFactor)} times the limit.`
          },
          {
            title: 'The fix: one shared counter',
            nodes: ['n1', 'n2', 'n3', 'store'],
            marks: { store: 'good' },
            text: 'Every node asks the shared counter before it admits a request. All nodes now read and write the same count for the key.'
          },
          {
            title: 'The limit holds',
            nodes: ['store'],
            marks: { store: 'good' },
            text: `The counter admits ${limit} in total, whichever node asks. The cost: each request needs one network call to the store.`
          }
        ]
      };

    case 'stage-50-nodes':
      return {
        height: 280,
        nodes: [
          { id: 'client', label: 'Client', x: 15, y: 115, tone: 'grey' },
          { id: 'router', label: 'Global router', x: 165, y: 115, w: 140, tone: 'grey' },
          { id: 'r1', label: 'Region A', sub: 'about 17 nodes', x: 375, y: 30, tone: 'blue' },
          { id: 'r2', label: 'Region B', sub: 'about 17 nodes', x: 375, y: 115, tone: 'blue' },
          { id: 'r3', label: 'Region C', sub: 'about 16 nodes', x: 375, y: 200, tone: 'blue' },
          { id: 'store', label: 'One store', sub: 'far from two regions', x: 590, y: 115, w: 150, tone: 'purple' }
        ],
        edges: [
          { from: 'client', to: 'router' },
          { from: 'router', to: 'r1' },
          { from: 'router', to: 'r2' },
          { from: 'router', to: 'r3' },
          { from: 'r1', to: 'store' },
          { from: 'r2', to: 'store' },
          { from: 'r3', to: 'store' }
        ],
        steps: [
          {
            title: 'What breaks: one store for all',
            nodes: ['r1', 'r2', 'r3', 'store'],
            marks: { store: 'bad' },
            text: `Every request in every region calls one store. Two regions are far from it, so latency grows. The store must handle near ${tps(stage.totalAvg)} of operations.`
          },
          {
            title: 'The fix: split the limit',
            nodes: ['r1', 'r2', 'r3'],
            marks: { r1: 'good', r2: 'good', r3: 'good' },
            text: `Split the ${limit} limit into equal quotas. With ${num(stage.nodes)} nodes, each node gets ${tps(quotaShares(stage.perKeyLimit, stage.nodes))}.`
          },
          {
            title: 'Decide locally',
            nodes: ['router', 'r2'],
            marks: { r2: 'good' },
            text: 'A node checks its own quota in memory. No network call is needed for each request, so latency stays low.'
          },
          {
            title: 'The trade-off',
            nodes: ['r1', 'r2', 'r3'],
            marks: { r1: 'bad' },
            text: 'Load is not always even. A busy node can reject requests while a quiet node leaves its quota unused. The next step fixes this.'
          }
        ]
      };

    default:
      return {
        height: 280,
        nodes: [
          { id: 'client', label: 'Client', x: 15, y: 115, tone: 'grey' },
          { id: 'router', label: 'Global router', x: 165, y: 115, w: 140, tone: 'grey' },
          { id: 'a', label: 'Node A', sub: 'busy', x: 375, y: 30, tone: 'blue' },
          { id: 'b', label: 'Node B', sub: 'normal', x: 375, y: 115, tone: 'blue' },
          { id: 'c', label: 'Node C', sub: 'quiet', x: 375, y: 200, tone: 'blue' },
          { id: 'sync', label: 'Sync service', sub: 'background, every second', x: 585, y: 115, w: 160, tone: 'purple' }
        ],
        edges: [
          { from: 'client', to: 'router' },
          { from: 'router', to: 'a' },
          { from: 'router', to: 'b' },
          { from: 'router', to: 'c' },
          { from: 'a', to: 'sync' },
          { from: 'b', to: 'sync' },
          { from: 'c', to: 'sync' }
        ],
        steps: [
          {
            title: 'What breaks: fixed quotas waste budget',
            nodes: ['a', 'c'],
            marks: { a: 'bad', c: 'bad' },
            text: `Node A is busy and rejects requests. Node C is quiet and wastes its quota. Across ${num(stage.nodes)} nodes, this loses a lot of the ${limit} budget.`
          },
          {
            title: 'A local bucket decides fast',
            nodes: ['router', 'a'],
            text: 'Each node runs a local token bucket. Decisions stay in memory, so each request is fast.'
          },
          {
            title: 'Sync in the background',
            nodes: ['a', 'b', 'c', 'sync'],
            text: 'Every short interval, each node reports the tokens it used. This work is off the request path, so it adds no latency.'
          },
          {
            title: 'Lend spare tokens',
            nodes: ['a', 'c', 'sync'],
            marks: { a: 'good', c: 'good', sync: 'good' },
            text: `Quiet nodes lend spare tokens to busy nodes. The global limit of ${limit} still holds. This step is proposed. Test it under load first.`
          }
        ]
      };
  }
}
