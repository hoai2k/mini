// Meditation Timer: the page. Timeline and clock in timer.js, chimes in chimes.js.
import { plan, phaseAt, eventsAhead, formatClock, Clock, STRIKE_GAP } from './timer.js';
import { DEFAULTS, LIMITS, DURATION_PRESETS, PREROLL_PRESETS, INTERVAL_PRESETS, sanitize, load, save } from './settings.js';
import { SOUNDS, CREDITS, soundById } from './sounds.js';
import { Chimes } from './chimes.js';
import { ICONS, STANDINS } from './icons.js';

const $ = (id) => document.getElementById(id);
const app = document.querySelector('.app');
const RING = 2 * Math.PI * 92;

let settings = load();
let delivered = new Set();
const chimes = new Chimes();
chimes.setVolume(settings.volume);

// Session state. `clock` runs on the page's clock; chimes are scheduled on the
// audio clock, and both are re-anchored whenever the session starts or resumes.
let session = null; // { plan, clock, paused, doneAt }
let wakeLock = null;

// ---------- artwork ----------

async function loadAssets() {
  try {
    const list = await (await fetch('data/asset-list.json')).json();
    delivered = new Set(list.filter((a) => a.status !== 'requested').map((a) => a.id));
    const file = Object.fromEntries(list.map((a) => [a.id, a.file]));
    if (delivered.has('backdrop')) document.querySelector('.backdrop').style.backgroundImage = `url("${file.backdrop}")`;
    if (delivered.has('bowl')) $('bowl').innerHTML = `<img src="${file.bowl}" alt="">`;
    window.__assetFiles = file;
  } catch { /* stand-ins stay */ }
}

function picture(id) {
  const file = window.__assetFiles && window.__assetFiles[id];
  return delivered.has(id) && file ? `<img src="${file}" alt="" loading="lazy">` : STANDINS[id] || '';
}

// ---------- rendering ----------

