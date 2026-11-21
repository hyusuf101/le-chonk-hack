import { useState } from 'react';
import { formatHM, londonWallTime } from '../lib/time';
import { isMock } from '../net/endpoints';
import { useStore } from '../state/store';

export function DemoPanel() {
  const { state, send, setFastClock } = useStore();
  const [open, setOpen] = useState(false);
  const [fast, setFast] = useState(false);
  const [hour, minute] = formatHM(state.board?.now ?? Date.now()).split(':').map(Number);
  const value = Math.min(1410, Math.max(840, hour * 60 + minute));
  return <aside className="demo-panel" aria-label="Demo controls">
    <button className="pill" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Demo</button>
    {open && <div className="demo-controls">
      <label>London time <output>{formatHM(state.board?.now ?? Date.now())}</output>
        <input type="range" min={840} max={1410} value={value} disabled={!state.board} onChange={(e) => {
          const mins = e.currentTarget.valueAsNumber;
          const time = `${Math.floor(mins / 60)}:${mins % 60}`;
          send({ type: 'time_travel', now: londonWallTime(new Date(state.board?.now ?? Date.now()), time).toISOString() });
        }} />
      </label>
      <button type="button" className="pill" onClick={() => send({ type: 'refresh_now' })}>Run refresh now</button>
      {isMock && <label><input type="checkbox" checked={fast} onChange={(e) => {
        setFast(e.target.checked);
        setFastClock(e.target.checked);
      }} /> Fast clock</label>}
    </div>}
  </aside>;
}
