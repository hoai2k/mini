// The bridge to the iOS and Android apps (Capacitor, musicpractice/mobile/).
// Inside the apps, Capacitor puts `window.Capacitor` on the page before any
// script runs; its plugins are called straight through it, so the web app
// needs no build step. On the web none of this is there: isApp() is false
// and every caller keeps its web behaviour.

const cap = () => globalThis.Capacitor;

/** Running inside the iOS or Android app? */
export const isApp = () => !!cap()?.isNativePlatform?.();

/** 'ios', 'android' or 'web'. */
export const platform = () => (isApp() ? cap().getPlatform() : 'web');

/** Is this native plugin in the app? */
export const hasPlugin = (name) => isApp() && !!cap().PluginHeaders?.some((h) => h.name === name);

/** Call a plugin method that answers once. */
export function call(plugin, method, options = {}) {
  if (!hasPlugin(plugin)) return Promise.reject(new Error(`${plugin} is not in this app`));
  return cap().nativePromise(plugin, method, options);
}

/** Call a plugin method that answers many times (a listener): callback(data, error). */
export function listen(plugin, method, options, callback) {
  if (!hasPlugin(plugin)) return null;
  return cap().nativeCallback(plugin, method, options, callback);
}

/** Keep the screen on (or let it sleep). */
export function keepScreenOn(on) {
  return call('KeepAwake', on ? 'keepAwake' : 'allowSleep').catch(() => { /* not important */ });
}

/** A file's bytes as base64, for passing to native code. */
async function base64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Open the share sheet with a file (Save to Files, AirDrop, Messages, Drive…).
 * Resolves false if it was closed without sharing.
 */
export async function shareFile(file, title) {
  const { uri } = await call('Filesystem', 'writeFile', { path: file.name, data: await base64(file), directory: 'CACHE' });
  try {
    await call('Share', 'share', { title, files: [uri] });
    return true;
  } catch (err) {
    if (/cancel/i.test(String(err?.message || err))) return false;
    throw err;
  }
}

/** Android's back button (and back gesture): handler() runs instead of leaving the app. */
export function onBackButton(handler) {
  listen('App', 'addListener', { eventName: 'backButton' }, () => handler());
}

/** Close the app (Android, from the home screen's back button). */
export const exitApp = () => call('App', 'exitApp').catch(() => { /* stay */ });
