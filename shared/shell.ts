// The app shell. It builds the left navigation from a list of sections and
// shows one section at a time. It adds the brand, the link back to the index,
// the theme switch, and a header with a badge and a caption for each section.
// It redraws the current section when the theme changes.

import type { Section } from './section.ts';
import {
  applyTheme,
  createHomeLink,
  currentTheme,
  onThemeChange
} from './theme.ts';
import { mountSettings, type SettingsOptions } from './settings.ts';
import { createViewToggle, onViewChange, withMode } from './view-mode.ts';

export interface ShellOptions {
  readonly brand: string;
  readonly subtitle: string;
  /** A Bootstrap Icons class for the brand. */
  readonly brandIcon: string;
  readonly sections: Section[];
  /** The ids of sections that show a "proposed" badge. */
  readonly proposedIds?: string[];
  /** Extra panes for the settings, and where the text size is kept. The theme and the text size are always there. */
  readonly settings?: Pick<SettingsOptions, 'panes' | 'textSize'>;
  /** Show the link back to the index. The default is true. */
  readonly homeLink?: boolean;
  /**
   * The video of the app: the id of its section, and the chapter start of each
   * section, in seconds. A section with a chapter shows a "Watch this part" link.
   */
  readonly video?: { readonly sectionId: string; readonly chapterStarts: Promise<Map<string, number>> };
}

/** Splits a URL fragment such as #video&t=95 into the section id and its parameters. */
function readHash(): { id: string; params: URLSearchParams } {
  const [id, ...rest] = location.hash.replace('#', '').split('&');
  return { id, params: new URLSearchParams(rest.join('&')) };
}

const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const SB_KEY = 'sidebar-width';
const SB_MIN = 200;

/** Make the left panel resizable: a drag handle, arrow keys, and a saved width. */
function mountResizer(nav: HTMLElement): void {
  const shell = nav.parentElement as HTMLElement;
  const max = (): number => Math.min(560, Math.round(window.innerWidth * 0.5));
  const clamp = (w: number): number => Math.max(SB_MIN, Math.min(max(), Math.round(w)));
  const handle = document.createElement('div');
  handle.className = 'sb-resizer';
  handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', 'vertical');
  handle.setAttribute('aria-label', 'Resize the left panel');
  handle.tabIndex = 0;
  const apply = (w: number, save: boolean): void => {
    const width = clamp(w);
    shell.style.setProperty('--sb-w', `${width}px`);
    handle.setAttribute('aria-valuenow', String(width));
    handle.setAttribute('aria-valuemin', String(SB_MIN));
    handle.setAttribute('aria-valuemax', String(max()));
    if (save) {
      try { localStorage.setItem(SB_KEY, String(width)); } catch { /* no storage */ }
    }
  };
  let saved = NaN;
  try { saved = Number(localStorage.getItem(SB_KEY)); } catch { /* no storage */ }
  apply(Number.isFinite(saved) && saved > 0 ? saved : 280, false);
  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('drag');
    const move = (m: PointerEvent): void => apply(m.clientX - shell.getBoundingClientRect().left, true);
    const stop = (): void => {
      handle.classList.remove('drag');
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  });
  handle.addEventListener('keydown', (e) => {
    const now = Number(handle.getAttribute('aria-valuenow'));
    const step = e.shiftKey ? 48 : 16;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      apply(now + (e.key === 'ArrowRight' ? step : -step), true);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      apply(e.key === 'Home' ? SB_MIN : max(), true);
    }
  });
  handle.addEventListener('dblclick', () => apply(280, true));
  window.addEventListener('resize', () => apply(Number(handle.getAttribute('aria-valuenow')), false));
  shell.append(handle);
}

