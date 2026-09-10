#!/usr/bin/env sh
# Copy the static sites under sites/ (everything except the shared images
# folder and READMEs) into a GitHub Pages output directory, so each site is
# published at <site>/sites/<name>/ next to the game.
# Usage: sites/publish.sh local/pages/sites
set -eu
out="${1:?output directory (the sites/ page directory)}"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$out"
for dir in "$here"/*/; do
  name="$(basename "$dir")"
  [ "$name" = "images" ] && continue
  [ -f "$dir/index.html" ] || continue
  rm -rf "$out/$name"
  cp -R "$dir" "$out/$name"
  echo "published $name to $out/$name/"
done
