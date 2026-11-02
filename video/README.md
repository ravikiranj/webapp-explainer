# video: the reference video maker

This folder turns a markdown storyboard into a video with chapters and subtitles,
as [video-design.md](../video-design.md) describes. It has two renderers that read
the same storyboard and give the same outputs.

| Renderer | Use it for | Needs |
| --- | --- | --- |
| `canvas` (default) | Boxes, flows, system diagrams, anything a webapp already draws | Node 18 or newer. Playwright downloads Chromium one time. |
| `manim` | Formulas, graphs, geometry, bit layouts: ideas that are math | Docker. It runs [Manim Community](https://www.manim.community/) in its official image, with no network. |

Manim has two versions. This tool uses Manim Community (`manim`), which renders with
Cairo on a CPU and needs no display. The original ManimGL (`manimgl`, the version
in the 3b1b/manim repository) needs OpenGL, so it does not run on most build servers.

## Files

| File | What it does |
| --- | --- |
| `storyboard.mjs` | Reads `storyboard.md`. Holds the timing numbers (`TIMING`) that both renderers use. |
| `render.mjs` | The command. Renders, mixes the optional voice, writes the files. |
| `release.mjs` | Packs the rendered videos for a GitHub release, checks them, downloads them. |
| `release.json` | The release that the site uses: its tag, the archive hashes, and the source hashes. |
| `canvas-engine.js` | The canvas engine: a deterministic timeline of boxes, labels, lines, dots and a camera. |
| `manim/storyboard_scene.py` | The Manim base class: plays the storyboard, holds each beat, writes the timeline. |
| `tts/` | The Kokoro TTS image: `Dockerfile` and `kokoro_batch.py`. The model files go to `tts/models/`, which git ignores. |

The video player for an app is in [`../shared/video-player.ts`](../shared/video-player.ts).

## A subject

```
examples/<name>/
  video.md               the brief (section 2.1 of the design)
  video/
    storyboard.md        the chapters and beats (section 4)
    scenes.js            canvas: one function for each chapter, one for each beat
    scenes.py            manim: class Video(StoryboardScene), the same shape
    lexicon.json         optional: how the voice says hard words
  output/public/video/   written by render.mjs; git ignores it
```

Worked examples:

- [`examples/rate-limiter/video/`](../examples/rate-limiter/video/) uses `canvas`.
- [`examples/unique-id-generator/video/`](../examples/unique-id-generator/video/) uses `manim`.

## Commands

Run them from this folder.

```bash
npm ci
npx playwright install chromium          # one time, for the canvas renderer
docker pull manimcommunity/manim:v0.22.1 # one time, for the manim renderer
# The voice image and the model files are made by the first build that needs them.

node render.mjs info    ../examples/rate-limiter          # chapters and cues with times
node render.mjs preview ../examples/rate-limiter          # a PNG at the end of each beat
node render.mjs preview ../examples/rate-limiter 12,40.5  # PNGs at these times
node render.mjs say     ../examples/rate-limiter          # the spoken text and phonemes of each beat
node render.mjs build   ../examples/rate-limiter          # the full video and its files
node render.mjs remix   ../examples/rate-limiter          # the voices again, with the frames of the last build
```

`remix` reuses the silent renders in `<subject>/video/.build/` (and, for Manim,
`timeline.json`). It makes TTS again only for the lines whose spoken text changed,
mixes the voices, and writes all the outputs. Use it after a change to
`lexicon.json`, the voices or the mix. It needs a `build` first. If a new line is
longer than its beat, it stops: run `build`.

ffmpeg comes from the `ffmpeg-static` package, which has `libvpx-vp9` and `libopus`.
A static ffmpeg 7 build (which also has `ffprobe`) works too. When you run ffmpeg
yourself in a shell loop, add `-y` and `< /dev/null`, or it stops at a question or
reads the loop's input.

`preview` writes to `<subject>/video/.build/preview/`. Look at each frame before a
full build (section 10.2 of the design). `info` and `preview` work with the canvas
renderer only. For Manim, run `build` and take frames from the video with ffmpeg.

`bash build.sh` at the top of the repository renders the video of each example that
has a storyboard, then builds the apps. `SKIP_VIDEO=1 bash build.sh` skips the render.

The videos are published as a GitHub release, not committed. `release.mjs` packs them
(`pack <tag>`), checks that they still match the storyboards (`check`), and downloads
them (`fetch`). See "Videos" in the [top README](../README.md) for the steps.

## How a beat becomes time

`storyboard.mjs` reads each numbered item as a beat. Its text is the subtitle, and
the narration when there is a voice. The scene gives one animation for each beat.
The beat lasts as long as the longest of its reading time, its narration, and its
animation, plus a pause. The subtitle cue covers the beat. The numbers are in
`TIMING`. So a change to the text, the voice, or an animation moves everything after
it, and the subtitles, the chapters, and the audio stay in step.

A scene file must give exactly one function for each beat. If the counts differ,
the build stops and names the chapter.

## Narration

List the voices in the storyboard front matter. The first one is the default. Use
`none`, or leave the line out, for subtitles only.

```yaml
voices: af_heart, am_michael, bf_emma, bm_george
speed: 1.0          # 0.8 to 1.2
```

The default engine is [Kokoro-82M](https://github.com/hexgrad/kokoro) through
[kokoro-onnx](https://github.com/thewh1teagle/kokoro-onnx), on a CPU. `render.mjs`
downloads the model files one time from the kokoro-onnx release (about 350 MB, with
no account), checks their SHA-256, builds the small image in `tts/`, and runs it with
no network. Voice ids start with the accent and the gender: `af_` American female,
`am_` American male, `bf_` British female, `bm_` British male. Kokoro lists its voices
and their quality grades in its VOICES.md file. The licences are Apache-2.0 for the
Kokoro weights and MIT for kokoro-onnx. kokoro-onnx uses espeak-ng (GPL-3.0) to read
words it does not know.

For each beat and each voice, `render.mjs` makes one WAV file. It keeps the file while
the text, the voice and the speed do not change. It applies `lexicon.json` to the
spoken text only, so the subtitle shows "IDs" and the voice says "eye deez". A beat
lasts as long as its longest voice, so every voice fits the same video. Then each
voice is mixed into its own Opus track, `audio-<voice>.webm`, at about -16 LUFS.
Each line gets a 10 ms fade-in and a 15 ms fade-out first, so that no line starts or
stops with a click. The build stops if a voice is longer than its beat.

### Pronunciation: check it, do not guess it

An agent cannot hear the audio, so it must check what the voice says with
`node render.mjs say <subject>`. The command prints the spoken text of each beat
(after `lexicon.json`) and the phonemes that Kokoro makes, for each accent in
`voices`. Read every acronym, symbol and number in that output before a build.

Rules that come from real mistakes:

1. Write the acronym as it is first. Kokoro reads most all-capital words as
   letters: `API` gives /eɪ piː aɪ/, `ID` gives /aɪ diː/, `UUID` gives /juː juː aɪ diː/.
   Add a lexicon entry only when the phonemes are wrong.
2. Do not spell an acronym with single letters and spaces. `A P I` reads the
   first `A` as the word "a" (/ɐ/), and `I Ds` reads as "eye dee ess".
3. Respell with ordinary words that have one reading: `"IDs": "eye deez"`,
   `"SQL": "sequel"`, `"nginx": "engine x"`. A plural acronym often loses its
   "s": `IDs` reads as /aɪ diː/ alone.
4. A lexicon entry matches whole words and is case sensitive. Add each form that
   the text uses (`ID` and `IDs` are two entries).
5. Check numbers, units and symbols too. `4.2` and `1,024` read well. `/s`, `x`
   for "times", `ms`, `TPS` and code names (`tRPC`, `getFeed`) need a check, or
   write them as words in the narration.
6. Each accent has its own reading. `say` prints `en-us` and `en-gb` when the
   voices use both.
7. After a change, run `say` again. Then `build` makes only the lines whose
   spoken text changed again.

The player shows a voice list (all voices, and "No voice") and keeps the choice in
the browser. `video.webm` holds the default voice (`embeddedVoice` in `video.json`),
so the default plays from the video element itself: a click on play starts the sound
in every browser, with nothing to keep in sync. Another voice plays from its own
`audio-<voice>.webm` while the video is muted, and moves back to the video time when
the two differ by more than 0.3 seconds. "No voice" mutes the video.
`video-subtitled.webm` has the subtitles and the default voice in one file.
The player draws the subtitles itself, from `subtitles.vtt`. The video element has no `<track>`, so the browser shows no subtitle menu of its own. They are off at first. The viewer can turn them
on and pick the size, style, colour and position. A fullscreen button keeps them
visible in fullscreen.

To use another engine, set `tts: command` in the storyboard and `TTS_COMMAND` to any
command that reads text on stdin and writes a WAV file. `{voice}` and `{out}` are
replaced.

```bash
TTS_COMMAND='my-tts --voice {voice} --output {out}' node render.mjs build ../examples/rate-limiter
```

## Outputs

`video.webm` (with the default voice), `audio-<voice>.webm` for each voice,
`video-subtitled.webm`, `subtitles.vtt`, `chapters.vtt` and `video.json`, in
`<subject>/output/public/video/`. Vite copies `public/` into the app build, and the
app's Video section plays them.

All media is WebM: VP9 video (`-crf 34 -b:v 0 -row-mt 1 -deadline good -cpu-used 4`)
and Opus audio at 64 kbit/s. Both are royalty-free. There is no MP4.

`VIDEO_OUT=<folder>` writes the outputs to another folder, so that one app can hold
many videos. A subject folder can also hold `storyboard.md` directly, with no
`video/` folder.

## Links into the video

The player reads the URL fragment:

- `#video&t=95`, `#video&t=1:35` and `#video&t=1m35s` open the video at 1:35.
- "Copy link at this time", under the player, copies a link to the current second.
- In an app that has a text version of a section (`hasTextView: true`), `mode=video`
  or `mode=text` names the view. The order is the URL, then the last view in this
  browser, then video. See section 9.11 of the design.

## Check the sound in a browser

A headless browser does not report autoplay in a way you can trust. Check the sound
with a click on play, in Chromium and in Firefox, with Playwright
(`npx playwright install firefox`). Remove the Firefox download after the check if
the disk is small.
