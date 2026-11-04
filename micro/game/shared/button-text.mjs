// Finds controller buttons named in bare words in player-facing text ("Press
// A", "(X)", "hold B", "LT/RT", a keyboard key in brackets like "(E)"), which
// should be {btn:A} placeholders so the text shows the button's icon (the
// Xbox glyph, or the keyboard key when no controller is connected). Used by
// button-text.test.mjs over text_config.js and the worlds' sources.

const PAD = 'A|B|X|Y|LB|RB|LT|RT|LS|RS|View|Menu|Start';
const KEYS = 'E|R|Q|F|Z|C|V|Space|Shift|Tab|Esc|Enter';

// Each rule: a regex over prose with the {btn:…} placeholders and markup taken out.
export const RULES = [
  // "(A)", "(hold B)", "(X in the air)", "(RS or Y …)", "(E)" — a button or key first in brackets.
  { name: 'bracketed button', re: new RegExp(`\\((?:hold |tap |press |mash |hold and release )?(?:${PAD}|${KEYS}|D-pad)(?=[)\\s,/])`, 'g') },
  // "Press A", "hold B", "Tap A", "Mash A", "release RT", "pressing X".
  { name: 'verb + button', re: new RegExp(`\\b(?:[Pp]ress(?:es|ing)?|[Hh]old(?:s|ing)?|[Tt]ap(?:s|ping)?|[Mm]ash(?:es|ing)?|[Rr]elease|[Ll]et go of|[Cc]lick) (?:and release )?(?:the )?(?:${PAD}|D-pad)\\b`, 'g') },
  // "A to try again", "X drills", "Y again", "A toggles", "LB/RB cycle".
  { name: 'button + verb', re: new RegExp(`(?:^|[\\s(·:;,])(?:${PAD})(?:/(?:${PAD}))? (?:to|again|toggles|closes|drills|fires|shoves|pushes|thickens|spreads|turns?|cycles?|back|there|or [A-Z]{1,2}\\b)`, 'g') },
  // Shoulder buttons, triggers and sticks: never prose, so any bare mention counts.
  { name: 'bare shoulder/trigger/stick', re: /\b(?:LB|RB|LT|RT|LS|RS)\b/g },
  { name: 'bare D-pad', re: /\bD-pad\b/g },
];

const BTN_ONLY = new RegExp(`^(?:${PAD}|D-pad)(?: click| [↑↓←→]+)?(?:\\s*[/+]\\s*(?:${PAD}|D-pad)(?: click| [↑↓←→]+)?)*$`);

/** Prose with {btn:…} placeholders, ${…} template holes and markup removed. */
export function prose(s) {
  return String(s).replace(/\{btn:[^{}]+\}/g, '□').replace(/\$\{[^{}]*\}/g, '□').replace(/<[^>]*>/g, '');
}

/** The bare button mentions in one string: [{ rule, match }]. */
export function findBare(s) {
  if (BTN_ONLY.test(String(s).trim())) return []; // a controls row's button cell
  const p = prose(s);
  const out = [];
  for (const { name, re } of RULES) for (const m of p.matchAll(re)) out.push({ rule: name, match: m[0].trim() });
  return out;
}

/** Every string under a value, as [dotted key, string]. */
export function strings(v, key = '', out = []) {
  if (typeof v === 'string') out.push([key, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${key}[${i}]`, out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, key ? `${key}.${k}` : k, out);
  return out;
}
