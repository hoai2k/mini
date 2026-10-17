// The door in front of a private site: the shared invite gate (gate.js, a
// byte-identical copy of the one the games carry), with one difference.
//
// The owner's public-access switch (/public-access.json) opens the games to
// everyone for a while. It must never open these pages, so while the door is
// deciding, this answers that one request with "off" itself. A visitor with a
// real invite pass gets in as anywhere else; nobody else does, switch or not.
//
// A page opts in with three things, all in its own HTML:
//   <html class="site-locked" data-private-site="name" data-private-title="Title">
//   <style>html.site-locked body>*:not(.gate-veil){visibility:hidden}</style>
//   <script type="module" src="../shared/private-site.js"></script>
// The class keeps the page hidden until the door opens (and for good if
// scripts are off). Like the games, the door is off on localhost.
import { openGate } from './gate.js';

const root = document.documentElement;
const name = root.dataset.privateSite || location.pathname;
const title = root.dataset.privateTitle || document.title;

const realFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = typeof input === 'string' ? input : input?.url ?? String(input);
  if (new URL(url, location.href).pathname === '/public-access.json') {
    return Promise.resolve(new Response('{"publicAccess":false}', {
      headers: { 'Content-Type': 'application/json' },
    }));
  }
  return realFetch(input, init);
};

openGate({
  title,
  game: `site:${name}`,
  blurb: 'This page is a private preview for friends of Hoai Nguyen. Use your invite link, or enter your code below.',
}).then(() => {
  window.fetch = realFetch;
  root.classList.remove('site-locked');
});
