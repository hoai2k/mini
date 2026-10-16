#!/usr/bin/env bash
# Half-Blood Quests perf harness: serve the repo, run every measurement, summarise.
# Results and the CDN cache go to local/percyjackson-perf/ (not in Git).
#   bash percyjackson/perf/run-all.sh            (full: ~15 min)
#   QUICK=1 bash percyjackson/perf/run-all.sh    (auto tier only, 6 s per scene, no high/medium runs)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="${REPO:-$(cd "$HERE/../.." && pwd)}"
export PERF_DIR="${PERF_DIR:-$REPO/local/percyjackson-perf}"
export PERF_PORT="${PERF_PORT:-8765}"
export PERF_FLAGS="${PERF_FLAGS:-webgl}"
export NODE_PATH="${NODE_PATH:-/opt/node22/lib/node_modules}"
R="$PERF_DIR/results"
mkdir -p "$R"
if ! curl -s -o /dev/null "http://127.0.0.1:$PERF_PORT/percyjackson/game/"; then
  (cd "$REPO" && nohup python3 -m http.server "$PERF_PORT" --bind 127.0.0.1 > "$PERF_DIR/server.log" 2>&1 &)
  for i in $(seq 1 20); do curl -s -o /dev/null "http://127.0.0.1:$PERF_PORT/percyjackson/game/" && break; sleep 0.5; done
fi
cd "$HERE"
if [ -n "${QUICK:-}" ]; then
  node run.cjs --secs 6 --scenes title,hub,combat,lt4 --leak-cycles 2 --out results/run-quick.json
else
  node run.cjs --secs 12 --out results/run-auto.json
  PERF_W=480 PERF_H=270 node run.cjs --quality high --secs 6 --scenes title,hub,combat,lt4,boss-lt11 --no-leak --no-profile --out results/run-high.json
  PERF_W=480 PERF_H=270 node run.cjs --quality medium --secs 6 --scenes hub,combat,lt4 --no-leak --no-profile --out results/run-medium.json
  node profile-load.cjs hub,lt1,lt4,lt10
  node leak-hunt.cjs 3 > "$R/leak-hunt.txt"
  node --max-old-space-size=8000 retainers.cjs > "$R/retainers.txt"
fi
node summarize.cjs | tee "$R/summary.md"
