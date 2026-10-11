#!/usr/bin/env sh
# Copy Ear Trainer (static ES modules, no build step) into a GitHub Pages output
# directory, so it is published at <site>/eartrainer/. Tests and design
# documents stay behind.
# Usage: eartrainer/publish.sh local/pages/eartrainer
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/app/index.html" "$here/app/styles.css" "$here/app/manifest.webmanifest" "$out/"
cp -R "$here/app/src" "$here/app/data" "$here/app/assets" "$here/app/icons" "$out/"
echo "published Ear Trainer to $out/ ($(du -sh "$out" | cut -f1))"
