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
( cd landing && npm ci --no-fund --no-audit && npm run build )
cp -R landing/dist/. site/

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
