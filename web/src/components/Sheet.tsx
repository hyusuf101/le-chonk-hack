import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import type { ChipTone } from './Chip';
import './Sheet.css';

/** If the page stops drawing frames mid-close, finish anyway. */
const CLOSE_FALLBACK_MS = 400;

interface SheetProps {
  title: string;
  /** Dismissed via the scrim, Escape or a close() without its own follow-up. */
  onDismiss: () => void;
  /** Gets `close(after?)`: plays the exit, then runs `after` (or onDismiss). */
  children: (close: (after?: () => void) => void) => ReactNode;
}

/** Bottom sheet in station colours: slides up over a dimmed scrim, slides away on close. */
export function Sheet({ title, onDismiss, children }: SheetProps) {
  const [closing, setClosing] = useState(false);
  const after = useRef<(() => void) | undefined>(undefined);
  const finished = useRef(false);
  const titleId = useId();

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    (after.current ?? onDismiss)();
  }, [onDismiss]);

  const close = useCallback((fn?: () => void) => {
    after.current = fn;
    setClosing(true);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(finish, CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [closing, finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  return (
    <div className={`sheet-layer${closing ? ' is-closing' : ''}`}>
      <div className="sheet-scrim" onClick={() => close()} />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onAnimationEnd={(e) => {
          if (closing && e.target === e.currentTarget) finish();
        }}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <h2 id={titleId} className="t-section sheet-title">
          {title}
        </h2>
        {children(close)}
      </div>
    </div>
  );
}

interface OptionProps {
  label: string;
  on: boolean;
  tone: ChipTone;
  check?: boolean;
  onToggle: () => void;
}

/** A selectable pill inside a sheet; selected uses the row's chip colours. */
export function SheetOption({ label, on, tone, check, onToggle }: OptionProps) {
  return (
    <button
      type="button"
      className={`sheet-opt${on ? ` sheet-opt--on sheet-opt--${tone}` : ''}`}
      aria-pressed={on}
      onClick={onToggle}
    >
      {check && on && <Check size={16} strokeWidth={2} aria-hidden="true" />}
      {label}
    </button>
  );
}
