// ECharts views for the insulin resistance explainer. Every chart shows real
// cited values. The caller passes values that come from domain.ts.

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
    grid: { left: 60, right: 24, top: 44, bottom: 60 }
  };
}

/** Compare the white BMI cutoff against the South Asian equivalent BMI. */
export function drawBmiEquivalence(
  host: HTMLElement,
  labels: string[],
  whiteBmi: number[],
  southAsianBmi: number[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => Number(v).toFixed(1) + ' kg/m²' },
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM, interval: 0, width: 150, overflow: 'break', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      name: 'BMI (kg/m²)',
      min: 15,
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        name: 'White cutoff',
        type: 'bar',
        data: whiteBmi,
        itemStyle: { color: '#4f9dff' },
        label: { show: true, position: 'top', color: INK, formatter: (p: { value: number }) => p.value.toFixed(1) }
      },
      {
        name: 'South Asian equivalent',
        type: 'bar',
        data: southAsianBmi,
        itemStyle: { color: '#ff6b6b' },
        label: { show: true, position: 'top', color: INK, formatter: (p: { value: number }) => p.value.toFixed(1) }
      }
    ]
  });
  return dispose;
}

/** Draw the equivalent-risk BMI for each group as a sorted bar. */
export function drawGroupBmi(
  host: HTMLElement,
  groups: string[],
  bmi: number[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => Number(v).toFixed(1) + ' kg/m²' },
    xAxis: {
      type: 'category',
      data: groups,
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'Equivalent BMI (kg/m²)',
      min: 15,
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      {
        type: 'bar',
        data: bmi.map((b, i) => ({
          value: b,
          itemStyle: { color: groups[i] === 'South Asian' ? '#ff6b6b' : groups[i] === 'White' ? '#4f9dff' : '#9aa6bd' }
        })),
        markLine: {
          symbol: 'none',
          data: [{ yAxis: 30, name: 'white obesity line' }],
          lineStyle: { color: '#4f9dff', type: 'dotted' },
          label: { color: '#4f9dff', formatter: 'white 30' }
        },
        label: { show: true, position: 'top', color: INK, formatter: (p: { value: number }) => p.value.toFixed(1) }
      }
    ]
  });
  return dispose;
}

/** Grouped bar of waist thresholds, men and women, by population group. */
export function drawWaist(
  host: HTMLElement,
  groups: string[],
  men: number[],
  women: number[]
): () => void {
  const { chart, dispose } = init(host);
  chart.setOption({
    ...base(),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: unknown) => Number(v) + ' cm' },
    legend: { textStyle: { color: INK_DIM }, top: 6 },
    xAxis: {
      type: 'category',
      data: groups,
      axisLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    yAxis: {
      type: 'value',
      name: 'Waist (cm)',
      min: 70,
      nameTextStyle: { color: INK_DIM },
      axisLine: { lineStyle: { color: DARK_AXIS } },
      splitLine: { lineStyle: { color: DARK_AXIS } },
      axisLabel: { color: INK_DIM }
    },
    series: [
      { name: 'Men', type: 'bar', data: men, itemStyle: { color: '#4f9dff' }, label: { show: true, position: 'top', color: INK } },
      { name: 'Women', type: 'bar', data: women, itemStyle: { color: '#ffc24b' }, label: { show: true, position: 'top', color: INK } }
    ]
  });
  return dispose;
}
