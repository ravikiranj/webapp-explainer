// ECharts views for the unique ID generator explainer.

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
    grid: { left: 70, right: 24, top: 40, bottom: 50 }
  };
}

/** Compare collisions per second across stages, naive against the fix. */
export function drawCollisions(
  host: HTMLElement,
  stageNames: string[],
  naive: number[],
  fixed: number[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: {
      trigger: 'axis',
      valueFormatter: (v: unknown) => {
        const n = Number(v);
        return n < 1 ? n.toExponential(1) + ' /s' : Math.round(n).toLocaleString() + ' /s';
      }
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
      min: 1e-12,
      name: 'Collisions /s (log)',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        name: 'Naive shared counter',
        type: 'bar',
        data: naive.map((n) => (n <= 0 ? 1e-12 : n)),
        itemStyle: { color: '#ff6b6b' }
      },
      {
        name: 'With the fix',
        type: 'bar',
        data: fixed.map((n) => (n <= 0 ? 1e-12 : n)),
        itemStyle: { color: '#37d39b' }
      }
    ]
  });
  return dispose;
}

/**
 * Draw IDs as points of creation time against ID value. A time-ordered
 * scheme makes a rising line. A random scheme makes a cloud with no order.
 */
export function drawTimeOrder(
  host: HTMLElement,
  ordered: [number, number][],
  random: [number, number][]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: {},
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'value',
      name: 'creation order',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'ID value (scaled)',
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        name: 'Snowflake (time ordered)',
        type: 'scatter',
        symbolSize: 7,
        data: ordered,
        itemStyle: { color: '#37d39b' }
      },
      {
        name: 'Random UUID (no order)',
        type: 'scatter',
        symbolSize: 7,
        data: random,
        itemStyle: { color: 'rgba(255,107,107,0.7)' }
      }
    ]
  });
  return dispose;
}
