// The video or text view, shared by every app on the site. The URL fragment can name it
// (#topic&mode=text), so a link opens the view it was made in. The order is: the URL, then the
// last view this browser used (localStorage), then video.

export type View = 'video' | 'text';

const KEY = 'webapp-explainer-view';
/** The fragment parameter that names the view. */
export const MODE_PARAM = 'mode';
const listeners: ((view: View) => void)[] = [];

const isView = (v: string | null): v is View => v === 'video' || v === 'text';

/** The view the URL fragment names, or null when it names none (or an unknown one). */
function urlView(): View | null {
  const v = new URLSearchParams(location.hash.replace(/^#/, '').split('&').slice(1).join('&')).get(MODE_PARAM);
  return isView(v) ? v : null;
}

/** A view named by the URL becomes the last view, so it also applies after the reader leaves the link. */
function rememberUrlView(): void {
  const v = urlView();
  if (v && localStorage.getItem(KEY) !== v) {
    localStorage.setItem(KEY, v);
  }
}
rememberUrlView();
window.addEventListener('hashchange', rememberUrlView);

/** The current view: the URL, then the saved view, then video. */
export function currentView(): View {
  const fromUrl = urlView();
  if (fromUrl) {
    return fromUrl;
  }
  const saved = localStorage.getItem(KEY);
  return isView(saved) ? saved : 'video';
}

/** Write the view into a fragment's parameters, so the address bar is a link to what is on screen. */
export function withMode(params: URLSearchParams, view: View = currentView()): URLSearchParams {
  const out = new URLSearchParams(params);
  out.set(MODE_PARAM, view);
  return out;
}

/** Save a view, put it in the URL, stop any playing media, and tell the listeners. */
export function setView(view: View): void {
  localStorage.setItem(KEY, view);
  const [id, ...rest] = location.hash.replace(/^#/, '').split('&');
  if (id) {
    const params = withMode(new URLSearchParams(rest.join('&')), view);
    history.replaceState(null, '', `#${id}&${params.toString()}`);
  }
  document.querySelectorAll('video, audio').forEach((m) => (m as HTMLMediaElement).pause());
  for (const fn of listeners) {
    fn(view);
  }
}

/** Register a callback that runs after each view change. Returns a function that removes it. */
export function onViewChange(fn: (view: View) => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) {
      listeners.splice(i, 1);
    }
  };
}

/** Build the Video / Text switch: two buttons, the current one pressed. Returns the element and a dispose function. */
export function createViewToggle(extraClass = ''): [HTMLElement, () => void] {
  const group = document.createElement('div');
  group.className = `btn-group btn-group-sm view-toggle ${extraClass}`.trim();
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Show the video or the text version');
  const make = (view: View, icon: string, text: string): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.dataset.view = view;
    b.innerHTML = `<i class="bi ${icon} me-1"></i>${text}`;
    b.addEventListener('click', () => {
      if (currentView() !== view) {
        setView(view);
      }
    });
    return b;
  };
  const buttons = [make('video', 'bi-play-btn', 'Video'), make('text', 'bi-file-text', 'Text')];
  const render = () => {
    for (const b of buttons) {
      const on = b.dataset.view === currentView();
      b.classList.toggle('btn-primary', on);
      b.classList.toggle('btn-outline-secondary', !on);
      b.setAttribute('aria-pressed', String(on));
    }
  };
  render();
  const dispose = onViewChange(render);
  group.append(...buttons);
  return [group, dispose];
}
