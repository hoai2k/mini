#!/usr/bin/env sh
# Copy Tank Wars (a static page, no build step) into a GitHub Pages output
# directory, so it is published at <site>/tankwars/. The shared multiplayer
# client comes from multiplayer/client/.
# Usage: tankwars/publish.sh local/pages/tankwars
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$here/game/styles.css" "$here/game/menu.js" "$here/game/game.js" "$here/game/favicon.png" "$out/"
cp "$here/../multiplayer/client/mini-rooms.js" "$out/"
echo "published Tank Wars to $out/"
