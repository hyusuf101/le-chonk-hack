import type { MouseEvent } from 'react';
import type { Row } from '../contract';
import { formatPrice } from '../lib/format';
import { formatHM, leaveHint } from '../lib/time';
import { useSwipeToReveal } from '../lib/useSwipeToReveal';
import { useVenueColors, venueStyle } from '../lib/venueColors';
import { StatusText } from './StatusText';
import './DepartureRow.css';

interface Props {
  row: Row;
  nowMs: number;
  onOpen: (row: Row, e: MouseEvent<HTMLElement>) => void;
  onSkip: (row: Row) => void;
}

export function DepartureRow({ row, nowMs, onOpen, onSkip }: Props) {
  // The list keeps prices bare; the hero card carries the "student" qualifier.
  const price = formatPrice(row, false);
  const colors = useVenueColors(row);
  const swipe = useSwipeToReveal(() => onSkip(row));

  return (
    <div className="drow-swipe" {...swipe.handlers}>
      <button
        type="button"
        className="drow-action"
        style={{ opacity: Math.min(1, -swipe.dx / 90) }}
        tabIndex={swipe.revealed ? 0 : -1}
        aria-hidden={!swipe.revealed}
        onClick={swipe.commit}
      >
        Not for me
      </button>
      <button
        className={`drow${swipe.dragging ? ' is-dragging' : ''}`}
        type="button"
        style={{ ...venueStyle(colors), transform: swipe.dx ? `translateX(${swipe.dx}px)` : undefined }}
        data-row-id={row.id}
        onClick={swipe.guardClick((e) => onOpen(row, e))}
      >
        <span className="drow-time tnum">{formatHM(row.departure_time)}</span>
        <span className="drow-body">
          <span className="drow-line">
            <span className="drow-name">
              <span className="drow-dot" aria-hidden="true" />
              <span className="drow-name-text">{row.name}</span>
            </span>
            <StatusText status={row.status} className="drow-status" />
          </span>
          <span className="drow-line t-secondary">
            <span className="drow-meta">
              <span className="drow-walk">{row.walk_min} min walk</span>
              {price && <span>{price}</span>}
            </span>
            <span className="drow-hint t-label tnum">{leaveHint(row, nowMs)}</span>
          </span>
        </span>
      </button>
    </div>
  );
}
