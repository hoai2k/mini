// Delivered artwork. assets/manifest.json (generated from
// design/source/build_requests.py) lists every requested image. Entries whose
// status is "delivered" are loaded; everything else is drawn
// by the procedural paper-cut stand-ins in render.js. Delivered production
// sheets with runtime: false are reserved for later builds. The game loads
// the scaled WebP copy (a.web, from design/source/build_web_art.py) when there
// is one; the PNG masters in assets/art/ are not published.

import { loadRig } from './rig.js';

// Jointed puppets cut from the part sheets (design/source/build_rigs.py).
const RIGS = ['sister-trac'];

export class Art {
  constructor() {
    this.images = new Map();
    this.entries = [];
    this.rigs = new Map();
  }

  async load(base = 'assets/') {
    try {
      const res = await fetch(`${base}manifest.json`);
      const manifest = await res.json();
      this.entries = manifest.assets || [];
    } catch {
      this.entries = [];
    }
    const delivered = this.entries.filter((a) => a.status === 'delivered' && a.runtime !== false && a.file);
    const rigs = RIGS.map(async (id) => {
      const r = await loadRig(base, id);
      if (r) this.rigs.set(id, r);
    });
    await Promise.all(
      [...rigs, ...delivered.map(
        (a) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              this.images.set(a.id, img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = `${base}${a.web || a.file}`;
          }),
      )],
    );
  }

  /** A jointed puppet, or null to draw the figure's whole sprite. */
  rig(id) {
    return this.rigs.get(id) || null;
  }

  /** The delivered image for an id, or null to use the stand-in. */
  get(id) {
    return this.images.get(id) || null;
  }
}
