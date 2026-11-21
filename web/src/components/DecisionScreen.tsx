import { ChevronLeft, Navigation } from 'lucide-react';
import type { Decision, Row } from '../contract';
import { useVenueColors, venueStyle } from '../lib/venueColors';
import { Grain } from './Grain';
import './Group.css';

export function DecisionScreen({ decision, row, onDismiss }: { decision: Decision; row: Row; onDismiss: () => void }) {
  const colors = useVenueColors(row);
  const { leave_in_min, walk_min } = decision.plan;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}&travelmode=walking`;
  return <section className="group-decision" style={venueStyle(colors)} aria-label="Group plan">
    <Grain />
    <button type="button" className="ticket-circle" onClick={onDismiss} aria-label="Back to the board"><ChevronLeft size={20} /></button>
    <div className="decision-plan">
      <p className="t-secondary">Doors closing</p>
      <h1 className="t-title">You’re going to {row.name}</h1>
      <p className="t-key">{leave_in_min <= 0 ? 'Leave now' : `Leave in ${leave_in_min} min`}</p>
      <p className="t-secondary">{walk_min} min walk</p>
      <a className="pill decision-directions" href={directions} target="_blank" rel="noreferrer"><Navigation size={18} /> Directions</a>
    </div>
  </section>;
}
