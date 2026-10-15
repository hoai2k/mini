// Endless swipe for the genre ribbon on touch screens and under reduced
// motion (see the matching media query in styles.css). The track holds the
// genre list twice for the desktop marquee; here it gets more copies, starts
// in the middle, and after each swipe settles it jumps back by whole copies,
// which looks identical, so there is always more to swipe in both directions.
const SWIPE = '(pointer: coarse), (prefers-reduced-motion: reduce)';
const COPIES = 11;

const ribbon = document.querySelector('.ribbon');
const track = ribbon?.querySelector('.ribbon-track');

if (track) {
  const query = matchMedia(SWIPE);
  const original = [...track.children];
  const perCopy = original.length / 2;
  let settle = 0;

  const copyWidth = () =>
    track.children[perCopy].offsetLeft - track.children[0].offsetLeft;

  // Move to the same spot inside the middle copy.
  const recentre = () => {
    const w = copyWidth();
    if (!w) return;
    const middle = Math.floor(COPIES / 2) * w;
    ribbon.scrollLeft = middle + (((ribbon.scrollLeft - middle) % w) + w) % w;
  };

  // Wait until the swipe and its momentum stop, so the jump never cuts a
  // fling short.
  const onScroll = () => {
    clearTimeout(settle);
    settle = setTimeout(recentre, 150);
  };

  const setUp = () => {
    track.replaceChildren(...original);
    ribbon.removeEventListener('scroll', onScroll);
    ribbon.scrollLeft = 0;
    if (!query.matches) return;
    const set = original.slice(0, perCopy);
    for (let i = 2; i < COPIES; i++) {
      track.append(...set.map((span) => span.cloneNode(true)));
    }
    ribbon.scrollLeft = Math.floor(COPIES / 2) * copyWidth();
    ribbon.addEventListener('scroll', onScroll, { passive: true });
  };

  setUp();
  query.addEventListener('change', setUp);
  // The serif webfont changes the widths once it arrives.
  document.fonts?.ready.then(() => query.matches && setUp());
}
