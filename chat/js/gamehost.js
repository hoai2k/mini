// Runs minigames on top of the shared room. A game session is a group of
// people playing the same game together; anyone in the room can see a session
// and join it. My session lives in my presence:
//
//   presence.game = { id, sid, since, st, sh }
//     st: my own state in this game (score, paddle position, ...)
//     sh: the shared state; only the owner's copy counts
//
// The owner is the member who joined the session first. If they leave, the
// next member takes over with the last shared state they saw, so turn-based
// games keep going. Game messages travel on the relay topic `g`.
//
// A game module (see games/README.md) is
//   { id, name, emoji, blurb, minPlayers, maxPlayers, needsFace, create(api) }
// and create(api) returns { destroy(), onMessage?(type, data, fromId),
//                           onChange?(), onPad?(pad) }.

import { gameStore, randomId } from './store.js';
import { sfx } from './audio.js';
import { img } from './assets.js';

export function createGameHost({ net, studio, mediaOf, toast, onOpen, onClose }) {
  let current = null; // { game, sid, instance, api, el, lastShared }
  const games = new Map();
  let lastSig = '';

  function register(list) {
    for (const g of list) games.set(g.id, g);
  }

  function myGame() {
    return net.presence.game || null;
  }

  // Everyone in my current session, including me, ordered by when they joined.
  function members() {
    const mine = myGame();
    if (!mine) return [];
    const list = [{ id: net.me.id, name: net.presence.name, color: net.presence.color, since: mine.since, state: mine.st || {}, shared: mine.sh, me: true }];
    for (const [id, p] of net.peers) {
      if (p.game?.sid === mine.sid) {
        list.push({ id, name: p.name, color: p.color, since: p.game.since, state: p.game.st || {}, shared: p.game.sh, me: false });
      }
    }
    list.sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
    return list;
  }

  function owner() {
    return members()[0] ?? null;
  }

  // Sessions other people are in that I'm not part of.
  function sessions() {
    const mine = myGame()?.sid;
    const bySid = new Map();
    for (const [id, p] of net.peers) {
      const g = p.game;
      if (!g || g.sid === mine || !games.has(g.id)) continue;
      if (!bySid.has(g.sid)) bySid.set(g.sid, { sid: g.sid, id: g.id, game: games.get(g.id), people: [] });
      bySid.get(g.sid).people.push({ id, name: p.name, color: p.color, since: g.since });
    }
    return [...bySid.values()];
  }

  function setGamePresence(patch) {
    const g = myGame();
    if (!g) return;
    net.setPresence({ game: { ...g, ...patch } });
    queueMicrotask(changed);
  }

  function open(gameId, sid = null, joinSince = null) {
    const game = games.get(gameId);
    if (!game) return;
    close();
    const el = document.createElement('div');
    el.className = 'game-root';
    const session = sid || randomId();
    net.setPresence({ game: { id: gameId, sid: session, since: joinSince ?? Date.now(), st: {}, sh: null } });
    if (game.needsFace) studio.wantFace(true);

    const handlers = new Map();
    const api = {
      el,
      game,
      sid: session,
      me: { id: net.me.id, name: net.presence.name, color: net.presence.color },
      players: members,
      owner: () => owner()?.id ?? net.me.id,
      isOwner: () => (owner()?.id ?? net.me.id) === net.me.id,
      peers: () => net.peers,
      send(type, data) {
        net.send('g', { sid: session, type, d: data });
      },
      sendTo(id, type, data) {
        net.sendTo(id, 'g', { sid: session, type, d: data });
      },
      on(type, cb) {
        if (!handlers.has(type)) handlers.set(type, new Set());
        handlers.get(type).add(cb);
        return () => handlers.get(type).delete(cb);
      },
      state: () => myGame()?.st || {},
      setState(patch) {
        setGamePresence({ st: { ...(myGame()?.st || {}), ...patch } });
      },
      shared() {
        const o = owner();
        if (!o || o.me) return myGame()?.sh ?? null;
        return o.shared ?? current?.lastShared ?? null;
      },
      setShared(value) {
        setGamePresence({ sh: value });
        if (current) current.lastShared = value;
      },
      store: gameStore(gameId),
      face: () => studio.face,
      selfCanvas: studio.canvas,
      mediaOf,
      img,
      sfx,
      toast,
      exit: () => close(),
    };

    let instance;
    try {
      instance = game.create(api);
    } catch (e) {
      console.error(`game ${gameId} failed to start`, e);
      toast(`${game.name} couldn't start.`);
      net.setPresence({ game: null });
      if (game.needsFace) studio.wantFace(false);
      return;
    }
    current = { game, sid: session, instance, api, el, handlers, lastShared: null, wasOwner: api.isOwner() };
    onOpen?.(current);
    if (!sid) net.send('invite', { id: gameId, sid: session });
    lastSig = '';
    changed();
  }

  function close() {
    if (!current) return;
    const c = current;
    current = null;
    try { c.instance?.destroy?.(); } catch (e) { console.error(e); }
    if (c.game.needsFace) studio.wantFace(false);
    net.setPresence({ game: null });
    onClose?.(c);
  }

  net.onTopic('g', (msg, from) => {
    if (!current || !msg || msg.sid !== current.sid) return;
    try { current.instance.onMessage?.(msg.type, msg.d, from); } catch (e) { console.error(e); }
    current.handlers.get(msg.type)?.forEach(cb => {
      try { cb(msg.d, from); } catch (e) { console.error(e); }
    });
  });

  // Presence arrives many times a second (faces move); only tell the game
  // when something about its session actually changed.
  function changed() {
    if (!current) return;
    const list = members();
    const sig = JSON.stringify(list.map(m => [m.id, m.name, m.since, m.state, m.shared]));
    if (sig === lastSig) return;
    lastSig = sig;
    const o = list[0];
    if (o && !o.me && o.shared != null) current.lastShared = o.shared;
    const isOwner = !o || o.me;
    if (isOwner && !current.wasOwner && current.lastShared != null && myGame()?.sh == null) {
      setGamePresence({ sh: current.lastShared });
    }
    current.wasOwner = isOwner;
    try { current.instance.onChange?.(); } catch (e) { console.error(e); }
  }
  net.on('peers', changed);

  return {
    register,
    games,
    open,
    close,
    join: s => open(s.id, s.sid),
    sessions,
    get current() { return current; },
    changed,
  };
}
