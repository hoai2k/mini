// Every delivered creature must have a clip for each combat state it can be
// in. Species name their clips differently (a Crag Tortoise lunges, a Chain
// Manta tethers), so scene.ts maps each state to the clips that can express
// it; a newly delivered creature whose vocabulary nobody added would silently
// fall back to standing still. This catches that at delivery time.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../../', import.meta.url).pathname;
const delivery = JSON.parse(fs.readFileSync(`${root}../3d/models/manifest.json`, 'utf8'));
const design = JSON.parse(fs.readFileSync(`${root}../3d/design/standin-manifest.json`, 'utf8'));
const scene = fs.readFileSync(`${root}src/game3d/scene.ts`, 'utf8');

// Read the map out of the source rather than importing it (scene.ts needs a DOM).
const block = scene.match(/const SHADOW_CLIPS: Record<string, string\[\]> = \{([\s\S]*?)\n\};/);
assert.ok(block, 'SHADOW_CLIPS is declared in scene.ts');
const CLIPS = {};
for (const line of block[1].split('\n')) {
  const m = line.match(/^\s*(\w+): \[([^\]]*)\]/);
  if (m) CLIPS[m[1]] = [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}
const states = Object.keys(CLIPS);
assert.ok(states.length > 8, `parsed the state map (${states.length} states)`);

const deliveredRequest = new Set(
  design.requests
    .filter((r) => r.kind === 'model' && String(r.standIn || '').startsWith('enemy.') && r.status === 'delivered')
    .map((r) => r.request),
);
const creatures = delivery.models.filter(
  (m) => deliveredRequest.has(m.request) && m.status === 'delivered' && (m.clips || []).length,
);
assert.ok(creatures.length >= 7, `delivered creatures with clips (${creatures.length})`);

// The states a shadow is actually driven through, and must never be mute in.
const REQUIRED = ['idle', 'approach', 'tell', 'attack', 'recover'];
let checks = 0;
for (const c of creatures) {
  const has = new Set(c.clips);
  for (const state of REQUIRED) {
    const match = (CLIPS[state] || []).find((name) => has.has(name));
    assert.ok(match, `${c.file}: no clip for "${state}" (has ${c.clips.join(', ')})`);
    checks++;
  }
  // Every clip the species ships should be reachable from some state, apart
  // from the one-shots the renderer deliberately leaves alone.
  const oneShots = new Set(['Hit', 'Dissolve']);
  const reachable = new Set(Object.values(CLIPS).flat());
  for (const clip of c.clips)
    if (!oneShots.has(clip)) {
      assert.ok(reachable.has(clip), `${c.file}: clip "${clip}" is never played by any state`);
      checks++;
    }
}
console.log(`creature-clips: ${checks} checks passed across ${creatures.length} delivered creatures`);
