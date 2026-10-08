#!/usr/bin/env sh
# Copy One Monster After Another (static ES modules, no build step) into a
# GitHub Pages output directory, so it is published at <site>/onemonster/.
# Only the page, its styles, its code and the web sprites go out: the delivered
# source sheets in game/assets/ (cut into game/sprites/ by tools/build_sprites.py),
# the design documents and the book's reference photos stay out of it.
# Usage: onemonster/publish.sh local/pages/onemonster
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$here/game/styles.css" "$out/"
cp -R "$here/game/src" "$out/"
cp -R "$here/game/sprites" "$out/"
echo "published One Monster After Another to $out/ ($(du -sh "$out" | cut -f1))"
