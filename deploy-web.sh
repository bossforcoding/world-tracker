#!/usr/bin/env bash
# Build the web version and publish it to the gh-pages branch (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist
npx expo export --platform web
cp dist/index.html dist/404.html   # deep links survive a page refresh
touch dist/.nojekyll               # keep the _expo/ folder (Jekyll drops _ dirs)
cd dist
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy web demo"
git push -f https://github.com/bossforcoding/world-tracker.git gh-pages
rm -rf .git
