import { useCallback, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import type { Category, Row } from '../contract';
import { dayWord, MINUTE } from '../lib/time';
import { prefersReducedMotion } from '../lib/morph';
import { useStore } from '../state/store';
import { DepartureRow } from './DepartureRow';
import './DepartureList.css';

const GROUP_LIMIT = 5;
const LABELS: Record<Category, string> = {
  comedy: 'Comedy', games: 'Games', food: 'Food', music: 'Music',
  culture: 'Culture', bar: 'Bars', other: 'Other',
};

const SOON_MIN = 30;
/** A departed row shows "Departed" this long, then collapses away. */
const DEPARTED_SHOW_MS = 3000;
const COLLAPSE_MS = 320;

interface Props {
  rows: Row[];
  nowMs: number;
  wallMs: number;
  readOnly?: boolean;
  onOpen: (row: Row, e: MouseEvent<HTMLElement>) => void;
}

function venueKey(row: Row): string {
  const venue = row.venue.trim().toLowerCase().replace(/\s+/g, ' ');
  return venue || row.id;
}

type Phase = 'live' | 'collapsing' | 'gone';

/** Remembers when each row was first seen departed (device time), to stage its exit. */
function useDepartedPhase(rows: Row[], wallMs: number): (row: Row) => Phase {
  const seen = useRef(new Map<string, number>());
  for (const r of rows) {
    if (r.status === 'departed') {
      if (!seen.current.has(r.id)) seen.current.set(r.id, wallMs);
    } else {
      seen.current.delete(r.id); // e.g. time-travel back
    }
  }
  return (row) => {
    const since = seen.current.get(row.id);
    if (since === undefined) return 'live';
    const age = wallMs - since;
    if (age < DEPARTED_SHOW_MS) return 'live';
    return age < DEPARTED_SHOW_MS + COLLAPSE_MS ? 'collapsing' : 'gone';
  };
}

const REORDER_MS = 340;
const EASE_OUT = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** True if `next` is just `prev` with some ids taken out (those already animate out by collapsing). */
function onlyRemoved(prev: string[], next: string[]): boolean {
  let i = 0;
  for (const id of prev) if (id === next[i]) i++;
  return i === next.length;
}

/**
 * FLIP: when the server re-sorts the list (e.g. after a spoken command), rows glide from their old
 * place to the new one and newcomers fade in, instead of the list jumping.
 */
function useReorderAnimation(listRef: RefObject<HTMLDivElement | null>) {
  const last = useRef<{ ids: string[]; tops: Map<string, number> }>({ ids: [], tops: new Map() });

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const base = list.getBoundingClientRect().top;
    const nodes = [...list.querySelectorAll<HTMLElement>('[data-row-id]')];
    const ids = nodes.map((n) => n.dataset.rowId!);
    const tops = new Map(nodes.map((n) => [n.dataset.rowId!, n.getBoundingClientRect().top - base]));
    const prev = last.current;
    const reordered = prev.ids.length > 0 && ids.join('|') !== prev.ids.join('|') && !onlyRemoved(prev.ids, ids);

    if (reordered && !prefersReducedMotion()) {
      for (const n of nodes) {
        const item = n.closest('li') ?? n;
        const before = prev.tops.get(n.dataset.rowId!);
        const now = tops.get(n.dataset.rowId!)!;
        if (before === undefined) {
          item.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, delay: 80, easing: 'ease-out', fill: 'backwards' });
        } else if (Math.abs(before - now) > 1) {
          item.animate([{ transform: `translateY(${before - now}px)` }, { transform: 'none' }], {
            duration: REORDER_MS,
            easing: EASE_OUT,
          });
        }
      }
    }
    last.current = { ids, tops };
  });
}

