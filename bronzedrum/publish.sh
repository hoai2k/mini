#!/usr/bin/env sh
# Copy the Bronze Drum prototype into a GitHub Pages output directory, so it
# is published at <site>/bronzedrum/. The game is static (no build step);
# tests, scripts, package.json and the PNG art masters stay out of the deploy.
# Usage: bronzedrum/publish.sh local/pages/bronzedrum
set -eu
out="${1:?output directory (the bronzedrum page directory)}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$here/game/styles.css" "$here/game/manifest.webmanifest" "$out/"
cp -R "$here/game/icons" "$out/"
cp -R "$here/game/src" "$out/"
# Assets without the full-size PNG masters: the game loads the WebP copies in
# assets/web/ (see design/source/build_web_art.py).
mkdir -p "$out/assets"
for item in "$here/game/assets"/*; do
  [ "$(basename "$item")" = "art" ] && continue
  cp -R "$item" "$out/assets/"
done
echo "published bronzedrum to $out/"
