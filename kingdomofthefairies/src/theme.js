// Presence of ?widowsbay opts into the preserved music-video edition.
// Headless tests choose with KOTF_EDITION=widowsbay.
export const LEGACY = (typeof location !== 'undefined' && new URLSearchParams(location.search).has('widowsbay'))
  || (typeof process !== 'undefined' && process.env?.KOTF_EDITION === 'widowsbay');
// The default edition follows Méliès's 1903 film (design/film-adaptation.md).
export const FILM = !LEGACY;
export const TITLE = LEGACY ? "Widow's Bay" : 'Kingdom of the Fairies';
export const BAY_TITLE = LEGACY ? "Widow's Bay" : 'The Enchanted Tower';
export const STORAGE_PREFIX = LEGACY ? 'widowsbay' : 'kingdomofthefairies';

export function themeManifest(manifest, legacy = LEGACY) {
  // The film edition's own slots (production requests, interim cut-outs,
  // tableaux) never load in the query edition.
  if (legacy) return { ...manifest, slots: Object.fromEntries(Object.entries(manifest.slots || {}).filter(([, s]) => s.edition !== 'film')) };
  // A requested film slot with an interim cut-out (design/source/cut_planning.py)
  // loads that until its own art is delivered.
  const slots = Object.fromEntries(Object.entries(manifest.slots || {}).filter(([id]) => !id.startsWith('band-'))
    .map(([id, s]) => [id, s.status === 'requested' && s.interim ? { ...s, status: 'delivered', file: s.interim, interimArt: true } : s]));
  slots.logo = { status: 'delivered', file: 'fairies-title.webp' };
  const anims = Object.fromEntries(Object.entries(manifest.anims || {}).filter(([id, slot]) =>
    !id.includes('band-') && !String(slot.file).includes('band-')));
  const { song, ...audio } = manifest.audio || {};
  return { ...manifest, slots, anims, audio };
}

export function applyDocumentTheme() {
  document.title = TITLE + (location.pathname.includes('/workbench/') ? ' · Workbench' : '');
  // Each edition's instructions pages and tabs; the other edition's are
  // marked ed-off so the shell never shows them.
  for (const el of document.querySelectorAll(LEGACY ? '[data-film-only]' : '[data-legacy-only]')) { el.classList.add('ed-off'); el.hidden = true; }
  if (!LEGACY) return;
  for (const el of document.querySelectorAll('[data-widowsbay]')) el.textContent = el.dataset.widowsbay;
  for (const el of document.querySelectorAll('[data-legacy-only]:not(.ins-page)')) el.hidden = false;
  const stage = document.querySelector('#stage'); if (stage) stage.setAttribute('aria-label', TITLE + ' stage');
  const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]'); if (meta) meta.content = TITLE;
  const manifest = document.querySelector('link[rel="manifest"]'); if (manifest) manifest.href = 'manifest-widowsbay.webmanifest';
  for (const el of document.querySelectorAll('link[data-legacy-icon]')) el.href = el.dataset.legacyIcon;
}

// The film edition's cast: a legacy sprite id drawn as its film counterpart
// whenever that art is loaded (delivered, or an interim cut-out), else the
// legacy art. Acts add their own with a `cast` map (src/acts/CONTRACT.md).
export const FILM_CAST = {
  ...Object.fromEntries(['stand', 'walk-a', 'walk-b', 'leap', 'crouch', 'carry', 'swim-a', 'swim-b', 'seated', 'hang', 'pullup',
    'climb-a', 'climb-b', 'apex', 'fall', 'land', 'stairs-a', 'stairs-b'].map((p) => ['sailor-' + p, 'prince-' + p])),
  'sailor-throw': 'prince-push',
  'reveller-yellow': 'crew-squire', 'reveller-jester': 'crew-helmsman', 'reveller-lady': 'crew-manatarms', 'reveller-shaggy': 'crew-bosun',
  'guitar-sinking': 'sword-sinking', 'tea-leaf': 'aurora-star',
  'keepsake-guitar': 'keepsake-sword', 'keepsake-tea': 'keepsake-star', 'keepsake-rose': 'keepsake-shell',
  'keepsake-pearl': 'keepsake-seal', 'keepsake-stone': 'keepsake-lamp',
  ship: 'galley', 'ship-wreck-bow': 'galley-wreck-bow', 'ship-wreck-stern': 'galley-wreck-stern',
  'sentry-creature-closed': 'lobster-guard-closed', 'sentry-creature-open': 'lobster-guard-open',
  'gaze-lantern': 'scrying-eye', 'beloved-stand': 'azurine-stand', playbill: 'playbill-film',
};

// The delivered prince poses were fitted to fill their canvases, not to one
// body scale as the sailor's were (sailor-motion.js), so he grew as he
// climbed. Each factor scales a pose about its feet (bottom centre) to the
// standing pose's head size: measured by matching prince-stand's helmet and
// face in each pose, against the sailor's own pose-to-pose ratios.
export const FILM_BODY_SCALE = {
  'prince-leap': 1.14, 'prince-seated': 1.22, 'prince-carry': 0.95,
  'prince-climb-a': 0.81, 'prince-climb-b': 0.81, 'prince-apex': 0.93, 'prince-fall': 0.84,
  'prince-land': 0.76, 'prince-stairs-a': 0.76, 'prince-stairs-b': 0.78, 'prince-push': 0.82,
};

