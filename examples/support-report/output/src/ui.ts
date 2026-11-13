// The parts that every slide shares: the frame, chips, toggles, cards, and the quiet list of tickets.

import { h } from '../../../../shared/dom.ts';
import { fmtDay, type Ticket, CAUSES } from './data.ts';
import { set } from './state.ts';

export interface Frame {
  controls: HTMLElement;
  body: HTMLElement;
  showTickets: (title: string, tickets: Ticket[]) => void;
  clearTickets: () => void;
}

export function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

/** The frame of a slide: a scope badge, the download links, the controls, the body, the quiet list, and a footer. */
export function frame(el: HTMLElement, scope: string, footer: string): Frame {
  const controls = h('div', { class: 'rp-controls' });
  const body = h('div', { class: 'rp-body' });
  const sum = h('summary', {}, ['Tickets: click a chart element to list them here']);
  const list = h('div', { class: 'rp-list' });
  const drawer = h('details', { class: 'rp-drawer' }, [sum, list]) as HTMLDetailsElement;
  const downloads = h('span', { class: 'rp-dl' }, ['Data ']);
  for (const [label, file] of [['JSON', 'report-data.json'], ['Tickets CSV', 'tickets.csv'], ['Weeks CSV', 'weeks.csv']]) {
    downloads.append(h('a', { href: `./${file}`, download: file }, [label]), ' ');
  }
  set({}); // keep the link in step with the saved state, also after the shell redraws a slide
  el.append(
    h('div', { class: 'rp-top' }, [h('span', { class: 'rp-scope' }, [scope]), downloads]),
    controls, body, drawer, h('div', { class: 'rp-foot' }, [footer])
  );
  const clearTickets = (): void => {
    sum.textContent = 'Tickets: click a chart element to list them here';
    list.innerHTML = '';
  };
  const showTickets = (title: string, tickets: Ticket[]): void => {
    const rows = tickets.slice().sort((a, b) => b.c - a.c).slice(0, 300);
    sum.textContent = `Tickets: ${title} (${tickets.length}${tickets.length > 300 ? ', first 300' : ''})`;
    list.innerHTML = `<table class="table table-sm table-hover"><thead><tr><th>Ticket</th><th>Title</th><th>Product</th><th>Sev</th><th>Created</th><th>Cause</th></tr></thead><tbody>${
      rows.map((t) => `<tr><td>${t.id}</td><td>${esc(t.title)}</td><td>${t.item}</td><td>${t.sev}</td><td>${fmtDay(t.c)}</td><td>${CAUSES[t.cause]}${t.by === 'review' ? ' (reviewed)' : ''}</td></tr>`).join('')}</tbody></table>`;
    drawer.open = true; // open in place; never scroll the page
  };
  return { controls, body, showTickets, clearTickets };
}

/** Category chips with counts. At least one chip stays on. */
export function chips(host: HTMLElement, label: string, levels: number[], counts: Record<number, number>, active: Set<number>, onChange: (next: number[]) => void): void {
  host.append(h('span', { class: 'rp-lbl' }, [label]));
  for (const l of levels) {
    const b = h('button', { type: 'button', 'aria-pressed': String(active.has(l)) }, [`Sev${l}`, h('span', { class: 'c' }, [String(counts[l] ?? 0)])]);
    b.addEventListener('click', () => {
      const next = new Set(active);
      if (next.has(l)) {
        next.delete(l);
      } else {
        next.add(l);
      }
      if (next.size) {
        onChange([...next].sort());
      }
    });
    host.append(b);
  }
}

/** A segmented toggle. */
export function segmented(host: HTMLElement, name: string, options: [string, string][], value: string, onChange: (v: string) => void): void {
  const g = h('div', { class: 'rp-seg', role: 'group', 'aria-label': name });
  for (const [v, text] of options) {
    const b = h('button', { type: 'button', 'aria-pressed': String(v === value) }, [text]);
    b.addEventListener('click', () => onChange(v));
    g.append(b);
  }
  host.append(g);
}

export function cards(items: [string, string][]): HTMLElement {
  return h('div', { class: 'rp-cards' }, items.map(([v, l]) => h('div', { class: 'rp-card' }, [h('div', { class: 'v' }, [v]), h('div', { class: 'l' }, [l])])));
}
