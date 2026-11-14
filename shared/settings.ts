// The settings of every app. A big button at the top right opens a dialog with a list of panes on the
// left and the settings of one pane on the right. Every app gets an "Appearance" pane (theme and text
// size). An app adds its own panes, for example colours or data downloads, with the `panes` option.

import { applyTheme, currentTheme } from './theme.ts';

export interface SettingsPane {
  readonly id: string;
  readonly title: string;
  /** A Bootstrap Icons class. */
  readonly icon: string;
  /** Draw the pane into host. Call changed() after a change that needs a redraw of the section. */
  readonly render: (host: HTMLElement, changed: () => void) => void;
}

export interface SettingsOptions {
  readonly panes?: SettingsPane[];
  /** Where the text size is kept. The default is localStorage. */
  readonly textSize?: { get: () => number; set: (px: number) => void };
  /** Runs after a change that needs a redraw of the current section. */
  readonly onChange: () => void;
}

/** The text size is the root font size in px. Every size in the apps follows the root. */
export const TEXT_SIZE = { min: 12, max: 22, step: 0.5, default: 15 };
const SIZE_KEY = 'webapp-explainer-size';

/** Keep a size inside the limits, in steps of half a pixel. */
export function clampTextSize(px: number): number {
  const n = Number.isFinite(px) ? px : TEXT_SIZE.default;
  return Math.min(TEXT_SIZE.max, Math.max(TEXT_SIZE.min, Math.round(n / TEXT_SIZE.step) * TEXT_SIZE.step));
}

export function savedTextSize(): number {
  try {
    const v = localStorage.getItem(SIZE_KEY);
    return v === null ? TEXT_SIZE.default : clampTextSize(Number(v)); // an old name such as "m" gives the default
  } catch {
    return TEXT_SIZE.default;
  }
}

/** Apply a text size, in px, to the document root. */
export function applyTextSize(px: number): void {
  document.documentElement.style.fontSize = `${clampTextSize(px)}px`;
}

/** Open the settings at a pane from anywhere in the page. */
export function openSettings(paneId?: string): void {
  window.dispatchEvent(new CustomEvent('app-settings', { detail: paneId }));
}

