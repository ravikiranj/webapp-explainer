// Domain model and mock data for the rate limiting explainer.
//
// Source of the model: this is a teaching model written for this app. It
// follows standard rate limiting patterns that are described in public
// engineering writing, for example the token bucket algorithm and the
// distributed counter pattern. No real service is called. All numbers below
// are mock numbers that are chosen to teach the idea.
//
// The problem (see examples/rate-limiter/problem.md):
//   - Per-key limit starts at 20 TPS and grows to 100,000 TPS.
//   - Total load starts at 1,000 TPS (burst 5,000) and grows to 1,000,000 TPS.
//   - Deployment grows: 1 node, 10 nodes, 50 nodes across 3 regions, full scale.
//   - The per-key limit must hold true at each step.

export const SOURCE_NOTE =
  'Teaching model for this app. Standard patterns: token bucket and ' +
  'distributed counter. All numbers are mock numbers.';

/** A seeded random function. The same seed gives the same sequence. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // Mulberry32. A small, repeatable pseudo random generator.
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One deployment stage in the growth path. */
export interface Stage {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly nodes: number;
  readonly regions: number;
  /** The limit the business wants to hold per key, in TPS. */
  readonly perKeyLimit: number;
  /** Average total service load across all keys, in TPS. */
  readonly totalAvg: number;
  /** Burst total service load, in TPS. */
  readonly totalBurst: number;
  /** The technique in use at this stage. */
  readonly technique: Technique;
  readonly proposed: boolean;
}

export type Technique =
  | 'in-memory-counter'
  | 'central-counter'
  | 'regional-quota'
  | 'local-bucket-sync';

export const TECHNIQUE_LABEL: Record<Technique, string> = {
  'in-memory-counter': 'In-memory counter',
  'central-counter': 'Central shared counter',
  'regional-quota': 'Regional quota split',
  'local-bucket-sync': 'Local token bucket with sync'
};

export const STAGES: readonly Stage[] = [
  {
    id: 'stage-1-node',
    order: 1,
    name: 'One node',
    nodes: 1,
    regions: 1,
    perKeyLimit: 20,
    totalAvg: 1000,
    totalBurst: 5000,
    technique: 'in-memory-counter',
    proposed: false
  },
  {
    id: 'stage-10-nodes',
    order: 2,
    name: 'Ten nodes',
    nodes: 10,
    regions: 1,
    perKeyLimit: 200,
    totalAvg: 20000,
    totalBurst: 60000,
    technique: 'central-counter',
    proposed: false
  },
  {
    id: 'stage-50-nodes',
    order: 3,
    name: 'Fifty nodes, three regions',
    nodes: 50,
    regions: 3,
    perKeyLimit: 5000,
    totalAvg: 200000,
    totalBurst: 400000,
    technique: 'regional-quota',
    proposed: false
  },
  {
    id: 'stage-full-scale',
    order: 4,
    name: 'Full scale',
    nodes: 300,
    regions: 3,
    perKeyLimit: 100000,
    totalAvg: 1000000,
    totalBurst: 1500000,
    technique: 'local-bucket-sync',
    proposed: true
  }
];

/**
 * The effect of using a naive in-memory counter at a stage.
 *
 * Each node keeps its own counter. Each node admits up to the per-key limit.
 * So the real admitted rate is the limit multiplied by the number of nodes
 * that the key reaches. This is the core failure that the app teaches.
 */
export interface NaiveOutcome {
  readonly perKeyLimit: number;
  readonly nodes: number;
  /** The rate that actually gets through when every node counts alone. */
  readonly effectiveAdmitted: number;
  /** How many times larger than the limit the admitted rate is. */
  readonly overshootFactor: number;
}

export function naiveOutcome(stage: Stage): NaiveOutcome {
  const effectiveAdmitted = stage.perKeyLimit * stage.nodes;
  return {
    perKeyLimit: stage.perKeyLimit,
    nodes: stage.nodes,
    effectiveAdmitted,
    overshootFactor: effectiveAdmitted / stage.perKeyLimit
  };
}

/** A single row of a token bucket simulation. */
export interface BucketTick {
  readonly tick: number;
  readonly arrivals: number;
  readonly admitted: number;
  readonly rejected: number;
  readonly tokensLeft: number;
}

/**
 * Simulate a token bucket for one key over a number of ticks.
 * One tick is one second. The bucket refills at the limit each second.
 * The arrivals use a seeded random function, so the result is repeatable.
 */
export function simulateBucket(
  limitTps: number,
  capacity: number,
  ticks: number,
  seed: number,
  meanArrival: number
): BucketTick[] {
  const rand = seededRandom(seed);
  let tokens = capacity;
  const rows: BucketTick[] = [];
  for (let i = 0; i < ticks; i++) {
    tokens = Math.min(capacity, tokens + limitTps);
    // Arrivals vary around the mean. The spread is +/- 60 percent.
    const arrivals = Math.max(0, Math.round(meanArrival * (0.4 + rand() * 1.2)));
    const admitted = Math.min(arrivals, tokens);
    tokens -= admitted;
    rows.push({
      tick: i,
      arrivals,
      admitted,
      rejected: arrivals - admitted,
      tokensLeft: tokens
    });
  }
  return rows;
}

/** A comparison of accuracy and cost across the four techniques. */
export interface TechniqueProfile {
  readonly technique: Technique;
  /** How close the admitted rate stays to the limit. 100 is perfect. */
  readonly accuracy: number;
  /** Extra read and write cost on a shared store, per request, relative units. */
  readonly coordinationCost: number;
  /** Added latency per request, in milliseconds. */
  readonly addedLatencyMs: number;
  /** The largest node count this technique serves well. */
  readonly scaleCeiling: number;
}

export const TECHNIQUE_PROFILES: readonly TechniqueProfile[] = [
  {
    technique: 'in-memory-counter',
    accuracy: 100,
    coordinationCost: 0,
    addedLatencyMs: 0,
    scaleCeiling: 1
  },
  {
    technique: 'central-counter',
    accuracy: 98,
    coordinationCost: 10,
    addedLatencyMs: 3,
    scaleCeiling: 20
  },
  {
    technique: 'regional-quota',
    accuracy: 92,
    coordinationCost: 3,
    addedLatencyMs: 1,
    scaleCeiling: 150
  },
  {
    technique: 'local-bucket-sync',
    accuracy: 95,
    coordinationCost: 1,
    addedLatencyMs: 0,
    scaleCeiling: 1000
  }
];

/** Split a per-key limit into equal node shares for the quota technique. */
export function quotaShares(perKeyLimit: number, nodes: number): number {
  return perKeyLimit / nodes;
}
