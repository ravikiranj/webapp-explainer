// The reference video maker. See ../video-design.md and ./README.md.
//
//   node render.mjs info    <subject>                print the chapters and the cues
//   node render.mjs preview <subject> <t1,t2,...>    write PNG frames (canvas renderer only)
//   node render.mjs build   <subject>                write <subject>/output/public/video/*
//   node render.mjs say     <subject>                print what the voice says for each beat, with the phonemes
//
// <subject> is a folder with video/storyboard.md and video/scenes.js (canvas) or
// video/scenes.py (manim), for example ../examples/rate-limiter.
//
// Optional narration: list voices in the storyboard front matter, for example
//   voices: af_heart, am_michael, bf_emma
// The default engine is Kokoro (tts/), run in a container with no network. The
// player lets the viewer pick a voice. To use another engine, set "tts: command"
// and TTS_COMMAND to a command that reads the text on stdin and writes a WAV file:
//   TTS_COMMAND='my-tts --voice {voice} --output {out}'
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { TIMING, readStoryboard } from './storyboard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const FPS = 30;
const BATCH = 6;
// Pin the Manim image so that a rebuild gives the same frames.
const MANIM_IMAGE = process.env.MANIM_IMAGE ?? 'manimcommunity/manim:v0.22.1';

const [mode, subjectArg, extra] = process.argv.slice(2);
if (!['info', 'preview', 'build', 'say'].includes(mode) || !subjectArg) {
  console.error('usage: node render.mjs info|preview|build|say <subject> [t1,t2,...]');
  process.exit(2);
}
const SUBJECT = resolve(subjectArg);
const SRC = join(SUBJECT, 'video');
const WORK = join(SRC, '.build');
const OUT = join(SUBJECT, 'output', 'public', 'video');
const story = readStoryboard(join(SRC, 'storyboard.md'));
const renderer = story.meta.renderer ?? 'canvas';
// "voices" lists the voices; the first is the default. "voice" (one voice) also works.
const voices = (story.meta.voices ?? story.meta.voice ?? 'none').split(',').map((v) => v.trim()).filter((v) => v && v !== 'none');
const speed = Number(story.meta.speed ?? '1');
const ttsEngine = story.meta.tts ?? 'kokoro';
const TTS_IMAGE = 'video-maker-tts:kokoro-0.6.1';
const MODELS = join(HERE, 'tts', 'models');
const MODEL_FILES = {
  'kokoro-v1.0.onnx': '7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5',
  'voices-v1.0.bin': 'bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d',
};
const MODEL_URL = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/';
mkdirSync(WORK, { recursive: true });

// ---------------------------------------------------------------- helpers

const stamp = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor((ms % 3600000) / 60000))}:${p(Math.floor((ms % 60000) / 1000))}.${p(ms % 1000, 3)}`;
};
const vtt = (cues) => `WEBVTT\n\n${cues.map((c, i) => `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n')}`;
const srt = (cues) => cues.map((c, i) => `${i + 1}\n${stamp(c.start).replace('.', ',')} --> ${stamp(c.end).replace('.', ',')}\n${c.text}\n`).join('\n');

const ffmpeg = (args) => {
  const r = spawnSync(ffmpegPath, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'inherit', 'pipe'] });
  if (r.status !== 0) {
    throw new Error(`ffmpeg failed: ${r.stderr}`);
  }
};

// ffmpeg-static has no ffprobe, so read the duration from ffmpeg's own report.
const mediaSeconds = (file) => {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  if (!m) {
    throw new Error(`cannot read the duration of ${file}`);
  }
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};

// ---------------------------------------------------------------- voice (section 6)

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Downloads the Kokoro model files one time, checks them, and builds the TTS image if it is missing. */
function prepareKokoro() {
  mkdirSync(MODELS, { recursive: true });
  for (const [file, hash] of Object.entries(MODEL_FILES)) {
    const path = join(MODELS, file);
    if (!existsSync(path)) {
      console.log(`downloading ${file} (one time)`);
      const r = spawnSync('curl', ['-sSL', '--fail', '-o', path, MODEL_URL + file], { stdio: 'inherit' });
      if (r.status !== 0) {
        rmSync(path, { force: true });
        throw new Error(`cannot download ${MODEL_URL + file}`);
      }
    }
    if (sha256(path) !== hash) {
      throw new Error(`${path} has the wrong SHA-256. Delete it and run again.`);
    }
  }
  const have = spawnSync('docker', ['image', 'inspect', TTS_IMAGE], { stdio: 'ignore' });
  if (have.status !== 0) {
    console.log(`building ${TTS_IMAGE} (one time)`);
    const r = spawnSync('docker', ['build', '-t', TTS_IMAGE, join(HERE, 'tts')], { stdio: 'inherit' });
    if (r.status !== 0) {
      throw new Error('cannot build the TTS image');
    }
  }
}

