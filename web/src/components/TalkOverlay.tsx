import type { TalkPhase } from '../state/useTalk';
import './TalkOverlay.css';

interface Props {
  phase: TalkPhase;
  transcript: string;
  onStop: () => void;
}

/** While talking to the board: the board dims and what you're saying shows large over it. */
export function TalkOverlay({ phase, transcript, onStop }: Props) {
  if (phase === 'idle') return null;
  return (
    <button
      type="button"
      className={`talk-overlay talk-overlay--${phase}`}
      onClick={phase === 'listening' ? onStop : undefined}
      aria-label={phase === 'listening' ? 'Stop and send' : 'Working on it'}
    >
      <span className="talk-overlay-label">{phase === 'listening' ? 'Listening' : 'Re-sorting your board'}</span>
      <span className={`talk-overlay-text${transcript ? '' : ' is-hint'}`} aria-live="polite">
        {transcript ? `“${transcript}”` : 'Try “cheaper, nothing outdoors”'}
      </span>
    </button>
  );
}
