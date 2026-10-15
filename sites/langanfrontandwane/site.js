// Langan, Frost & Wane: the two small behaviours the page needs.

// 1. Shows. Each gig carries its date; once it has passed it moves to the
//    bottom of the list, greyed, so the next show is always first. When no
//    date is still to come, a line points to Facebook for the next one.
const list = document.querySelector('[data-gigs]');
if (list) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gigs = [...list.querySelectorAll('.gig')];
  const isPast = (gig) => new Date(`${gig.dataset.date}T23:59`) < today;
  const upcoming = gigs.filter((g) => !isPast(g)).sort((a, b) => a.dataset.date.localeCompare(b.dataset.date));
  const past = gigs.filter(isPast).sort((a, b) => b.dataset.date.localeCompare(a.dataset.date));
  past.forEach((g) => g.classList.add('past'));
  [...upcoming, ...past].forEach((g) => list.append(g));
  const none = document.querySelector('.no-gigs');
  if (none) none.hidden = upcoming.length > 0;
}

// 2. Videos. Each video is a still and a play button until it is clicked, so
//    the page loads nothing from YouTube unless someone asks for it.
for (const button of document.querySelectorAll('button.yt')) {
  button.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${button.dataset.yt}?autoplay=1&rel=0`;
    frame.title = button.dataset.title || 'Video';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.className = 'yt-frame';
    button.replaceWith(frame);
  });
}
