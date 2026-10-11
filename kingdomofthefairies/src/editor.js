// ?edit=local: a panel for setting how far each edition is unlocked on this
// machine. Each edition keeps its own save (STORAGE_PREFIXES); the panel
// reads and writes all three, so they can be set independently. Opening an
// act opens the acts before it; "every scene" also opens all the scenes of
// the open acts in the scene select. Nothing here leaves this browser.
import { STORAGE_PREFIXES, EDITION } from './theme.js';

const EDITIONS = [
  { id: 'partial', name: 'Kingdom of the Fairies (default)', query: '', acts: ['The Crossing', "The Sleepers' Grotto", "The Sea King's Court", "The Whale's Road", 'The Enchanted Tower'] },
  { id: 'film', name: 'The film edition', query: '?widowsbay=off', acts: ['Prologue · The Betrothal', 'The Royal Crossing', 'The Water Fairy', "Neptune's Court", "The Whale's Passage", 'The Enchanted Tower', 'The Burning Tower'] },
  { id: 'widowsbay', name: "Widow's Bay", query: '?widowsbay=on', acts: ['The Crossing', "The Sleepers' Grotto", "The Sea King's Court", "The Whale's Road", "Widow's Bay"] },
];
const ALL_SCENES = 99;   // more than any act has

const keyOf = (id) => STORAGE_PREFIXES[id] + '.save.v1';
function read(id) {
  try { const s = JSON.parse(localStorage.getItem(keyOf(id)) || 'null'); if (s && s.v === 1) return s; } catch { /* storage unavailable */ }
  return { v: 1, unlocked: 1, results: {}, best: {} };
}
function write(id, save) { try { localStorage.setItem(keyOf(id), JSON.stringify(save)); return true; } catch { return false; } }
const allScenes = (save) => Object.keys(save.scenes || {}).length > 0 && Object.values(save.scenes).every((v) => v >= ALL_SCENES);

export function editorWanted() { return new URLSearchParams(location.search).get('edit') === 'local'; }

// Builds and opens the panel; `onChange(id)` runs after an edition's save is
// written (the game reloads its own save when that edition is the one open).
export function openEditor(onChange = () => {}) {
  const dlg = document.createElement('dialog');
  dlg.id = 'unlock-editor';
  dlg.className = 'unlock-editor';
  dlg.setAttribute('aria-labelledby', 'unlock-h');
  dlg.innerHTML = `<h2 id="unlock-h">Unlocked acts on this machine</h2>
    <p class="unlock-note">Each version of the game keeps its own progress. Choose how far each one is open; it is saved in this browser only.</p>
    <div class="unlock-list"></div>
    <div class="unlock-row"><button type="button" data-close data-focus>Done</button></div>`;
  const list = dlg.querySelector('.unlock-list');
  for (const ed of EDITIONS) {
    const save = read(ed.id), n = ed.acts.length;
    const box = document.createElement('section');
    box.className = 'unlock-edition' + (ed.id === EDITION ? ' current' : '');
    const opts = ed.acts.map((a, i) => `<option value="${i + 1}"${Math.min(save.unlocked, n) === i + 1 ? ' selected' : ''}>${i + 1} · up to ${a}</option>`).join('');
    box.innerHTML = `<h3>${ed.name}${ed.id === EDITION ? ' <small>(this page)</small>' : ''}</h3>
      <p class="unlock-q"><a href="./${ed.query ? ed.query + '&' : '?'}edit=local">${ed.query || 'no parameter'}</a></p>
      <label>Acts open <select data-ed="${ed.id}">${opts}</select></label>
      <label class="unlock-check"><input type="checkbox" data-scenes="${ed.id}"${allScenes(save) ? ' checked' : ''}> every scene of the open acts</label>
      <ol>${ed.acts.map((a, i) => `<li data-i="${i}">${a}</li>`).join('')}</ol>`;
    list.append(box);
    const sel = box.querySelector('select'), chk = box.querySelector('input');
    const paint = () => box.querySelectorAll('li').forEach((li) => li.classList.toggle('open', +li.dataset.i < +sel.value));
    const save1 = () => {
      const s = read(ed.id);
      s.unlocked = +sel.value;
      s.scenes = { ...(s.scenes || {}) };
      for (let a = 1; a <= n; a++) {
        if (chk.checked && a <= s.unlocked) s.scenes[a] = ALL_SCENES;
        else if (s.scenes[a] >= ALL_SCENES) delete s.scenes[a];
      }
      write(ed.id, s); paint(); onChange(ed.id);
    };
    sel.addEventListener('change', save1);
    chk.addEventListener('change', save1);
    paint();
  }
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}
