// The report panes of the shared settings: colours, the ticket list columns, and the data downloads.
// The theme and the text size are in the shared Appearance pane. This file also applies the saved look.

import { applyTextSize, TEXT_SIZE, type SettingsPane } from '../../../../shared/settings.ts';
import { PALETTES, type Palette } from './palettes.ts';
import { get, set } from './state.ts';
import { mountColumnPane } from './tickets.ts';

/** The text size is kept in the link state, so that a copied link opens the same view. */
export const textSize = {
  get: (): number => Number(get('size', String(TEXT_SIZE.default))),
  set: (px: number): void => set({ size: String(px) })
};

/** Apply the saved size and palette to the page. */
export function applyLook(): void {
  applyTextSize(textSize.get());
  const accent = PALETTES[get('palette', 'classic')].accent;
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--sb-active', accent);
}

/** A small sample chart in the colours of a palette: grouped bars, a total line and a cause mix bar. */
function miniChart(p: Palette): string {
  const heights = [14, 22, 17, 26, 20];
  const bars = p.items.map((col, i) => `<rect x="${4 + i * 11}" y="${34 - heights[i]}" width="8" height="${heights[i]}" rx="1.5" fill="${col}"/>`).join('');
  const line = `<polyline points="${heights.map((h, i) => `${8 + i * 11},${30 - h * 0.9 - 4}`).join(' ')}" fill="none" stroke="${p.overall[0]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
  const mix = Object.values(p.causes).map((col, i) => `<rect x="${66 + i * 9}" y="8" width="9" height="6" fill="${col}"/>`).join('');
  return `<svg class="rp-mini" viewBox="0 0 114 38" role="img" aria-label="Sample chart in the colours of ${p.name}">${mix}<rect x="66" y="22" width="40" height="6" rx="3" fill="${p.accent}"/>${bars}${line}</svg>`;
}

export const reportPanes: SettingsPane[] = [
  {
    id: 'colors',
    title: 'Colours',
    icon: 'bi-palette',
    render(host, changed) {
      host.innerHTML = `<div class="set-h">Palette (${Object.keys(PALETTES).length})</div><div class="rp-pals" id="rp-palettes">${Object.entries(PALETTES).map(([k, p]) =>
        `<button type="button" class="rp-pal" data-palette="${k}"><span class="rp-pal-name">${p.name}</span><span class="rp-sw">${p.items.map((col) => `<i style="background:${col}"></i>`).join('')}</span>${miniChart(p)}</button>`).join('')}</div>`;
      const mark = (): void => host.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.palette === get('palette', 'classic'))));
      host.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach((b) => b.addEventListener('click', () => {
        set({ palette: b.dataset.palette as string });
        applyLook();
        mark();
        changed();
      }));
      mark();
    }
  },
  {
    id: 'columns',
    title: 'Ticket list',
    icon: 'bi-layout-three-columns',
    render(host) {
      host.innerHTML = '<div class="set-h">Columns</div><div id="rp-colpane"></div>';
      mountColumnPane(host.querySelector('#rp-colpane') as HTMLElement);
    }
  },
  {
    id: 'data',
    title: 'Data',
    icon: 'bi-download',
    render(host) {
      const files = [['JSON', 'report-data.json'], ['Tickets CSV', 'tickets.csv'], ['Weeks CSV', 'weeks.csv']];
      host.innerHTML = `<div class="set-h">Downloads</div><p class="set-note">The files hold no private text.</p><div class="set-links">${files.map(([l, f]) => `<a href="./${f}" download="${f}"><i class="bi bi-download"></i> ${l}</a>`).join('')}</div>`;
    }
  }
];
