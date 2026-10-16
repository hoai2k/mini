// Aquarium: one shared fish tank that everyone in the session watches and
// plays with together. Add fish from a picker of ten species, each with its
// own personality; feed them by tapping the water (flakes sprinkle down);
// grab any fish and drag it somewhere else, or drop it on the bin in the
// bottom right to take it out. Fish get hungry over time and the hungry
// hunters go after the fish they eat, with a chomp and a burst of bubbles.
// Keep them fed and the little ones survive.
//
// The food chain (who eats whom; everyone eats flakes):
//   Guppy, Neon tetra   <- Angelfish, Piranha, Lionfish
//   Clownfish, Betta    <- Piranha, Lionfish, Reef shark
//   Angelfish           <- Piranha, Reef shark
//   Catfish, Piranha    <- Reef shark
//   Pufferfish (puffs up), Lionfish (spines), Reef shark: nobody
// Personalities: guppies and tetras school (tetras are shy and hide in the
// plants when a hunter comes near), the clownfish guards its anemone, the
// betta picks fights, the angelfish and pufferfish come to see where you
// tap, the pufferfish puffs up when scared or grabbed (and can't be eaten),
// the catfish lazes on the floor eating what sinks, piranhas hunt in a pack,
// the lionfish lurks and lunges, and the shark patrols the whole tank.
//
// The tank is wider than any screen: world units, 100 tall (0 the surface,
// 100 the bottom of the sand) and 2 x XW wide, centred on the view. Each
// screen shows the full height and as much width as fits, so fish swim off
// the left and right edges and come back. Every fish picks its next spot on
// screen with a chance that falls as the tank fills (ON_SCREEN / fish), so the
// more fish there are, the more time each spends off screen. When the tank is
// crowded (from CROWD_FROM fish) everyone gets hungrier and grumpier: more
// nips and scuffles, and hunters strike sooner.
//
// Shared state (owner only), about nine times a second:
//   { v: 1, n: next fish id, e: next event id,
//     f: [[id, species, x*10, y*10, vx*10, vy*10, hunger*99, mode, face]],
//     fl: [[id, x*10, y*10]],                     the flakes
//     ev: [[id, kind, x*10, y*10, a, b, species]], recent events (eat, fight, add, bin)
//     h: [[fish id, player id]] }                fish being held
// Everyone else draws from it, easing each fish toward where it should be
// by now. Players send 'add' { sp }, 'feed' { x, y }, 'grab' { id },
// 'drag' { id, x, y }, 'drop' { id, x, y } and 'bin' { id }; the owner checks
// and applies them. A newcomer gets the whole tank from shared state; if the
// owner leaves, the next member picks the simulation up from what it last saw.
//
// Artwork aq-<species> (side views facing right) and aq-tank (the water) are
// drawn once delivered; until then every fish and the tank are drawn here.

const XW = 200;                 // the tank runs from -XW to XW
const STAGE = 35;               // |x| up to this counts as "on screen"
const ON_SCREEN = 8;            // about this many fish aim for the middle at once
const TOP = 7, FLOOR = 90, SAND = 91;
const MAX_FISH = 40;
const MAX_FLAKES = 70;
const CROWD_FROM = 18, CROWD_SPAN = 16;
const PUBLISH_MS = 110;
const ANEMONE_X = 16;
const PLANTS = [
  { x: -178, h: 42, n: 5 }, { x: -128, h: 30, n: 4 }, { x: -70, h: 46, n: 6 }, { x: -30, h: 28, n: 4 },
  { x: 36, h: 40, n: 5 }, { x: 78, h: 30, n: 4 }, { x: 132, h: 48, n: 6 }, { x: 182, h: 34, n: 4 },
];
const CHEST_X = -12;
const FONT = 'ui-rounded, "SF Pro Rounded", system-ui, sans-serif';

// The species, in picker order. len: body length in world units; speed:
// cruising units a second; hunger: how much hungrier per second; eats: prey.
const SPECIES = [
  { id: 'guppy', name: 'Guppy', len: 6.4, speed: 14, hunger: 1 / 80, eats: [], school: true,
    trait: 'Playful · swims in a school', color: '#ffb347' },
  { id: 'tetra', name: 'Neon tetra', len: 5.8, speed: 15, hunger: 1 / 80, eats: [], school: true, shy: true,
    trait: 'Shy · hides in the plants', color: '#2fe6ff' },
  { id: 'clown', name: 'Clownfish', len: 8, speed: 11, hunger: 1 / 75, eats: [], home: true, feisty: 0.05,
    trait: 'Brave · guards its anemone', color: '#ff7a1a' },
  { id: 'betta', name: 'Betta', len: 9.4, speed: 10, hunger: 1 / 75, eats: [], feisty: 0.16,
    trait: 'Show-off · picks fights', color: '#4a5bff' },
  { id: 'angel', name: 'Angelfish', len: 10.5, speed: 10, hunger: 1 / 55, eats: ['guppy', 'tetra'], curious: true,
    trait: 'Curious · comes to see you', color: '#e9eef6' },
  { id: 'puffer', name: 'Pufferfish', len: 9.2, speed: 7, hunger: 1 / 70, eats: [], curious: true, puffs: true,
    trait: 'Nosy · puffs up when scared', color: '#ffd84a' },
  { id: 'catfish', name: 'Catfish', len: 14, speed: 5, hunger: 1 / 70, eats: [], bottom: true,
    trait: 'Lazy · cleans the floor', color: '#9a7a46' },
  { id: 'piranha', name: 'Piranha', len: 11, speed: 16, hunger: 1 / 40, eats: ['guppy', 'tetra', 'clown', 'betta', 'angel'],
    pack: true, feisty: 0.06, trait: 'Fierce · hunts in a pack', color: '#ff4a3d' },
  { id: 'lionfish', name: 'Lionfish', len: 14.5, speed: 7, hunger: 1 / 45, eats: ['guppy', 'tetra', 'clown', 'betta'],
    lunge: true, trait: 'Sneaky · lurks, then lunges', color: '#e8473b' },
  { id: 'shark', name: 'Reef shark', len: 22, speed: 13, hunger: 1 / 38, eats: ['clown', 'betta', 'angel', 'catfish', 'piranha'],
    patrol: true, feisty: 0.03, trait: 'Top hunter · patrols the tank', color: '#6f8fb3' },
];
const SP = Object.fromEntries(SPECIES.map((s, i) => [s.id, { ...s, i }]));
const eatersOf = id => SPECIES.filter(s => s.eats.includes(id)).map(s => s.id);
const canEat = (a, b) => SP[a].eats.includes(b);

// Fish modes, as published.
const M = { swim: 0, hunt: 1, flee: 2, fight: 3, food: 4, held: 5, lunge: 6, puff: 7 };
// Event kinds.
const EV = { eat: 1, fight: 2, add: 3, bin: 4 };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const r10 = v => Math.round(v * 10);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = list => list[Math.floor(Math.random() * list.length)];

// --- the simulation (run by the owner) ----------------------------------------
class Tank {
  constructor() {
    this.fish = [];
    this.flakes = [];
    this.events = [];
    this.nextId = 1;
    this.nextEv = 1;
    this.nextFlake = 1;
    this.time = 0;
    this.groups = {};           // species -> { x, y, t }: where the school is heading
    this.attract = null;        // { x, y, until }: a recent tap curious fish come to see
  }

  static load(state) {
    const t = new Tank();
    if (!state) return t;
    t.nextId = state.nextId;
    t.nextEv = state.nextEv;
    for (const f of state.fish) {
      const fish = t.make(f.sp, f.x, f.y, f.id);
      Object.assign(fish, { vx: f.vx, vy: f.vy, hunger: f.hunger, face: f.face, held: state.holds.get(f.id) ?? null, safe: 0 });
    }
    for (const fl of state.flakes) t.flakes.push({ id: t.nextFlake++, x: fl.x, y: fl.y, vy: 2.5, age: 0 });
    return t;
  }

  make(sp, x, y, id = this.nextId++) {
    const s = SP[sp];
    const fish = {
      id, sp, x, y, vx: 0, vy: 0, face: Math.random() < 0.5 ? -1 : 1, hunger: rnd(0.05, 0.3), mode: M.swim,
      tx: x, ty: y, retarget: 0, held: null, safe: 4, prey: null, chase: 0, rest: 0, full: 0,
      fight: null, flee: 0, puff: 0, ox: rnd(-7, 7), oy: rnd(-5, 5), lungeT: 0,
    };
    this.fish.push(fish);
    if (id >= this.nextId) this.nextId = id + 1;
    if (s.bottom) fish.y = clamp(y, TOP, FLOOR);
    return fish;
  }

  crowd() {
    return clamp((this.fish.length - CROWD_FROM) / CROWD_SPAN, 0, 1);
  }

  event(k, x, y, a = 0, b = 0, s = 0) {
    this.events.push({ id: this.nextEv++, k, x, y, a, b, s, at: this.time });
  }

  add(sp, x = rnd(-STAGE * 0.7, STAGE * 0.7)) {
    if (!SP[sp] || this.fish.length >= MAX_FISH) return null;
    const f = this.make(sp, clamp(x, -XW + 5, XW - 5), 4);
    f.vy = 10;
    f.ty = SP[sp].bottom ? 88 : rnd(30, 70);
    f.tx = f.x + rnd(-10, 10);
    f.retarget = 2.5;
    this.event(EV.add, f.x, 3, f.id, 0, SP[sp].i);
    return f;
  }

  feed(x, y, n = 5) {
    x = clamp(x, -XW + 2, XW - 2);
    y = clamp(y, 2, SAND - 1);
    for (let i = 0; i < n && this.flakes.length < MAX_FLAKES; i++) {
      this.flakes.push({ id: this.nextFlake++, x: x + rnd(-2.5, 2.5), y: y + rnd(-1.5, 1.5), vy: rnd(2, 3.4), age: 0, ph: rnd(0, 6) });
    }
    this.attract = { x, y, until: this.time + 5 };
  }

  byId(id) {
    return this.fish.find(f => f.id === id) || null;
  }

  grab(id, by) {
    const f = this.byId(id);
    if (!f || (f.held && f.held !== by)) return false;
    f.held = by;
    f.vx = f.vy = 0;
    f.fight = null;
    f.prey = null;
    if (SP[f.sp].puffs) f.puff = 3;
    return true;
  }

  drag(id, x, y, by) {
    const f = this.byId(id);
    if (!f || f.held !== by) return;
    f.x = clamp(x, -XW, XW);
    f.y = clamp(y, 2, SAND);
  }

  drop(id, x, y, by) {
    const f = this.byId(id);
    if (!f || f.held !== by) return;
    this.drag(id, x, y, by);
    f.held = null;
    f.safe = 1.5;
    f.y = clamp(f.y, TOP, SP[f.sp].bottom ? FLOOR : FLOOR - 2);
    f.tx = f.x;
    f.ty = SP[f.sp].bottom ? 88 : f.y;
    f.retarget = SP[f.sp].bottom ? 6 : 1.5;
  }

  bin(id, by) {
    const f = this.byId(id);
    if (!f || (f.held && f.held !== by)) return false;
    this.fish = this.fish.filter(o => o !== f);
    this.event(EV.bin, f.x, f.y, f.id, 0, SP[f.sp].i);
    return true;
  }

  // Lets go of fish held by players who have left.
  release(present) {
    for (const f of this.fish) if (f.held && !present.has(f.held)) { f.held = null; f.safe = 1; }
  }

  pickSpot(f) {
    const s = SP[f.sp];
    const n = Math.max(1, this.fish.length);
    const onStage = Math.random() < clamp(ON_SCREEN / n, 0.1, 1);
    const side = Math.random() < 0.5 ? -1 : 1;
    let x = onStage ? rnd(-STAGE, STAGE) : side * rnd(STAGE + 12, XW - 8);
    let y = rnd(18, 78);
    let t = rnd(3, 7);
    if (s.bottom) { y = rnd(86, 89); t = rnd(5, 10); }
    if (s.home && onStage && Math.random() < 0.8) { x = ANEMONE_X + rnd(-9, 9); y = rnd(72, 85); }
    if (s.shy && Math.random() < 0.35) { const p = pick(PLANTS.filter(q => (Math.abs(q.x) <= STAGE + 2) === onStage)); x = p.x + rnd(-4, 4); y = rnd(FLOOR - p.h * 0.8, FLOOR - 4); }
    if (s.patrol) { x = side * rnd(XW * 0.45, XW - 15); y = rnd(20, 75); t = rnd(6, 11); }
    if (s.lunge) t = rnd(6, 12);
    return { x, y, t };
  }

