import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// Import the Bootstrap JavaScript one time. Without this import, the
// interactive Bootstrap parts do not work.
import 'bootstrap';
import '../../../../shared/app.css';
import './style.css';
import { marked } from 'marked';
import problemText from './problem.md?raw';
import { applyTheme, createHomeLink, createThemeToggle, currentTheme } from './theme.ts';

import { CONCEPTS, type Concept } from './puzzles.ts';
import { ChessEngine } from './engine.ts';
import { Trainer } from './trainer.ts';
import {
  addProfile,
  loadState,
  setActiveProfile,
  solvedMap,
  type StoreState
} from './store.ts';

const nav = document.getElementById('side-nav') as HTMLElement;
const content = document.getElementById('content') as HTMLElement;

let state: StoreState = loadState();
const engine = new ChessEngine();
let trainer: Trainer | undefined;
let activeConcept: Concept = CONCEPTS[0];
let viewMode: 'concept' | 'problem' = 'concept';

applyTheme(currentTheme());

/** Count solved puzzles in a concept for the active profile. */
function solvedCount(concept: Concept): number {
  const solved = solvedMap(state);
  return concept.puzzles.filter((p) => solved[`${concept.id}:${p.id}`]).length;
}

function buildNav(): void {
  nav.innerHTML = '';
  const brand = document.createElement('div');
  brand.className = 'brand';
  brand.innerHTML = '<i class="bi bi-puzzle"></i> Chess Endgames<small>a trainer up to 1800 ELO</small>';
  nav.append(brand);
  nav.append(createHomeLink());
  nav.append(createThemeToggle());

  // Profile switcher.
  const box = document.createElement('div');
  box.className = 'profile-box';
  const label = document.createElement('label');
  label.textContent = 'Profile';
  const select = document.createElement('select');
  for (const name of state.profiles) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    opt.selected = name === state.activeProfile;
    select.append(opt);
  }
  select.addEventListener('change', () => {
    state = setActiveProfile(state, select.value);
    buildNav();
    openConcept(activeConcept);
  });
  const row = document.createElement('div');
  row.className = 'profile-row';
  const input = document.createElement('input');
  input.placeholder = 'New profile name';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';
  addBtn.addEventListener('click', () => {
    if (input.value.trim()) {
      state = addProfile(state, input.value);
      input.value = '';
      buildNav();
      openConcept(activeConcept);
    }
  });
  row.append(input, addBtn);
  box.append(label, select, row);
  nav.append(box);

  const title = document.createElement('div');
  title.className = 'nav-group-title';
  title.textContent = 'Guide';
  nav.append(title);

  const problemBtn = document.createElement('button');
  problemBtn.className = 'nav-item' + (viewMode === 'problem' ? ' active' : '');
  problemBtn.innerHTML = '<i class="bi bi-file-text"></i><span>The problem</span>';
  problemBtn.addEventListener('click', () => {
    viewMode = 'problem';
    buildNav();
    openProblem();
  });
  nav.append(problemBtn);

  const conceptTitle = document.createElement('div');
  conceptTitle.className = 'nav-group-title';
  conceptTitle.textContent = 'Concepts';
  nav.append(conceptTitle);

  for (const concept of CONCEPTS) {
    const button = document.createElement('button');
    button.className = 'nav-item' + (viewMode === 'concept' && concept.id === activeConcept.id ? ' active' : '');
    const done = solvedCount(concept);
    button.innerHTML =
      `<i class="bi ${concept.icon}"></i>` +
      `<span>${concept.title}</span>` +
      `<span class="count">${done}/${concept.puzzles.length}</span>`;
    button.addEventListener('click', () => {
      viewMode = 'concept';
      activeConcept = concept;
      buildNav();
      openConcept(concept);
    });
    nav.append(button);
  }
}

/** Render the original problem statement as markdown. */
function openProblem(): void {
  trainer?.dispose();
  trainer = undefined;
  content.innerHTML = '';
  const h1 = document.createElement('h1');
  h1.textContent = 'The problem';
  content.append(h1);
  const caption = document.createElement('p');
  caption.className = 'caption';
  caption.textContent = 'The original brief that this trainer is built for.';
  content.append(caption);
  const md = document.createElement('div');
  md.className = 'markdown';
  md.innerHTML = marked.parse(problemText, { async: false }) as string;
  content.append(md);
}

function openConcept(concept: Concept): void {
  trainer?.dispose();
  content.innerHTML = '';

  const h1 = document.createElement('h1');
  h1.textContent = concept.title;
  content.append(h1);

  const caption = document.createElement('p');
  caption.className = 'caption';
  caption.textContent = `${concept.idea} Target level: ${concept.elo} ELO.`;
  content.append(caption);

  const teach = document.createElement('div');
  teach.className = 'teach';
  teach.innerHTML =
    '<h2>The idea</h2><ul>' +
    concept.teach.map((t) => `<li>${t}</li>`).join('') +
    '</ul>';
  content.append(teach);

  const play = document.createElement('div');
  play.className = 'play';
  const boardHost = document.createElement('div');
  const sidePanel = document.createElement('div');
  sidePanel.className = 'side-panel';
  play.append(boardHost, sidePanel);
  content.append(play);

  const status = document.createElement('div');
  status.className = 'trainer-status';
  status.textContent = 'Loading the engine...';
  sidePanel.append(status);

  const controls = document.createElement('div');
  controls.className = 'controls';
  const prevBtn = document.createElement('button');
  prevBtn.textContent = '← Previous';
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset position';
  const solveBtn = document.createElement('button');
  solveBtn.textContent = '💡 Show solution';
  const nextBtn = document.createElement('button');
  nextBtn.className = 'primary';
  nextBtn.textContent = 'Next →';
  controls.append(prevBtn, resetBtn, solveBtn, nextBtn);
  sidePanel.append(controls);

  const progressLine = document.createElement('div');
  progressLine.className = 'progress-line';
  const progressBar = document.createElement('div');
  progressBar.className = 'progress mt-2';
  const fill = document.createElement('div');
  fill.className = 'progress-bar bg-success';
  progressBar.append(fill);
  sidePanel.append(progressLine, progressBar);

  const engineNote = document.createElement('div');
  engineNote.className = 'engine-note';
  engineNote.textContent =
    'The Stockfish engine runs on this device, from this app, as WebAssembly. ' +
    'It makes no network call. Progress saves on this device, per profile.';
  sidePanel.append(engineNote);

  function refreshProgress(): void {
    const done = solvedCount(concept);
    const total = concept.puzzles.length;
    progressLine.textContent = `Solved ${done} of ${total} positions as ${state.activeProfile}.`;
    fill.style.width = `${(done / total) * 100}%`;
    buildNav();
  }

  const t = new Trainer(concept, engine, boardHost, status, refreshProgress);
  trainer = t;
  prevBtn.addEventListener('click', () => t.previous());
  nextBtn.addEventListener('click', () => t.next());
  resetBtn.addEventListener('click', () => t.resetCurrent());
  solveBtn.addEventListener('click', () => t.showSolution());
  refreshProgress();
}

buildNav();
openConcept(activeConcept);