/** Speaks a list of jobs with Kokoro in one container run. */
function runKokoro(jobs) {
  prepareKokoro();
  const list = join(WORK, 'tts-jobs.json');
  const inBox = (file) => `/work/${relative(REPO, file)}`;
  writeFileSync(list, JSON.stringify(jobs.map((j) => ({ ...j, out: inBox(j.out) }))));
  const uid = process.getuid ? `${process.getuid()}:${process.getgid()}` : '1000:1000';
  const r = spawnSync('docker', ['run', '--rm', '--network', 'none', '--user', uid, '-e', 'HOME=/tmp',
    '-v', `${MODELS}:/models:ro`, '-v', `${REPO}:/work`, TTS_IMAGE, inBox(list)], { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error('the Kokoro TTS run failed');
  }
}

/** Speaks a list of jobs with TTS_COMMAND, one process for each line. */
function runCommand(jobs) {
  const cmd = process.env.TTS_COMMAND;
  if (!cmd) {
    throw new Error('the storyboard sets "tts: command", so set TTS_COMMAND (see the top of render.mjs)');
  }
  for (const job of jobs) {
    const run = cmd.replaceAll('{voice}', job.voice).replaceAll('{out}', job.out);
    const r = spawnSync('sh', ['-c', run], { input: job.text, stdio: ['pipe', 'inherit', 'inherit'] });
    if (r.status !== 0 || !existsSync(job.out)) {
      throw new Error(`TTS_COMMAND failed for "${job.text.slice(0, 40)}"`);
    }
  }
}

/** The text the voice says: the subtitle with lexicon.json applied to whole words. */
function spokenText() {
  const lexFile = join(SRC, 'lexicon.json');
  const lexicon = existsSync(lexFile) ? JSON.parse(readFileSync(lexFile, 'utf8')) : {};
  const escape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (text) =>
    Object.entries(lexicon).reduce((t, [w, say]) => t.replace(new RegExp(`(?<![\\w/])${escape(w)}(?![\\w])`, 'g'), say), text);
}

/**
 * Prints what the voice says for each beat, with Kokoro's phonemes for each accent,
 * so that a reader can check acronyms and numbers without listening (video-design.md 6.4).
 */
function sayAll() {
  prepareKokoro();
  const spoken = spokenText();
  const accents = [...new Set((voices.length ? voices : ['af_heart']).map((v) => v[0]))];
  const jobs = allBeats().flatMap((b) => accents.map((a) => ({ id: b.id, voice: `${a}f_x`, text: spoken(b.text) })));
  const list = join(WORK, 'say-jobs.json');
  writeFileSync(list, JSON.stringify(jobs));
  const uid = process.getuid ? `${process.getuid()}:${process.getgid()}` : '1000:1000';
  const r = spawnSync('docker', ['run', '--rm', '--network', 'none', '--user', uid, '-e', 'HOME=/tmp', '-v', `${MODELS}:/models:ro`,
    '-v', `${REPO}:/work`, TTS_IMAGE, '--phonemes', `/work/${relative(REPO, list)}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
  if (r.status !== 0) {
    throw new Error('the phoneme run failed');
  }
  for (const line of r.stdout.trim().split('\n')) {
    const j = JSON.parse(line);
    console.log(`${j.id.padEnd(5)} ${j.lang}  ${j.text}\n      ${j.phonemes}`);
  }
}

/**
 * Makes one WAV file for each beat and each voice. A file is made again only when
 * its spoken text, voice or speed changes. Each beat gets the length of its longest
 * voice, so that all the voices fit the same video.
 */
function makeVoice() {
  if (voices.length === 0) {
    return;
  }
  const spoken = spokenText();
  const dir = join(WORK, 'audio');
  mkdirSync(dir, { recursive: true });
  const jobs = [];
  for (const ch of story.chapters) {
    for (const b of ch.beats) {
      b.audioFiles = {};
      const say = spoken(b.text);
      for (const voice of voices) {
        const key = createHash('sha256').update(JSON.stringify([ttsEngine, say, voice, speed])).digest('hex').slice(0, 16);
        const out = join(dir, `${b.id.replace('.', '-')}-${voice}-${key}.wav`);
        b.audioFiles[voice] = out;
        if (!existsSync(out)) {
          jobs.push({ text: say, voice, speed, out });
        }
      }
    }
  }
  if (jobs.length) {
    console.log(`speaking ${jobs.length} lines with ${ttsEngine} (${voices.join(', ')})`);
    (ttsEngine === 'kokoro' ? runKokoro : runCommand)(jobs);
  }
  for (const ch of story.chapters) {
    for (const b of ch.beats) {
      b.audioLengths = Object.fromEntries(voices.map((v) => [v, mediaSeconds(b.audioFiles[v])]));
      b.audio = Math.max(...Object.values(b.audioLengths));
    }
  }
}

/** Places one voice's files at their beat starts, normalizes the loudness, and writes an AAC track. */
function mixVoice(voice, timeline, out) {
  const clips = timeline.beats.map((b, i) => ({ start: b.start, file: allBeats()[i].audioFiles[voice] }));
  const inputs = clips.flatMap((c) => ['-i', c.file]);
  const delays = clips.map((c, i) => `[${i}:a]adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`);
  const mix = `${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]`;
  ffmpeg([...inputs, '-filter_complex', [...delays, mix].join(';'), '-map', '[aout]', '-t', String(timeline.duration),
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out]);
}

const allBeats = () => story.chapters.flatMap((ch) => ch.beats);

/** A readable name for a Kokoro voice id, for example bf_emma: "Emma · British English · female". */
const voiceLabel = (id) => {
  const m = id.match(/^([ab])([fm])_(\w+)$/);
  if (!m) {
    return id;
  }
  const name = m[3][0].toUpperCase() + m[3].slice(1);
  return `${name} · ${m[1] === 'a' ? 'American' : 'British'} English · ${m[2] === 'f' ? 'female' : 'male'}`;
};

// ---------------------------------------------------------------- canvas renderer

async function canvasPage() {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const font = (pkg, file) => readFileSync(join(HERE, 'node_modules', '@fontsource', pkg, 'files', file)).toString('base64');
  const fonts = [
    ['Inter', '400', font('inter', 'inter-latin-400-normal.woff2')],
    ['Inter', '600', font('inter', 'inter-latin-600-normal.woff2')],
    ['Inter', '700', font('inter', 'inter-latin-700-normal.woff2')],
    ['JetBrains Mono', '400', font('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2')],
    ['JetBrains Mono', '600', font('jetbrains-mono', 'jetbrains-mono-latin-600-normal.woff2')],
  ];
  await page.setContent('<!doctype html><body style="margin:0;background:#15171c"><canvas id="c" width="1920" height="1080"></canvas></body>');
  await page.evaluate(async ([list, story, timing]) => {
    window.STORY = story;
    window.TIMING = timing;
    for (const [family, weight, b64] of list) {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const face = new FontFace(family, bytes, { weight });
      document.fonts.add(await face.load());
    }
    await document.fonts.ready;
  }, [fonts, story, TIMING]);
  await page.addScriptTag({ path: join(HERE, 'canvas-engine.js') });
  await page.addScriptTag({ path: join(SRC, 'scenes.js') });
  await page.evaluate(() => {
    const m = new VIDEO.Movie();
    m.run(STORY, SCENES, VIDEO.kit(m));
    window.MOVIE = m;
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    window.frames = (times, type, quality, both) => times.map((t) => {
      MOVIE.render(ctx, t, { captions: false });
      const plain = canvas.toDataURL(type, quality);
      if (!both) {
        return [plain];
      }
      MOVIE.render(ctx, t, { captions: true });
      return [plain, canvas.toDataURL(type, quality)];
    });
  });
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  const timeline = await page.evaluate(() => ({ duration: MOVIE.duration, cues: MOVIE.cues, chapters: MOVIE.chapters, beats: MOVIE.beats }));
  return { browser, page, timeline };
}

const decode = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

function encoder(file) {
  const p = spawn(ffmpegPath, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg',
    '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => p.on('close', (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg exit ${code}`)))));
  const write = (buf) => new Promise((ok) => (p.stdin.write(buf) ? ok() : p.stdin.once('drain', ok)));
  return { write, end: () => { p.stdin.end(); return done; } };
}

