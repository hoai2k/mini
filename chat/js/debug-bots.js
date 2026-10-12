// Each bot runs the real games in its own window: its keyboard, sound and
// saved scores are isolated from the human player's. Connections are owned
// by this page and always closed when the count shrinks or the page leaves.
import { COLORS } from './palette.js';
import { randomId } from './store.js';

export const MAX_DEBUG_BOTS = 4;
export function createDebugBots({ ownerId, rooms, mediaOf, onChange, toast, room = 'everyone' }) {
  const bots = new Map();
  let desired = 0, stopped = false;
  let work = Promise.resolve();
  function remove(rec) {
    rec.runtime?.stop();
    rec.frame.remove();
    bots.delete(rec.me.id);
  }
  async function reconcile() {
    while (!stopped && bots.size !== desired) {
      if (bots.size > desired) { remove([...bots.values()].at(-1)); continue; }
      const number = bots.size + 1;
      const me = { id: `debug-${randomId()}`, name: `Debug Bot ${number}`, color: COLORS[number % COLORS.length], debugOwner: ownerId };
      const frame = document.createElement('iframe');
      frame.className = 'debug-bot-frame';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.title = me.name;
      const rec = { me, frame, runtime: null };
      bots.set(me.id, rec);
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Bot window timed out')), 15000);
          frame.onload = () => { clearTimeout(timeout); resolve(); };
          frame.onerror = () => { clearTimeout(timeout); reject(new Error('Bot window could not load')); };
          frame.src = new URL('../debug-bot.html', import.meta.url).href;
          document.body.append(frame);
        });
        if (stopped || !bots.has(me.id)) { frame.remove(); break; }
        rec.runtime = await frame.contentWindow.startDebugBot({ me, ownerId, rooms, mediaOf, room });
        if (stopped || !bots.has(me.id)) { rec.runtime.stop(); frame.remove(); break; }
        onChange();
      } catch (e) {
        console.warn('debug bot failed', e);
        remove(rec);
        desired = bots.size;
        toast('Could not add a debug bot. Try again.');
      }
    }
    onChange();
  }
  return {
    get count() { return desired; },
    get bots() { return bots; },
    isLocal: id => bots.has(id),
    streamOf: id => bots.get(id)?.runtime?.studio.stream ?? null,
    setCount(n) {
      desired = Math.max(0, Math.min(MAX_DEBUG_BOTS, Math.trunc(n) || 0));
      work = work.then(reconcile);
      return work;
    },
    stop() {
      stopped = true;
      desired = 0;
      for (const rec of [...bots.values()]) remove(rec);
    },
  };
}
