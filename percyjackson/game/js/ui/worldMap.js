// The open world's map (M / View in camp): the whole country top-down, north
// up, regions you haven't been to under a veil; waystones, chapters, people
// with quests, monster camps, champions, shrines and the heroes marked. The
// side list: the waystones you have found (travel to one) and, on the Quests
// tab, the side quests (pick the one the tracker follows).
import { h, toast } from './ui.js';
import { t } from '../text_config.js';
import { BLOCKS } from '../world/blocks.js';
import { tileAvgColor } from '../gfx/textures.js';
import { REGIONS, WORLD } from '../world/owLayout.js';
import { openChapterMap as openMapTable } from './chapterMap.js';

// the top-down picture of the world, made once per world (cached on the level)
function baseImage(L) {
  if (L.mapCanvas) return L.mapCanvas;
  const w = L.world, W = w.sx, H = w.sz;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H);
  const lin = (v) => Math.pow(Math.max(0, Math.min(1, v)), 1 / 2.2) * 255;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    let top = -1, id = 0;
    for (let y = w.sy - 1; y >= 0; y--) { const b = w.get(x, y, z); if (b && !BLOCKS[b].invisible && b !== 1 && !BLOCKS[b].name.includes('barrier')) { top = y; id = b; break; } }
    const o = (z * W + x) * 4;
    if (top < 0) { img.data[o + 3] = 255; img.data[o] = 30; img.data[o + 1] = 90; img.data[o + 2] = 116; continue; }
    const c = tileAvgColor[BLOCKS[id].top] ?? { r: 0.5, g: 0.5, b: 0.5 };
    const shade = 0.6 + (top - 8) * 0.04;
    img.data[o] = lin(c.r * shade); img.data[o + 1] = lin(c.g * shade); img.data[o + 2] = lin(c.b * shade); img.data[o + 3] = 255;
    if (BLOCKS[id].liquid) { img.data[o] *= 0.7; img.data[o + 2] = Math.min(255, img.data[o + 2] * 1.3 + 30); }
  }
  ctx.putImageData(img, 0, 0);
  L.mapCanvas = cv;
  return cv;
}

export function openWorldMap(game, { at = null, tab = 'map' } = {}) {
  const g = game, ow = g.ow, L = g.level;
  if (!ow || !L?.openWorld) { openMapTable(g); return; }
  const ui = g.ui, d = ow.data;
  const close = () => { ui.close('worldmap'); g.paused = false; };
  g.paused = true;
  let cur = tab;
  ui.open('worldmap', (el) => {
    const found = ow.reg.waystones.filter((w) => d.ways[w.id]);
    const cv = h('canvas', { width: 640, height: 640, class: 'worldmap-canvas', role: 'img', 'aria-label': t('ow.map.title'), style: 'width:min(640px,62vh,92vw);height:auto;image-rendering:pixelated;border-radius:10px;box-shadow:0 0 0 3px #c9963a, 0 6px 24px #0008' });
    draw(cv, g, at);
    const tabs = h('div', { style: 'display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap' },
      h('button', { class: 'btn' + (cur === 'map' ? ' primary' : ''), onclick: () => { cur = 'map'; ui.refresh('worldmap'); } }, t('ow.map.waystones')),
      h('button', { class: 'btn' + (cur === 'quests' ? ' primary' : ''), onclick: () => { cur = 'quests'; ui.refresh('worldmap'); } }, t('ow.map.quests')),
      h('button', { class: 'btn', onclick: () => { close(); openMapTable(g); } }, t('ow.map.chapters')));
    let side;
    if (cur === 'map') {
      side = h('div', { class: 'menu-col', style: 'max-height:56vh;overflow:auto;min-width:240px' },
        found.length > 1 ? h('p', { class: 'hint' }, t('ow.map.hint')) : h('p', { class: 'hint' }, t('ow.map.none')),
        ...REGIONS.flatMap((r) => {
          const ws = found.filter((w) => w.region === r.id); if (!ws.length) return [];
          return [h('div', { class: 'hint', style: 'margin:10px 0 4px;font-weight:700' }, t(`regions.${r.id}.name`)),
            ...ws.map((w) => h('button', { class: 'btn' + (at === w ? ' primary' : ''), disabled: at === w, 'aria-label': t('ow.teleportTo', { name: w.name }), onclick: () => {
              if (g.online?.isGuest && false) { toast(t('ow.hostTravels')); return; }
              close(); ow.travel(w);
            } }, '◆ ' + w.name))];
        }));
    } else {
      const qs = ow.quests.list.filter((q) => ow.quests.state(q.id));
      side = h('div', { class: 'menu-col', style: 'max-height:56vh;overflow:auto;min-width:260px' },
        qs.length ? null : h('p', { class: 'hint' }, t('ow.quest.none')),
        ...qs.map((q) => {
          const st = ow.quests.state(q.id), tracked = d.track === q.id;
          return h('button', { class: 'btn' + (tracked ? ' primary' : ''), style: 'text-align:left;white-space:normal', onclick: () => { if (st.done) return; d.track = q.id; ow.quests.trackGoal(); ui.refresh('worldmap'); } },
            h('b', {}, (st.done ? '✓ ' : tracked ? '➤ ' : '') + t(`sq.${q.id}.title`)), h('br'),
            h('small', {}, st.done ? t('ow.quest.doneShort') : t(`regions.${q.region}.name`) + ' · ' + ow.quests.stepText(q)));
        }));
    }
    el.appendChild(h('div', { class: 'panel', style: 'max-width:min(1100px,96vw)' },
      h('h2', {}, t('ow.map.title')), tabs,
      h('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;justify-content:center;align-items:flex-start' }, cv, side),
      h('div', { class: 'hint', style: 'margin-top:8px' }, t('ow.map.legend')),
      h('button', { class: 'btn', 'data-autofocus': true, onclick: close }, t('ow.map.close'))));
  }, { dim: true, onBack: close });
}

