# webapp-explainer

A set of small static webapps. Each app explains one subject with short text
and many charts, following the template in [design.md](./design.md). A landing
index showcases every app, and the whole thing deploys to GitHub Pages.

To turn a subject into a short narrated video with chapters and subtitles, use
[video-design.md](./video-design.md). It extends the webapp template. The reference video maker is in
[video/](./video/README.md): a canvas renderer for diagrams and a Manim renderer for math.
The rate-limiter and unique-id-generator apps each have a Video section built with it.

## The apps

| App | Subject | Data |
| --- | --- | --- |
| [rate-limiter](./examples/rate-limiter/) | Rate limiting from one node to many regions | mock teaching data |
| [traffic-signal-timing](./examples/traffic-signal-timing/) | Signal timing from one light to a city | mock teaching data |
| [unique-id-generator](./examples/unique-id-generator/) | Unique IDs from one node to many regions | mock teaching data |
| [insulin-resistance](./examples/insulin-resistance/) | Insulin resistance and higher South Asian risk | real, cited data |
| [chess-endgames](./examples/chess-endgames/) | An interactive endgame trainer up to 1800 ELO | bundled Stockfish engine |

Each app is a Vite + TypeScript project in `examples/<name>/output/`, built with
`base: './'` so it works under any path. Each app also has a "The problem"
section that shows the original brief.

The landing page lives in `landing/`. It has two tabs: a gallery of all the
apps, and the design document rendered as markdown.

## Build everything

```bash
bash build.sh               # renders the videos, then builds every app
SKIP_VIDEO=1 bash build.sh  # builds with the videos already in place (see "Videos")
```

This builds the landing page and every example, then assembles the deployable
site into `site/`:

```
site/
  index.html                 landing page
  examples/
    rate-limiter/
    traffic-signal-timing/
    unique-id-generator/
    insulin-resistance/
    chess-endgames/           includes a bundled Stockfish engine (engine/)
```

## Videos

The rate-limiter and unique-id-generator apps have a Video section. The videos are
made by the [video maker](./video/README.md) from each app's `video/storyboard.md`.
They are not in git: they are published as a GitHub release, and
[`video/release.json`](./video/release.json) names that release.

### Use the published videos

No video tools are needed. This is what the deploy workflow does.

```bash
node video/release.mjs check   # the published videos match the storyboards
node video/release.mjs fetch   # download, check the SHA-256, unpack into each app
SKIP_VIDEO=1 bash build.sh
```

### Regenerate the videos

Do this after a change to a storyboard, a scene file, or a lexicon. The deploy
workflow fails at `release.mjs check` until a new release is published.

1. Install the tools, one time. You need Node 20 or newer, Docker, curl and tar.

   ```bash
   cd video
   npm ci
   npx playwright install chromium            # the canvas renderer
   docker pull manimcommunity/manim:v0.22.1   # the Manim renderer
   cd ..
   ```

   The first build that needs a voice downloads the Kokoro model files (about
   350 MB, from the kokoro-onnx GitHub release, with no account), checks their
   SHA-256, and builds the `video-maker-tts` image. The model files go to
   `video/tts/models/`, which git ignores.

2. Check the text and the voice before a full render.

   ```bash
   node video/render.mjs info    examples/rate-limiter   # chapters and cues with times
   node video/render.mjs preview examples/rate-limiter   # a PNG at the end of each beat
   node video/render.mjs say     examples/rate-limiter   # the phonemes of each line
   ```

   Look at the PNGs in `examples/<app>/video/.build/preview/`. Read the phonemes
   of each acronym and number (see "Pronunciation" in the video maker README).
   `preview` works for the canvas renderer only.

3. Render. This writes each app's `output/public/video/`.

   ```bash
   node video/render.mjs build examples/rate-limiter
   node video/render.mjs build examples/unique-id-generator
   # or: bash build.sh, which renders every app that has a storyboard
   ```

   A voice line is spoken again only when its text, voice or speed changed.
   Expect a few minutes for each app.

4. Pack the videos for a new release. Use a new tag each time.

   ```bash
   node video/release.mjs pack videos-v2
   ```

   This writes `release/<app>-video.tar.gz` (git ignores `release/`) and updates
   `video/release.json` with the tag, the SHA-256 of each archive, and a hash of
   the files each video was made from.

5. Publish the release with the archives, either on the GitHub releases page or with:

   ```bash
   gh release create videos-v2 release/*.tar.gz --title "Rendered videos v2" \
     --notes "Made with: node video/render.mjs build examples/<app>"
   ```

6. Commit `video/release.json` together with the source changes, and push. The
   deploy workflow checks, downloads and serves the new videos.

The release keeps the old tags, so an old commit still builds with its own videos.

## Run locally

```bash
bash build.sh
python3 -m http.server 8137 --bind 127.0.0.1 --directory site
# open http://127.0.0.1:8137/
```

## Deploy to GitHub Pages

Pushing to `main` runs [.github/workflows/deploy.yml](./.github/workflows/deploy.yml),
which runs `build.sh` and publishes `site/`. In the repository settings, set
Pages to deploy from GitHub Actions. The published URL looks like:

```
https://<user>.github.io/<repo>/
```

Every app is reachable from the landing page, or directly at
`https://<user>.github.io/<repo>/examples/<name>/`.

## Notes

- Rendered videos, voice clips, model files and release archives are not in git. See "Videos".
- The apps share one look from `shared/` (Bootstrap 5.3, Bootstrap Icons, Inter, a light/dark theme, a step-through diagram, and the app shell).
- The chess trainer bundles the Stockfish WebAssembly engine locally
  (`examples/chess-endgames/output/public/engine/`). It makes no network call.
  It uses the single-threaded "lite" build, so it needs no special
  cross-origin isolation headers and runs on plain GitHub Pages.
- Progress in the chess trainer saves in the browser, per profile.
- The insulin-resistance app uses only real, cited numbers. Every figure names
  its source (WHO 2004, IDF 2006, Ntuk et al. 2014, Caleyachetty et al. 2021).