function chipRow(el, values, current, label, onPick) {
  el.innerHTML = values.map((v) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${v === current}">${label(v)}</button>`).join('');
  el.onclick = (e) => {
    const b = e.target.closest('.chip');
    if (b) onPick(Number(b.dataset.v));
  };
}

function instrumentPicker(el, key) {
  el.innerHTML = SOUNDS.map((s) => `
    <button type="button" class="instrument" data-id="${s.id}" aria-pressed="${settings[key] === s.id}">
      <span class="pic">${picture(s.image)}</span><span class="name">${s.name}</span>
    </button>`).join('');
  el.onclick = async (e) => {
    const b = e.target.closest('.instrument');
    if (!b) return;
    update({ [key]: b.dataset.id });
    // Picking a sound plays it, so you hear what you chose.
    await chimes.unlock();
    await chimes.preload([b.dataset.id]);
    chimes.cancelPending();
    chimes.strike(b.dataset.id);
  };
}

function renderSettings() {
  const s = settings;
  chipRow($('preroll-chips'), PREROLL_PRESETS, s.preroll, (v) => (v ? `${v} s` : 'None'), (v) => update({ preroll: v }));
  $('preroll').value = s.preroll;
  instrumentPicker($('start-sound'), 'startSound');
  instrumentPicker($('end-sound'), 'endSound');
  instrumentPicker($('interval-sound'), 'intervalSound');
  $('interval-sound').hidden = s.interval === 0;
  chipRow($('start-strikes'), [1, 2, 3], s.startStrikes, String, (v) => update({ startStrikes: v }));
  chipRow($('end-strikes'), [1, 2, 3, 4, 5], s.endStrikes, String, (v) => update({ endStrikes: v }));
  chipRow($('interval-chips'), INTERVAL_PRESETS, s.interval, (v) => (v ? `${v} min` : 'Off'), (v) => update({ interval: v }));
  $('volume').value = s.volume;
  $('volume-out').textContent = `${s.volume}%`;
  $('keep-awake').checked = s.keepAwake;
  $('duration').value = s.duration;
}

function renderIdle() {
  chipRow($('duration-chips'), DURATION_PRESETS, settings.duration, (v) => `${v}`, (v) => update({ duration: v }));
  $('time').textContent = formatClock(settings.duration * 60);
  $('status').textContent = settings.preroll ? `${settings.preroll} s to settle, then the chime` : 'The chime rings as you begin';
  setRing(0);
  $('hint').textContent = settings.interval ? `Interval chime every ${settings.interval} min` : '';
}

function setRing(progress) {
  const p = $('progress');
  p.style.strokeDasharray = `${RING}`;
  p.style.strokeDashoffset = `${RING * (1 - progress)}`;
}

function setPhase(phase) {
  if (app.dataset.phase === phase) return;
  app.dataset.phase = phase;
  const running = phase === 'preroll' || phase === 'session';
  const paused = phase === 'paused';
  $('start').querySelector('.ico').innerHTML = running ? ICONS.pause : ICONS.play;
  $('start').querySelector('.label').textContent = running ? 'Pause' : paused ? 'Resume' : phase === 'done' ? 'Again' : 'Begin';
  $('stop').hidden = !(running || paused || phase === 'done');
  $('stop').querySelector('.label').textContent = phase === 'done' ? 'Close' : 'End';
  $('durations').hidden = phase !== 'idle';
}

function update(patch) {
  settings = sanitize({ ...settings, ...patch });
  save(settings);
  chimes.setVolume(settings.volume);
  renderSettings();
  if (!session) renderIdle();
}

// ---------- the session ----------

function soundFor(kind) {
  return kind === 'start' ? settings.startSound : kind === 'end' ? settings.endSound : settings.intervalSound;
}

/** Schedule the chimes still ahead on the audio clock. */
function scheduleAhead() {
  chimes.cancelPending();
  const elapsed = session.clock.elapsed();
  const audioNow = chimes.now;
  for (const e of eventsAhead(session.plan, elapsed)) {
    // Later strikes of the same chime a touch softer; interval chimes gentle.
    const velocity = e.kind === 'interval' ? 0.6 : Math.pow(0.88, e.strike);
    chimes.strike(soundFor(e.kind), audioNow + (e.at - elapsed), velocity);
  }
}

async function begin() {
  await chimes.unlock();
  // Recordings decode before the clock starts, so a sitting with no preroll still opens on its chime.
  await chimes.preload([settings.startSound, settings.endSound, settings.intervalSound]);
  session = { plan: plan(settings), clock: new Clock(() => performance.now() / 1000), paused: false };
  session.clock.start();
  scheduleAhead();
  holdScreen();
  tick();
}

function pause() {
  session.clock.pause();
  session.paused = true;
  chimes.cancelPending();
  releaseScreen();
  setPhase('paused');
  $('status').textContent = 'Paused';
}

async function resume() {
  await chimes.unlock();
  session.clock.resume();
  session.paused = false;
  scheduleAhead();
  holdScreen();
  tick();
}

function end() {
  chimes.silence();
  session = null;
  releaseScreen();
  setPhase('idle');
  renderIdle();
}

function tick() {
  if (!session || session.paused) return;
  const elapsed = session.clock.elapsed();
  const st = phaseAt(session.plan, elapsed);
  setPhase(st.phase);
  if (st.phase === 'preroll') {
    $('time').textContent = formatClock(session.plan.duration);
    $('status').textContent = `Settling in · ${Math.ceil(st.remaining)}`;
    setRing(0);
  } else if (st.phase === 'session') {
    $('time').textContent = formatClock(st.remaining);
    $('status').textContent = 'Breathe';
    setRing(st.progress);
  } else {
    $('time').textContent = formatClock(0);
    $('status').textContent = `${settings.duration} min complete`;
    setRing(1);
    releaseScreen();
  }
  // Glow and ripple while a chime is ringing.
  const ringing = session.plan.events.some((e) => elapsed >= e.at && elapsed < e.at + 4);
  app.classList.toggle('ringing', ringing);
  // Keep going until the last strike has had time to ring out.
  const last = session.plan.events[session.plan.events.length - 1].at;
  if (elapsed < last + STRIKE_GAP) requestAnimationFrame(tick);
  else app.classList.remove('ringing');
}

async function holdScreen() {
  if (!settings.keepAwake || !('wakeLock' in navigator) || wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => { wakeLock = null; });
  } catch { /* not allowed (battery saver, iframe) */ }
}

