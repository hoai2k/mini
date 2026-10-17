// Every word Music Practice shows, in one place.
//
// Edit the words here, never in the code that draws them. Keys are named for
// where the words appear (`metronome.settings.sound`, `recorder.state.waiting`),
// so the place on screen tells you the key and the key tells you the place.
//
// - A plain string is shown as it is.
// - A line with a number or a name in it is a small function of that value,
//   so a translation can put the value wherever its own sentence needs it.
// - Strings used with rich() (in text.js) may mark **bold** and _emphasis_;
//   nothing else is markup, so a translator never handles HTML.
//
// index.html holds no words of its own: its elements name a key here
// (data-text, data-text-rich, data-text-aria-label, data-text-placeholder)
// and text.js fills them in before the page shows. `npm test`-style checks in
// app/test/text.test.mjs keep it that way: every key the page names exists,
// and no words creep back into index.html.
//
// Not in here, on purpose: the privacy page (privacy.html, a document of its
// own), the device details that Send feedback attaches (diagnostics written
// for the developer), the native apps' own strings (the microphone reason in
// iOS's Info.plist, Android's notification), and note names (C, D♯, B♭…).
//
// For another language later: copy this object, translate the values, and
// choose which table text.js reads (see `TEXT` at the bottom).

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** @typedef {string | ((...args: any[]) => string)} Line */

