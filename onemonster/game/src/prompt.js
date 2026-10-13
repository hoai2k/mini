// In-world prompts shared by the chapters and boards: a speech-bubble that says
// which button to press right now ("A  Grab!"), a bobbing marker over the
// target, and a ring round the letter, drawn in the book's ink-and-cream style.
// env.inputKind ('controller' | 'keyboard' | 'touch') picks the button's name.

const INK = '#33241a';
const CREAM = 'rgba(251,246,232,0.96)';

// The name of a button on the device in use. key: 'action' | 'sprint'.
export function buttonName(kind, key = 'action', side = 0) {
  if (kind === 'controller') return key === 'action' ? 'A' : 'B';
  if (kind === 'touch') return key === 'action' ? 'Tap' : 'Sprint';
  if (side === 1) return key === 'action' ? 'Enter' : 'R-Shift';
  return key === 'action' ? 'Space' : 'Shift';
}

// A bubble above (x, y) pointing down at it: [button] text. pulse 0..1 makes
// it throb (use for "now!").
export function actionPrompt(g, x, y, text, { kind = 'keyboard', key = 'action', side = 0, t = 0, pulse = 0, size = 34 } = {}) {
  const btn = buttonName(kind, key, side);
  g.save();
  const s = 1 + Math.sin(t * 9) * 0.05 * pulse;
  g.translate(x, y);
  g.scale(s, s);
  g.font = `800 ${size}px Fraunces, Georgia, serif`;
  const tw = g.measureText(text).width;
  g.font = `800 ${size * 0.72}px Questrial, sans-serif`;
  const bw = Math.max(size * 1.15, g.measureText(btn).width + size * 0.6);
  const w = bw + tw + size * 0.9;
  const h = size * 1.55;
  const x0 = -w / 2, y0 = -h - 22;
  g.fillStyle = CREAM;
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect ? g.roundRect(x0, y0, w, h, h / 2) : g.rect(x0, y0, w, h);
  g.moveTo(-12, y0 + h); g.lineTo(0, -6); g.lineTo(12, y0 + h);
  g.fill();
  g.stroke();
  g.fillStyle = CREAM;
  g.fillRect(-10, y0 + h - 4, 20, 6);
  // The button.
  const bx = x0 + size * 0.3, by = y0 + (h - size * 1.1) / 2, bh = size * 1.1;
  g.fillStyle = kind === 'controller' ? (key === 'action' ? '#4caf50' : '#d9443d') : '#f3e9d2';
  g.beginPath();
  g.roundRect ? g.roundRect(bx, by, bw, bh, kind === 'controller' ? bh / 2 : 8) : g.rect(bx, by, bw, bh);
  g.fill();
  g.lineWidth = 2.5;
  g.stroke();
  g.fillStyle = kind === 'controller' ? '#fff' : INK;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(btn, bx + bw / 2, by + bh / 2 + 1);
  g.font = `800 ${size}px Fraunces, Georgia, serif`;
  g.fillStyle = INK;
  g.textAlign = 'left';
  g.fillText(text, bx + bw + size * 0.3, y0 + h / 2 + 2);
  g.restore();
}

// A bobbing down-arrow over a target, with an optional label ("The letter!").
export function marker(g, x, y, { t = 0, label = '', colour = '#b5463a', size = 1 } = {}) {
  g.save();
  g.translate(x, y + Math.sin(t * 5) * 8 * size);
  g.scale(size, size);
  g.fillStyle = colour;
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-22, -46); g.lineTo(22, -46); g.lineTo(22, -24); g.lineTo(34, -24); g.lineTo(0, 0); g.lineTo(-34, -24); g.lineTo(-22, -24);
  g.closePath();
  g.fill();
  g.stroke();
  if (label) {
    g.font = '800 30px Fraunces, Georgia, serif';
    g.textAlign = 'center';
    g.lineWidth = 8;
    g.strokeStyle = CREAM;
    g.strokeText(label, 0, -60);
    g.fillStyle = INK;
    g.fillText(label, 0, -60);
  }
  g.restore();
}

// A small envelope icon with a dashed ring: "the letter is here".
export function letterTag(g, x, y, { t = 0, r = 46 } = {}) {
  g.save();
  g.translate(x, y);
  g.strokeStyle = '#b5463a';
  g.lineWidth = 3.5;
  g.setLineDash([9, 7]);
  g.lineDashOffset = -t * 30;
  g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  g.setLineDash([]);
  g.fillStyle = '#fbf6e8';
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.fillRect(-20, -14, 40, 28); g.strokeRect(-20, -14, 40, 28);
  g.beginPath(); g.moveTo(-20, -14); g.lineTo(0, 3); g.lineTo(20, -14); g.stroke();
  g.fillStyle = '#b5463a'; g.fillRect(9, -10, 7, 8);
  g.restore();
}
