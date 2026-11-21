import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { useStore } from '../state/store';
import './AnnouncerCaption.css';

const SHOW_MS = 6000;
const EXIT_MS = 220;
const BUZZ_MS = 60;

/** Survives remounts (e.g. back from settings) so an old nudge never reappears. */
let lastShown = 0;

/**
 * "Time to go" nudges. Silent on the phone: a caption slides down under the header (plus a short
 * buzz where supported), only for your best pick or things you've saved. Tap it to open that ticket.
 */
export function AnnouncerCaption({ display = false }: { display?: boolean }) {
  const { state, dispatch } = useStore();
  const [nudge, setNudge] = useState<{ id: string; text: string; leaving: boolean } | null>(null);
  const seq = state.announcement?.seq;
  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const a = state.announcement;
    if (!a || a.seq <= lastShown) return;
    lastShown = a.seq;
    const row = state.board?.rows.find((r) => r.id === a.msg.item_id);
    const cares = row?.pick === 'best' || state.liked.includes(a.msg.item_id);
    if (!display && !cares) return;

    if (!display) navigator.vibrate?.(BUZZ_MS);
    clearTimers();
    setNudge({ id: a.msg.item_id, text: a.msg.caption, leaving: false });
    timers.current.push(
      window.setTimeout(() => setNudge((n) => (n ? { ...n, leaving: true } : n)), SHOW_MS),
      window.setTimeout(() => setNudge(null), SHOW_MS + EXIT_MS),
    );
    // Keyed on seq so each nudge shows exactly once.
  }, [seq]);

  if (!nudge) return null;
  return (
    <button
      type="button"
      className={`announcer${nudge.leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        clearTimers();
        setNudge(null);
        if (display) return;
        dispatch({ type: 'open_ticket', ticket: { id: nudge.id, x: r.left + r.width / 2, y: r.top + r.height / 2 } });
      }}
    >
      <Clock size={18} strokeWidth={2} aria-hidden="true" />
      <span>{nudge.text}</span>
    </button>
  );
}
