// Small DOM helpers. These keep the section files short.

type Attrs = Record<string, string | undefined>;

/** Create an element with attributes and children. */
export function h(
  tag: string,
  attrs: Attrs = {},
  children: (Node | string)[] = []
): HTMLElement {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) {
      continue;
    }
    if (key === 'class') {
      el.className = value;
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const child of children) {
    el.append(child);
  }
  return el;
}

/** Format a number in TPS with thousands groups. */
export function tps(value: number): string {
  return value.toLocaleString('en-US') + ' TPS';
}

/** Format a plain integer with thousands groups. */
export function num(value: number): string {
  return value.toLocaleString('en-US');
}

/** Build a metric card. */
export function card(
  key: string,
  value: string,
  tone: '' | 'good' | 'bad' | 'warn' = '',
  sub?: string
): HTMLElement {
  const children: (Node | string)[] = [
    h('div', { class: 'k' }, [key]),
    h('div', { class: 'v ' + tone }, [value])
  ];
  if (sub) {
    children.push(h('div', { class: 'sub' }, [sub]));
  }
  return h('div', { class: 'card' }, children);
}

/** Build the two-box "what breaks / how the fix works" panel. */
export function breakFix(breaks: string[], fixes: string[]): HTMLElement {
  return h('div', { class: 'break-fix' }, [
    h('div', { class: 'box breaks' }, [
      h('h3', {}, ['What breaks']),
      h(
        'ul',
        {},
        breaks.map((t) => h('li', {}, [t]))
      )
    ]),
    h('div', { class: 'box fix' }, [
      h('h3', {}, ['How the fix works']),
      h(
        'ul',
        {},
        fixes.map((t) => h('li', {}, [t]))
      )
    ])
  ]);
}

/** Build a titled visualization panel and return the inner chart host. */
export function vizPanel(title: string, chartClass = 'chart'): {
  panel: HTMLElement;
  host: HTMLElement;
} {
  const host = h('div', { class: chartClass });
  const panel = h('div', { class: 'viz' }, [h('h2', {}, [title]), host]);
  return { panel, host };
}