export function DepartureList({ rows, nowMs, wallMs, readOnly, onOpen }: Props) {
  const { send } = useStore();
  const departedPhase = useDepartedPhase(rows, wallMs);
  const listRef = useRef<HTMLDivElement>(null);
  useReorderAnimation(listRef);

  // Swiped away: collapse here first, then tell the server (its new board can't cut the collapse short).
  const [skipped, setSkipped] = useState<Record<string, number>>({});
  const skip = useCallback(
    (row: Row) => {
      setSkipped((s) => ({ ...s, [row.id]: Date.now() }));
      window.setTimeout(() => send({ type: 'feedback', item_id: row.id, kind: 'skip' }), COLLAPSE_MS);
    },
    [send],
  );
  const phaseOf = (row: Row): Phase => {
    const at = skipped[row.id];
    if (at === undefined) return departedPhase(row);
    return wallMs - at < COLLAPSE_MS ? 'collapsing' : 'gone';
  };
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pickedVenues = new Set(rows.filter((row) => row.pick).map(venueKey));
  const venues = new Map<string, { row: Row; phase: Phase; repeats: number }>();
  for (const row of rows) {
    const key = venueKey(row);
    const phase = phaseOf(row);
    if (row.pick || pickedVenues.has(key) || phase === 'gone') continue;
    const existing = venues.get(key);
    if (!existing) venues.set(key, { row, phase, repeats: 0 });
    else if (existing.row.status === 'departed' && row.status !== 'departed') {
      venues.set(key, { row, phase, repeats: existing.repeats + 1 });
    } else existing.repeats++;
  }
  const entries = [...venues.values()];
  const counts = new Map<Category, number>();
  for (const { row } of entries) counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  const selected = category === 'all' || counts.has(category) ? category : 'all';
  const rest = entries.filter(({ row }) => selected === 'all' || row.category === selected);
  const cutoff = nowMs + SOON_MIN * MINUTE;
  const groups = [
    { id: 'soon', title: 'Next 30 minutes', items: rest.filter((r) => Date.parse(r.row.leave_by) <= cutoff) },
    { id: 'later', title: `Later ${dayWord(nowMs)}`, items: rest.filter((r) => Date.parse(r.row.leave_by) > cutoff) },
  ].filter((g) => g.items.length > 0);

  return (
    <div ref={listRef} className="dlist">
      {entries.length > 0 && <nav className="category-bar" aria-label="Filter departures by category">
        <button type="button" aria-pressed={selected === 'all'} onClick={() => { setCategory('all'); setExpanded({}); }}>All {entries.length}</button>
        {(Object.keys(LABELS) as Category[]).filter((key) => counts.has(key)).map((key) =>
          <button key={key} type="button" aria-pressed={selected === key} onClick={() => { setCategory(key); setExpanded({}); }}>
            {LABELS[key]} {counts.get(key)}
          </button>
        )}
      </nav>}
      {groups.map((group) => (
        <section key={group.id} className="dlist-group">
          <h2 className="t-sub dlist-title">{group.title}</h2>
          <ul className="dlist-rows">
            {group.items.slice(0, expanded[group.id] ? undefined : GROUP_LIMIT).map(({ row, phase, repeats }) => (
              <li key={row.id} className={`dlist-item${phase === 'collapsing' ? ' is-collapsing' : ''}`}>
                <div className="dlist-item-inner">
                  <DepartureRow row={row} nowMs={nowMs} onOpen={onOpen} onSkip={readOnly ? undefined : skip} />
                  {repeats > 0 && <p className="venue-repeats">+{repeats} at {row.venue}</p>}
                </div>
              </li>
            ))}
          </ul>
          {group.items.length > GROUP_LIMIT && <button className="show-more" type="button" aria-expanded={!!expanded[group.id]}
            onClick={() => setExpanded({ ...expanded, [group.id]: !expanded[group.id] })}>
            {expanded[group.id] ? 'Show fewer' : `Show ${group.items.length - GROUP_LIMIT} more`}
          </button>}
        </section>
      ))}
    </div>
  );
}
