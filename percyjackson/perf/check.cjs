// The pre-push check runner: every check of Half-Blood Quests in one go, in
// one headless Chromium, with one summary table.
//
//   NODE_PATH=/opt/node22/lib/node_modules node percyjackson/perf/check.cjs
//     [--only a,b] [--skip a,b] [--fast] [--json] [--port N] [--log dir]
//     [--serial] [--verbose] [--shots dir]
//
// It serves the repository itself (Node's http, on a free port, stopped at
// the end; --port N uses a server already on 127.0.0.1:N instead), launches
// one Chromium and runs the checks in it, in lanes at once (--serial: one
// after another), each lane its own page: the game (smoke); a blank page with
// the workbench's import map (weapons, houndlegs, animlint); the model
// workbench (props, rig); --shards N workbench pages (default 3) that split
// the models between them for islands and bodysize; the shots page; and the
// node tests and the design check as child processes. The render benchmark
// (bench) runs last, alone, so its CPU times are not shared with the others.
//
// islands and bodysize both measure every workbench model unmerged and at
// rest: on each shard islands builds its models once and leaves them in the
// page, and bodysize measures those rigs instead of building its own (the
// same build, the same rest pose), all against one Percy (measured on the
// first shard). The rows are put back in the workbench's order.
//
// Each check is the module of its old script (smoke.cjs, weapons.cjs, ...;
// each still runs on its own as before) and reports exactly what that script
// prints: --log dir writes each one's full report to dir/<check>.txt,
// --verbose prints them all, and a failing check's report is always printed.
// --json prints one JSON object instead of the table. --fast skips the slow
// checks (smoke, islands and bench) for quick iteration. Exits 1 if any
// check fails. PERF_SEED=n seeds Math.random before each model (lib.cjs
// reseed), so two runs compare number for number.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const lib = require('./lib.cjs');

