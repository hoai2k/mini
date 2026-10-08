const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu'), options = document.getElementById('options');
const lobby = document.getElementById('lobby'), pauseMenu = document.getElementById('pause-menu'), gameOver = document.getElementById('game-over');

const getRandomName = () => "Tank " + Math.floor(Math.random()*99);
const defaultName = getRandomName();
document.getElementById('hostNameInput').value = defaultName;
document.getElementById('joinNameInput').value = defaultName;

// Online play runs through the mini-rooms relay (see MULTIPLAYER.md at the repository root).
const net = window.MiniRooms ? window.MiniRooms.connect('tankwars') : null;
let pendingHostTitle = null;
const escapeHTML = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const myPeerId = () => presenceHandle?.peerId || 'me';

let currentOnlineRoom = null, onlinePeers = {}, presenceHandle = null, lastPeerCount = 0, isOnlineHost = false, isHostingAction = false, isHostPaused = false, pendingJoinRoomId = null, lastHeartbeatTime = 0, hasInitialPresence = false;
const prevStats = new Map();

const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const lerp = (start, end, amt) => (1 - amt) * start + amt * end;

let cfg = { hp: 100, aiHp: 100, aiIntensity: 0.25, aiPrecision: 0.75, aiPersonality: 'NORMAL', fireRate: 500, speed: 3.5, turnSpeed: 0.12, density: 15, range: 300, godMode: false, respawnCooldown: 1.5, cooperativeMode: false, defaultPowerUp: null, puFreq: 12, puDuration: 'LIFESPAN', aiPowerUps: false, fullscreen: false, boardSize: 'NORMAL', rows: 15, cols: 20 };
let cachedCfgSnapshot = "";

// Mobile Layout and Environment Checking Vars
let isMobile = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isMobile) document.body.classList.add('mobile-device');
let mobileInput = { ix: 0, iy: 0, rx: 0, ry: 0, fire: false };

// Desktop Mouse Tracking Scope Vars
let mouseX = 0, mouseY = 0, mouseFire = false, didStartByMouseClick = false;

const TILE = 40, MAX_ROOM_CAPACITY = 8;
let world = { map: [], tanks: new Map(), bullets: new Map(), particles: [], powerUps: [], warpX: false, warpY: false, warpXType: 'WIDE', warpYType: 'WIDE', myTankId: null, empEffects: [] };
let state = 'MENU', lastStartButtonState = false, lastAButtonState = false, lastBButtonState = false, lastEscPressedState = false, lastNavTime = 0, lastNavInputState = false, lastNavActionTime = 0, sliderHoldStartTime = 0, gameStartTime = 0, menuIndex = -1, lastSettingsIndex = -1, lastInputMethod = 'KEYS', controllerActive = false, currentRound = 1, powerUpTimer = 0, settingsPage = 1;

const PLAYER_COLORS = ["#00ff88", "#00ffff", "#ff00ff", "#ff8800", "#888888", "#8b4513"]; 
const PU_TYPES = [
    { id: 1, name: "SPEED", color: "#ffff00", icon: "🏃" }, 
    { id: 2, name: "SHIELD", color: "#00ffff", icon: "🛡️" }, 
    { id: 3, name: "DISTANCE", color: "#ff00ff", icon: "🏹" }, 
    { id: 4, name: "SPRAY", color: "#ffffff", icon: "🔱" }, 
    { id: 5, name: "FAST BULLET", color: "#ff8800", icon: "🚀" }, 
    { id: 6, name: "BIG BULLET", color: "#ff0000", icon: "☀️" }, 
    { id: 7, name: "RAPID FIRE", color: "#00ff00", icon: "🔫" }, 
    { id: 8, name: "HEAL", color: "#ff0088", icon: "🍱" }, 
    { id: 9, name: "SIDE SHOT", color: "#0088ff", icon: "➕" }, 
    { id: 10, name: "BOMB", color: "#ff5500", icon: "🔥" },
    { id: 11, name: "RICOCHET", color: "#ee82ee", icon: "🔁" },
    { id: 12, name: "KINETIC SHIELD", color: "#ffff00", icon: "🛡️" },
    { id: 13, name: "CHOBHAM ARMOUR", color: "#8b4513", icon: "🚜" },
    { id: 14, name: "EMP PULSE", color: "#9400d3", icon: "⚡" }
];
const AI_PERSONALITIES = ['NORMAL', 'CLUELESS', 'AGGRESSIVE', 'DEFENSIVE', 'MIXED'];
const BOARD_SIZES = ['NORMAL', 'LARGE', 'MASSIVE'];

const keysDown = {};
window.addEventListener('keydown', e => {
    const isTyping = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (isTyping && e.code === 'Enter') {
        if (!document.getElementById('host-setup').classList.contains('hidden')) hostGame();
        if (!document.getElementById('join-setup').classList.contains('hidden')) confirmJoin();
        return;
    }
    if (!isTyping || e.code === 'Enter' || e.code === 'Escape') keysDown[e.code] = true;
});
window.addEventListener('keyup', e => keysDown[e.code] = false);
window.addEventListener('blur', () => { for (let k in keysDown) keysDown[k] = false; });

// Leaving the tab or window pauses a local match (online matches keep running for the others).
// The game makes no sound, so there is no audio to silence here.
function pauseWhenAway() {
    if (state === 'PLAYING' && !currentOnlineRoom && pauseMenu.classList.contains('hidden') && typeof window.togglePause === 'function') window.togglePause();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenAway(); });
window.addEventListener('blur', pauseWhenAway);

// Mouse Trajectory Capture Listeners
window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});
window.addEventListener('mousedown', e => {
    if (e.button === 0) mouseFire = true;
});
window.addEventListener('mouseup', e => {
    if (e.button === 0) mouseFire = false;
});

window.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (e.isTrusted && button && state === 'MENU' && button.getAttribute('onclick')?.startsWith('startGame(')) {
        didStartByMouseClick = true;
    }
}, true);

window.addEventListener('click', e => {
    const arrow = e.target.closest('.page-arrow');
    if (arrow) { cycleSettingsPage(arrow.innerText === '◀' ? -1 : 1); return; }
    
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.classList.contains('page-arrow')) {
        return;
    }
    
    const item = e.target.closest('.nav-item');
    if (!item || state === 'PLAYING') return;
    const panel = item.closest('.ui-panel:not(.hidden)');
    if (panel) {
        const items = Array.from(panel.querySelectorAll('.nav-item')).filter(i => {
            if (i.classList.contains('hidden')) return false;
            const style = window.getComputedStyle(i);
            return style.display !== 'none' && style.visibility !== 'hidden' && i.offsetWidth > 0;
        });
        menuIndex = items.indexOf(item); lastInputMethod = 'MOUSE'; updateMenuVisuals();
    }
    if (e.target.tagName !== 'BUTTON') {
        const toggle = item.querySelector('.toggle-btn'), cycle = item.querySelector('.cycle-btn');
        if (toggle) toggle.click(); if (cycle) cycle.click();
    }
});

window.addEventListener('mouseover', e => {
    const item = e.target.closest('.nav-item');
    if (item && state !== 'PLAYING') {
        const panel = item.closest('.ui-panel:not(.hidden)');
        if (panel) {
            const items = Array.from(panel.querySelectorAll('.nav-item')).filter(i => {
                if (i.classList.contains('hidden')) return false;
                const style = window.getComputedStyle(i);
                return style.display !== 'none' && style.visibility !== 'hidden' && i.offsetWidth > 0;
            });
            const idx = items.indexOf(item);
            if (idx !== -1) { menuIndex = idx; lastInputMethod = 'MOUSE'; updateMenuVisuals(); }
        }
    }
});

window.addEventListener('mouseout', e => {
    const item = e.target.closest('.nav-item');
    if (item && lastInputMethod === 'MOUSE') { menuIndex = -1; updateMenuVisuals(); }
});

const inputSets = [
    { id: 'gp0', type: 'gamepad', index: 0 }, { id: 'gp1', type: 'gamepad', index: 1 }, { id: 'gp2', type: 'gamepad', index: 2 }, { id: 'gp3', type: 'gamepad', index: 3 },
    { id: 'kb_mouse', type: 'keyboard_mouse' }
];

function adjustColor(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    lum = lum || 0; let rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i*2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + (c * lum)), 255)).toString(16);
        rgb += ("00"+c).substr(c.length);
    }
    return rgb;
}

function showNotification(msg, color) {
    let container = document.getElementById('notifications'); if (!container) return;
    const el = document.createElement('div'); el.className = 'notif'; el.style.color = color; el.innerText = msg;
    container.appendChild(el); setTimeout(() => el.remove(), 2600);
}

window.addEventListener('beforeunload', () => { if (presenceHandle) presenceHandle.leave(); });

document.addEventListener('fullscreenchange', () => { cfg.fullscreen = !!document.fullscreenElement; const btn = document.getElementById('fullscreenBtn'); if (btn) { btn.innerText = cfg.fullscreen ? "ON" : "OFF"; btn.classList.toggle('active', cfg.fullscreen); } });

function lockMobileOrientation() {
    if (isMobile) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().then(() => {
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock('landscape').catch(e => console.log(e));
                }
            }).catch(e => console.log(e));
        }
    }
}

function unlockMobileOrientation() {
    if (isMobile) {
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(e => console.log(e));
        }
    }
}

function applyGodModePowerUps() { if (cfg.godMode && !currentOnlineRoom) world.tanks.forEach(t => { if (!t.isAI) PU_TYPES.forEach(pu => t.applyPowerUp(pu)); }); }