function releaseScreen() {
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !session || session.paused) return;
  // Back from the background: the audio clock may have been suspended, so line
  // the chimes up with the page clock again, and take the screen lock back.
  if (chimes.ctx && chimes.ctx.state !== 'running') {
    await chimes.unlock();
    scheduleAhead();
  }
  if (phaseAt(session.plan, session.clock.elapsed()).phase !== 'done') holdScreen();
  tick();
});

// ---------- controls ----------

$('start').onclick = () => {
  if (!session || app.dataset.phase === 'done') { if (session) end(); begin(); return; }
  if (session.paused) resume(); else pause();
};
$('stop').onclick = end;
$('minus').onclick = () => update({ duration: settings.duration - 1 });
$('plus').onclick = () => update({ duration: settings.duration + 1 });
$('preroll').onchange = (e) => update({ preroll: e.target.value });
$('duration').onchange = (e) => update({ duration: e.target.value });
$('volume').oninput = (e) => { settings.volume = Number(e.target.value); $('volume-out').textContent = `${settings.volume}%`; chimes.setVolume(settings.volume); };
$('volume').onchange = (e) => update({ volume: e.target.value });
$('keep-awake').onchange = (e) => update({ keepAwake: e.target.checked });
$('reset').onclick = () => update({ ...DEFAULTS });
$('open-settings').onclick = () => $('settings').showModal();
$('settings').addEventListener('click', (e) => { if (e.target === $('settings')) $('settings').close(); });

document.addEventListener('keydown', (e) => {
  if ($('settings').open || e.target.closest('input, button, select')) return;
  if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); $('start').click(); }
  else if (e.key === 'Escape' && session) end();
  else if (!session && (e.key === '+' || e.key === '=' || e.key === 'ArrowUp')) update({ duration: settings.duration + 1 });
  else if (!session && (e.key === '-' || e.key === 'ArrowDown')) update({ duration: settings.duration - 1 });
});

// ---------- start up ----------

$('open-settings').innerHTML = ICONS.settings;
$('close-settings').innerHTML = ICONS.close;
$('minus').innerHTML = ICONS.minus;
$('plus').innerHTML = ICONS.plus;
$('vol-ico').innerHTML = ICONS.speaker;
$('stop').querySelector('.ico').innerHTML = ICONS.stop;
$('bowl').innerHTML = STANDINS.bowl;
$('credits').innerHTML = (CREDITS.length
  ? `<p>Recordings:</p><ul>${CREDITS.map((c) => `<li>${soundById(c.sound).name}: <a href="${c.url}" target="_blank" rel="noopener">${c.title}</a> by ${c.author}, ${c.licenseUrl ? `<a href="${c.licenseUrl}" target="_blank" rel="noopener">${c.license}</a>` : c.license}${c.changes ? ` (${c.changes})` : ''}.</li>`).join('')}</ul>`
  : '')
  + `<p>${CREDITS.length ? 'The other chimes are' : 'The chimes are'} synthesized in the browser from the partials of each instrument.</p>`;
setPhase('idle');
renderSettings();
renderIdle();
loadAssets().then(renderSettings);

if (location.search.includes('test')) window.__meditation = { get settings() { return settings; }, get session() { return session; }, chimes, LIMITS };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
