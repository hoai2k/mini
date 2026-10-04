#!/usr/bin/env sh
# Copy the Bronze Drum prototype into a GitHub Pages output directory, so it
# is published at <site>/bronzedrum/. The game is static (no build step);
# tests, scripts and package.json stay out of the deploy.
# Usage: bronzedrum/publish.sh local/pages/bronzedrum
set -eu
out="${1:?output directory (the bronzedrum page directory)}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$here/game/styles.css" "$out/"
cp -R "$here/game/src" "$here/game/assets" "$out/"
echo "published bronzedrum to $out/"
