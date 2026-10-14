#!/usr/bin/env sh
# Copy Music Practice (static ES modules, no build step) into a GitHub Pages
# output directory, so it is published at <site>/musicpractice/. Tests and
# design documents stay behind.
# Usage: musicpractice/publish.sh local/pages/musicpractice
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/app/index.html" "$here/app/privacy.html" "$here/app/styles.css" "$here/app/manifest.webmanifest" "$out/"
cp -R "$here/app/src" "$here/app/data" "$here/app/assets" "$here/app/icons" "$here/app/vendor" "$out/"
rm -f "$out/icons/icon-1024.png" "$out/icons/icon-art-deco-1024.png" # master art stays in the repository
echo "published Music Practice to $out/ ($(du -sh "$out" | cut -f1))"
