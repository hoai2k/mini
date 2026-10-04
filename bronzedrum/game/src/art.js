// Delivered artwork. assets/manifest.json (generated from
// design/source/build_requests.py) lists every requested image. Entries whose
// status is "delivered" are loaded from assets/art/; everything else is drawn
// by the procedural paper-cut stand-ins in render.js. Delivered production
// sheets with runtime: false are reserved for later builds.

export class Art {
  constructor() {
    this.images = new Map();
    this.entries = [];
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
    await Promise.all(
      delivered.map(
        (a) =>
          new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              this.images.set(a.id, img);
              resolve();
            };
            img.onerror = () => resolve();
            img.src = `${base}${a.file}`;
          }),
      ),
    );
  }

  /** The delivered image for an id, or null to use the stand-in. */
  get(id) {
    return this.images.get(id) || null;
  }
}
