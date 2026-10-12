// Magic items: the two active slots (Z / X, D-pad ← / →). Each `act` is one
// effect; items in loot.js choose one. Power scales effects with item power.
import * as THREE from 'three/webgpu';
import { Ally } from './entities/ally.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const near = (g, pos, r, fn) => { let n = 0; for (const e of g.enemies) if (!e.dead && !e.isDummy && !e.untargetable && e.pos.distanceTo(pos) < r) { fn(e); n++; } return n; };

export function useArtifact(game, p, art) {
  const g = game, b = art.base;
  const power = 1 + (art.it.power - 10) * 0.03;
  const from = p.pos.clone().setY(p.pos.y + 1.3);
  const aim = p.aimDir.clone().setY(0).normalize();
  switch (b.act) {
    // ---------------------------------------------------------------- attacks
    case 'spear': { // Spark of the Master Bolt: piercing lightning javelin
      p.kit.cast(0.35);
      g.projectiles.fire({ pos: from, vel: aim.clone().multiplyScalar(30), team: 'player', shape: 'arrow', color: 0xffe88a, emissive: 2.5, life: 1.1, pierce: true, radius: 0.6, light: 4,
        trail: (q) => g.particles.burst(q.pos, { count: 1, color: 0xfff0a0, speed: 0.2, life: 0.3, size: 0.22, sizeEnd: 0.05 }),
        onHit: (e, q) => { g.combat.damageEnemy(e, 55 * power, p, { unblockable: true, knock: q.vel.clone().setLength(6), stagger: 0.6 }); g.fx.hitSpark(q.pos, q.vel.clone().normalize(), { color: 0xffe88a, big: true }); g.bolts.spawn(e.pos.clone().setY(e.pos.y + 1), { count: 3, length: 2, life: 0.2 }); } });
      g.audio?.impact(0.8);
      break;
    }
    case 'chain': { // Hephaestus's Golden Net: pull
      p.kit.cast(0.3);
      g.projectiles.fire({ pos: from, vel: aim.clone().multiplyScalar(24), team: 'player', shape: 'nail', color: 0xffd84a, emissive: 1.2, life: 0.5, pierce: true, radius: 0.9, scale: 2.4,
        trail: (q) => g.particles.burst(q.pos, { count: 2, color: 0xffd84a, speed: 0.4, life: 0.35, size: 0.1, shape: 1 }),
        onHit: (e) => { g.combat.damageEnemy(e, 18 * power, p, { stagger: 0.8 }); e.knock?.add(tmp.subVectors(p.pos, e.pos).setY(0).multiplyScalar(2.6)); } });
      g.audio?.tone({ freq: 900, to: 400, dur: 0.3, gain: 0.08, type: 'square', filter: 3000 });
      break;
    }
    case 'feathers': { // Stymphalian Feathers: a fan of bronze knives
      p.kit.cast(0.3);
      for (let i = -3; i <= 3; i++) {
        const d = aim.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), i * 0.12);
        g.projectiles.fire({ pos: from.clone(), vel: d.multiplyScalar(26), team: 'player', shape: 'nail', color: 0xd8a040, emissive: 0.6, life: 0.6, radius: 0.4,
          onHit: (e, q) => { g.combat.damageEnemy(e, 12 * power, p, { knock: q.vel.clone().setLength(2), stagger: 0.2 }); } });
      }
      g.audio?.whoosh(1);
      break;
    }
    case 'fire': { // Jar of Greek Fire: thrown, burns where it lands
      p.kit.cast(0.35);
      const dist = Math.min(11, Math.max(3, p.aimPoint.distanceTo(p.pos) || 7)), flight = 0.6, grav = 18;
      const vel = aim.clone().multiplyScalar(dist / flight); vel.y = 0.5 * grav * flight;
      g.projectiles.fire({ pos: from, vel, team: 'player', shape: 'cube', color: 0x6aff4a, emissive: 2, gravity: grav, life: 2, scale: 1.2, radius: 0.5,
        onHit: (e, q) => { q.life = 0; },
        onExpire: (q) => { g.hazards.add({ pos: q.pos, radius: 2.6, dps: 22 * power, dur: 5, color: 0x6aff4a, team: 'player', src: p }); g.fx.explosion(q.pos, 0x6aff4a, 2.6); g.audio?.impact(1); } });
      break;
    }
    case 'lightning': { // Thunder of Zeus: strike the five nearest monsters
      p.kit.cast(0.4, true);
      const list = g.enemies.filter((e) => !e.dead && !e.isDummy && !e.untargetable && e.pos.distanceTo(p.pos) < 14).sort((a, c) => a.pos.distanceTo(p.pos) - c.pos.distanceTo(p.pos)).slice(0, 5);
      list.forEach((e, i) => setTimeout(() => {
        if (e.dead) return;
        g.bolts.spawn(e.pos.clone().setY(e.pos.y + 8), { count: 4, length: 8, life: 0.25 });
        g.lights.flash(e.pos.clone().setY(e.pos.y + 3), new THREE.Color(0xc8d8ff), 10, 10, 0.25);
        g.combat.damageEnemy(e, 40 * power, p, { stagger: 0.7, unblockable: true });
        g.audio?.impact(0.9);
      }, i * 110));
      if (list.length) g.fx.flash(0xd8e8ff, 0.2, 0.15);
      break;
    }
    case 'sunbeam': { // Ray of the Sun Chariot: a burning line
      p.kit.cast(0.6);
      const len = 14;
      g.fx.slashLine(from, aim, len, 0xffe08a, 0.9, 0.4);
      for (const e of g.enemies) {
        if (e.dead || e.isDummy || e.untargetable) continue;
        tmp.subVectors(e.pos, p.pos).setY(0);
        const along = tmp.dot(aim); if (along < 0 || along > len) continue;
        if (tmp.addScaledVector(aim, -along).length() > 1.2 + (e.radius ?? 0.5)) continue;
        g.combat.damageEnemy(e, 48 * power, p, { stagger: 0.4, color: '#ffd84a' });
        g.hazards.add({ pos: e.pos, radius: 1, dps: 8 * power, dur: 2, color: 0xffb03a, team: 'player', src: p });
      }
      g.lights.flash(from.clone().addScaledVector(aim, 4), new THREE.Color(0xffd890), 10, 14, 0.4);
      g.audio?.charge?.(0.3, 1.2);
      break;
    }
    case 'boar': { // Erymanthian Boar Tusk: trampling charge
      p.facing = Math.atan2(aim.x, aim.z);
      p.iframes = Math.max(p.iframes, 0.5);
      const hit = new Set();
      let t = 0;
      g.addUpdater((dt) => {
        t += dt;
        p.knock = (p.knock ?? new THREE.Vector3()).copy(aim).multiplyScalar(22);
        near(g, p.pos, 1.8, (e) => { if (hit.has(e)) return; hit.add(e); g.combat.damageEnemy(e, 30 * power, p, { knock: aim.clone().multiplyScalar(9).add(tmp2.set(0, 0, 0)), stagger: 0.7 }); });
        if (Math.random() < 0.7) g.fx.landDust(p.pos, 14);
        return t < 0.45;
      });
      g.audio?.whoosh(1.4);
      break;
    }
    case 'geyser': { // Trident of the Sea: geysers all around
      p.kit.cast(0.45, true);
      g.fx.shockwave(p.pos, 0x4ad8ff, 6);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, at = p.pos.clone().add(new THREE.Vector3(Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2));
        setTimeout(() => { g.fx.splash(at, 2.5); g.particles.burst(at.clone().setY(at.y + 0.5), { count: 14, color: 0x9ad8ff, speed: 2, up: 9, life: 0.8, size: 0.2, gravity: 14 }); }, i * 40);
      }
      near(g, p.pos, 5, (e) => { g.combat.damageEnemy(e, 34 * power, p, { stagger: 0.8, knock: tmp.subVectors(e.pos, p.pos).setY(0).normalize().multiplyScalar(6) }); if (!e.isBoss) e.vel.y = Math.max(e.vel.y, 9); });
      g.audio?.impact(1.2);
      break;
    }
    case 'winds': { // Bag of Winds: a gale cone
      p.kit.cast(0.4);
      g.fx.slashArc(p.pos, p.facing, 0xe8f4ff, 7, 0.6, 0.35);
      for (let i = 0; i < 30; i++) { const d = aim.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 1.2); g.particles.burst(from.clone(), { count: 1, color: 0xe8f4ff, additive: false, speed: 0, life: 0.6, size: 0.4, sizeEnd: 1.4 }); void d; }
      for (const e of g.combat.query(p.pos, aim, 8, 0.65)) {
        g.combat.damageEnemy(e, 20 * power, p, { knock: aim.clone().multiplyScalar(e.isBoss ? 4 : 18), stagger: 0.9 });
      }
      g.audio?.whoosh(1.6);
      break;
    }
    case 'doll': { // Nemesis's Fortune Coin: balance the scales
      p.kit.cast(0.4);
      for (const e of g.enemies) {
        if (e.dead || !e.hitBy) continue;
        const t = e.hitBy.get(p); if (t === undefined || g.time - t > 5) continue;
        g.combat.damageEnemy(e, 38 * power, p, { stagger: 0.6, unblockable: true });
        g.fx.hitSpark(e.pos.clone().setY(e.pos.y + 1), null, { color: 0xffd84a, big: true });
      }
      g.audio?.impact(1.4);
      break;
    }
    // ---------------------------------------------------------------- control
    case 'prison': { // Medusa's Head: petrify nearby monsters
      p.kit.cast(0.5, true);
      near(g, p.pos, 8, (e) => { if (e.isBoss) { e.stunT = Math.max(e.stunT ?? 0, 1.2); return; } e.sealT = 4; g.fx.summonCircle(e.pos, 0xb8b0a0); });
      g.fx.shockwave(p.pos, 0xc8c0b0, 8);
      g.fx.flash(0xc8c0b0, 0.25, 0.25);
      g.audio?.gong();
      break;
    }
    case 'lyre': { // Lyre of Orpheus: sleep until hit
      p.kit.cast(0.8, true);
      near(g, p.pos, 9, (e) => { if (e.isBoss) return; e.sealT = 6; e.sleeping = true; const hp = e.hp; const watch = () => { if (e.dead || e.hp < hp - 1) { e.sealT = 0; e.sleeping = false; return false; } return (e.sealT ?? 0) > 0; }; g.addUpdater(watch); });
      for (let i = 0; i < 12; i++) setTimeout(() => g.particles.burst(p.pos.clone().setY(p.pos.y + 2), { count: 3, color: 0x9ae8ff, speed: 2.5, up: 1.5, life: 1.2, size: 0.2, shape: 1 }), i * 70);
      for (const q of g.players) if (!q.dead && q.pos.distanceTo(p.pos) < 9) q.heal(q.maxHp * 0.08);
      g.audio?.energy('heal');
      break;
    }
    case 'discord': { // Golden Apple of Discord: monsters fight each other
      p.kit.cast(0.4);
      const at = p.aimPoint?.clone() ?? p.pos.clone();
      g.particles.burst(at.clone().setY(at.y + 1), { count: 30, color: 0xffd84a, speed: 3, up: 3, life: 1, size: 0.2, shape: 1 });
      const fooled = [];
      near(g, at, 8, (e) => { if (!e.isBoss) { fooled.push(e); e.confused = true; } });
      let t = 0, tick = 0;
      g.addUpdater((dt) => {
        t += dt; tick -= dt;
        if (tick <= 0) {
          tick = 0.6;
          for (const e of fooled) {
            if (e.dead) continue;
            let other = null, od = 4;
            for (const o of fooled) { if (o === e || o.dead) continue; const d = o.pos.distanceTo(e.pos); if (d < od) { od = d; other = o; } }
            if (other) { other.takeDamage((e.dmg ?? 10) * 1.2 * power, null, { stagger: 0.3, knock: tmp.subVectors(other.pos, e.pos).setY(0).normalize().multiplyScalar(3) }); g.fx.hitSpark(other.pos.clone().setY(other.pos.y + 1), null, { color: 0xffd84a }); e.facing = Math.atan2(other.pos.x - e.pos.x, other.pos.z - e.pos.z); }
            e.status && (e.status.root = 0.6);
          }
        }
        if (t >= 6) { for (const e of fooled) e.confused = false; return false; }
        return true;
      });
      g.audio?.tone({ freq: 660, to: 880, dur: 0.4, gain: 0.08, type: 'triangle' });
      break;
    }
    case 'hourglass': { // Hourglass of Kronos: monsters slow to a crawl
      g.battleSense?.(4);
      g.fx.flash(0xc8a060, 0.3, 0.4);
      g.fx.screenWave(p.pos.clone().setY(p.pos.y + 1), 1, 0.8);
      g.audio?.gong();
      break;
    }
    case 'owl': { // Athena's Owl: mark every monster in sight
      const n = near(g, p.pos, 15, (e) => { e.mark = Math.max(e.mark ?? 0, 8); g.fx.summonCircle(e.pos, 0xc9963a); });
      g.toast?.(n ? `The owl marks ${n} monster${n > 1 ? 's' : ''}` : 'The owl sees no monsters');
      g.audio?.tone({ freq: 520, to: 420, dur: 0.35, gain: 0.08, type: 'sine' });
      break;
    }
    // ---------------------------------------------------------------- support
    case 'barrier': { // Aegis Charm
      p.barrierT = 5;
      g.fx.rings.spawn(tmp.set(p.pos.x, p.pos.y + 0.06, p.pos.z), { color: 0xffe08a, r0: 0.5, r1: 3, dur: 0.5, thick: 0.12 });
      g.audio?.energy('infinity');
      break;
    }
    case 'charm': { // Nectar Flask
      for (const q of g.players) if (!q.dead && q.pos.distanceTo(p.pos) < 6) { q.healOverTime = { left: q.maxHp * 0.3 * power, t: 4 }; g.fx.heal(q.pos, 0xffc84a); }
      g.audio?.energy('heal');
      break;
    }
    case 'helm': { // Shadow of the Helm: the team turns invisible
      const team = g.players.filter((q) => !q.dead && !q.remote);
      for (const q of team) { q.invisible = true; q.rig.setDissolve?.(0.55); g.particles.burst(q.pos.clone().setY(q.pos.y + 1), { count: 20, color: 0x1a1426, additive: false, speed: 2, life: 0.8, size: 0.5, sizeEnd: 1.6 }); }
      for (const e of g.enemies) if (e.target && team.includes(e.target)) e.target = null;
      setTimeout(() => { for (const q of team) { q.invisible = false; q.rig.setDissolve?.(0); } }, 5000);
      g.audio?.energy('infinity');
      break;
    }
    case 'shoes': { // Winged Sneakers
      p.speedBuffT = 6; p.speedBuff = 0.45;
      g.particles.burst(p.pos.clone().setY(p.pos.y + 0.3), { count: 16, color: 0xffffff, speed: 2, up: 1, life: 0.5, size: 0.18, shape: 1 });
      g.audio?.whoosh(0.8);
      break;
    }
    case 'thread': { // Ariadne's Thread: the way to the next goal
      p.speedBuffT = 8; p.speedBuff = 0.2;
      const goal = threadGoal(g, p);
      if (!goal) { g.toast?.('The thread lies still: nothing left to find here'); break; }
      let t = 0;
      g.addUpdater((dt) => {
        t += dt;
        const d = tmp.subVectors(goal, p.pos); const len = d.length(); d.normalize();
        for (let k = 1; k < Math.min(16, len); k += 1.6) if (Math.random() < 0.35) g.particles.burst(p.pos.clone().addScaledVector(d, k + (t * 3) % 1.6).setY(p.pos.y + 0.4), { count: 1, color: 0xffd84a, speed: 0, life: 0.5, size: 0.14, sizeEnd: 0.04 });
        return t < 8;
      });
      g.audio?.tone({ freq: 880, to: 1320, dur: 0.3, gain: 0.06, type: 'sine' });
      break;
    }
    case 'cornucopia': { // the horn of plenty
      g.pickups.drop('heal', p.pos, 3);
      g.pickups.drop('coin', p.pos, 8 + Math.round(power * 4));
      g.pickups.drop('ce', p.pos, 2);
      g.audio?.loot?.('rare');
      break;
    }
    case 'pegasus': // Pegasus Whistle: a diving ally
    case 'corpse': {
      const pos = p.pos.clone().addScaledVector(aim, 1.5);
      g.allies.push(new Ally(g, p, 'nue', pos, { life: 12, hpMult: power, dmgMult: power, color: 0xf4f4ff }));
      g.audio?.energy('summon');
      break;
    }
    case 'snakes': { // Caduceus: George and Martha
      for (const s of [-1, 1]) {
        const pos = p.pos.clone().add(new THREE.Vector3(Math.cos(p.facing) * s * 1.2, 0, -Math.sin(p.facing) * s * 1.2));
        g.allies.push(new Ally(g, p, 'dog', pos, { life: 12, hpMult: power * 0.8, dmgMult: power, color: 0x4a9a4a }));
      }
      g.audio?.energy('summon');
      break;
    }
  }
}

// Where Ariadne's thread leads: an unfinished objective, a closed chest, the
// boss arena or the way out.
function threadGoal(g, p) {
  const m = g.mission;
  if (!m) return null;
  const cands = [];
  for (const it of m.obj?.items ?? []) if (!it.done) cands.push(it.pos);
  if (!cands.length && m.objDone && !m.boss?.dead && m.L.bossRoom) cands.push(new THREE.Vector3(m.L.bossRoom.center.x, p.pos.y, m.L.bossRoom.center.z));
  if (g.exitPortal) cands.push(g.exitPortal.pos);
  for (const c of m.L.chests ?? []) if (!c.opened) cands.push(c.pos);
  let best = null, bd = 1e9;
  for (const c of cands) { const d = c.distanceTo(p.pos); if (d < bd) { bd = d; best = c; } }
  return best;
}
