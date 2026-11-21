import { useStore } from '../state/store';
import { useClock } from '../state/useClock';
import { useWakeLock } from '../state/useWakeLock';
import { BoardHeader } from './BoardHeader';
import { BottomBar } from './BottomBar';
import { DepartureList } from './DepartureList';
import { HeroCarousel } from './HeroCarousel';
import './Board.css';

export function Board() {
  const { state, dispatch } = useStore();
  const { board, vybe } = state;
  const { nowMs, wallMs } = useClock(board, state.boardAt);
  useWakeLock();

  return (
    <div className="board">
      <main className="board-scroll">
        <BoardHeader board={board} nowMs={nowMs} />
        {!board && <p className="board-wait">Finding what{'\u2019'}s on near you{'\u2026'}</p>}
        {board && (
          <>
            <HeroCarousel rows={board.rows} nowMs={nowMs} student={vybe.student} />
            <DepartureList rows={board.rows} nowMs={nowMs} wallMs={wallMs} />
          </>
        )}
      </main>
      <BottomBar onFilters={() => dispatch({ type: 'go', screen: 'start' })} />
    </div>
  );
}
