// The controls in the sidebar: the text size and the colour palette. A change redraws the current slide.

import { applyTheme, currentTheme } from '../../../../shared/theme.ts';
import { PALETTES } from './palettes.ts';
import { get, set } from './state.ts';

export const SIZES: Record<string, number> = { xxs: 12, xs: 13.5, s: 15, m: 16.5, l: 18 };

/** Apply the saved size and palette to the page. */
export function applyLook(): void {
  document.documentElement.style.fontSize = `${SIZES[get('size', 's')]}px`;
  const accent = PALETTES[get('palette', 'classic')].accent;
  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--sb-active', accent);
  document.querySelectorAll<HTMLButtonElement>('.rp-side [data-size]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.size === get('size', 's'))));
  document.querySelectorAll<HTMLButtonElement>('.rp-side [data-palette]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.palette === get('palette', 'classic'))));
}

export function mountSidebarControls(): void {
  const box = document.createElement('div');
  box.className = 'rp-side';
  box.innerHTML = `Text size<div class="row" id="rp-sizes">${Object.keys(SIZES).map((k) => `<button type="button" data-size="${k}">${k.toUpperCase()}</button>`).join('')}</div>
    Palette<div class="row" id="rp-palettes">${Object.entries(PALETTES).map(([k, p]) => `<button type="button" data-palette="${k}" title="${p.name}" aria-label="${p.name}"><span class="sw">${p.items.slice(0, 4).map((c) => `<i style="background:${c}"></i>`).join('')}</span></button>`).join('')}</div>`;
  document.getElementById('side-nav')?.append(box);
  const redraw = (): void => { applyLook(); applyTheme(currentTheme()); };
  box.querySelectorAll<HTMLButtonElement>('[data-size]').forEach((b) => b.addEventListener('click', () => { set({ size: b.dataset.size as string }); redraw(); }));
  box.querySelectorAll<HTMLButtonElement>('[data-palette]').forEach((b) => b.addEventListener('click', () => { set({ palette: b.dataset.palette as string }); redraw(); }));
  applyLook();
}
