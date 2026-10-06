// Everyone who loads the page shares one mini-rooms room. The relay closes a
// room when its host leaves, so this layer joins the room if it is open,
// hosts it if not, and quietly reconnects whenever the connection drops. Each
// browser keeps a stable client ID across reconnects; WebRTC calls keep
// running while the relay connection is re-established.
//
//   const net = createNet({ game: 'chat', room: 'everyone', me });
//   net.on('peers', peers => ...)      // Map clientId -> presence, excludes me
//   net.on('status', s => ...)         // 'connecting' | 'connected' | 'reconnecting' | 'full'
//   net.setPresence({ fx: 'puppy' })   // merged into my presence
//   net.send(topic, data)              // to everyone else
//   net.sendTo(clientId, topic, data)  // to one peer (others ignore it)
//   net.onTopic(topic, (data, fromClientId) => ...)

const GONE_AFTER_MS = 3500;
const HEARTBEAT_MS = 10000;

export function createNet({ game, room: roomId, me, rooms = globalThis.MiniRooms }) {
  const listeners = { peers: new Set(), status: new Set() };
  const topicListeners = new Map();
  const subscribedTopics = new Set();
  const peers = new Map(); // clientId -> presence
  const lastSeen = new Map(); // clientId -> time last present
  const presence = { ...me, since: Date.now() };
  let room = null;
  let status = 'connecting';
  let attempt = 0;
  let stopped = false;
  let reconnectTimer = null;
  let knownPeerIds = new Set();

  const api = rooms.connect(game);

  function emit(kind, value) {
    listeners[kind].forEach(cb => {
      try { cb(value); } catch (e) { console.error(e); }
    });
  }

  function setStatus(s) {
    if (status === s) return;
    status = s;
    emit('status', s);
  }

  function publish() {
    room?.publishPresence(presence);
  }

  function wireTopic(r, topic) {
    r.subscribeTopic(topic, msg => {
      if (r !== room || !msg || typeof msg !== 'object') return;
      if (msg.to && msg.to !== me.id) return;
      if (msg.f === me.id) return;
      topicListeners.get(topic)?.forEach(cb => {
        try { cb(msg.d, msg.f); } catch (e) { console.error(e); }
      });
    });
  }

  function open(asHost) {
    const r = asHost
      ? api.host(roomId, { title: 'Games Chat', name: me.name, capacity: 16 })
      : api.join(roomId, { name: me.name });
    room = r;
    knownPeerIds = new Set();
    subscribedTopics.forEach(topic => wireTopic(r, topic));

    r.subscribePresence(({ peers: raw }) => {
      if (r !== room) return;
      if (status !== 'connected') {
        attempt = 0;
        setStatus('connected');
        publish();
      }
      // Re-publish when someone new arrives, so they get my presence even if
      // the relay had forgotten it after hibernating.
      const ids = new Set(Object.keys(raw));
      for (const id of ids) {
        if (!knownPeerIds.has(id)) {
          setTimeout(publish, 100 + Math.random() * 300);
          break;
        }
      }
      knownPeerIds = ids;
      ingest(raw);
    });

    r.onClose(reason => {
      if (r !== room || stopped) return;
      room = null;
      if (reason === 'not_found') return open(true);
      if (reason === 'taken') return open(false);
      if (reason === 'full') {
        setStatus('full');
        reconnectLater(8000);
        return;
      }
      setStatus('reconnecting');
      reconnectLater();
    });
  }

  function reconnectLater(base) {
    clearTimeout(reconnectTimer);
    attempt++;
    const delay = base ?? Math.min(5000, 250 * attempt) + Math.random() * 600;
    reconnectTimer = setTimeout(() => {
      if (!stopped) open(false);
    }, delay);
  }

  function ingest(raw) {
    const now = Date.now();
    // One browser can briefly show under two peer IDs after a reconnect: keep
    // whichever presence was published most recently.
    const fresh = new Map();
    for (const data of Object.values(raw)) {
      if (!data || !data.id || data.id === me.id) continue;
      const prev = fresh.get(data.id);
      if (!prev || (data.ts || 0) >= (prev.ts || 0)) fresh.set(data.id, data);
    }
    for (const [id, data] of fresh) {
      peers.set(id, data);
      lastSeen.set(id, now);
    }
    emit('peers', peers);
  }

  // A peer missing from presence is only dropped after a few seconds, so a
  // quick reconnect doesn't look like leaving and joining again.
  const sweepTimer = setInterval(() => {
    if (status !== 'connected') return;
    const now = Date.now();
    const present = new Set();
    if (room) {
      for (const data of Object.values(room.peers)) if (data?.id) present.add(data.id);
    }
    let changed = false;
    for (const id of [...peers.keys()]) {
      if (present.has(id)) {
        lastSeen.set(id, now);
      } else if (now - (lastSeen.get(id) || 0) > GONE_AFTER_MS) {
        peers.delete(id);
        lastSeen.delete(id);
        changed = true;
      }
    }
    if (changed) emit('peers', peers);
  }, 1000);

  const heartbeatTimer = setInterval(() => {
    presence.ts = Date.now();
    publish();
  }, HEARTBEAT_MS);

  open(false);

  return {
    me,
    get status() { return status; },
    get peers() { return peers; },
    get presence() { return presence; },
    on(kind, cb) {
      listeners[kind].add(cb);
      if (kind === 'peers') cb(peers);
      if (kind === 'status') cb(status);
      return () => listeners[kind].delete(cb);
    },
    setPresence(partial) {
      Object.assign(presence, partial, { ts: Date.now() });
      publish();
    },
    send(topic, data) {
      room?.publishTopic(topic, { f: me.id, d: data });
    },
    sendTo(clientId, topic, data) {
      room?.publishTopic(topic, { f: me.id, to: clientId, d: data });
    },
    onTopic(topic, cb) {
      if (!topicListeners.has(topic)) topicListeners.set(topic, new Set());
      topicListeners.get(topic).add(cb);
      if (!subscribedTopics.has(topic)) {
        subscribedTopics.add(topic);
        if (room) wireTopic(room, topic);
      }
      return () => topicListeners.get(topic).delete(cb);
    },
    leave() {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearInterval(sweepTimer);
      clearInterval(heartbeatTimer);
      room?.leave();
      room = null;
    },
  };
}
