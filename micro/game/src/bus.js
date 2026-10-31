// Messages to and from the world frames (the protocol is documented in
// micro/prototypes/shared/embed.js). Only same-origin messages tagged
// 'micro-embed' from a frame we registered are passed on.
const TAG = 'micro-embed';
const routes = new Map(); // Window -> fn(msg)

addEventListener('message', (e) => {
  if (e.origin !== location.origin) return;
  const d = e.data;
  if (!d || typeof d !== 'object' || !d[TAG] || typeof d.type !== 'string') return;
  const fn = routes.get(e.source);
  if (fn) fn(d);
});

/** Route messages from a frame's window to fn; returns an unsubscribe. */
export function listen(win, fn) {
  routes.set(win, fn);
  return () => { if (routes.get(win) === fn) routes.delete(win); };
}

/** Send a message to a frame. */
export function send(frame, type, data = {}) {
  try { frame?.contentWindow?.postMessage({ ...data, [TAG]: 1, type }, location.origin); } catch { /* frame gone */ }
}
