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
}

/** Mount the shell into #side-nav and #content. */
export function mountShell(options: ShellOptions): void {
  applyTheme(currentTheme());
  const nav = document.getElementById('side-nav') as HTMLElement;
  const content = document.getElementById('content') as HTMLElement;
  const proposed = new Set(options.proposedIds ?? []);

  let cleanup: (() => void) | undefined;
  let activeSection: Section | undefined;
  const buttons = new Map<string, HTMLButtonElement>();

  function show(section: Section): void {
    cleanup?.();
    cleanup = undefined;
    content.innerHTML = '';
    activeSection = section;
    for (const [id, button] of buttons) {
      button.classList.toggle('active', id === section.id);
    }
    history.replaceState(null, '', '#' + section.id);

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

    const body = document.createElement('div');
    content.append(body);
    const result = section.render(body);
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

  const wanted = location.hash.replace('#', '');
  show(options.sections.find((s) => s.id === wanted) ?? options.sections[0]);
}