function draw(cv, g, at) {
  const ow = g.ow, L = g.level, d = ow.data, ctx = cv.getContext('2d');
  const S = cv.width / WORLD.sx;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baseImage(L), 0, 0, cv.width, cv.height);
  // regions not yet visited: veiled
  for (const r of REGIONS) {
    if (d.seen?.[r.id]) continue;
    ctx.fillStyle = 'rgba(14,12,20,0.72)';
    for (const [x0, z0, x1, z1] of r.rects) ctx.fillRect(x0 * S, z0 * S, (x1 - x0) * S, (z1 - z0) * S);
  }
  // region names
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const r of REGIONS) {
    const [x0, z0, x1, z1] = r.rects[0];
    const cx = (x0 + x1) / 2 * S, cz = (z0 + z1) / 2 * S;
    ctx.font = 'bold 15px Cinzel, serif'; ctx.lineWidth = 4; ctx.strokeStyle = '#0009'; ctx.fillStyle = d.seen?.[r.id] ? '#fff2c8' : '#9a94a8';
    const name = d.seen?.[r.id] ? t(`regions.${r.id}.name`) : t('ow.map.unknown');
    ctx.strokeText(name, cx, cz - 8); ctx.fillText(name, cx, cz - 8);
    if (!r.safe) { ctx.font = '12px "Alegreya Sans", sans-serif'; const lv = t('regions.levels', { a: r.level[0], b: r.level[1] }); ctx.strokeText(lv, cx, cz + 9); ctx.fillText(lv, cx, cz + 9); }
  }
  const mark = (p, glyph, color, size = 16) => { if (!p) return; ctx.font = `bold ${size}px sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = '#000a'; ctx.fillStyle = color; ctx.strokeText(glyph, p.x * S, p.z * S); ctx.fillText(glyph, p.x * S, p.z * S); };
  const seen = (p) => { const r = REGIONS.find((rr) => rr.rects.some(([x0, z0, x1, z1]) => p.x >= x0 && p.x < x1 && p.z >= z0 && p.z < z1)); return !r || d.seen?.[r.id]; };
  const t0 = Date.now() / 1000;
  for (const c of ow.reg.camps) if (seen(c.pos) && !(d.camps[c.id] && t0 - d.camps[c.id] < 480)) mark(c.pos, '▲', '#ff6a4a', 12);
  for (const c of ow.reg.champions) if (seen(c.pos) && !(d.champs[c.id] && t0 - d.champs[c.id] < 900)) mark(c.pos, '☠', '#ff3a3a', 15);
  for (const s of ow.reg.shrines) if (seen(s.pos)) mark(s.pos, '◈', '#ffd060', 14);
  for (const m of g.questMarkers ?? []) if (m.pos && seen(m.pos)) mark(m.pos, '✦', m.open ? '#ffe070' : '#888', 15);
  for (const p of ow.quests.people.values()) if (seen(p.n.pos) && p.mark.visible) mark(p.n.pos, '!', '#ffd23a', 16);
  for (const w of ow.reg.waystones) if (d.ways[w.id] || seen(w.pos)) mark(w.pos, '◆', d.ways[w.id] ? (w === at ? '#ffffff' : '#ffd84a') : '#8a8a8a', w === at ? 18 : 14);
  // the tracked quest's goal
  const q = d.track && ow.quests.def(d.track), gp = q && ow.quests.step(q) ? ow.quests.stepPos(q) : null;
  if (gp) { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(gp.x * S, gp.z * S, 9, 0, Math.PI * 2); ctx.stroke(); }
  for (const p of g.players) { ctx.fillStyle = p.remote ? '#9ad0ff' : '#ffffff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.pos.x * S, p.pos.z * S, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
}
