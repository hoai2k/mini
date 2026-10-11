#!/usr/bin/env sh
# Copy Ai-Ching (static ES modules, no build step) into a GitHub Pages output
# directory, so it is published at <site>/aiching/. The page, its styles, its
# code, its data and the web copies of the delivered art (app/web/, made by
# tools/build_web.py) go out; the full-size art, tests and design documents stay.
# Usage: aiching/publish.sh local/pages/aiching
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/app/index.html" "$here/app/styles.css" "$out/"
cp -R "$here/app/src" "$here/app/data" "$here/app/web" "$out/"
echo "published Ai-Ching to $out/ ($(du -sh "$out" | cut -f1))"
