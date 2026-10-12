// The prologue's how-to-play hints (the training board): each is shown once,
// when it is first useful (story/openingFlow.js says when), in the words of
// the device being played: a controller, the keyboard and mouse, or touch.
// Pure (the node tests load it).
export const HINTS = ['late', 'move', 'jump', 'melee', 'dodge', 'ranged'];

const WORDS = {
  late: { all: 'You’re late for the field trip! The gold arrow points to the school bus.' },
  move: { pad: 'Move: left stick', kbm: 'Move: WASD', touch: 'Move: drag on the left of the screen' },
  jump: { pad: 'Jump: A — hop over the dug-up sidewalk', kbm: 'Jump: Space — hop over the dug-up sidewalk', touch: 'Jump: ⤒ — hop over the dug-up sidewalk' },
  melee: { pad: 'Rats! Melee: X', kbm: 'Rats! Melee: left click', touch: 'Rats! Melee: ⚔' },
  dodge: { pad: 'Dodge: LB, or flick the right stick — roll out of the way', kbm: 'Dodge: Shift — roll out of the way', touch: 'Dodge: ⤳ — roll out of the way' },
  ranged: { pad: 'Ranged: RT — shoot them before they reach you', kbm: 'Ranged: right click — shoot them before they reach you', touch: 'Ranged: ✦ — shoot them before they reach you' },
};

// The hint's words for a device id ('kbm', 'touch', 'pad0'...).
export function prologueHint(id, device = 'kbm') {
  const w = WORDS[id]; if (!w) return '';
  if (w.all) return w.all;
  const kind = String(device).startsWith('pad') ? 'pad' : device === 'touch' ? 'touch' : 'kbm';
  return w[kind];
}
