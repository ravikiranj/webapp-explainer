// The app shell. It builds the left navigation from a list of sections and
// shows one section at a time. It adds the brand, the link back to the index,
// the theme switch, and a header with a badge and a caption for each section.
// It redraws the current section when the theme changes.

import type { Section } from './section.ts';
import {
  applyTheme,
  createHomeLink,
  createThemeToggle,
  currentTheme,
  onThemeChange
} from './theme.ts';

export interface ShellOptions {
  readonly brand: string;
  readonly subtitle: string;
  /** A Bootstrap Icons class for the brand. */
  readonly brandIcon: string;
  readonly sections: Section[];
  /** The ids of sections that show a "proposed" badge. */
  readonly proposedIds?: string[];
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

/** Mount the shell into #side-nav and #content. */
export function mountShell(options: ShellOptions): void {
  applyTheme(currentTheme());
  const nav = document.getElementById('side-nav') as HTMLElement;
  const content = document.getElementById('content') as HTMLElement;
  const proposed = new Set(options.proposedIds ?? []);

  let cleanup: (() => void) | undefined;
  let activeSection: Section | undefined;
  const buttons = new Map<string, HTMLButtonElement>();

  function show(section: Section, params = new URLSearchParams()): void {
    cleanup?.();
    cleanup = undefined;
    content.innerHTML = '';
    activeSection = section;
    for (const [id, button] of buttons) {
      button.classList.toggle('active', id === section.id);
    }
    const extra = params.toString();
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
        link.href = `#${video.sectionId}&t=${start}`;
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
  nav.append(createThemeToggle());

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

  onThemeChange(() => {
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
