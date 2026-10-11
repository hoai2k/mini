// Presence of ?widowsbay opts into the preserved music-video edition.
export const LEGACY = typeof location !== 'undefined' && new URLSearchParams(location.search).has('widowsbay');
export const TITLE = LEGACY ? "Widow's Bay" : 'Kingdom of the Fairies';
export const BAY_TITLE = LEGACY ? "Widow's Bay" : 'The Enchanted Tower';
export const STORAGE_PREFIX = LEGACY ? 'widowsbay' : 'kingdomofthefairies';

export function themeManifest(manifest) {
  if (LEGACY) return manifest;
  const slots = Object.fromEntries(Object.entries(manifest.slots || {}).filter(([id]) => !id.startsWith('band-')));
  slots.logo = { status: 'delivered', file: 'fairies-title.webp' };
  const anims = Object.fromEntries(Object.entries(manifest.anims || {}).filter(([id, slot]) =>
    !id.includes('band-') && !String(slot.file).includes('band-')));
  const { song, ...audio } = manifest.audio || {};
  return { ...manifest, slots, anims, audio };
}

export function applyDocumentTheme() {
  document.title = TITLE + (location.pathname.includes('/workbench/') ? ' · Workbench' : '');
  if (!LEGACY) return;
  for (const el of document.querySelectorAll('[data-widowsbay]')) el.textContent = el.dataset.widowsbay;
  for (const el of document.querySelectorAll('[data-legacy-only]')) el.hidden = false;
  const stage = document.querySelector('#stage'); if (stage) stage.setAttribute('aria-label', TITLE + ' stage');
  const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (meta) meta.content = TITLE;
  const manifest = document.querySelector('link[rel="manifest"]'); if (manifest) manifest.href = 'manifest-widowsbay.webmanifest';
  for (const el of document.querySelectorAll('link[data-legacy-icon]')) el.href = el.dataset.legacyIcon;
}
