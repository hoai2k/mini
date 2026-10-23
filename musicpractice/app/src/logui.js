// The practice log's line under the Practice Routine (its streak and week)
// and its sheet (the streak, the last 7 days as bars, the days practised).
// The counting is practicelog.js's.

import { TEXT } from './text.js';
import { $ } from './ui.js';
import { PracticeClock, streak, lastDays, recentSeconds, practisedDays } from './practicelog.js';

const TICK_MS = 5000;

/** `active()`: whether something is being practised with right now. */
export function setupLog({ active }) {
  const L = TEXT.log;
  const clock = new PracticeClock({ active });
  const sheet = $('practice-log');
  const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

  function summary() {
    const now = Date.now();
    $('log-summary').textContent = L.summary(streak(clock.log, now), recentSeconds(clock.log, now, 7) ? L.duration(recentSeconds(clock.log, now, 7)) : '');
  }

  function render() {
    const now = Date.now();
    const log = clock.log;
    const n = streak(log, now);
    $('log-streak').textContent = String(n);
    $('log-streak-label').textContent = L.streakLabel(n);
    $('log-week').textContent = L.duration(recentSeconds(log, now, 7));
    $('log-today').textContent = L.duration(lastDays(log, now, 1)[0].seconds);
    const week = lastDays(log, now, 7);
    const most = Math.max(60, ...week.map((d) => d.seconds));
    const bars = $('log-bars');
    bars.replaceChildren(...week.map((d, i) => {
      const col = document.createElement('div');
      col.className = 'log-bar';
      col.classList.toggle('today', i === week.length - 1);
      col.classList.toggle('empty', d.seconds < 60);
      col.innerHTML = '<span class="log-bar-time"></span><span class="log-bar-fill"></span><span class="log-bar-day"></span>';
      col.querySelector('.log-bar-time').textContent = d.seconds >= 60 ? String(Math.floor(d.seconds / 60)) : '';
      col.querySelector('.log-bar-fill').style.height = `${Math.round((d.seconds / most) * 100)}%`;
      col.querySelector('.log-bar-day').textContent = d.date.toLocaleDateString(undefined, { weekday: 'narrow' });
      return col;
    }));
    bars.setAttribute('aria-label', L.bars(week.map((d) => L.barDay(d.date.toLocaleDateString(undefined, { weekday: 'long' }), L.duration(d.seconds))).join(', ')));
    const days = practisedDays(log).filter((d) => d.seconds >= 60).slice(0, 30);
    $('log-none').hidden = days.length > 0;
    $('log-days').replaceChildren(...days.map((d) => {
      const li = document.createElement('li');
      li.innerHTML = '<span></span><span></span>';
      li.children[0].textContent = fmtDay(d.date);
      li.children[1].textContent = L.duration(d.seconds);
      return li;
    }));
  }

  $('log-open').addEventListener('click', () => { render(); sheet.showModal(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });
  setInterval(() => {
    if (clock.tick()) {
      summary();
      if (sheet.open) render();
    }
  }, TICK_MS);
  // A day turning over (or a stale streak) shows when the screen is next looked at.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) summary(); });
  summary();

  return { refresh: summary, tick: () => clock.tick() };
}
