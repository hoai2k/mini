#!/usr/bin/env sh
# Copy Bubble Chat (a static page, no build step) into a GitHub Pages output
# directory, so it is published at <site>/chat/. The shared multiplayer
# client comes from multiplayer/client/.
# Usage: chat/publish.sh local/pages/chat
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out"
cp "$here/index.html" "$here/privacy.html" "$here/debug-bot.html" "$here/styles.css" "$here/themes.css" "$here/manifest.webmanifest" "$here"/app-icon-*.png "$out/"
cp -R "$here/js" "$here/effects" "$here/games" "$out/"
rm -f "$out/effects/README.md" "$out/games/README.md"
if [ -d "$here/assets" ] && [ -n "$(ls -A "$here/assets" 2>/dev/null)" ]; then
  cp -R "$here/assets" "$out/"
fi
cp "$here/../multiplayer/client/mini-rooms.js" "$out/"
echo "published Bubble Chat to $out/"
