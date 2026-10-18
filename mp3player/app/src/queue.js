// What plays next, in the manner of a streaming app. A *context* is the list
// a song was started from (all songs, an album, an artist, search results);
// it plays in its order, or shuffled with the current song first. Songs the
// listener queues ("Play next", "Add to queue") play before the context
// continues. Repeat is off, all (the context loops) or one (the song loops
// when it ends on its own; skipping still moves on). No browser dependencies.

/** Fisher–Yates shuffle with an injectable random source (tests seed it). */
export function shuffled(arr, random = Math.random) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export class Queue {
  constructor(random = Math.random) {
    this.random = random;
    /** @type {{kind: string, id?: string, label: string}} where the context came from */
    this.source = { kind: 'songs', label: 'Songs' };
    this.context = []; // ids in the context's own order
    this.order = []; // ids in play order (context, or shuffled)
    this.pos = -1; // index in order of the context song playing (or last played)
    this.manual = []; // queued by the listener, played first
    this.current = null; // id playing now
    this.fromManual = false; // current came from the manual queue
    this.shuffle = false;
    this.repeat = 'off'; // 'off' | 'all' | 'one'
  }

  /** Start playing `startId` (or the first song) from a list. */
  play(ids, startId, source, { shuffle } = {}) {
    if (source) this.source = source;
    if (shuffle !== undefined) this.shuffle = shuffle;
    this.context = ids.slice();
    const start = startId ?? (this.shuffle ? ids[Math.floor(this.random() * ids.length)] : ids[0]);
    this.#build(start);
    this.current = start ?? null;
    this.fromManual = false;
    return this.current;
  }

  #build(currentId) {
    if (this.shuffle) {
      const rest = shuffled(this.context.filter((id) => id !== currentId), this.random);
      this.order = currentId != null && this.context.includes(currentId) ? [currentId, ...rest] : rest;
      this.pos = currentId != null && this.context.includes(currentId) ? 0 : -1;
    } else {
      this.order = this.context.slice();
      this.pos = this.order.indexOf(currentId);
    }
  }

  /**
   * Move on. `auto` is true when the song ended by itself (repeat-one replays
   * it then). Returns the new current id, or null when the queue has run out.
   */
  next({ auto = false } = {}) {
    if (auto && this.repeat === 'one' && this.current != null) return this.current;
    if (this.manual.length) {
      this.current = this.manual.shift();
      this.fromManual = true;
      return this.current;
    }
    this.fromManual = false;
    if (!this.order.length) return (this.current = null);
    let pos = this.pos + 1;
    if (pos >= this.order.length) {
      if (this.repeat === 'off') {
        this.pos = this.order.length; // past the end: next play() or prev() recovers
        return (this.current = null);
      }
      if (this.shuffle) {
        // A fresh shuffle each lap, without repeating the song just heard.
        const last = this.order[this.order.length - 1];
        const lap = shuffled(this.context, this.random);
        if (lap.length > 1 && lap[0] === last) [lap[0], lap[1]] = [lap[1], lap[0]];
        this.order = lap;
      }
      pos = 0;
    }
    this.pos = pos;
    return (this.current = this.order[pos]);
  }

  /** Previous song in the context (the caller restarts the song instead when it is past a few seconds). */
  prev() {
    if (!this.order.length) return this.current;
    if (this.fromManual) {
      // Back from a queued song lands on the context song it interrupted.
      this.fromManual = false;
      this.pos = Math.min(this.pos, this.order.length - 1);
      if (this.pos >= 0) return (this.current = this.order[this.pos]);
    }
    let pos = Math.min(this.pos, this.order.length) - 1;
    if (pos < 0) pos = this.repeat === 'all' ? this.order.length - 1 : 0;
    this.pos = pos;
    return (this.current = this.order[pos]);
  }

  /** True when there is a previous song to go to (as opposed to restarting). */
  hasPrev() {
    return this.order.length > 0 && (this.pos > 0 || this.repeat === 'all' || this.fromManual);
  }

  hasNext() {
    return this.manual.length > 0 || this.pos + 1 < this.order.length || (this.repeat !== 'off' && this.order.length > 0);
  }

  setShuffle(on) {
    this.shuffle = !!on;
    const anchor = this.fromManual ? this.order[this.pos] : this.current;
    this.#build(anchor);
    if (this.fromManual && this.pos < 0) this.pos = -1;
  }

  /** off → all → one → off */
  cycleRepeat() {
    this.repeat = { off: 'all', all: 'one', one: 'off' }[this.repeat];
    return this.repeat;
  }

  playNext(id) { this.manual.unshift(id); }
  addToQueue(id) { this.manual.push(id); }
  removeQueued(index) { this.manual.splice(index, 1); }
  clearQueued() { this.manual = []; }

  /** Songs still to come from the context, in play order. */
  upcoming() {
    return this.order.slice(Math.max(0, this.pos + 1));
  }

  /** Jump to the i-th queued song, dropping the ones before it. */
  jumpQueued(index) {
    this.manual.splice(0, index);
    return this.next();
  }

  /** Jump to the i-th song of upcoming(). */
  jumpUpcoming(index) {
    this.pos = Math.max(0, this.pos + 1) + index;
    this.fromManual = false;
    return (this.current = this.order[this.pos] ?? null);
  }

  /** A song left the library: drop it everywhere. Returns true if it was playing. */
  remove(id) {
    this.manual = this.manual.filter((m) => m !== id);
    this.context = this.context.filter((c) => c !== id);
    const at = this.order.indexOf(id);
    if (at >= 0) {
      this.order.splice(at, 1);
      if (at <= this.pos) this.pos--;
    }
    return this.current === id;
  }

  /**
   * The context's own order changed (the library was reordered). Unshuffled
   * play follows the new order from the current song; a shuffle keeps its order.
   */
  reorderContext(ids) {
    this.context = ids.slice();
    if (!this.shuffle) {
      this.order = this.context.slice();
      const anchor = this.fromManual && this.pos >= 0 ? null : this.current;
      if (anchor != null) this.pos = this.order.indexOf(anchor);
    }
  }

  toJSON() {
    const { source, context, order, pos, manual, current, fromManual, shuffle, repeat } = this;
    return { source, context, order, pos, manual, current, fromManual, shuffle, repeat };
  }

  /** Restore a saved queue, keeping only ids still in the library. */
  static from(saved, haveId, random) {
    const q = new Queue(random);
    if (!saved || typeof saved !== 'object') return q;
    const keep = (arr) => (Array.isArray(arr) ? arr.filter(haveId) : []);
    q.source = saved.source ?? q.source;
    q.shuffle = !!saved.shuffle;
    q.repeat = ['off', 'all', 'one'].includes(saved.repeat) ? saved.repeat : 'off';
    q.context = keep(saved.context);
    q.manual = keep(saved.manual);
    const order = keep(saved.order);
    q.order = order.length === q.context.length ? order : q.context.slice();
    q.current = saved.current != null && haveId(saved.current) ? saved.current : null;
    q.fromManual = !!saved.fromManual && q.current != null;
    const at = q.current != null ? q.order.indexOf(q.current) : -1;
    q.pos = at >= 0 ? at : Math.min(Math.max(-1, Number(saved.pos) || 0), q.order.length - 1);
    return q;
  }
}
