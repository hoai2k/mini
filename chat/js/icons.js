// Line icons for the controls. Mic and camera carry a slash that CSS shows
// when the button is off (aria-pressed="false"), so muted reads as crossed
// out, not just as a colour change.

const svg = (body, slash = false) =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}${
    slash ? '<line class="slash-bg" x1="3" y1="3" x2="21" y2="21"/><line class="slash" x1="3" y1="3" x2="21" y2="21"/>' : ''
  }</svg>`;

export const ICONS = {
  mic: svg('<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><line x1="12" y1="18" x2="12" y2="21.5"/>', true),
  cam: svg('<rect x="2.5" y="6" width="13" height="12" rx="2.5"/><path d="M15.5 10.5 21.5 7v10l-6-3.5z"/>', true),
  sparkles: svg('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/><path d="M5 2.5l.5 1.3 1.3.5-1.3.5L5 6.1l-.5-1.3-1.3-.5 1.3-.5z"/>'),
  games: svg('<path d="M7 8h10a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.5 2.5 0 0 1-4.3 1.2L14.5 16.5h-5l-1.8 2.1a2.5 2.5 0 0 1-4.3-1.2l-.8-4A4.5 4.5 0 0 1 7 8z"/><line x1="8" y1="11" x2="8" y2="14"/><line x1="6.5" y1="12.5" x2="9.5" y2="12.5"/><circle cx="15.5" cy="11.5" r=".6" fill="currentColor"/><circle cx="17" cy="13.5" r=".6" fill="currentColor"/>'),
  chat: svg('<path d="M20.5 12a8 8 0 0 1-11.6 7.1L3.5 20.5l1.4-4.9A8 8 0 1 1 20.5 12z"/>'),
  leave: svg('<path d="M3.5 13.5c4.7-4.2 12.3-4.2 17 0l-2 2.4-3.2-1.2v-2.4a9 9 0 0 0-6.6 0v2.4l-3.2 1.2z" fill="currentColor"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
};

// Fills every [data-icon] element under root with its SVG.
export function applyIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    const icon = ICONS[el.dataset.icon];
    if (icon && !el.firstElementChild) el.innerHTML = icon;
  });
}
