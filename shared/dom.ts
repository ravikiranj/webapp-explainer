// Small DOM helpers shared by every app. They build Bootstrap markup.

type Attrs = Record<string, string | undefined>;

/** Create an element with attributes and children. */
export function h(tag: string, attrs: Attrs = {}, children: (Node | string)[] = []): HTMLElement {
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

/** Build a Bootstrap Icons element. */
export function icon(name: string, extra = ''): HTMLElement {
  return h('i', { class: `bi ${name} ${extra}`.trim(), 'aria-hidden': 'true' });
}

/** Format a number in TPS with thousands groups. */
export function tps(value: number): string {
  return value.toLocaleString('en-US') + ' TPS';
}

/** Format a plain number with thousands groups. */
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
  return h('div', { class: 'card metric' }, children);
}

/** Build the two-column "what breaks / how the fix works" panel from Bootstrap alerts. */
export function breakFix(breaks: string[], fixes: string[]): HTMLElement {
  const col = (cls: string, iconName: string, title: string, items: string[]): HTMLElement =>
    h('div', { class: 'col-md-6' }, [
      h('div', { class: `alert ${cls} h-100 mb-0`, role: 'alert' }, [
        h('h3', { class: 'h6 alert-heading' }, [icon(iconName, 'me-1'), title]),
        h('ul', { class: 'mb-0 ps-3' }, items.map((t) => h('li', {}, [t])))
      ])
    ]);
  return h('div', { class: 'row g-3 my-2' }, [
    col('alert-danger', 'bi-x-octagon', 'What breaks', breaks),
    col('alert-success', 'bi-check2-circle', 'How the fix works', fixes)
  ]);
}

/** Build a titled visualization panel and return the inner chart host. */
export function vizPanel(title: string, chartClass = 'chart'): { panel: HTMLElement; host: HTMLElement } {
  const host = h('div', { class: chartClass });
  const panel = h('div', { class: 'viz' }, [h('h2', {}, [title]), host]);
  return { panel, host };
}
