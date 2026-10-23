// Item icons: the icon sheets of design/image-requests.md "Round 6 · Loot"
// (icons-weapons-1, icons-weapons-2, icons-armour, icons-magic), each a grid
// of 256-pixel cells on flat magenta. Once a sheet is delivered to
// game/assets/ and named in assets/icons.json, loadIcons() keys out the
// magenta, cuts the cells and maps each item id to its picture; until then
// (or if a sheet fails to load) the item's emoji (loot.js `icon`) stands in.
// Only sheets listed in icons.json are requested, so a missing sheet never
// costs a failed request (test/loot.test.mjs keeps the list in step with the
// files in the folder).
//
// The cell order is the request's (build_requests.py icon_sheet lists), read
// left to right, top to bottom.
export const CELL = 256;
export const ICON_SHEETS = {
  'icons-weapons-1': { cols: 4, rows: 4, ids: ['training_sword', 'bronze_dagger', 'camp_spear', 'club', 'bronze_axe', 'shepherd_crook', 'xiphos', 'hammer', 'reed_staff', 'lamer', 'labrys', 'kopis', 'dory', 'fang_dagger', 'ram_mace', 'forge_sword'] },
  'icons-weapons-2': { cols: 4, rows: 4, ids: ['backbiter', 'stygian_blade', 'twin_daggers', 'imperial_gladius', 'harpe', 'heracles_club', 'pelian_spear', 'ares_sword', 'boreas_axe', 'storm_spear', 'trident_blade', 'hunter_knives', 'fury_lash', 'minotaur_horn', 'chimera_fang', 'procrustes_axe'] },
  'icons-armour': { cols: 6, rows: 4, ids: ['camp_shirt', 'bronze_breastplate', 'hermes_uniform', 'linothorax', 'biker_jacket', 'hunter_parka', 'sea_armor', 'hoplite_panoply', 'spartan_cloak', 'satyr_vest', 'nemean_pelt', 'fleece_cloak', 'forge_apron', 'amazon_armor', 'achilles_armor', 'hebe_robe', 'wind_cloak', 'hermes_cap', 'counsellor_vest', 'lotus_robe', 'mist_cloak', 'fury_wings', 'hellhound_hide', 'drakon_scale'] },
  'icons-magic': { cols: 7, rows: 4, ids: ['master_bolt', 'hephaestus_net', 'medusa_head', 'nemesis_coin', 'aegis', 'pegasus_whistle', 'nectar_flask', 'bag_of_winds', 'helm_of_darkness', 'winged_shoes', 'greek_fire', 'zeus_thunder', 'orpheus_lyre', 'apple_of_discord', 'athena_owl', 'ariadne_thread', 'caduceus', 'boar_tusk', 'trident_charm', 'sun_chariot', 'kronos_hourglass', 'cornucopia', 'stymphalian_feathers', 'ares_shield', 'lotus_card', 'cerberus_ball', 'dionysus_vine', 'hermes_vitamins'] },
};
// item id -> [sheet, cell index]
export const ICON_CELL = Object.fromEntries(Object.entries(ICON_SHEETS).flatMap(([sheet, S]) => S.ids.map((id, i) => [id, [sheet, i]])));

const urls = new Map();   // item id -> data URL of its cell
let loading = null;
// How magenta a pixel is → its alpha (as ui/art.js keyMagenta, without the trim).
function keyCanvas(img, w, hh) {
  const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, hh);
  const id = ctx.getImageData(0, 0, w, hh), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], m = Math.min(r, b) - g;
    const a = 1 - Math.min(1, Math.max(0, (m - 60) / 110));
    if (a >= 1) continue;
    if (a <= 0.02) { d[i + 3] = 0; continue; }
    d[i] = Math.max(0, Math.min(255, (r - (1 - a) * 255) / a)); d[i + 2] = Math.max(0, Math.min(255, (b - (1 - a) * 255) / a)); d[i + 3] = Math.round(d[i + 3] * a);
  }
  ctx.putImageData(id, 0, 0);
  return c;
}
function cutSheet(name, img, size = 128) {
  const S = ICON_SHEETS[name]; if (!S) return 0;
  const keyed = keyCanvas(img, S.cols * CELL, S.rows * CELL);
  let n = 0;
  S.ids.forEach((id, i) => {
    const c = document.createElement('canvas'); c.width = size; c.height = size;
    c.getContext('2d').drawImage(keyed, (i % S.cols) * CELL, Math.floor(i / S.cols) * CELL, CELL, CELL, 0, 0, size, size);
    urls.set(id, c.toDataURL('image/png')); n++;
  });
  return n;
}
// Load the delivered sheets (named in assets/icons.json). Never rejects.
export function loadIcons(base = 'assets/') {
  if (loading || typeof document === 'undefined') return loading ?? Promise.resolve(0);
  loading = fetch(base + 'icons.json').then((r) => (r.ok ? r.json() : { sheets: [] })).catch(() => ({ sheets: [] })).then((m) =>
    Promise.all((m.sheets ?? []).filter((s) => ICON_SHEETS[s]).map((s) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { try { resolve(cutSheet(s, img)); } catch (e) { console.warn('icons: could not cut', s, e); resolve(0); } };
      img.onerror = () => { console.warn('icons: could not load', s); resolve(0); };
      img.src = `${base}${s}.png`;
    })))).then((ns) => ns.reduce((a, b) => a + b, 0));
  return loading;
}
export const iconUrl = (id) => urls.get(id) ?? null;
// The icon to put in a tile or a card: the sheet's picture, else the emoji.
export function iconNode(base) {
  const u = base && iconUrl(base.id);
  if (!u || typeof document === 'undefined') return base?.icon ?? '?';
  const img = document.createElement('img'); img.className = 'ico-img'; img.src = u; img.alt = ''; img.draggable = false;
  return img;
}
