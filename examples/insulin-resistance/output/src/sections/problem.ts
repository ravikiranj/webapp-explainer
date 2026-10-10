import type { Section } from '../section.ts';
import { marked } from 'marked';
import problemText from '../problem.md?raw';

export const problem: Section = {
  id: 'problem',
  group: 'Start here',
  title: 'The problem',
  icon: '📄',
  badge: 'brief',
  caption: 'The original problem statement that this app explains.',
  render(el) {
    const md = document.createElement('div');
    md.className = 'markdown';
    md.innerHTML = marked.parse(problemText, { async: false }) as string;
    el.append(md);
  }
};
