// Persistent player settings (graphics, audio, camera, accessibility, controls).
const KEY = 'half-blood-quests-settings-v1';
const DEFAULTS = {
  quality: 'auto', forceWebGL: false, showFps: false, dynRes: true, motionBlur: false,
  shake: 1, hitstop: true, slowmo: true, cameraRotate: false, cameraZoom: 26,
  master: 0.8, music: 0.5, sfx: 0.9, muted: false, damageNumbers: true,
  battleSense: true,   // a perfect dodge slows time for the team
  greekText: true,     // titles and signs first appear as Greek letters, then settle into English (narration is always plain English)
  vibration: true,     // controller rumble
  rightStick: 'dodge', // controller right stick: 'dodge' (flick to roll, as in Minecraft Dungeons II) or 'aim'
  reduceMotion: false, // also honours the system "reduce motion" preference
  debug: false,        // Settings → Data → Debug: a menu that jumps to any scene (ui/debugMenu.js); nothing is saved there
};
export const settings = { ...DEFAULTS };
try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
// The default zoom went from 22 to 26 (the camera was a little close): a
// setting still at an old default moves with it; one chosen stays.
// (24 for a while, for small screens; the game is made for a desktop screen.)
if ((settings.zoomV ?? 1) < 4) { if ([22, 24].includes(settings.cameraZoom)) settings.cameraZoom = DEFAULTS.cameraZoom; settings.zoomV = 4; }
export function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* ignore */ } }
export function resetSettings() { Object.assign(settings, DEFAULTS); saveSettings(); }
export function prefersReducedMotion() {
  try { return !!settings.reduceMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return !!settings.reduceMotion; }
}
