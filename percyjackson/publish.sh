#!/usr/bin/env sh
# Copy Half-Blood Quests (static ES modules, no build step) into a GitHub Pages
# output directory, so it is published at <site>/percyjackson/. Only the web
# copies of the art are published (cards, hero portraits, title background,
# keyed logo, the item icon sheets and the loot kit), not the full-size PNG originals. The shared multiplayer client
# comes from multiplayer/client/.
# Usage: percyjackson/publish.sh local/pages/percyjackson
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out/assets" "$out/workbench"
cp "$here/game/index.html" "$here/game/style.css" "$out/"
cp -R "$here/game/js" "$out/"
cp -R "$here/game/assets/cards" "$here/game/assets/heroes" "$here/game/assets/music" "$here/game/assets/ambience" "$here/game/assets/sfx" "$here/game/assets/concept" "$out/assets/"
cp "$here/game/assets/title-bg.jpg" "$here/game/assets/logo-web.png" "$out/assets/"
# the item icon sheets and the loot kit (ui/icons.js, ui/lootkit.js), with the list the game reads
cp "$here/game/assets/icons.json" "$here/game/assets/ui-loot-kit.png" "$here"/game/assets/icons-*.png "$out/assets/"
cp -R "$here/game/workbench/." "$out/workbench/"
cp "$here/../multiplayer/client/mini-rooms.js" "$out/"
echo "published Half-Blood Quests to $out/"
