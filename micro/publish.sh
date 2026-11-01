#!/usr/bin/env sh
# Publish Micro into a GitHub Pages output directory:
#   <site>/micro/             the Micro Zoom game (micro/game/index.html at the
#                             root, its modules under game/src/)
#   <site>/micro/prototypes/  the prototypes (static ES modules, no build step),
#                             which the game also loads its worlds from.
# The game's modules reach the prototypes at ../../prototypes/ from game/src/,
# both in the repository and here, so only index.html's own references move
# (src/ becomes game/src/). The research atlas, design documents and checks
# stay out of the deploy.
# Usage: micro/publish.sh local/pages/micro
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out/prototypes" "$out/game"
(cd "$here/prototypes" && find . -type f ! -name 'check.mjs' ! -path './test/*' -print) | while read -r f; do
  mkdir -p "$out/prototypes/$(dirname "$f")"
  cp "$here/prototypes/$f" "$out/prototypes/$f"
done
cp -R "$here/game/src" "$out/game/src"
cp -R "$here/game/music" "$out/game/music"
cp -R "$here/game/icons" "$out/icons"
cp "$here/game/manifest.webmanifest" "$out/"
sed 's#"src/#"game/src/#g' "$here/game/index.html" > "$out/index.html"
grep -q '"game/src/boot.js"' "$out/index.html" || { echo "publish: index.html did not reference src/boot.js" >&2; exit 1; }
# The prototype browser (the list page and the split-screen demo) is published
# only while deploy_config.json says includePrototypeBrowser: true (a missing or
# unreadable file counts as true). The world pages and zoom/ stay either way:
# the game hosts them in frames.
if python3 - "$here/deploy_config.json" <<'PY'
import json, sys
try:
    include = json.load(open(sys.argv[1])).get("includePrototypeBrowser", True)
except Exception:
    include = True
sys.exit(1 if include is False else 0)
PY
then
  echo "published Micro Zoom to $out/ and the Micro prototypes to $out/prototypes/"
else
  rm -rf "$out/prototypes/index.html" "$out/prototypes/split-demo" "$out/prototypes/CONTROLS.md"
  echo "published Micro Zoom to $out/ (deploy_config.json: prototype browser left out)"
fi