function joinGame(id) {
    if (!net) { showNotification("Online play is unavailable", "#ff3300"); return; }
    if (presenceHandle) presenceHandle.leave();
    world.tanks.clear(); world.map = []; world.myTankId = null; onlinePeers = {}; prevStats.clear(); hasInitialPresence = false; lastPeerCount = 0;
    setTimeout(() => { hasInitialPresence = true; }, 2000); currentOnlineRoom = id; isHostPaused = false;
    lockMobileOrientation();
    const pilotName = document.getElementById(isOnlineHost ? 'hostNameInput' : 'joinNameInput')?.value || defaultName;
    const room = isOnlineHost
        ? net.host(id, { title: pendingHostTitle || `${pilotName}'s Game`, name: pilotName, capacity: MAX_ROOM_CAPACITY })
        : net.join(id, { name: pilotName });
    pendingHostTitle = null;
    presenceHandle = room;
    room.onClose(reason => {
        if (presenceHandle !== room || reason === 'left') return;
        const why = { host_left: "The host ended the game", full: "That game is full", not_found: "That game has ended", taken: "Could not host that game" }[reason] || "Lost connection to the game";
        showNotification(why, "#ff3300");
        backToMenu(true);
    });
    presenceHandle.subscribeTopic('map_sync', (msg) => { 
        world.map = msg.map; 
        world.warpX = msg.warpX; 
        world.warpY = msg.warpY; 
        cfg.rows = msg.rows || 15; 
        cfg.cols = msg.cols || 20;
        if (msg.hostCfg) {
            Object.assign(cfg, msg.hostCfg);
        }
        if (msg.hostPowerUps && Array.isArray(msg.hostPowerUps)) {
            world.powerUps = [];
            msg.hostPowerUps.forEach(pData => {
                const type = PU_TYPES.find(t => t.id === pData.typeId);
                if (type) {
                    const pu = new PowerUp(pData.x, pData.y, type);
                    pu.id = pData.id;
                    world.powerUps.push(pu);
                }
            });
        }
    });
    presenceHandle.subscribeTopic('fire', (msg) => {
        const owner = world.tanks.get(msg.tankId); if (owner) { const b = new Bullet(msg.x, msg.y, msg.angle, owner, msg.range, msg.speed, msg.size, msg.isBomb, msg.hasBig, msg.hasDist, msg.hasFast, msg.hasRicochet); world.bullets.set(b.id, b); }
    });
    presenceHandle.subscribeTopic('remote_pause', (msg) => {
        if (!isOnlineHost) { isHostPaused = msg.paused; state = msg.paused ? 'PAUSED' : 'PLAYING'; if (msg.paused) { pauseMenu.classList.remove('hidden'); menuIndex = -1; document.getElementById('mobile-controls').classList.remove('active'); } else { pauseMenu.classList.add('hidden'); document.getElementById('mobile-controls').classList.add('active'); } updateMenuVisuals(); }
    });
    presenceHandle.subscribeTopic('powerup_spawn', (msg) => {
        if (world.powerUps.some(p => p.id === msg.id)) return;
        const type = PU_TYPES.find(t => t.id === msg.typeId);
        if (type) {
            const pu = new PowerUp(msg.x, msg.y, type);
            pu.id = msg.id;
            world.powerUps.push(pu);
        }
    });
    presenceHandle.subscribeTopic('powerup_pickup', (msg) => {
        const idx = world.powerUps.findIndex(p => p.id === msg.id);
        if (idx !== -1) world.powerUps.splice(idx, 1);
        const picker = world.tanks.get(msg.pickerId);
        if (picker && picker.id !== world.myTankId) {
            const type = PU_TYPES.find(t => t.id === msg.typeId);
            if (type) picker.applyPowerUp(type);
        }
    });
    presenceHandle.subscribePresence({}, ({ peers }) => { 
         onlinePeers = peers; const peerCount = Object.keys(peers).length;
         if (isOnlineHost && peerCount > lastPeerCount) { 
             const currentPUs = world.powerUps.map(p => ({ id: p.id, x: p.x, y: p.y, typeId: p.type.id }));
             presenceHandle.publishTopic('map_sync', { map: world.map, warpX: world.warpX, warpY: world.warpY, rows: cfg.rows, cols: cfg.cols, hostCfg: cfg, hostPowerUps: currentPUs }); 
         }
         lastPeerCount = peerCount;
         Object.entries(peers).forEach(([peerId, data]) => {
             if (peerId === myPeerId()) return;
             if (data.tanks) {
                 data.tanks.forEach(tankData => {
                     let t = world.tanks.get(tankData.id); if (!t) { t = new Tank(tankData.x, tankData.y, tankData.color || PLAYER_COLORS[1], tankData.isAI, null, tankData.id); if (!t.isAI) { t.warpState = 'IN'; t.warpAnim = 0; if (hasInitialPresence) showNotification(`${tankData.name || "A pilot"} joined`, t.color); } if (!t.isAI && cfg.defaultPowerUp) { t.applyPowerUp(cfg.defaultPowerUp); } world.tanks.set(tankData.id, t); }
                     if (Math.hypot(t.x - tankData.x, t.y - tankData.y) > TILE * 2) { t.x = t.targetX = tankData.x; t.y = t.targetY = tankData.y; } else { t.targetX = tankData.x; t.targetY = tankData.y; }
                     t.bodyAngle = tankData.bodyAngle; t.cannonAngle = tankData.cannonAngle; t.hp = tankData.hp; t.alive = tankData.alive; t.name = tankData.name || "Tank"; t.kills = tankData.kills || 0; t.livesLost = tankData.livesLost || 0; t.shield = tankData.shield || 0; t.kineticShield = tankData.kineticShield || 0; t.empStunTimer = tankData.empStunTimer || 0; if (tankData.serializedPUs) t.powerUps = new Map(tankData.serializedPUs); if (tankData.serializedRoundPUs) t.roundPowerUps = new Map(tankData.serializedRoundPUs); if (tankData.serializedPermPUs) t.permPowerUps = new Map(tankData.serializedPermPUs);
                 });
             }
         });
     });
    startGame(true);
}

function restartRound() { setupRound(currentOnlineRoom !== null, false, true); }

function createExplosion(x, y, color, isSubtle, scale = 1.0) {
    const count = isSubtle ? 18 : 50 * scale, force = isSubtle ? 6 : 14 * scale;
    for(let i=0; i<count; i++) { world.particles.push({ x, y, vx: (Math.random()-0.5) * force, vy: (Math.random()-0.5) * force, life: 1.0, decay: (0.007 + Math.random() * 0.015) * (isSubtle ? 1.8 : 1.0), size: (2 + Math.random() * 8) * (isSubtle ? 0.6 : scale), color: Math.random() > 0.4 ? color : (Math.random() > 0.6 ? "#ffaa00" : "#ffffff") }); }
}

function createFireExplosion(x, y, radius) {
    for(let i=0; i<120; i++) { const ang = Math.random() * Math.PI * 2, d = Math.random() * radius; world.particles.push({ x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5 - 1.2, life: 0.8 + Math.random() * 0.5, decay: 0.015 + Math.random() * 0.02, size: 4 + Math.random() * 10, isFire: true }); }
}

function generateMap() {
    while (true) {
        let m = Array(cfg.rows).fill().map(() => Array(cfg.cols).fill(0)); const choice = Math.floor(Math.random() * 4); 
        let wx = (choice === 1 || choice === 3), wy = (choice === 2 || choice === 3), wxt = Math.random() < 0.6 ? 'SMALL' : 'WIDE', wyt = Math.random() < 0.6 ? 'SMALL' : 'WIDE';
        for(let r=0; r<cfg.rows; r++) { if (!wx) { m[r][0] = m[r][cfg.cols-1] = 1; } else { if (r === 0 || r === cfg.rows-1 || (wxt === 'SMALL' && !(r >= 5 && r <= 8))) m[r][0] = m[r][cfg.cols-1] = 1; } }
        for(let c=0; c<cfg.cols; c++) { if (!wy) { m[0][c] = m[cfg.rows-1][c] = 1; } else { if (c === 0 || c === cfg.cols-1 || (wyt === 'SMALL' && !(c >= 8 && c <= 11))) m[0][c] = m[cfg.rows-1][c] = 1; } }
        let count = Math.floor(((cfg.rows-2)*(cfg.cols-2)) * (cfg.density/100)); while(count > 0) { let r = Math.floor(Math.random()*(cfg.rows-2))+1, c = Math.floor(Math.random()*(cfg.cols-2))+1; if(m[r][c] === 0) { m[r][c] = 1; count--; } }
        let start = null; for(let r=0; r<cfg.rows; r++) { for(let c=0; c<cfg.cols; c++) { if(m[r][c] === 0) { start = {r, c}; break; } } if(start) break; }
        if(start) {
            let vis = Array(cfg.rows).fill().map(() => Array(cfg.cols).fill(false)), q = [start]; vis[start.r][start.c] = true;
            while(q.length > 0) { let cur = q.shift(); [[0,1],[0,-1],[1,0],[-1,0]].forEach(d => { let nr = cur.r + d[0], nc = cur.c + d[1]; if (nr >= 0 && nr < cfg.rows && m[nr][nc] === 0 && !vis[nr][nc]) { vis[nr][nc] = true; q.push({r: nr, c: nc}); } }); }
            for(let r=0; r<cfg.rows; r++) for(let cc=0; cc<cfg.cols; cc++) if(m[r][cc] === 0 && !vis[r][cc]) m[r][cc] = 1;
        }
        let obs = 0; for(let r=0; r<cfg.rows; r++) for(let cc=0; cc<cfg.cols; cc++) if(m[r][cc] === 1) obs++;
        if (obs / (cfg.rows * cfg.cols) <= 0.45) { world.warpX = wx; world.warpY = wy; world.warpXType = wxt; world.warpYType = wyt; return m; }
    }
}

class PowerUp { constructor(x, y, type) { this.x = x; this.y = y; this.type = type; this.bounce = 0; this.id = generateUUID(); } draw() { this.bounce += 0.05; const off = Math.sin(this.bounce) * 5; ctx.save(); ctx.translate(this.x, this.y + off); ctx.shadowBlur = 15; ctx.shadowColor = this.type.color; ctx.fillStyle = this.type.color; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = "#000"; ctx.font = "16px Segoe UI Symbol"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(this.type.icon, 0, 0); ctx.restore(); } }