  step(dt, rand = Math.random) {
    this.time += dt;
    const crowd = this.crowd();
    const fish = this.fish;
    // Schools and packs head for a shared spot.
    for (const s of SPECIES) {
      if (!s.school && !s.pack) continue;
      const g = this.groups[s.id];
      if (!g || this.time > g.t) {
        const spot = this.pickSpot({ sp: s.id });
        const from = g ? g.x : spot.x;
        this.groups[s.id] = { x: spot.x, y: spot.y, t: this.time + Math.max(spot.t + 2, Math.abs(spot.x - from) / (s.speed * 0.6) + 3) };
      }
    }
    if (this.attract && this.time > this.attract.until) this.attract = null;

    // Flakes sink and settle on the sand, then go after a while.
    for (const fl of this.flakes) {
      fl.age += dt;
      if (fl.y < SAND) {
        fl.y = Math.min(SAND, fl.y + fl.vy * dt);
        fl.x += Math.sin(this.time * 2 + (fl.ph ?? 0)) * 1.2 * dt;
      }
    }
    this.flakes = this.flakes.filter(fl => fl.age < 40);

    const eaten = new Set();
    for (const f of fish) {
      if (eaten.has(f.id)) continue;
      const s = SP[f.sp];
      f.safe = Math.max(0, f.safe - dt);
      f.full = Math.max(0, f.full - dt);
      f.rest = Math.max(0, f.rest - dt);
      f.flee = Math.max(0, f.flee - dt);
      f.puff = Math.max(0, f.puff - dt);
      f.hunger = clamp(f.hunger + s.hunger * dt * (1 + crowd), 0, 1);
      if (f.held) { f.mode = M.held; f.vx = f.vy = 0; continue; }

      let speed = s.speed * 0.5;
      let tx = f.tx, ty = f.ty;
      let mode = M.swim;
      let agility = s.patrol ? 1.6 : 2.6;

      // A fight: both wriggle round each other for a moment, then one flees.
      if (f.fight) {
        f.fight.t -= dt;
        const o = this.byId(f.fight.with);
        if (!o || o.held || f.fight.t <= 0) {
          if (f.fight.lose && o) { f.flee = 2.2; f.fleeFrom = o.id; }
          f.fight = null;
        } else {
          const mx = (f.x + o.x) / 2, my = (f.y + o.y) / 2;
          const a = this.time * 9 + (f.id % 7);
          tx = mx + Math.cos(a) * 2.4;
          ty = my + Math.sin(a * 1.3) * 1.6;
          speed = s.speed * 1.2;
          mode = M.fight;
          agility = 8;
        }
      }

      // Danger: a hungry hunter that eats me, close by.
      let danger = null, dd = 1e9;
      if (mode === M.swim) {
        for (const o of fish) {
          if (o === f || o.held || !canEat(o.sp, f.sp) || o.hunger < this.huntAt(crowd) - 0.1) continue;
          const d = Math.hypot(o.x - f.x, o.y - f.y);
          if (d < 20 && d < dd) { danger = o; dd = d; }
        }
        if (f.flee && !danger) danger = this.byId(f.fleeFrom);
      }
      if (danger && s.puffs) {
        f.puff = Math.max(f.puff, 2.5);
      }
      if (f.puff > 0 && s.puffs && mode === M.swim) {
        mode = M.puff;
        speed = s.speed * 0.25;
      } else if (danger && mode === M.swim) {
        mode = M.flee;
        const ax = f.x - danger.x, ay = f.y - danger.y, al = Math.hypot(ax, ay) || 1;
        tx = f.x + (ax / al) * 20;
        ty = f.y + (ay / al) * 12;
        if (s.shy) {
          const p = PLANTS.reduce((b, q) => (Math.abs(q.x - f.x) < Math.abs(b.x - f.x) ? q : b));
          tx = p.x;
          ty = FLOOR - p.h * 0.4;
        }
        speed = s.speed * 1.1;
        agility = 4;
      }

      // Food: flakes first (feeding keeps the hunters off the little ones).
      if (mode === M.swim && f.hunger > 0.18) {
        let best = null, bd = 1e9;
        for (const fl of this.flakes) {
          if (s.bottom && fl.y < 72) continue;
          const d = Math.hypot(fl.x - f.x, fl.y - f.y);
          if (d < 75 && d < bd) { best = fl; bd = d; }
        }
        if (best) {
          mode = M.food;
          tx = best.x;
          ty = best.y;
          speed = s.speed * (s.bottom ? 0.8 : 1.05);
          agility = 4;
          if (bd < s.len * 0.45 + 1) {
            this.flakes = this.flakes.filter(fl => fl !== best);
            f.hunger = Math.max(0, f.hunger - (s.len > 8 ? 0.12 : 0.2));
          }
        }
      }

      // Hunting.
      if (mode === M.swim && s.eats.length && f.hunger >= this.huntAt(crowd) && !f.full && !f.rest) {
        let prey = f.prey != null ? this.byId(f.prey) : null;
        if (!prey || prey.held || prey.safe || (SP[prey.sp].puffs && prey.puff)) {
          prey = null;
          let bd = 1e9;
          for (const o of fish) {
            if (o === f || eaten.has(o.id) || o.held || o.safe || !canEat(f.sp, o.sp)) continue;
            const d = Math.hypot(o.x - f.x, o.y - f.y);
            if (d < 45 && d < bd) { prey = o; bd = d; }
          }
          f.prey = prey ? prey.id : null;
          f.chase = 0;
        }
        if (prey) {
          f.chase += dt;
          const d = Math.hypot(prey.x - f.x, prey.y - f.y);
          mode = M.hunt;
          tx = prey.x + prey.vx * 0.3;
          ty = prey.y + prey.vy * 0.3;
          speed = s.speed * (1.5 + 0.3 * crowd);
          agility = 3.5;
          if (s.lunge) {
            if (d < s.len * 1.1 || f.lungeT > 0) { mode = M.lunge; speed = s.speed * 3.2; agility = 9; f.lungeT = f.lungeT || 0.6; }
            else speed = s.speed * 0.45;
          }
          f.lungeT = Math.max(0, f.lungeT - dt);
          if (d < s.len * 0.42 + SP[prey.sp].len * 0.3) {
            eaten.add(prey.id);
            f.hunger = Math.max(0, f.hunger - 0.7);
            f.full = 5;
            f.prey = null;
            f.lungeT = 0;
            this.event(EV.eat, prey.x, prey.y, f.id, prey.id, SP[prey.sp].i);
          } else if (f.chase > 7) {
            f.prey = null;
            f.rest = 3;
          }
        }
      }

      // Scuffles: feisty fish (and anyone when the tank is crowded) nip at a
      // neighbour that isn't predator or prey.
      if (mode === M.swim && !f.fight && f.safe === 0) {
        const p = ((s.feisty ?? 0) + 0.008 + 0.3 * crowd * crowd) * dt;
        if (rand() < p) {
          let o = null, bd = 9 + s.len * 0.4;
          for (const q of fish) {
            if (q === f || q.held || q.fight || eaten.has(q.id) || canEat(q.sp, f.sp) || canEat(f.sp, q.sp)) continue;
            if (SP[q.sp].len > s.len * 2.2 || s.len > SP[q.sp].len * 2.2) continue;
            const d = Math.hypot(q.x - f.x, q.y - f.y);
            if (d < bd) { o = q; bd = d; }
          }
          if (o) {
            const lose = rand() < 0.5;
            f.fight = { with: o.id, t: 1.1, lose };
            o.fight = { with: f.id, t: 1.1, lose: !lose };
            mode = M.fight;
            this.event(EV.fight, (f.x + o.x) / 2, (f.y + o.y) / 2, f.id, o.id, s.i);
          }
        }
      }

      // Wandering (by personality).
      if (mode === M.swim) {
        f.retarget -= dt;
        const g = this.groups[f.sp];
        if ((s.school || s.pack) && g) {
          tx = g.x + f.ox * (s.pack ? 1.6 : 1);
          ty = clamp(g.y + f.oy, 12, 84);
          speed = s.speed * 0.6;
          agility = 3;
        } else {
          if (f.retarget <= 0 || Math.hypot(f.tx - f.x, f.ty - f.y) < 3) {
            const spot = this.pickSpot(f);
            f.tx = spot.x;
            f.ty = spot.y;
            f.retarget = Math.max(spot.t, Math.abs(spot.x - f.x) / (s.speed * 0.9) + 1.5);
          }
          tx = f.tx;
          ty = f.ty;
          if (s.curious && this.attract && Math.hypot(this.attract.x - f.x, this.attract.y - f.y) < 55) {
            tx = this.attract.x + (f.x < this.attract.x ? -5 : 5);
            ty = this.attract.y;
            speed = s.speed * 0.8;
          }
          if (s.lunge) speed = s.speed * 0.3;
          // A long way to go (off the side or back): even the slow ones get a move on.
          if (Math.abs(tx - f.x) > 40) speed = Math.max(speed, s.speed * 0.9);
          if (s.bottom && f.y < 80) { tx = f.x; ty = 88; speed = s.speed * 3; }
          if (s.patrol) speed = s.speed * 0.75;
        }
      }
      f.mode = mode;

      // Steer toward (tx, ty).
      const dx = tx - f.x, dy = ty - f.y, dl = Math.hypot(dx, dy);
      let wx = 0, wy = 0;
      if (dl > 0.4) {
        const k = Math.min(1, dl / 4);
        wx = (dx / dl) * speed * k;
        wy = (dy / dl) * speed * k * 0.75;
      }
      // Keep a little room between fish.
      for (const o of fish) {
        if (o === f || o.held) continue;
        const ax = f.x - o.x, ay = f.y - o.y, d = Math.hypot(ax, ay);
        const room = (s.len + SP[o.sp].len) * 0.32;
        if (d > 0.01 && d < room && !(mode === M.hunt && o.id === f.prey) && mode !== M.fight) {
          const push = (room - d) / room * 6;
          wx += (ax / d) * push;
          wy += (ay / d) * push;
        }
      }
      const a = 1 - Math.exp(-agility * dt);
      f.vx += (wx - f.vx) * a;
      f.vy += (wy - f.vy) * a;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      const top = TOP + (s.len > 10 ? 4 : 0);
      const bottom = s.bottom ? FLOOR - 1 : FLOOR - 2 - s.len * 0.15;
      if (f.y < top) { f.y = top; f.vy = Math.abs(f.vy) * 0.3; }
      if (f.y > bottom) { f.y = bottom; f.vy = -Math.abs(f.vy) * 0.3; }
      if (f.x < -XW + 2) { f.x = -XW + 2; f.vx = Math.abs(f.vx); f.tx = f.x + 30; }
      if (f.x > XW - 2) { f.x = XW - 2; f.vx = -Math.abs(f.vx); f.tx = f.x - 30; }
      if (Math.abs(f.vx) > 0.4 && mode !== M.fight) f.face = f.vx > 0 ? 1 : -1;
      if (mode === M.fight) { const o = this.byId(f.fight?.with); if (o) f.face = o.x > f.x ? 1 : -1; }
    }
    if (eaten.size) this.fish = this.fish.filter(f => !eaten.has(f.id));
    this.events = this.events.filter(e => this.time - e.at < 3).slice(-16);
  }

  huntAt(crowd = this.crowd()) {
    return 0.6 - 0.2 * crowd;
  }

  pack() {
    const holds = this.fish.filter(f => f.held).map(f => [f.id, f.held]);
    return {
      v: 1, n: this.nextId, e: this.nextEv,
      f: this.fish.map(f => [f.id, SP[f.sp].i, r10(f.x), r10(f.y), r10(f.vx), r10(f.vy), Math.round(f.hunger * 99), f.mode, f.face]),
      fl: this.flakes.slice(-MAX_FLAKES).map(fl => [fl.id, r10(fl.x), r10(fl.y)]),
      ev: this.events.map(e => [e.id, e.k, r10(e.x), r10(e.y), e.a, e.b, e.s]),
      h: holds,
    };
  }
}

// Reads (and checks) the owner's shared state.
function readShared(sh) {
  if (!sh || typeof sh !== 'object' || sh.v !== 1) return null;
  const out = { nextId: Math.max(1, Math.floor(num(sh.n, 1))), nextEv: Math.max(1, Math.floor(num(sh.e, 1))), fish: [], flakes: [], events: [], holds: new Map() };
  const seen = new Set();
  for (const r of Array.isArray(sh.f) ? sh.f.slice(0, MAX_FISH + 10) : []) {
    if (!Array.isArray(r)) continue;
    const id = Math.floor(num(r[0], -1));
    const s = SPECIES[Math.floor(num(r[1], -1))];
    if (id < 0 || !s || seen.has(id)) continue;
    seen.add(id);
    out.fish.push({
      id, sp: s.id,
      x: clamp(num(r[2]) / 10, -XW, XW), y: clamp(num(r[3]) / 10, 0, SAND),
      vx: clamp(num(r[4]) / 10, -60, 60), vy: clamp(num(r[5]) / 10, -60, 60),
      hunger: clamp(num(r[6]) / 99, 0, 1), mode: clamp(Math.floor(num(r[7])), 0, 7), face: num(r[8], 1) < 0 ? -1 : 1,
    });
  }
  for (const r of Array.isArray(sh.fl) ? sh.fl.slice(0, MAX_FLAKES + 10) : []) {
    if (!Array.isArray(r)) continue;
    out.flakes.push({ id: num(r[0]), x: clamp(num(r[1]) / 10, -XW, XW), y: clamp(num(r[2]) / 10, 0, SAND) });
  }
  for (const r of Array.isArray(sh.ev) ? sh.ev.slice(-20) : []) {
    if (!Array.isArray(r)) continue;
    const k = Math.floor(num(r[1]));
    if (k < 1 || k > 4) continue;
    out.events.push({ id: Math.floor(num(r[0])), k, x: clamp(num(r[2]) / 10, -XW, XW), y: clamp(num(r[3]) / 10, 0, 100),
      a: Math.floor(num(r[4])), b: Math.floor(num(r[5])), s: clamp(Math.floor(num(r[6])), 0, SPECIES.length - 1) });
  }
  for (const r of Array.isArray(sh.h) ? sh.h.slice(0, 32) : []) {
    if (Array.isArray(r) && typeof r[1] === 'string' && r[1].length < 80) out.holds.set(Math.floor(num(r[0], -1)), r[1]);
  }
  return out;
}

