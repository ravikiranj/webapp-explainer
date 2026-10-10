// A live, animated rate-limiting simulation. It steps once per tick (one tick
// is one second of model time). Controls change the node count, the arrival
// rate, and the technique while the simulation runs. The simulation drives an
// animated time series of admitted and rejected requests and a live readout of
// the admitted rate against the limit.

import * as echarts from 'echarts';
import { cssVar } from './theme.ts';
import { seededRandom, type Technique } from './domain.ts';

export interface SimParams {
  perKeyLimit: number;
  nodes: number;
  arrivalRate: number;
  technique: Technique;
}

interface TickResult {
  admitted: number;
  rejected: number;
}

/**
 * Step the model one tick. The behaviour depends on the technique:
 * - in-memory-counter: each node admits up to the full limit, so the admitted
 *   rate is multiplied by the node count (the failure).
 * - central-counter: all nodes share one budget, so the admitted rate holds.
 * - regional-quota: the limit is split across nodes; uneven load wastes some.
 * - local-bucket-sync: local buckets with lending hold the limit closely.
 */
function step(params: SimParams, rand: () => number): TickResult {
  const { perKeyLimit, nodes, arrivalRate, technique } = params;
  // Spread the arriving traffic across the nodes with some imbalance.
  const perNode: number[] = [];
  let total = 0;
  for (let i = 0; i < nodes; i++) {
    const share = arrivalRate * (0.5 + rand()) / nodes;
    perNode.push(share);
    total += share;
  }
  if (technique === 'in-memory-counter') {
    // Each node admits up to the whole limit on its own.
    let admitted = 0;
    for (const load of perNode) {
      admitted += Math.min(load, perKeyLimit);
    }
    return { admitted: Math.round(admitted), rejected: Math.max(0, Math.round(total - admitted)) };
  }
  if (technique === 'central-counter') {
    const admitted = Math.min(total, perKeyLimit);
    return { admitted: Math.round(admitted), rejected: Math.max(0, Math.round(total - admitted)) };
  }
  if (technique === 'regional-quota') {
    // Each node may admit only its equal share of the limit.
    const quota = perKeyLimit / nodes;
    let admitted = 0;
    for (const load of perNode) {
      admitted += Math.min(load, quota);
    }
    return { admitted: Math.round(admitted), rejected: Math.max(0, Math.round(total - admitted)) };
  }
  // local-bucket-sync: local buckets, but spare budget is lent to busy nodes,
  // so the global admitted rate holds close to the limit.
  const admitted = Math.min(total, perKeyLimit * 1.02);
  return { admitted: Math.round(admitted), rejected: Math.max(0, Math.round(total - admitted)) };
}

export interface SimHandle {
  readonly params: SimParams;
  play(): void;
  pause(): void;
  reset(): void;
  isRunning(): boolean;
  dispose(): void;
  onReadout(cb: (r: { admitted: number; limit: number; rejected: number; running: boolean }) => void): void;
}

/** Create and mount the live simulation chart on the host element. */
export function createRateSim(host: HTMLElement, initial: SimParams): SimHandle {
  const params: SimParams = { ...initial };
  const chart = echarts.init(host, undefined, { renderer: 'canvas' });
  const window = 40;
  const admittedSeries: number[] = [];
  const rejectedSeries: number[] = [];
  const limitSeries: number[] = [];
  const ticks: string[] = [];
  let t = 0;
  let timer: number | undefined;
  const rand = seededRandom(20240101);
  let readoutCb: ((r: { admitted: number; limit: number; rejected: number; running: boolean }) => void) | undefined;

  const onResize = () => chart.resize();
  window && globalThis.addEventListener('resize', onResize);

  function render(): void {
    const ink = cssVar('--ink');
    const inkDim = cssVar('--ink-dim');
    const axis = cssVar('--chart-axis');
    chart.setOption({
      textStyle: { color: ink, fontFamily: 'system-ui, sans-serif' },
      grid: { left: 60, right: 20, top: 36, bottom: 40 },
      tooltip: { trigger: 'axis' },
      legend: { textStyle: { color: inkDim }, top: 4 },
      xAxis: {
        type: 'category',
        data: ticks,
        axisLine: { lineStyle: { color: axis } },
        axisLabel: { color: inkDim }
      },
      yAxis: {
        type: 'value',
        name: 'requests / s',
        nameTextStyle: { color: inkDim },
        axisLine: { lineStyle: { color: axis } },
        splitLine: { lineStyle: { color: axis } },
        axisLabel: { color: inkDim }
      },
      series: [
        {
          name: 'Admitted',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: admittedSeries,
          areaStyle: { color: 'rgba(55,211,155,0.18)' },
          lineStyle: { color: cssVar('--good') },
          itemStyle: { color: cssVar('--good') }
        },
        {
          name: 'Rejected',
          type: 'bar',
          data: rejectedSeries,
          itemStyle: { color: cssVar('--bad') }
        },
        {
          name: 'Limit',
          type: 'line',
          showSymbol: false,
          data: limitSeries,
          lineStyle: { color: cssVar('--accent'), type: 'dashed' }
        }
      ]
    });
  }

  function advance(): void {
    const result = step(params, rand);
    ticks.push('t' + t);
    admittedSeries.push(result.admitted);
    rejectedSeries.push(result.rejected);
    limitSeries.push(params.perKeyLimit);
    if (ticks.length > window) {
      ticks.shift();
      admittedSeries.shift();
      rejectedSeries.shift();
      limitSeries.shift();
    }
    t++;
    render();
    readoutCb?.({ admitted: result.admitted, limit: params.perKeyLimit, rejected: result.rejected, running: timer !== undefined });
  }

  render();

  return {
    params,
    play() {
      if (timer !== undefined) {
        return;
      }
      timer = globalThis.setInterval(advance, 500) as unknown as number;
      readoutCb?.({ admitted: admittedSeries[admittedSeries.length - 1] ?? 0, limit: params.perKeyLimit, rejected: rejectedSeries[rejectedSeries.length - 1] ?? 0, running: true });
    },
    pause() {
      if (timer !== undefined) {
        globalThis.clearInterval(timer);
        timer = undefined;
      }
      readoutCb?.({ admitted: admittedSeries[admittedSeries.length - 1] ?? 0, limit: params.perKeyLimit, rejected: rejectedSeries[rejectedSeries.length - 1] ?? 0, running: false });
    },
    reset() {
      ticks.length = 0;
      admittedSeries.length = 0;
      rejectedSeries.length = 0;
      limitSeries.length = 0;
      t = 0;
      render();
    },
    isRunning() {
      return timer !== undefined;
    },
    dispose() {
      if (timer !== undefined) {
        globalThis.clearInterval(timer);
      }
      globalThis.removeEventListener('resize', onResize);
      chart.dispose();
    },
    onReadout(cb) {
      readoutCb = cb;
    }
  };
}
