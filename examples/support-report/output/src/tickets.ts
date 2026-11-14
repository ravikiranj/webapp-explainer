// The ticket list under a chart: sortable columns, drag a header to move a column. The settings hold the column choice.
// The choice of columns and the sort order are kept in the link state.

import { CAUSES, fmtDay, fmtDur, type Ticket } from './data.ts';
import { openSettings } from '../../../../shared/settings.ts';
import { get, set } from './state.ts';

interface Column {
  key: string;
  label: string;
  value: (t: Ticket) => string | number;
  show?: (t: Ticket) => string;
  align?: 'end';
}

export const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

export const COLUMNS: Column[] = [
  { key: 'id', label: 'Ticket', value: (t) => t.id },
  { key: 'title', label: 'Title', value: (t) => t.title },
  { key: 'item', label: 'Product', value: (t) => t.item },
  { key: 'region', label: 'Region', value: (t) => t.region },
  { key: 'sev', label: 'Sev', value: (t) => t.sev },
  { key: 'c', label: 'Created', value: (t) => t.c, show: (t) => fmtDay(t.c) },
  { key: 'r', label: 'Resolved', value: (t) => t.r ?? Infinity, show: (t) => (t.r === null ? 'open' : fmtDay(t.r)) },
  { key: 'dur', label: 'Time to resolve', value: (t) => (t.r === null ? Infinity : t.r - t.c), show: (t) => fmtDur(t.r === null ? null : t.r - t.c), align: 'end' },
  { key: 'src', label: 'Source', value: (t) => t.src },
  { key: 'cf', label: 'Cause field', value: (t) => t.cf },
  { key: 'res', label: 'Resolution', value: (t) => t.res },
  { key: 'cause', label: 'Cause', value: (t) => CAUSES[t.cause], show: (t) => `${CAUSES[t.cause]}${t.by === 'review' ? ' (reviewed)' : ''}` }
];
export const DEFAULT_COLS = ['id', 'title', 'item', 'sev', 'c', 'cause'];
const BY_KEY = new Map(COLUMNS.map((c) => [c.key, c]));
const MAX_ROWS = 300;
const MIN_WIDTH = 48;

/** The widths that the reader set, in px. An empty map means that the browser sizes the columns. */
function widthState(): Map<string, number> {
  const m = new Map<string, number>();
  for (const part of get('widths', '').split(',').filter(Boolean)) {
    const [k, w] = part.split(':');
    if (BY_KEY.has(k)) {
      m.set(k, Number(w));
    }
  }
  return m;
}
const saveWidths = (m: Map<string, number>): void => set({ widths: [...m].map(([k, w]) => `${k}:${Math.round(w)}`).join(',') });

/** The visible columns, in order. */
export function visibleColumns(): Column[] {
  const saved = get('cols', DEFAULT_COLS.join(',')).split(',').filter((k) => BY_KEY.has(k));
  return (saved.length ? saved : DEFAULT_COLS).map((k) => BY_KEY.get(k) as Column);
}

function sortState(): { key: string; dir: 1 | -1 } {
  const [key, dir] = get('sort', 'c:desc').split(':');
  return { key: BY_KEY.has(key) ? key : 'c', dir: dir === 'asc' ? 1 : -1 };
}

const cmp = (a: string | number, b: string | number): number =>
  typeof a === 'number' && typeof b === 'number' ? (a === b ? 0 : a < b ? -1 : 1) : String(a).localeCompare(String(b), undefined, { numeric: true });

/** The list that is on the page now. The settings pane draws it again after a change. */
let redrawList: (() => void) | undefined;

/** The column pane of the settings: a check box for each column, and a reset. A change redraws the list. */
export function mountColumnPane(host: HTMLElement): void {
  const draw = (): void => {
    const vis = visibleColumns().map((c) => c.key);
    const order = [...vis, ...COLUMNS.map((c) => c.key).filter((k) => !vis.includes(k))];
    host.innerHTML = '<p class="set-note">Pick the columns of the ticket list. To move a column, drag its header in the list, or press Alt and an arrow key on the header.</p><div class="rp-cols-body">' +
      order.map((k) => `<label><input type="checkbox" data-col="${k}"${vis.includes(k) ? ' checked' : ''}> ${BY_KEY.get(k)!.label}</label>`).join('') +
      '</div><button type="button" data-reset class="rp-reset">Reset columns, widths and sort</button>';
  };
  host.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    const vis = visibleColumns().map((c) => c.key);
    const next = input.checked ? [...vis, input.dataset.col as string] : vis.filter((k) => k !== input.dataset.col);
    set({ cols: (next.length ? next : vis).join(',') }); // at least one column stays on
    draw();
    redrawList?.();
  });
  host.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('[data-reset]')) {
      set({ cols: DEFAULT_COLS.join(','), sort: 'c:desc', widths: '' });
      draw();
      redrawList?.();
    }
  });
  window.addEventListener('rp-columns-changed', draw);
  draw();
}

