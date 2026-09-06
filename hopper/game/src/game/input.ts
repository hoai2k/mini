export interface InputFrame {
  moveX: number;
  moveY: number;
  jumpHeld: boolean;
  jumpPressed: boolean;
  kickPressed: boolean;
  shootHeld: boolean;
  pausePressed: boolean;
  instructionsPressed: boolean;
  confirmPressed: boolean;
  backPressed: boolean;
  anyPressed: boolean;
  menuX: number;
  menuY: number;
  connected: boolean;
  active: 'gamepad' | 'keyboard';
  disconnected: boolean;
}

/** Poll once per animation frame, with dt in seconds. Call resetEdges when changing screens. */
export class InputManager {
  private keys = new Set<string>();
  private newKeys = new Set<string>();
  private blockedKeys = new Set<string>();
  private previousButtons = new Map<number, boolean[]>();
  private blockedButtons = new Map<number, Set<number>>();
  private mouseHeld = false;
  private mousePressed = false;
  private mouseBlocked = false;
  private wasConnected = false;
  private activePad: Gamepad | null = null;
  private modality: 'gamepad' | 'keyboard' = 'keyboard';
  private menuDir = [0, 0];
  private menuTime = [0, 0];
  private canvas?: HTMLElement;
  private readonly preventKeys = new Set([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Space',
  ]);
  private readonly gameKeys = new Set([
    'KeyA',
    'KeyD',
    'KeyW',
    'KeyS',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Space',
    'KeyJ',
    'KeyK',
    'Escape',
    'KeyI',
    'Enter',
    'Backspace',
  ]);
  private onKeyDown = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLElement &&
      (event.target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName))
    )
      return;
    if (!this.gameKeys.has(event.code)) return;
    if (this.preventKeys.has(event.code)) event.preventDefault();
    if (!this.keys.has(event.code) && !event.repeat)
      this.newKeys.add(event.code);
    this.keys.add(event.code);
    this.modality = 'keyboard';
  };
  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    this.blockedKeys.delete(event.code);
  };
  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.mouseHeld = true;
    this.mousePressed = true;
    this.modality = 'keyboard';
  };
  private onPointerUp = () => {
    this.mouseHeld = false;
    this.mouseBlocked = false;
  };
  private onBlur = () => {
    this.keys.clear();
    this.newKeys.clear();
    this.blockedKeys.clear();
    this.mouseHeld = false;
    this.mousePressed = false;
    this.mouseBlocked = false;
    this.resetEdges();
  };

  constructor(canvas?: HTMLElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('pointerup', this.onPointerUp);
    canvas?.addEventListener('pointerdown', this.onPointerDown);
  }

  private axis(value: number): number {
    return Math.abs(value) <= 0.18
      ? 0
      : Math.sign(value) * Math.min(1, (Math.abs(value) - 0.18) / 0.82);
  }

  private menuPulse(value: number, axis: number, dt: number): number {
    const direction = Math.abs(value) > 0.5 ? Math.sign(value) : 0;
    if (direction !== this.menuDir[axis]) {
      this.menuDir[axis] = direction;
      this.menuTime[axis] = 0.36;
      return direction;
    }
    if (!direction) return 0;
    this.menuTime[axis] -= dt;
    if (this.menuTime[axis] <= 0) {
      this.menuTime[axis] = 0.12;
      return direction;
    }
    return 0;
  }

  update(dt: number): InputFrame {
    dt = Math.min(0.1, Math.max(0, Number.isFinite(dt) ? dt : 0));
    const pads =
      typeof navigator.getGamepads === 'function'
        ? Array.from(navigator.getGamepads()).filter(
            (p): p is Gamepad => !!p && p.connected,
          )
        : [];
    const connected = pads.length > 0;
    const disconnected = this.wasConnected && !connected;
    this.wasConnected = connected;
    const live = new Set(pads.map((p) => p.index));
    for (const index of this.previousButtons.keys())
      if (!live.has(index)) {
        this.previousButtons.delete(index);
        this.blockedButtons.delete(index);
      }
    let padX = 0,
      padY = 0;
    let padJump = false,
      padJumpEdge = false,
      padKick = false,
      padShoot = false;
    let padPause = false,
      padInstructions = false,
      padConfirm = false,
      padBack = false,
      padAny = false;
    let selected =
      pads.find((p) => p.index === this.activePad?.index) || pads[0];
    // Pick the controller with fresh activity, then read actions from that single controller.
    let freshlyActive: Gamepad | undefined;
    for (const pad of pads) {
      const previous = this.previousButtons.get(pad.index) || [];
      const activity = pad.buttons.some(
        (button, i) =>
          (button.pressed || button.value > (i === 7 ? 0.15 : 0.5)) &&
          !previous[i],
      );
      if (activity) freshlyActive = pad;
      if (Math.abs(pad.axes[0] || 0) > 0.3 || Math.abs(pad.axes[1] || 0) > 0.3)
        selected = pad;
    }
    selected = freshlyActive || selected;
    for (const pad of pads) {
      const previous = this.previousButtons.get(pad.index) || [];
      const blocked = this.blockedButtons.get(pad.index) || new Set<number>();
      const buttons = pad.buttons.map(
        (button, i) => button.pressed || button.value > (i === 7 ? 0.15 : 0.5),
      );
      buttons.forEach((pressed, i) => {
        if (!pressed) blocked.delete(i);
      });
      this.blockedButtons.set(pad.index, blocked);
      const held = (i: number) => !!buttons[i] && !blocked.has(i);
      const edge = (i: number) => held(i) && !previous[i];
      padAny ||= buttons.some((_, i) => edge(i));
      if (pad === selected) {
        padX = this.axis(pad.axes[0] || 0);
        padY = this.axis(pad.axes[1] || 0);
        if (held(14) || held(15)) padX = Number(held(15)) - Number(held(14));
        if (held(12) || held(13)) padY = Number(held(13)) - Number(held(12));
        padJump = held(0);
        padJumpEdge = edge(0);
        padKick = edge(2);
        padShoot = held(7);
        padPause = edge(9);
        padInstructions = edge(8);
        padConfirm = edge(0);
        padBack = edge(1);
        if (padAny || Math.abs(padX) > 0.05 || Math.abs(padY) > 0.05)
          this.modality = 'gamepad';
      }
      this.previousButtons.set(pad.index, buttons);
    }
    this.activePad = selected || null;
    const held = (...codes: string[]) =>
      codes.some((code) => this.keys.has(code) && !this.blockedKeys.has(code));
    const edge = (...codes: string[]) =>
      codes.some(
        (code) => this.newKeys.has(code) && !this.blockedKeys.has(code),
      );
    const keyboardX =
      Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft'));
    const keyboardY =
      Number(held('KeyS', 'ArrowDown')) - Number(held('KeyW', 'ArrowUp'));
    const moveX = keyboardX || padX,
      moveY = keyboardY || padY;
    const frame: InputFrame = {
      moveX,
      moveY,
      jumpHeld: held('Space') || padJump,
      jumpPressed: edge('Space') || padJumpEdge,
      kickPressed: edge('KeyJ') || padKick,
      shootHeld:
        held('KeyK') ||
        edge('KeyK') ||
        padShoot ||
        ((this.mouseHeld || this.mousePressed) && !this.mouseBlocked),
      pausePressed: edge('Escape') || padPause,
      instructionsPressed: edge('KeyI') || padInstructions,
      confirmPressed: edge('Enter', 'Space') || padConfirm,
      backPressed: edge('Escape', 'Backspace') || padBack,
      anyPressed:
        [...this.newKeys].some((key) => !this.blockedKeys.has(key)) ||
        padAny ||
        (this.mousePressed && !this.mouseBlocked),
      menuX: this.menuPulse(moveX, 0, dt),
      menuY: this.menuPulse(moveY, 1, dt),
      connected,
      disconnected,
      active: this.modality,
    };
    this.newKeys.clear();
    this.mousePressed = false;
    return frame;
  }

  /** Clear edges AND suppress currently held actions until released, including A after starting. */
  resetEdges(): void {
    this.newKeys.clear();
    this.mousePressed = false;
    this.blockedKeys = new Set(this.keys);
    this.mouseBlocked = this.mouseHeld;
    const pads =
      typeof navigator.getGamepads === 'function'
        ? Array.from(navigator.getGamepads())
        : [];
    for (const pad of pads) {
      if (!pad) continue;
      const buttons = pad.buttons.map(
        (button, i) => button.pressed || button.value > (i === 7 ? 0.15 : 0.5),
      );
      this.previousButtons.set(pad.index, buttons);
      this.blockedButtons.set(
        pad.index,
        new Set(buttons.flatMap((pressed, i) => (pressed ? [i] : []))),
      );
    }
    this.menuDir = [0, 0];
    this.menuTime = [0.36, 0.36];
  }

  /** Optional Xbox vibration. Missing/blocked haptics never affect gameplay. */
  vibrate(strength = 0.4, durationMs = 90): void {
    const actuator = (
      this.activePad as
        | (Gamepad & {
            vibrationActuator?: {
              playEffect(type: string, params: object): Promise<unknown>;
            };
          })
        | null
    )?.vibrationActuator;
    if (!actuator) return;
    const magnitude = Math.min(1, Math.max(0, strength));
    try {
      void actuator
        .playEffect('dual-rumble', {
          startDelay: 0,
          duration: Math.min(500, durationMs),
          weakMagnitude: magnitude,
          strongMagnitude: magnitude * 0.65,
        })
        .catch(() => {});
    } catch {
      /* unsupported */
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.canvas?.removeEventListener('pointerdown', this.onPointerDown);
  }
}
