#!/usr/bin/env sh
# Copy Meditation Timer (static ES modules, no build step) into a GitHub Pages
# output directory, so it is published at <site>/meditation/. Tests, design
# documents and the master icon art stay behind.
# Usage: meditation/publish.sh local/pages/meditation
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/app/index.html" "$here/app/styles.css" "$here/app/icon.svg" "$here/app/manifest.webmanifest" "$here/app/sw.js" "$out/"
cp -R "$here/app/src" "$here/app/data" "$here/app/icons" "$here/app/assets" "$here/app/sounds" "$out/"
rm -f "$out/icons/icon-1024.png" "$out/icons/favicon-256.png"
find "$out" -name .gitkeep -delete
echo "published Meditation Timer to $out/ ($(du -sh "$out" | cut -f1))"
