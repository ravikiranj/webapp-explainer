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
import { APPS } from './apps.ts';
import { h, icon } from '../../shared/dom.ts';
import type { Section } from '../../shared/section.ts';
import { mountShell } from '../../shared/shell.ts';

/** The design document is the default view. */
const design: Section = {
  id: 'design',
  group: 'Guide',
  title: 'The design',
  icon: 'bi-rulers',
  badge: 'template',
  caption: 'Every example app in the list is built to this design.',
  render(el) {
    const md = h('div', { class: 'markdown' });
    md.innerHTML = marked.parse(designDoc, { async: false }) as string;
    el.append(md);
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
    const open = h('a', { class: 'btn btn-primary', href: `./examples/${app.slug}/` }, [
      icon('bi-box-arrow-up-right', 'me-1'),
      `Open the ${app.title} app`
    ]);
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
  sections: [design, ...appSections]
});