async function canvasBuild(page, timeline) {
  const total = Math.ceil(timeline.duration * FPS);
  const silent = join(WORK, 'silent.mp4');
  const silentSub = join(WORK, 'silent-subtitled.mp4');
  const plain = encoder(silent);
  const burned = encoder(silentSub);
  const started = Date.now();
  for (let f = 0; f < total; f += BATCH) {
    const times = [];
    for (let k = f; k < Math.min(total, f + BATCH); k++) {
      times.push(k / FPS);
    }
    const imgs = await page.evaluate(([ts]) => window.frames(ts, 'image/jpeg', 0.95, true), [times]);
    for (const [a, b] of imgs) {
      await plain.write(decode(a));
      await burned.write(decode(b));
    }
    if (f % (FPS * 10) < BATCH) {
      console.log(`frame ${f}/${total} (${Math.round((100 * f) / total)}%) after ${((Date.now() - started) / 1000).toFixed(0)} s`);
    }
  }
  await Promise.all([plain.end(), burned.end()]);
  return { silent, silentSub };
}

// ---------------------------------------------------------------- manim renderer

/** Renders scenes.py with Manim Community in its container, with no network. */
function manimBuild() {
  const rel = relative(REPO, SRC);
  writeFileSync(join(WORK, 'story.json'), JSON.stringify({ ...story, timing: TIMING }, null, 2));
  rmSync(join(WORK, 'media'), { recursive: true, force: true });
  const uid = process.getuid ? `${process.getuid()}:${process.getgid()}` : '1000:1000';
  const args = ['run', '--rm', '--network', 'none', '--user', uid, '-v', `${REPO}:/work`, '-w', `/work/${rel}`,
    '-e', 'PYTHONPATH=/work/video/manim', '-e', 'STORY_JSON=.build/story.json', '-e', 'TIMELINE_JSON=.build/timeline.json',
    '-e', 'HOME=/tmp', MANIM_IMAGE, 'manim', 'render', '-qh', '--fps', String(FPS), '--disable_caching',
    '--media_dir', '.build/media', '-o', 'manim.mp4', 'scenes.py', 'Video'];
  console.log(`docker ${args.join(' ')}`);
  const r = spawnSync('docker', args, { stdio: 'inherit' });
  if (r.status !== 0) {
    throw new Error('the Manim render failed');
  }
  const found = execFileSync('find', [join(WORK, 'media', 'videos'), '-name', 'manim.mp4'], { encoding: 'utf8' }).trim().split('\n')[0];
  const timeline = JSON.parse(readFileSync(join(WORK, 'timeline.json'), 'utf8'));
  // Re-encode so that the video has the same settings as the canvas renderer.
  const silent = join(WORK, 'silent.mp4');
  ffmpeg(['-i', found, '-c:v', 'libx264', '-crf', '20', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', silent]);
  // Draw the subtitles with libass. It needs a TTF font, so use a system font folder if there is one.
  const subs = join(WORK, 'subtitles.srt');
  writeFileSync(subs, srt(timeline.cues));
  const fontsDir = ['/usr/share/fonts/truetype/dejavu', '/usr/share/fonts/dejavu', '/usr/share/fonts'].find(existsSync);
    // An SRT file has a 384x288 script size, so libass scales these numbers by 1080 / 288 = 3.75.
  const style = 'FontName=DejaVu Sans,FontSize=12,PrimaryColour=&H00FFFFFF,BorderStyle=4,BackColour=&H5A000000,Outline=2,Shadow=0,MarginV=12';
  const silentSub = join(WORK, 'silent-subtitled.mp4');
  const filter = `subtitles=${subs}${fontsDir ? `:fontsdir=${fontsDir}` : ''}:force_style='${style}'`;
  ffmpeg(['-i', silent, '-vf', filter, '-c:v', 'libx264', '-crf', '20', '-tune', 'animation', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', silentSub]);
  return { timeline, silent, silentSub };
}

// ---------------------------------------------------------------- outputs (section 8)

function writeOutputs(timeline, silent, silentSub) {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  ffmpeg(['-i', silent, '-c', 'copy', '-movflags', '+faststart', join(OUT, 'video.mp4')]);
  const voiceList = voices.map((id) => ({ id, label: voiceLabel(id), file: `audio-${id}.m4a` }));
  for (const v of voiceList) {
    mixVoice(v.id, timeline, join(OUT, v.file));
  }
  // The copy to share has the subtitles and the default voice in one file.
  const shared = join(OUT, 'video-subtitled.mp4');
  if (voiceList.length) {
    ffmpeg(['-i', silentSub, '-i', join(OUT, voiceList[0].file), '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', shared]);
  } else {
    ffmpeg(['-i', silentSub, '-c', 'copy', '-movflags', '+faststart', shared]);
  }
  const chapters = timeline.chapters.map((c, i) => ({
    n: c.n, title: c.title, section: c.section, start: +c.t.toFixed(3),
    end: +(i + 1 < timeline.chapters.length ? timeline.chapters[i + 1].t : timeline.duration).toFixed(3),
  }));
  writeFileSync(join(OUT, 'subtitles.vtt'), vtt(timeline.cues));
  writeFileSync(join(OUT, 'chapters.vtt'), vtt(chapters.map((c) => ({ start: c.start, end: c.end, text: `${c.n}. ${c.title}` }))));
  const info = { title: story.meta.title ?? '', duration: +timeline.duration.toFixed(3), fps: FPS, voices: voiceList, chapters };
  writeFileSync(join(OUT, 'video.json'), `${JSON.stringify(info, null, 2)}\n`);
  console.log(`wrote ${relative(REPO, OUT)}: video.mp4, video-subtitled.mp4, ${voiceList.map((v) => v.file).join(', ')}${voiceList.length ? ', ' : ''}subtitles.vtt, chapters.vtt, video.json`);
}

/** Checks that each voice ends before its beat ends (section 10.3). */
function checkVoices(timeline) {
  const beats = allBeats();
  timeline.beats.forEach((t, i) => {
    for (const [voice, len] of Object.entries(beats[i].audioLengths ?? {})) {
      if (t.start + len > t.end + 0.01) {
        throw new Error(`beat ${beats[i].id}: the ${voice} audio (${len.toFixed(2)} s) is longer than the beat`);
      }
    }
  });
}

/** Checks of section 10.3 that a program can do. */
function checkTimeline(timeline) {
  const problems = [];
  timeline.cues.forEach((c, i) => {
    const next = timeline.cues[i + 1];
    if (next && c.end > next.start) {
      problems.push(`cue ${i + 1} overlaps cue ${i + 2}`);
    }
    if (c.end - c.start < Math.min(TIMING.minRead, c.text.length / TIMING.readCps) - 0.3) {
      problems.push(`cue ${i + 1} is shorter than its reading time`);
    }
  });
  if (problems.length) {
    throw new Error(`timeline check failed:\n  ${problems.join('\n  ')}`);
  }
}

function printInfo(timeline) {
  console.log(`${story.meta.title ?? ''} · ${renderer} · ${timeline.duration.toFixed(1)} s · ${timeline.cues.length} cues`);
  timeline.chapters.forEach((c) => console.log(`${stamp(c.t)}  ${c.n}. ${c.title}${c.section ? `  {#${c.section}}` : ''}`));
  timeline.cues.forEach((c) => console.log(`  ${c.start.toFixed(1).padStart(6)}-${c.end.toFixed(1).padStart(6)}  ${c.text}`));
}

// ---------------------------------------------------------------- main

if (mode === 'say') {
  sayAll();
} else if (renderer === 'canvas') {
  if (mode === 'build') {
    makeVoice();
  }
  const { browser, page, timeline } = await canvasPage();
  try {
    checkTimeline(timeline);
    if (mode === 'info') {
      printInfo(timeline);
    } else if (mode === 'preview') {
      const dir = join(SRC, '.build', 'preview');
      mkdirSync(dir, { recursive: true });
      const times = (extra ?? '').split(',').filter(Boolean).map(Number);
      if (times.length === 0) {
        // The end of each beat is where its animation is complete.
        times.push(...timeline.beats.map((b) => +(b.end - 0.3).toFixed(1)));
      }
      const imgs = await page.evaluate(([ts]) => window.frames(ts, 'image/png', 1, true), [times]);
      imgs.forEach(([, png], i) => writeFileSync(join(dir, `t${times[i].toFixed(1).padStart(6, '0')}.png`), decode(png)));
      console.log(`wrote ${times.length} frames to ${relative(REPO, dir)}`);
    } else {
      checkVoices(timeline);
      const { silent, silentSub } = await canvasBuild(page, timeline);
      writeOutputs(timeline, silent, silentSub);
    }
  } finally {
    await browser.close();
  }
} else if (renderer === 'manim') {
  if (mode !== 'build') {
    console.error('info and preview need the canvas renderer. For Manim, run build, or run manim in the container with -s for one frame.');
    process.exit(2);
  }
  makeVoice();
  const { timeline, silent, silentSub } = manimBuild();
  checkTimeline(timeline);
  checkVoices(timeline);
  printInfo(timeline);
  writeOutputs(timeline, silent, silentSub);
} else {
  throw new Error(`unknown renderer "${renderer}". Use canvas or manim.`);
}