class Tank {
    constructor(tx, ty, color, isAI = false, inputSet = null, id = null) {
        this.id = id || generateUUID(); this.x = tx; this.y = ty; this.color = color; this.darkColor = adjustColor(color, -0.6); this.lightColor = adjustColor(color, 0.7); this.isAI = isAI; this.hp = isAI ? cfg.aiHp : cfg.hp; this.alive = true; this.bodyAngle = 0; this.cannonAngle = 0; this.vel = 0; this.hitFlash = 0; this.shield = 0; this.kineticShield = 0; this.empStunTimer = 0;
        this.powerUps = new Map(); this.roundPowerUps = new Map(); this.permPowerUps = new Map();
        this.lives = isAI ? 1 : 3; this.invincibilityTimer = cfg.respawnCooldown * 60; this.radius = 15; this.inputSet = inputSet; this.lastShot = 0; this.targetX = tx; this.targetY = ty;
        this.name = isAI ? "CPU" : (document.getElementById(isOnlineHost ? 'hostNameInput' : 'joinNameInput')?.value || "Tank");
        this.aiPersonality = 'NORMAL';
        this.aiTargetTankId = null;
        if (this.isAI) {
            if (cfg.aiPersonality === 'MIXED') this.aiPersonality = AI_PERSONALITIES[Math.floor(Math.random() * 4)];
            else this.aiPersonality = cfg.aiPersonality;
        }
        if (!this.isAI && cfg.defaultPowerUp) this.applyPowerUp(cfg.defaultPowerUp);
        this.warpState = 'NONE'; this.warpAnim = 1.0; this.shouldDelete = false; this.kills = 0; this.livesLost = 0;
    }
    update() {
        if (this.warpState === 'IN') { this.warpAnim += 0.04; if (this.warpAnim >= 1) { this.warpAnim = 1; this.warpState = 'NONE'; } } 
        else if (this.warpState === 'OUT') { this.warpAnim -= 0.04; if (this.warpAnim <= 0) { this.warpAnim = 0; this.shouldDelete = true; } return; }
        if (!this.alive) return; if (this.hitFlash > 0) this.hitFlash--; if (this.invincibilityTimer > 0) this.invincibilityTimer--;
        
        if (this.empStunTimer > 0) {
            this.empStunTimer--;
            this.vel = 0;
            this.resolveMapCollision();
            return;
        }

        let ix = 0, iy = 0, rx = 0, ry = 0, fire = false;
        if (this.isAI) { this.updateAI(); ix = this.aiTarget.x; iy = this.aiTarget.y; }
        else if (this.inputSet === 'mobile') {
            ix = mobileInput.ix; iy = mobileInput.iy;
            rx = mobileInput.rx; ry = mobileInput.ry;
            fire = mobileInput.fire;
            if (Math.abs(rx) > 0 || Math.abs(ry) > 0) this.cannonAngle = Math.atan2(ry, rx); else if (Math.abs(ix) > 0 || Math.abs(iy) > 0) this.cannonAngle = Math.atan2(iy, ix); if (fire) this.shoot();
        }
        else if (this.inputSet && this.inputSet.type === 'keyboard_mouse') {
            // Merged Directions layout: WASD + Arrows running concurrently
            if (keysDown['KeyW'] || keysDown['ArrowUp']) iy = -1;
            if (keysDown['KeyS'] || keysDown['ArrowDown']) iy = 1;
            if (keysDown['KeyA'] || keysDown['ArrowLeft']) ix = -1;
            if (keysDown['KeyD'] || keysDown['ArrowRight']) ix = 1;
            
            // Multiplexing Fire bindings
            fire = mouseFire || keysDown['Space'] || keysDown['KeyF'];

            // Geometric Canvas Mouse Projector calculations
            const rect = canvas.getBoundingClientRect();
            const scaledMouseX = (mouseX - rect.left) * (canvas.width / rect.width);
            const scaledMouseY = (mouseY - rect.top) * (canvas.height / rect.height);
            
            // Undo the current view (fit-to-canvas on desktop, follow camera on phones)
            const gameWorldMouseX = (scaledMouseX - view.ox) / view.sx;
            const gameWorldMouseY = (scaledMouseY - view.oy) / view.sy;
            
            this.cannonAngle = Math.atan2(gameWorldMouseY - this.y, gameWorldMouseX - this.x);
            if (fire) this.shoot();
        }
        else if (this.inputSet) {
            if (this.inputSet.type === 'gamepad') { const g = navigator.getGamepads()[this.inputSet.index]; if (g) { ix = Math.abs(g.axes[0]) > 0.2 ? g.axes[0] : 0; iy = Math.abs(g.axes[1]) > 0.2 ? g.axes[1] : 0; rx = Math.abs(g.axes[2]) > 0.2 ? g.axes[2] : 0; ry = Math.abs(g.axes[3]) > 0.2 ? g.axes[3] : 0; fire = g.buttons[0]?.pressed || g.buttons[7]?.pressed; } }
            if (Math.abs(rx) > 0 || Math.abs(ry) > 0) this.cannonAngle = Math.atan2(ry, rx); else if (Math.abs(ix) > 0 || Math.abs(iy) > 0) this.cannonAngle = Math.atan2(iy, ix); if (fire) this.shoot();
        } else { this.x = lerp(this.x, this.targetX, 0.15); this.y = lerp(this.y, this.targetY, 0.15); return; }
        
        let speedMod = 1.0 + (this.getPUCount(1) * 0.6);
        if (this.hasPU(13)) speedMod *= 0.65;
        const acc = (cfg.speed * speedMod) / 18; 
        if (Math.abs(ix) > 0 || Math.abs(iy) > 0) { let target = Math.atan2(iy, ix), diff = target - this.bodyAngle; while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2; this.bodyAngle += diff * cfg.turnSpeed; this.vel = Math.min(this.vel + acc, cfg.speed * speedMod); } else { this.vel = Math.max(0, this.vel - acc); }
        let vx = Math.cos(this.bodyAngle) * this.vel, vy = Math.sin(this.bodyAngle) * this.vel; if (!this.checkWall(this.x + vx, this.y)) this.x += vx; if (!this.checkWall(this.x, this.y + vy)) this.y += vy;
        this.resolveMapCollision();
        if (world.warpX) { if (this.x < 0) this.x = (world.map[Math.floor(this.y/TILE)]?.[cfg.cols-1] === 0) ? (cfg.cols * TILE) : 0; else if (this.x > (cfg.cols * TILE)) { if (world.map[Math.floor(this.y/TILE)]?.[0] === 0) this.x = 0; else this.x = (cfg.cols * TILE); } }
        if (world.warpY) { if (this.y < 0) { if (world.map[cfg.rows-1]?.[Math.floor(this.x/TILE)] === 0) this.y = (cfg.rows * TILE); else this.y = 0; } else if (this.y > (cfg.rows * TILE)) { if (world.map[0]?.[Math.floor(this.x/TILE)] === 0) this.y = 0; else this.y = (cfg.rows * TILE); } }
        
        for (let i = world.powerUps.length - 1; i >= 0; i--) { 
            let pu = world.powerUps[i]; 
            if (Math.hypot(this.x - pu.x, this.y - pu.y) < 30) { 
                if (!this.isAI || cfg.aiPowerUps) { 
                    let canCollect = true;
                    if (pu.type.id === 2 && this.shield >= 3) canCollect = false;
                    else if (pu.type.id === 12 && this.kineticShield >= 3) canCollect = false;
                    else if (pu.type.id === 8 && this.hp >= (this.isAI ? cfg.aiHp : cfg.hp) + (this.getPUCount(13) * (this.isAI ? cfg.aiHp : cfg.hp))) canCollect = false;
                    else if (![2, 8, 12, 14].includes(pu.type.id) && this.getPUCount(pu.type.id) >= 3) canCollect = false;

                    if (canCollect) {
                        this.applyPowerUp(pu.type); 
                        if (currentOnlineRoom && presenceHandle && !this.isAI) {
                            presenceHandle.publishTopic('powerup_pickup', { id: pu.id, pickerId: this.id, typeId: pu.type.id });
                        }
                        world.powerUps.splice(i, 1); 
                    }
                } 
            } 
        }
    }
    applyPowerUp(type) { 
        if (type.id === 2) this.shield = Math.min(3, this.shield + 1); 
        else if (type.id === 12) this.kineticShield = Math.min(3, this.kineticShield + 1);
        else if (type.id === 8) this.hp = (this.isAI ? cfg.aiHp : cfg.hp) + (this.getPUCount(13) * (this.isAI ? cfg.aiHp : cfg.hp)); 
        else if (type.id === 13) {
            let currentArmor = this.getPUCount(13);
            if (currentArmor < 3) {
                let activeMap = this.powerUps;
                if (cfg.puDuration === 'ROUND') activeMap = this.roundPowerUps;
                else if (cfg.puDuration === 'PERMANENT') activeMap = this.permPowerUps;
                activeMap.set(type.id, currentArmor + 1);
                this.hp += (this.isAI ? cfg.aiHp : cfg.hp);
            }
            createExplosion(this.x, this.y, type.color, true);
            return;
        }
        else if (type.id === 14) {
            world.empEffects.push({ x: this.x, y: this.y, r: 0, maxR: 500 });
            world.tanks.forEach(t => {
                if (t !== this && t.alive) {
                    if (cfg.cooperativeMode && !t.isAI && !this.isAI) return;
                    t.empStunTimer = 180;
                }
            });
            showNotification(`${this.name} ACTIVATED EMP!`, "#9400d3");
            return;
        }
        else { 
            let activeMap = this.powerUps;
            if (cfg.puDuration === 'ROUND') activeMap = this.roundPowerUps;
            if (cfg.puDuration === 'PERMANENT') activeMap = this.permPowerUps;
            activeMap.set(type.id, Math.min(3, (activeMap.get(type.id) || 0) + 1));
        }
        createExplosion(this.x, this.y, type.color, true); 
    }
    takeDamage(dmg, bullet) { 
        if (this.warpState !== 'NONE' || (cfg.godMode && !this.isAI) || this.invincibilityTimer > 0) return; 
        if (this.kineticShield > 0) {
            this.kineticShield--;
            if (bullet) {
                bullet.owner = this;
                bullet.angle = Math.atan2(-bullet.dy, -bullet.dx);
                bullet.dx *= -1; bullet.dy *= -1;
                bullet.x += bullet.dx * 2; bullet.y += bullet.dy * 2;
                bullet.life = 1;
            }
            createExplosion(this.x, this.y, "#ffff00", true, 0.8);
            return 'REFLECTED';
        }
        if (this.shield > 0) { this.shield--; return; } 
        this.hp -= dmg; this.hitFlash = 10; if (this.hp <= 0) { this.lives--; this.livesLost++; createExplosion(this.x, this.y, this.color, this.isAI); if (this.lives > 0) this.respawn(); else { this.alive = false; checkEnd(); } } 
    }
    respawn() { const spawn = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows)); this.x = spawn.x; this.y = spawn.y; this.hp = this.isAI ? cfg.aiHp : cfg.hp; this.invincibilityTimer = cfg.respawnCooldown * 60; this.vel = 0; this.powerUps.clear(); this.shield = 0; this.kineticShield = 0; this.empStunTimer = 0; if (!this.isAI && cfg.defaultPowerUp) this.applyPowerUp(cfg.defaultPowerUp); }
    checkWall(nx, ny) { const b = 14.5; return [{x: nx-b, y: ny-b}, {x: nx+b, y: ny-b}, {x: nx-b, y: ny+b}, {x: nx+b, y: ny+b}].some(p => world.map[Math.floor(p.y/TILE)]?.[Math.floor(p.x/TILE)] === 1); }
    resolveMapCollision() {
        const r = 15, gx = Math.floor(this.x / TILE), gy = Math.floor(this.y / TILE);
        for(let rr = gy-1; rr <= gy+1; rr++) { for(let cc = gx-1; cc <= gx+1; cc++) { if (world.map[rr]?.[cc] === 1) { const nx = Math.max(cc * TILE, Math.min(this.x, (cc + 1) * TILE)), ny = Math.max(rr * TILE, Math.min(this.y, (rr + 1) * TILE)), dx = this.x - nx, dy = this.y - ny, dSq = dx*dx + dy*dy; if (dSq < r * r && dSq > 0) { const d = Math.sqrt(dSq), overlap = r - d; this.x += (dx / d) * overlap; this.y += (dy / d) * overlap; } } } }
    }
    updateAI() {
        if(!this.aiTimer || this.aiTimer-- <= 0) {
            let foundPU = false;
            if (cfg.aiPowerUps && world.powerUps.length > 0) {
                let nearest = null, minDist = Infinity;
                world.powerUps.forEach(pu => { let d = Math.hypot(pu.x - this.x, pu.y - this.y); if (d < minDist) { minDist = d; nearest = pu; } });
                if (nearest) {
                    if (this.aiPersonality !== 'CLUELESS') {
                        let dx = nearest.x - this.x, dy = nearest.y - this.y, d = Math.hypot(dx, dy); 
                        this.aiTarget = { x: dx/d, y: dy/d }; this.aiTimer = 30; foundPU = true; 
                    }
                }
            }

            if (!foundPU) {
                const targetIntensity = cfg.aiIntensity;
                this.aiTimer = (50 + Math.random()*80) * (1 - targetIntensity + 0.2);
                
                if (this.aiPersonality === 'CLUELESS') {
                    this.aiTarget = { x: Math.random()-0.5, y: Math.random()-0.5 };
                } else if (this.aiPersonality === 'AGGRESSIVE') {
                    const p = Array.from(world.tanks.values()).filter(t => t.alive && !t.isAI)[0];
                    if (p) {
                        let dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
                        this.aiTarget = { x: dx/d, y: dy/d };
                    } else {
                        this.aiTarget = { x: Math.random()-0.5, y: Math.random()-0.5 };
                    }
                } else if (this.aiPersonality === 'DEFENSIVE') {
                    const p = Array.from(world.tanks.values()).filter(t => t.alive && !t.isAI)[0];
                    if (p && Math.hypot(p.x - this.x, p.y - this.y) < 250) {
                        let dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy);
                        this.aiTarget = { x: dx/d, y: dy/d };
                    } else {
                        this.aiTarget = { x: Math.random()-0.5, y: Math.random()-0.5 };
                    }
                } else {
                    this.aiTarget = { x: Math.random()-0.5, y: Math.random()-0.5 };
                }
            }
        }
        const targets = Array.from(world.tanks.values()).filter(t => t.alive && !t.isAI);
        let lockedTarget = this.aiTargetTankId ? world.tanks.get(this.aiTargetTankId) : null;
        
        if (targets.length > 0) {
            let closestTarget = targets[0];
            let minDist = Math.hypot(closestTarget.x - this.x, closestTarget.y - this.y);
            for (let i = 1; i < targets.length; i++) {
                let d = Math.hypot(targets[i].x - this.x, targets[i].y - this.y);
                if (d < minDist) { minDist = d; closestTarget = targets[i]; }
            }
            if (!lockedTarget || !lockedTarget.alive || !targets.includes(lockedTarget)) {
                lockedTarget = closestTarget;
                this.aiTargetTankId = lockedTarget ? lockedTarget.id : null;
            } else {
                let currentTargetDist = Math.hypot(lockedTarget.x - this.x, lockedTarget.y - this.y);
                if (minDist < currentTargetDist - 80) {
                    lockedTarget = closestTarget;
                    this.aiTargetTankId = lockedTarget.id;
                }
            }
        }
        
        if(lockedTarget) {
            const aimError = (1 - cfg.aiPrecision) * 0.4;
            const targetAngle = Math.atan2(lockedTarget.y - this.y, lockedTarget.x - this.x) + (Math.random() * aimError - aimError/2);
            this.cannonAngle = targetAngle;
            
            let fireChance = 0.015;
            if (this.aiPersonality === 'AGGRESSIVE') fireChance = 0.03;
            if (this.aiPersonality === 'DEFENSIVE' && Math.hypot(lockedTarget.x - this.x, lockedTarget.y - this.y) < 300) fireChance = 0.04;
            if (this.aiPersonality === 'CLUELESS') fireChance = 0.005;

            if(Math.random() < fireChance) this.shoot();
        }
    }
    shoot() { 
        let fireRate = cfg.fireRate * (this.hasPU(7) ? 0.35 : 1.0); 
        if (Date.now() - this.lastShot > fireRate) { 
            let hD = this.hasPU(3), hF = this.hasPU(5), isB = this.hasPU(10);
            let sprayTier = this.getPUCount(4);
            let sideTier = this.getPUCount(9);
            let bigTier = this.getPUCount(6);
            let hR = this.hasPU(11);
            
            let rng = cfg.range * (hD ? 2.5 : 1.0);
            let spd = 8.5 * (hF ? 1.8 : 1.0);
            let sz = 3.5 * (bigTier > 0 ? (1.5 + bigTier) : 1.0); 
            
            const sync = (ang) => { const b = new Bullet(this.x, this.y, ang, this, rng, spd, sz, isB, bigTier > 0, hD, hF, hR, bigTier); world.bullets.set(b.id, b); if (presenceHandle) presenceHandle.publishTopic('fire', { x: this.x, y: this.y, angle: ang, tankId: this.id, range: rng, speed: spd, size: sz, isBomb: isB, hasBig: bigTier > 0, hasDist: hD, hasFast: hF, hasRicochet: hR }); };
            
            if (sprayTier > 0) { 
                let count = 1 + (sprayTier * 2);
                let mid = Math.floor(count / 2);
                for(let i = -mid; i <= mid; i++) sync(this.cannonAngle + (i * 0.2)); 
            } else sync(this.cannonAngle); 
            
            if (sideTier > 0) { 
                sync(this.cannonAngle + Math.PI/2); 
                sync(this.cannonAngle - Math.PI/2); 
                if (sideTier >= 2) sync(this.cannonAngle + Math.PI);
                if (sideTier >= 3) sync(this.cannonAngle);
            } 
            this.lastShot = Date.now(); 
        } 
    }
    getPUCount(id) { return (this.powerUps.get(id) || 0) + (this.roundPowerUps.get(id) || 0) + (this.permPowerUps.get(id) || 0); }
    hasPU(id) { return this.getPUCount(id) > 0; }
    draw() { 
        if (this.invincibilityTimer > 0 && state !== 'PAUSED' && Math.floor(Date.now() / 100) % 2 === 0) return; 
        ctx.save(); ctx.translate(this.x, this.y); if (this.warpState !== 'NONE') ctx.globalAlpha *= this.warpAnim;
        const index = Array.from(world.tanks.values()).filter(t => !t.isAI).indexOf(this), displayName = currentOnlineRoom ? (this.name || "Tank") : `PLAYER ${index + 1}`;
        if (currentOnlineRoom && this.name) { ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.font = "bold 10px Segoe UI"; ctx.textAlign = "center"; ctx.fillText(displayName, 0, -48); }
        if (!this.isAI) { for(let i=0; i < this.lives; i++) { ctx.fillStyle = this.color; ctx.beginPath(); ctx.roundRect(-15 + (i * 11), -42, 8, 3, 1); ctx.fill(); } } 
        
        let armorTier = this.getPUCount(13);
        let baseMax = this.isAI ? cfg.aiHp : cfg.hp;
        let currentMax = baseMax + (armorTier * baseMax);
        let barWidth = 30 * (1 + armorTier);
        let barOffset = -barWidth / 2;
        
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.beginPath(); ctx.roundRect(barOffset, -34, barWidth, 4, 2); ctx.fill(); 
        ctx.fillStyle = this.hp > (currentMax * 0.3) ? "#00ff00" : "#ff3300"; ctx.beginPath(); ctx.roundRect(barOffset, -34, (this.hp/currentMax)*barWidth, 4, 2); ctx.fill(); 
        
        if (this.kineticShield > 0) { 
            ctx.strokeStyle = "#ffff00"; ctx.lineWidth = 3; 
            for(let k = 0; k < this.kineticShield; k++) {
                ctx.beginPath(); ctx.arc(0, 0, 26 + (k * 4), 0, Math.PI*2); ctx.stroke(); 
            }
        }
        if (this.shield > 0) { 
            ctx.strokeStyle = "#00ffff"; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); 
            for(let s = 0; s < this.shield; s++) {
                ctx.beginPath(); ctx.arc(0, 0, 24 + (s * 4), 0, Math.PI*2); ctx.stroke(); 
            }
            ctx.setLineDash([]); 
        } 
        
        if (this.empStunTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
            ctx.strokeStyle = "#9400d3"; ctx.lineWidth = 2;
            ctx.beginPath();
            for(let angle=0; angle<Math.PI*2; angle+=0.4) {
                let offsetR = 15 + Math.random()*8;
                let px = Math.cos(angle)*offsetR;
                let py = Math.sin(angle)*offsetR;
                if(angle===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
        }

        ctx.rotate(this.bodyAngle); 
        const dc = this.hitFlash > 0 ? "#ffffff" : this.color, ddk = this.hitFlash > 0 ? "#cccccc" : this.darkColor; 
        ctx.fillStyle = ddk; 
        
        if (armorTier > 0) {
            ctx.fillStyle = "#444444";
            ctx.fillRect(-22, -18, 44, 4); 
            ctx.fillRect(-22, 14, 44, 4);  
            ctx.fillStyle = ddk;
        }
        
        ctx.beginPath(); ctx.roundRect(-18, -14, 36, 8, 4); ctx.fill(); 
        ctx.beginPath(); ctx.roundRect(-18, 6, 36, 8, 4); ctx.fill(); 
        ctx.fillStyle = "#111"; ctx.beginPath(); ctx.roundRect(-14, -10, 28, 20, 2); ctx.fill(); 
        ctx.fillStyle = dc; ctx.beginPath(); ctx.roundRect(-12, -8, 24, 16, 5); ctx.fill(); 
        ctx.restore(); 
        
        ctx.save(); ctx.translate(this.x, this.y); if (this.warpState !== 'NONE') ctx.globalAlpha *= this.warpAnim; ctx.rotate(this.cannonAngle); ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = this.hitFlash > 0 ? "#ffffff" : this.lightColor; 
        
        if (armorTier > 0) {
            ctx.fillStyle = "#666666";
            ctx.beginPath(); ctx.roundRect(4, -5, 22, 10, 2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.roundRect(4, -3, 20, 6, 2); ctx.fill();
        }
        ctx.restore(); 

        if (this.isAI && this.aiPersonality !== 'NORMAL') {
            ctx.save();
            ctx.translate(this.x, this.y);
            if (this.warpState !== 'NONE') ctx.globalAlpha *= this.warpAnim;
            ctx.rotate(this.bodyAngle);
            ctx.fillStyle = "rgba(139, 0, 0, 0.9)"; 
            ctx.font = "bold 18px Segoe UI"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            const char = this.aiPersonality.charAt(0);
            ctx.fillText(char, 0, 0);
            ctx.restore();
        }
    }
}

class Bullet {
    constructor(x, y, a, owner, range, speed, size, isBomb, hasBig, hasDist, hasFast, hasRicochet, bigTier = 0) { this.id = generateUUID(); this.startX = x; this.startY = y; this.x = x; this.y = y; this.owner = owner; this.angle = a; this.dx = Math.cos(a) * speed; this.dy = Math.sin(a) * speed; this.life = 1; this.color = hasBig ? "#ffff00" : (isBomb ? "#ff5500" : owner.lightColor); this.range = range; this.size = size; this.isBomb = isBomb; this.hasBig = hasBig; this.hasDist = hasDist; this.hasFast = hasFast; this.hasRicochet = hasRicochet; this.damage = 34 * (bigTier > 0 ? (1.0 + bigTier * 0.5) : 1.0); this.bounces = 0; }
    update() { 
        this.x += this.dx; this.y += this.dy; const tx = Math.floor(this.x/TILE), ty = Math.floor(this.y/TILE), isW = world.map.length > 0 && world.map[ty]?.[tx] === 1; 
        if (world.warpX && world.map.length > 0) { if (this.x < 0) { if (world.map[Math.floor(this.y/TILE)]?.[cfg.cols-1] === 0) this.x = (cfg.cols * TILE); else this.explode(); } else if (this.x > (cfg.cols * TILE)) { if (world.map[Math.floor(this.y/TILE)]?.[0] === 0) this.x = 0; else this.x = (cfg.cols * TILE); } } 
        if (world.warpY && world.map.length > 0) { if (this.y < 0) { if (world.map[cfg.rows-1]?.[Math.floor(this.x/TILE)] === 0) this.y = (cfg.rows * TILE); else this.y = 0; } else if (this.y > (cfg.rows * TILE)) { if (world.map[0]?.[Math.floor(this.x/TILE)] === 0) this.y = 0; else this.y = (cfg.rows * TILE); } } 
        if (Math.hypot(this.x - this.startX, this.y - this.startY) > this.range) this.life = 0; 
        
        if (isW) {
            if (this.hasFast) {
            } else if (this.hasRicochet && this.bounces < 3) {
                this.bounces++;
                const prevX = this.x - this.dx; const prevY = this.y - this.dy;
                const ptx = Math.floor(prevX / TILE); const pty = Math.floor(prevY / TILE);
                if (ptx !== tx) this.dx *= -1;
                if (pty !== ty) this.dy *= -1;
                if (ptx === tx && pty === ty) { this.dx *= -1; this.dy *= -1; }
                this.x = prevX + this.dx; this.y = prevY + this.dy;
                this.angle = Math.atan2(this.dy, this.dx);
            } else {
                this.explode();
            }
        }

        world.tanks.forEach(t => { if(t.alive && t !== this.owner) { if (cfg.cooperativeMode && !t.isAI && !this.owner.isAI) return; if (Math.hypot(t.x-this.x, t.y-this.y) < 18 + this.size) { if (this.isBomb) this.explode(); else { const old = t.lives; const res = t.takeDamage(this.damage, this); if (res === 'REFLECTED') return; if (t.lives < old) this.owner.kills++; this.life = 0; } } } }); 
    }
    explode() { this.life = 0; if (this.isBomb) { const br = 60; createFireExplosion(this.x, this.y, br); world.tanks.forEach(t => { if (t.alive) { const d = Math.hypot(t.x - this.x, t.y - this.y); if (d < br) { const fo = 1 - (d / br), old = t.lives; let finalDmg = this.damage * 1.5 * fo; if (t.hasPU(13)) finalDmg *= 0.5; const res = t.takeDamage(finalDmg, this); if (res === 'REFLECTED') return; if (t.lives < old) this.owner.kills++; } } }); } }
    draw() { ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle); ctx.shadowBlur = 8; ctx.shadowColor = this.color; if (this.hasBig) { ctx.fillStyle = "#ffff00"; ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI*2); ctx.fill(); for(let i=0; i<8; i++) { ctx.rotate(Math.PI/4); ctx.fillRect(this.size, -1, this.size*0.6, 2); } } else if (this.hasDist) { ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI*2); ctx.stroke(); } else if (this.hasFast) { ctx.strokeStyle = this.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); } else if (this.hasRicochet) { ctx.fillStyle = "#ee82ee"; ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI*2); ctx.fill(); } else { ctx.fillStyle = this.isBomb ? "#ff5500" : "#fff"; ctx.beginPath(); ctx.arc(0, 0, this.size, 0, Math.PI*2); ctx.fill(); } ctx.restore(); }
}

