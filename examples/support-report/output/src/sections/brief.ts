import type { Section } from '../../../../../shared/section.ts';
import { marked } from 'marked';
import briefText from '../report.md?raw';

export const brief: Section = {
  id: 'brief',
  group: 'Start here',
  title: 'Overview',
  icon: 'bi-file-text',
  badge: 'overview',
  caption: 'What this report covers, and the brief that it was built from.',
  render(el) {
    const md = document.createElement('div');
    md.className = 'markdown';
    md.innerHTML = marked.parse(briefText, { async: false }) as string;
    el.append(md);
  }
};
