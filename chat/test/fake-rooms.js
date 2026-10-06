// An in-memory stand-in for the mini-rooms relay, for tests and the game
// harness: several clients in one page share rooms through this object, with
// a little delay to behave like a network. Same API as
// multiplayer/client/mini-rooms.js (connect().host/join, presence, topics).

export function createFakeRooms({ latency = 30 } = {}) {
  const rooms = new Map(); // key -> { open, members: Map(peerId -> client) }
  let nextId = 1;
  const later = fn => setTimeout(fn, latency * (0.6 + Math.random() * 0.8));

  function connect(game) {
    function open(roomId, asHost) {
      const key = `${game}/${roomId}`;
      const listeners = { presence: new Set(), topics: new Map(), close: new Set() };
      const peers = {};
      const client = {
        peerId: null, isHost: !!asHost, ready: false, presence: {}, closed: false,
        get peers() { return peers; },
        publishPresence(data) {
          if (client.closed) return;
          client.presence = JSON.parse(JSON.stringify(data));
          const msg = client.presence;
          const room = rooms.get(key);
          if (!room) return;
          for (const other of room.members.values()) if (other !== client) later(() => other._presence(client.peerId, msg));
        },
        subscribePresence(a, b) {
          const cb = typeof a === 'function' ? a : b;
          listeners.presence.add(cb);
          if (client.ready) cb({ peers });
          return () => listeners.presence.delete(cb);
        },
        publishTopic(topic, data) {
          if (client.closed) return;
          const copy = JSON.parse(JSON.stringify(data ?? null));
          const room = rooms.get(key);
          if (!room) return;
          for (const other of room.members.values()) if (other !== client) later(() => other._topic(topic, copy, client.peerId));
        },
        subscribeTopic(topic, cb) {
          if (!listeners.topics.has(topic)) listeners.topics.set(topic, new Set());
          listeners.topics.get(topic).add(cb);
          return () => listeners.topics.get(topic).delete(cb);
        },
        onClose(cb) {
          listeners.close.add(cb);
          return () => listeners.close.delete(cb);
        },
        leave() { finish('left'); },
        _presence(from, data) {
          if (client.closed) return;
          peers[from] = data;
          listeners.presence.forEach(cb => cb({ peers }));
        },
        _join(from) {
          if (client.closed) return;
          peers[from] = peers[from] || {};
          listeners.presence.forEach(cb => cb({ peers }));
        },
        _leave(from) {
          if (client.closed) return;
          delete peers[from];
          listeners.presence.forEach(cb => cb({ peers }));
        },
        _topic(topic, data, from) {
          if (client.closed) return;
          listeners.topics.get(topic)?.forEach(cb => cb(data, from));
        },
        _close(reason) { finish(reason); },
      };
      function finish(reason) {
        if (client.closed) return;
        client.closed = true;
        const room = rooms.get(key);
        if (room && client.peerId) {
          room.members.delete(client.peerId);
          if (client.isHost) {
            room.open = false;
            for (const other of [...room.members.values()]) other._close('host_left');
            room.members.clear();
          } else {
            for (const other of room.members.values()) later(() => other._leave(client.peerId));
          }
        }
        listeners.close.forEach(cb => cb(reason));
      }
      later(() => {
        let room = rooms.get(key);
        if (asHost) {
          if (room?.open) return finish('taken');
          room = { open: true, members: new Map() };
          rooms.set(key, room);
        } else if (!room?.open) {
          return finish('not_found');
        }
        client.peerId = `p${nextId++}`;
        for (const [id, other] of room.members) peers[id] = other.presence;
        room.members.set(client.peerId, client);
        for (const other of room.members.values()) if (other !== client) later(() => other._join(client.peerId));
        client.ready = true;
        listeners.presence.forEach(cb => cb({ peers }));
      });
      return client;
    }
    return {
      game,
      host: (roomId, opts) => open(roomId, true),
      join: (roomId, opts) => open(roomId, false),
      listRooms: async () => [],
      watchRooms: () => () => {},
      newRoomId: () => `r${nextId++}`,
    };
  }
  return { connect };
}