const PJ = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const list = (k) => (opt(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const has = (k) => args.includes('--' + k);
// islands and bodysize: how many workbench pages share the models (--shards N)
const SHARDS = Math.max(1, +(opt('shards') ?? 3));

// ---- the checks -------------------------------------------------------------
// lane: which page it shares (or 'proc', a child process); slow: left out by --fast
const CHECKS = [
  { name: 'node', lane: 'proc', what: 'node tests (game/test)' },
  { name: 'design', lane: 'proc', what: 'design/source/build_requests.py --check' },
  { name: 'smoke', lane: 'game', slow: true, what: 'smoke.cjs: every chapter loads, no page errors' },
  { name: 'weapons', lane: 'models', what: 'weapons.cjs: weapons point forward, ranged aim' },
  { name: 'houndlegs', lane: 'models', what: 'houndlegs.cjs: hellhound legs attached' },
  { name: 'animlint', lane: 'models', what: 'animlint.cjs: floor, parts flying off, strikes' },
  { name: 'props', lane: 'wb', what: 'props.cjs: grip, arm, clip, cloth, strike' },
  { name: 'rig', lane: 'wb', what: 'the rig contract (validateRig / __validateAll), if the workbench has it' },
  { name: 'islands', lane: 'wb', slow: true, what: 'islands.cjs --check: floating voxel islands' },
  { name: 'bodysize', lane: 'wb', what: "bodysize.cjs - '' --check: size categories, head and leg rules" },
  { name: 'shots', lane: 'shots', what: 'render-bench.cjs shots: deterministic model images' },
  { name: 'bench', lane: 'bench', slow: true, what: 'render-bench.cjs wb: draws, triangles, frame CPU per model' },
];

// ---- child processes --------------------------------------------------------
function proc(cmd, argv, cwd) {
  return new Promise((resolve) => {
    const c = spawn(cmd, argv, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    c.stdout.on('data', (d) => { out += d; }); c.stderr.on('data', (d) => { out += d; });
    c.on('error', (e) => resolve({ code: -1, out: out + String(e) }));
    c.on('close', (code) => resolve({ code, out }));
  });
}
async function nodeTests() {
  const dir = path.join(PJ, 'game');
  const files = fs.readdirSync(path.join(dir, 'test')).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => 'test/' + f);
  const { code, out } = await proc(process.execPath, ['--test', ...files], dir);
  const n = (k) => +(out.match(new RegExp(`^# ${k} (\\d+)`, 'm'))?.[1] ?? NaN);
  const summary = { tests: n('tests'), pass: n('pass'), fail: n('fail'), files: files.length };
  return { ok: code === 0, lines: out.trimEnd().split('\n'), summary, text: `${summary.tests} tests in ${files.length} files, ${summary.fail} failed` };
}
async function designCheck() {
  const { code, out } = await proc('python3', ['design/source/build_requests.py', '--check'], PJ);
  const lines = out.trimEnd().split('\n');
  return { ok: code === 0, lines, summary: { exit: code }, text: (lines.filter(Boolean).pop() ?? '').slice(0, 90) };
}

// ---- the rig contract -------------------------------------------------------
// The rig contract (js/entities/rigContract.js validateRig, run over every
// workbench model by the workbench's window.__validateAll, which builds them
// unmerged): run it if the workbench has it, else skip with a note. Results
// are read loosely: a map (or an array) of models, each { ok, problems },
// a problem a text or { text, warn: true } (a warning, listed, not failing).
// Without __validateAll, a validateRig(rig, kind) found on the window or in
// rigContract.js is run on each model built as the workbench builds it.
const RIG_PAGE = async () => {
  const wb = window.__wb;
  let all = typeof window.__validateAll === 'function' ? window.__validateAll : null, per = null, how = all ? 'window.__validateAll' : null;
  if (!all) for (const [o, n] of [[window, 'validateRig'], [window, '__validateRig'], [wb, 'validateRig'], [wb, 'validateAll']]) {
    if (typeof o?.[n] === 'function') { if (/All$/.test(n)) all = o[n].bind(o); else per = o[n].bind(o); how = (o === wb ? '__wb.' : 'window.') + n; break; }
  }
  if (!all && !per) {
    for (const m of ['../js/entities/rigContract.js', '../js/entities/validate.js', '../js/entities/rig.js', '../js/entities/character.js']) {
      try { if (!(await fetch(new URL(m, location.href), { method: 'HEAD' })).ok) continue; } catch { continue; }
      let M; try { M = await import(m); } catch { continue; }
      if (typeof M.validateAll === 'function') { all = M.validateAll; how = m + ' validateAll'; break; }
      // (validateRig(rig, kind): the kind from the workbench group where the module maps it)
      if (typeof M.validateRig === 'function') { const K = M.KIND_OF_GROUP ?? {}; per = (rig, it) => M.validateRig(rig, K[it.group]); how = m + ' validateRig'; break; }
    }
  }
  if (!all && !per) return { skip: 'no validateRig() or window.__validateAll in the workbench yet' };
  const text = (p) => (typeof p === 'string' ? p : p?.text ?? p?.message ?? p?.msg ?? JSON.stringify(p));
  const soft = (p) => !!(p && typeof p === 'object' && (p.warn || p.info || p.level === 'warn' || p.level === 'info' || p.severity === 'warn' || p.severity === 'info'));
  const norm = (key, r) => {
    if (r == null || r === true) return { key, problems: [] };
    if (r === false) return { key, problems: ['invalid'] };
    if (typeof r === 'string') return { key, problems: [r] };
    const P = Array.isArray(r) ? r : r.problems ?? r.errors ?? r.issues ?? r.failures ?? [];
    const problems = (Array.isArray(P) ? P : [P]).filter((p) => !soft(p)).map(text), warnings = (Array.isArray(P) ? P : []).filter(soft).map(text);
    if (r.ok === false && !problems.length) problems.push('not ok');
    return { key: r.key ?? r.id ?? key, problems, warnings };
  };
  const rows = [];
  if (all) {
    let r = await all();
    if (r && !Array.isArray(r) && Array.isArray(r.results)) r = r.results;
    if (r && !Array.isArray(r) && Array.isArray(r.models)) r = r.models;
    if (Array.isArray(r)) r.forEach((x, i) => rows.push(norm(x?.key ?? x?.id ?? String(i), x)));
    else if (r && typeof r === 'object') for (const [k, v] of Object.entries(r)) rows.push(norm(k, v));
  } else {
    for (const it of wb.items) {
      let rig; try { rig = it.build(); } catch (e) { rows.push({ key: it.key, problems: ['did not build: ' + e.message] }); continue; }
      try { rows.push(norm(it.key, await per(rig, it))); } catch (e) { rows.push({ key: it.key, problems: ['validateRig threw: ' + e.message] }); }
      rig.root?.traverse?.((o) => o.geometry?.dispose?.());
    }
  }
  return { how, rows };
};
async function rigCheck(page, bootErrors) {
  const w = lib.watchErrors(page);
  try {
    const r = await page.evaluate(RIG_PAGE);
    if (r.skip) return { skip: r.skip, ok: true, lines: ['rig: skipped, ' + r.skip], summary: {}, text: r.skip };
    const bad = r.rows.filter((x) => x.problems.length), errs = [...bootErrors, ...w.errors];
    const lines = [`rig contract (${r.how}): ${r.rows.length} models, ${bad.length} failing; page errors ${errs.length}`];
    for (const x of bad) for (const p of x.problems) lines.push(`FAIL  ${x.key.padEnd(26)} ${p}`);
    for (const x of r.rows) for (const p of x.warnings ?? []) lines.push(`warn  ${x.key.padEnd(26)} ${p}`);
    return { ok: !bad.length && !errs.length, lines, rows: r.rows, summary: { via: r.how, models: r.rows.length, failing: bad.length }, text: `${r.rows.length} models, ${bad.length} failing (${r.how})` };
  } finally { w.stop(); }
}

// ---- the shots digest --------------------------------------------------------
function digest(files) {
  const h = crypto.createHash('sha1');
  for (const f of [...files].sort()) h.update(path.basename(f)).update(fs.readFileSync(f));
  return h.digest('hex').slice(0, 12);
}

// ---- run ----------------------------------------------------------------------
async function main() {
  const only = list('only'), skip = list('skip'), names = CHECKS.map((c) => c.name);
  for (const n of [...only, ...skip]) if (!names.includes(n)) { console.error(`unknown check "${n}"; the checks: ${names.join(', ')}`); process.exit(2); }
  const want = (c) => (only.length ? only.includes(c.name) : !(has('fast') && c.slow)) && !skip.includes(c.name);
  const sel = CHECKS.filter(want), on = new Set(sel.map((c) => c.name));
  const results = new Map(CHECKS.map((c) => [c.name, { name: c.name, status: on.has(c.name) ? 'pending' : 'off', what: c.what }]));
  const logDir = opt('log'); if (logDir) fs.mkdirSync(logDir, { recursive: true });
  const t0 = Date.now();
  const timed = async (name, f, t = Date.now()) => {
    const R = results.get(name);
    try {
      const r = await f();
      Object.assign(R, { status: r.skip ? 'skip' : r.ok ? 'pass' : 'fail', summary: r.summary, text: r.text, lines: r.lines });
    } catch (e) {
      Object.assign(R, { status: 'fail', text: 'crashed: ' + String(e.message ?? e).split('\n')[0].slice(0, 120), lines: [String(e.stack ?? e)] });
    }
    R.ms = Date.now() - t;
    if (logDir) fs.writeFileSync(path.join(logDir, name + '.txt'), (R.lines ?? []).join('\n') + '\n');
    if (!has('json')) process.stderr.write(`  ${R.status.padEnd(4)} ${name} (${(R.ms / 1000).toFixed(1)} s)\n`);
  };

  // the server: ours on a free port, or the one named
  let srv;
  if (opt('port')) {
    const base = lib.gameUrl(+opt('port'));
    try { if (!(await fetch(base)).ok) throw new Error('status'); } catch { console.error(`nothing serves ${base}`); process.exit(2); }
    srv = { base, close: async () => {} };
  } else srv = await lib.serveStatic(lib.ROOT, 0);
  const base = srv.base;
  let browser = null;
  const needsBrowser = sel.some((c) => c.lane !== 'proc');
  try {
    if (needsBrowser) browser = await lib.launchChecks([...lib.CHECK_ARGS, '--ignore-gpu-blocklist']);
    // a workbench page for fn(page, bootErrors), closed after; its frame loop
    // stopped (nothing is drawn: the checks pose and measure their own rigs)
    const onWorkbench = async (ms, fn) => {
      let wb;
      try { wb = await lib.openWorkbench(browser, base); } catch (e) { if (!ms.length) throw e; for (const n of ms) await timed(n, async () => { throw e; }); return; }
      try {
        await wb.page.evaluate(() => window.__wb.renderer?.setAnimationLoop?.(null));
        await fn(wb.page, [...wb.errors]);
      } finally { await wb.page.context().close(); }
    };
    const lanes = {
      proc: async () => {
        if (on.has('design')) await timed('design', designCheck);
        if (on.has('node')) await timed('node', nodeTests);
      },
      game: async () => { if (on.has('smoke')) await timed('smoke', () => require('./smoke.cjs').run({ browser, base })); },
      models: async () => {
        const ms = ['weapons', 'houndlegs', 'animlint'].filter((n) => on.has(n)); if (!ms.length) return;
        const { page, errors } = await lib.openModulePage(browser, base);
        try {
          if (errors.length) { for (const n of ms) await timed(n, async () => ({ ok: false, lines: errors, text: 'page errors: ' + errors[0] })); return; }
          for (const n of ms) await timed(n, () => require(`./${n}.cjs`).run({ browser, base, page }));
        } finally { await page.context().close(); }
      },
      wb: async () => {
        const ms = ['props', 'rig'].filter((n) => on.has(n)); if (!ms.length) return;
        await onWorkbench(ms, async (page, boot) => {
          if (on.has('props')) await timed('props', () => require('./props.cjs').run({ browser, base, page, bootErrors: boot }));
          if (on.has('rig')) await timed('rig', () => rigCheck(page, boot));
        });
      },
      // islands (the slowest check) and bodysize: the workbench's models split
      // over SHARDS workbench pages, each building its share once for both;
      // the rows are put back in the workbench's order and reported as one
      sizes: async () => {
        const ms = ['islands', 'bodysize'].filter((n) => on.has(n)); if (!ms.length) return;
        const I = require('./islands.cjs'), B = require('./bodysize.cjs'), both = ms.length === 2;
        const t = Date.now(), parts = [];
        let keys = null, gotPercy;
        // (bodysize measures every model against Percy: one Percy for all the shards, measured on the first)
        const percy = new Promise((r) => { gotPercy = r; });
        try {
          await Promise.all(Array.from({ length: SHARDS }, (_, k) => onWorkbench([], async (page, boot) => {
            try {
              const all = await page.evaluate(() => window.__wb.items.map((it) => it.key));
              keys ??= all;
              if (k === 0 && on.has('bodysize')) { await B.collect({ browser, base, page, only: ['\u0000percy only'] }); gotPercy(await page.evaluate(() => window.__percyRef)); }
              const mine = all.filter((_, i) => i % SHARDS === k); if (!mine.length) return;
              const part = { boot };
              if (on.has('islands')) part.islands = await I.collect({ browser, base, page, only: mine, keep: both });
              if (on.has('bodysize')) part.bodysize = await B.collect({ browser, base, page, only: mine, kept: both, percyRef: await percy });
              parts.push(part);
            } finally { if (k === 0) gotPercy(null); }
          })));
        } catch (e) { gotPercy(null); for (const n of ms) await timed(n, async () => { throw e; }); return; }
        const at = new Map(keys.map((k, i) => [k, i])), order = (a, b) => at.get(a.key) - at.get(b.key);
        const boot = [...new Set(parts.flatMap((p) => p.boot))];
        const errs = (n) => [...boot, ...parts.flatMap((p) => p[n].errors.filter((e) => !boot.includes(e)))];
        // (the two share their pages and builds: each one's time is the lane's)
        if (on.has('islands')) await timed('islands', async () => I.report(parts.flatMap((p) => p.islands.res).sort(order), errs('islands'), { check: true }), t);
        if (on.has('bodysize')) await timed('bodysize', async () => B.report({ percy: parts[0].bodysize.res.percy, rows: parts.flatMap((p) => p.bodysize.res.rows).sort(order) }, errs('bodysize'), { check: true }), t);
      },
      shots: async () => {
        if (!on.has('shots')) return;
        await timed('shots', async () => {
          const dir = opt('shots') ?? path.join(lib.WORK, 'results', 'shots');
          const r = await require('./render-bench.cjs').run({ browser, base, modes: ['shots'], shots: dir });
          if (r.rows?.files?.length) { r.summary.digest = digest(r.rows.files); r.text += `, digest ${r.summary.digest} (${path.relative(process.cwd(), dir) || dir})`; }
          return r;
        });
      },
    };
    const order = ['sizes', 'game', 'models', 'wb', 'shots', 'proc'];
    if (has('serial')) for (const l of order) await lanes[l]();
    else await Promise.all(order.map((l) => lanes[l]()));
    if (on.has('bench')) await timed('bench', () => require('./render-bench.cjs').run({ browser, base, modes: ['wb'] }));
  } finally {
    await browser?.close();
    await srv.close();
  }
  const total = Date.now() - t0;
  const rows = [...results.values()];
  const failed = rows.filter((r) => r.status === 'fail');
  if (has('json')) {
    console.log(JSON.stringify({ ok: !failed.length, ms: total, base: opt('port') ? base : null, checks: rows.map(({ lines, ...r }) => ({ ...r, ...(r.status === 'fail' || has('verbose') ? { lines } : {}) })) }, null, 1));
  } else {
    for (const r of rows) if (r.lines && (has('verbose') || r.status === 'fail')) { console.log(`\n==== ${r.name} (${r.status})`); for (const l of r.lines) console.log(l); }
    console.log('\ncheck      result   time  details');
    for (const r of rows) {
      if (r.status === 'off') { console.log(`${r.name.padEnd(10)} -           off`); continue; }
      console.log(`${r.name.padEnd(10)} ${(r.status === 'fail' ? 'FAIL' : r.status).padEnd(5)} ${((r.ms / 1000).toFixed(1) + ' s').padStart(7)}  ${r.text ?? ''}`);
    }
    const n = (s) => rows.filter((r) => r.status === s).length;
    console.log(`\n${failed.length ? 'FAILED' : 'all passed'}: ${n('pass')} passed, ${n('fail')} failed, ${n('skip')} skipped, ${n('off')} not run; ${(total / 1000).toFixed(1)} s`);
  }
  process.exit(failed.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
