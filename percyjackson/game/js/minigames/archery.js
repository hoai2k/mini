// Camp minigame: the archery range. Stand at the line and shoot (RT / right
// click, aim with the right stick or mouse; auto-aim is off) at bronze
// targets that slide, bob and pop up, with a wind that drifts the arrows.
// 45 seconds; bullseyes score more and keep a streak. Apollo's cabin holds
// the record to beat. Best scores are saved per hero.
import * as THREE from 'three/webgpu';

const DURATION = 45;
const RECORD = 900;          // Apollo cabin's best: the camp medal

const mat = (hex, e = 0) => new THREE.MeshStandardNodeMaterial({ color: hex, roughness: 0.55, emissive: e ? hex : 0, emissiveIntensity: e });

function buildTarget() {
  const g = new THREE.Group();
  const rings = [[0.8, 0xf4ead5], [0.62, 0xc9963a], [0.44, 0x10233d], [0.26, 0xe8664a], [0.1, 0xffd84a]];
  rings.forEach(([r, c], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.08, 20), mat(c, i === 4 ? 0.6 : 0)); m.rotation.x = Math.PI / 2; m.position.z = 0.01 * i; m.castShadow = true; g.add(m); });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), mat(0x6a4a2a)); post.position.y = -1.1; g.add(post);
  return g;
}

