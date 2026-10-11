#!/usr/bin/env sh
# Copy Half-Blood Quests (static ES modules, no build step) into a GitHub Pages
# output directory, so it is published at <site>/percyjackson/. Only the web
# copies of the art are published (cards, hero portraits, title background,
# keyed logo), not the full-size PNG originals. The shared multiplayer client
# comes from multiplayer/client/.
# Usage: percyjackson/publish.sh local/pages/percyjackson
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out/assets" "$out/workbench"
cp "$here/game/index.html" "$here/game/style.css" "$out/"
cp -R "$here/game/js" "$out/"
cp -R "$here/game/assets/cards" "$here/game/assets/heroes" "$here/game/assets/music" "$out/assets/"
cp "$here/game/assets/title-bg.jpg" "$here/game/assets/logo-web.png" "$out/assets/"
cp "$here/game/workbench/models.html" "$out/workbench/"
cp "$here/../multiplayer/client/mini-rooms.js" "$out/"
echo "published Half-Blood Quests to $out/"
