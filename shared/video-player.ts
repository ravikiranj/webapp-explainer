// The "Video" section of an app (video-design.md, section 9). It plays the files
// that video/render.mjs writes to public/video/, shows the chapter list next to
// the player, and links each chapter to its section.

import type { Section } from './section.ts';
import { h, icon } from './dom.ts';

export interface VideoChapter {
  readonly n: number;
  readonly title: string;
  readonly section: string | null;
  readonly start: number;
  readonly end: number;
}

export interface VideoVoice {
  readonly id: string;
  readonly label: string;
  /** The audio file, next to video.mp4. */
  readonly file: string;
}

export interface VideoInfo {
  readonly title: string;
  readonly duration: number;
  /** The narration tracks. The first is the default. Empty for a video with subtitles only. */
  readonly voices?: VideoVoice[];
  readonly chapters: VideoChapter[];
}

const VOICE_KEY = 'webapp-explainer-voice';
const SUBS_KEY = 'webapp-explainer-subtitles';

/** How the player draws the subtitles. It keeps the choice in the browser. */
interface SubtitleStyle {
  on: boolean;
  size: 'small' | 'medium' | 'large' | 'xlarge';
  look: 'box' | 'outline' | 'plain';
  color: 'white' | 'yellow' | 'cyan';
  place: 'bottom' | 'top';
}

const SUBS_DEFAULT: SubtitleStyle = { on: false, size: 'medium', look: 'box', color: 'white', place: 'bottom' };

const SUBS_CHOICES: { key: Exclude<keyof SubtitleStyle, 'on'>; label: string; options: [string, string][] }[] = [
  { key: 'size', label: 'Size', options: [['small', 'Small'], ['medium', 'Medium'], ['large', 'Large'], ['xlarge', 'Extra large']] },
  { key: 'look', label: 'Style', options: [['box', 'Dark box'], ['outline', 'Outline'], ['plain', 'Plain']] },
  { key: 'color', label: 'Colour', options: [['white', 'White'], ['yellow', 'Yellow'], ['cyan', 'Cyan']] },
  { key: 'place', label: 'Position', options: [['bottom', 'Bottom'], ['top', 'Top']] }
];

interface Cue {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

const seconds = (stamp: string): number => {
  const parts = stamp.split(':').map(Number);
  return parts.reduce((total, part) => total * 60 + part, 0);
};

/**
 * Reads the cues of a WebVTT file: the timing lines and the text under them.
 *
 * @param text the file
 * @returns the cues, in file order
 */
export function parseVtt(text: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of text.replace(/\r\n?/g, '\n').split(/\n\n+/)) {
    const lines = block.split('\n');
    const at = lines.findIndex((l) => l.includes('-->'));
    if (at < 0) {
      continue;
    }
    const [from, to] = lines[at].split('-->').map((x) => x.trim().split(/\s+/)[0]);
    cues.push({ start: seconds(from), end: seconds(to), text: lines.slice(at + 1).join('\n').trim() });
  }
  return cues;
}

function readSubtitleStyle(): SubtitleStyle {
  try {
    return { ...SUBS_DEFAULT, ...(JSON.parse(localStorage.getItem(SUBS_KEY) ?? '{}') as Partial<SubtitleStyle>) };
  } catch {
    return { ...SUBS_DEFAULT };
  }
}

const clock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/**
 * Loads video.json once.
 *
 * @param base the folder of the video files, for example './video/'
 * @returns the video info, or null when the video is not built
 */
export function loadVideoInfo(base: string): Promise<VideoInfo | null> {
  return fetch(`${base}video.json`)
    .then((r) => (r.ok ? (r.json() as Promise<VideoInfo>) : null))
    .catch(() => null);
}

/**
 * The chapter start of each section, for the shell's "Watch this part" links.
 *
 * @param info the promise from loadVideoInfo
 * @returns section id to start time, in seconds
 */
export function chapterStarts(info: Promise<VideoInfo | null>): Promise<Map<string, number>> {
  return info.then((v) => new Map((v?.chapters ?? []).flatMap((c) => (c.section ? [[c.section, c.start] as [string, number]] : []))));
}