/** Mount the shell into #side-nav and #content. */
export function mountShell(options: ShellOptions): void {
  applyTheme(currentTheme());
  const nav = document.getElementById('side-nav') as HTMLElement;
  const content = document.getElementById('content') as HTMLElement;
  mountResizer(nav);
  const proposed = new Set(options.proposedIds ?? []);
  // The Video / Text switch and the mode parameter apply only to an app with a text version.
  const hasText = options.sections.some((s) => s.hasTextView);

  let cleanup: (() => void) | undefined;
  let activeSection: Section | undefined;
  let disposeHeadToggle: (() => void) | undefined;
  const buttons = new Map<string, HTMLButtonElement>();

  function show(section: Section, params = new URLSearchParams()): void {
    cleanup?.();
    cleanup = undefined;
    disposeHeadToggle?.();
    disposeHeadToggle = undefined;
    content.innerHTML = '';
    activeSection = section;
    for (const [id, button] of buttons) {
      button.classList.toggle('active', id === section.id);
    }
    // The fragment always names the view, so a copied address opens the same view.
    const extra = (hasText ? withMode(params) : params).toString();
    history.replaceState(null, '', '#' + section.id + (extra ? '&' + extra : ''));

    const head = document.createElement('div');
    head.className = 'page-head';
    const titleRow = document.createElement('div');
    titleRow.className = 'd-flex align-items-baseline flex-wrap gap-2';
    const h1 = document.createElement('h1');
    h1.textContent = section.title;
    const badge = document.createElement('span');
    badge.className = 'badge text-bg-secondary';
    badge.textContent = section.badge;
    titleRow.append(h1, badge);
    if (section.hasTextView) {
      const [toggle, dispose] = createViewToggle('ms-auto');
      disposeHeadToggle = dispose;
      titleRow.append(toggle);
    }
    if (proposed.has(section.id)) {
      const flag = document.createElement('span');
      flag.className = 'badge text-bg-warning';
      flag.textContent = 'proposed';
      titleRow.append(flag);
    }
    const caption = document.createElement('p');
    caption.className = 'caption';
    caption.textContent = section.caption;
    head.append(titleRow, caption);
    content.append(head);
    const video = options.video;
    if (video && section.id !== video.sectionId) {
      void video.chapterStarts.then((starts) => {
        const start = starts.get(section.id);
        if (start === undefined || activeSection !== section) {
          return;
        }
        const link = document.createElement('a');
        link.className = 'ms-2 small';
        link.href = `#${video.sectionId}&t=${start}${hasText ? '&mode=video' : ''}`;
        link.innerHTML = `<i class="bi bi-play-circle"></i> Watch this part (${clock(start)})`;
        caption.append(link);
      });
    }

    const body = document.createElement('div');
    content.append(body);
    const result = section.render(body, params);
    if (typeof result === 'function') {
      cleanup = result;
    }
    content.scrollTop = 0;
  }

  // Brand.
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = `<i class="bi ${options.brandIcon}"></i> ${options.brand}<small>${options.subtitle}</small>`;
  nav.append(brand);
  if (options.homeLink !== false) {
    nav.append(createHomeLink());
  }
  if (hasText) {
    const viewRow = document.createElement('div');
    viewRow.className = 'view-row';
    viewRow.innerHTML = '<span>Show</span>';
    viewRow.append(createViewToggle()[0]);
    nav.append(viewRow);
  }

  // Groups and items.
  const groups = new Map<string, Section[]>();
  for (const section of options.sections) {
    const list = groups.get(section.group) ?? [];
    list.push(section);
    groups.set(section.group, list);
  }
  for (const [group, list] of groups) {
    const title = document.createElement('div');
    title.className = 'nav-group-title';
    title.textContent = group;
    nav.append(title);
    for (const section of list) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-item';
      button.innerHTML = `<i class="bi ${section.icon}"></i><span>${section.title}</span>`;
      button.addEventListener('click', () => show(section));
      nav.append(button);
      buttons.set(section.id, button);
    }
  }

  mountSettings({
    ...options.settings,
    onChange: () => {
      if (activeSection) {
        show(activeSection);
      }
    }
  });

  onThemeChange(() => {
    if (activeSection) {
      show(activeSection);
    }
  });
  onViewChange(() => {
    if (activeSection) {
      show(activeSection);
    }
  });

  // A link inside the app, such as a chapter link, changes the fragment.
  window.addEventListener('hashchange', () => {
    const { id, params } = readHash();
    const section = options.sections.find((s) => s.id === id);
    if (section) {
      show(section, params);
    }
  });

  const { id, params } = readHash();
  const first = options.sections.find((s) => s.id === id);
  show(first ?? options.sections[0], first ? params : undefined);
}
