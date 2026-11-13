import type { Section } from '../../../../../shared/section.ts';
import { CAUSES, CAUSE_ORDER, fmtDay, report, type Ticket } from '../data.ts';
import { PALETTES } from '../palettes.ts';
import { cards, esc, frame, segmented } from '../ui.ts';
import { get, set } from '../state.ts';

const MONTHS: Record<string, number> = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 };

function top<T>(counts: Map<string, T[]>, n: number): [string, T[]][] {
  return [...counts.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, n);
}

/** The most common resolution text of an alarm. If none repeats, the latest one. */
function typical(list: Ticket[]): { text: string; n: number } | null {
  const c = new Map<string, { text: string; n: number; at: number }>();
  for (const t of list.filter((x) => x.res)) {
    const e = c.get(t.res) ?? { text: t.res, n: 0, at: 0 };
    e.n += 1;
    e.at = Math.max(e.at, t.c);
    c.set(t.res, e);
  }
  const best = [...c.values()].sort((a, b) => b.n - a.n || b.at - a.at)[0];
  return best ?? null;
}

export const issues: Section = {
  id: 'issues',
  group: 'Report',
  title: 'Top issues',
  icon: 'bi-exclamation-triangle',
  badge: 'ranking',
  caption: 'The issues that come back most often, with their cause and their typical resolution.',
  render(el) {
    const f = frame(el, 'All severities', `${report().source} · counted back from ${report().today}`);
    const draw = (): void => {
      f.controls.innerHTML = '';
      f.body.innerHTML = '';
      f.clearTickets();
      const pal = PALETTES[get('palette', 'classic')];
      const range = get('range', '12m');
      segmented(f.controls, 'Range', [['1m', '1 month'], ['3m', '3 months'], ['6m', '6 months'], ['12m', '12 months']], range, (v) => { set({ range: v }); draw(); });
      const end = new Date(report().today + 'T00:00:00Z');
      end.setUTCMonth(end.getUTCMonth() - MONTHS[range]);
      const start = end.getTime() / 1000;
      const inRange = report().tickets.filter((t) => t.c >= start);
      const groups = new Map<string, Ticket[]>();
      for (const t of inRange) {
        groups.set(t.title, [...(groups.get(t.title) ?? []), t]);
      }
      const rows = top(groups, 10);
      f.body.append(cards([[String(inRange.length), 'Tickets'], [String(groups.size), 'Different issues'], [rows[0] ? String(rows[0][1].length) : '0', rows[0] ? rows[0][0] : '']]));
      const legend = CAUSE_ORDER.map((k) => `<span><i style="background:${pal.causes[k]}"></i>${CAUSES[k]}</span>`).join('');
      const html = rows.map(([title, list], i) => {
        const mix = CAUSE_ORDER.map((k) => [k, list.filter((t) => t.cause === k).length] as const).filter(([, n]) => n);
        const causes = top(new Map(mix.map(([k]) => [k, list.filter((t) => t.cause === k)])), 2)
          .map(([, l]) => `<div>${l[0].cf.startsWith('Other') ? CAUSES[l[0].cause] : esc(l[0].cf)} <span class="rp-n">${l.length}</span></div>`).join('');
        const res = typical(list);
        return `<tr data-i="${i}"><td>${esc(title)}</td><td class="text-end">${list.length}</td>
          <td><div class="rp-mix" title="${mix.map(([k, n]) => `${CAUSES[k]} ${n}`).join(', ')}">${mix.map(([k, n]) => `<span style="width:${(100 * n) / list.length}%;background:${pal.causes[k]}"></span>`).join('')}</div></td>
          <td>${causes}</td><td>${res ? `${esc(res.text)}${res.n > 1 ? ` <span class="rp-n">x${res.n}</span>` : ''}` : '<span class="rp-n">none recorded</span>'}</td></tr>`;
      }).join('');
      const panel = document.createElement('div');
      panel.className = 'rp-panel';
      panel.innerHTML = `<div class="rp-legend">${legend}</div><div style="overflow-x:auto"><table class="table table-sm rp-table"><thead><tr><th>Issue</th><th class="text-end">Tickets</th><th style="width:12%">Cause mix</th><th>Main causes</th><th>Typical resolution</th></tr></thead><tbody>${html}</tbody></table></div>`;
      f.body.append(panel);
      panel.querySelectorAll<HTMLElement>('tbody tr').forEach((tr) => tr.addEventListener('click', () => {
        const [title, list] = rows[Number(tr.dataset.i)];
        f.showTickets(`${title}, since ${fmtDay(start)}`, list);
      }));
    };
    draw();
  }
};
