# webapp-explainer

A set of small static webapps. Each app explains one subject with short text
and many charts, following the template in [design.md](./design.md). A landing
index showcases every app, and the whole thing deploys to GitHub Pages.

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
bash build.sh
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

- The chess trainer bundles the Stockfish WebAssembly engine locally
  (`examples/chess-endgames/output/public/engine/`). It makes no network call.
  It uses the single-threaded "lite" build, so it needs no special
  cross-origin isolation headers and runs on plain GitHub Pages.
- Progress in the chess trainer saves in the browser, per profile.
- The insulin-resistance app uses only real, cited numbers. Every figure names
  its source (WHO 2004, IDF 2006, Ntuk et al. 2014, Caleyachetty et al. 2021).
