import { useState } from 'react';
import { useStore } from '../state/store';
import { RowSheet } from './RowSheet';
import { Sheet } from './Sheet';
import { VybeCard, type RowKey } from './VybeCard';

export function VybeSheet({ onDismiss, initialRow = null }: { onDismiss: () => void; initialRow?: RowKey | null }) {
  const { state, dispatch } = useStore();
  const [row, setRow] = useState(initialRow);
  if (row) {
    return <RowSheet row={row} vybe={state.vybe} onCancel={() => setRow(null)} onDone={(vybe) => {
      dispatch({ type: 'set_vybe', vybe });
      setRow(null);
    }} />;
  }
  return <Sheet title="Your vybe" onDismiss={onDismiss}>
    {(close) => <>
      <VybeCard hideTitle vybe={state.vybe} onOpen={setRow} onChange={(vybe) => dispatch({ type: 'set_vybe', vybe })} />
      <button className="pill pill--primary sheet-done" type="button" onClick={() => close()}>Done</button>
    </>}
  </Sheet>;
}
