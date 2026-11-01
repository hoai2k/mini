// Injected before any page script (Playwright addInitScript). Instruments one
// window: rAF callback CPU time, gl.finish() time (SwiftShader raster cost),
// WebGL calls per frame (draws, passes with their viewport sizes, programs,
// uploads, compiles), canvas-2D calls, DOM mutations, JS heap growth, and
// (optionally) fake gamepads and a spoofed GPU name so worlds take their
// real-GPU path. Configure through window.__perfCfg (set by a prior init script).
(() => {
  const cfg = Object.assign({ spoof: true, pads: 0, passTiming: false, finish: true }, window.__perfCfg || {});
  const P = (window.__perf = { cfg, frames: [], programs: new Map(), progId: 0, texBytes: new Map(), compiles: 0, links: 0, cur: null, passTimes: [] });
  const now = () => performance.now();
  const newFrame = () => ({ t0: 0, cpu: 0, fin: 0, draws: 0, prims: 0, passes: [], uploads: 0, uploadCalls: 0, buf: 0, compiles: 0, links: 0, progs: new Set(), c2d: 0, c2dPx: 0, dom: 0, heap0: 0, heap1: 0, copies: 0, copyPx: 0, clears: 0, quadPx: 0 });
  P.cur = newFrame();

  // ---- spoof the GPU name
  if (cfg.spoof) {
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!C) continue;
      const gp = C.prototype.getParameter;
      C.prototype.getParameter = function (p) {
        if (p === 0x9246 || p === 0x1F01) return 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)';
        if (p === 0x9245 || p === 0x1F00) return 'Google Inc. (Intel)';
        return gp.call(this, p);
      };
    }
  }

  // ---- fake gamepads
  if (cfg.pads > 0) {
    const pads = [];
    for (let i = 0; i < cfg.pads; i++) pads.push({ index: i, id: `Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13) #${i}`, connected: true, mapping: 'standard', timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })), vibrationActuator: { playEffect: () => Promise.resolve('complete'), reset: () => Promise.resolve('complete') } });
    window.__pads = pads;
    Object.defineProperty(navigator, 'getGamepads', { value: () => { for (const p of pads) p.timestamp = now(); return pads; }, configurable: true });
    window.__press = (i, b, on) => { const B = pads[i].buttons[b]; B.pressed = on; B.value = on ? 1 : 0; B.touched = on; };
    window.__stick = (i, x, y, rx = 0, ry = 0) => { pads[i].axes = [x, y, rx, ry]; };
  }

  // ---- WebGL
  let gl0 = null; // the first WebGL context made (the world's)
  let pass = null, lastPass = null;
  let vp = [0, 0, 0, 0];
  let fbBound = null;
  const fbNames = new Map(); let fbN = 0;
  const fbName = (fb) => { if (!fb) return 'screen'; if (!fbNames.has(fb)) fbNames.set(fb, `fb${++fbN}`); return fbNames.get(fb); };
  let curProg = null;
  const shaderSrc = new Map();
  const progShaders = new Map();
  const lastFinish = { t: 0 };
  const px1 = new Uint8Array(4);
  let O2 = null; // the original WebGL2 methods
  // Block until the GPU process has executed everything so far: a 1-pixel
  // read of the screen (gl.finish() does not block in Chrome).
  const sync = () => {
    const o = O2; if (!o || !gl0) return;
    const cur = fbBound;
    o.bindFramebuffer.call(gl0, 0x8D40, null);
    o.readPixels.call(gl0, 0, 0, 1, 1, 0x1908, 0x1401, px1);
    o.bindFramebuffer.call(gl0, 0x8D40, cur);
  };
  P.sync = sync;
  const passTime = (label) => {
    if (!cfg.passTiming || !gl0 || !P.recordPass) return;
    const t0 = now(); sync(); const t1 = now();
    if (lastPass) lastPass.ms = (lastPass.ms || 0) + (t1 - t0);
  };
  const startPass = () => {
    passTime();
    pass = { fb: fbName(fbBound), w: vp[2], h: vp[3], draws: 0, prims: 0, quads: 0, progs: [] };
    P.cur.passes.push(pass); lastPass = pass;
  };
  const onDraw = (mode, count, inst = 1) => {
    const f = P.cur;
    if (!pass || pass.w !== vp[2] || pass.h !== vp[3]) startPass();
    f.draws++; pass.draws++;
    const prims = (mode === 4 ? count / 3 : mode === 0 ? count : count / 2) * inst;
    f.prims += prims; pass.prims += prims;
    if (mode === 4 && count <= 6 && inst === 1) { pass.quads++; f.quadPx += vp[2] * vp[3]; }
    if (curProg) { const id = P.programs.get(curProg)?.id; f.progs.add(id); const pp = (f.byProg ||= {}); const e = (pp[id] ||= [0, 0, 0]); e[0]++; e[1] += prims; e[2] += (mode === 4 && count <= 6 && inst === 1) ? vp[2] * vp[3] : 0; if (pass.progs[pass.progs.length - 1] !== id) pass.progs.push(id); }
  };
  const texBytesOf = (w, h, fmt, type) => {
    const ch = { 0x1908: 4, 0x1907: 3, 0x1903: 1, 0x8227: 2, 0x1909: 1, 0x190A: 2, 0x6403: 1 }[fmt] || 4;
    const b = type === 0x140B || type === 0x8D61 ? 2 : type === 0x1406 ? 4 : 1;
    return w * h * ch * b;
  };
  const boundTex = new WeakMap();
  const wrap = (C) => {
    const p = C.prototype;
    const orig = {};
    if (C === window.WebGL2RenderingContext) O2 = orig;
    for (const k of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'bindFramebuffer', 'viewport', 'useProgram', 'texImage2D', 'texSubImage2D', 'texStorage2D', 'bufferData', 'bufferSubData', 'compileShader', 'linkProgram', 'shaderSource', 'attachShader', 'copyTexSubImage2D', 'copyTexImage2D', 'blitFramebuffer', 'clear', 'readPixels', 'bindTexture', 'generateMipmap']) orig[k] = p[k];
    p.drawArrays = function (m, f, c) { onDraw(m, c); return orig.drawArrays.call(this, m, f, c); };
    p.drawElements = function (m, c, t, o) { onDraw(m, c); return orig.drawElements.call(this, m, c, t, o); };
    if (orig.drawArraysInstanced) p.drawArraysInstanced = function (m, f, c, n) { onDraw(m, c, n); return orig.drawArraysInstanced.call(this, m, f, c, n); };
    if (orig.drawElementsInstanced) p.drawElementsInstanced = function (m, c, t, o, n) { onDraw(m, c, n); return orig.drawElementsInstanced.call(this, m, c, t, o, n); };
    p.bindFramebuffer = function (t, fb) { if (!gl0) gl0 = this; if (this === gl0 && (t === 0x8D40 || t === 0x8CA9)) { fbBound = fb; pass = null; } return orig.bindFramebuffer.call(this, t, fb); };
    p.viewport = function (x, y, w, h) { if (this === gl0) vp = [x, y, w, h]; return orig.viewport.call(this, x, y, w, h); };
    p.useProgram = function (pr) { curProg = pr; return orig.useProgram.call(this, pr); };
    p.shaderSource = function (s, src) { shaderSrc.set(s, src); return orig.shaderSource.call(this, s, src); };
    p.attachShader = function (pr, s) { const a = progShaders.get(pr) || []; a.push(s); progShaders.set(pr, a); return orig.attachShader.call(this, pr, s); };
    p.compileShader = function (s) { P.cur.compiles++; P.compiles++; return orig.compileShader.call(this, s); };
    p.linkProgram = function (pr) {
      P.cur.links++; P.links++;
      const srcs = (progShaders.get(pr) || []).map((s) => shaderSrc.get(s) || '');
      const fs = srcs.find((s) => /gl_FragColor|out\s+highp\s+vec4|pc_fragColor|fragColor/.test(s) && !/gl_Position\s*=/.test(s)) || srcs[1] || '';
      P.programs.set(pr, { id: ++P.progId, fs, vs: srcs.find((s) => /gl_Position\s*=/.test(s)) || '', frame: P.frames.length });
      return orig.linkProgram.call(this, pr);
    };
    p.bindTexture = function (t, tex) { this.__tex = tex; return orig.bindTexture.call(this, t, tex); };
    const upload = (gl, bytes) => { P.cur.uploads += bytes; P.cur.uploadCalls++; };
    p.texImage2D = function (...a) {
      let bytes = 0;
      if (a.length >= 8 && typeof a[3] === 'number') { bytes = texBytesOf(a[3], a[4], a[6], a[7]); if (a[8] == null) bytes = 0; else upload(this, bytes); P.texBytes.set(this.__tex, texBytesOf(a[3], a[4], a[6], a[7])); }
      else if (a.length === 6) { const s = a[5]; const w = s.width || s.videoWidth || 0, h = s.height || s.videoHeight || 0; bytes = texBytesOf(w, h, a[3], a[4]); upload(this, bytes); P.texBytes.set(this.__tex, bytes); }
      return orig.texImage2D.apply(this, a);
    };
    p.texSubImage2D = function (...a) {
      let w = 0, h = 0;
      if (a.length >= 9 && typeof a[4] === 'number') { w = a[4]; h = a[5]; upload(this, texBytesOf(w, h, a[6], a[7])); }
      else { const s = a[a.length - 1]; w = s && (s.width || s.videoWidth) || 0; h = s && (s.height || s.videoHeight) || 0; upload(this, texBytesOf(w, h, a[a.length - 3], a[a.length - 2])); }
      return orig.texSubImage2D.apply(this, a);
    };
    if (orig.texStorage2D) p.texStorage2D = function (t, l, f, w, h) { const bpp = { 0x881A: 8, 0x8814: 16, 0x8058: 4, 0x8C43: 4, 0x822D: 2, 0x8229: 1, 0x8230: 8, 0x822E: 4, 0x881B: 6, 0x8D62: 4, 0x8C3A: 4, 0x8C3D: 4, 0x81A6: 4, 0x88F0: 4, 0x81A5: 3, 0x8CAC: 4 }[f] || 4; P.texBytes.set(this.__tex, w * h * bpp * (l > 1 ? 1.33 : 1)); return orig.texStorage2D.call(this, t, l, f, w, h); };
    p.bufferData = function (t, d, u) { P.cur.buf += typeof d === 'number' ? d : d ? d.byteLength : 0; return orig.bufferData.call(this, t, d, u); };
    p.bufferSubData = function (t, o, d, ...r) { P.cur.buf += d ? (r[1] ? r[1] * (d.BYTES_PER_ELEMENT || 1) : d.byteLength) : 0; return orig.bufferSubData.call(this, t, o, d, ...r); };
    p.copyTexSubImage2D = function (...a) { P.cur.copies++; P.cur.copyPx += a[6] * a[7]; return orig.copyTexSubImage2D.apply(this, a); };
    p.copyTexImage2D = function (...a) { P.cur.copies++; P.cur.copyPx += a[5] * a[6]; return orig.copyTexImage2D.apply(this, a); };
    p.blitFramebuffer = function (...a) { P.cur.copies++; P.cur.copyPx += Math.abs((a[6] - a[4]) * (a[7] - a[5])); return orig.blitFramebuffer.apply(this, a); };
    p.clear = function (m) { if (this === gl0) P.cur.clears++; return orig.clear.call(this, m); };
    p.readPixels = function (...a) { P.cur.readPixels = (P.cur.readPixels || 0) + 1; return orig.readPixels.apply(this, a); };
    p.generateMipmap = function (t) { P.cur.mips = (P.cur.mips || 0) + 1; return orig.generateMipmap.call(this, t); };
  };
  if (window.WebGL2RenderingContext) wrap(window.WebGL2RenderingContext);
  if (window.WebGLRenderingContext) wrap(window.WebGLRenderingContext);
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (t, o) { const c = gc.call(this, t, o); if (c && /webgl/.test(t) && !gl0) gl0 = c; return c; };

  // ---- canvas 2D
  const C2 = CanvasRenderingContext2D.prototype;
  for (const k of Object.getOwnPropertyNames(C2)) {
    const d = Object.getOwnPropertyDescriptor(C2, k);
    if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
    const f = d.value;
    C2[k] = function (...a) {
      P.cur.c2d++;
      if (k === 'drawImage') P.cur.c2dPx += (a.length >= 5 ? a[a.length - 2] * a[a.length - 1] : (a[0].width || 0) * (a[0].height || 0));
      if (k === 'getImageData') P.cur.getImageData = (P.cur.getImageData || 0) + 1;
      if (k === 'fillRect' || k === 'clearRect') P.cur.c2dPx += Math.abs(a[2] * a[3]);
      return f.apply(this, a);
    };
  }

  // ---- DOM mutations
  const mo = new MutationObserver((l) => { P.cur.dom += l.length; });
  const startMO = () => mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  if (document.documentElement) startMO(); else document.addEventListener('DOMContentLoaded', startMO);

  // ---- frames: wrap requestAnimationFrame
  const raf = window.requestAnimationFrame.bind(window);
  let inFrame = 0;
  let pending = [];
  let scheduled = false;
  const heap = () => (performance.memory ? performance.memory.usedJSHeapSize : 0);
  const tick = (ts) => {
    scheduled = false;
    const cbs = pending; pending = [];
    const f = P.cur;
    f.t0 = ts; f.heap0 = heap();
    const t0 = now();
    P.recordPass = true;
    inFrame++;
    for (const cb of cbs) { try { cb(ts); } catch (e) { setTimeout(() => { throw e; }); } }
    inFrame--;
    f.cpu = now() - t0;
    if (cfg.passTiming) passTime();
    P.recordPass = false;
    if (cfg.finish && gl0) { const t1 = now(); sync(); f.fin = now() - t1; }
    f.heap1 = heap();
    f.progs = f.progs.size;
    P.frames.push(f);
    if (P.frames.length > 600) P.frames.shift();
    P.cur = newFrame();
    pass = null; lastPass = null;
  };
  window.requestAnimationFrame = (cb) => { pending.push(cb); if (!scheduled) { scheduled = true; raf(tick); } return pending.length; };
  window.cancelAnimationFrame = () => {};

  P.reset = () => { P.frames.length = 0; };
  P.programList = () => [...P.programs.values()].map((p) => ({ id: p.id, frame: p.frame, fs: p.fs, vs: p.vs }));
  P.texMem = () => { let s = 0, n = 0, big = []; for (const [t, b] of P.texBytes) { if (!t) continue; s += b; n++; big.push(b); } big.sort((a, b) => b - a); return { bytes: s, n, top: big.slice(0, 8) }; };
  P.gl = () => gl0;
})();
