import type { Section } from '../../../../../shared/section.ts';
import { fmtDur, median, report, type Ticket } from '../data.ts';
import { PALETTES } from '../palettes.ts';
import { mountChart, themeInk } from '../charts.ts';
import { cards, chips, frame } from '../ui.ts';
import { get, set } from '../state.ts';

const BUCKETS: [number, number, string][] = [[0, 900, '< 15 min'], [900, 1800, '15-30 min'], [1800, 3600, '30-60 min'], [3600, 7200, '1-2 h'], [7200, 21600, '2-6 h'], [21600, 86400, '6-24 h'], [86400, Infinity, '> 24 h']];

export const resolve: Section = {
  id: 'resolve',
  group: 'Report',
  title: 'Time to resolve',
  icon: 'bi-stopwatch',
  badge: 'spread',
  caption: 'How long tickets take from create to resolve.',
  render(el) {
    const f = frame(el, 'Selected severities', `${report().source} · open tickets are not measured`);
    let dispose = (): void => undefined;
    let sel: number | undefined; // the selected bucket; the biggest one at the start
    const draw = (): void => {
      dispose();
      f.controls.innerHTML = '';
      f.body.innerHTML = '';
      const pal = PALETTES[get('palette', 'classic')];
      const counts: Record<number, number> = {};
      for (const t of report().tickets) {
        counts[t.sev] = (counts[t.sev] ?? 0) + 1;
      }
      const chosen = get('sev', '').split(',').filter(Boolean).map(Number);
      const active = new Set(chosen.length ? chosen : [1, 2, 3, 4]);
      chips(f.controls, 'Severity', [1, 2, 3, 4], counts, active, (next) => { set({ sev: next.length === 4 ? '' : next.join(',') }); draw(); });
      const all = report().tickets.filter((t) => active.has(t.sev));
      const done = all.filter((t): t is Ticket & { r: number } => t.r !== null);
      const secs = done.map((t) => t.r - t.c);
      const lo = done.reduce<Ticket | undefined>((a, t) => (!a || t.r! - t.c < a.r! - a.c ? t : a), undefined);
      const hi = done.reduce<Ticket | undefined>((a, t) => (!a || t.r! - t.c > a.r! - a.c ? t : a), undefined);
      f.body.append(cards([[fmtDur(secs.length ? secs.reduce((a, b) => a + b, 0) / secs.length : null), 'Mean'], [fmtDur(median(secs)), 'Median'],
        [fmtDur(lo ? lo.r! - lo.c : null), 'Lowest'], [fmtDur(hi ? hi.r! - hi.c : null), 'Highest'], [`${done.length} of ${all.length}`, 'Tickets measured']]));
      const host = document.createElement('div');
      host.className = 'rp-panel';
      host.innerHTML = '<div class="rp-chart" style="height:clamp(18rem,40vh,30rem)"></div>';
      f.body.append(host);
      const bins = BUCKETS.map(([a, b]) => done.filter((t) => t.r - t.c >= a && t.r - t.c < b));
      const chosenBin = sel ?? bins.reduce((best, b, i) => (b.length > bins[best].length ? i : best), 0);
      const ink = themeInk();
      dispose = mountChart(host.firstElementChild as HTMLElement, {
        grid: { left: 24, right: 16, top: 24, bottom: 8, containLabel: true }, tooltip: { trigger: 'item' },
        xAxis: { type: 'category', data: BUCKETS.map((b) => b[2]), axisTick: { show: false } }, yAxis: { type: 'value', splitLine: { lineStyle: { color: ink.grid } } },
        series: [{ type: 'bar', barMaxWidth: 54, markArea: { silent: true, itemStyle: { color: pal.accent, opacity: 0.2 }, data: [[{ xAxis: BUCKETS[chosenBin][2] }, { xAxis: BUCKETS[chosenBin][2] }]] }, data: bins.map((b, i) => ({ value: b.length, itemStyle: { color: pal.accent, borderRadius: [4, 4, 0, 0], ...(i === chosenBin ? { borderColor: ink.text, borderWidth: 2 } : {}) } })), label: { show: true, position: 'top' } }]
      }, (p) => { sel = p.dataIndex; draw(); });
      f.showTickets(`resolved in ${BUCKETS[chosenBin][2]}`, bins[chosenBin]);
    };
    draw();
    return () => dispose();
  }
};
