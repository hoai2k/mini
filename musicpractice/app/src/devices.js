// What the browser says about microphones, speakers and permission, and
// which mic to use. Names (labels) are only shown once mic permission is
// granted; iPhone browsers list no speakers at all, and a Bluetooth speaker
// without its own mic never shows up there as an input either.

const BT = /bluetooth|airpods|beats|buds|headset|hands-?free|\bbt\b|bose|jbl|soundcore|ue boom|marshall|sony wh|sony wf/i;
const BUILT_IN = /built-?in|internal|iphone|ipad|macbook|imac|microphone array|front|bottom|back|phone/i;

export const isBluetooth = (label = '') => BT.test(label);
export const isBuiltIn = (label = '') => BUILT_IN.test(label) && !isBluetooth(label);

/**
 * The mic to ask for: an explicit choice if it is still there; otherwise
 * (`auto`) the built-in mic when a Bluetooth mic is also present, since
 * recording through a Bluetooth device switches it to call-quality sound.
 * Returns a deviceId, or null for the system default.
 */
export function preferredMic(inputs, choice = 'auto') {
  if (choice && choice !== 'auto') return inputs.some((d) => d.deviceId === choice) ? choice : null;
  if (!inputs.some((d) => isBluetooth(d.label))) return null;
  const real = inputs.filter((d) => d.deviceId && d.deviceId !== 'default' && d.deviceId !== 'communications');
  const builtIn = real.find((d) => isBuiltIn(d.label)) || real.find((d) => !isBluetooth(d.label));
  return builtIn ? builtIn.deviceId : null;
}

export async function listDevices() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return {
      inputs: all.filter((d) => d.kind === 'audioinput'),
      outputs: all.filter((d) => d.kind === 'audiooutput'),
      labelled: all.some((d) => d.label),
    };
  } catch {
    return { inputs: [], outputs: [], labelled: false };
  }
}

/** Mic permission as the browser reports it: granted, prompt, denied or unknown. */
let permission = 'unknown';
const listeners = new Set();
(async () => {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' });
    permission = status.state;
    status.onchange = () => { permission = status.state; listeners.forEach((f) => f()); };
  } catch { /* not supported */ }
})();
export const micPermission = () => permission;
export const onPermissionChange = (f) => listeners.add(f);

/** Can this browser send a page's sound to a chosen speaker? */
export const canChooseSpeaker = () => typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype;

/** iPhone/iPad (every browser there is Safari underneath) or Safari on a Mac. */
export const isWebKit = () => typeof globalThis.GestureEvent !== 'undefined' || /iP(hone|ad|od)/.test(globalThis.navigator?.userAgent || '');

/*
 * Was the mic allowed in advance? Browsers don't always say (Safari may not
 * report a site set to Allow), so the first request is timed too: granted
 * without a prompt it resolves almost at once, while a prompt needs a tap,
 * which takes a second or more.
 */
export const QUICK_GRANT_MS = 600;
export const diag = {
  firstRequestMs: null, // how long the first mic request took
  lastPlayback: null, // { at, micFreed, waitedMs, session, sessionState, via }
};
export function noteFirstRequest(ms) {
  if (diag.firstRequestMs == null) diag.firstRequestMs = Math.round(ms);
}
export const allowedInAdvance = () => diag.firstRequestMs != null && diag.firstRequestMs < QUICK_GRANT_MS;