function resolveTankCollisions() { 
    const ts = Array.from(world.tanks.values()); 
    for (let i = 0; i < ts.length; i++) { 
        for (let j = i + 1; j < ts.length; j++) { 
            let t1 = ts[i], t2 = ts[j]; 
            if (!t1.alive || !t2.alive || t1.warpState === 'OUT' || t2.warpState === 'OUT') continue; 
            let dx = t2.x - t1.x, dy = t2.y - t1.y, d = Math.hypot(dx, dy), md = t1.radius + t2.radius; 
            if (d < md) { 
                let ol = (md - d) + 0.5, nx = dx / d, ny = dy / d; 
                let w1 = t1.hasPU(13) ? 2 : 1;
                let w2 = t2.hasPU(13) ? 2 : 1;
                if (w1 > w2) {
                    t2.x += nx * ol; t2.y += ny * ol;
                } else if (w2 > w1) {
                    t1.x -= nx * ol; t1.y -= ny * ol;
                } else {
                    t1.x -= nx * ol / 2; t1.y -= ny * ol / 2; 
                    t2.x += nx * ol / 2; t2.y += ny * ol / 2; 
                }
            } 
        } 
    } 
}

function checkNewPlayers() { 
    if (!document.hasFocus() || state !== 'PLAYING' || isHostingAction) return; if (currentOnlineRoom && (world.map.length === 0 || !presenceHandle)) return;
    
    // Auto inject mobile touch user instantly with a unique color choice
    if (isMobile && !Array.from(world.tanks.values()).some(t => t.inputSet === 'mobile')) {
        const spawn = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows));
        const takenColors = Array.from(world.tanks.values()).map(tank => tank.color);
        const availableColor = PLAYER_COLORS.find(c => !takenColors.includes(c)) || PLAYER_COLORS[0];
        const t = new Tank(spawn.x, spawn.y, availableColor, false, 'mobile'); t.warpState = 'IN'; t.warpAnim = 0;
        world.tanks.set(t.id, t); world.myTankId = t.id; if (cfg.godMode) PU_TYPES.forEach(pu => t.applyPowerUp(pu));
        return;
    }

    // Provision a unified Keyboard Mouse tank if initiated via mouse interactions
    if (didStartByMouseClick && !isMobile && !Array.from(world.tanks.values()).some(t => t.inputSet && t.inputSet.type === 'keyboard_mouse')) {
        const spawn = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows));
        const takenColors = Array.from(world.tanks.values()).map(tank => tank.color);
        const availableColor = PLAYER_COLORS.find(c => !takenColors.includes(c)) || PLAYER_COLORS[0];
        const targetSet = inputSets.find(s => s.type === 'keyboard_mouse');
        const t = new Tank(spawn.x, spawn.y, availableColor, false, targetSet); t.warpState = 'IN'; t.warpAnim = 0;
        world.tanks.set(t.id, t); if (!world.myTankId) world.myTankId = t.id; if (cfg.godMode) PU_TYPES.forEach(pu => t.applyPowerUp(pu));
        didStartByMouseClick = false; 
        return;
    }

    inputSets.forEach(set => { 
        if (Array.from(world.tanks.values()).some(t => t.inputSet === set)) return; 
        let active = false; 
        if (set.type === 'gamepad') { 
            const gp = navigator.getGamepads()[set.index]; 
            if (gp) active = gp.axes.some(a => Math.abs(a) > 0.5) || gp.buttons.some(b => b.pressed); 
        } else if (set.type === 'keyboard_mouse') { 
            if (keysDown['KeyW'] || keysDown['KeyS'] || keysDown['KeyA'] || keysDown['KeyD'] || 
                keysDown['ArrowUp'] || keysDown['ArrowDown'] || keysDown['ArrowLeft'] || keysDown['ArrowRight'] || 
                keysDown['Space'] || keysDown['KeyF']) active = true; 
        } 
        if (active) { 
            const humans = Array.from(world.tanks.values()).filter(t => !t.isAI); 
            if (humans.length < PLAYER_COLORS.length) { 
                const spawn = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows));
                const takenColors = Array.from(world.tanks.values()).map(tank => tank.color);
                const availableColor = PLAYER_COLORS.find(c => !takenColors.includes(c)) || PLAYER_COLORS[humans.length % PLAYER_COLORS.length];
                const t = new Tank(spawn.x, spawn.y, availableColor, false, set); t.warpState = 'IN'; t.warpAnim = 0; 
                if (!(!currentOnlineRoom && humans.length === 0) && !(currentOnlineRoom && isOnlineHost)) showNotification(`${currentOnlineRoom ? t.name : `PLAYER ${humans.length + 1}`} joined`, t.color);
                world.tanks.set(t.id, t); if (!world.myTankId) world.myTankId = t.id; if (cfg.godMode) PU_TYPES.forEach(pu => t.applyPowerUp(pu));
            } 
        } 
    }); 
}

