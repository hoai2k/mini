// The Practice Routine screen. Set up, it is the routine as a list: each item
// its number, picture and name on the left and its minutes on the right (a
// tap on them shows − and +), + to add one (a suggestion or Custom…) and
// Start. The pencil beside the total time edits the list: each item's kind (a list of
// the suggestions; only Custom is typed), a switch that takes it out of the
// routine without losing it (turned off, it shows only while editing), a
// trash button (or swipe it off either side), and a handle to drag it up or
// down by (or anywhere on it). An item's own pencil opens its kind and minutes,
// with its trash button at the far right.
//
// Running, it is a shell around the tools: a compact header (the item, its
// time left, what is next, Pause, Skip and Stop) over a row of cards that
// swipe sideways, one per tool (the Metronome, the Drone, the Playback
// Recorder), each a small version of the tool with its own switch. Each item
// keeps its own set-up of them (which are on, the tempo, the drone's note,
// instrument and fifth): put on the tools as it starts, and what is changed
// on the cards kept with it for next time. The tools' own settings are put
// back when the routine ends. All of them stop at the end; a take being
// recorded or played back is let finish first. The model and the clock are
// timer.js; the tools are main.js's, handed in.

import { TEXT } from './text.js';
import { VOICES, DRONE_MIN, DRONE_MAX, spelling } from './drone.js';
import { BPM_MIN, BPM_MAX, METERS, SOUNDS } from './settings.js';
import { noteName } from './tuning.js';
import { clock } from './droneui.js';
import { hasArt, showArt, alignPendulum, placeWeight, swingOf } from './art.js';
import { pendulumAngle, weightAt } from './metronome.js';
import { PRESETS, TOOLS, CHIMES, SPEAKERS, MAX_ITEMS, MIN_MINUTES, MAX_MINUTES, newItem, newRoutine, MAX_ROUTINES, loadTimer, saveTimer, customCount, CONFIRM_OVER, voiceGain, totalSeconds, RESTS, restSeconds, toolPlan, enabledItems, setKind, matchKind, cues, TimerRun, pictureFor, move, voiceLines, voiceUrl, chimeUrl } from './timer.js';
import { $ } from './ui.js';

const TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg>';
const PENCIL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>';
const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
const HANDLE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 12h14M5 16h14"/></svg>';
const CHIME_GAP = 1100; // ms from the chime to the voice's silence after it
const CHIME_TO_VOICE = 900; // ms from the chime to the voice
const VOICE_MAX = 15000; // ms the tools wait for the voice at most
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ICONS = { metronome: 'home-metronome', drone: 'home-drone', playback: 'home-record' };
const SWIPE_OFF = 0.35; // of the item's width: past this, a swipe deletes it

/**
 * @param {{ settings: object,
 *   tools: Record<'metronome'|'drone'|'playback', { start: () => void, stop: () => void, on: () => boolean }> & {
 *     metronome: { bpm: () => number, setBpm: (n: number) => void, meter: () => string, beat: () => ({ idx: number, strengths: number[] } | null) },
 *     drone: { note: () => string, step: (d: number) => void, voice: () => string, setVoice: (id: string) => void, fifth: () => boolean, setFifth: (on: boolean) => void, allowed: () => boolean, ask: () => void },
 *     playback: { status: () => { state: string, seconds: number, takes: number }, busy: () => boolean, ignoreFor: (sec: number) => void } },
 *   audio: { chime: (id: string) => { done: Promise<void>, stop: () => void },
 *     clips: (urls: string[], volume?: number) => { done: Promise<void>, stop: () => void }, preload: (urls: string[]) => void,
 *     running: (on: boolean) => void } }} opts
 */
