// Mesh WebRTC: one RTCPeerConnection per other person, negotiated with the
// "perfect negotiation" pattern over the relay's `sig` topic. Good for two
// people and fine up to about four; beyond that every browser uploads its
// video once per peer.
//
// Calls look after themselves: a call that hasn't connected after a while or
// has dropped restarts ICE, and a call can be rebuilt from scratch with
// retry(id). Every call reports a phase the interface can show:
//
//   connecting    setting up (or waiting for the other side to start)
//   retrying      taking longer than it should; trying again
//   failed        not connecting; keeps trying slowly in the background
//   connected     video flowing
//   reconnecting  was connected, the connection dropped
//   frozen        connected, but no video frames are arriving
//
//   const rtc = createRtc({ net, stream, iceServers });
//   rtc.on('stream', (clientId, mediaStream) => ...)
//   rtc.on('info', (clientId, info) => ...)   // phase or stats changed
//   rtc.sync(clientIds)        // open calls to new peers, close calls to gone ones
//   rtc.info(clientId)         // { phase, ice, route, rttMs, fps, kbpsIn, kbpsOut, loss, restarts, ... }
//   rtc.retry(clientId)        // tear the call down and start again
//   rtc.setStream(mediaStream) // swap my outgoing tracks
//   rtc.setIceServers(list)    // e.g. once TURN credentials arrive

