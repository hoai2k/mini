// ?debug=play — turn the in-page player back on.
//
// The band pages publish their catalogues as lists rather than players: one
// or two tracks link out to Spotify, the rest are listed and greyed. The
// playback code was never removed, only switched off, and this is the switch.
//
// With ?debug=play in the URL, every row goes back to being a play button —
// the Spotify links included — the duration each row was showing before
// returns from its data-dur, the player element is revealed, and the page's
// own player.js drives it — brought in here when the page was not already
// loading it, and left alone when it was. Without the flag this file does
// nothing at all, which is the point: one script tag on a page costs a
// request and changes nothing until it is asked to.
//
// It is a convenience, not a secret. Anyone who reads the page source can
// find the flag; nothing here is private, and the recordings it plays are
// already served publicly by the games. Treat it as "the author's view of
// the page", not as access control.
(function () {
  if (!/(?:^|[?&])debug=play(?:&|$)/.test(window.location.search)) return;

  var rows = Array.prototype.slice.call(document.querySelectorAll('.track'));
  if (!rows.length) return;

  rows.forEach(function (row) {
    row.classList.remove('is-quiet');
    // A Spotify link becomes a play button again. Swapping the element keeps
    // the page's own player.js unchanged: it looks for buttons, and by the
    // time it runs these are buttons, carrying the same data-src they always
    // carried.
    if (row.tagName === 'A') {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = row.className;
      Object.keys(row.dataset).forEach(function (key) {
        button.dataset[key] = row.dataset[key];
      });
      var label = row.querySelector('strong');
      if (label) button.setAttribute('aria-label', 'Play ' + label.textContent);
      button.innerHTML = row.innerHTML;
      row.parentNode.replaceChild(button, row);
      row = button;
    } else {
      row.disabled = false;
    }
    // Put back what the row said before it was a link or a "Coming soon".
    var d = row.querySelector('.d');
    if (d && row.dataset.dur) d.textContent = row.dataset.dur;
  });

  var player = document.getElementById('player');
  if (player) player.hidden = false;

  // A page that already loads its own player.js — because one of its songs
  // plays for everyone — needs nothing more: this file runs before it, so it
  // finds the unlocked rows. Only a page whose player is switched off entirely
  // needs the script brought in.
  if (!document.querySelector('script[src="player.js"]')) {
    var script = document.createElement('script');
    script.src = 'player.js';
    document.body.appendChild(script);
  }

  document.documentElement.setAttribute('data-debug-play', 'on');
})();
