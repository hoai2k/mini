# Micro Zoom performance harness

Measures a world's frame budget in headless Chromium (Playwright, SwiftShader).
Not published: `tools/` is outside the Pages build.

```bash
node micro/tools/perf/measure.mjs <world> [players=1] [seconds=8] [--size=1280x720] [--url=q=high] [--warm=8] [--tag=-before] [--native]
```

- `<world>` is a world folder under `micro/game/` (springtail … phage, zoom,
  split-demo) or `game` for the shell.
- Writes `<world>-<players>p<tag>.json` and a screenshot to `$PERF_OUT`
  (default `out/`, ignored by Git): CPU ms per frame, draw calls, triangles,
  uploads, heap growth, per-pass SwiftShader time and a CPU profile by file
  and function.
- `--url` appends a query string to the world's address. Use `q=high` (or
  `low`, `medium`, a number) to pin the quality governor so before and after
  runs compare like for like.
- `--native` keeps the real SwiftShader GPU name, so worlds take their
  software fallbacks; the default reports an Iris Xe so they run their GPU path.
- SwiftShader times are relative only. Compare CPU ms, draws, triangles,
  uploads and heap, and run before and after back to back on the same load.
