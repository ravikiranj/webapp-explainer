import type { Section } from '../../../../../shared/section.ts';
import { fmtDay, monthKey, report, type Ticket } from '../data.ts';
import { PALETTES, PRODUCTS } from '../palettes.ts';
import { currentTheme } from '../../../../../shared/theme.ts';
import { mountChart, themeInk } from '../charts.ts';
import { cards, chips, esc, frame, segmented } from '../ui.ts';
import { get, set } from '../state.ts';

interface Period { labels: string[]; starts: number[]; ends: number[]; names: string[] }

function monthPeriods(): Period {
  const end = new Date(report().today + 'T00:00:00Z');
  const starts: number[] = [];
  for (let i = 11; i >= 0; i--) {
    starts.push(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1) / 1000);
  }
  const ends = starts.map((_, i) => (i + 1 < starts.length ? starts[i + 1] : Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1) / 1000));
  const names = starts.map(monthKey);
  return { starts, ends, names, labels: names.map((n, i) => (i === names.length - 1 ? `${n} (partial)` : n)) };
}

function weekPeriods(): Period {
  const w = report().weeks;
  const names = w.map((x) => fmtDay(x.s).slice(5));
  return { starts: w.map((x) => x.s), ends: w.map((x) => x.e), names, labels: names };
}

const indexOf = (p: Period, ts: number): number => {
  for (let i = 0; i < p.starts.length; i++) {
    if (ts >= p.starts[i] && ts < p.ends[i]) {
      return i;
    }
  }
  return -1;
};

export const volume: Section = {
  id: 'volume',
  group: 'Report',
  title: 'Incoming and resolved',
  icon: 'bi-graph-up',
  badge: 'trend',
  caption: 'Tickets created and resolved in each month or week.',
  render(el) {
    const f = frame(el, 'All severities', `${report().source} · created ${fmtDay(report().tickets[0].c)} to ${report().today}`);
    let dispose = (): void => undefined;
    const draw = (): void => {
      dispose();
      f.controls.innerHTML = '';
      f.body.innerHTML = '';
      f.clearTickets();
      const pal = PALETTES[get('palette', 'classic')];
      const view = get('view', 'lines'), weekly = get('period', 'm') === 'w', measure = get('measure', 'in');
      const counts: Record<number, number> = {};
      for (const t of report().tickets) {
        counts[t.sev] = (counts[t.sev] ?? 0) + 1;
      }
      const sevs = get('sev', '').split(',').filter(Boolean).map(Number);
      const active = new Set(sevs.length ? sevs : [1, 2, 3, 4]);
      chips(f.controls, 'Severity', [1, 2, 3, 4], counts, active, (next) => { set({ sev: next.length === 4 ? '' : next.join(',') }); draw(); });
      segmented(f.controls, 'Period', [['m', 'Month'], ['w', 'Week']], weekly ? 'w' : 'm', (v) => { set({ period: v }); draw(); });
      segmented(f.controls, 'Chart type', [['lines', 'Lines'], ['bars', 'Bars']], view, (v) => { set({ view: v }); draw(); });
      if (view === 'lines') {
        segmented(f.controls, 'Measure', [['in', 'Incoming'], ['out', 'Resolved']], measure, (v) => { set({ measure: v }); draw(); });
      }
      const per = weekly ? weekPeriods() : monthPeriods();
      const tickets = report().tickets.filter((t) => active.has(t.sev));
      const pick = (kind: string, i: number, item?: string): Ticket[] =>
        tickets.filter((t) => (!item || t.item === item) && (kind === 'in' ? indexOf(per, t.c) === i : t.r !== null && indexOf(per, t.r) === i));
      const series = (kind: string, item?: string): number[] => per.names.map((_, i) => pick(kind, i, item).length);
      const total = (kind: string): number => series(kind).reduce((a, b) => a + b, 0);
      f.body.append(cards([[String(total('in')), 'Incoming'], [String(total('out')), 'Resolved'], [String(PRODUCTS.length), 'Products']]));
      const host = document.createElement('div');
      host.className = 'rp-panel';
      host.innerHTML = '<div class="rp-chart"></div>';
      f.body.append(host);
      const ink = themeInk();
      const overall = pal.overall[currentTheme() === 'dark' ? 1 : 0];
      const now = Date.parse(report().today + 'T23:59:59Z') / 1000;
      const rate = (i: number): string => {
        const days = Math.max(0.5, (Math.min(now, per.ends[i]) - per.starts[i]) / 86400);
        const inc = pick('in', i).length, out = pick('out', i).length;
        return `<b>${fmtDay(per.starts[i])} to ${fmtDay(per.ends[i])}</b>${now < per.ends[i] ? ' (so far)' : ''}<br>Incoming ${inc} · <b>${(inc / days).toFixed(1)} per day</b><br>Resolved ${out} · <b>${inc ? Math.round((100 * out) / inc) : 0}%</b> of incoming<hr style="margin:.35rem 0">`;
      };
      const line = (name: string, data: number[], color: string, big: boolean, dashed = false): Record<string, unknown> => ({
        name, type: 'line', data, showAllSymbol: true, symbolSize: big ? 9 : 6, emphasis: { focus: 'series' }, z: big ? 5 : 2,
        lineStyle: { width: big ? 4 : 2, color, type: dashed ? 'dashed' : 'solid' }, itemStyle: { color }
      });
      const bar = (name: string, data: number[], color: string): Record<string, unknown> => ({ name, type: 'bar', stack: 'in', data, itemStyle: { color }, barMaxWidth: 28 });
      const lines = view === 'lines';
      const all: Record<string, unknown>[] = lines
        ? [line('All incoming', series('in'), overall, true), line('All resolved', series('out'), overall, true, true),
          ...PRODUCTS.map((p, i) => line(p, series(measure, p), pal.items[i], false))]
        : [...PRODUCTS.map((p, i) => bar(p, series('in', p), pal.items[i])), line('All resolved', series('out'), overall, true, true)];
      dispose = mountChart(host.firstElementChild as HTMLElement, {
        legend: { top: 0, data: lines ? ['All incoming', 'All resolved'] : [...PRODUCTS, 'All resolved'] },
        grid: { left: 56, right: 16, top: 40, bottom: 8, containLabel: true },
        tooltip: { trigger: 'axis', confine: true, formatter: (ps: { dataIndex: number; marker: string; seriesName: string; value: number }[]) =>
          rate(ps[0].dataIndex) + ps.slice().sort((a, b) => b.value - a.value).map((p) => `${p.marker} ${esc(p.seriesName)}: <b>${p.value}</b>`).join('<br>') },
        xAxis: { type: 'category', data: per.labels, axisLabel: { interval: 0, rotate: weekly ? 60 : 35 }, axisTick: { show: false } },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: ink.grid } } },
        series: all
      }, (p) => {
        const name = p.seriesName ?? '';
        const kind = name === 'All resolved' || (lines && !name.startsWith('All') && measure === 'out') ? 'out' : 'in';
        const item = PRODUCTS.includes(name) ? name : undefined;
        f.showTickets(`${name.toLowerCase()}, ${per.names[p.dataIndex]}`, pick(kind, p.dataIndex, item));
      });
    };
    draw();
    return () => dispose();
  }
};
