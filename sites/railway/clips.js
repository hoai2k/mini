// Even rows for the live clips. The CSS grid alone fits as many clips per row
// as it can, which leaves a short last row (3 + 1, 4 + 1). Here every split
// into rows that differ by at most one clip is tried (4, 2 + 2, 1 + 1 + 1 + 1
// for four clips; 5, 3 + 2, ... for five) and the one whose clips come out
// closest to their usual width wins. Phones keep the single column from
// styles.css.
const IDEAL = 240;
const WIDE = matchMedia('(min-width: 561px)');
const grid = document.querySelector('.clips');

if (grid) {
  const count = grid.children.length;

  const layout = () => {
    if (!WIDE.matches || count < 2) {
      grid.style.gridTemplateColumns = '';
      return;
    }
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const room = grid.clientWidth;
    let best = 1;
    let bestScore = Infinity;
    for (let cols = 1; cols <= count; cols++) {
      // Even: the last row is full or one short (7 clips: 4 + 3 yes, 3 + 3 + 1 no).
      const last = count % cols || cols;
      if (last < cols - 1) continue;
      const width = (room - gap * (cols - 1)) / cols;
      if (width <= 0) continue;
      // Shrinking by half is as far off as growing to double.
      const score = Math.abs(Math.log(width / IDEAL));
      if (score < bestScore) {
        best = cols;
        bestScore = score;
      }
    }
    grid.style.gridTemplateColumns = `repeat(${best}, minmax(0, 1fr))`;
  };

  new ResizeObserver(layout).observe(grid);
  WIDE.addEventListener('change', layout);
  layout();
}
