import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';
import { marked } from 'marked';
import designDoc from './design.md?raw';
import { APPS } from './apps.ts';
import { applyTheme, createThemeToggle, currentTheme } from './theme.ts';

applyTheme(currentTheme());

const nav = document.getElementById('side-nav') as HTMLElement;
const content = document.getElementById('content') as HTMLElement;

type View = { kind: 'design' } | { kind: 'app'; slug: string };

let activeButton: HTMLButtonElement | undefined;

/** Render the design document as markdown. This is the default view. */
function renderDesign(): void {
  content.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.textContent = 'The design';
  content.append(h1);
  const caption = document.createElement('p');
  caption.className = 'caption';
  caption.textContent = 'Every example app on the left is built to this design.';
  content.append(caption);
  const md = document.createElement('div');
  md.className = 'markdown';
  md.innerHTML = marked.parse(designDoc, { async: false }) as string;
  content.append(md);
  content.scrollTop = 0;
}

/** Render a single app's detail with a large link to open it. */
function renderApp(slug: string): void {
  const app = APPS.find((a) => a.slug === slug);
  if (!app) {
    renderDesign();
    return;
  }
  content.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.textContent = `${app.icon} ${app.title}`;
  content.append(h1);
  const caption = document.createElement('p');
  caption.className = 'caption';
  caption.textContent = app.subtitle;
  content.append(caption);

  const card = document.createElement('div');
  card.className = 'detail-card';
  const dataChip =
    app.dataKind === 'real'
      ? '<span class="chip real">real cited data</span>'
      : '<span class="chip mock">mock teaching data</span>';
  card.innerHTML =
    `<div class="domain">${app.domain}</div>` +
    `<p class="summary">${app.summary}</p>` +
    `<div class="chips">${dataChip}${app.stages.map((s) => `<span class="chip">${s}</span>`).join('')}</div>` +
    `<a class="open-btn" href="./examples/${app.slug}/">Open the ${app.title} app →</a>`;
  content.append(card);
  content.scrollTop = 0;
}

function setActive(button: HTMLButtonElement): void {
  activeButton?.classList.remove('active');
  button.classList.add('active');
  activeButton = button;
}

function show(view: View, button: HTMLButtonElement): void {
  setActive(button);
  if (view.kind === 'design') {
    renderDesign();
  } else {
    renderApp(view.slug);
  }
}

function buildNav(): void {
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = 'Webapp Explainer<small>concept explainer apps</small>';
  nav.append(brand);
  nav.append(createThemeToggle());

  // Design is the default view and sits at the top.
  const guideTitle = document.createElement('div');
  guideTitle.className = 'nav-group-title';
  guideTitle.textContent = 'Guide';
  nav.append(guideTitle);

  const designBtn = document.createElement('button');
  designBtn.className = 'nav-item';
  designBtn.innerHTML = '<span class="ico">📐</span><span class="meta"><span>Design</span><span class="badge-mini">the template</span></span>';
  designBtn.addEventListener('click', () => show({ kind: 'design' }, designBtn));
  nav.append(designBtn);

  // The example apps are listed below the design.
  const appsTitle = document.createElement('div');
  appsTitle.className = 'nav-group-title';
  appsTitle.textContent = `Example apps (${APPS.length})`;
  nav.append(appsTitle);

  for (const app of APPS) {
    const button = document.createElement('button');
    button.className = 'nav-item';
    button.innerHTML =
      `<span class="ico">${app.icon}</span>` +
      `<span class="meta"><span>${app.title}</span>` +
      `<span class="badge-mini">${app.domain}</span></span>`;
    button.addEventListener('click', () => show({ kind: 'app', slug: app.slug }, button));
    nav.append(button);
  }

  // Show the design by default.
  show({ kind: 'design' }, designBtn);
}

buildNav();
