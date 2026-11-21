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
import './Board.css';

export function Board() {
  const { state, dispatch } = useStore();
  const { board, vybe } = state;
  const { nowMs, wallMs } = useClock(board, state.boardAt);
  useWakeLock();
  const [pickingArea, setPickingArea] = useState(false);
  const talk = useTalk(
    'command',
    useCallback(() => dispatch({ type: 'toast', text: 'Mic is off. Allow it in your browser settings.' }), [dispatch]),
  );

  // Expand the ticket from where the finger landed (or the element's centre for keyboard taps).
  const openTicket = (row: Row, e: MouseEvent<HTMLElement>) => {
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
    <div className={`board${talk.phase !== 'idle' ? ' is-talking' : ''}`}>
      <div className="board-stage">
        <main className="board-scroll" aria-hidden={talk.phase !== 'idle' || undefined}>
          <BoardHeader board={board} nowMs={nowMs} onArea={() => setPickingArea(true)} />
          {!board && <p className="board-wait">Finding what{'\u2019'}s on near you{'\u2026'}</p>}
          {board && (
            <>
              <HeroCarousel rows={board.rows} nowMs={nowMs} student={vybe.student} onOpen={openTicket} />
              <DepartureList rows={board.rows} nowMs={nowMs} wallMs={wallMs} onOpen={openTicket} />
            </>
          )}
        </main>
        <AnnouncerCaption />
        <TalkOverlay phase={talk.phase} transcript={state.transcript} onStop={talk.stop} />
      </div>
      <BottomBar
        phase={talk.phase}
        onTalk={talk.toggle}
        onFilters={() => dispatch({ type: 'go', screen: 'start' })}
      />
      {pickingArea && <LocationSheet onClose={() => setPickingArea(false)} />}
    </div>
  );
}