function findSafeSpawn(tc, tr) { 
    let rad = 0; while (rad < 30) { for (let r = -rad; r <= rad; r++) { for (let c = -rad; c <= rad; c++) { let col = Math.max(1, Math.min(cfg.cols-2, tc + c)), row = Math.max(1, Math.min(cfg.rows-2, tr + r)); if (world.map[row]?.[col] === 0) { let tx = col * TILE + TILE / 2, ty = row * TILE + TILE / 2; if (!Array.from(world.tanks.values()).some(t => t.alive && Math.hypot(t.x - tx, t.y - ty) < 80)) return { x: tx, y: ty }; } } } rad++; }
    return { x: TILE * 1.5, y: TILE * 1.5 }; 
}

function spawnPowerUp() { 
    // Online, only the host spawns power-ups and tells everyone else.
    if (currentOnlineRoom && !isOnlineHost) { powerUpTimer = cfg.puFreq * 60; return; } 
    let p, attempts = 0; 
    while (!p && attempts < 100) { attempts++; let r = Math.floor(Math.random() * (cfg.rows-2)) + 1, c = Math.floor(Math.random() * (cfg.cols-2)) + 1; if (world.map[r][c] === 0) { let tx = c * TILE + TILE/2, ty = r * TILE + TILE/2; if (!Array.from(world.tanks.values()).some(t => t.alive && Math.hypot(t.x - tx, t.y - ty) < 40)) p = { x: tx, y: ty }; } } 
    if (p) { 
        const type = PU_TYPES[Math.floor(Math.random() * PU_TYPES.length)];
        const pu = new PowerUp(p.x, p.y, type);
        world.powerUps.push(pu); 
        if (currentOnlineRoom && presenceHandle) {
            presenceHandle.publishTopic('powerup_spawn', { id: pu.id, x: p.x, y: p.y, typeId: type.id });
        }
    }
    const nextInterval = (cfg.puFreq * 0.5) + (Math.random() * cfg.puFreq); powerUpTimer = nextInterval * 60; 
}

