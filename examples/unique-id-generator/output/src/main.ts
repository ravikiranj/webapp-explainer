import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import './style.css';

import type { Section } from './section.ts';
import { problem } from './sections/problem.ts';
import { overview } from './sections/overview.ts';
import { simulation } from './sections/simulation.ts';
import { stageSections } from './sections/stages.ts';
import { techniques } from './sections/techniques.ts';
import { applyTheme, createHomeLink, createThemeToggle, currentTheme, onThemeChange } from './theme.ts';

const sections: Section[] = [problem, overview, simulation, ...stageSections, techniques];

// Apply the saved theme before the first paint.
applyTheme(currentTheme());
const PROPOSED_ID = 'stage-100';
const BRAND = 'Unique ID Generator';
const SUBTITLE = 'one node to many regions';

const nav = document.getElementById('side-nav') as HTMLElement;
const content = document.getElementById('content') as HTMLElement;

let cleanup: (() => void) | undefined;
let activeButton: HTMLButtonElement | undefined;
let activeSection: Section | undefined;

function show(section: Section, button: HTMLButtonElement): void {
  cleanup?.();
  cleanup = undefined;
  content.innerHTML = '';

  activeButton?.classList.remove('active');
  button.classList.add('active');
  activeButton = button;
  activeSection = section;

  const head = document.createElement('div');
  head.className = 'section-head';
  const titleWrap = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.textContent = section.title;
  const caption = document.createElement('p');
  caption.className = 'caption';
  caption.textContent = section.caption;
  titleWrap.append(h1, caption);
  head.append(titleWrap);

  const tag = document.createElement('span');
  tag.className = 'tag';
  tag.textContent = section.badge;
  head.append(tag);

  if (section.id === PROPOSED_ID) {
    const prop = document.createElement('span');
    prop.className = 'tag proposed';
    prop.textContent = 'proposed';
    head.append(prop);
  }

  content.append(head);
  const body = document.createElement('div');
  content.append(body);
  const result = section.render(body);
  if (typeof result === 'function') {
    cleanup = result;
  }
  content.scrollTop = 0;
}

function buildNav(): void {
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = `${BRAND}<small>${SUBTITLE}</small>`;
  nav.append(brand);
  nav.append(createHomeLink());
  nav.append(createThemeToggle());

  const groups = new Map<string, Section[]>();
  for (const section of sections) {
    const list = groups.get(section.group) ?? [];
    list.push(section);
    groups.set(section.group, list);
  }

  const buttons: { section: Section; button: HTMLButtonElement }[] = [];
  for (const [group, list] of groups) {
    const title = document.createElement('div');
    title.className = 'nav-group-title';
    title.textContent = group;
    nav.append(title);
    for (const section of list) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.innerHTML =
        `<span class="ico">${section.icon}</span>` +
        `<span class="meta"><span>${section.title}</span>` +
        `<span class="badge-mini">${section.badge}</span></span>`;
      button.addEventListener('click', () => show(section, button));
      nav.append(button);
      buttons.push({ section, button });
    }
  }

  if (buttons.length > 0) {
    show(buttons[0].section, buttons[0].button);
  }
}

buildNav();

onThemeChange(() => {
  if (activeSection && activeButton) {
    show(activeSection, activeButton);
  }
});