/**
 * Sets the source of a video element so that seeking works on any static server
 * (video-design.md, section 9.7). A server with Range support answers the
 * first-byte request with 206, and the video streams. A server with no Range
 * support sends the whole file with 200, and the video plays from that blob.
 *
 * @param video the element
 * @param url the address of the MP4 file
 * @param onProgress called with the loaded share, 0 to 1, while a blob loads
 * @returns a function that frees the blob, for the section cleanup
 */
export async function setSeekableSource(
  video: HTMLMediaElement,
  url: string,
  onProgress: (share: number) => void
): Promise<() => void> {
  let blobUrl = '';
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    if (res.status === 206 || !res.ok || !res.body) {
      await res.body?.cancel();
      video.src = url;
    } else {
      const total = Number(res.headers.get('Content-Length')) || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let loaded = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
        loaded += value.length;
        if (total) {
          onProgress(loaded / total);
        }
      }
      blobUrl = URL.createObjectURL(new Blob(chunks, { type: res.headers.get('Content-Type') ?? '' }));
      video.src = blobUrl;
    }
  } catch {
    video.src = url;
  }
  return () => {
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
    }
  };
}

/**
 * Builds the Video section.
 *
 * @param info the promise from loadVideoInfo
 * @param base the folder of the video files
 * @returns the section
 */
