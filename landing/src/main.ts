import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
// Import the Bootstrap JavaScript one time. Without this import, the
// interactive Bootstrap parts do not work.
import 'bootstrap';
import '../../shared/app.css';
import { marked } from 'marked';
import designDoc from './design.md?raw';
import videoDesignDoc from './video-design.md?raw';
import videoMakerDoc from './video-maker.md?raw';
import { APPS } from './apps.ts';
import { h, icon } from '../../shared/dom.ts';
import type { Section } from '../../shared/section.ts';
import { mountShell } from '../../shared/shell.ts';

// The documents are repository files. Their relative links point at other files
// in the repository, which the site does not serve. Each link goes to the place
// on the site that shows it, or else to the file on GitHub.
const REPO_URL = 'https://github.com/ravikiranj/webapp-explainer/blob/main/';
const DOC_TABS: Record<string, string> = {
  'design.md': '#design',
  'video-design.md': '#video-design',
  'video/README.md': '#video-maker',
  'video/': '#video-maker'
};

/** Resolves a relative link of a document in folder dir to a repository path. */
function repoPath(dir: string, href: string): string {
  const parts = (dir ? dir.split('/') : []).concat(href.split('/'));
  const out: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      out.pop();
    } else if (part !== '.' && part !== '') {
      out.push(part);
    }
  }
  return out.join('/') + (href.endsWith('/') ? '/' : '');
}

/** Renders one repository markdown file, with its links fixed for the site. */
function renderDoc(markdown: string, dir: string): HTMLElement {
  const md = h('div', { class: 'markdown' });
  md.innerHTML = marked.parse(markdown, { async: false }) as string;
  for (const a of md.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const href = a.getAttribute('href') ?? '';
    if (/^([a-z]+:|#)/i.test(href)) {
      continue;
    }
    const path = repoPath(dir, href.split('#')[0]);
    const example = path.match(/^examples\/([\w-]+)\/(video\/?)?/);
    if (DOC_TABS[path]) {
      a.href = DOC_TABS[path];
    } else if (example) {
      a.href = `./examples/${example[1]}/${example[2] ? '#video' : ''}`;
    } else {
      a.href = REPO_URL + path;
      a.target = '_blank';
      a.rel = 'noopener';
    }
  }
  return md;
}

/** The design document is the default view. */
const design: Section = {
  id: 'design',
  group: 'Guide',
  title: 'Webapp design',
  icon: 'bi-rulers',
  badge: 'template',
  caption: 'Every example app in the list is built to this design.',
  render(el) {
    el.append(renderDoc(designDoc, ''));
  }
};

/** The design for turning a subject into a video. */
const videoDesign: Section = {
  id: 'video-design',
  group: 'Guide',
  title: 'Video design',
  icon: 'bi-camera-reels',
  badge: 'template',
  caption: 'How to turn a subject into a short video with chapters, subtitles and an optional voice.',
  render(el) {
    el.append(renderDoc(videoDesignDoc, ''));
  }
};

/** The README of the reference video maker in video/. */
const videoMaker: Section = {
  id: 'video-maker',
  group: 'Guide',
  title: 'Video maker',
  icon: 'bi-film',
  badge: 'reference',
  caption: 'The reference implementation of the video design, with a canvas renderer and a Manim renderer.',
  render(el) {
    el.append(renderDoc(videoMakerDoc, 'video'));
  }
};

/** One section for each example app, with a button that opens it. */
const appSections: Section[] = APPS.map((app) => ({
  id: app.slug,
  group: `Example apps (${APPS.length})`,
  title: app.title,
  icon: app.icon,
  badge: app.domain,
  caption: app.subtitle,
  render(el) {
    const dataBadge =
      app.dataKind === 'real'
        ? h('span', { class: 'badge text-bg-success' }, ['real cited data'])
        : h('span', { class: 'badge text-bg-warning' }, ['mock teaching data']);
    const stages = h(
      'div',
      { class: 'd-flex flex-wrap gap-2 my-3' },
      app.stages.map((s) => h('span', { class: 'badge text-bg-light border' }, [s]))
    );
    const open = h('div', { class: 'd-flex flex-wrap gap-2' }, [
      h('a', { class: 'btn btn-primary', href: `./examples/${app.slug}/` }, [
        icon('bi-box-arrow-up-right', 'me-1'),
        `Open the ${app.title} app`
      ])
    ]);
    if (app.video) {
      open.append(
        h('a', { class: 'btn btn-outline-primary', href: `./examples/${app.slug}/#video` }, [
          icon('bi-play-btn', 'me-1'),
          `Watch the video (${app.video})`
        ])
      );
    }
    el.append(
      h('div', { class: 'card', style: 'max-width: 760px' }, [
        h('div', { class: 'card-body p-4' }, [
          h('div', { class: 'mb-2' }, [dataBadge]),
          h('p', { class: 'fs-6 mb-0' }, [app.summary]),
          stages,
          open
        ])
      ])
    );
  }
}));

mountShell({
  brand: 'Webapp Explainer',
  subtitle: 'concept explainer apps',
  brandIcon: 'bi-binoculars',
  homeLink: false,
  sections: [design, videoDesign, videoMaker, ...appSections]
});
