// The door in front of a private site: the shared invite gate (gate.js, a
// byte-identical copy of the one the games carry), opened with
// `ignorePublicAccess: true`. The owner's public-access switch opens the games to
// everyone for a while; it never opens these pages. A visitor holding a real
// invite pass gets in as anywhere else; nobody else does.
//
// A page opts in with three things, all in its own HTML:
//   <html class="site-locked" data-private-site="name" data-private-title="Title">
//   <style>html.site-locked body>*:not(.gate-veil){visibility:hidden}</style>
//   <script type="module" src="../shared/private-site.js"></script>
// The class keeps the page hidden until the door opens (and for good if
// scripts are off). Like the games, the door is off on localhost.
import { openGate } from './gate.js';

const root = document.documentElement;

openGate({
  title: root.dataset.privateTitle || document.title,
  game: `site:${root.dataset.privateSite || location.pathname}`,
  blurb: 'This page is a private preview for friends of Hoai Nguyen. Use your invite link, or enter your code below.',
  ignorePublicAccess: true,
}).then(() => root.classList.remove('site-locked'));
