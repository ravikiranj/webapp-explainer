import { SOURCES, type Cited, type Source } from './domain.ts';
import { h } from './dom.ts';

/** Build a small inline source tag that links to the reference. */
export function cite(sourceId: string): HTMLElement {
  const source = SOURCES[sourceId];
  const a = h('a', {
    class: 'src-tag',
    href: source.url,
    target: '_blank',
    rel: 'noopener',
    title: source.detail
  }, [source.label]);
  return a;
}

/** Build a reference list for a set of source ids. */
export function references(sourceIds: string[]): HTMLElement {
  const seen = new Set<string>();
  const items: HTMLElement[] = [];
  for (const id of sourceIds) {
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    const source: Source = SOURCES[id];
    items.push(
      h('li', {}, [
        h('a', { href: source.url, target: '_blank', rel: 'noopener' }, [source.label]),
        ': ' + source.detail
      ])
    );
  }
  return h('div', { class: 'refs' }, [h('h2', {}, ['Sources']), h('ul', {}, items)]);
}

/** Format a cited value with its unit and an inline source tag. */
export function citedValue(cited: Cited, unit: string): HTMLElement {
  return h('span', {}, [cited.value + ' ' + unit + ' ', cite(cited.sourceId)]);
}