function startGame(isO = false) { currentRound = 1; lockMobileOrientation(); setupRound(isO, true); if (cfg.godMode && !isO) applyGodModePowerUps(); }
function nextRound() { currentRound++; setupRound(currentOnlineRoom !== null, false); if (cfg.godMode && !currentOnlineRoom) applyGodModePowerUps(); }

function setupRound(isO = false, isN = false, isR = false) { 
    const humans = Array.from(world.tanks.values()).filter(t => !t.isAI), hStates = humans.map(t => ({ id: t.id, inputSet: t.inputSet, color: t.color, powerUps: (isN || (humans.length > 1 && !cfg.cooperativeMode)) ? new Map() : new Map(t.powerUps), roundPowerUps: new Map(), permPowerUps: isN ? new Map() : new Map(t.permPowerUps), shield: (isN || (humans.length > 1 && !cfg.cooperativeMode)) ? 0 : t.shield, kineticShield: (isN || (humans.length > 1 && !cfg.cooperativeMode)) ? 0 : t.kineticShield, name: t.name, kills: isN ? 0 : t.kills, livesLost: isN ? 0 : t.livesLost }));
    
    world.bullets.clear(); world.particles = []; world.powerUps = []; world.empEffects = [];
    if (!isO) world.tanks.clear(); 
    
    if (isMobile) {
        document.getElementById('mobile-controls').classList.add('active');
    }

    if (!isO) { 
        onlinePeers = {}; currentOnlineRoom = null; world.myTankId = null; world.map = generateMap();
        if (isMobile && hStates.length === 0) {
            hStates.push({ id: generateUUID(), inputSet: 'mobile', color: PLAYER_COLORS[0], powerUps: new Map(), roundPowerUps: new Map(), permPowerUps: new Map(), shield: 0, kineticShield: 0, name: defaultName, kills: 0, livesLost: 0 });
        } else if (didStartByMouseClick && hStates.length === 0) {
            const targetSet = inputSets.find(s => s.type === 'keyboard_mouse');
            hStates.push({ id: generateUUID(), inputSet: targetSet, color: PLAYER_COLORS[0], powerUps: new Map(), roundPowerUps: new Map(), permPowerUps: new Map(), shield: 0, kineticShield: 0, name: defaultName, kills: 0, livesLost: 0 });
            didStartByMouseClick = false;
        }
        hStates.forEach(s => { const sp = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows)); const t = new Tank(sp.x, sp.y, s.color, false, s.inputSet, s.id); t.powerUps = s.powerUps; t.roundPowerUps = s.roundPowerUps; t.permPowerUps = s.permPowerUps; t.shield = s.shield; t.kineticShield = s.kineticShield; t.name = s.name; t.kills = s.kills; t.livesLost = s.livesLost; let armorTier = t.getPUCount(13); t.hp = cfg.hp + (armorTier * cfg.hp); world.tanks.set(t.id, t); if (!world.myTankId) world.myTankId = t.id; });
        const aiC = Math.min(8, 3 + Math.floor((currentRound - 1) / 3)); for (let i = 0; i < aiC; i++) { const sp = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows)); const ai = new Tank(sp.x, sp.y, "#ff2244", true); world.tanks.set(ai.id, ai); }
    } else if (presenceHandle && isOnlineHost) {
        world.tanks.clear(); 
        world.map = generateMap(); 
        if (isMobile && hStates.length === 0) {
            const takenColors = Array.from(world.tanks.values()).map(tank => tank.color);
            const availableColor = PLAYER_COLORS.find(c => !takenColors.includes(c)) || PLAYER_COLORS[0];
            hStates.push({ id: generateUUID(), inputSet: 'mobile', color: availableColor, powerUps: new Map(), roundPowerUps: new Map(), permPowerUps: new Map(), shield: 0, kineticShield: 0, name: defaultName, kills: 0, livesLost: 0 });
        } else if (didStartByMouseClick && hStates.length === 0) {
            const targetSet = inputSets.find(s => s.type === 'keyboard_mouse');
            hStates.push({ id: generateUUID(), inputSet: targetSet, color: PLAYER_COLORS[0], powerUps: new Map(), roundPowerUps: new Map(), permPowerUps: new Map(), shield: 0, kineticShield: 0, name: defaultName, kills: 0, livesLost: 0 });
            didStartByMouseClick = false;
        }
        hStates.forEach(s => { const sp = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows)); const t = new Tank(sp.x, sp.y, s.color, false, s.inputSet, s.id); t.powerUps = s.powerUps; t.roundPowerUps = s.roundPowerUps; t.permPowerUps = s.permPowerUps; t.shield = s.shield; t.kineticShield = s.kineticShield; t.name = s.name; t.kills = s.kills; t.livesLost = s.livesLost; let armorTier = t.getPUCount(13); t.hp = cfg.hp + (armorTier * cfg.hp); world.tanks.set(t.id, t); });
        if (cfg.cooperativeMode) { const pC = Object.keys(onlinePeers).length || 1, aiC = Math.min(8, pC + Math.floor((currentRound - 1) / 3)); for (let i = 0; i < aiC; i++) { const sp = findSafeSpawn(Math.floor(Math.random()*cfg.cols), Math.floor(Math.random()*cfg.rows)); const ai = new Tank(sp.x, sp.y, "#ff2244", true); world.tanks.set(ai.id, ai); } }
        
        const currentPUs = world.powerUps.map(p => ({ id: p.id, x: p.x, y: p.y, typeId: p.type.id }));
        presenceHandle.publishTopic('map_sync', { map: world.map, warpX: world.warpX, warpY: world.warpY, rows: cfg.rows, cols: cfg.cols, hostCfg: cfg, hostPowerUps: currentPUs });
    }
    powerUpTimer = cfg.puFreq * 60; gameStartTime = Date.now(); state = 'PLAYING'; [menu, options, lobby, pauseMenu, gameOver, document.getElementById('host-setup'), document.getElementById('join-setup')].forEach(m => m.classList.add('hidden')); 
}

