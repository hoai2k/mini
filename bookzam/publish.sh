#!/usr/bin/env sh
# Copy Bookzam (static ES modules, no build step) into a GitHub Pages output
# directory, so it is published at <site>/bookzam/. Tests, tools and design
# documents stay behind.
# Usage: bookzam/publish.sh local/pages/bookzam
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/app/index.html" "$here/app/styles.css" "$here/app/manifest.webmanifest" "$out/"
cp -R "$here/app/src" "$here/app/icons" "$here/app/models" "$here/app/vendor" "$here/app/data" "$out/"
if [ -d "$here/app/assets" ]; then cp -R "$here/app/assets" "$out/"; fi
echo "published Bookzam to $out/ ($(du -sh "$out" | cut -f1))"
