// The prologue's how-to-play hints (the training board): each is shown once,
// when it is first useful (story/openingFlow.js says when), in the words of
// the device being played: a controller, the keyboard and mouse, or touch.
// Pure (the node tests load it).
import { t } from '../text_config.js';

export const HINTS = ['move', 'jump', 'melee', 'dodge', 'ranged'];

// (the words themselves are in the text config: prologue.hints.<id>.<pad|kbm|touch>)
const WORDS = Object.fromEntries(HINTS.map((id) => [id, t(`prologue.hints.${id}`)]));

// The hint's words for a device id ('kbm', 'touch', 'pad0'...).
export function prologueHint(id, device = 'kbm') {
  const w = WORDS[id]; if (!w) return '';
  if (w.all) return w.all;
  const kind = String(device).startsWith('pad') ? 'pad' : device === 'touch' ? 'touch' : 'kbm';
  return w[kind];
}
