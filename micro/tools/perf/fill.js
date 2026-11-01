// Extra init script (after inject.js): effective fill per frame, counting the
// scissor box. Per pass (framebuffer bind), the largest drawn area (viewport ∩
// scissor) is that pass's fill; quads (<=6 verts) are summed separately.
(() => {
  const P = window.__perf;
  let sc = [0, 0, 1e9, 1e9], scOn = false, vp = [0, 0, 0, 0], fb = null, passArea = 0;
  const add = () => { P.cur.fill = (P.cur.fill || 0) + passArea; passArea = 0; };
  const push = P.frames.push;
  P.frames.push = function (f) { f.fill = (f.fill || 0) + passArea; passArea = 0; return push.call(this, f); };
  const area = () => {
    if (!scOn) return vp[2] * vp[3];
    const x0 = Math.max(vp[0], sc[0]), y0 = Math.max(vp[1], sc[1]);
    const x1 = Math.min(vp[0] + vp[2], sc[0] + sc[2]), y1 = Math.min(vp[1] + vp[3], sc[1] + sc[3]);
    return Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  };
  for (const C of [WebGL2RenderingContext]) {
    const p = C.prototype, o = {};
    for (const k of ['scissor', 'enable', 'disable', 'viewport', 'bindFramebuffer', 'drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'createBuffer', 'clear']) o[k] = p[k];
    p.scissor = function (x, y, w, h) { sc = [x, y, w, h]; return o.scissor.call(this, x, y, w, h); };
    p.enable = function (c) { if (c === 0x0C11) scOn = true; return o.enable.call(this, c); };
    p.disable = function (c) { if (c === 0x0C11) scOn = false; return o.disable.call(this, c); };
    p.viewport = function (x, y, w, h) { vp = [x, y, w, h]; return o.viewport.call(this, x, y, w, h); };
    p.bindFramebuffer = function (t, f) { if (t !== 0x8CA8) add(); return o.bindFramebuffer.call(this, t, f); };
    const d = (n) => function (...a) { passArea = Math.max(passArea, area()); return o[n].apply(this, a); };
    for (const n of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) p[n] = d(n);
    p.clear = function (m) { P.cur.clearPx = (P.cur.clearPx || 0) + area(); return o.clear.call(this, m); };
    p.createBuffer = function () { P.cur.createBuffer = (P.cur.createBuffer || 0) + 1; return o.createBuffer.call(this); };
  }
})();
