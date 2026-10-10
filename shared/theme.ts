// Theme control shared by every app. The theme is stored on the document root
// as data-bs-theme, which is the Bootstrap 5.3 colour mode, so every Bootstrap
// component follows it. The choice is saved in localStorage. Charts read their
// colours from CSS variables, so they follow the theme after a redraw.

export type Theme = 'dark' | 'light';

const KEY = 'webapp-explainer-theme';
const listeners: ((theme: Theme) => void)[] = [];

/** Read the saved theme. The default is light. */
export function currentTheme(): Theme {
  return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
}

/** Apply a theme to the document root and tell the listeners. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.bsTheme = theme;
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

/** Read a CSS custom property from the document root. */
export function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Build the theme toggle button. */
export function createThemeToggle(): HTMLButtonElement {
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.type = 'button';
  const render = () => {
    const dark = currentTheme() === 'dark';
    button.innerHTML = dark
      ? '<i class="bi bi-sun"></i> Light theme'
      : '<i class="bi bi-moon-stars"></i> Dark theme';
    button.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
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
  link.innerHTML = '<i class="bi bi-arrow-left"></i> All apps';
  link.setAttribute('aria-label', 'Back to all apps');
  return link;
}
