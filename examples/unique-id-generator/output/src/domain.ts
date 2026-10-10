// Domain model and mock data for the unique ID generator explainer.
//
// Source of the model: this is a teaching model written for this app. The
// snowflake layout follows the public Twitter Snowflake design: a 64 bit ID
// made of a timestamp, a node id, and a per-node sequence. The collision
// estimate uses the standard birthday approximation. All numbers below are
// mock numbers that are chosen to teach the idea. No real service is called.
//
// Birthday collision approximation, for reference of the model shape:
//   expected collisions ~ k^2 / (2 * N)
// where k is the count of IDs drawn and N is the size of the ID space.
//
// The problem (see examples/unique-id-generator/problem.md):
//   - Every ID must be unique.
//   - 100 IDs per second, 1 node, compared in memory.
//   - 10,000 IDs per second, 10 nodes, no node sees every other ID.
//   - 1,000,000 IDs per second, 100 nodes, 5 regions, network delay.
//   - IDs must stay roughly sortable by time of creation.

export const SOURCE_NOTE =
  'Teaching model for this app. Snowflake layout follows the public ' +
  'Twitter Snowflake design. Collision estimate uses the birthday ' +
  'approximation. All numbers are mock numbers.';

/** A seeded random function. The same seed gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Scheme = 'in-memory-counter' | 'random-uuid' | 'snowflake';

export const SCHEME_LABEL: Record<Scheme, string> = {
  'in-memory-counter': 'In-memory counter',
  'random-uuid': 'Random UUID per node',
  snowflake: 'Snowflake: time, node, sequence'
};

/** One growth stage for the generator. */
export interface Stage {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly nodes: number;
  readonly regions: number;
  readonly idsPerSecond: number;
  readonly scheme: Scheme;
  readonly proposed: boolean;
}

export const STAGES: readonly Stage[] = [
  {
    id: 'stage-1',
    order: 1,
    name: 'One node',
    nodes: 1,
    regions: 1,
    idsPerSecond: 100,
    scheme: 'in-memory-counter',
    proposed: false
  },
  {
    id: 'stage-10',
    order: 2,
    name: 'Ten nodes',
    nodes: 10,
    regions: 1,
    idsPerSecond: 10000,
    scheme: 'random-uuid',
    proposed: false
  },
  {
    id: 'stage-100',
    order: 3,
    name: 'Hundred nodes, five regions',
    nodes: 100,
    regions: 5,
    idsPerSecond: 1000000,
    scheme: 'snowflake',
    proposed: true
  }
];

/**
 * The naive outcome: every node runs the same in-memory counter and each
 * starts at the same value. Then every node issues the same first ID. The
 * count of duplicate IDs per second equals the issue rate minus the unique
 * values. With identical counters, only one node's worth is unique.
 */
export interface NaiveOutcome {
  readonly idsPerSecond: number;
  readonly nodes: number;
  /** Count of IDs per second that collide with another node's ID. */
  readonly collisionsPerSecond: number;
  /** Collisions as a share of all issued IDs, in percent. */
  readonly collisionPercent: number;
}

export function naiveCounterOutcome(stage: Stage): NaiveOutcome {
  if (stage.nodes <= 1) {
    return { idsPerSecond: stage.idsPerSecond, nodes: 1, collisionsPerSecond: 0, collisionPercent: 0 };
  }
  // Each node issues the same sequence. Per issued value, (nodes - 1) of every
  // (nodes) copies are duplicates.
  const collisionsPerSecond = Math.round(stage.idsPerSecond * (stage.nodes - 1) / stage.nodes);
  return {
    idsPerSecond: stage.idsPerSecond,
    nodes: stage.nodes,
    collisionsPerSecond,
    collisionPercent: (collisionsPerSecond / stage.idsPerSecond) * 100
  };
}

/**
 * Expected random-UUID collisions per second, by the birthday approximation.
 * A version 4 UUID has 122 random bits. The space is huge, so the expected
 * collisions are far below one, even at a very high rate.
 */
export function uuidCollisionsPerSecond(idsPerSecond: number): number {
  const bits = 122;
  const space = Math.pow(2, bits);
  return (idsPerSecond * idsPerSecond) / (2 * space);
}

/** Snowflake bit layout. The parts sum to 63 usable bits in a 64 bit word. */
export const SNOWFLAKE_LAYOUT = {
  signBit: 1,
  timestampBits: 41,
  nodeBits: 10,
  sequenceBits: 12
} as const;

/** Max IDs one node can issue per millisecond before the sequence overflows. */
export function sequencePerMs(): number {
  return Math.pow(2, SNOWFLAKE_LAYOUT.sequenceBits);
}

/** Max nodes the node field can address. */
export function maxNodes(): number {
  return Math.pow(2, SNOWFLAKE_LAYOUT.nodeBits);
}

/** Max IDs per second across all nodes before any field overflows. */
export function snowflakeCeilingPerSecond(): number {
  return sequencePerMs() * 1000 * maxNodes();
}

/**
 * A measure of time order. 100 means IDs come out in perfect time order.
 * A pure random UUID has no time order. Snowflake keeps order within a node
 * and near order across nodes, limited by clock skew across regions.
 */
export interface OrderProfile {
  readonly scheme: Scheme;
  readonly timeOrderScore: number;
  readonly collisionRisk: string;
  readonly sortableAcrossNodes: boolean;
}

export const ORDER_PROFILES: readonly OrderProfile[] = [
  { scheme: 'in-memory-counter', timeOrderScore: 100, collisionRisk: 'high beyond one node', sortableAcrossNodes: false },
  { scheme: 'random-uuid', timeOrderScore: 5, collisionRisk: 'near zero', sortableAcrossNodes: false },
  { scheme: 'snowflake', timeOrderScore: 92, collisionRisk: 'near zero', sortableAcrossNodes: true }
];

/** Build one example 64 bit snowflake ID from parts, as a decimal string. */
export function buildSnowflake(timestampMs: number, nodeId: number, sequence: number): string {
  const ts = BigInt(timestampMs) << BigInt(SNOWFLAKE_LAYOUT.nodeBits + SNOWFLAKE_LAYOUT.sequenceBits);
  const node = BigInt(nodeId) << BigInt(SNOWFLAKE_LAYOUT.sequenceBits);
  const seq = BigInt(sequence);
  return (ts | node | seq).toString();
}
