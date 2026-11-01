// Reads a storyboard.md (video-design.md, section 4) into a plain object.
//
//   ---
//   title: How a rate limiter works
//   renderer: canvas            # canvas (default) or manim
//   voice: none                 # a TTS voice id, or none
//   ---
//
//   ## 1. One request {#overview}
//
//   1. A client sends a request to the API.
//      - show: client, api
//      - hold: 1.0
//
// A level-2 heading that starts with a number is a chapter. Each numbered item is
// a beat. Its first line (and any plain continuation lines) is the text, which is
// both the subtitle and the narration. The bullets under it are scene notes; only
// "hold" changes the timing. A level-2 heading that is not numbered (for example
// "Sources") ends the chapters.
import { readFileSync } from 'node:fs';

/** The numbers of the timing rules in video-design.md, section 7. Both renderers use them. */
export const TIMING = {
  readCps: 13, // reading speed, characters each second
  minRead: 2.2, // the shortest time a subtitle stays on the screen, in seconds
  audioPad: 0.3, // silence after the narration of a beat, in seconds
  pause: 0.9, // the pause after each beat when it has no hold, in seconds
  cueLead: 0.1, // a cue starts this long after its beat starts
  cueTail: 0.15, // a cue ends this long before its beat ends
};

const CHAPTER = /^##\s+(\d+)\.\s+(.+?)\s*(?:\{#([\w-]+)\})?\s*$/;
const BEAT = /^(\d+)\.\s+(.+)$/;
const NOTE = /^\s+[-*]\s+(\w+)\s*:\s*(.*)$/;

const frontMatter = (text) => {
  const meta = {};
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) {
    return { meta, body: text };
  }
  for (const line of m[1].split('\n')) {
    const kv = line.replace(/\s+#.*$/, '').match(/^(\w+)\s*:\s*(.*)$/);
    if (kv) {
      meta[kv[1]] = kv[2].trim();
    }
  }
  return { meta, body: text.slice(m[0].length) };
};

/**
 * Parses storyboard markdown.
 *
 * @param {string} text the markdown
 * @returns {{meta: object, chapters: {n: number, title: string, section: string|null, beats: {id: string, text: string, hold?: number, notes: string[]}[]}[]}}
 * @throws Error naming the line, for a beat outside a chapter, a chapter with no beat, or a bad hold
 */
export function parseStoryboard(text) {
  const { meta, body } = frontMatter(text.replace(/\r\n?/g, '\n'));
  const chapters = [];
  let chapter = null;
  let beat = null;
  let done = false;
  body.split('\n').forEach((line, i) => {
    if (done) {
      return;
    }
    const where = `storyboard line ${i + 1}`;
    if (line.startsWith('## ')) {
      const m = line.match(CHAPTER);
      if (!m) {
        done = true;
        return;
      }
      chapter = { n: Number(m[1]), title: m[2], section: m[3] ?? null, beats: [] };
      chapters.push(chapter);
      beat = null;
      return;
    }
    const b = line.match(BEAT);
    if (b) {
      if (!chapter) {
        throw new Error(`${where}: a beat comes before the first chapter`);
      }
      beat = { id: `${chapter.n}.${b[1]}`, text: b[2].trim(), notes: [] };
      chapter.beats.push(beat);
      return;
    }
    const note = line.match(NOTE);
    if (note && beat) {
      const [, key, value] = note;
      if (key === 'hold') {
        const hold = Number(value);
        if (!Number.isFinite(hold) || hold < 0) {
          throw new Error(`${where}: hold must be a number of seconds, not "${value}"`);
        }
        beat.hold = hold;
      }
      beat.notes.push(`${key}: ${value}`);
      return;
    }
    if (beat && /^\s{2,}\S/.test(line) && beat.notes.length === 0) {
      beat.text = `${beat.text} ${line.trim()}`;
    }
  });
  for (const ch of chapters) {
    if (ch.beats.length === 0) {
      throw new Error(`chapter ${ch.n} "${ch.title}" has no beats`);
    }
  }
  if (chapters.length === 0) {
    throw new Error('the storyboard has no chapters ("## 1. Title")');
  }
  return { meta, chapters };
}

/**
 * Reads and parses a storyboard file.
 *
 * @param {string} file the path of storyboard.md
 * @returns the parsed storyboard
 */
export function readStoryboard(file) {
  return parseStoryboard(readFileSync(file, 'utf8'));
}
