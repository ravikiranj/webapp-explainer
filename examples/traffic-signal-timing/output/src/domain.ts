// Domain model and mock data for the traffic signal timing explainer.
//
// Source of the model: this is a teaching model written for this app. The
// average wait estimate follows the shape of Webster's delay formula for a
// signalized approach, in a simple form. The numbers are mock numbers that
// are chosen to teach the idea. No real traffic feed is called.
//
// Webster's delay formula (standard form), for reference of the model shape:
//   d = (C * (1 - g/C)^2) / (2 * (1 - (g/C) * x))
// where C is the cycle length, g is the green time, and x is the degree of
// saturation (demand divided by capacity). This app uses that shape.
//
// The problem (see examples/traffic-signal-timing/problem.md):
//   - Average wait at a red light must stay at or under 90 seconds.
//   - 1 intersection, 500 cars/hour, fixed cycle.
//   - 20 intersections in a line, 10,000 cars/hour, each timed on its own.
//   - 500 intersections city-wide, 200,000 cars/hour, shifting rush patterns.

export const SOURCE_NOTE =
  'Teaching model for this app. Average wait follows the shape of ' +
  "Webster's delay formula. All numbers are mock numbers.";

export const WAIT_LIMIT_SECONDS = 90;

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

export type Control = 'fixed-cycle' | 'green-wave' | 'adaptive';

export const CONTROL_LABEL: Record<Control, string> = {
  'fixed-cycle': 'Fixed repeating cycle',
  'green-wave': 'Green wave coordination',
  adaptive: 'Adaptive city-wide control'
};

/** One growth stage for the city. */
export interface Stage {
  readonly id: string;
  readonly order: number;
  readonly name: string;
  readonly intersections: number;
  readonly carsPerHour: number;
  /** Cycle length in seconds. */
  readonly cycle: number;
  /** Green share for the main movement, from 0 to 1. */
  readonly greenShare: number;
  /** Capacity of one approach, in cars per hour. */
  readonly approachCapacity: number;
  readonly control: Control;
  readonly proposed: boolean;
}

export const STAGES: readonly Stage[] = [
  {
    id: 'stage-1',
    order: 1,
    name: 'One intersection',
    intersections: 1,
    carsPerHour: 500,
    cycle: 60,
    greenShare: 0.5,
    approachCapacity: 1800,
    control: 'fixed-cycle',
    proposed: false
  },
  {
    id: 'stage-20',
    order: 2,
    name: 'Twenty in a line',
    intersections: 20,
    carsPerHour: 10000,
    cycle: 90,
    greenShare: 0.5,
    approachCapacity: 1800,
    control: 'green-wave',
    proposed: false
  },
  {
    id: 'stage-500',
    order: 3,
    name: 'Five hundred city-wide',
    intersections: 500,
    carsPerHour: 200000,
    cycle: 120,
    greenShare: 0.5,
    approachCapacity: 1800,
    control: 'adaptive',
    proposed: true
  }
];

/**
 * Degree of saturation for one approach. Demand per approach divided by
 * capacity. The city feeds roughly this share of total cars onto the main
 * movement at a typical intersection.
 */
export function saturation(demandPerApproach: number, capacity: number): number {
  return demandPerApproach / capacity;
}

/**
 * Average wait in seconds for one approach, in the shape of Webster's delay.
 * The value climbs sharply as saturation nears one.
 */
export function averageWait(cycle: number, greenShare: number, x: number): number {
  const clamped = Math.min(0.98, Math.max(0, x));
  const numerator = cycle * Math.pow(1 - greenShare, 2);
  const denominator = 2 * (1 - greenShare * clamped);
  return numerator / denominator;
}

/**
 * The naive wait when each intersection times on its own and cars arrive in
 * clumps from the intersection upstream. Without coordination, a car can hit
 * a red at each stop. This model adds a penalty that grows with the count of
 * uncoordinated intersections a car crosses.
 */
export function uncoordinatedWait(stage: Stage, demandPerApproach: number): number {
  const x = saturation(demandPerApproach, stage.approachCapacity);
  const base = averageWait(stage.cycle, stage.greenShare, x);
  // Each extra uncoordinated stop adds part of a red phase to the mean.
  const stops = Math.min(stage.intersections, 12);
  const redPhase = stage.cycle * (1 - stage.greenShare);
  const penalty = (stops - 1) * redPhase * 0.18;
  return base + Math.max(0, penalty);
}

/**
 * The coordinated wait. A green wave or an adaptive plan lets most cars cross
 * several stops without a new red. The penalty from extra stops nearly goes
 * away, so the mean returns near the single-stop delay.
 */
export function coordinatedWait(stage: Stage, demandPerApproach: number): number {
  const x = saturation(demandPerApproach, stage.approachCapacity);
  const base = averageWait(stage.cycle, stage.greenShare, x);
  const residual = stage.control === 'adaptive' ? 1.05 : 1.15;
  return base * residual;
}

/** Demand per main approach at a typical intersection for the stage. */
export function demandPerApproach(stage: Stage): number {
  // Roughly a quarter of total city cars pass a typical main approach per
  // hour, divided across the intersections but concentrated on main roads.
  const perIntersection = stage.carsPerHour / Math.max(1, stage.intersections);
  // Main roads carry more than a side street. Weight the main approach up.
  const mainRoadWeight = stage.intersections === 1 ? 1 : 3.2;
  return perIntersection * mainRoadWeight;
}

/** A profile for comparing the control strategies. */
export interface ControlProfile {
  readonly control: Control;
  /** Share of cars that stay under the 90 second rule, in percent. */
  readonly onTimeShare: number;
  /** Cost to run and maintain, relative units. */
  readonly operatingCost: number;
  /** How well it handles shifting rush patterns, from 0 to 100. */
  readonly adaptability: number;
  readonly scaleCeiling: number;
}

export const CONTROL_PROFILES: readonly ControlProfile[] = [
  { control: 'fixed-cycle', onTimeShare: 99, operatingCost: 1, adaptability: 10, scaleCeiling: 1 },
  { control: 'green-wave', onTimeShare: 88, operatingCost: 4, adaptability: 45, scaleCeiling: 40 },
  { control: 'adaptive', onTimeShare: 93, operatingCost: 9, adaptability: 95, scaleCeiling: 2000 }
];