export function mountSettings(options: SettingsOptions): void {
  const size = options.textSize ?? {
    get: savedTextSize,
    set: (px: number) => {
      try { localStorage.setItem(SIZE_KEY, String(px)); } catch { /* no storage */ }
    }
  };
  applyTextSize(size.get());

  const appearance: SettingsPane = {
    id: 'appearance',
    title: 'Appearance',
    icon: 'bi-sliders',
    render(host, changed) {
      host.innerHTML = `<div class="set-h">Theme</div><div class="set-row" data-group="theme">
          <button type="button" data-theme="light"><i class="bi bi-sun"></i> Light</button>
          <button type="button" data-theme="dark"><i class="bi bi-moon-stars"></i> Dark</button></div>
        <div class="set-h">Text size</div>
        <div class="set-size">
          <button type="button" data-step="-1" aria-label="Smaller text">&minus;</button>
          <input type="range" id="app-size" min="${TEXT_SIZE.min}" max="${TEXT_SIZE.max}" step="${TEXT_SIZE.step}" aria-label="Text size in pixels">
          <button type="button" data-step="1" aria-label="Larger text">+</button>
          <output id="app-size-value" for="app-size"></output>
          <button type="button" data-size-reset>Reset</button>
        </div>
        <p class="set-note">The size of the text in pixels. The default is ${TEXT_SIZE.default}. Spacing and charts follow it.</p>`;
      const range = host.querySelector('#app-size') as HTMLInputElement;
      const out = host.querySelector('#app-size-value') as HTMLElement;
      const mark = (): void => {
        host.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.theme === currentTheme())));
        range.value = String(size.get());
        out.textContent = `${size.get()} px`;
      };
      host.querySelectorAll<HTMLButtonElement>('[data-theme]').forEach((b) => b.addEventListener('click', () => {
        applyTheme(b.dataset.theme as 'light' | 'dark'); // the shell redraws on a theme change
        mark();
      }));
      const setSize = (px: number): void => {
        const next = clampTextSize(px);
        if (next !== size.get()) {
          size.set(next);
          applyTextSize(next);
          changed(); // charts read the root size when they draw
        }
        mark();
      };
      range.addEventListener('input', () => { out.textContent = `${range.value} px`; });
      range.addEventListener('change', () => setSize(Number(range.value)));
      host.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) => b.addEventListener('click', () => setSize(size.get() + Number(b.dataset.step) * (TEXT_SIZE.step * 2))));
      host.querySelector('[data-size-reset]')?.addEventListener('click', () => setSize(TEXT_SIZE.default));
      mark();
    }
  };
  const panes = [appearance, ...(options.panes ?? [])];

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'app-settings-button';
  button.className = 'settings-button';
  button.setAttribute('aria-label', 'Open settings');
  button.innerHTML = '<i class="bi bi-gear-fill"></i><span>Settings</span>';

  const dialog = document.createElement('dialog');
  dialog.id = 'app-settings';
  dialog.className = 'app-settings';
  dialog.setAttribute('aria-labelledby', 'app-settings-title');
  dialog.innerHTML = `<div class="set-head"><h2 id="app-settings-title"><i class="bi bi-gear-fill"></i> Settings</h2>
      <button type="button" class="set-close" aria-label="Close settings"><i class="bi bi-x-lg"></i></button></div>
    <div class="set-main">
      <nav class="set-nav" role="tablist" aria-orientation="vertical">${panes.map((p) => `<button type="button" role="tab" data-pane="${p.id}"><i class="bi ${p.icon}"></i> ${p.title}</button>`).join('')}</nav>
      <div class="set-panes">${panes.map((p) => `<section data-pane="${p.id}" role="tabpanel" hidden></section>`).join('')}</div>
    </div>`;
  document.body.append(button, dialog);

  const show = (id: string): void => {
    dialog.querySelectorAll<HTMLElement>('[data-pane]').forEach((el) => {
      const on = el.dataset.pane === id;
      if (el.tagName === 'SECTION') {
        el.hidden = !on;
      } else {
        el.classList.toggle('on', on);
        el.setAttribute('aria-selected', String(on));
      }
    });
  };
  for (const pane of panes) {
    pane.render(dialog.querySelector(`section[data-pane="${pane.id}"]`) as HTMLElement, options.onChange);
  }
  dialog.querySelectorAll<HTMLElement>('nav [data-pane]').forEach((b) => b.addEventListener('click', () => show(b.dataset.pane as string)));
  const open = (id?: string): void => {
    show(panes.some((p) => p.id === id) ? (id as string) : panes[0].id);
    if (!dialog.open) {
      dialog.showModal();
    }
  };
  button.addEventListener('click', () => open());
  window.addEventListener('app-settings', (e) => open((e as CustomEvent<string | undefined>).detail));
  dialog.querySelector('.set-close')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    const r = dialog.getBoundingClientRect();
    const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    if (e.target === dialog && outside) {
      dialog.close(); // a click on the backdrop closes it; a drag of the resize corner does not
    }
  });
  show(panes[0].id);

  // Drag the dialog by its header. The first drag turns the centred dialog into a placed one.
  const head = dialog.querySelector('.set-head') as HTMLElement;
  head.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    e.preventDefault();
    head.setPointerCapture(e.pointerId);
    const box = dialog.getBoundingClientRect();
    const dx = e.clientX - box.left, dy = e.clientY - box.top;
    dialog.style.margin = '0';
    dialog.style.position = 'fixed';
    const move = (m: PointerEvent): void => {
      const w = dialog.offsetWidth, h = dialog.offsetHeight;
      dialog.style.left = `${Math.max(0, Math.min(window.innerWidth - Math.min(w, 120), m.clientX - dx))}px`;
      dialog.style.top = `${Math.max(0, Math.min(window.innerHeight - Math.min(h, 60), m.clientY - dy))}px`;
    };
    const stop = (): void => {
      head.removeEventListener('pointermove', move);
      head.removeEventListener('pointerup', stop);
      head.removeEventListener('pointercancel', stop);
    };
    move(e);
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
  });
}