// --- stand-in drawings ---------------------------------------------------------
// Each fish is painted facing right, centred, L long, on a canvas 1.3 L wide
// and 1.2 L tall (fins, tails and spines fit inside it).
const PL = 200;
function ell(c, x, y, rx, ry, rot = 0) {
  c.beginPath();
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
}
function paint(c, fill, stroke, lw = 5) {
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
}
function bodyPath(c, L, hh, belly = 1, nose = 0.48) {
  const b = hh * belly;
  c.beginPath();
  c.moveTo(L * nose, hh * 0.05);
  c.bezierCurveTo(L * (nose - 0.02), -hh * 0.75, L * 0.25, -hh, L * 0.02, -hh);
  c.bezierCurveTo(-L * 0.17, -hh, -L * 0.27, -hh * 0.45, -L * 0.31, -hh * 0.22);
  c.lineTo(-L * 0.31, b * 0.22);
  c.bezierCurveTo(-L * 0.27, b * 0.45, -L * 0.17, b, L * 0.02, b);
  c.bezierCurveTo(L * 0.25, b, L * (nose - 0.02), b * 0.75, L * nose, hh * 0.05);
  c.closePath();
}
function tailPath(c, L, th, notch = 0.42, x0 = -0.28) {
  c.beginPath();
  c.moveTo(L * x0, -th * 0.18);
  c.quadraticCurveTo(-L * 0.4, -th * 0.6, -L * 0.52, -th);
  c.quadraticCurveTo(-L * notch, 0, -L * 0.52, th);
  c.quadraticCurveTo(-L * 0.4, th * 0.6, L * x0, th * 0.18);
  c.closePath();
}
function eye(c, x, y, r, sleepy = false, angry = false) {
  ell(c, x, y, r, r);
  paint(c, '#fff', '#1d1d35', r * 0.22);
  ell(c, x + r * 0.22, y + r * 0.05, r * 0.56, r * 0.6);
  paint(c, '#16162b');
  ell(c, x + r * 0.38, y - r * 0.28, r * 0.2, r * 0.2);
  paint(c, '#fff');
  if (sleepy) {
    c.beginPath();
    c.moveTo(x - r * 1.05, y - r * 0.05);
    c.arc(x, y, r * 1.05, Math.PI, 0);
    c.closePath();
    paint(c, '#7a5c30', '#1d1d35', r * 0.18);
  }
  if (angry) {
    c.beginPath();
    c.moveTo(x - r * 1.1, y - r * 1.5);
    c.lineTo(x + r * 1.1, y - r * 0.8);
    c.strokeStyle = '#1d1d35';
    c.lineWidth = r * 0.45;
    c.lineCap = 'round';
    c.stroke();
  }
}
function mouth(c, x, y, s, open) {
  if (open) {
    c.beginPath();
    c.moveTo(x + s * 0.4, y - s * 1.2);
    c.lineTo(x - s * 1.6, y);
    c.lineTo(x + s * 0.4, y + s * 1.2);
    c.closePath();
    paint(c, '#5a1030', '#1d1d35', s * 0.3);
    return;
  }
  c.beginPath();
  c.arc(x - s * 0.6, y - s * 0.2, s * 0.7, 0.2, 1.6);
  c.strokeStyle = '#1d1d35';
  c.lineWidth = s * 0.35;
  c.lineCap = 'round';
  c.stroke();
}
function shine(c, x, y, rx, ry) {
  ell(c, x, y, rx, ry, -0.25);
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.fill();
}
function stripesClip(c, L, hh, belly, draw, nose) {
  c.save();
  bodyPath(c, L, hh, belly, nose);
  c.clip();
  draw();
  c.restore();
}
function finPath(c, pts) {
  c.beginPath();
  c.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 4) c.quadraticCurveTo(pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);
  c.closePath();
}

