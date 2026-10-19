/*
 * Reusable canvas-game menu controller.
 *
 * What this file provides:
 * - Panel switching for menu, lobby, host/join forms, settings, pause, and game-over screens.
 * - Keyboard/gamepad navigation for elements marked with `.nav-item`.
 * - Basic settings controls: sliders, toggles, cycle buttons, and settings-page arrows.
 * - Optional hooks into a game engine for start, join, pause, reset-round, networking, and cleanup.
 *
 * Minimal HTML contract:
 *
 * <div id="menu" class="ui-panel">
 *   <button class="nav-item" onclick="startGame()">PLAY LOCAL</button>
 *   <button class="nav-item" onclick="showOptions()">SETTINGS</button>
 * </div>
 *
 * <div id="options" class="ui-panel hidden">
 *   <div id="settings-pagination" class="nav-item">
 *     <span class="page-arrow">&lt;</span>
 *     <span id="settings-page-title">GAMEPLAY</span>
 *     <span class="page-arrow">&gt;</span>
 *   </div>
 *   <div id="settings-p1" class="settings-page active">
 *     <div class="opt-group nav-item">
 *       <span>Player Health</span>
 *       <input type="range" id="hpR" min="10" max="500" value="100" oninput="syncSlider('hp', this.value)">
 *       <input type="number" id="hpI" value="100" onchange="syncInput('hp', this.value)">
 *     </div>
 *   </div>
 *   <div id="settings-p2" class="settings-page"></div>
 *   <button class="nav-item" onclick="hideOptions()">BACK</button>
 * </div>
 *
 * <div id="pause-menu" class="ui-panel hidden">
 *   <h1 id="pause-title">PAUSED</h1>
 *   <button id="resumeBtn" class="nav-item" onclick="togglePause()">RESUME</button>
 *   <button id="quitMenuBtn" class="nav-item" onclick="backToMenu()">EXIT</button>
 * </div>
 *
 * Optional game integration:
 *
 * <script src="menu.js"></script>
 * <script>
 *   window.TankWarsMenu.configure({
 *     getState: () => game.state,
 *     setState: value => { game.state = value; },
 *     getConfig: () => game.config,
 *     startGame: () => game.start(),
 *     joinGame: roomId => game.join(roomId),
 *     resetRound: () => game.resetRound(),
 *     cleanupToMenu: async ({ goToLobby }) => game.cleanup({ goToLobby }),
 *     onPauseChange: paused => game.setPaused(paused),
 *     getRooms: callback => net.watchRooms(callback),   // returns an unsubscribe function
 *     hostGame: async ({ roomId, name }) => { ... }
 *   });
 *
 *   // In your animation frame:
 *   function loop() {
 *     TankWarsMenu.processMenuNavigation();
 *     requestAnimationFrame(loop);
 *   }
 * </script>
 *
 * Backward compatibility:
 * This file still exports the old global functions used by this game's inline HTML:
 * showOptions(), hideOptions(), backToMenu(), togglePause(), syncSlider(), etc.
 */