function createStatParticles(element, color) {
    if (!element) return; const rect = element.getBoundingClientRect(), cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    for(let i=0; i<8; i++) {
        const p = document.createElement('span'); p.className = 'ui-particle'; p.style.left = cx + 'px'; p.style.top = cy + 'px'; p.style.backgroundColor = color;
        const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 20, tx = Math.cos(a) * d, ty = Math.sin(a) * d; document.body.appendChild(p);
        const anim = p.animate([{ transform: 'translate(0, 0) scale(1)', opacity: 1 }, { transform: `translate(${tx}px, ${ty}px) scale(0)`, opacity: 0 }], { duration: 400 + Math.random() * 200, easing: 'cubic-bezier(0, .9, .57, 1)' });
        anim.onfinish = () => p.remove();
    }
}

function renderHUD() {
    const tl = document.getElementById('stats-tl'), tr = document.getElementById('stats-tr'), rt = document.getElementById('stats-row-top'), rb = document.getElementById('stats-row-bottom'), all = [tl, tr, rt, rb]; 
    const humans = Array.from(world.tanks.values()).filter(t => !t.isAI); if (state === 'MENU' || !lobby.classList.contains('hidden') || humans.length <= 1) { all.forEach(c => c.innerHTML = ''); return; }
    const side = (window.innerWidth - canvas.offsetWidth) / 2, useR = side < 170; all.forEach(c => c.innerHTML = '');
    humans.forEach((t, i) => {
        let c; if (!useR) c = (i < 4) ? tl : tr; else c = (humans.length > 4 && i < humans.length / 2) ? rt : rb;
        const kid = `kills-${t.id}`, lid = `lives-${t.id}`, ok = prevStats.get(kid) || 0, ol = prevStats.get(lid) || 0, card = document.createElement('div');
        card.id = `card-${t.id}`; card.className = `tank-card visible ${useR ? 'compact' : ''}`; card.style.color = t.color;
        card.innerHTML = `<div class="tank-card-name">${currentOnlineRoom ? escapeHTML(t.name) : `PLAYER ${i + 1}`}</div><div class="tank-card-stats"><span>KILLS: <span id="${kid}" class="stat-val">${t.kills}</span></span><span>LOST: <span id="${lid}" class="stat-val">${t.livesLost}</span></span></div>`;
        c.appendChild(card); if (t.kills > ok) setTimeout(() => createStatParticles(document.getElementById(kid), t.color), 10); if (t.livesLost > ol) setTimeout(() => createStatParticles(document.getElementById(lid), t.color), 10);
        prevStats.set(kid, t.kills); prevStats.set(lid, t.livesLost);
    });
}

function checkEnd() { 
    if (currentOnlineRoom || state !== 'PLAYING' || Date.now() - gameStartTime < 1000) return; 
    setTimeout(() => { 
        const ts = Array.from(world.tanks.values()), h = ts.filter(t => !t.isAI), ha = h.some(t => t.alive), a = ts.filter(t => t.isAI), aa = a.some(t => t.alive);
        const title = document.getElementById('game-over-title'), nxt = document.getElementById('next-btn'), fct = document.getElementById('fail-continue-btn'), mm = document.getElementById('main-menu-btn');
        if (!ha && h.length > 0) { state = 'GAMEOVER'; title.innerText = "LEVEL FAILED"; document.getElementById('round-stat').innerText = `Round ${currentRound}`; nxt.classList.add('hidden'); fct.classList.remove('hidden'); mm.classList.remove('hidden'); gameOver.classList.remove('hidden'); document.getElementById('mobile-controls').classList.remove('active'); autoSelectPrimaryAction(gameOver); } 
        else if (!aa && a.length > 0) { state = 'GAMEOVER'; title.innerText = "LEVEL COMPLETED"; document.getElementById('round-stat').innerText = `Round ${currentRound} Cleared`; nxt.classList.remove('hidden'); fct.classList.add('hidden'); mm.classList.add('hidden'); gameOver.classList.remove('hidden'); document.getElementById('mobile-controls').classList.remove('active'); autoSelectPrimaryAction(gameOver); } 
    }, 1000); 
}

