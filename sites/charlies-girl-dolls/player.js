// Track list player. The recordings are the race game's own music files, so
// the page does not carry a second copy; they stream from the game's
// assets/music folder. Any further roots listed here are tried in turn; the
// first one that loads wins.
(function () {
  var AUDIO_ROOTS = ['https://www.hoai.net/games/americangirldollrace/assets/music/'];
  // Recordings that live with the sites rather than a game: this site's own
  // music/ folder first, then the shared sites/music/ folder.
  var LOCAL_ROOTS = ['music/', '../music/'];
  var buttons = Array.prototype.slice.call(
    document.querySelectorAll('#tracks .track'),
  );
  var player = document.getElementById('player');
  var audio = document.getElementById('audio');
  var title = document.getElementById('now-title');
  var note = document.getElementById('player-note');
  if (!buttons.length || !player || !audio || !title || !note) return;

  var current = -1;
  var rootIndex = 0;

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

  function roots() {
    var b = buttons[current];
    return b && b.hasAttribute('data-local') ? LOCAL_ROOTS : AUDIO_ROOTS;
  }

  function load(file, autoplay) {
    audio.src = roots()[rootIndex] + encodeURIComponent(file);
    audio.load();
    if (autoplay) {
      var attempt = audio.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    }
  }

  audio.addEventListener('error', function () {
    var button = buttons[current];
    if (!button) return;
    if (rootIndex < roots().length - 1) {
      rootIndex += 1;
      load(button.dataset.src, true);
    } else {
      note.hidden = false;
    }
  });

  // Play the next song when one ends, like the race does between worlds.
  audio.addEventListener('ended', function () {
    select((current + 1) % buttons.length, true);
  });

  buttons.forEach(function (button, index) {
    button.setAttribute('aria-pressed', 'false');
    button.addEventListener('click', function () {
      if (index === current) {
        if (audio.paused) {
          var attempt = audio.play();
          if (attempt && attempt.catch) attempt.catch(function () {});
        } else audio.pause();
        return;
      }
      select(index, true);
    });
  });
})();
