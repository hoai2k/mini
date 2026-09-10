// Track list player. The recordings are the game's own music files and
// stream from the deployed game, so the page carries no copies. data-src is
// a path under the game's root (music/…, music/arenas/…, sound/…); each
// segment is URL-encoded before it is requested.
(function () {
  var GAME_ROOTS = ['https://games.hoai.net/mechmayhem/'];
  var buttons = Array.prototype.slice.call(
    document.querySelectorAll('[data-tracks] .track'),
  );
  var player = document.getElementById('player');
  var audio = document.getElementById('audio');
  var title = document.getElementById('now-title');
  var note = document.getElementById('player-note');
  if (!buttons.length || !player || !audio || !title || !note) return;

  var current = -1;
  var rootIndex = 0;

  function url(root, path) {
    return root + path.split('/').map(encodeURIComponent).join('/');
  }

  function play() {
    var attempt = audio.play();
    if (attempt && attempt.catch) attempt.catch(function () {});
  }

  function load(path, autoplay) {
    audio.src = url(GAME_ROOTS[rootIndex], path);
    audio.load();
    if (autoplay) play();
  }

  function select(index, autoplay) {
    var button = buttons[index];
    if (!button) return;
    current = index;
    buttons.forEach(function (b, i) {
      b.setAttribute('aria-pressed', i === index ? 'true' : 'false');
    });
    title.textContent = button.querySelector('strong').textContent;
    player.hidden = false;
    note.hidden = true;
    rootIndex = 0;
    load(button.dataset.src, autoplay);
  }

  audio.addEventListener('error', function () {
    var button = buttons[current];
    if (!button) return;
    if (rootIndex < GAME_ROOTS.length - 1) {
      rootIndex += 1;
      load(button.dataset.src, true);
    } else {
      note.hidden = false;
    }
  });

  // Roll into the next track when one ends, like the arena does between rounds.
  audio.addEventListener('ended', function () {
    select((current + 1) % buttons.length, true);
  });

  buttons.forEach(function (button, index) {
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', 'Play ' + button.querySelector('strong').textContent);
    button.addEventListener('click', function () {
      if (index === current) {
        if (audio.paused) play();
        else audio.pause();
        return;
      }
      select(index, true);
    });
  });
})();