(function () {
    const DEFAULT_CONFIG = {
        hp: 100,
        aiHp: 100,
        aiIntensity: 0.25,
        aiPrecision: 0.75,
        aiPrec: 0.75,
        speed: 3.5,
        range: 300,
        puFreq: 12,
        respawnCooldown: 1.5,
        density: 15,
        godMode: false,
        cooperativeMode: false,
        defaultPowerUp: null,
        puDuration: 'LIFESPAN',
        aiPowerUps: false,
        fullscreen: false,
        aiPersonality: 'NORMAL',
        boardSize: 'NORMAL',
        rows: 15,
        cols: 20
    };

    const DEFAULT_POWER_UPS = [
        { id: 1, name: "SPEED", icon: "S" },
        { id: 2, name: "SHIELD", icon: "O" },
        { id: 3, name: "DISTANCE", icon: "D" }
    ];
    const DEFAULT_AI_PERSONALITIES = ['NORMAL', 'CLUELESS', 'AGGRESSIVE', 'DEFENSIVE', 'MIXED'];
    const DEFAULT_BOARD_SIZES = ['NORMAL', 'LARGE', 'MASSIVE'];
    const HIDDEN_CLASS = 'hidden';

    const menuState = {
        hooks: {},
        fallbackConfig: { ...DEFAULT_CONFIG },
        pendingJoinRoomId: null,
        roomSubscription: null,
        fallbackKeysDown: {},
        settingsPage: 1,
        menuIndex: -1,
        lastSettingsIndex: -1,
        lastInputMethod: 'KEYS',
        controllerActive: false,
        lastStartButtonState: false,
        lastAButtonState: false,
        lastBButtonState: false,
        lastEscPressedState: false,
        lastNavInputState: false,
        lastNavActionTime: 0,
        sliderHoldStartTime: 0,
        cachedConfigSnapshot: ''
    };
    const rememberedNavigationSelection = new Map();
    const REMEMBER_SELECTION_PANEL_IDS = new Set(['menu', 'lobby']);

    function configure(hooks = {}) {
        menuState.hooks = { ...menuState.hooks, ...hooks };
    }

    function globalValue(name, fallback) {
        try {
            const value = eval(name);
            return value === undefined ? fallback : value;
        } catch (e) {
            return fallback;
        }
    }

    function setGlobalValue(name, value) {
        try {
            eval(`${name} = value`);
        } catch (e) {
            try { window[name] = value; } catch (err) {}
        }
    }

    function setStartedByMouse(value) {
        if (menuState.hooks.setStartedByMouse) menuState.hooks.setStartedByMouse(value);
        else setGlobalValue('didStartByMouseClick', value);
    }

    function panel(id) {
        return document.getElementById(id);
    }

    function panels() {
        return {
            menu: globalValue('menu', panel('menu')),
            options: globalValue('options', panel('options')),
            lobby: globalValue('lobby', panel('lobby')),
            pauseMenu: globalValue('pauseMenu', panel('pause-menu')),
            gameOver: globalValue('gameOver', panel('game-over')),
            localGame: panel('local-game'),
            hostSetup: panel('host-setup'),
            joinSetup: panel('join-setup')
        };
    }

    function allPanels() {
        const p = panels();
        return [p.menu, p.options, p.lobby, p.pauseMenu, p.gameOver, p.localGame, p.hostSetup, p.joinSetup].filter(Boolean);
    }

    function visiblePanel() {
        return allPanels().find(p => !p.classList.contains(HIDDEN_CLASS));
    }

    // The Settings, Sound and Fullscreen buttons in the bottom right corner (index.html).
    function cornerItems() {
        const corner = panel('corner-controls');
        return corner ? Array.from(corner.querySelectorAll('.nav-item')) : [];
    }

    function isCornerItem(item) {
        return !!item?.closest?.('#corner-controls');
    }

    // A panel's items, followed by the corner buttons, which sit below every menu: moving down
    // past a menu's last item reaches them. They come last so a panel's own indices are unchanged.
    function navItems(container) {
        if (!container) return [];
        const own = Array.from(container.querySelectorAll('.nav-item'));
        const all = container.classList.contains('ui-panel') ? own.concat(cornerItems()) : own;
        return all.filter(item => {
            if (item.classList.contains(HIDDEN_CLASS)) return false;
            const style = window.getComputedStyle(item);
            return style.display !== 'none' && style.visibility !== 'hidden' && item.offsetWidth > 0;
        });
    }

    function cfg() {
        return menuState.hooks.getConfig?.() || globalValue('cfg', menuState.fallbackConfig);
    }

    function currentState() {
        return menuState.hooks.getState?.() || globalValue('state', 'MENU');
    }

    function setState(value) {
        if (menuState.hooks.setState) menuState.hooks.setState(value);
        else setGlobalValue('state', value);
    }

    function keysDown() {
        return menuState.hooks.getKeysDown?.() || globalValue('keysDown', menuState.fallbackKeysDown);
    }

    function isMobileDevice() {
        return menuState.hooks.isMobile?.() ?? globalValue('isMobile', ('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    }

    function getOnlineRoom() {
        return menuState.hooks.getCurrentOnlineRoom?.() ?? globalValue('currentOnlineRoom', null);
    }

    function setMenuIndex(value) {
        menuState.menuIndex = value;
        setGlobalValue('menuIndex', value);
    }

    function getMenuIndex() {
        return globalValue('menuIndex', menuState.menuIndex);
    }

    function setControllerActive(value) {
        menuState.controllerActive = value;
        setGlobalValue('controllerActive', value);
    }

    function getControllerActive() {
        return globalValue('controllerActive', menuState.controllerActive);
    }

    function setFlag(name, value) {
        menuState[name] = value;
        setGlobalValue(name, value);
    }

    function safeNotification(message, color) {
        const notify = menuState.hooks.showNotification || globalValue('showNotification', null);
        if (typeof notify === 'function') notify(message, color);
    }

    function sfx(name) {
        window.TankWarsSfx?.play(name);
    }

    function getPowerUps() {
        return menuState.hooks.getPowerUps?.() || globalValue('PU_TYPES', DEFAULT_POWER_UPS);
    }

    function getAiPersonalities() {
        return menuState.hooks.getAiPersonalities?.() || globalValue('AI_PERSONALITIES', DEFAULT_AI_PERSONALITIES);
    }

    function getBoardSizes() {
        return menuState.hooks.getBoardSizes?.() || globalValue('BOARD_SIZES', DEFAULT_BOARD_SIZES);
    }

    function getRandomName() {
        const fn = menuState.hooks.getRandomName || globalValue('getRandomName', null);
        return typeof fn === 'function' ? fn() : `Player ${Math.floor(Math.random() * 99)}`;
    }

    function generateUUID() {
        // Not globalValue('generateUUID'): inside this file that name resolves to
        // this very function and recursed until the stack overflowed.
        if (menuState.hooks.generateUUID) return menuState.hooks.generateUUID();
        if (window.crypto?.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function syncSlider(key, val) {
        const input = panel(key + 'I');
        if (input) input.value = val;
    }

    function syncInput(key, val) {
        const slider = panel(key + 'R');
        const input = panel(key + 'I');
        if (!slider || !input) return;
        const clamped = Math.max(parseFloat(slider.min), Math.min(parseFloat(slider.max), parseFloat(val)));
        slider.value = clamped;
        input.value = clamped;
    }

    function autoSelectPrimaryAction(targetPanel) {
        const items = navItems(targetPanel);
        const actions = items.filter(i => !isCornerItem(i) && !["BACK", "CANCEL", "EXIT", "STOP HOSTING"].includes(i.innerText.trim().toUpperCase()));
        setMenuIndex(actions.length === 1 ? items.indexOf(actions[0]) : -1);
        menuState.lastInputMethod = 'KEYS';
        updateMenuVisuals();
    }

    function restoreRememberedNavigationSelection(targetPanel) {
        const items = navItems(targetPanel);
        const remembered = REMEMBER_SELECTION_PANEL_IDS.has(targetPanel?.id) ? rememberedNavigationSelection.get(targetPanel.id) : undefined;
        if (remembered !== undefined && items[remembered]) {
            setMenuIndex(remembered);
            menuState.lastInputMethod = 'KEYS';
            updateMenuVisuals();
        } else {
            autoSelectPrimaryAction(targetPanel);
        }
    }

    function rememberNavigationSelection(targetPanel) {
        if (!targetPanel || !REMEMBER_SELECTION_PANEL_IDS.has(targetPanel.id)) return;
        const index = getMenuIndex();
        if (index >= 0) rememberedNavigationSelection.set(targetPanel.id, index);
    }

    function cycleSettingsPage(dir) {
        menuState.settingsPage += dir;
        if (menuState.settingsPage > 2) menuState.settingsPage = 1;
        if (menuState.settingsPage < 1) menuState.settingsPage = 2;
        const title = panel('settings-page-title');
        const page1 = panel('settings-p1');
        const page2 = panel('settings-p2');
        if (title) title.innerText = menuState.settingsPage === 1 ? "GAMEPLAY" : "AI & SPECIAL";
        page1?.classList.toggle('active', menuState.settingsPage === 1);
        page2?.classList.toggle('active', menuState.settingsPage === 2);
        updateMenuVisuals();
    }

    function showLobby() {
        const p = panels();
        [p.menu, p.hostSetup, p.joinSetup].filter(Boolean).forEach(item => item.classList.add(HIDDEN_CLASS));
        p.lobby?.classList.remove(HIDDEN_CLASS);
        restoreRememberedNavigationSelection(p.lobby);
        refreshRoomList();
    }

    function showHostSetup() {
        const p = panels();
        p.lobby?.classList.add(HIDDEN_CLASS);
        p.hostSetup?.classList.remove(HIDDEN_CLASS);
        setTimeout(() => panel('hostNameInput')?.focus(), 10);
        autoSelectPrimaryAction(p.hostSetup);
    }

    function showJoinSetup(id) {
        menuState.pendingJoinRoomId = id;
        setGlobalValue('pendingJoinRoomId', id);
        const p = panels();
        p.lobby?.classList.add(HIDDEN_CLASS);
        p.joinSetup?.classList.remove(HIDDEN_CLASS);
        setTimeout(() => panel('joinNameInput')?.focus(), 10);
        autoSelectPrimaryAction(p.joinSetup);
    }

    function confirmJoin() {
        const input = panel('joinNameInput');
        if (input && !input.value.trim()) input.value = getRandomName();
        const roomId = menuState.pendingJoinRoomId || globalValue('pendingJoinRoomId', null);
        const join = menuState.hooks.joinGame || globalValue('joinGame', null);
        if (roomId && typeof join === 'function') join(roomId);
    }

    function refreshRoomList() {
        const list = panel('roomList');
        if (!list) return;
        const subscribe = menuState.hooks.getRooms;
        const db = menuState.hooks.getDb?.() || globalValue('db', null);
        if (!subscribe && !db?.subscribeQuery) {
            list.innerHTML = '<div class="room-item stats">No active games...</div>';
            return;
        }

        try {
            if (menuState.roomSubscription) {
                if (typeof menuState.roomSubscription === 'function') menuState.roomSubscription();
                else if (typeof menuState.roomSubscription.close === 'function') menuState.roomSubscription.close();
            }
            const handler = result => renderRoomList(result);
            menuState.roomSubscription = subscribe ? subscribe(handler) : db.subscribeQuery({ tank_rooms: {} }, handler);
        } catch (e) {
            list.innerHTML = '<div class="room-item stats">Searching...</div>';
        }
    }

    function renderRoomList(result) {
        const list = panel('roomList');
        if (!list) return;
        if (result?.error) {
            list.innerHTML = '<div class="room-item stats">Error syncing games</div>';
            return;
        }

        const activePanel = visiblePanel();
        let selectedRoomId = null;
        if (activePanel?.id === 'lobby' && getMenuIndex() !== -1) {
            const selected = navItems(activePanel)[getMenuIndex()];
            if (selected?.classList.contains('room-item')) selectedRoomId = selected.getAttribute('data-room-id');
        }

        const rooms = result?.rooms || result?.data?.tank_rooms || [];
        const activeRooms = rooms.filter(room => (Date.now() - (room.updated ?? room.updatedAt ?? 0)) < 90000);
        const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const maxCapacity = menuState.hooks.maxRoomCapacity || globalValue('MAX_ROOM_CAPACITY', 8);

        if (activeRooms.length === 0) {
            list.innerHTML = '<div class="room-item stats">No active games...</div>';
            if (activePanel?.id === 'lobby') {
                setMenuIndex(0);
                updateMenuVisuals();
            }
            return;
        }

        list.innerHTML = activeRooms.map(room => {
            const capacity = room.capacity || maxCapacity;
            const currentTanks = room.count ?? room.tankCount ?? 1;
            const available = Math.max(0, capacity - currentTanks);
            const isFull = available <= 0;
            const id = escape(room.id);
            return `<div class="room-item nav-item" data-room-id="${id}" style="${isFull ? 'opacity: 0.4; pointer-events: none;' : ''}" onclick="${isFull ? '' : `showJoinSetup(this.dataset.roomId)`}">
                    <div class="room-info"><span>${escape(room.title || room.name || 'Untitled Game')}</span><span class="room-capacity">(${available}/${capacity} Available)</span></div>
                    ${!isFull ? `<span style="font-size: 0.7rem; color: #00ff00;">JOIN</span>` : ''}</div>`;
        }).join('');

        if (activePanel?.id === 'lobby') {
            const items = navItems(activePanel);
            const match = selectedRoomId ? items.findIndex(i => i.getAttribute('data-room-id') === selectedRoomId) : -1;
            setMenuIndex(match !== -1 ? match : Math.min(getMenuIndex(), items.length - 1));
            updateMenuVisuals();
        }
    }

    function startGame(isOnline = false) {
        if (menuState.hooks.startGame) {
            menuState.hooks.startGame(isOnline);
            return;
        }
        allPanels().forEach(item => item.classList.add(HIDDEN_CLASS));
        const localGame = panels().localGame;
        if (localGame) {
            localGame.classList.remove(HIDDEN_CLASS);
            setState('PLAYING');
            autoSelectPrimaryAction(localGame);
        } else {
            safeNotification("Local game placeholder", "#00ff00");
        }
    }

    async function hostGame() {
        const db = menuState.hooks.getDb?.() || globalValue('db', null);
        const input = panel('hostNameInput');
        if (input && !input.value.trim()) input.value = getRandomName();
        const roomId = generateUUID();
        const name = input?.value || getRandomName();
        setGlobalValue('isHostingAction', true);
        try {
            if (menuState.hooks.hostGame) {
                await menuState.hooks.hostGame({ roomId, name });
            } else if (db && window.instant?.tx?.tank_rooms) {
                await db.transact([window.instant.tx.tank_rooms[roomId].update({ name: `${name}'s Game`, createdAt: Date.now(), updatedAt: Date.now(), tankCount: 1 })]);
            } else {
                showLobby();
                renderRoomList({ rooms: [{ id: roomId, name: `${name}'s Demo Lobby`, updatedAt: Date.now(), tankCount: 1 }] });
                return;
            }
            setGlobalValue('isOnlineHost', true);
            const join = menuState.hooks.joinGame || globalValue('joinGame', null);
            if (typeof join === 'function') join(roomId);
        } catch (err) {
            console.error("Hosting Error:", err);
        }
        setTimeout(() => setGlobalValue('isHostingAction', false), 500);
    }

    function toggleFullscreen() {
        try {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.().catch(() => safeNotification("Fullscreen rejected by environment", "#ff3300"));
            } else {
                document.exitFullscreen?.();
            }
        } catch (err) {
            safeNotification("Fullscreen API blocked on this device", "#ff3300");
        }
    }

    /*
     * Sound. This is the master switch all audio (sound.js) goes through:
     * TankWarsSound.audible() is false while muted, while the tab is hidden
     * and while the window has lost focus.
     */
    const SOUND_KEY = 'tankwars.muted';
    const SOUND_ICONS = {
        on: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></g>',
        off: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></g>'
    };
    const soundState = { muted: false };
    try { soundState.muted = localStorage.getItem(SOUND_KEY) === '1'; } catch (err) { /* storage unavailable */ }

    function applySoundButton() {
        const btn = document.getElementById('sound-btn');
        if (!btn) return;
        const label = soundState.muted ? 'Sound off' : 'Sound on';
        btn.setAttribute('aria-pressed', String(!soundState.muted));
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
        btn.classList.toggle('is-off', soundState.muted);
        btn.querySelector('.btn-label').textContent = label;
        btn.querySelector('svg').innerHTML = soundState.muted ? SOUND_ICONS.off : SOUND_ICONS.on;
    }

    function toggleSound() {
        soundState.muted = !soundState.muted;
        try { localStorage.setItem(SOUND_KEY, soundState.muted ? '1' : '0'); } catch (err) { /* storage unavailable */ }
        applySoundButton();
        window.TankWarsSfx?.refresh();
    }

    window.TankWarsSound = {
        isMuted: () => soundState.muted,
        audible: () => !soundState.muted && !document.hidden && document.hasFocus()
    };
    applySoundButton();

    function toggleGodMode() {
        const c = cfg();
        c.godMode = !c.godMode;
        const btn = panel('godModeBtn');
        if (btn) {
            btn.innerText = c.godMode ? "ON" : "OFF";
            btn.classList.toggle('active', c.godMode);
        }
        const apply = menuState.hooks.applyGodModePowerUps || globalValue('applyGodModePowerUps', null);
        if (c.godMode && currentState() === 'PLAYING' && typeof apply === 'function') apply();
    }

    function toggleCoop() {
        const c = cfg();
        c.cooperativeMode = !c.cooperativeMode;
        const btn = panel('coopModeBtn');
        if (btn) {
            btn.innerText = c.cooperativeMode ? "ON" : "OFF";
            btn.classList.toggle('active', c.cooperativeMode);
        }
    }

    function toggleAiPU() {
        const c = cfg();
        c.aiPowerUps = !c.aiPowerUps;
        const btn = panel('aiPUBtn');
        if (btn) {
            btn.innerText = c.aiPowerUps ? "ON" : "OFF";
            btn.classList.toggle('active', c.aiPowerUps);
        }
    }

    function cycleDefaultPU(isManualInput = false, dir = 1) {
        const c = cfg();
        const powerUps = getPowerUps();
        const btn = panel('defaultPUBtn');
        if (!powerUps.length) return;
        if (c.defaultPowerUp === null) {
            c.defaultPowerUp = dir === 1 ? powerUps[0] : powerUps[powerUps.length - 1];
        } else {
            const idx = powerUps.findIndex(p => p.id === c.defaultPowerUp.id);
            let nextIdx = idx + dir;
            if (nextIdx >= powerUps.length) nextIdx = -1;
            else if (nextIdx < -1) nextIdx = powerUps.length - 1;
            c.defaultPowerUp = nextIdx === -1 ? null : powerUps[nextIdx];
        }
        if (btn) btn.innerHTML = c.defaultPowerUp ? `${c.defaultPowerUp.icon} ${c.defaultPowerUp.name}` : "NONE";
    }

    function cyclePUDuration(dir = 1) {
        const c = cfg();
        const durs = ['LIFESPAN', 'ROUND', 'PERMANENT'];
        const idx = durs.indexOf(c.puDuration);
        let next = (idx + dir) % durs.length;
        if (next < 0) next = durs.length - 1;
        c.puDuration = durs[next];
        const btn = panel('puDurationBtn');
        if (btn) btn.innerText = c.puDuration;
    }

    function cycleAiPers(dir = 1) {
        const c = cfg();
        const personalities = getAiPersonalities();
        const idx = personalities.indexOf(c.aiPersonality);
        let next = (idx + dir) % personalities.length;
        if (next < 0) next = personalities.length - 1;
        c.aiPersonality = personalities[next];
        const btn = panel('aiPersBtn');
        if (btn) btn.innerText = c.aiPersonality;
    }

    function cycleBoardSize(dir = 1) {
        const c = cfg();
        const sizes = getBoardSizes();
        const idx = sizes.indexOf(c.boardSize);
        let next = (idx + dir) % sizes.length;
        if (next < 0) next = sizes.length - 1;
        c.boardSize = sizes[next];
        const btn = panel('boardSizeBtn');
        if (btn) btn.innerText = c.boardSize;
        if (c.boardSize === 'NORMAL') { c.rows = 15; c.cols = 20; }
        else if (c.boardSize === 'LARGE') { c.rows = 22; c.cols = 30; }
        else if (c.boardSize === 'MASSIVE') { c.rows = 30; c.cols = 40; }
    }

    function updateMenuVisuals() {
        const activePanel = visiblePanel();
        if (!activePanel) {
            cornerItems().forEach(item => item.classList.remove('selected'));
            return;
        }
        const items = navItems(activePanel);
        const shouldHighlight = !isMobileDevice() || getControllerActive();
        items.forEach((item, idx) => item.classList.toggle('selected', shouldHighlight && idx === getMenuIndex()));

        const p = panels();
        if (activePanel === p.pauseMenu) {
            const title = panel('pause-title');
            const quit = panel('quitMenuBtn');
            const resume = panel('resumeBtn');
            const onlineRoom = getOnlineRoom();
            const isHost = globalValue('isOnlineHost', false);
            const hostPaused = globalValue('isHostPaused', false);
            if (onlineRoom) {
                if (isHost) {
                    if (title) title.innerText = "PAUSED";
                    if (quit) quit.innerText = "STOP HOSTING";
                    resume?.classList.remove(HIDDEN_CLASS);
                } else {
                    if (title) title.innerText = hostPaused ? "GAME PAUSED" : "ONLINE GAME";
                    if (quit) quit.innerText = "EXIT";
                    resume?.classList.toggle(HIDDEN_CLASS, hostPaused);
                }
            } else {
                if (title) title.innerText = "PAUSED";
                if (quit) quit.innerText = "EXIT";
                resume?.classList.remove(HIDDEN_CLASS);
            }
        }
    }

    function activateController() {
        if (!getControllerActive()) {
            setControllerActive(true);
            document.body.classList.add('controller-active');
            updateMenuVisuals();
        }
    }

    function showOptions() {
        const c = cfg();
        if (currentState() === 'PAUSED') menuState.cachedConfigSnapshot = JSON.stringify(c);
        syncInput('hp', c.hp);
        syncInput('aiHp', c.aiHp);
        syncInput('aiIntens', c.aiIntensity);
        syncInput('aiPrec', c.aiPrecision ?? c.aiPrec);
        syncInput('speed', c.speed);
        syncInput('range', c.range);
        syncInput('puFreq', c.puFreq);
        syncInput('cooldown', c.respawnCooldown);
        syncInput('density', c.density);

        const defaultPuBtn = panel('defaultPUBtn');
        if (defaultPuBtn) defaultPuBtn.innerHTML = c.defaultPowerUp ? `${c.defaultPowerUp.icon} ${c.defaultPowerUp.name}` : "NONE";
        const puBtn = panel('puDurationBtn');
        if (puBtn) puBtn.innerText = c.puDuration;
        const aiBtn = panel('aiPersBtn');
        if (aiBtn) aiBtn.innerText = c.aiPersonality;
        const boardBtn = panel('boardSizeBtn');
        if (boardBtn) boardBtn.innerText = c.boardSize;
        const fsBtn = panel('fullscreenBtn');
        if (fsBtn) { fsBtn.innerText = c.fullscreen ? "ON" : "OFF"; fsBtn.classList.toggle('active', c.fullscreen); }
        const gmBtn = panel('godModeBtn');
        if (gmBtn) { gmBtn.innerText = c.godMode ? "ON" : "OFF"; gmBtn.classList.toggle('active', c.godMode); }
        const apBtn = panel('aiPUBtn');
        if (apBtn) { apBtn.innerText = c.aiPowerUps ? "ON" : "OFF"; apBtn.classList.toggle('active', c.aiPowerUps); }

        menuState.settingsPage = 1;
        panel('settings-p1')?.classList.add('active');
        panel('settings-p2')?.classList.remove('active');
        if (panel('settings-page-title')) panel('settings-page-title').innerText = "GAMEPLAY";
        const p = panels();
        const from = visiblePanel();
        if (from && from !== p.options) menuState.optionsReturnPanel = from;
        allPanels().forEach(item => item.classList.add(HIDDEN_CLASS));
        p.options?.classList.remove(HIDDEN_CLASS);
        menuState.lastSettingsIndex = -1;
        setMenuIndex(0);
        menuState.lastInputMethod = 'KEYS';
        updateMenuVisuals();
    }

    function resetOptions() {
        const c = cfg();
        syncInput('hp', 100);
        syncInput('aiHp', 100);
        syncInput('aiIntens', 0.25);
        syncInput('aiPrec', 0.75);
        syncInput('speed', 3.5);
        syncInput('range', 300);
        syncInput('puFreq', 12);
        syncInput('cooldown', 1.5);
        syncInput('density', 15);
        Object.assign(c, {
            defaultPowerUp: null,
            puDuration: 'LIFESPAN',
            aiPersonality: 'NORMAL',
            boardSize: 'NORMAL',
            rows: 15,
            cols: 20,
            aiPowerUps: false,
            cooperativeMode: false,
            godMode: false
        });
        if (panel('defaultPUBtn')) panel('defaultPUBtn').innerHTML = "NONE";
        if (panel('puDurationBtn')) panel('puDurationBtn').innerText = 'LIFESPAN';
        if (panel('aiPersBtn')) panel('aiPersBtn').innerText = 'NORMAL';
        if (panel('boardSizeBtn')) panel('boardSizeBtn').innerText = 'NORMAL';
        panel('aiPUBtn')?.classList.remove('active');
        if (panel('aiPUBtn')) panel('aiPUBtn').innerText = 'OFF';
        if (document.fullscreenElement) document.exitFullscreen?.();
    }

    function hideOptions() {
        const c = cfg();
        const readNum = (id, fallback, parser = parseFloat) => {
            const el = panel(id);
            return el ? parser(el.value) : fallback;
        };
        c.hp = readNum('hpI', c.hp, parseInt);
        c.aiHp = readNum('aiHpI', c.aiHp, parseInt);
        c.aiIntensity = readNum('aiIntensI', c.aiIntensity);
        c.aiPrecision = readNum('aiPrecI', c.aiPrecision ?? c.aiPrec);
        c.aiPrec = c.aiPrecision;
        c.speed = readNum('speedI', c.speed);
        c.range = readNum('rangeI', c.range, parseInt);
        c.puFreq = readNum('puFreqI', c.puFreq, parseInt);
        c.respawnCooldown = readNum('cooldownI', c.respawnCooldown);
        c.density = readNum('densityI', c.density, parseInt);

        const p = panels();
        p.options?.classList.add(HIDDEN_CLASS);
        if (currentState() === 'PAUSED') {
            const changed = menuState.cachedConfigSnapshot !== JSON.stringify(c);
            if (!getOnlineRoom() && changed) {
                const resetRound = menuState.hooks.resetRound || globalValue('setupRound', null);
                if (typeof resetRound === 'function') resetRound(false, false, true);
                setState('PLAYING');
                p.pauseMenu?.classList.add(HIDDEN_CLASS);
                panel('mobile-controls')?.classList.add('active');
            } else {
                p.pauseMenu?.classList.remove(HIDDEN_CLASS);
                autoSelectPrimaryAction(p.pauseMenu);
            }
        } else {
            const back = menuState.optionsReturnPanel && menuState.optionsReturnPanel !== p.pauseMenu ? menuState.optionsReturnPanel : p.menu;
            if (back === p.lobby) showLobby();
            else {
                back?.classList.remove(HIDDEN_CLASS);
                autoSelectPrimaryAction(back);
            }
        }
        menuState.optionsReturnPanel = null;
    }

    // The corner Settings button. During a local match it pauses first, so Back returns to the
    // pause menu (or restarts the round if a setting changed). Online, the host's settings apply.
    function openSettings() {
        const p = panels();
        if (p.options && !p.options.classList.contains(HIDDEN_CLASS)) return;
        if (getOnlineRoom()) {
            safeNotification("Online games use the host's settings", "#00ff00");
            return;
        }
        if (currentState() === 'PLAYING') togglePause();
        showOptions();
    }

    async function backToMenu(goToLobby = false) {
        const cleanup = menuState.hooks.cleanupToMenu;
        if (cleanup) await cleanup({ goToLobby });
        else {
            const unlock = globalValue('unlockMobileOrientation', null);
            if (isMobileDevice() && typeof unlock === 'function') unlock();
            const presenceHandle = globalValue('presenceHandle', null);
            if (presenceHandle?.publishPresence && getOnlineRoom() && !globalValue('isOnlineHost', false)) {
                presenceHandle.publishPresence({ tanks: [] });
            }
            if (presenceHandle?.unsubscribe) presenceHandle.unsubscribe();
            const world = globalValue('world', null);
            world?.tanks?.clear?.();
            world?.bullets?.clear?.();
            if (world) {
                world.map = [];
                world.particles = [];
                world.powerUps = [];
                world.empEffects = [];
                world.myTankId = null;
            }
        }

        setGlobalValue('currentOnlineRoom', null);
        setGlobalValue('presenceHandle', null);
        setGlobalValue('onlinePeers', {});
        setGlobalValue('isOnlineHost', false);
        setGlobalValue('isHostPaused', false);
        menuState.pendingJoinRoomId = null;
        setGlobalValue('pendingJoinRoomId', null);
        allPanels().filter(p => p.id !== 'menu').forEach(p => p.classList.add(HIDDEN_CLASS));
        panel('mobile-controls')?.classList.remove('active');

        setState('MENU');
        if (goToLobby) showLobby();
        else {
            panels().menu?.classList.remove(HIDDEN_CLASS);
            restoreRememberedNavigationSelection(panels().menu);
        }
    }

    function togglePause() {
        const p = panels();
        const onlineRoom = getOnlineRoom();
        const isHost = globalValue('isOnlineHost', false);
        const hostPaused = globalValue('isHostPaused', false);
        const isPauseMenuVisible = p.pauseMenu && !p.pauseMenu.classList.contains(HIDDEN_CLASS);
        const presenceHandle = globalValue('presenceHandle', null);

        if (!isPauseMenuVisible) {
            sfx('pause');
            if (!onlineRoom || isHost) setState('PAUSED');
            p.pauseMenu?.classList.remove(HIDDEN_CLASS);
            setMenuIndex(-1);
            if (isHost && presenceHandle?.publishTopic) presenceHandle.publishTopic('remote_pause', { paused: true });
            menuState.hooks.onPauseChange?.(true);
            updateMenuVisuals();
            panel('mobile-controls')?.classList.remove('active');
        } else {
            if (!isHost && hostPaused) return;
            sfx('resume');
            if (onlineRoom && (isHost || hostPaused) && presenceHandle?.publishTopic) presenceHandle.publishTopic('remote_pause', { paused: false });
            setState('PLAYING');
            p.pauseMenu?.classList.add(HIDDEN_CLASS);
            menuState.hooks.onPauseChange?.(false);
            panel('mobile-controls')?.classList.add('active');
        }
    }

    function processMenuNavigation() {
        if (!document.hasFocus()) return;
        const activePanel = visiblePanel();
        const state = currentState();
        if (!activePanel && state !== 'PLAYING' && state !== 'PAUSED') return;

        const isTyping = document.activeElement && document.activeElement.tagName === 'INPUT';
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const gp = Array.from(gamepads).find(g => g !== null && g.connected);
        const items = navItems(activePanel);
        const keys = keysDown();
        const now = Date.now();
        const threshold = 0.5;
        let inputUp = false, inputDown = false, inputLeft = false, inputRight = false, bPressed = false;
        let spacePressed = (!isTyping && keys.Space) || keys.Enter;
        let aPressed = false;

        if (gp) {
            const start = gp.buttons[9]?.pressed;
            if (start && !menuState.lastStartButtonState) {
                if (state === 'PLAYING' || state === 'PAUSED') togglePause();
                else {
                    const startFn = menuState.hooks.startGame || window.startGame;
                    if (typeof startFn === 'function') {
                        setStartedByMouse(false);
                        startFn();
                    }
                }
            }
            menuState.lastStartButtonState = start;
            const bGP = gp.buttons[1]?.pressed;
            aPressed = gp.buttons[0]?.pressed;
            if (!aPressed && menuState.lastAButtonState) {
                menuState.lastAButtonState = false;
            }
            if (aPressed && !menuState.lastAButtonState && items[getMenuIndex()]) {
                rememberNavigationSelection(activePanel);
                if (isTyping && activePanel?.id?.includes('setup')) {
                    activateSelectedItem(items[getMenuIndex()], now);
                    menuState.lastAButtonState = true;
                    return;
                }
            }
            if (isTyping && (start || bGP)) {
                document.activeElement.blur();
                return;
            }
            inputUp = gp.buttons[12]?.pressed || gp.axes[1] < -threshold;
            inputDown = gp.buttons[13]?.pressed || gp.axes[1] > threshold;
            inputLeft = gp.buttons[14]?.pressed || gp.axes[0] < -threshold;
            inputRight = gp.buttons[15]?.pressed || gp.axes[0] > threshold;
            bPressed = gp.buttons[1]?.pressed;
        }

        const esc = keys.Escape;
        if (esc && !menuState.lastEscPressedState && (state === 'PLAYING' || state === 'PAUSED' || (getOnlineRoom() && panels().pauseMenu && !panels().pauseMenu.classList.contains(HIDDEN_CLASS)))) {
            if (!document.fullscreenElement) togglePause();
        }
        menuState.lastEscPressedState = esc;

        if (!isTyping) {
            inputUp = inputUp || keys.ArrowUp;
            inputDown = inputDown || keys.ArrowDown;
            inputLeft = inputLeft || keys.ArrowLeft;
            inputRight = inputRight || keys.ArrowRight;
            bPressed = bPressed || keys.Backspace || keys.KeyB;
        }
        if (inputUp || inputDown || inputLeft || inputRight || spacePressed || bPressed || aPressed) activateController();
        if (!getControllerActive() || (isTyping && !aPressed && !gp?.axes.some(a => Math.abs(a) > threshold) && !gp?.buttons.some(b => b.pressed))) return;

        if (bPressed && !menuState.lastBButtonState) {
            if (activePanel) sfx('menuBack');
            if (getMenuIndex() !== -1) {
                if (activePanel === panels().options) menuState.lastSettingsIndex = getMenuIndex();
                setMenuIndex(-1);
                updateMenuVisuals();
            } else {
                if (activePanel === panels().pauseMenu && !globalValue('isOnlineHost', false) && globalValue('isHostPaused', false)) return;
                if (activePanel === panels().pauseMenu) togglePause();
                else if (activePanel === panels().options) hideOptions();
                else if (activePanel === panels().lobby || activePanel === panels().gameOver) backToMenu();
                else if (activePanel?.id.includes('setup')) showLobby();
            }
        }
        menuState.lastBButtonState = bPressed;
        if (!activePanel) return;

        const isDirectionPressed = inputUp || inputDown || inputLeft || inputRight;
        const dx = (inputRight ? 1 : 0) - (inputLeft ? 1 : 0);
        const dy = (inputDown ? 1 : 0) - (inputUp ? 1 : 0);
        const sampleRects = items.filter(el => !isCornerItem(el)).slice(0, 4).map(el => el.getBoundingClientRect());
        const uniqueXs = [...new Set(sampleRects.map(r => Math.round(r.left / 10) * 10))];
        const isVerticalOnly = uniqueXs.length <= 1 || activePanel === panels().lobby || activePanel === panels().pauseMenu;

        if (getMenuIndex() === -1) {
            if (isDirectionPressed || spacePressed) {
                if (spacePressed) setMenuIndex(0);
                else if (isVerticalOnly) setMenuIndex(activePanel === panels().options && menuState.lastSettingsIndex !== -1 ? menuState.lastSettingsIndex : 0);
                else {
                    let bestIdx = 0, bestScore = -Infinity;
                    const pRect = activePanel.getBoundingClientRect();
                    const cx = pRect.left + pRect.width / 2;
                    const cy = pRect.top + pRect.height / 2;
                    items.forEach((item, idx) => {
                        const r = item.getBoundingClientRect();
                        const score = ((r.left + r.width / 2) - cx) * dx + ((r.top + r.height / 2) - cy) * dy;
                        if (score > bestScore) { bestScore = score; bestIdx = idx; }
                    });
                    setMenuIndex(bestIdx);
                }
                menuState.lastNavActionTime = now;
                menuState.lastNavInputState = true;
                updateMenuVisuals();
            }
            return;
        }

        const isManualPress = !menuState.lastNavInputState;
        const isRepeatReady = now - menuState.lastNavActionTime > 500;
        if (isDirectionPressed && (isManualPress || isRepeatReady)) {
            moveSelection(items, activePanel, dx, dy, isVerticalOnly, inputLeft, inputRight, inputDown, now);
        } else if (!isDirectionPressed) {
            menuState.lastNavInputState = false;
            menuState.sliderHoldStartTime = 0;
        }

        if ((spacePressed || (aPressed && !menuState.lastAButtonState)) && items[getMenuIndex()]) {
            activateSelectedItem(items[getMenuIndex()], now);
        }
        menuState.lastAButtonState = aPressed;
    }

    function moveSelection(items, activePanel, dx, dy, isVerticalOnly, inputLeft, inputRight, inputDown, now) {
        const currentItem = items[getMenuIndex()];
        if (!currentItem) return;
        const rect = currentItem.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (currentItem.id === 'settings-pagination' && (inputLeft || inputRight)) {
            cycleSettingsPage(inputRight ? 1 : -1);
            menuState.lastNavActionTime = now;
            menuState.lastNavInputState = true;
            return;
        }

        const slider = currentItem.querySelector('input[type=range]');
        const cycle = currentItem.querySelector('.cycle-btn');
        const toggle = currentItem.querySelector('.toggle-btn');
        const isSettingRow = currentItem.tagName === 'DIV' && !currentItem.id;

        if (isSettingRow && Math.abs(dx) > Math.abs(dy)) {
            if (slider && (inputLeft || inputRight)) {
                if (menuState.sliderHoldStartTime === 0) menuState.sliderHoldStartTime = now;
                const elapsed = (now - menuState.sliderHoldStartTime) / 1000;
                const maxVal = parseFloat(slider.max);
                let baseStep = parseFloat(slider.step) || 1;
                if (maxVal <= 5) baseStep = 0.1;
                else if (maxVal >= 100) baseStep = 5;
                slider.value = parseFloat(slider.value) + (inputRight ? baseStep : -baseStep) * Math.pow(1.5, elapsed);
                slider.oninput?.();
                menuState.lastNavActionTime = now;
                menuState.lastNavInputState = true;
                return;
            }
            if (cycle && (inputLeft || inputRight)) {
                clickCycle(cycle, inputRight ? 1 : -1);
                menuState.lastNavActionTime = now;
                menuState.lastNavInputState = true;
                return;
            }
            if (toggle && (inputLeft || inputRight)) {
                if (!menuState.lastNavInputState) toggle.click();
                menuState.lastNavInputState = true;
                return;
            }
        }

        let bestIdx = -1, bestScore = Infinity;
        const inCorner = isCornerItem(currentItem);
        items.forEach((item, idx) => {
            if (idx === getMenuIndex()) return;
            if (dx && !dy && isCornerItem(item) !== inCorner) return;
            const r = item.getBoundingClientRect();
            const ix = (r.left + r.width / 2) - cx;
            const iy = (r.top + r.height / 2) - cy;
            const isR = dx > 0.5 && ix > 5, isL = dx < -0.5 && ix < -5, isD = dy > 0.5 && iy > 5, isU = dy < -0.5 && iy < -5;
            if (isR || isL || isD || isU) {
                const distPrimary = Math.abs(dx ? ix : iy);
                const distSecondary = Math.abs(dx ? iy : ix);
                const score = distPrimary + (isVerticalOnly && dy ? 0 : distSecondary * 3);
                if (score < bestScore) { bestScore = score; bestIdx = idx; }
            }
        });

        const before = getMenuIndex();
        if (bestIdx !== -1) {
            setMenuIndex(bestIdx);
        } else if (isVerticalOnly && dy) {
            setMenuIndex(inputDown ? 0 : firstItemInBottomRow(items));
        }
        if (getMenuIndex() !== before) sfx('menuMove');
        menuState.lastInputMethod = 'KEYS';
        updateMenuVisuals();
        menuState.lastNavActionTime = now;
        menuState.lastNavInputState = true;
    }

    function firstItemInBottomRow(items) {
        if (!items.length) return -1;
        const rects = items.map(item => item.getBoundingClientRect());
        const bottomTop = Math.max(...rects.map(r => Math.round(r.top / 5) * 5));
        let bestIdx = items.length - 1;
        let bestLeft = Infinity;
        rects.forEach((rect, idx) => {
            if (Math.abs((Math.round(rect.top / 5) * 5) - bottomTop) < 5 && rect.left < bestLeft) {
                bestLeft = rect.left;
                bestIdx = idx;
            }
        });
        return bestIdx;
    }

    function clickCycle(cycle, dir) {
        if (cycle.id === 'defaultPUBtn') cycleDefaultPU(true, dir);
        else if (cycle.id === 'puDurationBtn') cyclePUDuration(dir);
        else if (cycle.id === 'aiPersBtn') cycleAiPers(dir);
        else if (cycle.id === 'boardSizeBtn') cycleBoardSize(dir);
        else cycle.click();
    }

    function activateSelectedItem(item, now) {
        rememberNavigationSelection(visiblePanel());
        if (item.tagName === 'DIV' && !item.id) {
            const toggle = item.querySelector('.toggle-btn');
            const cycle = item.querySelector('.cycle-btn');
            if (toggle) toggle.click();
            if (cycle) cycle.click();
            menuState.lastNavActionTime = now + 200;
        } else if (item.classList.contains('room-item')) {
            const roomId = item.getAttribute('data-room-id');
            if (roomId) showJoinSetup(roomId);
            menuState.lastNavActionTime = now + 200;
        } else if (item.tagName === 'BUTTON') {
            if (item.getAttribute('onclick')?.startsWith('startGame(')) {
                setStartedByMouse(false);
            }
            item.click();
            menuState.lastNavActionTime = now + 200;
        }
    }

    const api = {
        configure,
        backToMenu,
        confirmJoin,
        cycleAiPers,
        cycleBoardSize,
        cycleDefaultPU,
        cycleSettingsPage,
        cyclePUDuration,
        hideOptions,
        hostGame,
        openSettings,
        processMenuNavigation,
        refreshRoomList,
        resetOptions,
        showHostSetup,
        showJoinSetup,
        showLobby,
        showOptions,
        startGame,
        syncInput,
        syncSlider,
        activateController,
        toggleAiPU,
        toggleCoop,
        toggleFullscreen,
        toggleGodMode,
        toggleSound,
        togglePause,
        updateMenuVisuals
    };

    window.TankWarsMenu = api;
    Object.assign(window, api);

    function installStandaloneInputHandlers() {
        window.addEventListener('keydown', e => {
            const isTyping = document.activeElement && document.activeElement.tagName === 'INPUT';
            if (isTyping && e.code === 'Enter') {
                if (!panel('host-setup')?.classList.contains(HIDDEN_CLASS)) hostGame();
                if (!panel('join-setup')?.classList.contains(HIDDEN_CLASS)) confirmJoin();
                return;
            }
            if (!isTyping || e.code === 'Enter' || e.code === 'Escape') menuState.fallbackKeysDown[e.code] = true;
        });
        window.addEventListener('keyup', e => { menuState.fallbackKeysDown[e.code] = false; });
        window.addEventListener('blur', () => { Object.keys(menuState.fallbackKeysDown).forEach(key => { menuState.fallbackKeysDown[key] = false; }); });

        window.addEventListener('click', e => {
            const arrow = e.target.closest('.page-arrow');
            if (arrow) {
                cycleSettingsPage(arrow.innerText === '<' || arrow.innerText === '◀' ? -1 : 1);
                return;
            }

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('page-arrow')) return;

            const item = e.target.closest('.nav-item');
            if (!item || currentState() === 'PLAYING') return;
            const activePanel = item.closest('.ui-panel:not(.hidden)');
            if (activePanel) {
                setMenuIndex(navItems(activePanel).indexOf(item));
                menuState.lastInputMethod = 'MOUSE';
                updateMenuVisuals();
            }
            const toggle = item.querySelector('.toggle-btn');
            const cycle = item.querySelector('.cycle-btn');
            if (toggle) toggle.click();
            if (cycle) cycle.click();
        });

        window.addEventListener('mouseover', e => {
            const item = e.target.closest('.nav-item');
            if (!item || currentState() === 'PLAYING') return;
            const activePanel = item.closest('.ui-panel:not(.hidden)');
            if (!activePanel) return;
            const index = navItems(activePanel).indexOf(item);
            if (index !== -1) {
                setMenuIndex(index);
                menuState.lastInputMethod = 'MOUSE';
                updateMenuVisuals();
            }
        });

        window.addEventListener('mouseout', e => {
            const item = e.target.closest('.nav-item');
            if (item && menuState.lastInputMethod === 'MOUSE') {
                setMenuIndex(-1);
                updateMenuVisuals();
            }
        });

        const runNavigation = () => {
            processMenuNavigation();
            requestAnimationFrame(runNavigation);
        };
        requestAnimationFrame(runNavigation);
    }

    if (!document.getElementById('gameCanvas')) {
        installStandaloneInputHandlers();
    }
})();
