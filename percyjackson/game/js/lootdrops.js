// Item drops in the world, Minecraft Dungeons style: a spinning item block
// under a beam of light in its rarity colour. Loot is per player: each drop
// belongs to one human hero (a ring in that player's colour marks it) and
// only that hero can pick it up, so co-op players never compete for loot and
// each gets their own share. Picking an item up shows a card comparing it
// with what that hero has equipped.
//
// By rarity (design/loot-design.md §5, the LOOT_FX table): how high an item
// pops out of its chest or monster, the beam's height, the light, the
// particles and the block's size, the landing and pickup sounds, and the
// card (compact for a Common, large with a ribbon for a Legendary). A
// Legendary off screen gets an arrow at the edge of the screen (offscreen(),
// ui/hud.js); Heroic and Legendary drops show on the minimap.
//
// With the loot kit (ui/lootkit.js, ui-loot-kit.png) the beam and the light
// shafts wear its white beam texture, a glint ring lies on the ground under
// the item and a twinkle flashes on it, all tinted the rarity colour; without
// it the beam is the plain glowing cylinder and there is no glint or twinkle.
import * as THREE from 'three/webgpu';
import { itemInfo, itemRarity, itemTier, tierInfo, KIND_LABEL, gearStats, normalizeItem, isUpgrade, boonText, boonName, ENCHANTS, recordSignature } from './loot.js';
import { HEROES } from './heroes/index.js';
import { h } from './ui/ui.js';
import { iconNode } from './ui/icons.js';
import { kitCanvas } from './ui/lootkit.js';
import { t, tn } from './text_config.js';

const SLOT = { weapon: [0], armor: [1], artifact: [2, 3] };

// up / out: launch speed (m/s) · fall: gravity once falling (a Legendary's
// slow fall) · bounces · beam: height, top radius, opacity · grow: seconds the
// beam takes to rise after landing · light: intensity, range · parts: landing
// particles · size / emissive: the item block · card: ms on screen · map:
// the minimap mark
export const LOOT_FX = {
  common: { up: 6.5, out: 2.2, fall: 20, bounce: 0.3, beam: [2.5, 0.12, 0.22], grow: 0.25, light: [1.0, 3], parts: 10, size: 0.4, emissive: 1.0, card: 2500, map: null, sound: 25 },
  rare: { up: 6.5, out: 2.2, fall: 20, bounce: 0.3, beam: [6, 0.16, 0.32], grow: 0.3, light: [2.0, 4.5], parts: 18, size: 0.45, emissive: 1.4, card: 4000, map: null, sound: 28 },
  heroic: { up: 6.5, out: 2.2, fall: 20, bounce: 0.3, spin: true, beam: [9, 0.2, 0.4], grow: 0.35, light: [3.0, 6], parts: 26, size: 0.5, emissive: 1.8, card: 4500, map: 'dot', sound: 32 },
  unique: { up: 9, out: 2.2, fall: 3.3, bounce: 0, shafts: 2, beam: [16, 0.26, 0.5], grow: 0.6, light: [5.0, 9], parts: 40, size: 0.6, emissive: 2.4, pulse: true, outer: true, card: 6000, map: 'star', edge: true, sound: 40 },
};
export const BLESSED_FX = { parts: 12, color: 0xffd84a };
export const GEAR_MAGNET = 2.6;     // metres: gear flies to its owner from here (was a touch at 1.5)
export const MAGNET_TIME = 0.18;    // seconds the flight takes
const RISE_G = 20;                  // gravity while an item rises
const COMMON_MERGE_MS = 2000;       // 3 Commons within this merge into one card
const MAX_CARDS = 3;

// the kit's beam, glint and twinkle as textures (null until the kit is cut, or without it)
const kitTex = new Map();
export function kitTexture(name) {
  let t = kitTex.get(name); if (t) return t;
  const c = kitCanvas(name); if (!c) return null;
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  kitTex.set(name, t); return t;
}
// how big the glint ring is (metres across) and how often the twinkle flashes, by rarity
export const KIT_FX = { common: { glint: 1.3, twinkle: 0.35, every: 2.6 }, rare: { glint: 1.7, twinkle: 0.45, every: 2.2 }, heroic: { glint: 2.1, twinkle: 0.55, every: 1.8 }, unique: { glint: 2.8, twinkle: 0.75, every: 1.3 } };

