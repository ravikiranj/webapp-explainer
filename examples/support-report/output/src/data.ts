// The data file of the report. The generator in ../../generator writes it. The site only reads it.

export interface Ticket {
  id: string;
  title: string;
  item: string;
  region: string;
  /** The highest severity the ticket reached: 1 is the highest. */
  sev: number;
  /** Create time and resolve time, in seconds (UTC). */
  c: number;
  r: number | null;
  src: string;
  /** The cause field that a person filled in, the resolution text, and the cause class. */
  cf: string;
  res: string;
  cause: string;
  /** "field" = the class comes from the cause field. "review" = a reviewer corrected it. */
  by: string;
  wk: number;
}

export interface ReportData {
  generatedAt: string;
  today: string;
  source: string;
  weekRule: string;
  weeks: { s: number; e: number }[];
  tickets: Ticket[];
}

export const CAUSES: Record<string, string> = {
  dependency: 'Dependency',
  ours: 'Our issue',
  'false-alarm': 'False alarm',
  transient: 'Transient',
  unclear: 'Unclear'
};
export const CAUSE_ORDER = ['dependency', 'ours', 'false-alarm', 'transient', 'unclear'];

let data: ReportData | undefined;

export async function loadData(): Promise<void> {
  data = (await (await fetch('./report-data.json')).json()) as ReportData;
}

export function report(): ReportData {
  if (!data) {
    throw new Error('The data is not loaded.');
  }
  return data;
}

export const fmtDay = (s: number): string => new Date(s * 1000).toISOString().slice(0, 10);
export const monthKey = (s: number): string => new Date(s * 1000).toISOString().slice(0, 7);
export function fmtDur(s: number | null): string {
  if (s === null) {
    return 'n/a';
  }
  if (s < 5400) {
    return `${Math.round(s / 60)} min`;
  }
  return s < 172800 ? `${(s / 3600).toFixed(1)} h` : `${(s / 86400).toFixed(1)} d`;
}
export const median = (a: number[]): number | null => {
  if (!a.length) {
    return null;
  }
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