const PAINTERS = {
  guppy(c, L, o) {
    const hh = L * 0.17;
    const g = c.createLinearGradient(-L * 0.55, 0, -L * 0.25, 0);
    g.addColorStop(0, '#d36bff'); g.addColorStop(0.5, '#5b8cff'); g.addColorStop(1, '#ff6fb5');
    c.beginPath();
    c.moveTo(-L * 0.26, -hh * 0.3);
    c.bezierCurveTo(-L * 0.45, -L * 0.42, -L * 0.62, -L * 0.3, -L * 0.6, 0);
    c.bezierCurveTo(-L * 0.62, L * 0.3, -L * 0.45, L * 0.42, -L * 0.26, hh * 0.3);
    c.closePath();
    paint(c, g, '#6a2fa8', 5);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    for (let i = 0; i < 9; i++) { ell(c, -L * (0.36 + (i % 3) * 0.07), (i / 3 - 1.2) * L * 0.13, 4, 4); c.fill(); }
    finPath(c, [L * 0.05, -hh * 0.9, -L * 0.05, -hh * 1.8, -L * 0.15, -hh * 0.9]);
    paint(c, '#7da2ff', '#3a4fb0', 4);
    bodyPath(c, L, hh, 1.05);
    paint(c, '#ffb347', '#c25e10', 5);
    stripesClip(c, L, hh, 1.05, () => { ell(c, L * 0.05, hh * 0.7, L * 0.4, hh * 0.55); paint(c, '#fff1c9'); });
    bodyPath(c, L, hh, 1.05);
    paint(c, 'rgba(0,0,0,0)', '#c25e10', 5);
    shine(c, L * 0.08, -hh * 0.5, L * 0.12, hh * 0.22);
    eye(c, L * 0.3, -hh * 0.15, L * 0.085);
    mouth(c, L * 0.47, hh * 0.2, L * 0.03, o.open);
  },
  tetra(c, L, o) {
    const hh = L * 0.16;
    tailPath(c, L, L * 0.17);
    paint(c, 'rgba(220,240,255,0.85)', '#7aa7c7', 4);
    finPath(c, [L * 0.02, -hh * 0.9, -L * 0.06, -hh * 1.7, -L * 0.12, -hh * 0.85]);
    paint(c, 'rgba(220,240,255,0.85)', '#7aa7c7', 4);
    bodyPath(c, L, hh);
    paint(c, '#e4edf7', '#5d7f9e', 5);
    stripesClip(c, L, hh, 1, () => {
      c.fillStyle = '#ff3b5c';
      c.fillRect(-L * 0.35, hh * 0.05, L * 0.45, hh);
      const g = c.createLinearGradient(0, -hh * 0.4, 0, hh * 0.1);
      g.addColorStop(0, '#7ff9ff'); g.addColorStop(1, '#14b8ff');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-L * 0.33, -hh * 0.05);
      c.lineTo(L * 0.4, -hh * 0.35);
      c.lineTo(L * 0.4, -hh * 0.02);
      c.lineTo(-L * 0.33, hh * 0.18);
      c.fill();
    });
    bodyPath(c, L, hh);
    paint(c, 'rgba(0,0,0,0)', '#4b6c8a', 5);
    shine(c, L * 0.1, -hh * 0.6, L * 0.12, hh * 0.18);
    eye(c, L * 0.3, -hh * 0.2, L * 0.09);
    mouth(c, L * 0.47, hh * 0.2, L * 0.03, o.open);
  },
  clown(c, L, o) {
    const hh = L * 0.28;
    const fin = (pts) => { finPath(c, pts); paint(c, '#ff8a2a', '#1d1d35', 6); };
    tailPath(c, L, L * 0.2, 0.5);
    paint(c, '#ff8a2a', '#1d1d35', 6);
    fin([L * 0.12, -hh * 0.9, 0, -hh * 1.6, -L * 0.22, -hh * 0.6]);
    fin([-L * 0.02, hh * 0.9, -L * 0.1, hh * 1.5, -L * 0.22, hh * 0.6]);
    bodyPath(c, L, hh, 1, 0.47);
    paint(c, '#ff7a1a', '#1d1d35', 6);
    stripesClip(c, L, hh, 1, () => {
      for (const [x, w] of [[L * 0.24, L * 0.09], [-L * 0.02, L * 0.11], [-L * 0.27, L * 0.07]]) {
        c.fillStyle = '#1d1d35';
        c.fillRect(x - w / 2 - 6, -hh * 1.2, w + 12, hh * 2.4);
        c.fillStyle = '#fff';
        c.beginPath();
        c.ellipse(x, 0, w / 2, hh * 1.3, 0, 0, Math.PI * 2);
        c.fill();
      }
    }, 0.47);
    bodyPath(c, L, hh, 1, 0.47);
    paint(c, 'rgba(0,0,0,0)', '#1d1d35', 6);
    finPath(c, [L * 0.12, hh * 0.2, L * 0.02, hh * 0.75, -L * 0.03, hh * 0.3]);
    paint(c, '#ff9f4a', '#1d1d35', 4);
    shine(c, L * 0.1, -hh * 0.55, L * 0.1, hh * 0.15);
    eye(c, L * 0.35, -hh * 0.2, L * 0.075, false, false);
    mouth(c, L * 0.46, hh * 0.25, L * 0.035, o.open);
  },
  betta(c, L, o) {
    const hh = L * 0.16;
    const g = c.createLinearGradient(-L * 0.6, 0, L * 0.2, 0);
    g.addColorStop(0, '#ff2f6d'); g.addColorStop(0.5, '#b0249e'); g.addColorStop(1, '#4a5bff');
    c.beginPath();
    c.moveTo(-L * 0.25, -hh * 0.6);
    c.bezierCurveTo(-L * 0.5, -L * 0.55, -L * 0.7, -L * 0.25, -L * 0.62, 0);
    c.bezierCurveTo(-L * 0.7, L * 0.3, -L * 0.45, L * 0.58, -L * 0.2, hh * 0.6);
    c.closePath();
    paint(c, g, '#6d1250', 5);
    c.beginPath();
    c.moveTo(L * 0.15, -hh * 0.8);
    c.bezierCurveTo(L * 0.05, -L * 0.45, -L * 0.3, -L * 0.48, -L * 0.3, -hh * 0.4);
    c.closePath();
    paint(c, g, '#6d1250', 5);
    c.beginPath();
    c.moveTo(L * 0.18, hh * 0.8);
    c.bezierCurveTo(L * 0.1, L * 0.45, -L * 0.25, L * 0.5, -L * 0.28, hh * 0.4);
    c.closePath();
    paint(c, g, '#6d1250', 5);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      c.beginPath(); c.moveTo(-L * 0.28, 0); c.lineTo(-L * 0.6, (i / 5 - 0.5) * L * 0.7); c.stroke();
    }
    bodyPath(c, L, hh);
    const bg = c.createLinearGradient(-L * 0.3, 0, L * 0.5, 0);
    bg.addColorStop(0, '#c0185a'); bg.addColorStop(1, '#3355ff');
    paint(c, bg, '#22125e', 5);
    shine(c, L * 0.1, -hh * 0.55, L * 0.12, hh * 0.2);
    eye(c, L * 0.32, -hh * 0.2, L * 0.075, false, true);
    mouth(c, L * 0.47, hh * 0.2, L * 0.03, o.open);
  },
  angel(c, L, o) {
    const hh = L * 0.3;
    c.beginPath();
    c.moveTo(L * 0.2, -hh * 0.8);
    c.quadraticCurveTo(-L * 0.05, -L * 0.5, -L * 0.28, -L * 0.56);
    c.quadraticCurveTo(-L * 0.15, -L * 0.3, -L * 0.18, -hh * 0.4);
    c.closePath();
    paint(c, '#dfe6f0', '#3b3f55', 5);
    c.beginPath();
    c.moveTo(L * 0.2, hh * 0.8);
    c.quadraticCurveTo(-L * 0.05, L * 0.5, -L * 0.28, L * 0.56);
    c.quadraticCurveTo(-L * 0.15, L * 0.3, -L * 0.18, hh * 0.4);
    c.closePath();
    paint(c, '#dfe6f0', '#3b3f55', 5);
    tailPath(c, L, L * 0.2, 0.47);
    paint(c, 'rgba(230,236,246,0.9)', '#3b3f55', 5);
    // a diamond body
    const body = () => {
      c.beginPath();
      c.moveTo(L * 0.42, hh * 0.05);
      c.quadraticCurveTo(L * 0.3, -hh * 0.9, L * 0.05, -hh);
      c.quadraticCurveTo(-L * 0.22, -hh * 0.5, -L * 0.3, 0);
      c.quadraticCurveTo(-L * 0.22, hh * 0.5, L * 0.05, hh);
      c.quadraticCurveTo(L * 0.3, hh * 0.9, L * 0.42, hh * 0.05);
      c.closePath();
    };
    body();
    const g = c.createLinearGradient(L * 0.4, 0, -L * 0.3, 0);
    g.addColorStop(0, '#ffe08a'); g.addColorStop(0.35, '#f2f5fa'); g.addColorStop(1, '#cdd6e4');
    paint(c, g, '#3b3f55', 5);
    c.save();
    body();
    c.clip();
    c.fillStyle = '#2b2d42';
    for (const x of [L * 0.2, -L * 0.02, -L * 0.2]) c.fillRect(x - L * 0.025, -hh, L * 0.05, hh * 2);
    c.restore();
    body();
    paint(c, 'rgba(0,0,0,0)', '#3b3f55', 5);
    shine(c, L * 0.12, -hh * 0.5, L * 0.08, hh * 0.15);
    eye(c, L * 0.29, -hh * 0.12, L * 0.085);
    mouth(c, L * 0.41, hh * 0.15, L * 0.03, o.open);
  },
  puffer(c, L, o) {
    if (o.puffed) {
      const r = L * 0.48;
      c.strokeStyle = '#9a6a1a';
      c.lineWidth = 5;
      c.lineCap = 'round';
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        c.beginPath();
        c.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9);
        c.lineTo(Math.cos(a) * r * 1.18, Math.sin(a) * r * 1.18);
        c.stroke();
      }
      ell(c, 0, 0, r, r);
      paint(c, '#ffd84a', '#9a6a1a', 6);
      ell(c, 0, r * 0.35, r * 0.8, r * 0.55);
      c.fillStyle = '#fff6d6';
      c.fill();
      c.fillStyle = '#b07a2a';
      for (const [x, y] of [[-0.4, -0.5], [0, -0.65], [-0.6, -0.1], [-0.2, -0.25], [0.3, -0.45]]) { ell(c, x * r, y * r, r * 0.08, r * 0.08); c.fill(); }
      shine(c, -r * 0.2, -r * 0.6, r * 0.25, r * 0.1);
      eye(c, r * 0.45, -r * 0.25, r * 0.22);
      ell(c, r * 0.9, r * 0.15, r * 0.1, r * 0.13);
      paint(c, '#c2563a', '#1d1d35', 3);
      return;
    }
    const hh = L * 0.36;
    tailPath(c, L, L * 0.14, 0.46, -0.3);
    paint(c, '#ffc93a', '#9a6a1a', 5);
    finPath(c, [-L * 0.05, -hh * 0.85, -L * 0.15, -hh * 1.25, -L * 0.25, -hh * 0.6]);
    paint(c, '#ffc93a', '#9a6a1a', 4);
    bodyPath(c, L, hh, 1, 0.47);
    paint(c, '#ffd84a', '#9a6a1a', 6);
    stripesClip(c, L, hh, 1, () => {
      ell(c, 0, hh * 0.75, L * 0.5, hh * 0.6);
      c.fillStyle = '#fff6d6';
      c.fill();
      c.fillStyle = '#b07a2a';
      for (const [x, y] of [[-0.2, -0.5], [0.02, -0.7], [0.15, -0.45], [-0.12, -0.2], [0.05, -0.15], [-0.25, 0]]) { ell(c, x * L, y * hh, L * 0.03, L * 0.03); c.fill(); }
    }, 0.47);
    bodyPath(c, L, hh, 1, 0.47);
    paint(c, 'rgba(0,0,0,0)', '#9a6a1a', 6);
    finPath(c, [L * 0.12, hh * 0.1, L * 0.0, hh * 0.45, -L * 0.02, 0]);
    paint(c, '#ffc93a', '#9a6a1a', 4);
    shine(c, L * 0.05, -hh * 0.6, L * 0.12, hh * 0.13);
    eye(c, L * 0.27, -hh * 0.22, L * 0.11);
    ell(c, L * 0.46, hh * 0.15, L * 0.03, L * 0.04);
    paint(c, o.open ? '#5a1030' : '#c2563a', '#1d1d35', 3);
  },
  catfish(c, L, o) {
    const hh = L * 0.14;
    tailPath(c, L, L * 0.13, 0.45);
    paint(c, '#7d6236', '#3d2c12', 5);
    finPath(c, [L * 0.12, -hh * 0.9, L * 0.05, -hh * 2.1, -L * 0.04, -hh * 0.95]);
    paint(c, '#8b6d3c', '#3d2c12', 4);
    finPath(c, [-L * 0.1, -hh * 0.8, -L * 0.18, -hh * 1.4, -L * 0.22, -hh * 0.6]);
    paint(c, '#8b6d3c', '#3d2c12', 4);
    bodyPath(c, L, hh, 0.8, 0.49);
    const g = c.createLinearGradient(0, -hh, 0, hh);
    g.addColorStop(0, '#6f7a3a'); g.addColorStop(0.6, '#9a7a46'); g.addColorStop(1, '#e7d2a6');
    paint(c, g, '#3d2c12', 5);
    c.fillStyle = '#4a3a1c';
    for (let i = 0; i < 9; i++) { ell(c, L * (0.3 - i * 0.065), -hh * (0.2 + (i % 3) * 0.2), L * 0.018, L * 0.018); c.fill(); }
    c.strokeStyle = '#3d2c12';
    c.lineWidth = 3.5;
    c.lineCap = 'round';
    for (const [dx, dy] of [[0.62, 0.35], [0.6, 0.6], [0.56, 0.1]]) {
      c.beginPath();
      c.moveTo(L * 0.46, hh * 0.25);
      c.quadraticCurveTo(L * (dx - 0.04), hh * (dy + 0.6), L * dx, hh * (dy + 1.2));
      c.stroke();
    }
    finPath(c, [L * 0.15, hh * 0.5, L * 0.06, hh * 1.2, -L * 0.02, hh * 0.6]);
    paint(c, '#8b6d3c', '#3d2c12', 4);
    shine(c, L * 0.1, -hh * 0.55, L * 0.14, hh * 0.15);
    eye(c, L * 0.33, -hh * 0.25, L * 0.055, true);
    mouth(c, L * 0.48, hh * 0.25, L * 0.03, o.open);
  },
  piranha(c, L, o) {
    const hh = L * 0.31;
    tailPath(c, L, L * 0.2, 0.46);
    paint(c, '#8792a6', '#2b3242', 5);
    finPath(c, [L * 0.1, -hh * 0.92, -L * 0.05, -hh * 1.4, -L * 0.15, -hh * 0.75]);
    paint(c, '#8792a6', '#2b3242', 4);
    finPath(c, [-L * 0.02, hh * 0.85, -L * 0.1, hh * 1.3, -L * 0.2, hh * 0.6]);
    paint(c, '#ff5a45', '#2b3242', 4);
    bodyPath(c, L, hh, 1.05, 0.47);
    paint(c, '#a8b3c6', '#2b3242', 6);
    stripesClip(c, L, hh, 1.05, () => {
      ell(c, L * 0.05, hh * 0.85, L * 0.42, hh * 0.65);
      c.fillStyle = '#ff4a3d';
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 14; i++) { ell(c, L * (0.2 - (i % 5) * 0.09), hh * (-0.6 + Math.floor(i / 5) * 0.3), 3, 3); c.fill(); }
    }, 0.47);
    bodyPath(c, L, hh, 1.05, 0.47);
    paint(c, 'rgba(0,0,0,0)', '#2b3242', 6);
    shine(c, L * 0.1, -hh * 0.6, L * 0.12, hh * 0.13);
    eye(c, L * 0.3, -hh * 0.3, L * 0.07, false, true);
    // the underbite
    const mx = L * 0.47, my = hh * 0.25;
    if (o.open) {
      mouth(c, mx, my, L * 0.05, true);
    } else {
      c.beginPath();
      c.moveTo(mx - L * 0.12, my);
      c.lineTo(mx + L * 0.01, my - hh * 0.08);
      c.strokeStyle = '#2b3242';
      c.lineWidth = 4;
      c.stroke();
    }
    c.fillStyle = '#fff';
    c.strokeStyle = '#2b3242';
    c.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const x = mx - L * 0.1 + i * L * 0.028;
      c.beginPath();
      c.moveTo(x, my + (o.open ? hh * 0.15 : 0));
      c.lineTo(x + L * 0.012, my - L * 0.03 + (o.open ? hh * 0.15 : 0));
      c.lineTo(x + L * 0.024, my + (o.open ? hh * 0.15 : 0));
      c.closePath();
      c.fill();
      c.stroke();
    }
  },
  lionfish(c, L, o) {
    const hh = L * 0.19;
    // the spiky dorsal rays and fan fins
    for (let i = 0; i < 11; i++) {
      const x = L * (0.2 - i * 0.045);
      const a = -Math.PI / 2 - 0.35 - i * 0.07;
      const len = L * (0.4 - Math.abs(i - 4) * 0.02);
      c.beginPath();
      c.moveTo(x, -hh * 0.7);
      c.lineTo(x + Math.cos(a) * len, -hh * 0.7 + Math.sin(a) * len);
      c.strokeStyle = '#7a1320';
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.stroke();
      c.setLineDash([10, 9]);
      c.strokeStyle = '#fff1e0';
      c.lineWidth = 4;
      c.stroke();
      c.setLineDash([]);
    }
    c.beginPath();
    c.moveTo(L * 0.18, -hh * 0.6);
    c.lineTo(-L * 0.25, -hh * 0.6);
    c.lineTo(-L * 0.2, -L * 0.3);
    c.lineTo(L * 0.05, -L * 0.42);
    c.closePath();
    c.fillStyle = 'rgba(255,200,180,0.35)';
    c.fill();
    for (const [rot, s] of [[0.5, 1], [0.95, 0.9]]) {
      c.save();
      c.translate(L * 0.1, hh * 0.3);
      c.rotate(rot);
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(-L * 0.25 * s, L * 0.35 * s, -L * 0.45 * s, L * 0.25 * s);
      c.quadraticCurveTo(-L * 0.2 * s, L * 0.05, 0, 0);
      paint(c, '#f0997e', '#7a1320', 4);
      c.strokeStyle = 'rgba(122,19,32,0.6)';
      c.lineWidth = 2;
      for (let k = 1; k < 5; k++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(-L * 0.42 * s, L * 0.06 * k * s); c.stroke(); }
      c.restore();
    }
    tailPath(c, L, L * 0.17, 0.47);
    paint(c, '#f6c7b0', '#7a1320', 4);
    bodyPath(c, L, hh, 1, 0.47);
    paint(c, '#fff1e0', '#7a1320', 5);
    stripesClip(c, L, hh, 1, () => {
      for (let i = 0; i < 9; i++) {
        const x = L * (0.38 - i * 0.085);
        c.fillStyle = i % 2 ? '#7a1320' : '#e8473b';
        c.beginPath();
        c.moveTo(x, -hh * 1.2);
        c.quadraticCurveTo(x - L * 0.06, 0, x, hh * 1.2);
        c.lineTo(x + L * 0.035, hh * 1.2);
        c.quadraticCurveTo(x - L * 0.025, 0, x + L * 0.035, -hh * 1.2);
        c.fill();
      }
    }, 0.47);
    bodyPath(c, L, hh, 1, 0.47);
    paint(c, 'rgba(0,0,0,0)', '#7a1320', 5);
    shine(c, L * 0.12, -hh * 0.55, L * 0.1, hh * 0.15);
    eye(c, L * 0.32, -hh * 0.25, L * 0.06, false, true);
    mouth(c, L * 0.46, hh * 0.25, L * 0.03, o.open);
  },
  shark(c, L, o) {
    const hh = L * 0.13;
    // crescent tail
    c.beginPath();
    c.moveTo(-L * 0.3, -hh * 0.2);
    c.quadraticCurveTo(-L * 0.42, -L * 0.18, -L * 0.52, -L * 0.3);
    c.quadraticCurveTo(-L * 0.42, -L * 0.05, -L * 0.44, 0);
    c.quadraticCurveTo(-L * 0.46, L * 0.08, -L * 0.5, L * 0.16);
    c.quadraticCurveTo(-L * 0.4, L * 0.1, -L * 0.3, hh * 0.25);
    c.closePath();
    paint(c, '#5f7fa6', '#1f2f4a', 5);
    // dorsal fin
    finPath(c, [L * 0.1, -hh * 0.9, L * 0.0, -L * 0.36, -L * 0.1, -hh * 0.8]);
    paint(c, '#5f7fa6', '#1f2f4a', 5);
    c.beginPath();
    c.moveTo(-L * 0.005, -L * 0.33);
    c.lineTo(-L * 0.03, -L * 0.27);
    c.lineTo(L * 0.01, -L * 0.28);
    c.fillStyle = '#1f2f4a';
    c.fill();
    // body with a pointed snout
    const body = () => {
      c.beginPath();
      c.moveTo(L * 0.5, hh * 0.1);
      c.bezierCurveTo(L * 0.45, -hh * 0.8, L * 0.25, -hh, 0, -hh);
      c.bezierCurveTo(-L * 0.18, -hh * 0.9, -L * 0.28, -hh * 0.35, -L * 0.33, -hh * 0.15);
      c.lineTo(-L * 0.33, hh * 0.15);
      c.bezierCurveTo(-L * 0.25, hh * 0.6, -L * 0.1, hh, L * 0.05, hh);
      c.bezierCurveTo(L * 0.3, hh * 0.95, L * 0.45, hh * 0.6, L * 0.5, hh * 0.1);
      c.closePath();
    };
    body();
    paint(c, '#7d9cc2', '#1f2f4a', 5);
    c.save();
    body();
    c.clip();
    ell(c, L * 0.05, hh * 1.0, L * 0.5, hh * 0.65);
    c.fillStyle = '#f3f6fb';
    c.fill();
    c.restore();
    body();
    paint(c, 'rgba(0,0,0,0)', '#1f2f4a', 5);
    // pectoral fin
    finPath(c, [L * 0.12, hh * 0.6, L * 0.0, L * 0.25, -L * 0.04, hh * 0.7]);
    paint(c, '#5f7fa6', '#1f2f4a', 4);
    c.strokeStyle = '#1f2f4a';
    c.lineWidth = 3;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(L * (0.22 - i * 0.03), 0, hh * 0.45, -0.9, 0.9); c.stroke(); }
    shine(c, L * 0.12, -hh * 0.6, L * 0.14, hh * 0.15);
    eye(c, L * 0.37, -hh * 0.3, L * 0.04);
    // a cheeky grin
    const gy = hh * 0.35;
    c.beginPath();
    if (o.open) {
      c.moveTo(L * 0.44, gy - hh * 0.25);
      c.lineTo(L * 0.28, gy);
      c.lineTo(L * 0.44, gy + hh * 0.45);
      c.closePath();
      paint(c, '#5a1030', '#1f2f4a', 3);
    } else {
      c.moveTo(L * 0.27, gy);
      c.quadraticCurveTo(L * 0.36, gy + hh * 0.35, L * 0.45, gy - hh * 0.05);
      c.strokeStyle = '#1f2f4a';
      c.lineWidth = 4;
      c.stroke();
      c.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) {
        const x = L * (0.3 + i * 0.03);
        const y = gy + hh * 0.18 * Math.sin((i + 0.5) / 5 * Math.PI) * 0.9;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + L * 0.012, y + hh * 0.18); c.lineTo(x + L * 0.024, y); c.fill();
      }
    }
  },
};

