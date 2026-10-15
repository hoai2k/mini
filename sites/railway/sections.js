// Section links in the sticky masthead. While they fit on one line beside the
// band's name they stay a list; when they don't, they fold into a dropdown
// whose button names the part of the page in view (see .sections in
// styles.css). Either way the link for the part in view is marked current.
const nav = document.querySelector('.sections');
const masthead = nav?.closest('.masthead');
const toggle = nav?.querySelector('.sections-toggle');
const label = nav?.querySelector('.sections-current');
const links = nav ? [...nav.querySelectorAll('.sections-links a')] : [];
const targets = links.map((a) => document.querySelector(a.hash));
const TOP_LABEL = label?.textContent ?? '';
// Room to spare before the list counts as fitting, so it never sits cramped
// against the name.
const COMFORT = 24;

if (nav && masthead && toggle && label && targets.every(Boolean)) {
  const brand = masthead.querySelector('.brand');

  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };

  // Lay the links out as a single line and see whether that line fits.
  const fit = () => {
    nav.classList.remove('is-compact');
    nav.classList.add('is-list');
    toggle.hidden = true;
    const style = getComputedStyle(masthead);
    const room =
      masthead.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight) -
      parseFloat(style.columnGap || 0) -
      brand.offsetWidth;
    const fits = nav.querySelector('.sections-links').scrollWidth + COMFORT <= room;
    nav.classList.toggle('is-list', fits);
    nav.classList.toggle('is-compact', !fits);
    toggle.hidden = fits;
    if (fits) setOpen(false);
  };

  // The part in view is the last one whose top has passed a line a third of
  // the way down the screen; at the very bottom it is the last part.
  const update = () => {
    const line = innerHeight / 3;
    let current = -1;
    targets.forEach((el, i) => {
      if (el.getBoundingClientRect().top <= line) current = i;
    });
    const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    if (atEnd) current = targets.length - 1;
    links.forEach((a, i) => {
      if (i === current) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
    label.textContent = current < 0 ? TOP_LABEL : links[current].textContent;
  };

  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  links.forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });

  let frame = 0;
  addEventListener(
    'scroll',
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
  new ResizeObserver(() => {
    fit();
    update();
  }).observe(masthead);
  // The webfonts change the widths once they arrive.
  document.fonts?.ready.then(fit);
  fit();
  update();
}
