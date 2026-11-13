import type { Section } from '../../../../../shared/section.ts';
import { marked } from 'marked';
import briefText from '../report.md?raw';

export const brief: Section = {
  id: 'brief',
  group: 'Start here',
  title: 'The brief',
  icon: 'bi-file-text',
  badge: 'brief',
  caption: 'The brief that this report was built from.',
  render(el) {
    const md = document.createElement('div');
    md.className = 'markdown';
    md.innerHTML = marked.parse(briefText, { async: false }) as string;
    el.append(md);
  }
};