/** Build the list. It returns a function that draws a set of tickets. */
export function ticketList(list: HTMLElement, toolbar: HTMLElement): (tickets: Ticket[]) => void {
  let current: Ticket[] = [];
  let dragging = '';
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'rp-colbtn';
  open.innerHTML = '<i class="bi bi-layout-three-columns"></i> Columns';
  open.addEventListener('click', () => openSettings('columns'));
  toolbar.append(open);
  redrawList = () => draw(current);
  const save = (cols: string[]): void => {
    set({ cols: cols.join(',') });
    draw(current);
    window.dispatchEvent(new CustomEvent('rp-columns-changed'));
  };

  /** Move a visible column to the place of another one. */
  const moveColumn = (from: string, to: string): void => {
    const vis = visibleColumns().map((c) => c.key);
    if (from === to || !vis.includes(from) || !vis.includes(to)) {
      return;
    }
    const target = vis.indexOf(to); // moving left puts it before the target; moving right, after it
    vis.splice(vis.indexOf(from), 1);
    vis.splice(target, 0, from);
    save(vis);
  };

  list.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('th[data-key]') as HTMLElement | null;
    if (th) {
      const s = sortState();
      const key = th.dataset.key as string;
      set({ sort: `${key}:${s.key === key && s.dir === 1 ? 'desc' : 'asc'}` });
      draw(current);
    }
  });

  function draw(tickets: Ticket[]): void {
    current = tickets;
    const cols = visibleColumns();
    const s = sortState();
    const col = BY_KEY.get(s.key) as Column;
    const rows = tickets.slice().sort((a, b) => s.dir * cmp(col.value(a), col.value(b)) || b.c - a.c).slice(0, MAX_ROWS);
    const widths = widthState();
    const head = cols.map((c) => {
      const on = c.key === s.key;
      const w = widths.get(c.key) ?? 140;
      return `<th data-key="${c.key}" draggable="true" title="Click to sort. Drag to move. Drag the right edge to resize."${widths.size ? ` style="width:${w}px"` : ''} class=""${c.align === 'end' ? 'text-end ' : ''}rp-sort" tabindex="0" role="columnheader" aria-sort="${on ? (s.dir === 1 ? 'ascending' : 'descending') : 'none'}">${c.label}<span class="rp-arrow">${on ? (s.dir === 1 ? ' &#9650;' : ' &#9660;') : ''}</span><span class="rp-grip" role="separator" aria-orientation="vertical" aria-label="Resize ${c.label}"></span></th>`;
    }).join('');
    const total = cols.reduce((a, c) => a + (widths.get(c.key) ?? 140), 0);
    list.innerHTML = `<table class="table table-sm table-hover${widths.size ? ' rp-fixed' : ''}"${widths.size ? ` style="width:${total}px"` : ''}><thead><tr>${head}</tr></thead><tbody>${rows.map((t) =>
      `<tr>${cols.map((c) => `<td${c.align === 'end' ? ' class="text-end"' : ''}>${esc(String(c.show ? c.show(t) : c.value(t)))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    list.querySelectorAll<HTMLElement>('th[data-key]').forEach((th) => {
      const key = th.dataset.key as string;
      th.addEventListener('keydown', (e) => {
        const vis = visibleColumns().map((c) => c.key);
        const i = vis.indexOf(key);
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          th.click();
        } else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && vis[i + (e.key === 'ArrowLeft' ? -1 : 1)]) {
          e.preventDefault(); // Alt + arrow moves the column; the keyboard way to drag
          moveColumn(key, vis[i + (e.key === 'ArrowLeft' ? -1 : 1)]);
          list.querySelector<HTMLElement>(`th[data-key="${key}"]`)?.focus();
        }
      });
      const grip = th.querySelector('.rp-grip') as HTMLElement;
      grip.addEventListener('click', (e) => e.stopPropagation()); // a resize is not a sort
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        th.draggable = false; // the grip resizes; it does not start a column drag
        grip.setPointerCapture(e.pointerId);
        const table = th.closest('table') as HTMLTableElement;
        // Switch to fixed widths. Start from the widths that the browser gave.
        const w = widthState();
        for (const h of table.querySelectorAll<HTMLElement>('th[data-key]')) {
          if (!w.has(h.dataset.key as string)) {
            w.set(h.dataset.key as string, h.offsetWidth);
          }
        }
        table.classList.add('rp-fixed');
        const startX = e.clientX, startW = w.get(key) as number;
        const apply = (): void => {
          table.querySelectorAll<HTMLElement>('th[data-key]').forEach((h) => { h.style.width = `${w.get(h.dataset.key as string)}px`; });
          table.style.width = `${[...table.querySelectorAll<HTMLElement>('th[data-key]')].reduce((a, h) => a + (w.get(h.dataset.key as string) ?? 140), 0)}px`;
        };
        apply();
        const move = (m: PointerEvent): void => { w.set(key, Math.max(MIN_WIDTH, startW + m.clientX - startX)); apply(); };
        const stop = (): void => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', stop);
          grip.removeEventListener('pointercancel', stop);
          th.draggable = true;
          saveWidths(w);
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', stop);
        grip.addEventListener('pointercancel', stop);
      });
      th.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/plain', key); dragging = key; th.classList.add('rp-drag'); });
      th.addEventListener('dragend', () => { dragging = ''; list.querySelectorAll('.rp-drag, .rp-over').forEach((x) => x.classList.remove('rp-drag', 'rp-over')); });
      th.addEventListener('dragover', (e) => { if (dragging) { e.preventDefault(); th.classList.add('rp-over'); } });
      th.addEventListener('dragleave', () => th.classList.remove('rp-over'));
      th.addEventListener('drop', (e) => { e.preventDefault(); moveColumn(dragging, key); });
    });
  }
  return draw;
}
