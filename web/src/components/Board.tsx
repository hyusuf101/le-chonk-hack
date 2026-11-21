import { Users } from 'lucide-react';
import { displayMode } from '../lib/mode';
import { InviteSheet, RoomCode } from './InviteSheet';
import { DisplayAudio } from './DisplayAudio';
import type { MouseEvent } from 'react';
import type { Row } from '../contract';
import { useCallback, useState } from 'react';
import { useStore } from '../state/store';
import { useTalk } from '../state/useTalk';
import { useClock } from '../state/useClock';
import { useWakeLock } from '../state/useWakeLock';
import { BoardHeader } from './BoardHeader';
import { BottomBar } from './BottomBar';
import { DepartureList } from './DepartureList';
import { HeroCarousel } from './HeroCarousel';
import { AnnouncerCaption } from './AnnouncerCaption';
import { LocationSheet } from './LocationSheet';
import { TalkOverlay } from './TalkOverlay';
import { VybeSheet } from './VybeSheet';
import { budgetLabel } from '../lib/vybe';
import './Board.css';

export function Board({ covered }: { covered: boolean }) {
  const { state, dispatch } = useStore();
  const { board, vybe } = state;
  const { nowMs, wallMs } = useClock(board, state.boardAt);
  useWakeLock();
  const [pickingArea, setPickingArea] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<false | true | 'budget'>(false);
  const tuning = [...vybe.into, ...vybe.notInto.map((tag) => `no ${tag}`), ...(vybe.budget && vybe.budget !== 999 ? [budgetLabel(vybe.budget).toLowerCase()] : [])].join(', ') || 'anything';
  const talk = useTalk(
    'command',
    useCallback(() => dispatch({ type: 'toast', text: 'Mic is off. Allow it in your browser settings.' }), [dispatch]),
  );

  // Expand the ticket from where the finger landed (or the element's centre for keyboard taps).
  const openTicket = (row: Row, e: MouseEvent<HTMLElement>) => {
    if (displayMode) return;
    const r = e.currentTarget.getBoundingClientRect();
    const fromPointer = e.detail > 0;
    dispatch({
      type: 'open_ticket',
      ticket: {
        id: row.id,
        x: fromPointer ? e.clientX : r.left + r.width / 2,
        y: fromPointer ? e.clientY : r.top + r.height / 2,
      },
    });
  };

  return (
    <div className={`board${displayMode ? ' board--display' : ''}${talk.phase !== 'idle' ? ' is-talking' : ''}`} inert={covered}>
      <div className="board-stage">
        <main className="board-scroll" aria-hidden={talk.phase !== 'idle' || undefined}>
          <BoardHeader board={board} nowMs={nowMs} onArea={() => setPickingArea(true)} onEdit={displayMode ? undefined : () => setEditing(true)} tuning={tuning} onInvite={() => setInviting(true)} />
          {board && board.members.length > 1 && <div className="people-strip">
            <Users size={16} aria-hidden="true" />
            <span>{board.members.map((member) => member === state.you ? 'You' : member).join(', ')}</span>
          </div>}
          {board?.count === 0 && <section className="board-empty">
            <h2 className="t-section">Nothing left within walking distance tonight.</h2>
            {!displayMode && vybe.budget !== null && vybe.budget < 999 && <button className="pill pill--primary" type="button" onClick={() => setEditing('budget')}>Try a higher budget</button>}
          </section>}
          {!board && <p className="board-wait">Finding what{'\u2019'}s on near you{'\u2026'}</p>}
          {board && (
            <>
              <HeroCarousel rows={board.rows} nowMs={nowMs} student={vybe.student} boarded={board.boarded} onOpen={openTicket} />
              <DepartureList rows={board.rows} nowMs={nowMs} wallMs={wallMs} readOnly={displayMode} onOpen={openTicket} />
            </>
          )}
        </main>
        <AnnouncerCaption display={displayMode} />
        <TalkOverlay phase={talk.phase} transcript={state.transcript} onStop={talk.stop} />
      </div>
      {!displayMode && <BottomBar
        phase={talk.phase}
        onTalk={talk.toggle}
      />}
      {displayMode && <aside className="display-tools">
        {state.room && <><RoomCode room={state.room} /><span>Scan to join</span></>}
        <DisplayAudio />
      </aside>}
      {inviting && <InviteSheet room={state.room} onDismiss={() => setInviting(false)} />}
      {editing && <VybeSheet initialRow={editing === 'budget' ? 'budget' : null} onDismiss={() => setEditing(false)} />}
      {pickingArea && <LocationSheet onClose={() => setPickingArea(false)} />}
    </div>
  );
}
