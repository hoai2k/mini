#!/usr/bin/env sh
# Copy One Monster After Another (static ES modules, no build step) into a
# GitHub Pages output directory, so it is published at <site>/onemonster/.
# The design documents and the book reference photos stay out of it.
# Usage: onemonster/publish.sh local/pages/onemonster
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$out/"
cp -R "$here/game/src" "$out/"
if [ -d "$here/game/assets" ] && [ -n "$(ls -A "$here/game/assets" 2>/dev/null)" ]; then
  cp -R "$here/game/assets" "$out/"
fi
echo "published One Monster After Another to $out/"
