import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { playClip } from '../audio/player';
import { useStore } from '../state/store';
import './AnnouncerCaption.css';

/** Captions stay up at least this long so they can be read, even over a short chime. */
const MIN_SHOW_MS = 3500;
const EXIT_MS = 220;

/** Survives remounts (e.g. back from settings) so an old announcement never replays. */
let lastPlayed = 0;

/** Plays each announcement and slides its caption down under the header while it plays. */
export function AnnouncerCaption() {
  const { state } = useStore();
  const [caption, setCaption] = useState<{ text: string; leaving: boolean } | null>(null);
  const seq = state.announcement?.seq;

  useEffect(() => {
    const a = state.announcement;
    if (!a || a.seq <= lastPlayed) return;
    lastPlayed = a.seq;
    let hide: number | undefined;
    let clear: number | undefined;
    playClip({
      url: a.msg.url,
      onStart: (durationMs) => {
        window.clearTimeout(hide);
        window.clearTimeout(clear);
        setCaption({ text: a.msg.caption, leaving: false });
        hide = window.setTimeout(() => {
          setCaption((c) => (c ? { ...c, leaving: true } : c));
          clear = window.setTimeout(() => setCaption(null), EXIT_MS);
        }, Math.max(durationMs, MIN_SHOW_MS));
      },
    });
    // Keyed on seq so each announcement plays exactly once; the player owns its own queue.
  }, [seq]);

  if (!caption) return null;
  return (
    <div className={`announcer${caption.leaving ? ' is-leaving' : ''}`} role="status" aria-live="assertive">
      <Volume2 size={18} strokeWidth={2} aria-hidden="true" />
      <span>{caption.text}</span>
    </div>
  );
}
