#!/usr/bin/env sh
# Copy the static sites under sites/ (everything except the shared images
# folder and READMEs) into a GitHub Pages output directory, so each site is
# published at <site>/sites/<name>/ next to the game.
# Usage: sites/publish.sh local/pages/sites
set -eu
out="${1:?output directory (the sites/ page directory)}"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$out"
# The shared music folder holds recordings that live with the sites rather
# than with a game; it has no index.html, so copy it explicitly.
if [ -d "$here/music" ]; then
  rm -rf "$out/music"
  cp -R "$here/music" "$out/music"
  echo "published shared music to $out/music/"
fi
# Scripts shared by several band pages (the ?debug=play switch). Same story
# as music/: no index.html of its own, so copy it explicitly.
if [ -d "$here/shared" ]; then
  rm -rf "$out/shared"
  cp -R "$here/shared" "$out/shared"
  echo "published shared scripts to $out/shared/"
fi
for dir in "$here"/*/; do
  name="$(basename "$dir")"
  [ "$name" = "images" ] && continue
  [ "$name" = "music" ] && continue
  [ "$name" = "shared" ] && continue
  [ -f "$dir/index.html" ] || continue
  rm -rf "$out/$name"
  cp -R "$dir" "$out/$name"
  # A site's media/ folder holds the original drops (raw phone video and
  # full-size photos); the page uses the web copies in assets/, so leave the
  # originals out of the deploy.
  rm -rf "$out/$name/media"
  echo "published $name to $out/$name/"
done