export const STUN_SERVERS = [
  { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
];

const SLOW_S = 10;        // connecting this long: restart ICE
const FAIL_RESTARTS = 2;  // after this many restarts without luck: "failed"
const DROP_S = 4;         // disconnected this long: restart ICE
const FROZEN_S = 4;       // connected but no new frames this long: "frozen"
const BACKGROUND_S = 30;  // a failed call keeps retrying this often

export function createRtc({ net, stream, iceServers = STUN_SERVERS, test = {} }) {
  const calls = new Map(); // clientId -> call
  const waiting = new Map(); // clientId -> time I started waiting for their offer
  const listeners = { stream: new Set(), state: new Set(), info: new Set() };
  const scale = test.timeScale || 1;
  let local = stream;
  let servers = iceServers;

  const emit = (kind, ...args) => listeners[kind].forEach(cb => {
    try { cb(...args); } catch (e) { console.error(e); }
  });

  function createCall(id, answering = false) {
    const pc = new RTCPeerConnection({ iceServers: servers });
    const now = performance.now();
    const call = {
      id,
      pc,
      polite: net.me.id < id,
      makingOffer: false,
      ignoreOffer: false,
      remote: new MediaStream(),
      senders: new Map(), // kind -> RTCRtpSender
      queue: Promise.resolve(),
      startedAt: now,
      tryAt: now,           // when the current attempt started
      droppedAt: 0,
      connectedAt: 0,
      restarts: 0,
      phase: 'connecting',
      stats: { route: null, rttMs: null, fps: null, kbpsIn: null, kbpsOut: null, loss: null },
      frames: null,         // last framesDecoded seen
      framesAt: now,        // when it last went up
      prev: null,           // previous stats sample for rates
    };
    calls.set(id, call);
    waiting.delete(id);

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
      if (candidate && !test.dropCandidates) net.sendTo(id, 'sig', { cand: candidate.toJSON() });
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
      const s = pc.connectionState;
      if (s === 'connected') {
        call.connectedAt = performance.now();
        call.droppedAt = 0;
        call.restarts = 0;
        call.framesAt = performance.now();
      } else if ((s === 'disconnected' || s === 'failed') && !call.droppedAt) {
        call.droppedAt = performance.now();
      }
      emit('state', id, s);
      check(call);
    };
    return call;
  }

  function restart(call, why) {
    call.restarts++;
    call.tryAt = performance.now();
    console.info(`call ${call.id}: restarting ICE (${why}, attempt ${call.restarts})`);
    try { call.pc.restartIce(); } catch (e) { console.warn('restartIce failed', e); }
  }

  function setPhase(call, phase) {
    if (call.phase === phase) return;
    call.phase = phase;
    emit('info', call.id, info(call.id));
  }

  // Decides the phase and restarts calls that are stuck or dropped.
  function check(call) {
    const now = performance.now();
    const s = call.pc.connectionState;
    const since = (now - call.tryAt) / 1000 / scale;
    if (s === 'connected') {
      const video = call.remote.getVideoTracks()[0];
      const stalled = video && video.readyState === 'live' && call.frames !== null && (now - call.framesAt) / 1000 / scale > FROZEN_S;
      setPhase(call, stalled ? 'frozen' : 'connected');
      return;
    }
    if (call.connectedAt && (s === 'disconnected' || s === 'failed')) {
      setPhase(call, 'reconnecting');
      if ((now - call.droppedAt) / 1000 / scale > DROP_S && since > DROP_S) restart(call, s);
      return;
    }
    if (s === 'closed') return;
    // Never connected yet (new, connecting, or failed on the first try).
    if (call.restarts >= FAIL_RESTARTS && since > SLOW_S) {
      setPhase(call, 'failed');
      if (since > BACKGROUND_S) restart(call, 'background retry');
    } else if (since > SLOW_S || s === 'failed') {
      restart(call, s === 'failed' ? 'failed' : 'slow');
      setPhase(call, 'retrying');
    } else {
      setPhase(call, call.restarts ? 'retrying' : 'connecting');
    }
  }

  async function sample(call) {
    if (call.pc.connectionState !== 'connected') return;
    let report;
    try { report = await call.pc.getStats(); } catch { return; }
    const byId = new Map();
    report.forEach(s => byId.set(s.id, s));
    let pair = null, inV = null, outV = null, inBytes = 0, outBytes = 0;
    report.forEach(s => {
      if (s.type === 'transport' && s.selectedCandidatePairId) pair = byId.get(s.selectedCandidatePairId) || pair;
      if (s.type === 'candidate-pair' && !pair && s.nominated && s.state === 'succeeded') pair = s;
      if (s.type === 'inbound-rtp') {
        inBytes += s.bytesReceived || 0;
        if (s.kind === 'video') inV = s;
      }
      if (s.type === 'outbound-rtp') {
        outBytes += s.bytesSent || 0;
        if (s.kind === 'video') outV = s;
      }
    });
    const now = performance.now();
    const st = call.stats;
    if (pair) {
      const l = byId.get(pair.localCandidateId), r = byId.get(pair.remoteCandidateId);
      st.route = l?.candidateType === 'relay' || r?.candidateType === 'relay' ? 'relay' : 'direct';
      st.rttMs = pair.currentRoundTripTime != null ? Math.round(pair.currentRoundTripTime * 1000) : st.rttMs;
    }
    const prev = call.prev;
    if (prev) {
      const dt = (now - prev.t) / 1000;
      st.kbpsIn = Math.round(((inBytes - prev.inBytes) * 8) / 1000 / dt);
      st.kbpsOut = Math.round(((outBytes - prev.outBytes) * 8) / 1000 / dt);
      if (inV) {
        const lost = (inV.packetsLost || 0) - (prev.lost || 0);
        const got = (inV.packetsReceived || 0) - (prev.got || 0);
        st.loss = lost + got > 0 ? Math.max(0, Math.round((lost / (lost + got)) * 100)) : 0;
        st.fps = inV.framesPerSecond ?? Math.round(((inV.framesDecoded || 0) - (prev.frames || 0)) / dt);
      }
    }
    if (inV) {
      if (call.frames === null || (inV.framesDecoded || 0) > call.frames) call.framesAt = now;
      call.frames = inV.framesDecoded || 0;
    }
    call.prev = { t: now, inBytes, outBytes, lost: inV?.packetsLost, got: inV?.packetsReceived, frames: inV?.framesDecoded };
    emit('info', call.id, info(call.id));
  }

  // The watchdog: phases every second, stats every two.
  let tick = 0;
  setInterval(() => {
    tick++;
    for (const call of calls.values()) {
      check(call);
      if (tick % 2 === 0) sample(call);
    }
    // The polite side waits for an offer; if none comes, nudge the other side.
    for (const [id, since] of waiting) {
      if ((performance.now() - since) / 1000 / scale > SLOW_S / 2) {
        waiting.set(id, performance.now());
        net.sendTo(id, 'sig', { ping: true });
        emit('info', id, info(id));
      }
    }
  }, 1000 * Math.min(1, scale));

  function handle(call, msg, from) {
    const { pc } = call;
    return (async () => {
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
      }
    })().catch(e => console.warn('signal failed', e));
  }

  function onSignal(msg, from) {
    if (!msg || !from) return;
    if (msg.bye) return close(from);
    if (msg.reset) {
      // The other side is starting over: drop my half and, if I'm the one
      // who calls, call again.
      close(from);
      if (net.me.id > from) createCall(from);
      else waiting.set(from, performance.now());
      return;
    }
    if (msg.ping) {
      // They are waiting for my offer: make sure a call exists.
      if (!calls.has(from) && net.me.id > from) createCall(from);
      return;
    }
    let call = calls.get(from);
    if (!call) {
      if (!msg.desc) return; // candidates for a call I don't have yet are stale
      call = createCall(from, true);
    }
    // One message at a time per call, in the order they arrived.
    call.queue = call.queue.then(() => handle(call, msg, from));
  }

  net.onTopic('sig', onSignal);

  function close(id) {
    const call = calls.get(id);
    if (!call) return;
    calls.delete(id);
    try { call.pc.close(); } catch {}
    emit('state', id, 'closed');
  }

  function info(id) {
    const call = calls.get(id);
    if (!call) {
      const since = waiting.get(id);
      return { phase: 'connecting', ice: 'new', waitingForOffer: since != null, restarts: 0, route: null, rttMs: null, fps: null, kbpsIn: null, kbpsOut: null, loss: null };
    }
    return {
      phase: call.phase,
      ice: call.pc.connectionState,
      startedAt: call.startedAt,
      connectedAt: call.connectedAt,
      restarts: call.restarts,
      ...call.stats,
    };
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
        if (calls.has(id)) continue;
        if (net.me.id > id) createCall(id);
        else if (!waiting.has(id)) waiting.set(id, performance.now());
      }
      for (const id of [...calls.keys()]) if (!want.has(id)) close(id);
      for (const id of [...waiting.keys()]) if (!want.has(id)) waiting.delete(id);
    },
    info,
    get turn() { return servers.some(s => [].concat(s.urls).some(u => /^turns?:/.test(u))); },
    retry(id) {
      net.sendTo(id, 'sig', { reset: true });
      close(id);
      if (net.me.id > id) createCall(id);
      else waiting.set(id, performance.now());
      emit('info', id, info(id));
    },
    setIceServers(list) {
      servers = list;
      for (const call of calls.values()) {
        try { call.pc.setConfiguration({ ...call.pc.getConfiguration(), iceServers: list }); } catch {}
        if (call.pc.connectionState !== 'connected') restart(call, 'new ICE servers');
      }
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