export class Archery {
  constructor(game, player, origin, facing = 0) {
    this.game = game; this.p = player;
    this.origin = origin.clone(); this.facing = facing;
    this.fwd = new THREE.Vector3(Math.sin(facing), 0, Math.cos(facing));
    this.side = new THREE.Vector3(this.fwd.z, 0, -this.fwd.x);
    this.t = DURATION; this.score = 0; this.streak = 0; this.shots = 0; this.hits = 0;
    this.targets = []; this.arrows = [];
    this.wind = (Math.random() - 0.5) * 3;
    this.cd = 0; this.spawnT = 0.5;
    this.group = new THREE.Group(); game.scene.add(this.group);
    this.done = false;
  }
  start() {
    const g = this.game;
    g.minigame = this;
    this.p.minigameLock = true;
    g.hud.setObjective('Archery Range', `Shoot the targets! RT / right click · wind ${this.windText()}`);
    g.toast?.('Archery: 45 seconds — go!', 'big');
    g.rig.cinematic({ center: this.origin.clone().addScaledVector(this.fwd, 9).setY(this.origin.y + 1.5), dur: 1e9, dist: 18, pitch: 0.75, orbit: 0 });
    g.addUpdater((dt) => this.update(dt));
  }
  windText() { const a = Math.abs(this.wind); return a < 0.4 ? 'calm' : `${a.toFixed(1)} ${this.wind > 0 ? '→' : '←'}`; }
  spawnTarget() {
    const kind = Math.random();
    const dist = 8 + Math.random() * 10;
    const lateral = (Math.random() - 0.5) * 12;
    const pos = this.origin.clone().addScaledVector(this.fwd, dist).addScaledVector(this.side, lateral);
    pos.y = this.origin.y + 1.6;
    const mesh = buildTarget(); mesh.position.copy(pos); mesh.rotation.y = this.facing + Math.PI;
    mesh.scale.setScalar(0.01);
    this.group.add(mesh);
    this.targets.push({ mesh, base: pos.clone(), age: 0, life: 4 + Math.random() * 3, mode: kind < 0.45 ? 'still' : kind < 0.8 ? 'slide' : 'bob', speed: 1 + Math.random() * 2, phase: Math.random() * 6, value: Math.round(dist * 6) });
  }
  update(dt) {
    if (this.done) return false;
    const g = this.game, p = this.p;
    if (g.paused) return true;
    this.t -= dt; this.cd -= dt; this.spawnT -= dt;
    if (this.spawnT <= 0 && this.targets.length < 5) { this.spawnTarget(); this.spawnT = 0.6 + Math.random() * 0.9; }
    // targets
    for (const tg of this.targets) {
      tg.age += dt;
      const s = Math.min(1, tg.age * 5) * (tg.age > tg.life - 0.3 ? Math.max(0, (tg.life - tg.age) / 0.3) : 1);
      tg.mesh.scale.setScalar(Math.max(0.01, s));
      const off = tg.mode === 'slide' ? Math.sin(tg.age * tg.speed + tg.phase) * 3 : 0;
      const bob = tg.mode === 'bob' ? Math.abs(Math.sin(tg.age * tg.speed * 1.5 + tg.phase)) * 1.2 : 0;
      tg.mesh.position.copy(tg.base).addScaledVector(this.side, off); tg.mesh.position.y += bob;
    }
    this.targets = this.targets.filter((tg) => { if (tg.age >= tg.life || tg.hit) { this.group.remove(tg.mesh); return false; } return true; });
    // shooting
    const inp = g.input.get(p.device);
    p.vel.set(0, p.vel.y, 0);
    if ((inp.pressed.ranged || inp.pressed.attack) && this.cd <= 0 && this.t > 0) this.shoot();
    // arrows
    for (const a of this.arrows) {
      a.vel.y -= 6 * dt; a.vel.addScaledVector(this.side, this.wind * dt * 0.35);
      a.mesh.position.addScaledVector(a.vel, dt);
      a.mesh.lookAt(a.mesh.position.clone().add(a.vel));
      a.life -= dt;
      for (const tg of this.targets) {
        if (tg.hit || tg.mesh.scale.x < 0.5) continue;
        const d = a.mesh.position.distanceTo(tg.mesh.position);
        if (d < 0.85 && Math.abs(new THREE.Vector3().subVectors(a.mesh.position, tg.mesh.position).dot(this.fwd)) < 0.6) {
          tg.hit = true; a.life = 0;
          const bull = d < 0.22, inner = d < 0.46;
          this.streak++; this.hits++;
          const pts = Math.round(tg.value * (bull ? 3 : inner ? 1.8 : 1) * (1 + Math.min(this.streak, 10) * 0.1));
          this.score += pts;
          g.fx.damageNumber(tg.mesh.position, pts, { color: bull ? '#ffd84a' : '#f4ead5', text: bull ? `BULLSEYE +${pts}` : `+${pts}` });
          g.particles.burst(tg.mesh.position.clone(), { count: bull ? 30 : 14, color: bull ? 0xffd84a : 0xc9963a, speed: 4, up: 2, life: 0.6, size: 0.14, shape: 1 });
          g.audio?.impact?.(bull ? 1.2 : 0.8);
        }
      }
    }
    this.arrows = this.arrows.filter((a) => { if (a.life <= 0 || a.mesh.position.y < this.origin.y - 2) { if (a.life > 0) this.streak = 0; this.group.remove(a.mesh); return false; } return true; });
    g.hud.setObjective(`Archery · ${Math.max(0, Math.ceil(this.t))} s`, `Score ${this.score} · streak ${this.streak} · wind ${this.windText()} · camp record ${this.record()}`);
    if (this.t <= 0 && !this.arrows.length) this.finish();
    return !this.done;
  }
  record() { return Math.max(RECORD, this.game.save.data.minigames?.archery ?? 0); }
  shoot() {
    const g = this.game, p = this.p;
    this.cd = 0.45; this.shots++;
    const from = p.pos.clone().setY(p.pos.y + 1.4).addScaledVector(this.fwd, 0.6);
    const dir = p.aimDir.lengthSq() > 0.01 ? p.aimDir.clone() : this.fwd.clone();
    if (dir.dot(this.fwd) < 0.2) dir.copy(this.fwd);
    dir.y = 0.06; dir.normalize();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.7), mat(0xd8b040, 0.4));
    mesh.position.copy(from);
    this.group.add(mesh);
    this.arrows.push({ mesh, vel: dir.multiplyScalar(26), life: 2 });
    p.facing = Math.atan2(dir.x, dir.z);
    p.action = { type: 'cast', dur: 0.3, elapsed: 0, t: 0, moveScale: 0 };
    g.audio?.whoosh?.(0.8);
  }
  finish() {
    if (this.done) return;
    this.done = true;
    const g = this.game, d = g.save.data;
    const best = (d.minigames ??= {}).archery ?? 0;
    const medal = this.score >= RECORD ? 'gold' : this.score >= RECORD * 0.6 ? 'silver' : this.score >= RECORD * 0.3 ? 'bronze' : null;
    if (this.score > best) d.minigames.archery = this.score;
    const drachmas = Math.round(this.score / 40);
    g.addCoins(drachmas);
    g.save.write();
    g.scene.remove(this.group);
    this.p.minigameLock = false;
    g.minigame = null;
    g.rig.cine = null;
    g.toast?.(`${medal ? medal[0].toUpperCase() + medal.slice(1) + ' medal! ' : ''}Score ${this.score}${this.score > best ? ' — new best!' : ''} · +${drachmas} drachmas`, 'big');
    g.audio?.levelUp?.();
    g.hud.setObjective('Camp Half-Blood', 'Archery best: ' + Math.max(best, this.score));
  }
  abort() { this.t = 0; this.arrows = []; this.finish(); }
}
