#!/usr/bin/env sh
# Copy Gliders (static ES modules, no build step) into a GitHub Pages output
# directory, so it is published at <site>/gliders/. Tests, scripts and dev
# tools stay out of the deploy.
# Usage: gliders/publish.sh local/pages/gliders
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$here/game/styles.css" "$here/game/manifest.webmanifest" "$here/game/public-access.json" "$out/"
cp -R "$here/game/src" "$here/game/vendor" "$here/game/icons" "$out/"
if [ -d "$here/game/assets" ] && [ -n "$(ls -A "$here/game/assets" 2>/dev/null)" ]; then
  cp -R "$here/game/assets" "$out/"
fi
echo "published Gliders to $out/"
