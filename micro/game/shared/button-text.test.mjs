// Every controller button named in player-facing text must be a {btn:X}
// placeholder, so it shows the button's icon (the Xbox glyph, or the keyboard
// key while no controller is connected) instead of a bare "Press A" or "(X)".
// Scans text_config.js and the string literals in micro/game's sources.
//
//   node --test micro/game/shared/button-text.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXT } from '../../text_config.js';
import { findBare, strings, prose } from './button-text.mjs';
import { glyph } from '../src/glyphs.js';

const here = dirname(fileURLToPath(import.meta.url));
const game = dirname(here); // micro/game

// Strings that name a button in words on purpose.
const TEXT_ALLOW = new Set([
  'shell.title.pressStart', // the title screen's "Press Start" (any button starts)
  'shell.play.controlsTitle', // tooltip attributes, which cannot hold an icon
  'shell.play.pauseTitle',
  'amoeba.hud.schemes.select.controls.camera', // "(R)" is the pseudopod marked R, not a key
]);
// String literals in the sources that are not shown as prose.
const CODE_ALLOW = new Set([
  'Steer: LS, LB/RB move the phage (departure)', // a stored Features value; shown through text_config's choice text
]);

// A controls row is [button, label]; its button cell ('LT (hold)', 'LS click') draws as a chip already.
const isRowButton = (key, s) => /\[\d+\]\[0\]$/.test(key) && /^(?:[A-Z]{1,2}|View|Menu|D-pad)\b/.test(s);

test('text_config.js names buttons only through {btn:X}', () => {
  const bad = [];
  for (const [key, s] of strings(TEXT)) {
    if (TEXT_ALLOW.has(key) || isRowButton(key, s)) continue;
    for (const h of findBare(s)) bad.push(`${key}: "${h.match}" (${h.rule}) in: ${prose(s).slice(0, 90)}`);
  }
  assert.deepEqual(bad, [], `bare button names in text_config.js; write them as {btn:A}, {btn:LT/RT}...:\n${bad.join('\n')}`);
});

test('every {btn:X} in text_config.js has a keyboard key and a controller glyph', () => {
  const names = new Set();
  for (const [, s] of strings(TEXT)) for (const m of String(s).matchAll(/\{btn:([^{}]+)\}/g)) names.add(m[1]);
  assert.ok(names.size > 10, 'expected many {btn:X} placeholders');
  const missing = [...names].filter((b) => !/class="g kb"/.test(glyph(b, { mode: 'keyboard' })));
  assert.deepEqual(missing, [], `no keyboard key for: ${missing.join(', ')} (src/glyphs.js WORLD_KEYS, shared/hud.js KEYS)`);
  for (const b of names) assert.match(glyph(b, { mode: 'controller' }), new RegExp(`>${b.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}</span>$`));
});

test('the finder catches the forms it is meant to', () => {
  for (const s of ['Press A to start', 'Wriggle (LS)', 'hunker (B)', 'X drills harder', 'Toxin ready (R)', 'E drills harder (E)', 'LT/RT zoom', 'hold B to brace', 'Y fires', 'Look (D-pad left/right)', 'Menu or B closes', 'surge, A)'])
    assert.ok(findBare(s).length, `should flag: ${s}`);
  for (const s of ['Press {btn:A} to start', 'A water strider felt your ripples', 'Host B is resistant', 'leaf A', 'UV-B damage', 'A {crouch} ms crouch', 'Invert camera Y'])
    assert.deepEqual(findBare(s), [], `should pass: ${s}`);
});

function sources(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (f === 'vendor' || f === 'node_modules') continue;
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(js|mjs)$/.test(f) && !/\.test\.mjs$|^check.*\.mjs$|^play-check\.mjs$|^button-text\.mjs$/.test(f)) out.push(p);
  }
  return out;
}

test('micro/game sources show no bare button names in toasts, hints or banners', () => {
  const LIT = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;
  const bad = [];
  for (const file of sources(game)) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const code = line.replace(/\s\/\/ .*$/, ''); // a trailing comment
      for (const m of code.matchAll(LIT)) {
        const s = m[0].slice(1, -1);
        // Prose has spaces and some length; short tokens are key maps ('Z / X') and ids.
        if (s.length < 12 || !/\s/.test(s) || CODE_ALLOW.has(s)) continue;
        for (const h of findBare(s)) bad.push(`${relative(game, file)}:${i + 1}: "${h.match}" in: ${prose(s).slice(0, 90)}`);
      }
    });
  }
  assert.deepEqual(bad, [], `bare button names in string literals; use a {btn:X} key in text_config.js or glyphHTML(b):\n${bad.join('\n')}`);
});
