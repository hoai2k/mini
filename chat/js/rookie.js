// Deliberately ordinary inputs, using each game's normal controls rather than
// forging scores or reading an opponent's hidden state. Runs in a bot iframe.
const pick = items => items[Math.floor(Math.random() * items.length)];
const visible = el => !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
const EASY_WORDS = 'cat dog sun tree house boat fish apple hat car red blue green sky sea rain snow ice hot cold big small ant bee bird cow pig bat rat pan pot pen cup run sit ten one two day toy ball'.split(' ');
function canSpell(board, word, cell = -1, used = 0, offset = 0) {
  if (offset === word.length) return true;
  return board.some((letter, i) => {
    if (!letter || used & (1 << i) || !word.startsWith(letter, offset)) return false;
    if (cell >= 0 && (Math.abs(Math.floor(cell / 4) - Math.floor(i / 4)) > 1 || Math.abs(cell % 4 - i % 4) > 1)) return false;
    return canSpell(board, word, i, used | (1 << i), offset + letter.length);
  });
}
export function driveRookie(current, step) {
  const { game, instance, el } = current;
  // Games that need aiming (Air Hockey, Minigolf, Bowling, Hoops) give the
  // bot a simple move of their own; it still presses buttons (lobbies,
  // rematches) but skips the random stick and pointer input below.
  const ownMove = typeof instance.rookie === 'function';
  if (ownMove) {
    try { instance.rookie(step); } catch (e) { console.warn('rookie move failed', e); }
  }
  const pressed = step % 5 === 0;
  const direction = Math.floor(step / 4) % 4;
  const pad = { x: Math.sin(step * 0.47) * 0.8, y: Math.cos(step * 0.31) * 0.8, rx: 0, ry: 0,
    up: direction === 0, right: direction === 1, down: direction === 2, left: direction === 3,
    a: pressed, b: false, xBtn: false, yBtn: false, rt: 0, lt: 0,
    pressed: [pressed], edge: k => k === 0 && pressed };
  if (!ownMove) instance.onPad?.(pad);
  if (game.id === 'wordblitz' && !ownMove && step % 12 === 0) {
    // Look only at the visible letters, and try an occasional simple word.
    const board = [...el.querySelectorAll('.wb-t')].map(t => t.textContent.toLowerCase());
    const found = [...el.querySelectorAll('.wb-w')].map(t => t.textContent.toLowerCase());
    const word = pick(EASY_WORDS.filter(w => !found.includes(w) && canSpell(board, w)));
    if (word) {
      for (const key of ['Escape', ...word, 'Enter']) document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    }
  }
  if (step % 3 !== 0) return;
  const buttons = [...el.querySelectorAll('button')].filter(visible);
  // Board games and card games expose legal choices as buttons. Prefer their
  // action area so answering / locking a fleet doesn't wait on cosmetic tools.
  const actions = buttons.filter(b => b.closest('.gf-bar') || /ready|lock|give|fish|ask|deal|start|choose|submit/i.test(b.textContent));
  pick(actions.length ? actions : buttons)?.click();
  if (game.id === 'doodle') {
    const input = el.querySelector('input');
    if (input && !input.disabled && visible(input)) {
      input.value = pick(['cat', 'sun', 'tree', 'house', 'boat', 'fish', 'apple']);
      input.closest('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }
  }
  // Rookie cursor movement, drawing and aiming. Pointer capture is intentionally
  // omitted for synthetic input; dispatch only inside this bot's game window.
  const canvas = el.querySelector('canvas');
  if (canvas && !ownMove) {
    // Synthetic events have no active OS pointer to capture.
    canvas.setPointerCapture = () => {};
    const r = canvas.getBoundingClientRect();
    const x = r.left + r.width * (0.15 + Math.random() * 0.7);
    const y = r.top + r.height * (0.15 + Math.random() * 0.7);
    const pointer = (type, px, py) => canvas.dispatchEvent(new PointerEvent(type, { pointerId: 1, pointerType: 'mouse', clientX: px, clientY: py, bubbles: true, buttons: type === 'pointerup' ? 0 : 1 }));
    pointer('pointermove', x, y);
    if (!['bowling', 'minigolf'].includes(game.id)) {
      pointer('pointerdown', x, y);
      pointer('pointermove', x + 30, y + 20);
      pointer('pointerup', x + 30, y + 20);
    }
  }
}
