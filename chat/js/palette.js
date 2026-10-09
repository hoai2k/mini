// The player's colour is a colour name (blue means blue), and each theme
// picks its own shade of it: candy for Kid, neon for Teen, printing inks
// for Art, Rococo pastels for Classical. The Kid shade is what is saved and
// sent to the others; everything on screen goes through themedColor.
export const COLOR_NAMES = ['pink', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'rose'];
export const PALETTES = {
  kid: ['#ff5fa2', '#ff8c42', '#ffd43b', '#69db7c', '#3fe0d0', '#4dabf7', '#9775fa', '#f783ac'],
  teen: ['#ff2e88', '#ff7a1a', '#ffe03a', '#2ee87a', '#14e0d0', '#3d8bff', '#a35cff', '#ff7ac0'],
  art: ['#d83a74', '#e5611c', '#e3a91f', '#2f8a4c', '#1c7d78', '#2346a8', '#5d3a91', '#e57a92'],
  classic: ['#d77897', '#e19a6c', '#d6b04f', '#8fae7a', '#6fb3ad', '#7fa3d4', '#a68bc8', '#e6a3b3'],
};
export const COLORS = PALETTES.kid;

let theme = 'teen';
export function setColorTheme(t) { theme = PALETTES[t] ? t : 'teen'; }
export function colorName(c) { return COLOR_NAMES[COLORS.indexOf(String(c).toLowerCase())]; }
export function themedColor(c, t = theme) {
  const i = COLORS.indexOf(String(c ?? '').toLowerCase());
  return i < 0 ? c : PALETTES[t][i];
}
