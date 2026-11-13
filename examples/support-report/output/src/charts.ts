// ECharts helper. It draws into a host element and returns a dispose function.
// The font is the computed font stack of the page. A canvas ignores an invalid family such as "inherit".

import * as echarts from 'echarts';
import { currentTheme } from '../../../../shared/theme.ts';

export function chartFont(): { family: string; size: number } {
  const px = parseFloat(getComputedStyle(document.documentElement).fontSize);
  return { family: getComputedStyle(document.body).fontFamily, size: Math.round(px * 0.97) };
}

export function themeInk(): { text: string; grid: string } {
  const dark = currentTheme() === 'dark';
  return { text: dark ? '#d5dbe3' : '#3a4350', grid: dark ? '#333b46' : '#e8ebef' };
}

type Opt = Record<string, unknown>;

/** Set the size and the colour of every label, so that no default is used. */
function withFonts(o: Opt): Opt {
  const { size } = chartFont();
  const { text } = themeInk();
  for (const key of ['xAxis', 'yAxis']) {
    for (const axis of ([] as Opt[]).concat((o[key] as Opt | Opt[]) ?? [])) {
      axis.axisLabel = { fontSize: size, color: text, ...((axis.axisLabel as Opt) ?? {}) };
    }
  }
  if (o.legend) {
    (o.legend as Opt).textStyle = { fontSize: size, color: text };
  }
  o.tooltip = { ...((o.tooltip as Opt) ?? {}), textStyle: { fontSize: size } };
  for (const s of ([] as Opt[]).concat((o.series as Opt[]) ?? [])) {
    if (s.label) {
      s.label = { fontSize: size, color: text, ...(s.label as Opt) };
    }
  }
  return o;
}

/** Draw a chart into el. The click handler gets the ECharts event. */
export function mountChart(el: HTMLElement, option: Opt, onClick?: (p: echarts.ECElementEvent) => void): () => void {
  const chart = echarts.init(el);
  chart.setOption({ textStyle: { fontFamily: chartFont().family, fontSize: chartFont().size }, ...withFonts(option) });
  if (onClick) {
    chart.on('click', (p) => onClick(p));
  }
  const ro = new ResizeObserver(() => chart.resize());
  ro.observe(el);
  return () => {
    ro.disconnect();
    chart.dispose();
  };
}