const geoCache = new Map();
const geo = (key, make) => { let g = geoCache.get(key); if (!g) { g = make(); geoCache.set(key, g); } return g; };

export class LootDrops {
  constructor(game) {
    this.game = game; this.list = [];
    this.ring = new THREE.TorusGeometry(0.75, 0.06, 6, 24).rotateX(Math.PI / 2);
    this.outer = new THREE.TorusGeometry(1.05, 0.05, 6, 32).rotateX(Math.PI / 2);
    this.shaft = new THREE.PlaneGeometry(0.5, 1).translate(0, 0.5, 0);
    this.glintGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.cards = document.createElement('div');
    this.cards.className = 'loot-cards';
    this.cards.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.cards);
    this.batch = new Map();   // player index -> the Commons merging into one card
  }
  // Drop `item` for `player` (a human hero), popping out of `pos`.
  //   o.ring: erupt outwards 2-3.5 m (a boss's loot)
  drop(item, pos, player, o = {}) {
    const g = this.game;
    const tier = itemTier(item), F = LOOT_FX[tier], R = itemRarity(item), col = new THREE.Color(tierInfo(item).color);
    const grp = new THREE.Group();
    grp.position.copy(pos); grp.position.y += 0.6;
    const block = new THREE.Mesh(geo('box' + F.size, () => new THREE.BoxGeometry(F.size, F.size, F.size)), new THREE.MeshStandardNodeMaterial({ color: col, emissive: col, emissiveIntensity: F.emissive, roughness: 0.3, metalness: 0.5 }));
    block.castShadow = true;
    const [bh, br, bo] = F.beam;
    const beamTex = kitTexture('beam'), K = KIT_FX[tier];
    const beam = new THREE.Mesh(geo('beam' + tier, () => new THREE.CylinderGeometry(br, br * 1.9, bh, 8, 1, true).translate(0, bh / 2, 0)), beamTex
      ? new THREE.MeshBasicNodeMaterial({ map: beamTex, color: col.clone().multiplyScalar(1.6), transparent: true, opacity: Math.min(1, bo * 2.2), depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
      : new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: bo, depthWrite: false, side: THREE.DoubleSide }));
    beam.scale.y = 0.001; beam.visible = false;
    const owner = new THREE.Color(player.color ?? '#ffffff');
    const ring = new THREE.Mesh(this.ring, new THREE.MeshBasicNodeMaterial({ color: owner.multiplyScalar(2), transparent: true, opacity: 0.85 }));
    ring.position.y = 0.06; ring.visible = false;
    const base = new THREE.Group(); base.add(beam, ring);   // stays on the ground while the block bobs
    grp.add(block, base);
    // the kit's glint ring on the ground and the twinkle on the item
    let glint = null, twinkle = null;
    const glintTex = kitTexture('glint'), twinkleTex = kitTexture('twinkle');
    if (glintTex) {
      glint = new THREE.Mesh(this.glintGeo, new THREE.MeshBasicNodeMaterial({ map: glintTex, color: col.clone().multiplyScalar(1.5), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      glint.position.y = 0.05; glint.scale.setScalar(K.glint); glint.visible = false; base.add(glint);
    }
    if (twinkleTex) {
      twinkle = new THREE.Sprite(new THREE.SpriteNodeMaterial({ map: twinkleTex, color: col.clone().lerp(new THREE.Color(0xffffff), 0.5).multiplyScalar(1.6), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      twinkle.scale.setScalar(0.001); twinkle.visible = false; grp.add(twinkle);
    }
    const shafts = [];
    if (F.outer) { const m = new THREE.Mesh(this.outer, new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(2), transparent: true, opacity: 0.7 })); m.position.y = 0.05; m.visible = false; base.add(m); shafts.push(m); }
    for (let i = 0; i < (F.shafts ?? 0); i++) {
      const s = new THREE.Mesh(this.shaft, new THREE.MeshBasicNodeMaterial({ map: beamTex, color: col.clone().multiplyScalar(1.4), transparent: true, opacity: beamTex ? 0.4 : 0.18, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      s.scale.set(1, bh * 0.9, 1); s.rotation.y = i * Math.PI / 2; s.visible = false; base.add(s); shafts.push(s);
    }
    g.scene.add(grp);
    // the pop-out: up and outwards, landing where the ground is
    const a = Math.random() * Math.PI * 2;
    const flight = F.up / RISE_G + Math.sqrt(2 * (F.up * F.up / (2 * RISE_G) + 0.6) / F.fall);
    const out = o.ring ? (2 + Math.random() * 1.5) / flight : F.out * (0.7 + Math.random() * 0.6);
    const vel = new THREE.Vector3(Math.cos(a) * out, F.up, Math.sin(a) * out);
    const light = g.lights.attach(block, (item.blessed ? col.clone().lerp(new THREE.Color(BLESSED_FX.color), 0.4) : col).getHex(), F.light[0] * 0.5, F.light[1], { offsetY: 0.3 });
    const d = { item, tier, F, K, col, grp, block, beam, ring, glint, twinkle, base, shafts, player, device: player.device, t: 0, light, vel, air: true, bounces: F.bounce > 0 ? 1 : 0, landT: 0, blessed: !!item.blessed };
    this.list.push(d);
    g.particles.burst(grp.position.clone(), { count: Math.round(F.parts * 0.4), color: col, speed: 2, up: 2, life: 0.5, size: 0.12, shape: 1 });
    return d;
  }
  // landed: the beam grows, the light comes up, particles and the landing sound
  land(d) {
    const g = this.game, F = d.F, at = d.grp.position;
    d.air = false; d.landT = 0; d.ring.visible = true; d.beam.visible = true; for (const s of d.shafts) s.visible = true;
    if (d.glint) d.glint.visible = true; if (d.twinkle) d.twinkle.visible = true;
    d.light.intensity = F.light[0];
    g.particles.burst(at.clone().setY(at.y + 0.6), { count: F.parts, color: d.col, speed: 3, up: 3, life: 0.8, size: 0.14, shape: 1 });
    if (d.blessed) g.particles.burst(at.clone().setY(at.y + 0.8), { count: BLESSED_FX.parts, color: BLESSED_FX.color, speed: 2.5, up: 4, life: 1, size: 0.12, shape: 1 });
    if (d.tier === 'unique') {
      g.lights.flash(at.clone().setY(at.y + 1.5), d.col, 8, 12, 0.6);
      g.fx.shockwave?.(at, d.col.getHex(), 3);
      g.fx.rings?.spawn(new THREE.Vector3(at.x, at.y + 0.06, at.z), { color: d.col.getHex(), r0: 0.4, r1: 4, dur: 0.7, thick: 0.1 });
    }
    // heard from up to F.sound metres from the nearest player on this screen
    const near = Math.min(...g.players.filter((q) => !q.remote).map((q) => q.pos.distanceTo(at)), Infinity);
    if (near < F.sound) g.audio?.lootDrop?.(d.tier, { far: near > F.sound * 0.6 });
    if (d.blessed && near < F.sound) g.audio?.sample?.('pickup_rare', { gain: 0.35, rate: 1.2, at: 0.15 });
  }
  update(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i], F = d.F, P = d.grp.position;
      d.t += dt;
      if (d.fly) {
        // the magnet: into the hero along a sparkle trail
        d.fly.t += dt;
        const k = Math.min(1, d.fly.t / MAGNET_TIME), to = d.fly.who.pos.clone().setY(d.fly.who.pos.y + 1);
        P.lerpVectors(d.fly.from, to, k * k);
        d.grp.scale.setScalar(Math.max(0.2, 1 - k * 0.8));
        g.particles.burst(P.clone().setY(P.y + 0.7), { count: 2, color: d.col, speed: 0.4, life: 0.3, size: 0.1, shape: 1 });
        if (k >= 1) { this.collect(d, d.fly.who); this.list.splice(i, 1); }
        continue;
      }
      if (d.air) {
        d.vel.y -= (d.vel.y > 0 ? RISE_G : F.fall) * dt;
        P.addScaledVector(d.vel, dt);
        if (F.spin) d.block.rotation.x += dt * 9;
        d.block.rotation.y += dt * 4;
        const gy = g.world.groundBelow(P.x, P.z, P.y + 1.5);
        if (d.vel.y < 0 && isFinite(gy) && P.y <= gy) {
          P.y = gy;
          if (d.bounces > 0) { d.bounces--; d.vel.y = -d.vel.y * F.bounce; d.vel.x *= 0.5; d.vel.z *= 0.5; }
          else { d.vel.set(0, 0, 0); d.block.rotation.x = 0; this.land(d); }
        } else if (P.y < -30 || d.t > 6) { if (isFinite(gy)) P.y = gy; else P.y = Math.max(P.y, 0); d.vel.set(0, 0, 0); this.land(d); }
        d.block.position.y = 0.2;
        continue;
      }
      d.landT += dt;
      const grow = Math.min(1, d.landT / F.grow);
      d.beam.scale.y = Math.max(0.001, grow * grow * (3 - 2 * grow));
      if (F.pulse) { const s = 1 + Math.sin(d.t * 3) * 0.08; d.block.scale.setScalar(s); d.light.intensity = F.light[0] * (0.85 + 0.15 * Math.sin(d.t * 3)); }
      for (let k = 0; k < d.shafts.length; k++) if (d.shafts[k].geometry === this.shaft) d.shafts[k].rotation.y += dt * 0.6;
      if (d.blessed && Math.random() < dt * 14) {   // a gold spiral of sparkles up the beam
        const y = (d.t * 2.4) % F.beam[0], a = d.t * 5;
        g.particles.burst(new THREE.Vector3(P.x + Math.cos(a) * 0.35, P.y + y, P.z + Math.sin(a) * 0.35), { count: 1, color: BLESSED_FX.color, speed: 0.1, life: 0.6, size: 0.1, shape: 1 });
      }
      d.block.rotation.y += dt * 1.8; d.block.position.y = 0.7 + Math.sin(d.t * 2.5) * 0.12;
      d.ring.scale.setScalar(1 + Math.sin(d.t * 4) * 0.06);
      if (d.glint) { d.glint.scale.setScalar(d.K.glint * grow * (1 + Math.sin(d.t * 2.2) * 0.05)); d.glint.rotation.y += dt * 0.4; }
      if (d.twinkle) {
        // a flash every K.every seconds at the block's top corner: up fast, down slower
        const ph = (d.t % d.K.every) / d.K.every, f = ph < 0.12 ? ph / 0.12 : Math.max(0, 1 - (ph - 0.12) / 0.25);
        d.twinkle.scale.setScalar(Math.max(0.001, d.K.twinkle * f)); d.twinkle.material.rotation = d.t * 1.5;
        d.twinkle.position.set(F.size * 0.45, d.block.position.y + F.size * 0.5, F.size * 0.3);
      }
      // loot belongs to the person, not the hero: after a switch it follows
      // the device to whichever hero they now control
      const owner = g.players.find((q) => !q.ai && !q.remote && q.device === d.device) ?? (g.players.includes(d.player) && !d.player.ai ? d.player : null);
      const who = owner && !owner.dead && !owner.downed && !owner.ai ? owner : null;
      if (who && d.landT > 0.2 && who.pos.distanceTo(P) < GEAR_MAGNET) { d.fly = { t: 0, who, from: P.clone() }; d.ring.visible = false; d.beam.visible = false; for (const s of d.shafts) s.visible = false; if (d.glint) d.glint.visible = false; if (d.twinkle) d.twinkle.visible = false; }
    }
  }
  // Legendaries on the ground that this screen's players can't see (the HUD's edge arrows).
  offscreen(camera) {
    const out = [];
    for (const d of this.list) {
      if (!d.F.edge || d.fly) continue;
      const v = d.grp.position.clone().setY(d.grp.position.y + 1).project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
      if (!on) out.push({ pos: d.grp.position, color: '#' + d.col.getHexString(), v, item: d.item });
    }
    return out;
  }
  // The Heroic and Legendary drops for the minimap: [{ x, z, color, mark }].
  marks() { return this.list.filter((d) => d.F.map && !d.fly).map((d) => ({ x: d.grp.position.x, z: d.grp.position.z, color: '#' + d.col.getHexString(), mark: d.F.map })); }
  dispose(d) {
    this.game.scene.remove(d.grp); this.game.lights.remove(d.light);
    d.grp.traverse((m) => { if (m.isMesh || m.isSprite) m.material?.dispose?.(); });   // (the kit textures are shared and stay)
  }
  collect(d, p) {
    const g = this.game, sv = g.saveFor?.(p) ?? g.save, save = sv.data;   // net: into that player's profile
    this.dispose(d);
    const it = normalizeItem(d.item);
    const sig = it.signature, sigDiff = it.sigDifficulty;
    delete it.signature; delete it.sigDifficulty;
    if (sig) recordSignature(save, sig, sigDiff ?? 1);   // (a signature counts once it is picked up)
    it.isNew = true; it.finder = p.hero; it.got = Date.now();   // (the inventory sorts new finds by this)
    // the comparison before it joins the stash (an upgrade over what this hero wears?)
    const gear = (sv.hero?.(p.hero)?.gear ?? []).map((u) => (u ? sv.item(u) : null));
    const up = isUpgrade(it, gear, p.hero);
    save.inventory.push(it);
    save.newCount = save.inventory.filter((x) => x.isNew).length;
    sv.write();
    g.mission?.stats.loot.push(it);
    g.audio?.lootPickup?.(d.tier, d.blessed);
    if (up) g.audio?.upgrade?.(0.15);
    // a glow on the hero in the rarity colour (a Legendary: longer, with a burst of light)
    const long = d.tier === 'unique', glowFor = long ? 0.6 : 0.25;
    if (p.rig?.setGlow) {
      const c = d.col.clone().multiplyScalar(0.5); let k = 0;
      p.rig.setGlow(c);
      g.addUpdater((dt) => { k += dt; const f = Math.max(0, 1 - k / glowFor); p.rig.setGlow(c.clone().multiplyScalar(f)); return k < glowFor; });
    }
    if (long) g.lights.flash(p.pos.clone().setY(p.pos.y + 1.5), d.col, 6, 8, 0.5);
    g.particles.burst(p.pos.clone().setY(p.pos.y + 1), { count: long ? 24 : 10, color: d.col, speed: 2.5, up: 2, life: 0.5, size: 0.12, shape: 1 });
    this.card(it, p, { up, signature: !!sig });
  }
  // A card that compares the item with what this hero has equipped: compact
  // for a Common (three in a row merge into one), full for a Rare, with its
  // boons for a Heroic, and large with a ribbon for a Legendary.
  card(it, p, { up = false, signature = false } = {}) {
    const g = this.game, b = itemInfo(it), R = itemRarity(it), tier = itemTier(it), F = LOOT_FX[tier];
    const sv = g.saveFor?.(p) ?? g.save;   // net: that player's profile
    const gearUids = sv.hero(p.hero).gear;
    const gear = gearUids.map((u) => (u ? sv.item(u) : null));
    const slots = SLOT[b.kind];
    const current = slots.map((i) => gear[i]).find(Boolean) ?? null;
    const multi = g.players.filter((q) => !q.ai && !q.remote).length > 1;
    const itemName = it.blessed ? t('loot.blessedName', { name: b.name }) : b.name;
    const shownName = multi ? t('loot.card.nameFor', { n: p.index + 1, name: itemName }) : itemName;
    const dp = current ? it.power - current.power : null;
    const powerChip = h('span', { class: 'lc-pw' + (up ? ' up' : '') }, dp == null ? t('loot.card.newSlot') : t('loot.card.power', { arrow: dp >= 0 ? '▲' : '▼', n: Math.abs(dp) }));
    if (tier === 'common' && !it.blessed) {
      // merge: the third Common within 2 s turns the run into "+3 common items"
      const now = performance.now(), B = this.batch.get(p.index);
      if (B && now - B.at < COMMON_MERGE_MS && B.els.every((e) => e.isConnected)) {
        B.n++; B.at = now;
        if (B.n >= 3) {
          for (const e of B.els) if (e !== B.merged) e.remove();
          if (!B.merged) { B.merged = h('div', { class: 'loot-card compact merged', style: `--rc:${R.color}` }, h('div', { class: 'lc-icon' }, '📦'), h('div', { class: 'lc-name' }, '')); this.cards.appendChild(B.merged); B.els = [B.merged]; }
          B.merged.querySelector('.lc-name').textContent = (multi ? `P${p.index + 1} · ` : '') + tn('loot.card.merged', B.n);
          this.retire(B.merged, F.card);
          return B.merged;
        }
      } else this.batch.set(p.index, { n: 1, at: now, els: [], merged: null });
      const el = h('div', { class: 'loot-card compact', style: `--rc:${R.color}`, 'data-tier': tier },
        h('div', { class: 'lc-icon' }, iconNode(b)), h('div', { class: 'lc-name' }, t('loot.card.compact', { name: shownName, power: it.power })), powerChip);
      this.batch.get(p.index).els.push(el);
      return this.show(el, F.card, false);
    }
    let cmp = t('loot.card.newSlot');
    if (current) {
      const before = gearStats(gear, p.hero).s;
      const swapped = [...gear]; swapped[slots.find((i) => gear[i] === current)] = it;
      const after = gearStats(swapped, p.hero).s;
      const parts = [];
      const diff = (label, a, c, pct = true) => { const v = c - a; if (Math.abs(v) < 0.005) return; parts.push(t('loot.card.change', { label, arrow: v > 0 ? '▲' : '▼', value: pct ? Math.round(Math.abs(v) * 100) + '%' : Math.round(Math.abs(v)) })); };
      if (b.kind === 'weapon') { diff(t('loot.card.damage'), before.meleeMult, after.meleeMult); diff(t('loot.card.speed'), before.attackSpeed, after.attackSpeed); }
      if (b.kind === 'armor') { diff(t('loot.card.health'), before.maxHp, after.maxHp, false); diff(t('loot.card.armour'), before.armor, after.armor); diff(t('loot.card.speed'), before.speed, after.speed); }
      cmp = parts.join(' · ');
    }
    const legendary = tier === 'unique';
    const sigEnch = legendary ? (b.fixed ?? []).map((id) => ENCHANTS[id]).filter(Boolean)[0] : null;
    const el = h('div', { class: 'loot-card' + (legendary ? ' legendary' : '') + (tier === 'heroic' ? ' heroic' : ''), style: `--rc:${R.color}`, 'data-tier': tier },
      legendary ? h('div', { class: 'lc-ribbon' }, signature ? `${t('loot.card.legendary')} · ${t('loot.card.signature')}` : t('loot.card.legendary')) : null,
      h('div', { class: 'lc-icon' }, iconNode(b)),
      h('div', { class: 'lc-body' },
        h('div', { class: 'lc-name' }, shownName),
        h('div', { class: 'lc-sub' }, b.hero && HEROES[b.hero] ? t('loot.card.subFavourite', { rarity: tierInfo(it).label, kind: KIND_LABEL[b.kind], power: it.power, hero: HEROES[b.hero].name }) : t('loot.card.sub', { rarity: tierInfo(it).label, kind: KIND_LABEL[b.kind], power: it.power })),
        h('div', { class: 'lc-cmp' }, powerChip, cmp ? ' · ' + cmp : ''),
        up ? h('div', { class: 'lc-up' }, t('loot.card.upgrade')) : null,
        sigEnch ? h('div', { class: 'lc-sig' }, `${sigEnch.icon} ${sigEnch.name}: ${sigEnch.desc(1)}`) : null,
        tier !== 'rare' && it.boons?.length ? h('div', { class: 'lc-boons' }, it.boons.map((x) => t('loot.card.boon', { name: boonName(x), desc: boonText(x) })).join(' · ')) : null,
        h('div', { class: 'lc-hint' }, t('loot.card.hint'))));
    return this.show(el, F.card, legendary);
  }
  // Add a card: at most MAX_CARDS, a Legendary always shown (it pushes the others out).
  show(el, ms, keep) {
    if (keep) el.dataset.keep = '1';
    this.cards.appendChild(el);
    while (this.cards.children.length > MAX_CARDS) {
      const old = [...this.cards.children].find((c) => !c.dataset.keep && c !== el) ?? this.cards.firstChild;
      old.remove();
    }
    this.retire(el, ms);
    return el;
  }
  retire(el, ms) {
    clearTimeout(el._out); clearTimeout(el._gone); el.classList.remove('out');
    el._out = setTimeout(() => el.classList.add('out'), ms);
    el._gone = setTimeout(() => el.remove(), ms + 600);
  }
  clear() { for (const d of this.list) this.dispose(d); this.list = []; }
}