// World-to-canvas transform. Desktop draws the whole arena into the 800x600 canvas.
// Phones fill the screen instead and follow the local tank(s) at a readable scale,
// scrolling over the arena (clamped to its edges) rather than shrinking it.
const MOBILE_MIN_TILE_PX = 38;
let view = { sx: 1, sy: 1, ox: 0, oy: 0 }, cam = { x: 0, y: 0, ready: false };
function updateView(localTanks) {
    const W = cfg.cols * TILE, H = cfg.rows * TILE;
    if (!isMobile) {
        if (canvas.width !== 800 || canvas.height !== 600) { canvas.width = 800; canvas.height = 600; }
        view = { sx: 800 / W, sy: 600 / H, ox: 0, oy: 0 }; return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2), cw = canvas.clientWidth || window.innerWidth, ch = canvas.clientHeight || window.innerHeight;
    const bw = Math.round(cw * dpr), bh = Math.round(ch * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
    const fit = Math.min(cw / W, ch / H);
    let s = Math.max(fit, MOBILE_MIN_TILE_PX / TILE), tx = W / 2, ty = H / 2;
    const followed = localTanks.filter(t => t.alive).length ? localTanks.filter(t => t.alive) : localTanks;
    if (followed.length > 0 && state !== 'MENU') {
        const xs = followed.map(t => t.x), ys = followed.map(t => t.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
        tx = (minX + maxX) / 2; ty = (minY + maxY) / 2;
        // Couch play on one screen: zoom out (never below the whole-arena fit) to keep everyone in view.
        if (followed.length > 1) s = Math.max(fit, Math.min(s, cw / (maxX - minX + TILE * 6), ch / (maxY - minY + TILE * 6)));
    }
    const vw = cw / s, vh = ch / s;
    const cx = W <= vw ? W / 2 : Math.min(Math.max(tx, vw / 2), W - vw / 2);
    const cy = H <= vh ? H / 2 : Math.min(Math.max(ty, vh / 2), H - vh / 2);
    // Ease toward the target; snap on the first frame and on warps/respawns across the map.
    if (!cam.ready || Math.hypot(cx - cam.x, cy - cam.y) > Math.max(vw, vh) / 2) { cam.x = cx; cam.y = cy; cam.ready = true; }
    else { cam.x = lerp(cam.x, cx, 0.15); cam.y = lerp(cam.y, cy, 0.15); }
    const k = s * dpr;
    view = { sx: k, sy: k, ox: bw / 2 - cam.x * k, oy: bh / 2 - cam.y * k };
}

function loop() { 
    processMenuNavigation(); renderHUD();
    const ts = Array.from(world.tanks.values()), h = ts.filter(t => !t.isAI), lh = h.filter(t => t.inputSet), side = (window.innerWidth - canvas.offsetWidth) / 2;
    const useR = side < 170, hasS = h.length > 1, hasT = hasS && h.length > 4, hasB = hasS && h.length > 0;
    let vha = (useR && hasS && state === 'PLAYING' && !isMobile) ? (hasT ? 2 : 1) * 8 : 0;
    if (vha > 0 && hasB && !hasT) document.body.classList.add('top-align'); else if (state !== 'PAUSED') document.body.classList.remove('top-align');
    if (state === 'PLAYING' && !isMobile) canvas.style.height = `min(73.5vw, ${98 - vha}vh)`;
    updateView(lh);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.setTransform(view.sx, 0, 0, view.sy, view.ox, view.oy);

    ctx.fillStyle = "rgba(0, 255, 0, 0.08)"; 
    if (world.map?.length > 0) { 
        if (world.warpX) for (let r = 0; r < cfg.rows; r++) if (world.map[r]?.[0] === 0 && world.map[r]?.[cfg.cols-1] === 0) { ctx.fillRect(0, r * TILE, 5, TILE); ctx.fillRect((cfg.cols * TILE) - 5, r * TILE, 5, TILE); }
        if (world.warpY) for (let c = 0; c < cfg.cols; c++) if (world.map[0]?.[c] === 0 && world.map[cfg.rows-1]?.[c] === 0) { ctx.fillRect(c * TILE, 0, TILE, 5); ctx.fillRect(c * TILE, (cfg.rows * TILE) - 5, TILE, 5); }
        ctx.fillStyle = "#202020"; for(let r=0; r<cfg.rows; r++) for(let cc=0; cc<cfg.cols; cc++) if(world.map[r]?.[cc] === 1) { ctx.beginPath(); ctx.roundRect(cc*TILE+1, r*TILE+1, TILE-2, TILE-2, 4); ctx.fill(); } 
    } 
    if (state === 'PLAYING' && lh.length === 0 && !isMobile) { ctx.save(); ctx.scale((cfg.cols * TILE) / 800, (cfg.rows * TILE) / 600); ctx.fillStyle = "rgba(0, 255, 0, 0.7)"; ctx.font = "bold 24px Segoe UI"; ctx.textAlign = "center"; ctx.fillText("PRESS ANY KEY / CLICK TO JOIN GAME", 400, 300); ctx.restore(); }
    if (state === 'PLAYING') { 
        checkNewPlayers(); powerUpTimer--; if (powerUpTimer <= 0) spawnPowerUp(); 
        if (currentOnlineRoom && presenceHandle) { 
            let local = []; world.tanks.forEach(t => { if (t.inputSet || (isOnlineHost && t.isAI)) local.push({ id: t.id, x: t.x, y: t.y, bodyAngle: t.bodyAngle, cannonAngle: t.cannonAngle, color: t.color, hp: t.hp, alive: t.alive, name: t.name, isAI: t.isAI, kills: t.kills, livesLost: t.livesLost, shield: t.shield, kineticShield: t.kineticShield, empStunTimer: t.empStunTimer, serializedPUs: Array.from(t.powerUps.entries()), serializedRoundPUs: Array.from(t.roundPowerUps.entries()), serializedPermPUs: Array.from(t.permPowerUps.entries()) }); });
            if (local.length > 0) presenceHandle.publishPresence({ tanks: local });
            Object.entries(onlinePeers).forEach(([peerId, data]) => { if (peerId === myPeerId()) return; if (data.tanks) data.tanks.forEach(td => { let t = world.tanks.get(td.id); if (!t) { t = new Tank(td.x, td.y, td.color, td.isAI, null, td.id); if (!t.isAI) { t.warpState = 'IN'; t.warpAnim = 0; if (hasInitialPresence) showNotification(`${td.name || "A pilot"} joined`, t.color); } if (!t.isAI && cfg.defaultPowerUp) { t.applyPowerUp(cfg.defaultPowerUp); } world.tanks.set(td.id, t); } if (Math.hypot(t.x - td.x, t.y - td.y) > TILE * 2) { t.x = t.targetX = td.x; t.y = t.targetY = td.y; } else { t.targetX = td.x; t.targetY = td.y; } t.bodyAngle = td.bodyAngle; t.cannonAngle = td.cannonAngle; t.hp = td.hp; t.alive = td.alive; t.name = td.name || "Tank"; t.kills = td.kills || 0; t.livesLost = td.livesLost || 0; t.shield = td.shield || 0; t.kineticShield = td.kineticShield || 0; t.empStunTimer = td.empStunTimer || 0; if (td.serializedPUs) t.powerUps = new Map(td.serializedPUs); if (td.serializedRoundPUs) t.roundPowerUps = new Map(td.serializedRoundPUs); if (td.serializedPermPUs) t.permPowerUps = new Map(td.serializedPermPUs); }); });
            world.tanks.forEach((t, id) => { if (!t.inputSet && !(isOnlineHost && t.isAI) && t.warpState !== 'OUT') { let ex = false; Object.entries(onlinePeers).forEach(([pid, d]) => { if (pid !== myPeerId() && d.tanks?.some(td => td.id === id)) ex = true; }); if (!ex) { if (!t.isAI) { showNotification(`${t.name} left`, t.color); t.warpState = 'OUT'; t.warpAnim = 1.0; } else { createExplosion(t.x, t.y, t.color, true, 0.5); world.tanks.delete(id); } } } }); 
        } 
        const rm = []; world.tanks.forEach(t => { if (t.inputSet || t.isAI || (!t.isAI && !t.inputSet && t.id !== world.myTankId) || t.warpState !== 'NONE') t.update(); if (t.shouldDelete) rm.push(t.id); }); 
        rm.forEach(id => world.tanks.delete(id)); resolveTankCollisions(); world.bullets.forEach((b, id) => { b.update(); if (b.life <= 0) world.bullets.delete(id); }); 
    } 
    world.powerUps.forEach(pu => pu.draw());
    for (let i = world.particles.length - 1; i >= 0; i--) { 
        const p = world.particles[i]; if (p.life <= 0 || !p.decay) { world.particles.splice(i, 1); continue; }
        p.x += p.vx; p.y += p.vy; p.life -= p.decay; if (p.life > 0.01) { ctx.save(); if (p.isFire) { ctx.fillStyle = `rgba(255, ${Math.floor(p.life * 150)}, ${Math.floor(p.life * 50)}, ${p.life * 0.8})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2); ctx.fill(); } else { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, Math.PI*2); ctx.fill(); } ctx.restore(); }
    } 
    
    for (let i = world.empEffects.length - 1; i >= 0; i--) {
        let eff = world.empEffects[i];
        eff.r += 12;
        ctx.save();
        ctx.strokeStyle = `rgba(148, 0, 211, ${1 - (eff.r / eff.maxR)})`;
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(eff.x, eff.y, eff.r, 0, Math.PI * 2); ctx.stroke();
        
        ctx.strokeStyle = `rgba(186, 85, 211, ${1 - (eff.r / eff.maxR)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.2) {
            let rx = eff.x + Math.cos(a) * eff.r;
            let ry = eff.y + Math.sin(a) * eff.r;
            let ox = (Math.random() - 0.5) * 20;
            let oy = (Math.random() - 0.5) * 20;
            if (a === 0) ctx.moveTo(rx + ox, ry + oy); else ctx.lineTo(rx + ox, ry + oy);
        }
        ctx.closePath(); ctx.stroke();
        ctx.restore();
        
        if (eff.r >= eff.maxR) world.empEffects.splice(i, 1);
    }

    ctx.globalAlpha = 1.0; world.bullets.forEach(b => { if (b.life > 0) b.draw(); }); 
    world.tanks.forEach(t => { if(t.alive && t.warpAnim > 0) t.draw(); }); 
    ctx.restore();
    requestAnimationFrame(loop); 
}

// Virtual Touch Joystick Implementation Engine Hook Routine
function registerJoystick(zoneId, thumbId, isRightStick) {
    const zone = document.getElementById(zoneId);
    const thumb = document.getElementById(thumbId);
    let activeTouchId = null;
    
    zone.addEventListener('touchstart', (e) => {
        if (activeTouchId !== null) return;
        const touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        handleTouch(touch);

        if (isRightStick) {
            const myTank = world.tanks.get(world.myTankId);
            if (myTank && myTank.alive) {
                if (Math.abs(mobileInput.rx) > 0 || Math.abs(mobileInput.ry) > 0) {
                    myTank.cannonAngle = Math.atan2(mobileInput.ry, mobileInput.rx);
                    if (mobileInput.fire) myTank.shoot();
                }
            }
        }
    });

    zone.addEventListener('touchmove', (e) => {
        for (let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId) {
                handleTouch(e.changedTouches[i]);
                break;
            }
        }
    });

    const stopTouch = (e) => {
        for (let i=0; i<e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId) {
                activeTouchId = null;
                thumb.style.transform = 'translate(0px, 0px)';
                if (isRightStick) {
                    mobileInput.rx = 0; mobileInput.ry = 0;
                    mobileInput.fire = false;
                } else {
                    mobileInput.ix = 0; mobileInput.iy = 0;
                }
                break;
            }
        }
    };

    zone.addEventListener('touchend', stopTouch);
    zone.addEventListener('touchcancel', stopTouch);
    // A touch can be lost without touchend when the page is hidden; let the stick go.
    const release = () => { if (activeTouchId !== null) stopTouch({ changedTouches: [{ identifier: activeTouchId }] }); };
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', () => { if (document.hidden) release(); });

    function handleTouch(t) {
        const rect = zone.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        let dx = t.clientX - cx;
        let dy = t.clientY - cy;
        const dist = Math.hypot(dx, dy);
        const maxDist = 50;

        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        thumb.style.transform = `translate(${dx}px, ${dy}px)`;
        
        if (isRightStick) {
            mobileInput.rx = dx / maxDist;
            mobileInput.ry = dy / maxDist;
            
            if (dist >= maxDist * 0.75) {
                mobileInput.fire = true;
            } else {
                mobileInput.fire = false;
            }
        } else {
            mobileInput.ix = dx / maxDist;
            mobileInput.iy = dy / maxDist;
        }
    }
}

if (isMobile) {
    registerJoystick('left-stick-zone', 'left-stick-thumb', false);
    registerJoystick('right-stick-zone', 'right-stick-thumb', true);
}

Object.assign(window, {
    nextRound,
    startGame
});

window.TankWarsMenu?.configure({
    getState: () => state,
    setState: value => { state = value; },
    getConfig: () => cfg,
    getKeysDown: () => keysDown,
    isMobile: () => isMobile,
    getCurrentOnlineRoom: () => currentOnlineRoom,
    getRooms: callback => {
        if (!net) { callback({ rooms: [], error: new Error('offline') }); return () => {}; }
        // Poll only while the lobby is on screen; showLobby() subscribes again.
        const stop = net.watchRooms(result => { if (lobby.classList.contains('hidden')) stop(); else callback(result); });
        return stop;
    },
    hostGame: async ({ name }) => { pendingHostTitle = `${name}'s Game`; },
    maxRoomCapacity: MAX_ROOM_CAPACITY,
    getPowerUps: () => PU_TYPES,
    getAiPersonalities: () => AI_PERSONALITIES,
    getBoardSizes: () => BOARD_SIZES,
    getRandomName,
    generateUUID,
    setStartedByMouse: value => { didStartByMouseClick = value; },
    joinGame,
    startGame,
    applyGodModePowerUps,
    resetRound: () => setupRound(false, false, true),
    showNotification
});

window.addEventListener("gamepadconnected", updateMenuVisuals); loop();
