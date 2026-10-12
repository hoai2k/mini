// The opening of a new game, run step by step (the steps are in
// story/opening.js): the Manhattan prologue, the bus cutscene, chapter 1,
// the summer cutscene, chapter 2, waking at the Big House, then camp.
//
// Where it is lives in the main profile of the save (data.opening) and in
// the resume point (resume.js), so Continue picks it up mid-prologue or at
// the start of a cutscene. Online the host runs it: net/online.js shares the
// prologue and the cutscenes as scenes, a guest who reaches the bus tells the
// host, and guests skip a cutscene together (or when the host does).
import * as THREE from 'three/webgpu';
import { toast } from '../ui/ui.js';
import { BIOMES } from '../world/biomes.js';
import { buildManhattan } from '../world/manhattan.js';
import { schoolBus, taxi, car } from '../world/vehicles.js';
import { buildMortal } from '../entities/mortals.js';
import { Cutscene } from './cutscene.js';
import { CUTSCENES } from './cutscenes.js';
import { openingStep, openingDone, advanceOpening, nextStep, stepAfterChapter, STEP_INFO, isStep } from './opening.js';

export class OpeningFlow {
  constructor(game) { this.game = game; this.running = null; }
  get step() { return openingStep(this.game.save?.data); }
  get done() { return openingDone(this.game.save?.data); }
  // is the game in the middle of the opening right now?
  get active() { const g = this.game; return !!this.running && (g.mode === 'prologue' || g.mode === 'cutscene' || !!g.openingChapter); }
  // move every local player's profile on (never back)
  setStep(step) {
    const g = this.game;
    for (const sv of g.localSaves?.() ?? [g.save]) if (advanceOpening(sv.data, step)) sv.write();
    if (advanceOpening(g.save.data, step)) g.save.write();
  }
  // run a step of the opening (host or alone). opts.cp: where to put the party (Continue)
  run(step = this.step, opts = {}) {
    const g = this.game;
    if (!isStep(step)) step = 'prologue';
    this.running = step;
    const info = STEP_INFO[step];
    if (info.kind === 'level') return this.startPrologue(opts);
    if (info.kind === 'cutscene') return this.playCutscene(info.cutscene, { step });
    if (info.kind === 'chapter') { g.openingChapter = info.chapter; return g.startChapter(info.chapter, 1, { opening: true }); }
    this.running = null;
    g.endCutscene?.();
    g.loadHub(); toast('Camp Half-Blood', 'big');
    return null;
  }
  // ---------------------------------------------------------------- the prologue
  startPrologue({ remote = false, cp = null } = {}) {
    const g = this.game;
    g.endCutscene?.();
    g.online?.loading?.();
    g.ui.closeAll(); g.paused = false;
    g.clearLevel();
    g.chapter = null; g.openingChapter = null;
    if (!remote) this.running = 'prologue';
    const L = buildManhattan();   // (seeded: every screen builds the same street)
    g.mode = 'loading-prologue';
    g.loadWorld(L, BIOMES.manhattan);
    g.audio.overrideMusic = null; g.audio.setMusic(BIOMES.manhattan.music);
    g.placePlayers(cp ? new THREE.Vector3(...cp) : L.spawn);
    for (const p of g.players) p.object.visible = true;
    g.minimap.level = null; g.hud.mini.classList.add('hidden');
    g.hud.show(true); g.touch?.show(true);
    // the bus at the curb, the parked cars, the people on the street
    const bus = schoolBus(); bus.position.copy(L.bus.pos); bus.rotation.y = L.bus.yaw; g.world.group.add(bus);
    for (const p of L.parked) { const v = p.kind === 'taxi' ? taxi() : car(p.color); v.position.copy(p.pos); v.rotation.y = p.yaw; g.world.group.add(v); }
    const people = L.npcs.map((n) => {
      const rig = buildMortal(n.id); rig.root.position.copy(n.pos); rig.root.rotation.y = n.yaw; g.world.group.add(rig.root);
      return { n, rig, pos: n.pos.clone(), dir: 1, t: Math.random() * 5 };
    });
    const world = g.world;
    g.addUpdater((dt) => {
      if (g.world !== world) return false;
      for (const P of people) {
        P.t += dt; let sp = 0;
        if (P.n.walk) {
          const to = P.dir > 0 ? P.n.walk : P.n.pos, d = new THREE.Vector3().subVectors(to, P.pos).setY(0);
          if (d.length() < 0.2) P.dir = -P.dir; else { d.setLength(Math.min(d.length(), 1.4 * dt)); P.pos.add(d); P.rig.root.rotation.y = Math.atan2(d.x, d.z); sp = 0.35; }
          P.rig.root.position.copy(P.pos);
        } else if (P.n.idle === 'stare') {
          const lead = g.players.find((p) => !p.ai) ?? g.players[0];
          if (lead) P.rig.root.rotation.y = Math.atan2(lead.pos.x - P.pos.x, lead.pos.z - P.pos.z);
        }
        P.rig.animate({ dt, speed: sp, vel: new THREE.Vector3() });
      }
      return true;
    });
    // get on the bus: walk up and press X / E, or just walk into the door
    g.interactables.push({ id: 'bus', pos: L.door.clone(), radius: 2.8, label: 'Get on the bus', action: (p) => this.reachBus(p) });
    g.addUpdater(() => {
      if (g.world !== world || g.mode !== 'prologue') return g.world === world;
      if (g.players.some((p) => !p.ai && !p.remote && !p.dead && Math.hypot(p.pos.x - L.door.x, p.pos.z - L.door.z) < 2.0)) this.reachBus();
      return true;
    });
    g.mode = 'prologue';
    g.tracker?.setGoal({ title: STEP_INFO.prologue.goal, desc: 'Yancy Academy’s field trip leaves from the curb, up the avenue', pos: L.goal, radius: 1.5 });
    g.roaming?.configureCity(L.rats);
    g.online?.sceneChanged?.();
    toast('Manhattan · The Morning of the Field Trip', 'big');
    const pad = g.input?.lastDevice?.startsWith?.('pad');
    setTimeout(() => g.mode === 'prologue' && g.state === 'playing' && toast(`You're late for the field trip. Follow the gold footprints to the school bus.`), 2600);
    setTimeout(() => g.mode === 'prologue' && g.state === 'playing' && toast(pad ? 'Left stick: move · X: attack · A: jump · B: dodge' : 'WASD: move · Left click: attack · Space: jump · Shift: dodge'), 7000);
    return L;
  }
  reachBus() {
    const g = this.game;
    if (g.mode !== 'prologue' || this.leaving) return;
    if (g.online?.isGuest) { if (!this.asked) { this.asked = true; g.online.session?.send('act', { k: 'bus' }); setTimeout(() => { this.asked = false; }, 2000); } return; }
    this.prologueDone();
  }
  prologueDone() {
    const g = this.game;
    if (g.mode !== 'prologue' || this.leaving) return;
    this.leaving = true;
    g.audio?.ui?.('buy');
    toast('All aboard!', 'big');
    this.setStep('cut-bus');
    setTimeout(() => { this.leaving = false; if (g.mode === 'prologue') this.run('cut-bus'); }, 700);
  }
  // ---------------------------------------------------------------- cutscenes
  playCutscene(id, { step = null, remote = false } = {}) {
    const g = this.game, def = CUTSCENES[id];
    if (!def) return null;
    g.endCutscene?.();
    g.ui.closeAll(); g.paused = false;
    g.online?.loading?.();
    g.hud.show(false); g.touch?.show(false);
    g.tracker?.setGoal(null); g.roaming?.clear();
    g.openingChapter = null; g.chapter = null;
    const cs = new Cutscene(g, def, { remote, onEnd: () => this.cutsceneDone(id) });
    g.cutscene = cs; g.csBuilding = true;
    try { cs.start(); } finally { g.csBuilding = false; }
    g.mode = 'cutscene';
    if (!remote) { this.running = step ?? this.stepOf(id); g.resume?.schedule?.(); }
    else { const after = nextStep(this.stepOf(id)); for (const sv of g.localSaves()) if (advanceOpening(sv.data, after)) sv.write(); }   // a guest's own opening moves on too
    g.online?.sceneChanged?.();
    return cs;
  }
  stepOf(id) { return Object.keys(STEP_INFO).find((k) => STEP_INFO[k].cutscene === id) ?? null; }
  cutsceneDone(id) {
    const g = this.game;
    g.cutscene = null;
    for (const p of g.players) p.object.visible = true;
    g.hud.show(true); g.touch?.show(true);
    const next = nextStep(this.stepOf(id));
    this.setStep(next);
    if (id === 'wake') { this.running = null; this.arriveInCamp(); return; }
    this.run(next);
  }
  // after waking: camp is open
  arriveInCamp() {
    const g = this.game;
    g.mode = 'hub';
    g.placePlayers(g.level.spawn);
    for (const p of g.players) p.object.visible = true;
    g.updateCampGoal?.();
    g.roaming?.configureCamp();
    g.online?.sceneChanged?.();
    g.resume?.flush?.();
    toast('Camp Half-Blood', 'big');
    setTimeout(() => g.mode === 'hub' && g.state === 'playing' && toast('The gold arrow points to your next quest. The Big House porch has the chapter map.'), 2400);
  }
  // a chapter of the opening is finished: the story goes on from the results screen
  chapterDone(id) { const next = stepAfterChapter(id); if (next) this.setStep(next); return next; }
  // Settings: skip the opening (now, or for this save from here on)
  skip() {
    const g = this.game;
    this.setStep('done');
    g.save.data.opening = 'done'; g.save.write();
    const inIt = g.state === 'playing' && (g.mode === 'prologue' || g.mode === 'cutscene' || g.openingChapter);
    this.running = null;
    if (inIt && !g.online?.isGuest) { g.openingChapter = null; g.endCutscene?.(); g.resume?.clear?.(); g.ui.closeAll(); g.paused = false; g.loadHub(); toast('Camp Half-Blood', 'big'); }
  }
}
