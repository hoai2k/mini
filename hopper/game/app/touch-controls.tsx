'use client';
import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import type { InputManager } from '@/src/game/input';
import type { Edition } from '@/src/game/game-engine';

/**
 * On-screen controls for phones and tablets, shown only to a coarse pointer
 * (see `.touch-controls` in globals.css). A floating stick on the left half
 * moves Hopper; the buttons on the right press the keyboard keys they stand
 * for, so the engines see touch exactly as they see the keyboard. In 3D,
 * dragging anywhere else on the right half turns the camera.
 */
type Key = { code: string; pad: string; label: string; className: string };
const keys2d: Key[] = [
  { code: 'KeyK', pad: 'RT', label: 'Eye lasers', className: 'trigger rt' },
  { code: 'KeyJ', pad: 'X', label: 'Spin kick', className: 'pad x kick' },
  { code: 'Space', pad: 'A', label: 'Jump', className: 'pad a jump' },
];
const keys3d: Key[] = [
  { code: 'KeyQ', pad: 'LT', label: 'Lock-on', className: 'trigger lt' },
  { code: 'KeyK', pad: 'RT', label: 'Eye lasers', className: 'trigger rt' },
  { code: 'ShiftLeft', pad: 'RB', label: 'Sprint', className: 'trigger rb' },
  { code: 'KeyR', pad: 'LS', label: 'Dash', className: 'trigger ls' },
  { code: 'KeyF', pad: 'Y', label: 'Dive stomp', className: 'pad y dive' },
  { code: 'KeyJ', pad: 'X', label: 'Spin kick', className: 'pad x kick' },
  { code: 'KeyE', pad: 'LB', label: 'Spring', className: 'trigger lb' },
  { code: 'Space', pad: 'A', label: 'Jump', className: 'pad a jump' },
];
const STICK_RADIUS = 52;

function TouchKey({
  input,
  k,
}: {
  input: RefObject<InputManager | null>;
  k: Key;
}) {
  const held = useRef(false);
  const set = (down: boolean) => {
    if (held.current === down) return;
    held.current = down;
    input.current?.touchKey(k.code, down);
  };
  return (
    <button
      type="button"
      tabIndex={-1}
      className={`touch-key ${k.className}`}
      aria-label={k.label}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <b>{k.pad}</b>
      <small>{k.label}</small>
    </button>
  );
}

export function TouchControls({
  input,
  edition,
}: {
  input: RefObject<InputManager | null>;
  edition: Edition;
}) {
  const stick = useRef<{ id: number; x: number; y: number } | null>(null),
    look = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{
    x: number;
    y: number;
    dx: number;
    dy: number;
  } | null>(null);
  const flat = edition === '2d';
  // Leaving play (pause, a menu, the next episode) lets go of everything, so
  // nothing stays held behind the menu.
  useEffect(
    () => () => {
      const i = input.current;
      i?.touchStick(0, 0);
      for (const k of [...keys2d, ...keys3d]) i?.touchKey(k.code, false);
    },
    [input],
  );
  const moveStick = (e: PointerEvent<HTMLDivElement>) => {
    const s = stick.current;
    if (!s || s.id !== e.pointerId) return;
    let dx = e.clientX - s.x,
      dy = e.clientY - s.y;
    const length = Math.hypot(dx, dy);
    if (length > STICK_RADIUS) {
      dx = (dx / length) * STICK_RADIUS;
      dy = (dy / length) * STICK_RADIUS;
    }
    const dead = (v: number) =>
      Math.abs(v) < 0.18 ? 0 : Math.sign(v) * ((Math.abs(v) - 0.18) / 0.82);
    input.current?.touchStick(
      dead(dx / STICK_RADIUS),
      flat ? 0 : dead(dy / STICK_RADIUS),
    );
    setKnob({ x: s.x, y: s.y, dx, dy });
  };
  const endStick = (e: PointerEvent<HTMLDivElement>) => {
    if (stick.current?.id !== e.pointerId) return;
    stick.current = null;
    input.current?.touchStick(0, 0);
    setKnob(null);
  };
  const endLook = (e: PointerEvent<HTMLDivElement>) => {
    if (look.current?.id === e.pointerId) look.current = null;
  };
  return (
    <div className={`touch-controls ${flat ? 'touch-2d' : 'touch-3d'}`}>
      <div
        className="touch-move"
        onPointerDown={(e) => {
          if (stick.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          stick.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
        }}
        onPointerMove={moveStick}
        onPointerUp={endStick}
        onPointerCancel={endStick}
        onLostPointerCapture={endStick}
      >
        {knob ? (
          <span
            className="touch-stick"
            style={{ left: knob.x, top: knob.y }}
            aria-hidden="true"
          >
            <i style={{ translate: `${knob.dx}px ${knob.dy}px` }} />
          </span>
        ) : (
          <span className="touch-stick-hint" aria-hidden="true">
            {flat ? '◀ MOVE ▶' : 'MOVE'}
          </span>
        )}
      </div>
      {!flat && (
        <div
          className="touch-look"
          onPointerDown={(e) => {
            if (look.current) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
          }}
          onPointerMove={(e) => {
            const l = look.current;
            if (!l || l.id !== e.pointerId) return;
            input.current?.touchLook((e.clientX - l.x) * 1.6, (e.clientY - l.y) * 1.6);
            l.x = e.clientX;
            l.y = e.clientY;
          }}
          onPointerUp={endLook}
          onPointerCancel={endLook}
          onLostPointerCapture={endLook}
        />
      )}
      <div className="touch-buttons">
        {(flat ? keys2d : keys3d).map((k) => (
          <TouchKey input={input} k={k} key={k.code} />
        ))}
      </div>
    </div>
  );
}
