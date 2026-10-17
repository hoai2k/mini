// Item drops in the world, Minecraft Dungeons style: a spinning item block
// under a beam of light in its rarity colour. Loot is per player: each drop
// belongs to one human hero (a ring in that player's colour marks it) and
// only that hero can pick it up, so co-op players never compete for loot and
// each gets their own share. Picking an item up shows a card comparing it
// with what that hero has equipped.
import * as THREE from 'three/webgpu';
import { itemInfo, itemRarity, KIND_LABEL, gearStats, normalizeItem } from './loot.js';
import { HEROES } from './heroes/index.js';
import { h } from './ui/ui.js';
import { t } from './text_config.js';

const SLOT = { weapon: [0], armor: [1], artifact: [2, 3] };

export class LootDrops {
  constructor(game) {
    this.game = game; this.list = [];
    this.box = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    this.beam = new THREE.CylinderGeometry(0.16, 0.3, 9, 8, 1, true).translate(0, 4.5, 0);
    this.ring = new THREE.TorusGeometry(0.75, 0.06, 6, 24).rotateX(Math.PI / 2);
    this.cards = document.createElement('div');
    this.cards.className = 'loot-cards';
    this.cards.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.cards);
  }
  // Drop `item` for `player` (a human hero) near `pos`.
  drop(item, pos, player) {
    const g = this.game;
    const R = itemRarity(item), col = new THREE.Color(R.color);
    const grp = new THREE.Group();
    const a = Math.random() * Math.PI * 2, r = 1 + Math.random() * 1.5;
    const at = pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    const gy = g.world.groundBelow(at.x, at.z, at.y + 3); at.y = isFinite(gy) ? gy : pos.y;
    grp.position.copy(at);
    const block = new THREE.Mesh(this.box, new THREE.MeshStandardNodeMaterial({ color: col, emissive: col, emissiveIntensity: 1.4, roughness: 0.3, metalness: 0.5 }));
    block.position.y = 0.7; block.castShadow = true;
    const beam = new THREE.Mesh(this.beam, new THREE.MeshBasicNodeMaterial({ color: col.clone().multiplyScalar(1.6), transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    const owner = new THREE.Color(player.color ?? '#ffffff');
    const ring = new THREE.Mesh(this.ring, new THREE.MeshBasicNodeMaterial({ color: owner.multiplyScalar(2), transparent: true, opacity: 0.85 }));
    ring.position.y = 0.06;
    grp.add(block, beam, ring);
    g.scene.add(grp);
    const light = g.lights.attach(grp, col.getHex(), 2.5, 5, { offsetY: 1 });
    this.list.push({ item, grp, block, beam, ring, player, device: player.device, t: 0, light });
    g.particles.burst(at.clone().setY(at.y + 0.8), { count: 18, color: col, speed: 3, up: 3, life: 0.8, size: 0.14, shape: 1 });
    g.audio?.loot?.(itemInfo(item).rarity);
  }
  update(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.t += dt;
      d.block.rotation.y += dt * 1.8; d.block.position.y = 0.7 + Math.sin(d.t * 2.5) * 0.12;
      d.ring.scale.setScalar(1 + Math.sin(d.t * 4) * 0.06);
      // loot belongs to the person, not the hero: after a switch it follows
      // the device to whichever hero they now control
      const owner = g.players.find((q) => !q.ai && !q.remote && q.device === d.device) ?? (g.players.includes(d.player) && !d.player.ai ? d.player : null);
      const who = owner && !owner.dead && !owner.downed && !owner.ai ? owner : null;
      if (who && who.pos.distanceTo(d.grp.position) < 1.5) { this.collect(d, who); this.list.splice(i, 1); }
    }
  }
  collect(d, p) {
    const g = this.game, sv = g.saveFor?.(p) ?? g.save, save = sv.data;   // net: into that player's profile
    g.scene.remove(d.grp); g.lights.remove(d.light);
    const it = normalizeItem(d.item);
    it.isNew = true; it.finder = p.hero;
    save.inventory.push(it);
    sv.write();
    g.mission?.stats.loot.push(it);
    g.audio?.ui?.('buy');
    this.card(it, p);
  }
  // A card that compares the item with what this hero has equipped.
  card(it, p) {
    const g = this.game, b = itemInfo(it), R = itemRarity(it);
    const sv = g.saveFor?.(p) ?? g.save;   // net: that player's profile
    const gearUids = sv.hero(p.hero).gear;
    const gear = gearUids.map((u) => (u ? sv.item(u) : null));
    const slots = SLOT[b.kind];
    const current = slots.map((i) => gear[i]).find(Boolean) ?? null;
    let cmp = t('loot.card.newSlot');
    if (current) {
      const dp = it.power - current.power;
      const before = gearStats(gear, p.hero).s;
      const swapped = [...gear]; swapped[slots.find((i) => gear[i] === current)] = it;
      const after = gearStats(swapped, p.hero).s;
      const parts = [t('loot.card.power', { arrow: dp >= 0 ? '▲' : '▼', n: Math.abs(dp) })];
      const diff = (label, a, c, pct = true) => { const v = c - a; if (Math.abs(v) < 0.005) return; parts.push(t('loot.card.change', { label, arrow: v > 0 ? '▲' : '▼', value: pct ? Math.round(Math.abs(v) * 100) + '%' : Math.round(Math.abs(v)) })); };
      if (b.kind === 'weapon') { diff(t('loot.card.damage'), before.meleeMult, after.meleeMult); diff(t('loot.card.speed'), before.attackSpeed, after.attackSpeed); }
      if (b.kind === 'armor') { diff(t('loot.card.health'), before.maxHp, after.maxHp, false); diff(t('loot.card.armour'), before.armor, after.armor); diff(t('loot.card.speed'), before.speed, after.speed); }
      cmp = parts.join(' · ');
    }
    const multi = g.players.filter((q) => !q.ai && !q.remote).length > 1;
    const itemName = it.blessed ? t('loot.blessedName', { name: b.name }) : b.name;
    const el = h('div', { class: 'loot-card', style: `--rc:${R.color}` },
      h('div', { class: 'lc-icon' }, b.icon),
      h('div', { class: 'lc-body' },
        h('div', { class: 'lc-name' }, multi ? t('loot.card.nameFor', { n: p.index + 1, name: itemName }) : itemName),
        h('div', { class: 'lc-sub' }, b.hero && HEROES[b.hero] ? t('loot.card.subFavourite', { rarity: R.label, kind: KIND_LABEL[b.kind], power: it.power, hero: HEROES[b.hero].name }) : t('loot.card.sub', { rarity: R.label, kind: KIND_LABEL[b.kind], power: it.power })),
        h('div', { class: 'lc-cmp' }, cmp),
        h('div', { class: 'lc-hint' }, t('loot.card.hint'))));
    this.cards.appendChild(el);
    while (this.cards.children.length > 3) this.cards.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4800);
  }
  clear() { for (const d of this.list) { this.game.scene.remove(d.grp); this.game.lights.remove(d.light); } this.list = []; }
}
