// ECharts views. Each builder draws into a host element and returns a
// dispose function. The caller runs dispose when the user leaves the section,
// so no hidden chart keeps a stale size.

import * as echarts from 'echarts';
import { cssVar } from '../theme.ts';

// These are refreshed from the active theme's CSS variables on each draw, so
// charts follow a theme change after they are redrawn.
let DARK_AXIS = '#2a3350';
let INK = '#e9edf5';
let INK_DIM = '#c2cce0';

function syncColors(): void {
  INK = cssVar('--ink') || INK;
  INK_DIM = cssVar('--ink-dim') || INK_DIM;
  DARK_AXIS = cssVar('--chart-axis') || DARK_AXIS;
}

function baseGrid(): echarts.EChartsCoreOption {
  return {
    toolbox: {
      right: 12,
      feature: {
        dataZoom: { yAxisIndex: 'none', title: { zoom: 'Box zoom', back: 'Reset zoom' } },
        restore: { title: 'Restore' },
        saveAsImage: { title: 'Save' }
      },
      iconStyle: { borderColor: INK_DIM }
    },
    textStyle: { color: INK, fontFamily: 'system-ui, sans-serif' },
    grid: { left: 70, right: 24, top: 40, bottom: 50 }
  };
}

function init(host: HTMLElement): { chart: echarts.ECharts; dispose: () => void } {
  syncColors();
  const chart = echarts.init(host, undefined, { renderer: 'canvas' });
  const onResize = () => chart.resize();
  window.addEventListener('resize', onResize);
  return {
    chart,
    dispose: () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    }
  };
}

/**
 * Draw a bar chart that compares the wanted limit against the rate that a
 * naive per-node counter really admits. The gap is the failure.
 */
export function drawOvershoot(
  host: HTMLElement,
  stageNames: string[],
  limits: number[],
  admitted: number[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...baseGrid(),
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: unknown) => Number(v).toLocaleString() + ' TPS'
    },
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'category',
      data: stageNames,
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'log',
      name: 'TPS (log)',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM, formatter: (v: number) => v.toLocaleString() }
    },
    series: [
      {
        name: 'Wanted per-key limit',
        type: 'bar',
        data: limits,
        itemStyle: { color: '#37d39b' }
      },
      {
        name: 'Admitted by naive counters',
        type: 'bar',
        data: admitted,
        itemStyle: { color: '#ff6b6b' }
      }
    ]
  });
  return dispose;
}

/**
 * Draw a token bucket run. Arrivals vary. Admitted stays near the limit.
 * Rejected shows the drops. Tokens show the bucket level.
 */
export function drawBucket(
  host: HTMLElement,
  ticks: number[],
  arrivals: number[],
  admitted: number[],
  rejected: number[],
  limit: number
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...baseGrid(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'category',
      data: ticks.map((t) => 't' + t),
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'TPS',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        name: 'Arrivals',
        type: 'line',
        data: arrivals,
        smooth: true,
        lineStyle: { color: INK_DIM, type: 'dashed' },
        itemStyle: { color: INK_DIM }
      },
      {
        name: 'Admitted',
        type: 'line',
        data: admitted,
        smooth: true,
        areaStyle: { color: 'rgba(55,211,155,0.15)' },
        lineStyle: { color: '#37d39b' },
        itemStyle: { color: '#37d39b' }
      },
      {
        name: 'Rejected',
        type: 'bar',
        data: rejected,
        itemStyle: { color: 'rgba(255,107,107,0.75)' }
      },
      {
        name: 'Limit',
        type: 'line',
        data: ticks.map(() => limit),
        symbol: 'none',
        lineStyle: { color: '#4f9dff', type: 'dotted' }
      }
    ]
  });
  return dispose;
}

/** Draw a scatter of technique accuracy against coordination cost. */
export function drawTradeoff(
  host: HTMLElement,
  points: { name: string; accuracy: number; cost: number; latency: number }[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...baseGrid(),
    tooltip: {
      formatter: (p: { data: number[]; name: string }) =>
        `${p.name}<br/>Accuracy: ${p.data[1]}%<br/>Coordination cost: ${p.data[0]}<br/>Added latency: ${p.data[2]} ms`
    },
    xAxis: {
      type: 'value',
      name: 'Coordination cost',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'Accuracy (%)',
      min: 85,
      max: 101,
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (d: number[]) => 18 + d[2] * 4,
        data: points.map((p) => ({ name: p.name, value: [p.cost, p.accuracy, p.latency] })),
        label: {
          show: true,
          formatter: (p: { name: string }) => p.name,
          position: 'top',
          color: INK_DIM,
          fontSize: 11
        },
        itemStyle: { color: '#4f9dff' }
      }
    ]
  });
  return dispose;
}