export const EN = {
  app: {
    name: 'Music Practice',
    /** The browser tab's title on a tool's screen. */
    pageTitle: (screen) => `${screen} · Music Practice`,
  },

  common: {
    close: 'Close',
    backToStart: 'Back to start',
    done: 'Done',
    volume: 'Volume',
    audioCheck: 'Audio check…',
    tryAgain: 'Try again',
    reload: 'Reload',
    undo: 'Undo',
    instrument: 'Instrument',
    referencePitch: (hz) => `Reference pitch: A4 = **${hz} Hz**`,
    referencePitchSlider: 'Reference pitch in hertz',
    lowerByOneHz: 'Lower by 1 Hz',
    higherByOneHz: 'Higher by 1 Hz',
    ms: (n) => `${n} ms`,
  },

  home: {
    /** The big title on the home screen. */
    title: 'Music _Practice_',
    settings: 'Settings',
    tools: {
      metronome: 'Metronome',
      tuner: 'Tuner',
      drone: 'Drone',
      record: 'Playback',
    },
    /** Under a tool that isn't ready yet. */
    inProgress: 'In progress',
    /** The badge on a Pro tool in the apps. */
    proBadge: 'Pro',
  },

  appSettings: {
    title: 'Settings',
    theme: 'Theme',
    appearance: 'Light and dark',
    appearances: {
      default: 'As designed',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    sendFeedback: 'Send feedback…',
    pro: {
      title: 'Music Practice Pro',
      on: 'Pro is on',
      off: 'Drone, every take, all themes',
      openWhenOn: 'Pro…',
      openWhenOff: 'Get Pro…',
      appId: 'Your app ID (tap to copy):',
      copied: 'Copied.',
    },
  },

  themes: {
    classic: 'Classic',
    deco: 'Art Deco',
    sixties: 'Vintage 60s',
    baroque: '18th Century',
    scifi: 'Robot Future',
    nouveau: 'French Nouveau',
    anime: 'Candy',
    steampunk: 'Steam Punk',
  },

  metronome: {
    title: 'Metronome',
    settingsButton: 'Metronome settings',
    slower: 'Slower by one',
    faster: 'Faster by one',
    tempoInput: 'Tempo in beats per minute',
    tempoSlider: 'Tempo',
    bpm: 'BPM',
    start: 'Start',
    stop: 'Stop',
    couldntStart: 'Couldn\'t start the metronome. Try again.',
    /** The Italian tempo marking under the number. */
    markings: {
      largo: 'Largo',
      larghetto: 'Larghetto',
      adagio: 'Adagio',
      andante: 'Andante',
      moderato: 'Moderato',
      allegro: 'Allegro',
      vivace: 'Vivace',
      presto: 'Presto',
      prestissimo: 'Prestissimo',
    },
    /** Under the Start button: the time signature and the accent. */
    meterNote: (meter, accented) => `${meter} · ${accented ? 'strong beat on 1' : 'all beats even'}`,
    noBars: 'No bars',
    /** In the time signature list. */
    noBarsLong: 'No bars (every beat the same)',
    sounds: {
      wood: 'Woodblock',
      click: 'Click',
      beep: 'Beep',
    },
    settings: {
      title: 'Metronome settings',
      timeSignature: 'Time signature',
      accent: 'Strong beat on 1',
      sound: 'Sound',
      motion: 'Swinging pendulum',
      pulse: 'Visual pulse',
      sync: 'Sound and visuals sync',
      openSync: 'Manually sync sound and visuals…',
    },
    sync: {
      title: 'Line up with the sound',
      help: 'Watch the pulse and listen. If the flash comes before the click, press +; if after, press −.',
      sooner: 'Show the beat 10 ms sooner',
      later: 'Show the beat 10 ms later',
      value: (ms) => `${ms > 0 ? '+' : ''}${ms} ms`,
      tapHelp: 'Or tap along: tap the button on every click you hear, and it works out the delay.',
      tap: 'Tap on each click',
      keepTapping: (n, of) => `Keep tapping… (${n} of ${of})`,
      uneven: 'Those taps were uneven. Try again, tapping right on each click.',
      set: (ms, delay) => `Set to ${ms} ms from your taps (the sound takes about ${delay} ms to reach you). Fine-tune with − and + if needed.`,
    },
  },

  recorder: {
    title: 'Playback Recorder',
    settingsButton: 'Playback Recorder settings',
    turnOn: 'Turn recording on',
    turnOff: 'Turn recording off',
    stopPlayback: 'Stop playback',
    waveform: 'Microphone waveform',
    /** The big status line and the hint under it. */
    state: {
      off: 'Off',
      offHint: 'Tap the button to start listening.',
      waiting: 'Listening…',
      waitingHint: 'Start playing whenever you\'re ready.',
      recording: (time) => `Recording ${time}`,
      recordingHint: (sec) => `Stop playing for ${sec} s to finish.`,
      playing: 'Playing back',
      playingHint: 'Listening starts again when it ends.',
      playingDuringHint: 'Start playing any time to begin a new take.',
      paused: 'Paused',
      pausedHint: 'Listening starts again when you\'re done here.',
      tapToRestart: 'Tap anywhere to start listening again.',
      tapToHear: 'Tap anywhere to let the app hear you.',
    },
    takesTitle: 'Your takes',
    takesCount: (n) => `(${n})`,
    takesEmpty: (sec) => `Your takes will appear here. Play something and pause for ${sec} seconds when you're done.`,
    /** A take's name until it is renamed. */
    takeName: (n, when) => `Take ${n} · ${when}`,
    /** The file name a take is saved under when it has no name. */
    takeFile: 'Take',
    takeNameField: 'Take name',
    renameTake: (label) => `${label}. Tap to rename`,
    playTake: (n) => `Play take ${n}`,
    stopTake: (n) => `Stop take ${n}`,
    deleteTake: (n) => `Delete take ${n}`,
    saveTake: (n) => `Save take ${n} as an MP3`,
    makingMp3: 'Making the MP3…',
    mp3Ready: 'MP3 ready: tap to save',
    mp3ReadyNote: 'MP3 ready: tap save again.',
    mp3Failed: 'Couldn\'t make the MP3. Try again.',
    saveFailed: 'Couldn\'t save the MP3. Try again.',
    takeDeleted: 'Take deleted',
    /** Below the newest takes in the free app. */
    olderKept: (n) => `${n} older take${n === 1 ? ' is' : 's are'} kept.`,
    keepEvery: 'Keep every take with Pro',
    settings: {
      title: 'Playback Recorder settings',
      silence: (sec) => `Finish after silence of **${sec} s**`,
      startOn: 'Start recording on',
      startOnMusic: 'Musical notes',
      startOnAny: 'Any sound',
      startOnHelp: 'Musical notes ignores noises like moving a chair. Choose any sound for drums and percussion.',
      sensitivity: 'Sensitivity',
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      sensitivityHelp: 'Lower it in a noisy room; raise it for quiet instruments or a distant phone.',
      autoplay: 'Play each take back automatically',
      during: 'Record during playback',
      duringHelp: 'Off: the microphone turns off while a take plays and back on afterwards, so playback is full volume. On: it keeps listening, and playing over a take starts the next one (echo cancellation is used; headphones work best, and on iPhone playback is quieter).',
    },
  },

  /** Why the microphone couldn't be opened (recorder and tuner). */
  micErrors: {
    offInApp: 'Microphone access is off. Turn it on for Music Practice in your phone\'s Settings, then tap the button.',
    refused: 'Microphone access was refused. Allow it in your browser\'s site settings, then tap the button.',
    unsupported: 'This browser can\'t use the microphone here. Try Safari or Chrome over https.',
    failed: 'Couldn\'t open the microphone. Check that no other app is using it, then tap the button.',
    /** The same messages on the tuner, whose button is Try again. */
    tunerOffInApp: 'Microphone access is off. Turn it on for Music Practice in your phone\'s Settings, then tap Try again.',
    tunerRefused: 'Microphone access was refused. Allow it in your browser\'s site settings, then tap Try again.',
    tunerFailed: 'Couldn\'t open the microphone. Check that no other app is using it, then tap Try again.',
  },

  tuner: {
    title: 'Tuner',
    settingsButton: 'Tuner settings',
    strings: 'Strings: tap one to hear it',
    playString: (note) => `${note} string: play its note`,
    playNote: (note) => `Play ${note}`,
    playReference: (note) => `Play a reference ${note}`,
    cents: (sign, n) => `${sign}${n} cents`,
    hz: (hz) => `${hz} Hz`,
    hint: {
      playString: 'Play a string',
      playNote: 'Play a note',
      inTune: 'In tune',
      tooLow: 'Too low: tune up',
      tooHigh: 'Too high: tune down',
    },
    micOff: 'The microphone is off.',
    tapToRestart: 'Tap anywhere to start listening again.',
    tapToHear: 'Tap anywhere to let the tuner hear you.',
    settings: {
      title: 'Tuner settings',
      noteNames: 'Note names',
      sharps: 'Sharps (C♯)',
      flats: 'Flats (D♭)',
      transpose: 'Transposing instrument',
    },
    /** The instrument list. */
    tunings: {
      chromatic: 'Chromatic (any note)',
      guitar: 'Guitar: E A D G B E',
      'guitar-dropd': 'Guitar, drop D: D A D G B E',
      'guitar-dadgad': 'Guitar, DADGAD',
      bass4: 'Bass: E A D G',
      bass5: 'Bass, 5-string: B E A D G',
      ukulele: 'Ukulele: G C E A',
      violin: 'Violin: G D A E',
      viola: 'Viola: C G D A',
      cello: 'Cello: C G D A',
      mandolin: 'Mandolin: G D A E',
      banjo: 'Banjo: G D G B D',
    },
    /** The transposing instrument list. */
    transposes: {
      C: 'C (concert)',
      Bb: 'B♭ (clarinet, trumpet, tenor sax)',
      Eb: 'E♭ (alto & baritone sax)',
      F: 'F (horn)',
    },
  },

  drone: {
    title: 'Drone',
    settingsButton: 'Drone settings',
    down: 'Down a semitone',
    up: 'Up a semitone',
    pitch: 'Pitch',
    play: 'Play',
    pause: 'Pause',
    stopsIn: (time) => `Stops in ${time}`,
    playsFor: (time) => `Plays for ${time}`,
    nextIn: (note, time) => `Next: ${note} in ${time}`,
    done: (time, note) => `Done: ${time} on ${note}`,
    voices: {
      cello: 'Cello',
      'cello-soft': 'Cello, soft (sul tasto)',
      organ: 'Organ',
      'organ-synth': 'Synth organ',
    },
    sequences: {
      stop: 'Stop',
      'chrom-up': 'Next note up (chromatic)',
      'chrom-down': 'Next note down (chromatic)',
      'major-up': 'Up the major scale',
      'major-down': 'Down the major scale',
      fifths: 'Up a fifth (circle of fifths)',
      fourths: 'Up a fourth (circle of fourths)',
    },
    settings: {
      title: 'Drone settings',
      fifth: 'Add a fifth above',
      fifthHelp: 'A pure fifth over the drone note.',
      timed: 'Timed drone',
      length: (min) => `Length: **${min} min**`,
      then: 'When time\'s up',
      timedHelp: 'Notes move within the drone\'s two octaves (C2 to B3), wrapping round by octaves. Scales are the major scale of the note you started on.',
      a4Help: 'Shared with the tuner, so the drone and the tuner agree.',
    },
    /** What the lock screen and the notification say while it plays (the apps). */
    nowPlaying: (note, voice) => `Drone · ${note} · ${voice}`,
  },

  /** What the lock screen and the notification say while the metronome plays (the apps). */
  nowPlaying: {
    metronome: (bpm) => `Metronome · ${bpm} BPM`,
    drone: 'Drone',
  },

  audioCheck: {
    title: 'Audio check',
    reportProblem: 'Report a problem…',
    blocked: 'The microphone is blocked for this site, so the Playback Recorder can\'t listen. Allow it in your browser\'s site settings, then reload.',
    askedAgain: 'Your browser asked for the microphone again, so the app keeps it for this visit. ',
    keptOpen: 'Once the Playback Recorder has been opened, sound plays on the phone\'s own speaker rather than a Bluetooth speaker: the mic is kept open so your browser doesn\'t ask for permission after every take. ',
    toUseBluetooth: 'To play on Bluetooth, allow the microphone for this site permanently, then reload:',
    microphone: 'Microphone',
    micAuto: 'Automatic (built-in preferred)',
    micDefaultName: 'Microphone',
    bluetoothName: (label) => `${label} (Bluetooth)`,
    speaker: 'Speaker',
    speakerDefault: 'System default (recommended)',
    speakerDefaultName: 'Speaker',
    testSound: 'Play test sound',
    testFailed: 'Couldn\'t play (tap again)',
    reportTitle: 'What the browser reports',
    report: {
      engine: 'Browser engine',
      engineWebKit: 'Safari / WebKit (all iPhone browsers)',
      engineOther: 'Not WebKit',
      permission: 'Mic permission (reported)',
      permissions: {
        granted: 'Allowed for this site',
        prompt: 'Asked each visit (not saved)',
        denied: 'Blocked',
        unknown: 'Not reported',
      },
      firstRequest: 'First mic request',
      firstRequestNone: 'Not made yet (open the Playback Recorder)',
      firstRequestQuick: (ms) => `${ms} ms: granted at once, so allowed in advance`,
      firstRequestSlow: (ms, limit) => `${ms} ms: slower than ${limit} ms, so the browser asked`,
      duringPlayback: 'Mic during playback',
      freed: 'Freed (Bluetooth can be used)',
      kept: 'Kept (avoids permission prompts)',
      micNow: 'Mic now',
      inUse: 'In use',
      heldOff: 'Held, switched off',
      notHeld: 'Not held',
      microphones: 'Microphones',
      speakers: 'Speakers',
      none: 'None',
      hiddenCount: (n) => `${n} (names hidden)`,
      speakersNotShown: 'Not shown by this browser',
      bluetooth: 'Bluetooth seen',
      bluetoothNone: 'None by name (a speaker without a mic can\'t be seen on iPhone)',
      delay: 'Output delay',
      delayUnknown: 'Start the metronome or recorder to measure',
      delayMs: (ms) => `${ms} ms${ms > 100 ? ' (likely Bluetooth)' : ''}`,
      safariMode: 'Safari audio mode',
      notAvailable: 'Not available',
      lastTake: 'Last take played',
      lastTakeNone: 'None yet',
      lastTakeAgo: (s) => `${s} s ago`,
      lastTakeFreed: (ms) => `mic freed, waited ${ms} ms`,
      lastTakeHeld: 'mic held (call mode)',
      lastTakeNoMic: 'no mic open',
      lastTakeSafari: (mode) => `Safari mode ${mode}`,
      lastTakeEngine: (state) => `audio engine ${state}`,
      lastTakeVia: (via) => `via ${via}`,
    },
    /** How to set the microphone to Allow, step by step. */
    steps: {
      appOpenSettings: 'Open the **Settings** app, then **Apps → Safari → Microphone**.',
      appChooseAllow: 'Choose **Allow**.',
      comeBackReload: 'Come back and tap **Reload**.',
      safariPageMenu: 'Tap the button at the left end of Safari\'s address bar (**aA** or a page icon).',
      safariWebsiteSettings: 'Tap **Website Settings** (tap **More** first if you don\'t see it).',
      setMicAllow: 'Set **Microphone** to **Allow**.',
      everySite: 'Or, for every site: **Settings** app → **Apps → Safari → Microphone** → **Allow**.',
      otherSiteInfo: 'Tap the icon at the left of the address bar (site information).',
      otherSetMicAllow: 'Set **Microphone** to **Allow** (always, not just this time).',
      otherReload: 'Tap **Reload**.',
    },
    /** The words drawn in the pictures of Safari (they copy what iPhone shows). */
    pictures: {
      tapHere: 'Tap here',
      addressBar: 'The address bar may be at the top or bottom of the screen.',
      more: 'More',
      websiteSettings: 'Website Settings',
      microphoneTitle: 'Microphone',
      camera: 'Camera',
      microphone: 'Microphone',
      location: 'Location',
      ask: 'Ask',
      deny: 'Deny',
      allow: 'Allow',
      thisSite: 'this site',
    },
    /** The card on iPhone when the microphone isn't set to Allow. */
    micTip: {
      title: 'Allow the microphone for Bluetooth playback',
      body: 'The microphone isn\'t set to Allow for this site yet, so Bluetooth playback won\'t work. To fix it:',
    },
  },

  /** Music Practice Pro, in the apps. */
  paywall: {
    title: 'Music Practice Pro',
    headlines: {
      drone: 'The Drone is part of Pro',
      takes: 'Renaming and saving takes are part of Pro',
      older: 'Keep every take with Pro',
      themes: 'Themes are part of Pro',
    },
    features: {
      drone: '**Drone** cello and organ drones on any note, with a fifth, timed drones and sequences',
      takes: '**Every take** kept, renamed and saved as an MP3 (free shows the newest 3)',
      themes: '**All eight themes** from Art Deco to Steampunk',
      free: 'The metronome, the tuner and the recorder stay free',
    },
    support: 'Pro also supports an independent app developer, so Music Practice can keep growing with no ads and no tracking. Thank you!',
    yearly: 'Yearly',
    lifetime: 'Lifetime',
    tryFree: (trial) => `Try ${trial} free`,
    perYear: (price) => `${price} a year`,
    once: (price) => `${price} once`,
    thenPerYear: (price) => `Then ${price} a year. Cancel anytime.`,
    renews: 'Renews each year. Cancel anytime.',
    payOnce: 'Pay once, Pro for good.',
    /** A free trial's length, from the store: "7 days", "1 week". */
    period: {
      day: (n) => plural(n, 'day', 'days'),
      week: (n) => plural(n, 'week', 'weeks'),
      month: (n) => plural(n, 'month', 'months'),
      year: (n) => plural(n, 'year', 'years'),
    },
    haveForGood: 'You have Pro for good. Thank you!',
    haveUntil: (date) => `You have Pro until ${date}.`,
    have: 'You have Pro. Thank you!',
    manage: 'Manage your subscription',
    loading: 'Loading…',
    notSetUp: 'Purchases aren\'t set up in this build yet.',
    unavailable: 'Pro isn\'t available right now. Try again later.',
    unreachable: (store) => `Couldn't reach ${store}. Check the connection and try again.`,
    appStore: 'the App Store',
    googlePlay: 'Google Play',
    thanks: 'Thank you! Pro is on.',
    purchaseFailed: (why) => `The purchase didn't go through: ${why}.`,
    purchaseFailedWhy: 'try again',
    restore: 'Restore purchases',
    restoring: 'Looking for your purchases…',
    restored: 'Pro is on again.',
    notFound: (account) => `No Pro purchase found for this ${account}.`,
    appleAccount: 'Apple Account',
    googleAccount: 'Google account',
    restoreFailed: (why) => `Couldn't restore: ${why}.`,
    redeem: 'Redeem a code',
    redeemIos: 'Once the code is redeemed, Pro turns on by itself.',
    redeemIosFallback: 'Redeem the code in the App Store app (your account picture › Redeem Gift Card or Code), then tap Restore purchases.',
    redeemAndroid: 'Redeem the code in Google Play, then come back and tap Restore purchases.',
    fineIos: 'Payment is charged to your Apple Account. Yearly renews automatically each year, and the free trial turns into it, unless you cancel at least 24 hours before the trial or year ends. Manage or cancel any time in Settings › your name › Subscriptions.',
    fineAndroid: 'Payment is charged to your Google Play account. Yearly renews automatically each year, and the free trial turns into it, unless you cancel before the trial or year ends. Manage or cancel any time in Google Play › Payments & subscriptions.',
    terms: 'Terms of Use',
    privacy: 'Privacy Policy',
  },

  feedback: {
    title: 'Send feedback',
    intro: 'A problem, an idea, anything at all. It goes straight to the developer.',
    topicLabel: 'What it\'s about',
    topics: {
      Problem: 'Problem',
      Idea: 'Idea',
      Other: 'Other',
    },
    email: 'Your email, for a reply',
    message: 'Message',
    honeypot: 'Leave this empty',
    includeDetails: 'Include device details',
    whatsIncluded: 'What\'s included',
    send: 'Send',
    sending: 'Sending…',
    sent: 'Sent. Thank you!',
    failed: 'It didn\'t send. Check the connection and try again.',
    privacyNote: 'Your email is used only to reply.',
    privacyLink: 'Privacy',
  },
};

/** The table the app reads. For another language, choose its table here. */
export const TEXT = EN;
