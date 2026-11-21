import { useCallback, useEffect, useRef, useState } from 'react';
import type { TalkPurpose } from '../contract';
import { TALK_MAX_MS } from '../audio/config';
import { unlockAudio } from '../audio/context';
import { startMic, type MicSession } from '../audio/mic';
import { isMock } from '../net/socket';
import { useStore } from './store';

export type TalkPhase = 'idle' | 'listening' | 'thinking';

const THINKING_TIMEOUT_MS = 8_000;

/**
 * Tap-to-talk: tap to start, tap again (or 15 s) to stop. Streams mic audio between talk_start and
 * talk_end, then waits in "thinking" until the server answers with chips or a note.
 * In mock mode a missing mic doesn't matter: the mock fakes the speech either way.
 */
export function useTalk(purpose: TalkPurpose, onMicUnavailable: () => void) {
  const { state, dispatch, send, sendAudio } = useStore();
  const [phase, setPhase] = useState<TalkPhase>('idle');
  const mic = useRef<MicSession | null>(null);
  const live = useRef(false); // talk_start sent, talk_end not yet
  const starting = useRef(false);
  const cancelled = useRef(false);
  const cap = useRef<number | undefined>(undefined);

  // The server answered: done thinking.
  useEffect(() => {
    setPhase((p) => (p === 'thinking' ? 'idle' : p));
  }, [state.chipsSeq, state.noteSeq]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    const t = window.setTimeout(() => setPhase('idle'), THINKING_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const stop = useCallback(() => {
    window.clearTimeout(cap.current);
    if (starting.current) {
      // Tapped again while the permission prompt was still up: abandon quietly.
      cancelled.current = true;
      setPhase('idle');
      return;
    }
    mic.current?.stop();
    mic.current = null;
    if (!live.current) return;
    live.current = false;
    send({ type: 'talk_end' });
    setPhase('thinking');
  }, [send]);

  const start = useCallback(async () => {
    unlockAudio();
    dispatch({ type: 'clear_transcript' });
    setPhase('listening');
    starting.current = true;
    cancelled.current = false;

    let session: MicSession | null = null;
    try {
      session = await startMic((frame) => {
        if (live.current) sendAudio(frame);
      });
    } catch {
      if (!isMock) {
        starting.current = false;
        setPhase('idle');
        onMicUnavailable();
        return;
      }
    }
    starting.current = false;
    if (cancelled.current) {
      session?.stop();
      return;
    }
    mic.current = session;
    live.current = true;
    send({ type: 'talk_start', purpose });
    cap.current = window.setTimeout(stop, TALK_MAX_MS);
  }, [dispatch, send, sendAudio, purpose, onMicUnavailable, stop]);

  // Leaving the screen mid-talk closes the session cleanly.
  useEffect(
    () => () => {
      window.clearTimeout(cap.current);
      mic.current?.stop();
      if (live.current) send({ type: 'talk_end' });
      live.current = false;
    },
    [send],
  );

  const toggle = useCallback(() => {
    if (phase === 'listening') stop();
    else if (phase === 'idle') void start();
  }, [phase, start, stop]);

  return { phase, toggle, stop };
}
