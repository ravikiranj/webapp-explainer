import type { Section } from '../../../../../shared/section.ts';
import { CAUSES, CAUSE_ORDER, report } from '../data.ts';
import { PALETTES } from '../palettes.ts';
import { mountChart, themeInk } from '../charts.ts';
import { cards, chips, frame } from '../ui.ts';
import { get, set } from '../state.ts';

export const causes: Section = {
  id: 'causes',
  group: 'Report',
  title: 'Why tickets happen',
  icon: 'bi-pie-chart',
  badge: 'cause',
  caption: 'The share of tickets for each cause class.',
  render(el) {
    const f = frame(el, 'Selected severities', `${report().source} · the class comes from the cause field; a reviewer corrected some`);
    let dispose = (): void => undefined;
    let sel: string | undefined; // the selected cause; the biggest one at the start
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
      const tickets = report().tickets.filter((t) => active.has(t.sev));
      const n = (k: string): number => tickets.filter((t) => t.cause === k).length;
      const pct = (x: number): string => `${tickets.length ? Math.round((100 * x) / tickets.length) : 0}%`;
      const chosenCause = sel ?? [...CAUSE_ORDER].sort((a, b) => n(b) - n(a))[0];
      const reviewed = tickets.filter((t) => t.by === 'review').length;
      f.body.append(cards([[pct(n('dependency')), 'Dependency'], [pct(n('ours')), 'Our issue'], [pct(reviewed), 'Reviewed by a person'], [String(tickets.length), 'Tickets']]));
      const host = document.createElement('div');
      host.className = 'rp-panel';
      host.innerHTML = `<div class="subtle" style="color:var(--ink-dim)">The class comes from the cause field. A reviewer corrected ${reviewed} tickets; the rest are estimates.</div><div class="rp-chart" style="height:clamp(18rem,40vh,30rem)"></div>`;
      f.body.append(host);
      const ink = themeInk();
      dispose = mountChart(host.lastElementChild as HTMLElement, {
        grid: { left: 24, right: 48, top: 8, bottom: 8, containLabel: true }, tooltip: { trigger: 'item', confine: true },
        xAxis: { type: 'value', splitLine: { lineStyle: { color: ink.grid } } },
        yAxis: { type: 'category', inverse: true, data: CAUSE_ORDER.map((k) => CAUSES[k]), axisTick: { show: false } },
        series: [{ type: 'bar', barMaxWidth: 26, markArea: { silent: true, itemStyle: { color: pal.accent, opacity: 0.2 }, data: [[{ yAxis: CAUSES[chosenCause] }, { yAxis: CAUSES[chosenCause] }]] }, label: { show: true, position: 'right' },
          data: CAUSE_ORDER.map((k) => ({ value: n(k), itemStyle: { color: pal.causes[k], borderRadius: [0, 4, 4, 0], ...(k === chosenCause ? { borderColor: ink.text, borderWidth: 2 } : {}) } })) }]
      }, (p) => { sel = CAUSE_ORDER[p.dataIndex]; draw(); });
      f.showTickets(CAUSES[chosenCause], tickets.filter((t) => t.cause === chosenCause));
    };
    draw();
    return () => dispose();
  }
};
