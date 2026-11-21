import { useState } from 'react';
import {
  BUDGET_OPTIONS,
  COMPANY_OPTIONS,
  INTO_SUGGESTIONS,
  NOT_INTO_SUGGESTIONS,
  tagLabel,
  type Vybe,
} from '../lib/vybe';
import type { ChipTone } from './Chip';
import { Sheet, SheetOption } from './Sheet';
import type { RowKey } from './VybeCard';

const TITLES: Record<RowKey, string> = {
  into: 'Into',
  notInto: 'Not into',
  budget: 'Budget',
  company: "Who's coming",
};

interface Props {
  row: RowKey;
  vybe: Vybe;
  onDone: (vybe: Vybe) => void;
  onCancel: () => void;
}

const toggle = (list: string[], tag: string) =>
  list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag];

export function RowSheet({ row, vybe, onDone, onCancel }: Props) {
  const [draft, setDraft] = useState(vybe);

  const tagOptions = (key: 'into' | 'notInto', suggestions: string[], tone: ChipTone) =>
    [...new Set([...suggestions, ...draft[key]])].map((tag) => (
      <SheetOption
        key={tag}
        label={tagLabel(tag)}
        tone={tone}
        on={draft[key].includes(tag)}
        onToggle={() => setDraft({ ...draft, [key]: toggle(draft[key], tag) })}
      />
    ));

  return (
    <Sheet title={TITLES[row]} onDismiss={onCancel}>
      {(close) => (
        <>
          <div className="sheet-opts">
            {row === 'into' && tagOptions('into', INTO_SUGGESTIONS, 'into')}
            {row === 'notInto' && tagOptions('notInto', NOT_INTO_SUGGESTIONS, 'notinto')}
            {row === 'budget' &&
              BUDGET_OPTIONS.map((o) => (
                <SheetOption
                  key={o.value}
                  label={o.label}
                  tone="neutral"
                  on={draft.budget === o.value}
                  onToggle={() => setDraft({ ...draft, budget: o.value })}
                />
              ))}
            {row === 'company' &&
              COMPANY_OPTIONS.map((o) => (
                <SheetOption
                  key={o.value}
                  label={o.label}
                  tone="neutral"
                  on={draft.company === o.value}
                  onToggle={() => setDraft({ ...draft, company: o.value })}
                />
              ))}
          </div>

          {row === 'budget' && (
            <div className="sheet-opts sheet-opts--toggles">
              <SheetOption
                label="Student"
                tone="neutral"
                check
                on={draft.student}
                onToggle={() => setDraft({ ...draft, student: !draft.student })}
              />
              <SheetOption
                label="Over 18"
                tone="neutral"
                check
                on={draft.adult}
                onToggle={() => setDraft({ ...draft, adult: !draft.adult })}
              />
            </div>
          )}

          <button
            type="button"
            className="pill pill--primary sheet-done"
            onClick={() => close(() => onDone(draft))}
          >
            Done
          </button>
        </>
      )}
    </Sheet>
  );
}
