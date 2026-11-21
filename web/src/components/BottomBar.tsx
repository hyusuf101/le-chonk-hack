import { Mic } from 'lucide-react';
import type { TalkPhase } from '../state/useTalk';
import './BottomBar.css';

const TALK_LABEL: Record<TalkPhase, string> = {
  idle: 'Tap to talk',
  listening: 'Tap when done',
  thinking: 'Got it…',
};

interface Props {
  phase: TalkPhase;
  onTalk: () => void;
}

export function BottomBar({ phase, onTalk }: Props) {
  return (
    <div className="bottombar">
      <button
        className={`bottombar-talk bottombar-talk--${phase}`}
        type="button"
        onClick={onTalk}
        disabled={phase === 'thinking'}
        aria-pressed={phase === 'listening'}
      >
        <Mic size={18} strokeWidth={2} aria-hidden="true" />
        {TALK_LABEL[phase]}
      </button>
    </div>
  );
}
