// Mesh WebRTC: one RTCPeerConnection per other person, negotiated with the
// "perfect negotiation" pattern over the relay's `sig` topic. Good for two
// people and fine up to about four; beyond that every browser uploads its
// video once per peer.
//
//   const rtc = createRtc({ net, stream });
//   rtc.on('stream', (clientId, mediaStream) => ...)
//   rtc.on('state', (clientId, connectionState) => ...)
//   rtc.sync(clientIds)        // open calls to new peers, close calls to gone ones
//   rtc.setStream(mediaStream) // swap my outgoing tracks

const ICE_SERVERS = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

export function createRtc({ net, stream, iceServers = ICE_SERVERS }) {
  const calls = new Map(); // clientId -> call
  const listeners = { stream: new Set(), state: new Set() };
  let local = stream;

  const emit = (kind, ...args) => listeners[kind].forEach(cb => {
    try { cb(...args); } catch (e) { console.error(e); }
  });

  function createCall(id, answering = false) {
    const pc = new RTCPeerConnection({ iceServers });
    const call = {
      id,
      pc,
      polite: net.me.id < id,
      makingOffer: false,
      ignoreOffer: false,
      remote: new MediaStream(),
      senders: new Map(), // kind -> RTCRtpSender
    };
    calls.set(id, call);

    for (const track of local?.getTracks() ?? []) {
      call.senders.set(track.kind, pc.addTrack(track, local));
    }
    // Always be ready to receive audio and video even if I send neither. When
    // answering, the offer already brings a slot for each.
    for (const kind of ['audio', 'video']) {
      if (!answering && !call.senders.has(kind)) pc.addTransceiver(kind, { direction: 'recvonly' });
    }

    pc.ontrack = ({ track }) => {
      call.remote.getTracks().filter(t => t.kind === track.kind).forEach(t => call.remote.removeTrack(t));
      call.remote.addTrack(track);
      emit('stream', id, call.remote);
    };
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) net.sendTo(id, 'sig', { cand: candidate.toJSON() });
    };
    pc.onnegotiationneeded = async () => {
      try {
        call.makingOffer = true;
        await pc.setLocalDescription();
        net.sendTo(id, 'sig', { desc: pc.localDescription.toJSON() });
      } catch (e) {
        console.warn('negotiation failed', e);
      } finally {
        call.makingOffer = false;
      }
    };
    pc.onconnectionstatechange = () => {
      emit('state', id, pc.connectionState);
      if (pc.connectionState === 'failed') pc.restartIce();
    };
    return call;
  }

  async function onSignal(msg, from) {
    if (!msg || !from) return;
    let call = calls.get(from);
    if (!call) {
      if (!msg.desc) return; // candidates for a call I don't have yet are stale
      call = createCall(from, true);
    }
    const { pc } = call;
    try {
      if (msg.desc) {
        const collision = msg.desc.type === 'offer' && (call.makingOffer || pc.signalingState !== 'stable');
        call.ignoreOffer = !call.polite && collision;
        if (call.ignoreOffer) return;
        await pc.setRemoteDescription(msg.desc);
        if (msg.desc.type === 'offer') {
          await pc.setLocalDescription();
          net.sendTo(from, 'sig', { desc: pc.localDescription.toJSON() });
        }
      } else if (msg.cand) {
        try {
          await pc.addIceCandidate(msg.cand);
        } catch (e) {
          if (!call.ignoreOffer) console.warn('bad candidate', e);
        }
      } else if (msg.bye) {
        close(from);
      }
    } catch (e) {
      console.warn('signal failed', e);
    }
  }

  net.onTopic('sig', onSignal);

  function close(id) {
    const call = calls.get(id);
    if (!call) return;
    calls.delete(id);
    try { call.pc.close(); } catch {}
    emit('state', id, 'closed');
  }

  return {
    on(kind, cb) {
      listeners[kind].add(cb);
      return () => listeners[kind].delete(cb);
    },
    // Both sides call sync when they see each other. The impolite side (the
    // larger ID) starts the call; the polite side answers, which avoids two
    // offers crossing on the first contact.
    sync(ids) {
      const want = new Set(ids);
      for (const id of want) {
        if (!calls.has(id) && net.me.id > id) createCall(id);
      }
      for (const id of [...calls.keys()]) if (!want.has(id)) close(id);
    },
    setStream(stream) {
      local = stream;
      for (const call of calls.values()) {
        for (const track of stream.getTracks()) {
          const sender = call.senders.get(track.kind);
          if (sender) {
            sender.replaceTrack(track);
          } else {
            const tr = call.pc.getTransceivers().find(t => t.receiver.track?.kind === track.kind && !t.sender.track);
            if (tr) {
              tr.direction = 'sendrecv';
              tr.sender.replaceTrack(track);
              tr.sender.setStreams?.(stream);
              call.senders.set(track.kind, tr.sender);
            } else {
              call.senders.set(track.kind, call.pc.addTrack(track, stream));
            }
          }
        }
      }
    },
    stateOf: id => calls.get(id)?.pc.connectionState ?? 'new',
    streamOf: id => calls.get(id)?.remote ?? null,
    closeAll() {
      for (const id of [...calls.keys()]) {
        net.sendTo(id, 'sig', { bye: true });
        close(id);
      }
    },
  };
}
