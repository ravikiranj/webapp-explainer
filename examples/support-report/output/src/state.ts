// State in the link. The order is: the link, then the last saved value, then the default.
// The link is the fragment, "#<section>&key=value". An invalid value is ignored.

import { PALETTE_KEYS } from './palettes.ts';

const VALID: Record<string, (v: string) => boolean> = {
  sev: (v) => v === '' || v.split(',').every((x) => /^[1-4]$/.test(x)),
  range: (v) => ['1m', '3m', '6m', '12m'].includes(v),
  view: (v) => v === 'lines' || v === 'bars',
  period: (v) => v === 'm' || v === 'w',
  measure: (v) => v === 'in' || v === 'out',
  palette: (v) => PALETTE_KEYS.includes(v),
  cols: (v) => /^[a-z]+(,[a-z]+)*$/.test(v),
  sort: (v) => /^[a-z]+:(asc|desc)$/.test(v),
  rows: (v) => ['10', '25', '50', '100', '250', '500'].includes(v),
  widths: (v) => /^[a-z]+:\d{2,4}(,[a-z]+:\d{2,4})*$/.test(v),
  size: (v) => /^\d{2}(\.5)?$/.test(v) && Number(v) >= 12 && Number(v) <= 22
};
const KEYS = Object.keys(VALID);

function parts(): { id: string; params: URLSearchParams } {
  const [id, ...rest] = location.hash.replace('#', '').split('&');
  return { id, params: new URLSearchParams(rest.join('&')) };
}

/** Read one key: the link, then the saved value, then the default. */
export function get(key: string, dflt: string): string {
  const fromLink = parts().params.get(key);
  if (fromLink !== null && VALID[key](fromLink)) {
    localStorage.setItem(`support-report.${key}`, fromLink);
    return fromLink;
  }
  const saved = localStorage.getItem(`support-report.${key}`);
  return saved !== null && VALID[key](saved) ? saved : dflt;
}

/** Save values and write them to the link, without a new history entry. */
export function set(patch: Record<string, string>): void {
  for (const [k, v] of Object.entries(patch)) {
    localStorage.setItem(`support-report.${k}`, v);
  }
  const { id } = parts();
  const p = new URLSearchParams();
  for (const k of KEYS) {
    const v = localStorage.getItem(`support-report.${k}`);
    if (v) {
      p.set(k, v);
    }
  }
  history.replaceState(null, '', `#${id}&${p.toString()}`);
}