const sprites = new Map();
function standIn(sp, variant = '') {
  const key = sp + variant;
  let cv = sprites.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.round(PL * 1.3);
  cv.height = Math.round(PL * 1.2);
  const c = cv.getContext('2d');
  c.translate(cv.width / 2, cv.height / 2);
  PAINTERS[sp](c, PL, { open: variant === 'open', puffed: variant === 'puff' });
  sprites.set(key, cv);
  return cv;
}

// --- the game ------------------------------------------------------------------
export default {
  id: 'aquarium',
  name: 'Aquarium',
  emoji: '🐠',
  blurb: 'One fish tank for everyone: add fish, feed them, and watch who eats whom.',
  minPlayers: 1,
  maxPlayers: 16,
  needsFace: false,
  fullBleed: false,

  create(api) {
    const style = document.createElement('style');
    style.textContent = `
      .aq-wrap { position: absolute; inset: 0; overflow: hidden; background: #0b4f7a; touch-action: none; user-select: none; -webkit-user-select: none; font-family: ${FONT}; }
      .aq-wrap canvas.g-canvas { cursor: pointer; }
      .aq-bar { position: absolute; left: 10px; bottom: 10px; display: flex; gap: 8px; align-items: center; pointer-events: none; }
      .aq-bar > * { pointer-events: auto; }
      .aq-add { font: 900 16px ${FONT}; padding: 10px 16px; border-radius: 999px; border: 0; cursor: pointer; }
      .aq-count { font: 800 13px ${FONT}; color: #fff; background: rgba(8,30,60,0.55); padding: 6px 10px; border-radius: 999px; pointer-events: none; }
      .aq-shelf { position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, rgba(14,24,64,0.94), rgba(26,12,62,0.98));
        border-top: 2px solid rgba(255,255,255,0.18); border-radius: 18px 18px 0 0; padding: 8px 0 10px; box-shadow: 0 -10px 30px rgba(0,0,0,0.35); }
      .aq-shelf[hidden] { display: none; }
      .aq-shelf-head { display: flex; align-items: center; justify-content: space-between; padding: 0 12px 6px; color: #fff; font: 900 15px ${FONT}; }
      .aq-shelf-head small { font: 700 12px ${FONT}; color: #b9c8ff; margin-left: 6px; }
      .aq-close { font: 900 14px ${FONT}; padding: 6px 12px; border-radius: 999px; border: 0; cursor: pointer; }
      .aq-cards { display: flex; gap: 8px; overflow-x: auto; padding: 2px 12px 4px; scroll-snap-type: x proximity; touch-action: pan-x; }
      .aq-card { flex: 0 0 136px; scroll-snap-align: start; border-radius: 14px; border: 2px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.07);
        color: #fff; padding: 6px 7px 7px; text-align: left; cursor: pointer; font-family: ${FONT}; display: flex; flex-direction: column; gap: 2px; }
      .aq-card:hover, .aq-card.sel { border-color: var(--aqua, #3fe0d0); background: rgba(63,224,208,0.14); }
      .aq-card:focus-visible { outline: 3px solid var(--aqua, #3fe0d0); outline-offset: 1px; }
      .aq-card canvas { width: 120px; height: 56px; align-self: center; }
      .aq-card b { font: 900 14px ${FONT}; }
      .aq-card .tr { font: 700 11px ${FONT}; color: #ffe8a3; line-height: 1.2; min-height: 2.4em; }
      .aq-card .row { display: flex; align-items: center; gap: 2px; font: 800 10px ${FONT}; color: #cfd8ff; min-height: 18px; flex-wrap: wrap; }
      .aq-card .row span.l { width: 30px; flex: none; }
      .aq-card .row canvas { width: 26px; height: 15px; align-self: center; }
      .aq-card .row.no { color: #8ff0b0; }
      .aq-card .row.fear { color: #ffb0b0; }
    `;
    const wrap = document.createElement('div');
    wrap.className = 'aq-wrap';
    const canvas = document.createElement('canvas');
    canvas.className = 'g-canvas';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Aquarium. Tap the water to feed the fish, drag a fish to move it, drop it on the bin to take it out.');
    const bar = document.createElement('div');
    bar.className = 'aq-bar';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn aqua aq-add';
    addBtn.textContent = '+ Add fish';
    const countEl = document.createElement('span');
    countEl.className = 'aq-count';
    bar.append(addBtn, countEl);
    const shelf = document.createElement('div');
    shelf.className = 'aq-shelf';
    shelf.hidden = true;
    const head = document.createElement('div');
    head.className = 'aq-shelf-head';
    const headTitle = document.createElement('span');
    headTitle.textContent = 'Add a fish';
    const headHint = document.createElement('small');
    headHint.textContent = 'tap one to drop it in';
    headTitle.append(headHint);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn ghost aq-close';
    closeBtn.textContent = 'Done';
    head.append(headTitle, closeBtn);
    const cards = document.createElement('div');
    cards.className = 'aq-cards';
    shelf.append(head, cards);
    wrap.append(canvas, bar, shelf);
    api.el.append(style, wrap);
    const ctx = canvas.getContext('2d');

    const myId = api.me.id;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 1, h = 1, dpr = 1, s = 1, y0 = 0, halfW = 1;
    let bgCache = null;
    let raf = 0, last = performance.now(), clock = 0, destroyed = false;

    // The tank: the owner runs `tank`; everyone draws `view` (id -> fish as
    // drawn), which for the owner follows the simulation exactly.
    let tank = null;
    let wasOwner = false;
    const view = new Map();
    let flakes = [];
    let lastEv = -1;
    let primed = false;             // seen the tank once (older events stay quiet)
    let recvAt = performance.now();
    let lastSharedSig = '';
    let tankState = null;           // the last tank I saw (to take over from)
    let holds = new Map();
    let lastPub = 0, pubDirty = true;
    // Effects (world coordinates).
    const parts = [];
    const ghosts = [];
    const chomps = new Map();       // fish id -> s left of the chomp
    const pokes = new Map();        // fish id -> s left of a fight wiggle
    let binWobble = 0;
    // Input.
    let hold = null;                // { id, x, y, px, py, pointer } a fish I'm holding
    let press = null;               // { x, y, t, pointer } a press on the water (a tap feeds)
    const pendingBin = new Map();   // id -> ms: hide while the owner removes it
    let lastDragSent = 0;
    let cursor = null;              // { x, y } controller / keyboard cursor (world)
    let sel = 0;                    // picker selection for the controller
    let padPrev = {};
    const keys = new Set();
    const addTimes = new Map();     // owner: player id -> recent add times (rate limit)
    let hintUntil = performance.now() + 9000;
    let botGrab = null;

    // --- layout ------------------------------------------------------------
    function resize() {
      const r = api.el.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      s = Math.max(h / 100, w / (2 * XW));
      const viewH = h / s;
      y0 = viewH >= 100 ? 0 : 50 - viewH / 2 + Math.min(4, (100 - viewH) / 2);
      halfW = w / (2 * s);
      bgCache = null;
    }
    const ro = new ResizeObserver(resize);
    ro.observe(api.el);
    resize();
    const sx = x => w / 2 + x * s;
    const sy = y => (y - y0) * s;
    const wx = px => (px - w / 2) / s;
    const wy = py => py / s + y0;
    function binRect() {
      const size = Math.round(clamp(Math.min(w, h) * 0.13, 46, 70));
      const shelfH = shelf.hidden ? 0 : shelf.getBoundingClientRect().height;
      return { x: w - size - 12, y: h - size - 12 - shelfH, w: size, h: size };
    }
    const overBin = (px, py) => {
      const b = binRect();
      const pad = 10;
      return px > b.x - pad && px < b.x + b.w + pad && py > b.y - pad && py < b.y + b.h + pad;
    };

    // --- shared state ------------------------------------------------------
    function present() {
      return new Set(api.players().map(p => p.id));
    }
    function syncFromShared() {
      const sh = api.shared();
      const sig = sh ? JSON.stringify(sh) : '';
      if (sig === lastSharedSig) return;
      lastSharedSig = sig;
      const st = readShared(sh);
      if (!st) return;
      recvAt = performance.now();
      const ids = new Set();
      for (const f of st.fish) {
        ids.add(f.id);
        let v = view.get(f.id);
        if (!v) {
          v = { id: f.id, sp: f.sp, dx: f.x, dy: f.y, wob: Math.random() * 6 };
          view.set(f.id, v);
        }
        Object.assign(v, { sp: f.sp, x: f.x, y: f.y, vx: f.vx, vy: f.vy, hunger: f.hunger, mode: f.mode, face: f.face });
        v.held = st.holds.get(f.id) ?? null;
      }
      for (const id of [...view.keys()]) if (!ids.has(id)) view.delete(id);
      flakes = st.flakes;
      holds = st.holds;
      // A fish I'm holding that someone else got first: let go.
      if (hold && holds.get(hold.id) && holds.get(hold.id) !== myId && performance.now() - hold.t0 > 500) hold = null;
      if (hold && !ids.has(hold.id)) hold = null;
      handleEvents(st.events, !primed);
      primed = true;
      if (!tank) tankState = st;
    }

    function handleEvents(events, quiet) {
      for (const e of events) {
        if (e.id <= lastEv) continue;
        lastEv = Math.max(lastEv, e.id);
        if (quiet) continue;
        playEvent(e);
      }
    }

    function becomeOwner() {
      // Pick up the simulation from what I last saw.
      const st = readShared(api.shared()) || tankState;
      tank = Tank.load(st);
      if (st) for (const f of tank.fish) {
        const v = view.get(f.id);
        if (v) { f.x = v.dx; f.y = v.dy; }
      }
      if (!st || !st.fish.length) {
        // A fresh tank gets a few friendly fish to start.
        for (const [sp, n] of [['guppy', 4], ['tetra', 4], ['clown', 1], ['puffer', 1], ['catfish', 1], ['angel', 1]]) {
          for (let i = 0; i < n; i++) {
            const f = tank.make(sp, rnd(-STAGE, STAGE), rnd(25, 75));
            if (SP[sp].bottom) f.y = 88;
            if (SP[sp].home) { f.x = ANEMONE_X + rnd(-5, 5); f.y = 80; }
            f.hunger = rnd(0, 0.25);
          }
        }
      }
      tank.nextEv = Math.max(tank.nextEv, lastEv + 1);
      tank.release(present());
      pubDirty = true;
      publish(true);
    }

    function publish(force = false) {
      if (!tank) return;
      const now = performance.now();
      if (!force && now - lastPub < PUBLISH_MS) return;
      lastPub = now;
      pubDirty = false;
      const out = tank.pack();
      api.setShared(out);
    }

    // Owner: the simulation follows the tank; the view mirrors it.
    function mirrorTank() {
      const ids = new Set();
      for (const f of tank.fish) {
        ids.add(f.id);
        let v = view.get(f.id);
        if (!v) { v = { id: f.id, wob: Math.random() * 6 }; view.set(f.id, v); }
        Object.assign(v, { sp: f.sp, x: f.x, y: f.y, vx: f.vx, vy: f.vy, dx: f.x, dy: f.y, hunger: f.hunger,
          mode: f.puff > 0 && SP[f.sp].puffs ? M.puff : f.mode, face: f.face, held: f.held });
      }
      for (const id of [...view.keys()]) if (!ids.has(id)) view.delete(id);
      flakes = tank.flakes;
      holds = new Map(tank.fish.filter(f => f.held).map(f => [f.id, f.held]));
      const fresh = tank.events.filter(e => e.id > lastEv);
      if (fresh.length) handleEvents(fresh, false);
    }

    // --- actions (owner applies; others send) ---------------------------------
    function apply(type, d, from) {
      if (!tank || !d || typeof d !== 'object') return;
      if (!present().has(from)) return;
      const id = Math.floor(num(d.id, -1));
      const x = clamp(num(d.x), -XW, XW), y = clamp(num(d.y, 50), 0, SAND);
      if (type === 'add') {
        if (typeof d.sp !== 'string' || !SP[d.sp]) return;
        const now = performance.now();
        const times = (addTimes.get(from) || []).filter(t => now - t < 2000);
        if (times.length >= 4) return;
        times.push(now);
        addTimes.set(from, times);
        if (tank.fish.length >= MAX_FISH) { if (from === myId) api.toast('The tank is full!'); return; }
        tank.add(d.sp, Number.isFinite(d.x) ? clamp(d.x, -STAGE, STAGE) : undefined);
      } else if (type === 'feed') {
        tank.feed(x, y);
      } else if (type === 'grab') {
        tank.grab(id, from);
      } else if (type === 'drag') {
        tank.drag(id, x, y, from);
      } else if (type === 'drop') {
        tank.drop(id, x, y, from);
      } else if (type === 'bin') {
        tank.bin(id, from);
      } else return;
      pubDirty = true;
      if (type !== 'drag') publish(true);
    }
    function act(type, d) {
      if (api.isOwner() && tank) apply(type, d, myId);
      else api.send(type, d);
    }
    for (const t of ['add', 'feed', 'grab', 'drag', 'drop', 'bin']) api.on(t, (d, from) => { if (api.isOwner()) apply(t, d, from); });

    function addFish(sp) {
      if (view.size >= MAX_FISH) { api.toast('The tank is full! Bin a fish to make room.'); return; }
      act('add', { sp, x: clamp(rnd(-halfW * 0.7, halfW * 0.7), -STAGE, STAGE) });
    }
    function feedAt(x, y) {
      act('feed', { x, y });
      // Show my flakes at once; the owner's arrive a moment later.
      if (!api.isOwner()) for (let i = 0; i < 5; i++) parts.push({ k: 'flake', x: x + rnd(-2.5, 2.5), y: y + rnd(-1.5, 1.5), vx: 0, vy: 2.6, life: 0.35, max: 0.35, c: pick(FLAKE_COLORS) });
      softSfx('drip', 0.15);
    }

    // --- drawing helpers ---------------------------------------------------
    function fishSprite(sp, variant) {
      const art = api.img(`aq-${sp}`);
      if (art) return { img: art, art: true };
      return { img: standIn(sp, variant), art: false };
    }
    // Draws a fish centred at screen (px, py), lenPx long.
    function drawFish(c, sp, px, py, lenPx, face, opts = {}) {
      const { img, art } = fishSprite(sp, opts.puffed ? 'puff' : opts.open ? 'open' : '');
      c.save();
      c.translate(px, py);
      if (opts.tilt) c.rotate(opts.tilt * face);
      let kx = 1, ky = 1;
      if (opts.puffed && art) { kx = 1.25; ky = 1.6; }
      if (opts.squash) { kx *= 1 + opts.squash * 0.18; ky *= 1 - opts.squash * 0.12; }
      if (opts.wag) ky *= 1 + opts.wag;
      c.scale(face * kx, ky);
      if (opts.alpha != null) c.globalAlpha *= opts.alpha;
      let dw, dh;
      if (art) {
        dw = lenPx * 1.05;
        dh = dw * (img.naturalHeight || img.height) / (img.naturalWidth || img.width);
      } else {
        dw = lenPx * 1.3;
        dh = lenPx * 1.2;
      }
      c.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      c.restore();
    }

    const FLAKE_COLORS = ['#ff9a3c', '#ffd43b', '#ff6b6b', '#8ce99a'];
    function drawBackground() {
      const art = api.img('aq-tank');
      if (bgCache && bgCache.art === !!art && bgCache.w === canvas.width && bgCache.h === canvas.height) {
        ctx.drawImage(bgCache.cv, 0, 0, w, h);
        return;
      }
      const cv = document.createElement('canvas');
      cv.width = canvas.width;
      cv.height = canvas.height;
      const c = cv.getContext('2d');
      c.scale(dpr, dpr);
      if (art) {
        const th = 100 * s;
        const tw = th * art.width / art.height;
        const left = sx(-XW);
        // The delivered picture's two ends don't match, so every other copy
        // is mirrored: neighbouring edges are then the same column and meet cleanly.
        const n0 = -Math.ceil(left / tw + 1);
        for (let n = n0, x = left + n0 * tw; x < w; n++, x += tw) {
          if (n % 2 === 0) { c.drawImage(art, x, sy(0), tw, th); continue; }
          c.save();
          c.translate(x + tw, 0);
          c.scale(-1, 1);
          c.drawImage(art, 0, sy(0), tw, th);
          c.restore();
        }
      } else {
        const g = c.createLinearGradient(0, sy(0), 0, sy(100));
        g.addColorStop(0, '#5fe3f0');
        g.addColorStop(0.35, '#1fa9d6');
        g.addColorStop(0.75, '#0f6aa8');
        g.addColorStop(1, '#0b4f7a');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        // light rays from the surface
        c.globalCompositeOperation = 'lighter';
        for (let i = -6; i <= 6; i++) {
          const x = sx(i * 32 + 8);
          const rg = c.createLinearGradient(0, sy(0), 0, sy(80));
          rg.addColorStop(0, 'rgba(255,255,230,0.16)');
          rg.addColorStop(1, 'rgba(255,255,230,0)');
          c.fillStyle = rg;
          c.beginPath();
          c.moveTo(x - 6 * s, sy(0));
          c.lineTo(x + 6 * s, sy(0));
          c.lineTo(x + 26 * s, sy(85));
          c.lineTo(x + 8 * s, sy(85));
          c.fill();
        }
        c.globalCompositeOperation = 'source-over';
        // the surface line
        c.fillStyle = 'rgba(255,255,255,0.35)';
        c.fillRect(0, sy(0), w, Math.max(2, s * 0.8));
        // distant rocks
        c.fillStyle = 'rgba(10,60,110,0.55)';
        for (let i = -XW; i < XW; i += 23) {
          const rx = sx(i + ((i * 7) % 11)), ry = sy(SAND - 1);
          ell(c, rx, ry, s * (6 + (i % 5)), s * (4 + (i % 3)));
          c.fill();
        }
        // sand with pebbles
        const sg = c.createLinearGradient(0, sy(SAND - 2), 0, sy(100));
        sg.addColorStop(0, '#f7dc9a');
        sg.addColorStop(1, '#d9ae62');
        c.fillStyle = sg;
        c.beginPath();
        c.moveTo(0, h);
        for (let px = 0; px <= w + 10; px += 10) c.lineTo(px, sy(SAND - 1 + Math.sin(wx(px) * 0.12) * 0.8));
        c.lineTo(w, h);
        c.closePath();
        c.fill();
        const pc = ['#ff8fab', '#9775fa', '#4dabf7', '#ffd43b', '#ffffff', '#69db7c'];
        for (let i = 0; i < 160; i++) {
          const x = -XW + ((i * 97.13) % (2 * XW));
          const y = SAND + 1 + ((i * 31.7) % 8);
          ell(c, sx(x), sy(y), s * 0.7, s * 0.45);
          c.fillStyle = pc[i % pc.length];
          c.globalAlpha = 0.75;
          c.fill();
        }
        c.globalAlpha = 1;
        // a treasure chest that bubbles
        const cx0 = sx(CHEST_X), cy0 = sy(SAND);
        c.save();
        c.translate(cx0, cy0);
        c.scale(s, s);
        c.fillStyle = '#8a4b1f';
        c.strokeStyle = '#3d1f08';
        c.lineWidth = 0.5;
        c.beginPath(); c.roundRect(-5, -5, 10, 5.5, 0.8); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(-5, -5); c.quadraticCurveTo(0, -9.5, 5, -5); c.closePath(); c.fillStyle = '#a65d27'; c.fill(); c.stroke();
        c.fillStyle = '#ffd43b';
        c.fillRect(-0.9, -6, 1.8, 3);
        c.fillRect(-5, -5.3, 10, 0.7);
        c.restore();
      }
      bgCache = { cv, w: canvas.width, h: canvas.height, art: !!art };
      ctx.drawImage(cv, 0, 0, w, h);
    }

    function drawPlants(front) {
      // With the painted tank, its own plants stand behind the fish; only the
      // front clumps (that shy fish hide in) are drawn, shaded to match it.
      const painted = !!api.img('aq-tank');
      if (painted && !front) return;
      for (let i = 0; i < PLANTS.length; i++) {
        const p = PLANTS[i];
        if ((i % 2 === 0) !== front) continue;
        if (Math.abs(p.x) > halfW + 15) continue;
        for (let k = 0; k < p.n; k++) {
          const bx = p.x + (k - p.n / 2) * (painted ? 2 : 1.6);
          const hgt = p.h * (0.65 + ((k * 37) % 10) / 28);
          const sway = Math.sin(clock * 1.3 + k + i) * 2.2;
          const hw = painted ? 1.5 : 0.9;
          ctx.beginPath();
          ctx.moveTo(sx(bx - hw), sy(SAND));
          ctx.bezierCurveTo(sx(bx - hw * 1.3), sy(SAND - hgt * 0.4), sx(bx + sway * 0.6 - hw), sy(SAND - hgt * 0.75), sx(bx + sway), sy(SAND - hgt));
          ctx.bezierCurveTo(sx(bx + sway * 0.6 + hw * 1.2), sy(SAND - hgt * 0.7), sx(bx + hw * 1.4), sy(SAND - hgt * 0.4), sx(bx + hw), sy(SAND));
          ctx.closePath();
          if (painted) {
            const g = ctx.createLinearGradient(0, sy(SAND), 0, sy(SAND - hgt));
            g.addColorStop(0, '#1d6b2e');
            g.addColorStop(0.55, k % 2 ? '#3fae3a' : '#52c041');
            g.addColorStop(1, '#a6e05a');
            ctx.fillStyle = g;
          } else ctx.fillStyle = k % 2 ? '#2fbf71' : '#51cf66';
          ctx.globalAlpha = front ? 0.9 : 1;
          ctx.fill();
          ctx.strokeStyle = painted ? '#174f22' : '#1b7a45';
          ctx.lineWidth = Math.max(1, s * (painted ? 0.18 : 0.25));
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
    }

    function drawAnemone() {
      if (Math.abs(ANEMONE_X) > halfW + 12) return;
      const bx = sx(ANEMONE_X), by = sy(SAND);
      ell(ctx, bx, by - s * 1.2, s * 4.5, s * 2);
      ctx.fillStyle = '#c2255c';
      ctx.fill();
      for (let k = 0; k < 13; k++) {
        const a = -Math.PI + (k / 12) * Math.PI;
        const sway = Math.sin(clock * 2 + k * 0.7) * 0.25;
        const len = s * (6 + (k % 3));
        const tx = bx + Math.cos(a + sway) * len, ty = by - s * 2 + Math.sin(a + sway) * len * 0.9;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(a) * s * 3, by - s * 2);
        ctx.quadraticCurveTo((bx + tx) / 2 + sway * s * 3, (by + ty) / 2 - s * 2, tx, ty);
        ctx.strokeStyle = '#ff8cc6';
        ctx.lineWidth = s * 1.2;
        ctx.lineCap = 'round';
        ctx.stroke();
        ell(ctx, tx, ty, s * 0.75, s * 0.75);
        ctx.fillStyle = '#ffc9e3';
        ctx.fill();
      }
    }

    function drawBin(active) {
      const b = binRect();
      const wob = Math.sin(binWobble * 30) * binWobble * 0.4;
      ctx.save();
      ctx.translate(b.x + b.w / 2, b.y + b.h);
      ctx.rotate(wob);
      const bw = b.w * 0.72, bh = b.h * 0.72;
      ctx.fillStyle = active ? 'rgba(255,95,162,0.35)' : 'rgba(8,30,60,0.35)';
      ell(ctx, 0, -bh / 2, b.w * 0.62, b.h * 0.62);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-bw / 2, -bh * 0.82);
      ctx.lineTo(bw / 2, -bh * 0.82);
      ctx.lineTo(bw * 0.4, -bh * 0.08);
      ctx.lineTo(-bw * 0.4, -bh * 0.08);
      ctx.closePath();
      ctx.fillStyle = active ? '#ff5fa2' : '#8fa3bf';
      ctx.strokeStyle = '#1d2a44';
      ctx.lineWidth = 2.5;
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(29,42,68,0.6)';
      ctx.lineWidth = 2;
      for (const k of [-0.2, 0, 0.2]) { ctx.beginPath(); ctx.moveTo(bw * k, -bh * 0.7); ctx.lineTo(bw * k * 0.85, -bh * 0.18); ctx.stroke(); }
      // the lid opens while a fish is over it
      ctx.save();
      ctx.translate(-bw * 0.55, -bh * 0.86);
      ctx.rotate(active ? -0.7 : 0);
      ctx.fillStyle = active ? '#ff86b9' : '#a9bbd3';
      ctx.strokeStyle = '#1d2a44';
      ctx.beginPath();
      ctx.roundRect(0, -bh * 0.1, bw * 1.1, bh * 0.12, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(bw * 0.45, -bh * 0.2, bw * 0.2, bh * 0.1);
      ctx.restore();
      ctx.restore();
    }

    function hungerColor(hg) {
      return hg > 0.8 ? '#ff4d5e' : hg > 0.6 ? '#ff9f1c' : '#ffd43b';
    }

    // --- events (sounds and effects) --------------------------------------------
    function bubbles(x, y, n, spread = 3) {
      if (reduced) n = Math.ceil(n / 3);
      for (let i = 0; i < n; i++) parts.push({ k: 'bub', x: x + rnd(-spread, spread), y: y + rnd(-spread, spread) * 0.6, vx: rnd(-2, 2), vy: rnd(-12, -5), r: rnd(0.4, 1.3), life: rnd(0.8, 1.6), max: 1.6 });
    }
    const lastDrawn = new Map();
    // Quiet underwater sounds, and never a burst of them: each kind plays at
    // most every so often, so a crowded tank murmurs rather than clatters.
    const soundAt = {};
    function softSfx(name, gap = 0.35) {
      const now = performance.now() / 1000;
      if (now - (soundAt[name] ?? -9) < gap) return;
      soundAt[name] = now;
      api.sfx(name);
    }
    const evCount = { 1: 0, 2: 0, 3: 0, 4: 0 };
    function playEvent(e) {
      evCount[e.k]++;
      const onScreen = Math.abs(e.x) < halfW + 10;
      if (e.k === EV.eat) {
        const eater = view.get(e.a);
        const prey = lastDrawn.get(e.b);
        const sp = SPECIES[e.s].id;
        ghosts.push({ sp, x: prey?.x ?? e.x, y: prey?.y ?? e.y, face: prey?.face ?? 1, eater: e.a, life: 0.35, max: 0.35 });
        chomps.set(e.a, 0.6);
        setTimeout(() => {
          const ex = eater ? eater.dx + (eater.face || 1) * SP[eater.sp].len * 0.45 : e.x;
          const ey = eater ? eater.dy : e.y;
          bubbles(ex, ey, 10, 2);
        }, 300);
        if (onScreen) softSfx('gulp');
      } else if (e.k === EV.fight) {
        pokes.set(e.a, 1.1);
        pokes.set(e.b, 1.1);
        bubbles(e.x, e.y, 4, 1.5);
        if (onScreen) softSfx('nudge');
      } else if (e.k === EV.add) {
        bubbles(e.x, 4, 12, 4);
        parts.push({ k: 'ring', x: e.x, y: 0.5, r: 1, life: 0.6, max: 0.6 });
        if (onScreen) softSfx('bubble');
      } else if (e.k === EV.bin) {
        binWobble = 0.6;
        softSfx('swish');
      }
    }

    // --- frame -------------------------------------------------------------
    function step(dt) {
      clock += dt;
      if (api.isOwner()) {
        if (!wasOwner || !tank) { wasOwner = true; becomeOwner(); }
        tank.release(present());
        // Keep the fish I'm holding where my finger is.
        if (hold) tank.drag(hold.id, hold.x, hold.y, myId);
        let left = Math.min(dt, 0.5);
        while (left > 1e-4) { const d = Math.min(left, 1 / 30); tank.step(d); left -= d; }
        mirrorTank();
        publish();
      } else {
        if (wasOwner) { wasOwner = false; tank = null; }
        syncFromShared();
        // Dead reckoning: each fish goes on where it was heading, eased.
        const age = Math.min(0.5, (performance.now() - recvAt) / 1000);
        const k = 1 - Math.exp(-8 * dt);
        for (const v of view.values()) {
          const tx = v.x + v.vx * age, ty = v.y + v.vy * age;
          if (Math.abs(tx - v.dx) > 40) { v.dx = tx; v.dy = ty; }
          v.dx += (tx - v.dx) * k;
          v.dy += (ty - v.dy) * k;
        }
      }
      if (hold) {
        const v = view.get(hold.id);
        if (v) { v.dx = hold.x; v.dy = hold.y; }
        const now = performance.now();
        if (!api.isOwner() && now - lastDragSent > 70 && hold.moved) {
          lastDragSent = now;
          hold.moved = false;
          api.send('drag', { id: hold.id, x: r1(hold.x), y: r1(hold.y) });
        }
      }
      // effects
      for (const p of parts) {
        p.life -= dt;
        p.x += (p.vx ?? 0) * dt;
        p.y += (p.vy ?? 0) * dt;
        if (p.k === 'star') { p.vx *= 0.92; p.vy *= 0.92; }
        if (p.k === 'ring') p.r += dt * 18;
      }
      for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0 || parts[i].y < -2) parts.splice(i, 1);
      for (const g of ghosts) g.life -= dt;
      for (let i = ghosts.length - 1; i >= 0; i--) if (ghosts[i].life <= 0) ghosts.splice(i, 1);
      for (const m of [chomps, pokes]) for (const [id, t] of m) { if (t - dt <= 0) m.delete(id); else m.set(id, t - dt); }
      binWobble = Math.max(0, binWobble - dt);
      for (const [id, t] of pendingBin) if (performance.now() - t > 1500) pendingBin.delete(id);
      // ambient bubbles from the chest
      if (Math.random() < dt * 2.5 && Math.abs(CHEST_X) < halfW) parts.push({ k: 'bub', x: CHEST_X + rnd(-0.5, 0.5), y: SAND - 5, vx: rnd(-0.5, 0.5), vy: rnd(-9, -6), r: rnd(0.4, 1), life: 4, max: 4 });
      // controller cursor
      padMove(dt);
    }
    const r1 = v => Math.round(v * 10) / 10;

    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackground();
      drawPlants(false);
      drawAnemone();
      // flakes
      for (const fl of flakes) {
        if (Math.abs(fl.x) > halfW + 2) continue;
        ctx.save();
        ctx.translate(sx(fl.x), sy(fl.y));
        ctx.rotate((fl.id * 1.7 + clock * (fl.y < SAND - 0.5 ? 2 : 0)) % 6.28);
        ctx.fillStyle = FLAKE_COLORS[fl.id % FLAKE_COLORS.length];
        const fs = Math.max(3, s * 0.9);
        ctx.fillRect(-fs / 2, -fs / 3, fs, fs * 0.66);
        ctx.restore();
      }
      for (const p of parts) if (p.k === 'flake') {
        ctx.fillStyle = p.c;
        const fs = Math.max(3, s * 0.9);
        ctx.fillRect(sx(p.x) - fs / 2, sy(p.y) - fs / 3, fs, fs * 0.66);
      }
      // fish, biggest first so the little ones show on top
      const list = [...view.values()].filter(v => !pendingBin.has(v.id)).sort((a, b) => SP[b.sp].len - SP[a.sp].len || a.id - b.id);
      lastDrawn.clear();
      const heldIds = new Set();
      for (const v of list) {
        const sp = SP[v.sp];
        lastDrawn.set(v.id, { x: v.dx, y: v.dy, face: v.face });
        const lenPx = sp.len * s;
        if (Math.abs(v.dx) > halfW + sp.len * 0.6) continue;
        if (v.held || hold?.id === v.id) { heldIds.add(v.id); continue; }
        drawOne(v, lenPx);
      }
      drawPlants(true);
      // held fish on top of everything
      for (const v of list) if (heldIds.has(v.id)) drawOne(v, SP[v.sp].len * s * 1.15);
      // eaten fish shrinking into the hunter's mouth
      for (const g of ghosts) {
        const e = view.get(g.eater);
        const k = 1 - g.life / g.max;
        const tx = e ? e.dx + (e.face || 1) * SP[e.sp].len * 0.4 : g.x;
        const ty = e ? e.dy : g.y;
        const x = g.x + (tx - g.x) * k, y = g.y + (ty - g.y) * k;
        drawFish(ctx, g.sp, sx(x), sy(y), SP[g.sp].len * s * (1 - k * 0.8), g.face, { alpha: 1 - k * 0.6 });
      }
      // bubbles, stars, rings
      for (const p of parts) {
        if (p.k === 'flake') continue;
        const a = clamp(p.life / p.max, 0, 1);
        if (p.k === 'bub') {
          ell(ctx, sx(p.x + Math.sin(clock * 3 + p.r * 9) * 0.4), sy(p.y), p.r * s, p.r * s);
          ctx.strokeStyle = `rgba(255,255,255,${0.75 * Math.min(1, a * 2)})`;
          ctx.lineWidth = Math.max(1, s * 0.22);
          ctx.stroke();
          ctx.fillStyle = `rgba(255,255,255,${0.18 * a})`;
          ctx.fill();
        } else if (p.k === 'star') {
          ctx.save();
          ctx.translate(sx(p.x), sy(p.y));
          ctx.rotate(clock * 6);
          ctx.globalAlpha = a;
          ctx.fillStyle = p.c;
          starPath(ctx, p.r * s);
          ctx.fill();
          ctx.restore();
        } else if (p.k === 'ring') {
          ell(ctx, sx(p.x), sy(p.y), p.r * s, p.r * s * 0.3);
          ctx.strokeStyle = `rgba(255,255,255,${a})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      // the bin (its lid opens while a fish is over it)
      const overNow = hold && overBin(sx(hold.x), sy(hold.y));
      drawBin(!!overNow);
      // the controller cursor
      if (cursor) {
        const cx = sx(cursor.x), cy = sy(cursor.y);
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.strokeStyle = api.me.color || '#fff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.moveTo(cx, cy - 6); ctx.lineTo(cx, cy + 6);
        ctx.stroke();
      }
      // Only a first-time hint; crowding shows in the fish themselves.
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      if (performance.now() < hintUntil) {
        ctx.font = `800 ${Math.round(clamp(w * 0.034, 12, 15))}px ${FONT}`;
        const t = 'Tap the water to feed · drag a fish to move it';
        const tw = ctx.measureText(t).width + 20;
        ctx.globalAlpha = clamp((hintUntil - performance.now()) / 1500, 0, 1);
        ctx.fillStyle = 'rgba(8,30,60,0.6)';
        ctx.beginPath(); ctx.roundRect(w / 2 - tw / 2, 8, tw, 24, 12); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.fillText(t, w / 2, 12);
        ctx.globalAlpha = 1;
      }
      const label = `🐟 ${view.size}${view.size >= MAX_FISH ? ' (full)' : ''}`;
      if (countEl.textContent !== label) countEl.textContent = label;
    }

    function drawOne(v, lenPx) {
      const sp = SP[v.sp];
      const px = sx(v.dx), py = sy(v.dy);
      const chomp = chomps.get(v.id) || 0;
      const poke = pokes.get(v.id) || 0;
      const held = v.held || hold?.id === v.id;
      const open = chomp > 0.25 || (v.mode === M.hunt || v.mode === M.lunge) && Math.sin(clock * 10) > 0.6;
      const swim = Math.hypot(v.vx || 0, v.vy || 0);
      const wag = reduced ? 0 : Math.sin(clock * (6 + swim) + v.wob) * 0.04;
      let tilt = clamp((v.vy || 0) / Math.max(4, Math.abs(v.vx || 0) + 4), -0.45, 0.45);
      if (held) tilt = Math.sin(clock * 12) * 0.25;
      const jx = poke ? Math.sin(clock * 50 + v.id) * s * 0.6 : 0;
      // a soft shadow on the sand
      if (!held && v.dy > 60) {
        ell(ctx, px, sy(SAND + 0.5), lenPx * 0.35, lenPx * 0.07);
        ctx.fillStyle = 'rgba(60,40,10,0.18)';
        ctx.fill();
      }
      if (held) {
        ell(ctx, px, py, lenPx * 0.7, lenPx * 0.55);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fill();
      }
      drawFish(ctx, v.sp, px + jx, py, lenPx, v.face || 1, {
        open, puffed: sp.puffs && (v.mode === M.puff || held), squash: chomp > 0 ? Math.sin(chomp * 16) * 0.6 : 0, wag, tilt,
      });
      // No bars, bubbles or marks over the fish: the tank is to watch, and
      // hunger and fear show in how they swim.
    }

    function starPath(c, r) {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r * 0.45 : r;
        c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      c.closePath();
    }

    function frame(now) {
      if (destroyed) return;
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      step(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }
    // A hidden tab gets no frames: the owner keeps the tank running.
    const ownerTimer = setInterval(() => {
      if (!document.hidden || destroyed) return;
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      step(dt);
    }, 250);

    // --- pointer input -----------------------------------------------------
    function fishAt(x, y, slop) {
      let best = null, bd = 1e9;
      for (const v of view.values()) {
        if (pendingBin.has(v.id)) continue;
        if (v.held && v.held !== myId) continue;
        const sp = SP[v.sp];
        const d = Math.hypot((v.dx - x) * 0.8, v.dy - y);
        const r = sp.len * 0.55 + slop;
        if (d < r && d - sp.len * 0.2 < bd) { best = v; bd = d - sp.len * 0.2; }
      }
      return best;
    }
    function local(e) {
      const r = canvas.getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    }
    function startHold(v, x, y) {
      hold = { id: v.id, x, y, t0: performance.now(), moved: false, offX: v.dx - x, offY: v.dy - y };
      hold.x = v.dx;
      hold.y = v.dy;
      act('grab', { id: v.id });
      softSfx('bubble', 0.1);
    }
    function moveHold(x, y) {
      if (!hold) return;
      hold.x = clamp(x + hold.offX, -halfW - 4, halfW + 4);
      hold.y = clamp(y + hold.offY, 2, SAND);
      hold.moved = true;
    }
    function endHold() {
      if (!hold) return;
      const h0 = hold;
      hold = null;
      if (overBin(sx(h0.x), sy(h0.y))) {
        pendingBin.set(h0.id, performance.now());
        act('bin', { id: h0.id });
        binWobble = 0.6;
      } else {
        act('drop', { id: h0.id, x: r1(h0.x), y: r1(h0.y) });
      }
    }
    canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      const { px, py } = local(e);
      const x = wx(px), y = wy(py);
      hintUntil = Math.min(hintUntil, performance.now() + 2500);
      const slop = e.pointerType === 'touch' ? 26 / s : 10 / s;
      const v = fishAt(x, y, slop);
      try { canvas.setPointerCapture(e.pointerId); } catch {}
      if (v) {
        startHold(v, x, y);
        hold.pointer = e.pointerId;
      } else {
        press = { px, py, x, y, t: performance.now(), pointer: e.pointerId };
      }
    });
    canvas.addEventListener('pointermove', e => {
      const { px, py } = local(e);
      if (hold && (hold.pointer == null || hold.pointer === e.pointerId)) moveHold(wx(px), wy(py));
      else if (press && Math.hypot(px - press.px, py - press.py) > 14) press.moved = true;
    });
    const up = e => {
      const { px, py } = local(e);
      if (hold && (hold.pointer == null || hold.pointer === e.pointerId)) {
        moveHold(wx(px), wy(py));
        endHold();
      } else if (press && press.pointer === e.pointerId) {
        if (!press.moved && e.type === 'pointerup' && !overBin(px, py)) feedAt(r1(press.x), r1(clamp(press.y, 2, SAND - 1)));
        press = null;
      }
    };
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);

    // --- the picker ----------------------------------------------------------
    function mini(sp, wpx, hpx) {
      const cv = document.createElement('canvas');
      cv.width = wpx * 2;
      cv.height = hpx * 2;
      const c = cv.getContext('2d');
      const lenPx = Math.min(cv.width / 1.3, cv.height / (sp === 'angel' || sp === 'lionfish' ? 1.1 : 0.75));
      drawFish(c, sp, cv.width / 2, cv.height / 2, lenPx, 1);
      cv.dataset.sp = sp;
      return cv;
    }
    const cardEls = [];
    function buildCards() {
      cards.textContent = '';
      cardEls.length = 0;
      SPECIES.forEach((sp, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'aq-card';
        b.dataset.sp = sp.id;
        const name = document.createElement('b');
        name.textContent = `${i < 9 ? i + 1 : 0}. ${sp.name}`;
        const tr = document.createElement('div');
        tr.className = 'tr';
        tr.textContent = sp.trait;
        const eats = document.createElement('div');
        eats.className = 'row';
        const el = document.createElement('span');
        el.className = 'l';
        el.textContent = 'eats';
        eats.append(el);
        if (sp.eats.length) for (const id of sp.eats) eats.append(mini(id, 26, 15));
        else { const t = document.createElement('span'); t.textContent = 'flakes only'; eats.append(t); }
        const fear = document.createElement('div');
        const foes = eatersOf(sp.id);
        fear.className = foes.length ? 'row fear' : 'row no';
        const fl = document.createElement('span');
        fl.className = 'l';
        fl.textContent = foes.length ? 'fears' : '';
        fear.append(fl);
        if (foes.length) for (const id of foes) fear.append(mini(id, 26, 15));
        else { const t = document.createElement('span'); t.textContent = sp.puffs ? 'nobody: it puffs up!' : sp.id === 'lionfish' ? 'nobody: spiky!' : 'nobody!'; fear.append(t); }
        const eaterNames = sp.eats.map(id => SP[id].name).join(', ') || 'flakes only';
        b.title = `${sp.name}: ${sp.trait}. Eats ${eaterNames}. ${foes.length ? `Eaten by ${foes.map(id => SP[id].name).join(', ')}.` : 'Nobody eats it.'}`;
        b.setAttribute('aria-label', b.title);
        b.append(mini(sp.id, 120, 56), name, tr, eats, fear);
        b.addEventListener('click', () => { sel = i; addFish(sp.id); flashCard(b); });
        cards.append(b);
        cardEls.push(b);
      });
    }
    let builtArt = '';
    function artSig() { return SPECIES.map(sp => (api.img(`aq-${sp.id}`) ? 1 : 0)).join(''); }
    function flashCard(b) {
      b.animate?.([{ transform: 'scale(0.92)' }, { transform: 'scale(1)' }], { duration: 180 });
    }
    function openShelf(open = shelf.hidden) {
      if (open && builtArt !== artSig()) { builtArt = artSig(); buildCards(); }
      shelf.hidden = !open;
      bar.hidden = open;
      markSel();
    }
    function markSel() {
      cardEls.forEach((c, i) => c.classList.toggle('sel', i === sel && !!cursor));
    }
    addBtn.addEventListener('click', () => openShelf(true));
    closeBtn.addEventListener('click', () => openShelf(false));

    // --- keys and controller ---------------------------------------------------
    const typing = e => /INPUT|TEXTAREA|SELECT/.test(e.target?.tagName) || e.target?.isContentEditable;
    function primary() {
      if (!cursor) cursor = { x: 0, y: 50 };
      if (!shelf.hidden) { addFish(SPECIES[sel].id); flashCard(cardEls[sel]); return; }
      if (hold) {
        endHold();
        return;
      }
      const v = fishAt(cursor.x, cursor.y, 3);
      if (v) startHold(v, cursor.x, cursor.y);
      else feedAt(r1(cursor.x), r1(clamp(cursor.y, 2, SAND - 1)));
    }
    function moveSel(d) {
      sel = (sel + d + SPECIES.length) % SPECIES.length;
      markSel();
      cardEls[sel]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
    function onKey(e) {
      if (typing(e) || !api.el.isConnected) return;
      const k = e.key;
      if (e.type === 'keyup') { keys.delete(k); return; }
      let used = true;
      if (k.startsWith('Arrow')) {
        if (!shelf.hidden && (k === 'ArrowLeft' || k === 'ArrowRight')) moveSel(k === 'ArrowLeft' ? -1 : 1);
        else { keys.add(k); if (!cursor) cursor = { x: 0, y: 50 }; }
      } else if (k === ' ' || k === 'Enter') {
        if (!e.repeat) primary();
      } else if (/^[0-9]$/.test(k)) {
        const i = k === '0' ? 9 : Number(k) - 1;
        addFish(SPECIES[i].id);
      } else if (k === 'f' || k === 'F') {
        const c = cursor || { x: rnd(-halfW * 0.6, halfW * 0.6), y: 20 };
        feedAt(r1(c.x), r1(c.y));
      } else if (k === '+' || k === 'p' || k === 'P') {
        openShelf();
      } else if (k === 'Escape' && !shelf.hidden) {
        openShelf(false);
      } else used = false;
      if (used) e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    let padVec = { x: 0, y: 0 };
    function padMove(dt) {
      let x = padVec.x, y = padVec.y;
      if (keys.has('ArrowLeft')) x -= 1;
      if (keys.has('ArrowRight')) x += 1;
      if (keys.has('ArrowUp')) y -= 1;
      if (keys.has('ArrowDown')) y += 1;
      if (!x && !y) return;
      if (!cursor) cursor = { x: 0, y: 50 };
      const sp = 55;
      cursor.x = clamp(cursor.x + x * sp * dt, -halfW + 2, halfW - 2);
      cursor.y = clamp(cursor.y + y * sp * dt, 2, SAND);
      if (hold) moveHold(cursor.x - hold.offX, cursor.y - hold.offY);
    }
    function onPad(pad) {
      const dz = v => (Math.abs(v) < 0.2 ? 0 : v);
      const sx0 = dz(pad.x) + (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
      const sy0 = dz(pad.y) + (pad.down ? 1 : 0) - (pad.up ? 1 : 0);
      if (!shelf.hidden) {
        padVec = { x: 0, y: 0 };
        const dir = sx0 > 0.5 ? 1 : sx0 < -0.5 ? -1 : 0;
        if (dir && dir !== padPrev.dir) moveSel(dir);
        padPrev.dir = dir;
      } else {
        padVec = { x: sx0, y: sy0 };
        if ((sx0 || sy0) && !cursor) cursor = { x: 0, y: 50 };
        padPrev.dir = 0;
      }
      if (pad.a) primary();
      if (pad.xBtn) { if (!cursor) cursor = { x: 0, y: 50 }; openShelf(); }
      if (pad.yBtn && shelf.hidden) { const c = cursor || { x: 0, y: 30 }; feedAt(r1(c.x), r1(c.y)); }
    }

    // --- the bot ---------------------------------------------------------------
    // Debug bots (js/rookie.js) call this every 400 ms: add a fish now and then
    // (more when the tank is nearly empty), sprinkle food, and sometimes pick a
    // fish up and put it down somewhere else.
    function rookie() {
      if (!shelf.hidden && Math.random() < 0.5) openShelf(false);
      if (botGrab) {
        if (hold) {
          moveHold(botGrab.x - hold.offX, botGrab.y - hold.offY);
          endHold();
        }
        botGrab = null;
        return;
      }
      const n = view.size;
      const r = Math.random();
      if ((n < 8 && r < 0.4) || r < 0.08) {
        addFish(pick(SPECIES).id);
      } else if (r < 0.45) {
        feedAt(r1(rnd(-halfW * 0.7, halfW * 0.7)), r1(rnd(8, 40)));
      } else if (r < 0.55) {
        const vis = [...view.values()].filter(v => Math.abs(v.dx) < halfW && !v.held);
        const v = vis.length ? pick(vis) : null;
        if (v) {
          startHold(v, v.dx, v.dy);
          botGrab = { x: rnd(-halfW * 0.6, halfW * 0.6), y: rnd(20, 75) };
        }
      }
    }

    syncFromShared();
    raf = requestAnimationFrame(frame);

    return {
      rookie,
      onPad,
      onChange() {
        if (!api.isOwner()) syncFromShared();
        else if (tank) tank.release(present());
      },
      destroy() {
        destroyed = true;
        cancelAnimationFrame(raf);
        clearInterval(ownerTimer);
        ro.disconnect();
        window.removeEventListener('keydown', onKey);
        window.removeEventListener('keyup', onKey);
      },
      // For the tests (test/aquarium-play.mjs).
      _view: () => ({
        owner: api.isOwner(),
        fish: [...view.values()].map(v => ({ id: v.id, sp: v.sp, x: v.dx, y: v.dy, hunger: v.hunger, mode: v.mode, held: v.held || null })),
        flakes: flakes.length,
        halfW, scale: s, y0, w, h,
        bin: binRect(),
        crowd: tank ? tank.crowd() : null,
        lastEv, events: { ...evCount },
      }),
      _toScreen: (x, y) => ({ x: sx(x), y: sy(y) }),
      _tank: () => tank,
      _openShelf: open => openShelf(open),
    };
  },
};

export const _logic = { Tank, SPECIES, SP, readShared, canEat, eatersOf, XW, STAGE, MAX_FISH, CROWD_FROM, M, EV };