export function setupTimer({ settings, tools, audio }) {
  const state = loadTimer(settings);
  let items = state.items;
  let itemEdit = null; // the item open for editing (its pencil): its name and minutes
  let typing = null; // the open item whose name is being typed (Custom… picked from its list)
  let quietUntil = 0; // a tap that ends a long press or a drag doesn't also start the routine
  let restore = null; // the tools' own settings, put back when a routine ends
  let run = null; // the TimerRun while a routine is going
  let finishing = false; // its time is up, and a take is being let finish
  let calm = 0; // ticks in a row with no take on the go, while finishing
  let finishedNote = false; // say "All done" until the routine is touched again
  let editing = false;
  let ticker = 0;
  let undo = null; // what Undo puts back (the item just deleted or turned off)
  let toastTimer = 0;
  const save = () => { state.items = items; saveTimer(state); };
  const routine = () => state.routines.find((r) => r.id === state.routineId);
  let seq = 0; // the announcement in progress (a newer one, Pause or Stop ends it)
  let saying = null; // the voice speaking, to stop
  const label = (it) => it.name.trim() || TEXT.timer.item.untitled;
  const T = TEXT.timer;
  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  // ---------------------------------------------------------------- the list

  const list = $('timer-list');

  /**
   * Its minutes: "5 min", or, while the item is open for editing (its
   * pencil), − 5 + with the number to type.
   */
  function minutes(it) {
    const I = T.item;
    if (itemEdit !== it.id) return h('span', 'titem-min', I.minutesShort(it.minutes));
    const time = h('div', 'titem-time');
    time.innerHTML = `<button type="button" class="step titem-less">−</button>
      <input class="titem-mins" type="number" inputmode="numeric" min="${MIN_MINUTES}" max="${MAX_MINUTES}" step="1">
      <button type="button" class="step titem-more">+</button>`;
    const min = time.querySelector('.titem-mins');
    min.value = it.minutes;
    min.setAttribute('aria-label', `${I.minutes}: ${label(it)}`);
    const setMinutes = (v) => {
      it.minutes = Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.round(Number(v) || it.minutes)));
      min.value = it.minutes;
      state.lastMinutes[it.kind || 'custom'] = it.minutes; // the next of its kind starts here
      save();
      readout();
    };
    min.addEventListener('change', () => setMinutes(min.value));
    min.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); min.blur(); } });
    min.addEventListener('focus', () => min.select());
    time.querySelector('.titem-less').setAttribute('aria-label', I.fewer);
    time.querySelector('.titem-more').setAttribute('aria-label', I.more);
    time.querySelector('.titem-less').addEventListener('click', () => setMinutes(it.minutes - 1));
    time.querySelector('.titem-more').addEventListener('click', () => setMinutes(it.minutes + 1));
    return time;
  }

  /** The pencil after its name: opens the item's name and minutes for editing; a check closes them. */
  function pencil(it) {
    const open = itemEdit === it.id;
    const b = h('button', `icon-btn titem-pencil${open ? ' on' : ''}`);
    b.type = 'button';
    b.innerHTML = open ? CHECK : PENCIL;
    b.setAttribute('aria-label', open ? T.item.editDone(label(it)) : T.item.edit(label(it)));
    b.setAttribute('aria-expanded', String(open));
    b.addEventListener('click', () => {
      itemEdit = open ? null : it.id;
      // Not straight into a typed field: a phone would bring up its keyboard (a Custom name is the exception).
      render(it.id, itemEdit ? '.titem-kind' : '.titem-pencil');
    });
    return b;
  }

  /**
   * Its name, while the item is open for editing: a list of the kinds (the
   * suggestions, and Custom…), showing its own (nothing picked, for one of its
   * own). A suggestion's name is its own; picking Custom… gives a field to
   * type the name in, with the list still beside it. A name typed exactly as a
   * suggestion's is that suggestion (matchKind).
   */
  function nameBox(it, i) {
    const I = T.item;
    const typed = typing === it.id;
    const box = h('div', `titem-namebox${typed ? ' custom' : ''}`);
    const kind = h('select', 'titem-kind');
    const none = new Option('', '');
    none.disabled = true;
    none.hidden = true;
    kind.replaceChildren(...(it.kind ? [] : [none]), ...PRESETS.map((p) => new Option(T.presets[p.id], p.id)), new Option(T.custom, 'custom'));
    kind.value = it.kind || '';
    kind.setAttribute('aria-label', I.kind(i + 1));
    kind.addEventListener('change', () => {
      const custom = kind.value === 'custom';
      if (custom) typing = it.id;
      else { typing = null; setKind(it, kind.value); }
      if (custom && it.kind) setKind(it, null);
      save();
      render(it.id, custom ? 'input.titem-name' : '.titem-kind');
      if (custom) list.querySelector(`[data-id="${it.id}"] input.titem-name`)?.select();
    });
    if (!typed) {
      const name = h('span', 'titem-name', label(it));
      const chev = h('span', 'titem-chev');
      chev.innerHTML = CHEVRON;
      box.append(name, chev, kind);
    } else {
      const name = h('input', 'titem-name');
      Object.assign(name, { type: 'text', maxLength: 60, value: it.name, placeholder: I.untitled, autocomplete: 'off' });
      name.setAttribute('enterkeyhint', 'done');
      name.setAttribute('aria-label', `${I.name} ${i + 1}`);
      name.addEventListener('input', () => { it.name = name.value; save(); readout(); });
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') name.blur(); });
      // Done typing: a suggestion's name becomes that suggestion.
      // (Shown a moment later, so a tap on its check, which blurred it, isn't lost to the redraw.)
      name.addEventListener('change', () => {
        if (!matchKind(it).kind) return;
        typing = null;
        save();
        setTimeout(() => { if (itemEdit === it.id && !list.querySelector(`[data-id="${it.id}"] .titem-namebox:not(.custom)`)) render(it.id, '.titem-kind'); }, 250);
      });
      const pick = h('span', 'titem-pick');
      pick.innerHTML = CHEVRON;
      pick.append(kind);
      box.append(name, pick);
    }
    return box;
  }

  function delButton(it) {
    const del = h('button', 'icon-btn');
    del.classList.add('titem-del');
    del.type = 'button';
    del.innerHTML = TRASH;
    del.setAttribute('aria-label', T.item.delete(label(it)));
    del.addEventListener('click', () => askRemove(it));
    return del;
  }

  function row(it, i, n) {
    const li = document.createElement('li');
    li.className = 'titem';
    li.dataset.id = it.id;
    const I = T.item;
    const open = itemEdit === it.id && !run;
    li.classList.toggle('item-edit', open);
    // Its name (or, open, its kind's list), the pencil, and its minutes.
    const parts = () => [open ? nameBox(it, i) : h('span', 'titem-name', label(it)), ...(run ? [] : [pencil(it)]), minutes(it)];
    if (!editing) {
      li.innerHTML = `<span class="titem-num" aria-hidden="true">${n}.</span><span class="titem-icon" aria-hidden="true"></span>
        <div class="titem-bar" aria-hidden="true"><div class="titem-bar-fill"></div></div>`;
      li.querySelector('.titem-icon').after(...parts());
      if (!run && !open) {
        // A tap on it starts the routine from here.
        li.classList.add('startable');
        li.setAttribute('role', 'button');
        li.tabIndex = 0;
        li.setAttribute('aria-label', I.startHere(n, label(it), it.minutes));
        li.addEventListener('click', (e) => {
          if (e.target.closest('button, input, select') || Date.now() < quietUntil) return;
          start(it);
        });
        li.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === li) { e.preventDefault(); start(it); } });
      } else if (run) li.setAttribute('aria-label', I.summary(n, label(it), it.minutes));
      if (open) li.append(delButton(it)); // open, it can be deleted from here too
      gestures(li, it);
      return li;
    }
    li.classList.add('editing');
    li.classList.toggle('off', !it.enabled);
    li.innerHTML = `<button type="button" class="icon-btn titem-handle">${HANDLE}</button>
      <span class="titem-num" aria-hidden="true">${it.enabled ? `${n}.` : ''}</span>
      <label class="titem-onoff"><input type="checkbox" role="switch"></label>`;
    li.querySelector('.titem-num').after(...parts());
    const on = li.querySelector('.titem-onoff input');
    on.checked = it.enabled;
    on.setAttribute('aria-label', I.inRoutine(label(it)));
    on.addEventListener('change', () => { it.enabled = on.checked; save(); render(it.id, '.titem-onoff input'); });
    li.append(delButton(it));
    const handle = li.querySelector('.titem-handle');
    handle.setAttribute('aria-label', I.reorder(label(it)));
    // Arrow keys move it too, for a keyboard.
    handle.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      const k = items.indexOf(it);
      if (k + d < 0 || k + d >= items.length) return;
      items = move(items, k, k + d);
      save();
      render(it.id, '.titem-handle');
    });
    gestures(li, it);
    return li;
  }

  /**
   * Drag an item up or down: it follows the pointer, the others make room as
   * it passes their middles, and it lands where it is let go. The pointer is
   * held by the list (which outlives a redraw, so a long press can turn the
   * list to editing under the finger and carry on).
   */
  let dragging = false;
  function startDrag(it, pointerId, y0) {
    const rows = [...list.children];
    const li = rows.find((r) => r.dataset.id === it.id);
    if (!li) return;
    try { list.setPointerCapture(pointerId); } catch { /* the pointer is gone */ return; }
    dragging = true;
    const from = rows.indexOf(li);
    const boxes = rows.map((r) => r.getBoundingClientRect());
    const step = boxes.length > 1 ? boxes[1].top - boxes[0].top : boxes[0].height + 8;
    let to = from;
    li.classList.add('dragging');
    list.classList.add('reordering');
    const moved = (ev) => {
      if (ev.pointerId !== pointerId) return;
      const dy = ev.clientY - y0;
      li.style.transform = `translateY(${dy}px)`;
      const mid = boxes[from].top + boxes[from].height / 2 + dy;
      to = from;
      while (to < rows.length - 1 && mid > boxes[to + 1].top + boxes[to + 1].height / 2) to++;
      while (to > 0 && mid < boxes[to - 1].top + boxes[to - 1].height / 2) to--;
      rows.forEach((r, k) => {
        if (r === li) return;
        const shift = from < to && k > from && k <= to ? -step : from > to && k < from && k >= to ? step : 0;
        r.style.transform = shift ? `translateY(${shift}px)` : '';
      });
    };
    const up = (ev) => {
      if (ev.pointerId !== pointerId) return;
      list.removeEventListener('pointermove', moved);
      list.removeEventListener('pointerup', up);
      list.removeEventListener('pointercancel', up);
      dragging = false;
      for (const r of rows) r.style.transform = '';
      li.classList.remove('dragging');
      list.classList.remove('reordering');
      if (to !== from) {
        // Among the rows shown: to the place of the one it was let go on.
        const target = items.find((x) => x.id === rows[to].dataset.id);
        items = move(items, items.indexOf(it), items.indexOf(target));
        save();
        render(it.id, editing ? '.titem-handle' : undefined);
      }
    };
    list.addEventListener('pointermove', moved);
    list.addEventListener('pointerup', up);
    list.addEventListener('pointercancel', up);
  }

  /**
   * An item's gestures, while the routine is set up. By touch, a long press
   * picks it up to move (turning the list to editing if it wasn't), and
   * while editing it is picked up by a drag up or down anywhere on it, and a
   * sideways swipe takes it off. By mouse, it is simply
   * dragged up or down, sideways off while editing, and a right click opens
   * its menu (Rename, Turn off or on, Delete). The handle picks it up at once.
   */
  const HOLD = 450;
  function gestures(li, it) {
    const handle = li.querySelector('.titem-handle');
    handle?.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(it, e.pointerId, e.clientY);
    });
    // A drag by touch must not scroll the page: the touch stays with the item it began on, even once redrawn.
    li.addEventListener('touchmove', (e) => { if (dragging) e.preventDefault(); }, { passive: false });
    li.addEventListener('contextmenu', (e) => {
      if (run) return;
      e.preventDefault();
      if (lastPointer !== 'mouse') return; // a long press by touch picks the item up instead
      openMenu(it, e.clientX, e.clientY);
    });
    li.addEventListener('pointerdown', (e) => {
      lastPointer = e.pointerType;
      if (run || e.button !== 0 || e.target.closest('input, button, label, select, .titem-time')) return;
      if (li.classList.contains('item-edit')) return; // open, it moves by its handle
      const touch = e.pointerType !== 'mouse';
      if (!touch && !editing) return; // with a mouse, the list's edit button is the way to rearrange it
      const x0 = e.clientX, y0 = e.clientY;
      let mode = null, dx = 0, timer = 0;
      const done = () => {
        clearTimeout(timer);
        li.removeEventListener('pointermove', moved);
        li.removeEventListener('pointerup', up);
        li.removeEventListener('pointercancel', cancel);
      };
      const pickUp = (y) => {
        done();
        mode = 'drag';
        quietUntil = Date.now() + 600;
        if (touch && !editing) { // a long press: the list turns to editing, the item in hand
          try { list.setPointerCapture(e.pointerId); } catch { return; }
          editing = true;
          render();
        }
        navigator.vibrate?.(12);
        startDrag(it, e.pointerId, y);
      };
      if (touch) timer = setTimeout(() => pickUp(y0), HOLD);
      const moved = (ev) => {
        dx = ev.clientX - x0;
        const dy = ev.clientY - y0;
        if (!mode) {
          const far = Math.hypot(dx, dy);
          if (touch) {
            if (far < 8) return;
            clearTimeout(timer);
            if (!editing) { done(); return; } // a scroll
            if (Math.abs(dy) >= Math.abs(dx)) { pickUp(y0); return; } // editing: picked up anywhere on it
          } else {
            if (far < 6) return;
            if (Math.abs(dy) >= Math.abs(dx)) { pickUp(y0); return; }
          }
          mode = 'swipe';
          li.setPointerCapture(e.pointerId);
          li.classList.add('swiping');
        }
        if (mode === 'swipe') {
          li.style.transform = `translateX(${dx}px)`;
          li.style.opacity = String(1 - Math.min(0.7, Math.abs(dx) / li.offsetWidth));
        }
      };
      const up = () => {
        done();
        if (mode) quietUntil = Date.now() + 400;
        if (mode !== 'swipe') return;
        li.classList.remove('swiping');
        if (Math.abs(dx) > li.offsetWidth * SWIPE_OFF && needsAsking(it)) {
          // Its own settings would go with it: spring back and ask first.
          li.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
          li.style.transform = '';
          li.style.opacity = '';
          askRemove(it);
        } else if (Math.abs(dx) > li.offsetWidth * SWIPE_OFF) {
          const out = Math.sign(dx) * li.offsetWidth * 1.1;
          const a = li.animate([{ transform: `translateX(${dx}px)`, opacity: li.style.opacity }, { transform: `translateX(${out}px)`, opacity: 0 }], { duration: 180, easing: 'ease-in', fill: 'forwards' });
          a.onfinish = () => remove(it);
        } else {
          li.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: 200, easing: 'ease-out' });
          li.style.transform = '';
          li.style.opacity = '';
        }
      };
      const cancel = () => { done(); li.classList.remove('swiping'); li.style.transform = ''; li.style.opacity = ''; };
      li.addEventListener('pointermove', moved);
      li.addEventListener('pointerup', up);
      li.addEventListener('pointercancel', cancel);
    });
  }
  let lastPointer = 'mouse';

  // ---- an item's menu (a right click): Rename, Turn off or on, Delete
  const menu = $('titem-menu');
  let menuFor = null;
  function openMenu(it, x, y) {
    menuFor = it;
    const M = T.menu;
    menu.replaceChildren(...[
      ['rename', M.rename],
      ['toggle', it.enabled ? M.turnOff : M.turnOn],
      ['delete', M.delete],
    ].map(([act, text]) => {
      const b = h('button', 'titem-menu-item', text);
      b.type = 'button';
      b.setAttribute('role', 'menuitem');
      b.addEventListener('click', () => { closeMenu(); menuAction(act, it); });
      return b;
    }));
    menu.hidden = false;
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(x, innerWidth - r.width - 8)}px`;
    menu.style.top = `${Math.min(y, innerHeight - r.height - 8)}px`;
    menu.querySelector('button')?.focus();
  }
  function closeMenu() { menu.hidden = true; menuFor = null; }
  document.addEventListener('pointerdown', (e) => { if (menuFor && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (menuFor && e.key === 'Escape') closeMenu(); });
  addEventListener('scroll', () => { if (menuFor) closeMenu(); }, { passive: true });
  function menuAction(act, it) {
    if (act === 'delete') { askRemove(it); return; }
    if (act === 'toggle') {
      it.enabled = !it.enabled;
      save();
      render();
      if (!it.enabled && !editing) note(T.turnedOff(label(it)), () => { it.enabled = true; save(); render(); });
      return;
    }
    // Rename: the item opens for editing as one of its own (Custom), its name ready to type.
    if (it.kind) setKind(it, null);
    save();
    itemEdit = it.id;
    typing = it.id;
    render(it.id, 'input.titem-name');
    list.querySelector(`[data-id="${it.id}"] input.titem-name`)?.select();
  }

  /*
   * Each item's icon, and each suggestion's in the + menu: its picture
   * (pictureFor), small. Again whenever a theme's art arrives, since which
   * pictures there are is the theme's.
   */
  function icons() {
    for (const li of list.children) {
      const it = items.find((x) => x.id === li.dataset.id);
      const el = li.querySelector('.titem-icon');
      if (it && el) showArt(el, pictureFor(it, hasArt));
    }
    for (const b of document.querySelectorAll('.timer-preset')) {
      showArt(b.querySelector('.timer-preset-icon'), pictureFor({ kind: b.dataset.preset === 'custom' ? null : b.dataset.preset }, hasArt));
    }
    for (const c of cards.querySelectorAll('.tool-card')) showArt(c.querySelector('.tool-icon'), ICONS[c.dataset.tool]);
  }
  document.addEventListener('art-applied', icons);

  /** Draw the list again, keeping focus on the control that was used (`id`'s item, `sel` in it). */
  function render(id, sel) {
    // Closed, a name typed as a suggestion's is that suggestion.
    if (typing !== itemEdit) typing = null;
    if (items.filter((x) => x.id !== typing && !x.kind && matchKind(x).kind).length) save();
    // The items in the routine, numbered in order; while editing, those turned off too (unnumbered).
    let n = 0;
    const shown = run ? run.items : editing ? items : enabledItems(items);
    list.replaceChildren(...shown.map((it) => row(it, items.indexOf(it), it.enabled ? ++n : 0)));
    list.classList.toggle('editing', editing);
    icons();
    const going = !!run;
    $('timer-empty').hidden = enabledItems(items).length > 0 || editing;
    $('timer-add').hidden = going;
    $('timer-add').disabled = items.length >= MAX_ITEMS;
    const edit = $('timer-edit');
    edit.hidden = going || (!items.length && !editing);
    edit.setAttribute('aria-pressed', String(editing));
    edit.setAttribute('aria-label', editing ? T.editDone : T.edit);
    edit.classList.toggle('on', editing);
    if (id && sel) list.querySelector(`[data-id="${id}"] ${sel}`)?.focus({ preventScroll: true });
    readout();
  }

  function setEditing(on) {
    editing = on && !run;
    itemEdit = null;
    if (!editing) { list.querySelectorAll('input').forEach((i) => i.blur()); }
    render();
  }
  $('timer-edit').addEventListener('click', () => setEditing(!editing));
  // The total time too: a tap turns list editing on or off.
  $('timer-clock').addEventListener('click', () => { if (!run) setEditing(!editing); });
  $('timer-clock').addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !run) { e.preventDefault(); setEditing(!editing); } });

  // ---- add and delete
  function add(presetId) {
    const it = newItem(presetId, state.lastMinutes, settings);
    items.push(it);
    finishedNote = false;
    save();
    if (!presetId) editing = true; // Custom…: straight to its name
    render();
    const li = list.querySelector(`[data-id="${it.id}"]`);
    li?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    if (!presetId) li?.querySelector('.titem-name')?.focus();
  }

  function remove(it) {
    const index = items.indexOf(it);
    if (index < 0) return;
    items = items.filter((x) => x !== it);
    save();
    if (!items.length) editing = false;
    render();
    note(T.deleted(label(it)), () => {
      items = items.slice();
      items.splice(Math.min(index, items.length), 0, it);
      save();
      render();
    });
  }
  /*
   * Deleting an item with more than a few settings of its own (customCount:
   * tools turned on, settings unlike the tools' own) asks first, saying they
   * go with it.
   */
  const needsAsking = (it) => customCount(it, settings) > CONFIRM_OVER; // never while running, so the settings are the tools' own
  const confirmSheet = $('timer-confirm');
  let confirmFor = null;
  function askRemove(it) {
    if (!needsAsking(it)) { remove(it); return; }
    confirmFor = it;
    $('timer-confirm-text').textContent = T.confirmDelete.text(label(it), customCount(it, settings));
    $('timer-confirm-go').textContent = T.confirmDelete.go;
    confirmSheet.showModal();
    $('timer-confirm-no').focus();
  }
  $('timer-confirm-go').addEventListener('click', () => { const it = confirmFor; confirmFor = null; confirmSheet.close(); if (it) remove(it); });
  $('timer-confirm-no').addEventListener('click', () => { confirmFor = null; confirmSheet.close(); });
  confirmSheet.addEventListener('click', (e) => { if (e.target === confirmSheet) confirmSheet.close(); });
  /** A line at the foot of the screen with Undo, for a few seconds. */
  function note(text, undoIt) {
    undo = undoIt;
    $('timer-toast-text').textContent = text;
    $('timer-toast').hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $('timer-toast').hidden = true; undo = null; }, 6000);
  }
  $('timer-undo').addEventListener('click', () => {
    if (!undo) return;
    const f = undo;
    undo = null;
    $('timer-toast').hidden = true;
    f();
  });

  const sheet = $('timer-add-sheet');
  $('timer-presets').replaceChildren(...[...PRESETS, null].map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'timer-preset';
    b.dataset.preset = p?.id ?? 'custom';
    b.innerHTML = '<span class="timer-preset-icon" aria-hidden="true"></span><span class="timer-preset-name"></span>';
    b.lastChild.textContent = p ? T.presets[p.id] : T.custom;
    b.addEventListener('click', () => { sheet.close(); add(p?.id); });
    return b;
  }));
  $('timer-add').addEventListener('click', () => { icons(); sheet.showModal(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

  // ---------------------------------------------------------------- the tool cards

  const cards = $('tool-cards');
  const card = {}; // tool -> { el, on (its switch), show() }
  const C = T.cards;

  function toolCard(tool, body) {
    const el = document.createElement('article');
    el.className = 'tool-card';
    el.dataset.tool = tool;
    el.setAttribute('aria-label', C[tool]);
    el.innerHTML = `<header class="tool-head"><span class="tool-icon art" aria-hidden="true"></span><h3></h3>
      <button type="button" class="icon-btn tool-gear"><svg viewBox="0 0 24 24" aria-hidden="true"><use href="#gear"/></svg></button></header>
      <div class="tool-body"></div><div class="tool-foot"></div>`;
    el.querySelector('h3').textContent = C[tool];
    const gear = el.querySelector('.tool-gear');
    gear.setAttribute('aria-label', C.settings(C[tool]));
    gear.addEventListener('click', () => openToolSettings(tool));
    el.querySelector('.tool-body').append(...body);
    // At its foot, the tool's own way of starting and stopping: the
    // Metronome's Start, the Drone's Play, the Playback Recorder's record button.
    const go = document.createElement('button');
    go.type = 'button';
    go.setAttribute('aria-pressed', 'false');
    const [startText, stopText] = GO[tool]();
    if (tool === 'playback') {
      go.className = 'rec-btn tool-go';
      go.dataset.state = 'off';
      go.innerHTML = '<span class="rec-dot" aria-hidden="true"></span>';
    } else {
      go.className = 'big-btn tool-go';
      go.innerHTML = `<svg class="i-play" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>${tool === 'drone'
        ? '<svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>'
        : '<svg class="i-stop" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'}<span></span>`;
    }
    const on = {
      get checked() { return go.getAttribute('aria-pressed') === 'true'; },
      set checked(v) {
        go.setAttribute('aria-pressed', String(!!v));
        const text = v ? stopText : startText;
        if (tool === 'playback') go.setAttribute('aria-label', text);
        else go.querySelector('span').textContent = text;
      },
    };
    on.checked = false;
    go.addEventListener('click', () => setTool(tool, !on.checked));
    el.querySelector('.tool-foot').append(go);
    cards.append(el);
    return { el, on, go };
  }
  /** Each tool's button, as its own screen words it: [to start, to stop]. */
  const GO = {
    metronome: () => [TEXT.metronome.start, TEXT.metronome.stop],
    drone: () => [TEXT.drone.play, TEXT.drone.pause],
    playback: () => [TEXT.recorder.turnOn, TEXT.recorder.turnOff],
  };
  const stepper = (cls, labelText, down, up, downLabel, upLabel) => {
    const box = h('div', `tool-step ${cls}`);
    const less = h('button', 'step', '−'); less.type = 'button'; less.setAttribute('aria-label', downLabel); less.addEventListener('click', down);
    const more = h('button', 'step', '+'); more.type = 'button'; more.setAttribute('aria-label', upLabel); more.addEventListener('click', up);
    const big = h('span', 'tool-big');
    big.setAttribute('aria-live', 'polite');
    box.append(less, big, more);
    if (labelText) box.setAttribute('aria-label', labelText);
    return { box, big };
  };

  /*
   * The Metronome. Off, its tempo with − and + and a slider, and its time
   * signature. On, the beat instead, in one of three views a tap on it steps
   * through (as the Metronome's own dots do): its picture with the pendulum
   * swinging, big dots that swell into each beat, or the Visualizer's bars;
   * the tempo then in a line under it (the gear changes it).
   */
  {
    const M = tools.metronome;
    const tempo = stepper('tool-tempo', C.tempo, () => { M.setBpm(M.bpm() - 1); capture(); show(); }, () => { M.setBpm(M.bpm() + 1); capture(); show(); }, T.item.slower, T.item.faster);
    const slider = h('input', 'slider');
    Object.assign(slider, { type: 'range', min: BPM_MIN, max: BPM_MAX, step: 1 });
    slider.setAttribute('aria-label', C.tempo);
    slider.addEventListener('input', () => { M.setBpm(Number(slider.value)); capture(); show(); });
    const idle = h('div', 'tool-met-idle');
    idle.append(tempo.box, slider);
    // The beat, while it plays.
    const view = h('div', 'mini-met');
    view.setAttribute('role', 'button');
    view.tabIndex = 0;
    const art = h('div', 'mini-met-art');
    const body = h('div', 'met-layer');
    body.classList.add('met-case');
    const pend = h('div', 'met-layer');
    pend.classList.add('met-pendulum');
    const rod = h('span', 'met-rod');
    const weight = h('span', 'met-weight');
    pend.append(rod, weight);
    art.append(body, pend);
    const pulse = h('ol', 'mini-pulse');
    const bars = h('div', 'met-bars');
    bars.classList.add('mini-bars');
    for (const el of [pulse, bars]) el.setAttribute('aria-hidden', 'true');
    view.append(art, pulse, bars);
    const meter = h('p', 'tool-note');
    const { el, on } = toolCard('metronome', [idle, view, meter]);
    showArt(body, 'metronome-body');
    showArt(rod, 'metronome-rod');
    showArt(weight, 'metronome-weight');
    const NEXT = { pendulum: 'pulse', pulse: 'bars', bars: 'pendulum' };
    const step = () => { state.metView = NEXT[state.metView] || 'pendulum'; save(); show(); };
    view.addEventListener('click', step);
    view.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); step(); } });
    let shownBeats = '';
    let aligned = '';
    function build(strengths) {
      if (strengths.join() === shownBeats) return;
      shownBeats = strengths.join();
      const cls = (s) => (s === 2 ? 'strong' : s === 1 ? 'mid' : '');
      pulse.replaceChildren(...strengths.map((s) => h('li', cls(s))));
      bars.replaceChildren(...Array.from({ length: 2 }, () => {
        const row = h('div', 'met-measure');
        row.append(...strengths.map((s) => { const bar = h('i', 'met-bar'); if (cls(s)) bar.classList.add(cls(s)); bar.append(h('i', 'met-shape')); return bar; }));
        return row;
      }));
      bars.style.setProperty('--n', strengths.length);
    }
    function show() {
      const going = M.on();
      tempo.big.innerHTML = `<b>${M.bpm()}</b> <small>${C.bpm}</small>`;
      slider.value = String(M.bpm());
      meter.textContent = going ? C.tempoLine(M.bpm(), M.meter()) : M.meter();
      on.checked = going;
      el.classList.toggle('on', going);
      idle.hidden = going;
      view.hidden = !going;
      const mode = state.metView || 'pendulum';
      view.dataset.view = mode;
      view.setAttribute('aria-label', C.views[NEXT[mode]]);
      if (!going) return;
      const b = M.beat();
      build(b.strengths);
      const now = b.now, beat = b.at, n = b.strengths.length;
      if (mode === 'pendulum') {
        // Pinned to the body once both pictures are in (and again for a new theme's).
        const key = `${body.dataset.shown}|${rod.dataset.shown}|${weight.dataset.shown}`;
        if (key !== aligned && body.art && rod.art) { alignPendulum(body, pend); placeWeight(pend, weightAt(M.bpm())); aligned = key; }
        const angle = beat ? pendulumAngle(beat, now, b.period, swingOf(pend)) : 0;
        pend.style.transform = `rotate(${angle.toFixed(2)}deg)`;
      } else if (mode === 'pulse') {
        // Each dot swells into its beat, peaks on it and eases away.
        const p = b.period;
        const after = beat ? now - beat.time : 9;
        const out = Math.exp(-((after / Math.min(0.24, p * 0.4)) ** 2));
        const into = p - after > 0 ? Math.exp(-(((p - after) / Math.min(0.07, p * 0.12)) ** 2)) : 0;
        const next = (b.idx + 1) % n;
        [...pulse.children].forEach((d, i) => d.style.setProperty('--g', (i === b.idx ? Math.max(out, i === next ? into : 0) : i === next ? into : 0).toFixed(3)));
      } else {
        const cells = bars.querySelectorAll('.met-bar');
        const at = beat && b.idx >= 0 ? (Math.floor((beat.count - b.idx) / n) % 2) * n + b.idx : -1;
        const lit = beat ? Math.exp(-(now - beat.time) / Math.min(0.35, b.period * 0.55)) : 0;
        cells.forEach((c, i) => c.style.setProperty('--lit', (i === at ? Math.max(lit, 0.28) : i < at ? 0.28 : 0).toFixed(3)));
      }
    }
    document.addEventListener('art-applied', () => { aligned = ''; });
    card.metronome = { el, on, show };
  }

  // The Drone: its note with − and +, its instrument, and the fifth.
  {
    const D = tools.drone;
    const note = stepper('tool-note-step', C.note, () => { D.step(-1); capture(); show(); }, () => { D.step(1); capture(); show(); }, T.item.noteDown, T.item.noteUp);
    const voice = h('select', 'select tool-voice');
    voice.replaceChildren(...VOICES.map((v) => new Option(v.label, v.id)));
    voice.setAttribute('aria-label', T.item.instrument);
    voice.addEventListener('change', () => { D.setVoice(voice.value); capture(); show(); });
    const fifthRow = h('label', 'row');
    fifthRow.classList.add('toggle', 'tool-fifth');
    fifthRow.append(h('span', '', T.item.fifth));
    const fifth = h('input');
    Object.assign(fifth, { type: 'checkbox' });
    fifth.setAttribute('role', 'switch');
    fifth.addEventListener('change', () => { D.setFifth(fifth.checked); capture(); show(); });
    fifthRow.append(fifth);
    const { el, on } = toolCard('drone', [note.box, voice, fifthRow]);
    function show() {
      note.big.innerHTML = `<b>${D.note()}</b>`;
      if (document.activeElement !== voice) voice.value = D.voice();
      fifth.checked = D.fifth();
      on.checked = D.on();
      el.classList.toggle('on', on.checked);
    }
    card.drone = { el, on, show };
  }

  // The Playback Recorder: what it is doing (listening, recording, playing a take back) and how many takes.
  {
    const P = tools.playback;
    const status = h('p', 'tool-status');
    status.setAttribute('aria-live', 'polite');
    const lamp = h('div', 'tool-rec');
    lamp.append(status);
    const takes = h('p', 'tool-note');
    const hint = h('p', 'tool-hint', C.playbackHint);
    const { el, on, go } = toolCard('playback', [lamp, takes, hint]);
    function show() {
      const s = P.status();
      on.checked = P.on();
      el.classList.toggle('on', on.checked);
      el.dataset.state = s.state;
      go.dataset.state = s.state; // the record button lit as on its own screen
      status.textContent = C.states[s.state]?.(clock(Math.floor(s.seconds))) ?? '';
      takes.textContent = C.takes(s.takes);
      hint.hidden = on.checked;
    }
    card.playback = { el, on, show };
  }

  /*
   * A tool's settings, from the gear on its card: what the item running keeps
   * for that tool (the Metronome's tempo, time signature, click and extra
   * notes; the Drone's note, instrument and fifth; the Playback Recorder's
   * silence and playing takes back). Nothing of the page's own (Audio check,
   * Theme): only the tool's, set on the tool at once and kept with the item.
   */
  const toolSheet = $('tool-settings');
  const field = (text, control, toggle = false) => {
    const l = h('label', 'row');
    if (toggle) l.classList.add('toggle');
    l.append(h('span', '', text), control);
    return l;
  };
  const select = (options, value, onChange) => {
    const s = h('select', 'select');
    s.replaceChildren(...options.map(([v, text]) => new Option(text, String(v))));
    s.value = String(value);
    s.addEventListener('change', () => onChange(s.value));
    return s;
  };
  const toggleBox = (checked, onChange) => {
    const b = h('input');
    Object.assign(b, { type: 'checkbox', checked });
    b.setAttribute('role', 'switch');
    b.addEventListener('change', () => onChange(b.checked));
    return b;
  };
  /** A volume slider (0 to 1), set as it moves. */
  const volume = (value, onChange) => {
    const r = h('input', 'slider');
    Object.assign(r, { type: 'range', min: 0, max: 1, step: 0.01, value });
    r.addEventListener('input', () => onChange(Number(r.value)));
    return r;
  };
  function toolFields(tool) {
    const S = C.fields;
    if (tool === 'metronome') {
      const M = tools.metronome;
      const set = (patch) => { M.setConfig({ ...M.config(), ...patch }); capture(); card.metronome.show(); };
      const num = h('input', 'tool-num');
      Object.assign(num, { type: 'number', min: BPM_MIN, max: BPM_MAX, step: 1, value: M.bpm() });
      num.setAttribute('inputmode', 'numeric');
      const setBpm = (v) => { set({ bpm: Math.max(BPM_MIN, Math.min(BPM_MAX, Math.round(Number(v) || M.bpm()))) }); num.value = M.bpm(); };
      num.addEventListener('change', () => setBpm(num.value));
      num.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); setBpm(num.value); } }); // not the sheet's form
      const tempo = h('span', 'tool-tempo-edit');
      const less = h('button', 'step', '−'); less.type = 'button'; less.setAttribute('aria-label', T.item.slower); less.addEventListener('click', () => setBpm(M.bpm() - 1));
      const more = h('button', 'step', '+'); more.type = 'button'; more.setAttribute('aria-label', T.item.faster); more.addEventListener('click', () => setBpm(M.bpm() + 1));
      tempo.append(less, num, more);
      return [
        field(S.tempo, tempo),
        field(S.meter, select(METERS.map((m) => [m.id, m.beats === 1 ? TEXT.metronome.noBars : m.id]), M.config().meter, (v) => set({ meter: v }))),
        field(S.sound, select(SOUNDS.map((o) => [o.id, o.label]), M.config().sound, (v) => set({ sound: v }))),
        field(S.sub, select([1, 2, 3, 4].map((n) => [n, n === 1 ? S.subNone : TEXT.metronome.settings.subdivisions[n]]), M.config().sub, (v) => set({ sub: Number(v) }))),
        field(S.accent, toggleBox(M.config().accent, (on) => set({ accent: on })), true),
        field(S.volume, volume(M.config().volume, (v) => set({ volume: v }))),
      ];
    }
    if (tool === 'drone') {
      const D = tools.drone;
      const set = (patch) => { D.set({ midi: D.midi(), voice: D.voice(), fifth: D.fifth(), volume: D.volume(), ...patch }); capture(); card.drone.show(); };
      const flats = spelling(settings.droneAccidentals, settings.droneSpelling) === 'flats';
      const notes = Array.from({ length: DRONE_MAX - DRONE_MIN + 1 }, (_, k) => { const n = noteName(DRONE_MIN + k, { flats }); return [DRONE_MIN + k, `${n.name}${n.octave}`]; });
      return [
        field(C.note, select(notes, D.midi(), (v) => set({ midi: Number(v) }))),
        field(T.item.instrument, select(VOICES.map((v) => [v.id, v.label]), D.voice(), (v) => set({ voice: v }))),
        field(T.item.fifth, toggleBox(D.fifth(), (on) => set({ fifth: on })), true),
        field(S.volume, volume(D.volume(), (v) => set({ volume: v }))),
      ];
    }
    const P = tools.playback;
    const set = (patch) => { P.setConfig({ ...P.config(), ...patch }); capture(); card.playback.show(); };
    const secs = Array.from({ length: 19 }, (_, k) => 1 + k / 2);
    return [
      field(S.silence, select(secs.map((s) => [s, S.seconds(s)]), P.config().silenceSec, (v) => set({ silenceSec: Number(v) }))),
      field(S.autoPlay, toggleBox(P.config().autoPlay, (on) => set({ autoPlay: on })), true),
      field(S.playVolume, volume(P.config().volume, (v) => set({ volume: v }))),
    ];
  }
  function openToolSettings(tool) {
    if (!run) return;
    $('tool-settings-title').textContent = C.settingsTitle(C[tool], label(run.item));
    $('tool-settings-body').replaceChildren(...toolFields(tool));
    toolSheet.showModal();
  }
  toolSheet.addEventListener('click', (e) => { if (e.target === toolSheet) toolSheet.close(); });

  const dots = $('tool-dots');
  dots.replaceChildren(...TOOLS.map((t, i) => {
    const b = h('button', 'tool-dot');
    b.type = 'button';
    b.setAttribute('aria-label', C.show(C[t]));
    b.addEventListener('click', () => showCard(TOOLS[i]));
    return b;
  }));
  /** Bring a tool's card into view (the row scrolls sideways). */
  function showCard(tool, smooth = true) {
    const el = card[tool]?.el;
    if (!el) return;
    cards.scrollTo({ left: el.offsetLeft - (cards.clientWidth - el.offsetWidth) / 2, behavior: smooth ? 'smooth' : 'instant' });
  }
  function showDots() {
    const mid = cards.scrollLeft + cards.clientWidth / 2;
    let near = 0, best = Infinity;
    TOOLS.forEach((t, i) => { const el = card[t].el; const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - mid); if (d < best) { best = d; near = i; } });
    [...dots.children].forEach((d, i) => d.setAttribute('aria-current', String(i === near)));
  }
  cards.addEventListener('scroll', showDots, { passive: true });

  /** A tool switched on or off on its card: kept with the item running, and started or stopped now. */
  function setTool(tool, onNow) {
    if (tool === 'drone' && onNow && !tools.drone.allowed()) { card.drone.on.checked = false; tools.drone.ask(); return; }
    if (!run) return;
    // During a break the tool simply plays (to tune up, say); the next item keeps its own.
    if (!run.resting) {
      run.item.tools[tool] = onNow;
      save();
    }
    if (!run.paused && !finishing) { if (onNow) tools[tool].start(); else tools[tool].stop(); }
    showCards();
  }
  function showCards() {
    for (const t of TOOLS) card[t].show();
  }
  /** What was changed on a card (the tempo, the drone's note, instrument or fifth), kept with the item running. */
  function capture() {
    if (!run || finishing) return;
    Object.assign(run.item, configs());
    save();
  }
  /** The tools' settings now, as an item keeps them. */
  const configs = () => ({
    met: tools.metronome.config(),
    drn: { midi: tools.drone.midi(), voice: tools.drone.voice(), fifth: tools.drone.fifth(), volume: tools.drone.volume() },
    pb: tools.playback.config(),
  });
  function applyConfigs({ met, drn, pb }) {
    tools.metronome.setConfig(met);
    tools.drone.set(drn);
    tools.playback.setConfig(pb);
  }
  /**
   * Carry out what the routine does with its tools at `moment` (toolPlan in
   * timer.js decides; this only does it), for item `it`. Returns the plan.
   */
  function act(moment, { it = run?.item, user = false, speaks = false } = {}) {
    const plan = toolPlan(moment, {
      item: it,
      on: Object.fromEntries(TOOLS.map((t) => [t, tools[t].on()])),
      busy: tools.playback.busy(),
      recording: tools.playback.status().state === 'recording',
      user,
      speaks,
      droneAllowed: tools.drone.allowed(),
      resting: !!run?.resting,
    });
    for (const t of plan.stop) tools[t].stop();
    for (const t of plan.start) tools[t].start();
    return plan;
  }
  /**
   * An item starts (or the routine is resumed): its settings go on the tools,
   * and its tools start (waiting for the voice, with `hold`: see afterVoice)
   * while the rest stop; a take on the go may be let finish (toolPlan 'go').
   */
  function startTools(it = run?.item, { user = false, hold = false } = {}) {
    if (!it) return;
    applyConfigs(it);
    playbackLater = act('go', { it, user, speaks: hold }).letFinish;
    showCards();
  }
  /**
   * The item's tools that were held for the announcement start once the voice
   * has finished, if the routine is still on that item and going (Pause, Stop
   * or Skip in the meantime has seen to them). One turned off on its card in
   * the meantime stays off.
   */
  async function afterVoice(said, it) {
    // (A voice that never reports its end, its sound suspended, holds them no longer than VOICE_MAX.)
    if (!(await Promise.race([said, wait(VOICE_MAX).then(() => true)])) || run?.item !== it || run.paused || finishing) return;
    act('voiced', { it });
    showCards();
  }
  let playbackLater = false; // the recorder goes off once its take is done
  /** Pause, Stop, the end: every tool stops. */
  function stopTools() {
    playbackLater = false;
    act('stop');
  }

  // The beats light as they are heard, while the cards are on screen.
  let frame = 0;
  function animate() {
    frame = 0;
    if (!run || document.hidden) return;
    card.metronome.show();
    frame = requestAnimationFrame(animate);
  }

  // ---------------------------------------------------------------- settings

  // Chimes on or off and which (each plays as it is picked); the voice on or
  // off, whose (each says hello as it is picked) and how loud.
  const fill = (select, ids, labels, value) => {
    select.replaceChildren(...ids.map((id) => new Option(labels[id], id)));
    select.value = value;
  };
  const restSel = $('timer-rest');
  restSel.replaceChildren(...RESTS.map((r) => new Option(T.rests[r], String(r))));
  restSel.value = String(state.rest);
  restSel.addEventListener('change', () => {
    state.rest = restSel.value === 'pause' ? 'pause' : Number(restSel.value);
    save();
    readout();
  });
  const chimeOn = $('timer-chime-on');
  const chimeSel = $('timer-chime');
  fill(chimeSel, CHIMES, T.chimes, state.chime);
  const showChime = () => { chimeOn.checked = state.chimeOn; $('timer-chime-row').hidden = !state.chimeOn; };
  chimeOn.addEventListener('change', () => {
    state.chimeOn = chimeOn.checked;
    save();
    showChime();
    if (state.chimeOn) audio.chime(state.chime);
  });
  chimeSel.addEventListener('change', () => { state.chime = chimeSel.value; save(); audio.chime(state.chime); });
  showChime();
  let hello = null;
  const sayHello = () => {
    hello?.stop();
    hello = audio.clips([voiceUrl(state.voice, 'hello')], voiceGain(state.voiceVolume));
  };
  const voiceOn = $('timer-voice-on');
  const voiceSel = $('timer-voice');
  const voiceVol = $('timer-voice-volume');
  fill(voiceSel, SPEAKERS, T.voices, state.voice);
  voiceVol.value = String(state.voiceVolume);
  const showVoice = () => {
    voiceOn.checked = state.voiceOn;
    for (const el of document.querySelectorAll('.timer-voice-only')) el.hidden = !state.voiceOn;
  };
  voiceOn.addEventListener('change', () => {
    state.voiceOn = voiceOn.checked;
    save();
    showVoice();
    if (!state.voiceOn) { hello?.stop(); hush(); } // turned on, it says nothing until it has something to say
  });
  voiceSel.addEventListener('change', () => { state.voice = voiceSel.value; save(); sayHello(); });
  voiceVol.addEventListener('input', () => { state.voiceVolume = Number(voiceVol.value); save(); });
  voiceVol.addEventListener('change', sayHello); // let go: hear it at the new level
  showVoice();
  const settingsSheet = $('timer-settings');
  $('timer-settings-btn').addEventListener('click', () => settingsSheet.showModal());
  settingsSheet.addEventListener('click', (e) => { if (e.target === settingsSheet) settingsSheet.close(); });

  // ---------------------------------------------------------------- running

  function readout() {
    const now = Date.now();
    const going = !!run;
    $('timer-now').hidden = going;
    $('timer-run').hidden = !going;
    $('routine').classList.toggle('running', going);
    if (!going) {
      const n = enabledItems(items).length;
      $('timer-clock').textContent = clock(totalSeconds(items) + restSeconds(n, state.rest));
      $('timer-sub').textContent = finishedNote ? T.finished : T.total(n) + (state.rest && n > 1 ? ` · ${T.totalBreaks(state.rest)}` : '');
      $('timer-go').disabled = !enabledItems(items).length || editing;
    } else {
      const it = run.item;
      // During a break: Break, its countdown, and what comes next (`item`, already).
      const resting = run.resting && !finishing;
      $('trun-name').textContent = finishing ? T.finishing : resting ? T.breakName : label(it);
      showArt($('trun-icon'), resting ? 'home-routine' : pictureFor(it, hasArt));
      $('trun-clock').textContent = run.waiting ? '' : clock(Math.ceil(run.remaining(now)));
      const next = run.next;
      $('trun-sub').textContent = finishing ? T.finishingNote : run.waiting ? `${T.next(label(next), next.minutes)} · ${T.breakWaiting}`
        : (run.paused ? `${T.paused} · ` : '') + (next ? T.next(label(next), next.minutes) : T.lastItem);
      $('timer-run').classList.toggle('resting', resting);
      $('trun-fill').style.width = `${(run.progress(now) * 100).toFixed(2)}%`;
      $('timer-run').classList.toggle('paused', run.paused);
      const go = $('trun-go');
      go.setAttribute('aria-pressed', String(!run.paused));
      go.setAttribute('aria-label', run.paused ? T.resume : T.pause);
      go.disabled = finishing;
      $('trun-skip').disabled = finishing;
    }
    // The items: the one running, its progress, and those already done.
    for (const li of list.children) {
      const k = going ? run.items.findIndex((x) => x.id === li.dataset.id) : -1;
      const isNow = going && !run.done && !run.resting && k === run.index;
      li.classList.toggle('now', isNow);
      li.classList.toggle('done', going && (run.done || k < run.index));
      li.classList.toggle('up-next', going && run.resting && k === run.index);
      const bar = li.querySelector('.titem-bar-fill');
      if (bar) bar.style.width = isNow ? `${(run.progress(now) * 100).toFixed(2)}%` : '0%';
    }
    if (going) showCards();
  }

  /**
   * Between items: the chime, then the voice (if on: what finished and what
   * is next). The tools carry on under it; a Playback Recorder listening for
   * you to start pays it no attention. Pause, Stop or another announcement
   * cuts it short. Resolves true once it has been said in full (false if cut
   * short); `speaks` says whether there is a voice to wait for.
   */
  function announce({ chime = false, lines = [] } = {}) {
    const speak = !!(state.voiceOn && lines.length);
    return { speaks: speak, done: say(chime, lines, speak) };
  }
  async function say(chime, lines, speak) {
    const my = ++seq;
    saying?.stop();
    if (!(chime && state.chimeOn) && !speak) return true;
    tools.playback.ignoreFor(speak ? 8 : 3);
    if (chime && state.chimeOn) {
      audio.chime(state.chime);
      await wait(speak ? CHIME_TO_VOICE : CHIME_GAP);
    }
    if (my !== seq) return false;
    if (!speak) return true;
    saying = audio.clips(lines.map((l) => voiceUrl(state.voice, l)), voiceGain(state.voiceVolume));
    await saying.done;
    if (my !== seq) return false;
    saying = null;
    tools.playback.ignoreFor(0.6); // the voice's tail in the room
    return true;
  }
  function hush() { seq++; saying?.stop(); saying = null; }

  /** An item ended (or was skipped, `user`): the next begins, or the routine's time is up. */
  function changes(list_, user = false) {
    const last = list_.at(-1);
    if (!last) return;
    if (last.type === 'changed') {
      cues.changed(last.done, last.next);
      const said = announce({ chime: true, lines: voiceLines.changed(last.done, last.next) });
      if (!run.paused) {
        // What the next item adds waits for the voice; what it drops stops now.
        startTools(last.next, { user, hold: said.speaks });
        if (said.speaks) afterVoice(said.done, last.next);
      }
      render();
    } else if (last.type === 'rest') {
      // A break: what finished and what is next is said, and the tools rest (a take on the go is let finish).
      cues.changed(last.done, last.next);
      announce({ chime: true, lines: voiceLines.changed(last.done, last.next) });
      restTools(last.next, { user });
      render();
    } else if (last.type === 'begin') {
      // The break is over: a chime, and the item's tools start.
      announce({ chime: true });
      if (!run.paused) startTools(last.item, { user });
      render();
    } else {
      cues.finished(last.done);
      endWhenFree(last.done, user);
    }
  }
  /** A break: the next item's settings go on the tools (its cards show them), and every tool rests. */
  function restTools(it, { user = false } = {}) {
    applyConfigs(it);
    playbackLater = act('rest', { it, user }).letFinish;
    showCards();
  }

  /**
   * The routine's time is up. Everything stops, unless a take is on the go:
   * then everything carries on until it has been recorded, the metronome and
   * the drone stop, and the take plays back; the routine ends after that.
   * Skipped to the end (`user`), it ends at once.
   */
  let lastItem = null;
  function endWhenFree(done, user = false) {
    lastItem = done;
    if (act('end', { it: done, user }).letFinish) {
      finishing = true;
      calm = 0;
      showCard('playback');
      readout();
      return;
    }
    finish();
  }
  function finishingTick() {
    act('finishing'); // once the take is in, the metronome and the drone stop so it is heard
    calm = tools.playback.busy() ? 0 : calm + 1;
    if (calm >= 3) finish();
  }
  /** The tools' own settings, as they were before the routine began. */
  function putBack() {
    if (!restore) return;
    applyConfigs(restore);
    restore = null;
  }
  function finish() {
    finishing = false;
    stopTools();
    putBack();
    clearInterval(ticker);
    cancelAnimationFrame(frame);
    audio.running(false);
    run = null;
    finishedNote = true;
    announce({ chime: true, lines: voiceLines.finished(lastItem) });
    render();
  }

  function tick() {
    if (!run) return;
    if (playbackLater && !tools.playback.busy()) playbackLater = act('take-in').letFinish;
    if (finishing) finishingTick();
    else changes(run.tick(Date.now()));
    if (run) readout();
  }

  /** Start the routine, from its first item or from `from` (an item tapped in the list). */
  function start(from) {
    const list_ = enabledItems(items);
    if (!list_.length) return;
    itemEdit = null;
    setEditing(false);
    run = new TimerRun(list_, Date.now(), Math.max(0, list_.indexOf(from)), state.rest);
    restore = configs();
    finishing = false;
    finishedNote = false;
    cues.started(run.item);
    // Everything it may say or ring, decoded ahead so nothing waits on the network.
    if (state.voiceOn) audio.preload([...new Set(list_.flatMap((it, i) => [...voiceLines.started(it), ...voiceLines.changed(it, list_[i + 1] || it), ...voiceLines.finished(it)]))].map((l) => voiceUrl(state.voice, l)));
    if (state.chimeOn) audio.preload([chimeUrl(state.chime)]);
    const said = announce({ lines: voiceLines.started(run.item) });
    startTools(run.item, { hold: said.speaks });
    if (said.speaks) afterVoice(said.done, run.item);
    clearInterval(ticker);
    ticker = setInterval(tick, 250);
    audio.running(true);
    render();
    showCard(TOOLS.find((t) => run.item.tools[t]) || TOOLS[0], false);
    showDots();
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(animate);
  }

  function stop() {
    if (!run) return;
    hush();
    stopTools();
    putBack();
    clearInterval(ticker);
    cancelAnimationFrame(frame);
    audio.running(false);
    run = null;
    finishing = false;
    render();
  }

  function pauseOrResume() {
    if (!run || finishing) return;
    if (run.paused) {
      const begun = run.resume();
      // Out of a break that waited for play: the item begins, with a chime; in a timed break, the tools still rest.
      if (begun.length) changes(begun, true);
      else if (!run.resting) startTools();
      audio.running(true);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(animate);
    } else {
      run.pause();
      hush();
      stopTools();
      audio.running(false);
    }
    readout();
  }

  $('timer-go').addEventListener('click', () => start());
  $('trun-go').addEventListener('click', pauseOrResume);
  $('trun-skip').addEventListener('click', () => { if (run && !finishing) changes(run.tick(Date.now(), true), true); if (run) readout(); });
  $('trun-stop').addEventListener('click', stop);
  // Coming back to the page (a phone woken up), catch up at once.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    tick();
    if (run && !frame) frame = requestAnimationFrame(animate);
  });

  // ------------------------------------------------------------ routines

  /*
   * Practice sets (`state.routines`): several, each a name and its items (on
   * screen each item is a routine). The name above the total opens Practice
   * sets, to practise another, add one (it starts empty and is named at
   * once), rename one or delete one (with Undo while the sheet is open). The
   * last one can't be deleted.
   */
  const R = T.routines;
  const routineName = (r) => r.name.trim() || R.untitled;
  const routinesSheet = $('routines');
  let removed = null; // { routine, index, wasCurrent } while Undo is offered

  function showRoutineName() {
    const r = routine();
    $('routine-pick-name').textContent = routineName(r);
    $('routine-pick').setAttribute('aria-label', R.pick(routineName(r)));
  }

  function useRoutine(id) {
    if (run || id === state.routineId) return;
    save();
    state.routineId = id;
    items = routine().items;
    itemEdit = null;
    typing = null;
    finishedNote = false;
    undo = null;
    $('timer-toast').hidden = true;
    save();
    showRoutineName();
    render();
  }

  function renderRoutines() {
    const many = state.routines.length > 1;
    $('routine-add').hidden = state.routines.length >= MAX_ROUTINES;
    $('routine-list').replaceChildren(...state.routines.map((r) => {
      const li = h('li', 'routine-row');
      li.innerHTML = `<button type="button" class="routine-use"><span class="routine-name"></span><small class="routine-sum"></small></button>
        <button type="button" class="icon-btn routine-rename">${PENCIL}</button>
        <button type="button" class="icon-btn routine-del"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>`;
      const use = li.querySelector('.routine-use');
      use.querySelector('.routine-name').textContent = routineName(r);
      use.querySelector('.routine-sum').textContent = R.summary(enabledItems(r.items).length, Math.round(totalSeconds(r.items) / 60));
      use.setAttribute('aria-pressed', String(r.id === state.routineId));
      use.setAttribute('aria-label', R.use(routineName(r)));
      use.addEventListener('click', () => { useRoutine(r.id); routinesSheet.close(); });
      const ren = li.querySelector('.routine-rename');
      ren.setAttribute('aria-label', R.rename(routineName(r)));
      ren.addEventListener('click', () => renameRoutine(r, li));
      const del = li.querySelector('.routine-del');
      del.hidden = !many;
      del.setAttribute('aria-label', R.remove(routineName(r)));
      del.addEventListener('click', () => removeRoutine(r));
      return li;
    }));
    const u = $('routine-undo');
    u.hidden = !removed;
    if (removed) u.querySelector('span').textContent = R.deleted(routineName(removed.routine));
  }

  function renameRoutine(r, li) {
    const use = li.querySelector('.routine-use');
    const input = Object.assign(document.createElement('input'), { type: 'text', className: 'routine-input', maxLength: 60, value: r.name, placeholder: R.untitled });
    input.setAttribute('aria-label', R.nameField);
    input.enterKeyHint = 'done';
    use.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      if (keep) { r.name = input.value.trim().slice(0, 60); save(); showRoutineName(); }
      renderRoutines();
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
  }

  function removeRoutine(r) {
    if (state.routines.length < 2) return;
    const index = state.routines.indexOf(r);
    const wasCurrent = r.id === state.routineId;
    removed = { routine: r, index, wasCurrent };
    state.routines.splice(index, 1);
    if (wasCurrent) {
      state.routineId = state.routines[Math.min(index, state.routines.length - 1)].id;
      items = routine().items;
      itemEdit = null;
      render();
    }
    save();
    showRoutineName();
    renderRoutines();
  }

  $('routine-undo').querySelector('button').addEventListener('click', () => {
    if (!removed) return;
    const { routine: r, index, wasCurrent } = removed;
    removed = null;
    state.routines.splice(Math.min(index, state.routines.length), 0, r);
    if (wasCurrent) { state.routineId = ''; useRoutine(r.id); } else save();
    showRoutineName();
    renderRoutines();
  });

  $('routine-add').addEventListener('click', () => {
    if (state.routines.length >= MAX_ROUTINES) return;
    let n = state.routines.length + 1;
    while (state.routines.some((r) => r.name === R.newName(n))) n++;
    const r = newRoutine(R.newName(n));
    state.routines.push(r);
    removed = null;
    useRoutine(r.id);
    renderRoutines();
    // Named where it stands, straight away.
    const row = $('routine-list').lastElementChild;
    if (row) renameRoutine(r, row);
  });

  $('routine-pick').addEventListener('click', () => {
    if (run) return;
    removed = null;
    renderRoutines();
    routinesSheet.showModal();
    $('routine-list').querySelector('[aria-pressed="true"]')?.focus();
  });
  routinesSheet.addEventListener('close', () => { removed = null; });
  routinesSheet.addEventListener('click', (e) => { if (e.target === routinesSheet) routinesSheet.close(); });

  showRoutineName();
  render();

  return {
    /** Leaving the screen stops a routine, as leaving the Metronome stops it. */
    leave: () => { stop(); setEditing(false); undo = null; $('timer-toast').hidden = true; },
    enter: () => render(),
    /** A tool changed elsewhere (the Drone's note, say): show it. */
    refresh: () => { if (run) showCards(); },
    get running() { return !!run; },
    /** The name of the item being practised, while a routine runs (takes are named after it). */
    get item() { return run ? label(run.item) : null; },
  };
}
