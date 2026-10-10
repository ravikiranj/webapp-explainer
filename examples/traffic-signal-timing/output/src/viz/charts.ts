// ECharts views for the traffic signal timing explainer.

import * as echarts from 'echarts';
import { cssVar } from '../theme.ts';

let DARK_AXIS = '#2a3350';
let INK = '#e9edf5';
let INK_DIM = '#c2cce0';

function syncColors(): void {
  INK = cssVar('--ink') || INK;
  INK_DIM = cssVar('--ink-dim') || INK_DIM;
  DARK_AXIS = cssVar('--chart-axis') || DARK_AXIS;
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

function base(): echarts.EChartsCoreOption {
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
    grid: { left: 60, right: 24, top: 40, bottom: 50 }
  };
}

/** Compare naive and coordinated average wait against the 90 second rule. */
export function drawWaitCompare(
  host: HTMLElement,
  stageNames: string[],
  naive: number[],
  coordinated: number[],
  limit: number
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => Math.round(Number(v)) + ' s' },
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'category',
      data: stageNames,
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'Average wait (s)',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        name: 'Each light alone',
        type: 'bar',
        data: naive,
        itemStyle: { color: '#ff6b6b' },
        markLine: {
          symbol: 'none',
          data: [{ yAxis: limit, name: 'rule' }],
          lineStyle: { color: '#4f9dff', type: 'dotted' },
          label: { color: '#4f9dff', formatter: '90 s rule' }
        }
      },
      {
        name: 'Coordinated',
        type: 'bar',
        data: coordinated,
        itemStyle: { color: '#37d39b' }
      }
    ]
  });
  return dispose;
}

/**
 * Draw the average wait as a car crosses successive intersections.
 * The naive line climbs with each stop. The coordinated line stays flat.
 */
export function drawWaveProfile(
  host: HTMLElement,
  stops: number[],
  naive: number[],
  coordinated: number[],
  limit: number
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => Math.round(Number(v)) + ' s' },
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'category',
      name: 'stop',
      data: stops.map((s) => '#' + s),
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'Mean wait so far (s)',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        name: 'Each light alone',
        type: 'line',
        smooth: true,
        data: naive,
        areaStyle: { color: 'rgba(255,107,107,0.12)' },
        lineStyle: { color: '#ff6b6b' },
        itemStyle: { color: '#ff6b6b' }
      },
      {
        name: 'Coordinated',
        type: 'line',
        smooth: true,
        data: coordinated,
        areaStyle: { color: 'rgba(55,211,155,0.12)' },
        lineStyle: { color: '#37d39b' },
        itemStyle: { color: '#37d39b' }
      },
      {
        name: 'Rule',
        type: 'line',
        data: stops.map(() => limit),
        symbol: 'none',
        lineStyle: { color: '#4f9dff', type: 'dotted' }
      }
    ]
  });
  return dispose;
}

/** Scatter of control strategies: adaptability against operating cost. */
export function drawControlTradeoff(
  host: HTMLElement,
  points: { name: string; adaptability: number; cost: number; onTime: number }[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: {
      formatter: (p: { data: number[]; name: string }) =>
        `${p.name}<br/>Adaptability: ${p.data[1]}<br/>Operating cost: ${p.data[0]}<br/>On-time: ${p.data[2]}%`
    },
    xAxis: {
      type: 'value',
      name: 'Operating cost',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'Adaptability',
      min: 0,
      max: 100,
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        type: 'scatter',
        symbolSize: (d: number[]) => 14 + d[2] / 6,
        data: points.map((p) => ({ name: p.name, value: [p.cost, p.adaptability, p.onTime] })),
        label: { show: true, formatter: (p: { name: string }) => p.name, position: 'top', color: INK_DIM, fontSize: 11 },
        itemStyle: { color: '#4f9dff' }
      }
    ]
  });
  return dispose;
}
