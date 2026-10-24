// Inline SVG: the buttons, and the stand-in pictures drawn until the artwork in
// design/image-requests.md is delivered.

const svg = (body, view = '0 0 24 24') => `<svg viewBox="${view}" aria-hidden="true" focusable="false">${body}</svg>`;

export const ICONS = {
  play: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  pause: svg('<rect x="6.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1.2" fill="currentColor"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>'),
  settings: svg('<path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8zm8.2 4.6.1-1.2-.1-1.2 2-1.6-2-3.4-2.4 1a8 8 0 0 0-2-1.2L15.4 3h-4l-.4 2.6a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6-.1 1.2.1 1.2-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2 1.2l.4 2.6h4l.4-2.6a8 8 0 0 0 2-1.2l2.4 1 2-3.4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  minus: svg('<path d="M6 12h12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  plus: svg('<path d="M6 12h12M12 6v12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  speaker: svg('<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'),
};

const BRASS = '<defs><linearGradient id="br" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a5a2c"/><stop offset=".45" stop-color="#e3c27f"/><stop offset=".7" stop-color="#c9a15b"/><stop offset="1" stop-color="#6d4f25"/></linearGradient></defs>';

// Stand-in pictures, one per chime instrument (keys match the asset ids).
export const STANDINS = {
  bowl: svg(`${BRASS}<ellipse cx="100" cy="164" rx="78" ry="16" fill="#0b0e18" opacity=".55"/>
    <ellipse cx="100" cy="150" rx="74" ry="20" fill="#2b3456"/><ellipse cx="100" cy="146" rx="74" ry="18" fill="#39436b"/>
    <path d="M38 92h124c0 34-26 58-62 58S38 126 38 92z" fill="url(#br)"/>
    <ellipse cx="100" cy="92" rx="62" ry="14" fill="#5a4120"/><ellipse cx="100" cy="92" rx="62" ry="14" fill="none" stroke="#f0d79c" stroke-width="2.5"/>
    <rect x="132" y="104" width="54" height="9" rx="4.5" transform="rotate(-32 159 108)" fill="#8a5a33"/>`, '0 0 200 190'),
  'instrument-bowl-large': svg(`${BRASS}<ellipse cx="50" cy="78" rx="38" ry="7" fill="#000" opacity=".3"/>
    <path d="M12 44h76c0 20-17 33-38 33S12 64 12 44z" fill="url(#br)"/><ellipse cx="50" cy="44" rx="38" ry="8" fill="#5a4120" stroke="#f0d79c" stroke-width="1.5"/>`, '0 0 100 90'),
  'instrument-bowl-small': svg(`${BRASS}<ellipse cx="50" cy="78" rx="24" ry="5" fill="#000" opacity=".3"/>
    <path d="M27 40h46c0 22-10 37-23 37S27 62 27 40z" fill="url(#br)"/><ellipse cx="50" cy="40" rx="23" ry="5.5" fill="#6b4c22" stroke="#f6e2ad" stroke-width="1.5"/>`, '0 0 100 90'),
  'instrument-rin': svg(`${BRASS}<path d="M18 70h64l-6 12H24z" fill="#8c1f22"/><path d="M22 66h56v6H22z" fill="#c8963a"/>
    <path d="M28 34h44c2 18-6 32-22 32S26 52 28 34z" fill="url(#br)"/><ellipse cx="50" cy="34" rx="21" ry="5" fill="#5a4120" stroke="#f0d79c" stroke-width="1.5"/>`, '0 0 100 90'),
  'instrument-tingsha': svg(`${BRASS}<path d="M34 38c4-14 28-14 32 0" fill="none" stroke="#6b4a2c" stroke-width="2.5"/>
    <ellipse cx="34" cy="58" rx="20" ry="13" fill="url(#br)"/><ellipse cx="34" cy="56" rx="7" ry="4.5" fill="#a07b3c"/>
    <ellipse cx="66" cy="60" rx="20" ry="13" fill="url(#br)"/><ellipse cx="66" cy="58" rx="7" ry="4.5" fill="#a07b3c"/>`, '0 0 100 90'),
  'instrument-koshi': svg(`<path d="M50 4v10" stroke="#b9a07a" stroke-width="2"/><rect x="34" y="14" width="32" height="44" rx="4" fill="#d8c08c" opacity=".9"/>
    <g stroke="#e9eef6" stroke-width="2.2"><path d="M40 20v32M45 20v30M50 20v33M55 20v31M60 20v32"/></g>
    <rect x="32" y="12" width="36" height="5" rx="2" fill="#8a5a33"/><rect x="32" y="56" width="36" height="5" rx="2" fill="#8a5a33"/>
    <path d="M50 61v12" stroke="#b9a07a" stroke-width="1.5"/><circle cx="50" cy="79" r="7" fill="#8a5a33"/>`, '0 0 100 90'),
  'instrument-bell': svg(`<path d="M18 10h64M24 10v6M76 10v6" stroke="#6b4a2c" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 16v6" stroke="#b9a07a" stroke-width="3"/>
    <path d="M34 26c0-6 32-6 32 0v40c0 4 4 6 6 8H28c2-2 6-4 6-8z" fill="#5f8a78"/>
    <path d="M36 32h28M36 62h28" stroke="#3f6455" stroke-width="2"/><g fill="#7fa898"><circle cx="41" cy="40" r="2"/><circle cx="50" cy="40" r="2"/><circle cx="59" cy="40" r="2"/></g>`, '0 0 100 90'),
};
