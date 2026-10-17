// Text section (merged into js/text_config.js at the end of the extraction).
// The game shell: loading, camp prompts, results, online play, party, photo mode.
export default {
  // Loading screen, camp, toasts and results (js/main.js)
  game: {
    loading: {
      gpu: 'Detecting GPU…',
      textures: 'Painting textures…',
      camp: 'Building Camp Half-Blood…',
      shaders: 'Compiling shaders…',
      scrolls: 'Unrolling the scrolls…',
      ready: 'Ready',
    },
    failedToStart: 'Failed to start: {error} — your browser needs WebGPU or WebGL2.',
    // Camp Half-Blood
    camp: {
      name: 'Camp Half-Blood',
      objective: 'Big House porch: the chapter map · Camp store · Forge: gear · Chiron: training',
      training: 'Training: call up monsters',
      chapterMap: 'Chapter map',
      store: 'Camp store',
      forge: 'The Forge: temper and enchant gear',
      forgeInventory: 'Forge and inventory',
      chiron: 'Train with Chiron',
      archery: 'Archery range',
      climbing: 'Climbing wall',
      oracle: 'The Oracle',
      cabin: '{parent}\'s cabin: play as {name}',
      iris: 'Iris message: play online',
      irisActive: 'Iris message: online play',
    },
    gearHintPad: 'View: inventory · A: jump',
    gearHintKeys: 'I: inventory · Space: jump',
    nextQuest: 'Next quest: {title}',
    hold: '(hold)',
    // Heroes and chapters
    aHero: 'A hero',
    youAre: 'You are {name}',
    isDown: '{name} is down — revive them!',
    joinsQuest: '{name} joins your quest!',
    hostChooses: 'The host chooses the chapter',
    stillBeingWritten: 'That chapter is still being written',
    chapterSub: 'Chapter {num} · {place}',
    mistThick: 'The Mist is thick here. Click the right stick (V) to see through it.',
    mistSee: 'Click the right stick (V) to see through the Mist.',
    waitingForHost: 'Waiting for the host to return to camp',
    wave: 'Wave {n}',
    levelUp: 'LEVEL {level}! +1 enchantment point, +1 skill point',
    levelUpNamed: '{name}: LEVEL {level}! +1 enchantment point, +1 skill point',
    partyDefeated: 'Party defeated — respawning',
    revived: 'Revived',
    revivedRetry: 'Revived: try the fight again',
    // Players joining on controllers
    controllerConnected: 'Controller connected to Player 1',
    playerJoined: 'Player {n} joined',
    playerJoinedAs: 'Player {n} joined as {name}',
    // Results screen
    results: {
      chapterComplete: 'CHAPTER COMPLETE',
      questComplete: 'QUEST COMPLETE',
      defeated: 'DEFEATED',
      kills: 'Monsters defeated',
      time: 'Time',
      coins: 'Drachmas collected',
      secrets: 'Secrets found',
      noLoot: 'No loot this time.',
      retry: 'Retry',
      continueStory: 'Continue the story ▶',
      returnToCamp: 'Return to Camp Half-Blood',
    },
    // FPS readout (Settings → Graphics → Show FPS)
    readout: '{quality} · {backend}\n{fps} FPS · {res}x res\n{draws} draws · {lights} lights',
    readoutDps: '\nDummy DPS {dps}',
    // Graphics quality names (js/gfx/renderer.js)
    quality: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      ultra: 'Ultra · Ray Traced',
      unknownGpu: 'Unknown GPU',
    },
  },

  // Online play: the Iris Message screen, toasts and name tags (js/net/*.js)
  online: {
    roomTitle: '{name}\'s camp',
    aPlayer: 'A player',
    someone: 'Someone',
    // Toasts
    joined: '{name} joined',
    left: '{name} left',
    reconnected: 'Reconnected',
    reconnecting: 'Reconnecting…',
    offline: 'You are offline',
    connectionLost: 'Connection lost: reconnecting…',
    hostLeftNext: 'The host left. {name} is taking over…',
    hostLeftFinding: 'The host left. Finding a new host…',
    hostSilent: 'The host stopped answering: moving on…',
    nowHost: 'You are now the host',
    playerLeftAi: '{name} left: the AI plays {hero} on',
    takeOver: 'You take over {hero}',
    gotThereFirst: 'Someone else got there first',
    campFull: 'That camp already has four heroes.',
    wantsToSkip: '{name} wants to skip',
    trap: 'It’s a trap!',
    fatalToast: '{why} Playing on here offline.',
    fatal: {
      full: 'That camp is full.',
      not_found: 'That camp has closed.',
      taken: 'That code is in use.',
      unreachable: 'Could not reach the Iris network.',
      host_lost: 'Lost the host.',
      other: 'Disconnected ({reason}).',
    },
    // Connection status
    status: {
      connecting: 'Connecting…',
      open: 'Connected',
      reconnecting: 'Connection lost: reconnecting…',
      migrating: 'The host left: moving to the new host…',
      closed: 'Offline',
    },
    // Name tags over heads
    tag: {
      ai: '{hero} · AI',
      holding: ' (holding)',
      reconnecting: '{name} (reconnecting…)',
    },
    // Iris Message screen
    lobby: {
      title: 'Iris Message',
      intro: 'Toss a golden drachma into the rainbow and call your friends: up to {n} heroes across every screen, and players on one screen can play online together. Playing as {name}.',
      unavailable: 'Online play is not available here.',
      unreachable: 'Could not reach the Iris network.',
      youAreHost: 'you are the host',
      hostChooses: 'the host chooses the chapters',
      roomCode: 'Room code',
      thisScreen: ' · this screen',
      missing: ' · reconnecting…',
      companions: 'Companions: {names}',
      swapIn: ' (D-pad ↓ / F to swap in)',
      back: 'Back',
      closeCamp: 'Close my camp',
      leave: 'Leave',
      openCamp: 'Open my camp (host)',
      rejoin: 'Rejoin {title} ({code})',
      joinWithCode: 'Join with a code',
      codeFive: 'A room code has five letters',
      join: 'Join',
      friendsCamps: 'Friends’ camps',
      choose: 'Choose a camp to join:',
      noCamps: 'No open camps right now. Open yours and give a friend the code.',
      room: '{title} · {code} · {n} connected',
      full: ' (full)',
    },
  },

  // The party (js/party.js)
  party: {
    padDisconnected: 'Controller disconnected: reconnect it to carry on',
    aPlayer: 'A player',
    playerLeft: '{name} left: the AI plays {hero} for now',
    and: ' and ',
    join: { one: '{names} joins your party', other: '{names} join your party' },
  },

  // Godly power (js/domain.js)
  domain: {
    godlyPower: 'GODLY POWER',
  },

  // Photo mode (js/photo.js)
  photo: {
    preparing: 'Photo Mode · preparing path tracer…',
    building: 'Photo Mode · building BVH for {k}k triangles…',
    tracing: 'Photo Mode · path tracing · {n} / {max} samples',
    done: ' · done',
    unavailable: 'Photo Mode unavailable on this device: {error}',
    save: '💾 Save PNG',
    close: 'Close',
  },
};
