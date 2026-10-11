#!/usr/bin/env sh
# Copy Half-Blood Quests (static ES modules, no build step) into a GitHub Pages
# output directory, so it is published at <site>/percyjackson/. The shared
# multiplayer client comes from multiplayer/client/.
# Usage: percyjackson/publish.sh local/pages/percyjackson
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/game/index.html" "$here/game/style.css" "$out/"
cp -R "$here/game/js" "$here/game/assets" "$out/"
cp "$here/../multiplayer/client/mini-rooms.js" "$out/"
echo "published Half-Blood Quests to $out/"