export function videoSection(info: Promise<VideoInfo | null>, base = './video/'): Section {
  return {
    id: 'video',
    group: 'Watch',
    title: 'Video',
    icon: 'bi-play-btn',
    badge: 'chapters',
    caption: 'A short video with a choice of voice and optional subtitles. Select a chapter to jump to it. Each chapter links to its section.',
    render(el, params) {
      let free = (): void => undefined;
      let gone = false;
      const status = h('div', { class: 'small text-body-secondary mt-2' }, ['Loading the video…']);
      // The video has no <track>, so the browser shows no subtitle menu of its own. The
      // player draws the cues itself. The browser's own fullscreen would hide that layer,
      // so the stage goes fullscreen instead.
      const video = h('video', { class: 'w-100 d-block', controls: '', controlslist: 'nofullscreen', disablepictureinpicture: '',
        preload: 'metadata', playsinline: '' }) as HTMLVideoElement;
      const subsLine = h('span', { class: 'video-subs-line' });
      const subs = h('div', { class: 'video-subs', 'aria-live': 'off' }, [subsLine]);
      const stage = h('div', { class: 'video-stage rounded border bg-black' }, [video, subs]);

      // The player draws the cues itself, so the viewer can style them in every browser.
      let style = readSubtitleStyle();
      const applyStyle = (): void => {
        localStorage.setItem(SUBS_KEY, JSON.stringify(style));
        subs.dataset.size = style.size;
        subs.dataset.look = style.look;
        subs.dataset.color = style.color;
        subs.dataset.place = style.place;
        subs.hidden = !style.on || subsLine.textContent === '';
      };
      let cues: Cue[] = [];
      void fetch(`${base}subtitles.vtt`)
        .then((r) => (r.ok ? r.text() : ''))
        .then((text) => { cues = parseVtt(text); showCue(); })
        .catch(() => undefined);
      let shown: Cue | undefined;
      const showCue = (): void => {
        const t = video.currentTime;
        const cue = cues.find((c) => t >= c.start && t < c.end);
        if (cue !== shown) {
          shown = cue;
          subsLine.textContent = cue?.text ?? '';
          applyStyle();
        }
      };
      // Lift the bottom subtitles only while the browser shows its control bar: when the
      // video is paused, and for a short time after the pointer moves over it.
      let idle = 0;
      const controlsUp = (): void => {
        stage.classList.add('controls-up');
        clearTimeout(idle);
        if (!video.paused) {
          idle = window.setTimeout(() => stage.classList.remove('controls-up'), 2500);
        }
      };
      stage.classList.add('controls-up');
      for (const ev of ['pointermove', 'pointerdown', 'pause', 'play', 'seeking']) {
        (ev.startsWith('pointer') ? stage : video).addEventListener(ev, controlsUp);
      }
      stage.addEventListener('pointerleave', () => {
        if (!video.paused) {
          clearTimeout(idle);
          stage.classList.remove('controls-up');
        }
      });

      // timeupdate comes about four times a second; a frame loop keeps the cue on time while it plays.
      let frame = 0;
      const tick = (): void => {
        showCue();
        frame = video.paused ? 0 : requestAnimationFrame(tick);
      };
      video.addEventListener('play', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(tick); });
      for (const ev of ['seeked', 'timeupdate', 'loadedmetadata']) {
        video.addEventListener(ev, showCue);
      }

      const onSwitch = h('input', { class: 'form-check-input', type: 'checkbox', role: 'switch', id: 'subs-on' }) as HTMLInputElement;
      onSwitch.checked = style.on;
      onSwitch.addEventListener('change', () => {
        style = { ...style, on: onSwitch.checked };
        applyStyle();
        selects.forEach((sel) => (sel.disabled = !style.on));
      });
      const selects = SUBS_CHOICES.map(({ key, label, options }) => {
        const sel = h('select', { class: 'form-select form-select-sm', 'aria-label': `Subtitle ${label.toLowerCase()}`, title: label },
          options.map(([value, text]) => h('option', { value }, [text]))) as HTMLSelectElement;
        sel.value = style[key];
        sel.disabled = !style.on;
        sel.addEventListener('change', () => {
          style = { ...style, [key]: sel.value } as SubtitleStyle;
          applyStyle();
        });
        return sel;
      });
      const fullscreen = h('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary', title: 'Fullscreen, with subtitles',
        'aria-label': 'Fullscreen' }, [icon('bi-arrows-fullscreen')]);
      // Some browsers still show their own fullscreen button. Move that fullscreen to the stage.
      const onFullscreen = (): void => {
        if (document.fullscreenElement === video) {
          void document.exitFullscreen().then(() => stage.requestFullscreen());
        }
      };
      document.addEventListener('fullscreenchange', onFullscreen);
      fullscreen.addEventListener('click', () => {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
        } else {
          void stage.requestFullscreen();
        }
      });
      const subsBar = h('div', { class: 'd-flex flex-wrap align-items-center gap-2 mt-2' }, [
        h('div', { class: 'form-check form-switch mb-0 me-1' }, [
          onSwitch,
          h('label', { class: 'form-check-label small', for: 'subs-on' }, [icon('bi-badge-cc', 'me-1'), 'Subtitles'])
        ]),
        ...selects.map((sel, i) => h('div', { class: 'input-group input-group-sm', style: 'width: auto' }, [
          h('span', { class: 'input-group-text' }, [SUBS_CHOICES[i].label]),
          sel
        ])),
        fullscreen
      ]);
      applyStyle();
      const list = h('div', { class: 'list-group' });
      // The narration is a separate track, so that the viewer can change the voice.
      const audio = h('audio', { preload: 'auto' }) as HTMLAudioElement;
      const voiceSelect = h('select', { class: 'form-select form-select-sm', 'aria-label': 'Voice' }) as HTMLSelectElement;
      const voiceBox = h('div', { class: 'd-flex align-items-center gap-2 mb-2 d-none' }, [
        h('label', { class: 'small text-body-secondary text-nowrap' }, [icon('bi-mic', 'me-1'), 'Voice']),
        voiceSelect
      ]);
      const download = h('a', { href: `${base}video-subtitled.mp4`, download: '' }, [
        icon('bi-download', 'me-1'),
        'Download a copy with the subtitles drawn in'
      ]);
      el.append(
        h('div', { class: 'row g-3' }, [
          h('div', { class: 'col-xl-8' }, [stage, subsBar, status, h('div', { class: 'small mt-1' }, [download])]),
          h('div', { class: 'col-xl-4' }, [voiceBox, list, audio])
        ])
      );

      void info.then(async (v) => {
        if (gone) {
          return;
        }
        if (!v) {
          status.textContent = 'The video is not built. Run: node video/render.mjs build <subject>.';
          status.className = 'alert alert-warning mt-2';
          return;
        }
        const items = v.chapters.map((c) => {
          const item = h('button', { type: 'button', class: 'list-group-item list-group-item-action' }, [
            h('div', { class: 'd-flex justify-content-between' }, [
              h('strong', {}, [`${c.n}. ${c.title}`]),
              h('span', { class: 'small text-body-secondary' }, [clock(c.start)])
            ])
          ]);
          if (c.section) {
            item.append(h('a', { href: `#${c.section}`, class: 'small' }, ['Open the section ', icon('bi-arrow-right')]));
          }
          item.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).closest('a')) {
              return;
            }
            video.currentTime = c.start;
            void video.play();
          });
          return item;
        });
        list.replaceChildren(...items);
        const mark = (): void => {
          v.chapters.forEach((c, i) => {
            const on = video.currentTime >= c.start && video.currentTime < c.end;
            items[i].classList.toggle('active', on);
          });
        };
        video.addEventListener('timeupdate', mark);
        const start = Number(params?.get('t'));
        if (Number.isFinite(start) && start > 0) {
          video.addEventListener('loadedmetadata', () => { video.currentTime = start; mark(); }, { once: true });
        }
        free = await setSeekableSource(video, `${base}video.mp4`, (share) => {
          status.textContent = `Loading the video: ${Math.round(share * 100)}%`;
        });
        const ready = `${clock(v.duration)} · ${v.chapters.length} chapters`;
        status.textContent = ready;
        mark();

        // Keep the voice on the video's clock. The video is the leader: the audio
        // follows its play, pause, seek and rate, and is moved back when it drifts.
        const voices = v.voices ?? [];
        let freeAudio = (): void => undefined;
        const follow = (): void => {
          if (!audio.src) {
            return;
          }
          audio.playbackRate = video.playbackRate;
          if (Math.abs(audio.currentTime - video.currentTime) > 0.15) {
            audio.currentTime = video.currentTime;
          }
          if (video.paused || video.ended) {
            audio.pause();
          } else if (audio.paused) {
            void audio.play().catch(() => undefined);
          }
        };
        for (const ev of ['play', 'pause', 'seeked', 'ratechange', 'ended', 'waiting', 'playing']) {
          video.addEventListener(ev, follow);
        }
        video.addEventListener('timeupdate', follow);
        video.addEventListener('volumechange', () => {
          audio.volume = video.volume;
          audio.muted = video.muted;
        });
        const useVoice = async (id: string): Promise<void> => {
          freeAudio();
          freeAudio = () => undefined;
          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          localStorage.setItem(VOICE_KEY, id);
          const voice = voices.find((x) => x.id === id);
          if (!voice) {
            return;
          }
          const wasPlaying = !video.paused;
          video.pause();
          freeAudio = await setSeekableSource(audio, `${base}${voice.file}`, (share) => {
            status.textContent = `Loading the voice: ${Math.round(share * 100)}%`;
          });
          status.textContent = ready;
          if (gone) {
            freeAudio();
            return;
          }
          audio.currentTime = video.currentTime;
          if (wasPlaying) {
            void video.play();
          }
        };
        if (voices.length) {
          voiceSelect.replaceChildren(
            ...voices.map((x) => h('option', { value: x.id }, [x.label])),
            h('option', { value: 'none' }, ['No voice (subtitles only)'])
          );
          const saved = localStorage.getItem(VOICE_KEY);
          voiceSelect.value = saved && (saved === 'none' || voices.some((x) => x.id === saved)) ? saved : voices[0].id;
          voiceSelect.addEventListener('change', () => void useVoice(voiceSelect.value));
          voiceBox.classList.remove('d-none');
          await useVoice(voiceSelect.value);
        }
        free = ((freeVideo) => () => { freeVideo(); freeAudio(); })(free);
      });
      return () => {
        gone = true;
        cancelAnimationFrame(frame);
        clearTimeout(idle);
        document.removeEventListener('fullscreenchange', onFullscreen);
        if (document.fullscreenElement === stage) {
          void document.exitFullscreen();
        }
        video.pause();
        audio.pause();
        free();
      };
    }
  };
}
