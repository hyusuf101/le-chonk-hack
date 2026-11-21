import { useCallback, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

const DECIDE_PX = 8;
const OPEN_X = -116; // resting offset with the action showing
const REVEAL_AT = -52; // release past this: stay open
const COMMIT_AT = -170; // release past this: do it straight away
const LONG_PRESS_MS = 480;

/**
 * Horizontal swipe (or long-press) that reveals an action under a row, iOS-mail style.
 * Vertical drags are left to the page so the list still scrolls naturally.
 */
export function useSwipeToReveal(onCommit: () => void) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef({ x: 0, y: 0, base: 0, axis: '' as '' | 'x' | 'y', id: -1, suppressClick: false });
  const press = useRef<number | undefined>(undefined);

  const close = useCallback(() => setDx(0), []);

  const commit = useCallback(() => {
    setDx(-480);
    window.setTimeout(onCommit, 160);
  }, [onCommit]);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    g.current = { x: e.clientX, y: e.clientY, base: dx, axis: '', id: e.pointerId, suppressClick: false };
    window.clearTimeout(press.current);
    press.current = window.setTimeout(() => {
      g.current.suppressClick = true;
      g.current.axis = 'y'; // the long-press owns this gesture now
      setDx(OPEN_X);
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const s = g.current;
    if (e.pointerId !== s.id) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.axis) {
      if (Math.abs(mx) < DECIDE_PX && Math.abs(my) < DECIDE_PX) return;
      window.clearTimeout(press.current);
      s.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
      if (s.axis === 'x') {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // The pointer is already gone; the drag still works without capture.
        }
        setDragging(true);
      }
    }
    if (s.axis !== 'x') return;
    const raw = Math.min(0, s.base + mx);
    // A little resistance past the commit point
    setDx(raw < COMMIT_AT ? COMMIT_AT + (raw - COMMIT_AT) * 0.4 : raw);
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLElement>) => {
    const s = g.current;
    window.clearTimeout(press.current);
    if (e.pointerId !== s.id || s.axis !== 'x') return;
    s.suppressClick = true;
    setDragging(false);
    if (dx <= COMMIT_AT) commit();
    else setDx(dx <= REVEAL_AT ? OPEN_X : 0);
  };

  /** Wrap the row's click: swallow the click that ends a swipe, and a tap on an open row closes it. */
  const guardClick = (open: (e: MouseEvent<HTMLElement>) => void) => (e: MouseEvent<HTMLElement>) => {
    if (g.current.suppressClick) {
      g.current.suppressClick = false;
      return;
    }
    if (dx !== 0) close();
    else open(e);
  };

  return {
    dx,
    dragging,
    revealed: dx !== 0,
    commit,
    close,
    guardClick,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
