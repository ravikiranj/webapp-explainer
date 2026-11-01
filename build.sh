#!/usr/bin/env bash
# Build all example apps and the landing index, then assemble the deployable
# site into site/.
#
#   site/
#     index.html            <- landing page (gallery + design doc)
#     assets/...
#     examples/
#       rate-limiter/        <- each app built with base './'
#       traffic-signal-timing/
#       unique-id-generator/
#       insulin-resistance/
#       chess-endgames/
#
# Every app is built with base './' so it works under any path on GitHub
# Pages. The landing page links to ./examples/<slug>/ with relative paths.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

EXAMPLES=(rate-limiter traffic-signal-timing unique-id-generator insulin-resistance chess-endgames)

echo "==> Cleaning site/"
rm -rf site
mkdir -p site/examples

echo "==> Building landing index"
cp design.md landing/src/design.md
cp video-design.md landing/src/video-design.md
cp video/README.md landing/src/video-maker.md
( cd landing && npm ci --no-fund --no-audit && npm run build )
cp -R landing/dist/. site/

# Render the video of each example that has a storyboard (see video-design.md).
# The canvas renderer needs Chromium (Playwright). The manim renderer needs Docker.
# Set SKIP_VIDEO=1 to build the apps with the videos that are already in each
# app's output/public/video/ folder, for example after "node video/release.mjs fetch".
if [ "${SKIP_VIDEO:-0}" != "1" ]; then
  echo "==> Installing the video tools"
  ( cd video && npm ci --no-fund --no-audit && npx playwright install chromium )
  for app in "${EXAMPLES[@]}"; do
    if [ -f "examples/$app/video/storyboard.md" ]; then
      echo "==> Rendering the video of: $app"
      node video/render.mjs build "examples/$app"
    fi
  done
fi

for app in "${EXAMPLES[@]}"; do
  echo "==> Building example: $app"
  ( cd "examples/$app/output" && npm ci --no-fund --no-audit && npm run build )
  mkdir -p "site/examples/$app"
  cp -R "examples/$app/output/dist/." "site/examples/$app/"
done

# GitHub Pages does not run Jekyll for us; a .nojekyll file keeps files that
# start with an underscore and avoids any Jekyll processing.
touch site/.nojekyll

echo "==> Done. The deployable site is in site/"
echo "    Open site/index.html"
