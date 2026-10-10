// Theme control. The app supports a dark theme and a light theme. The choice
// is stored on the document root as data-theme and saved in localStorage. The
// charts read their colours from CSS variables, so a theme change updates the
// charts after a redraw.

export type Theme = 'dark' | 'light';

const KEY = 'webapp-explainer-theme';
const listeners: ((theme: Theme) => void)[] = [];

/** Read the saved theme, defaulting to dark. */
export function currentTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  return saved === 'light' ? 'light' : 'dark';
}

/** Apply a theme to the document root. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
  for (const fn of listeners) {
    fn(theme);
  }
}

/** Toggle between dark and light. */
export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Register a callback that runs after each theme change. */
export function onThemeChange(fn: (theme: Theme) => void): void {
  listeners.push(fn);
}

/** Read a CSS custom property from the document root as a colour string. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** The chart colour set, read from the active theme's CSS variables. */
export interface ChartColors {
  ink: string;
  inkDim: string;
  axis: string;
  accent: string;
  good: string;
  bad: string;
  warn: string;
}

/** Read the current chart colours from CSS variables. */
export function chartColors(): ChartColors {
  return {
    ink: cssVar('--ink'),
    inkDim: cssVar('--ink-dim'),
    axis: cssVar('--chart-axis'),
    accent: cssVar('--accent'),
    good: cssVar('--good'),
    bad: cssVar('--bad'),
    warn: cssVar('--warn')
  };
}

/** Build a theme toggle button. The caller places it in the layout. */
export function createThemeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  const render = () => {
    const theme = currentTheme();
    button.textContent = theme === 'dark' ? '☀ Light' : '🌙 Dark';
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };
  render();
  button.addEventListener('click', () => {
    toggleTheme();
    render();
  });
  return button;
}

/**
 * Build a link back to the landing page. The apps are served at
 * <root>/examples/<name>/, so the landing index sits two levels up.
 */
export function createHomeLink(): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'home-link';
  link.href = '../../';
  link.innerHTML = '<span aria-hidden="true">←</span> All apps';
  link.setAttribute('aria-label', 'Back to all apps');
  return link;
}
