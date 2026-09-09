// Track list player. The recordings are the game's own audio files, so the
// page does not carry a second copy: on the published site they sit at
// /mini/hopper/audio/, and in a checkout at hopper/game/public/audio/. The
// first location that loads wins.
(function () {
  var AUDIO_ROOTS = ['../../hopper/audio/', '../../hopper/game/public/audio/'];
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

  function load(file, autoplay) {
    audio.src = AUDIO_ROOTS[rootIndex] + file;
    audio.load();
    if (autoplay) {
      var attempt = audio.play();
      if (attempt && attempt.catch) attempt.catch(function () {});
    }
  }

  audio.addEventListener('error', function () {
    var button = buttons[current];
    if (!button) return;
    if (rootIndex < AUDIO_ROOTS.length - 1) {
      rootIndex += 1;
      load(button.dataset.src, true);
    } else {
      note.hidden = false;
    }
  });

  // Play the next recording when one ends, like the game does between areas.
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
