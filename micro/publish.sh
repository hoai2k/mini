#!/usr/bin/env sh
# Publish Micro into a GitHub Pages output directory, mirroring micro/:
#   <site>/micro/                 micro/game/index.html (its src/ references
#                                 rewritten to game/src/), icons, manifest
#   <site>/micro/text_config.js   every player-facing string
#   <site>/micro/game_config.js   the hand-tunable game dynamics (read by
#                                 game/shared/config.js)
#   <site>/micro/game/            the shell (src/, music/), the world pages
#                                 (springtail/ ... phage/), zoom/, shared/
#                                 and assets/
#   <site>/micro/prototypes/      the prototype browser (the list and the
#                                 split-screen demo), see below
# Every relative path between these folders is the same in the repository and
# the deploy. Checks, tests, the research atlas and the design
# documents stay out.
# Usage: micro/publish.sh local/pages/micro
set -eu
out="${1:?output directory}"
here="$(cd "$(dirname "$0")" && pwd)"
rm -rf "$out"
mkdir -p "$out/game" "$out/prototypes"
copy() { # copy <from> <to>: every file under micro/<from>, minus checks and tests
  (cd "$here/$1" && find . -type f ! -name 'check*.mjs' ! -name 'play-check.mjs' ! -name '*.test.mjs' ! -path './test/*' -print) | while read -r f; do
    mkdir -p "$out/$2/$(dirname "$f")"
    cp "$here/$1/$f" "$out/$2/$f"
  done
}
copy game game
rm -f "$out/game/index.html" "$out/game/manifest.webmanifest"
rm -rf "$out/game/icons"
copy prototypes prototypes
cp "$here/text_config.js" "$out/text_config.js"
cp "$here/game_config.js" "$out/game_config.js"
cp -R "$here/game/icons" "$out/icons"
cp "$here/game/manifest.webmanifest" "$out/"
sed 's#"src/#"game/src/#g' "$here/game/index.html" > "$out/index.html"
grep -q '"game/src/boot.js"' "$out/index.html" || { echo "publish: index.html did not reference src/boot.js" >&2; exit 1; }
# The workbench (workbench/: the Audio tab, every sound trigger in both sound
# sets) is published at <site>/micro/workbench/ while deploy_config.json says
# includeWorkbenches: true (a missing or unreadable file counts as true); it
# reaches the game at ../game/, as in the repository.
flag() { # flag <name>: false only when deploy_config.json sets it to false
  python3 - "$here/deploy_config.json" "$1" <<'PY'
import json, sys
try:
    include = json.load(open(sys.argv[1])).get(sys.argv[2], True)
except Exception:
    include = True
sys.exit(1 if include is False else 0)
PY
}
if flag includeWorkbenches; then
  mkdir -p "$out/workbench"
  for f in index.html audio.js audio-triggers.js workbench.css; do cp "$here/workbench/$f" "$out/workbench/$f"; done
  echo "published the Micro workbench to $out/workbench/"
fi

# The prototype browser (the list page and the split-screen demo) is published
# only while deploy_config.json says includePrototypeBrowser: true (a missing or
# unreadable file counts as true). The world pages and zoom/ are under game/
# and stay either way: the game hosts them in frames.
if flag includePrototypeBrowser; then
  echo "published Micro Zoom to $out/ and the prototype browser to $out/prototypes/"
else
  rm -rf "$out/prototypes"
  echo "published Micro Zoom to $out/ (deploy_config.json: prototype browser left out)"
fi
