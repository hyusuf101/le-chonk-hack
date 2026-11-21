import { useState } from 'react';
import { Check, Navigation, Search } from 'lucide-react';
import { locateMe, placeFromArea, searchAreas } from '../lib/areas';
import { useStore } from '../state/store';
import { Sheet, SheetOption } from './Sheet';
import './LocationSheet.css';

/** "Where are you starting?": current location, or pick an area/station. */
export function LocationSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch, send } = useStore();
  const [query, setQuery] = useState('');
  const [locating, setLocating] = useState(false);
  const results = searchAreas(query);
  const usingGps = state.place?.source === 'gps';

  return (
    <Sheet title="Where are you starting?" onDismiss={onClose}>
      {(close) => (
        <>
          <button
            type="button"
            className={`loc-current${usingGps ? ' is-on' : ''}`}
            disabled={locating}
            onClick={async () => {
              setLocating(true);
              const place = await locateMe();
              setLocating(false);
              if (!place) {
                dispatch({ type: 'location_denied' });
                return;
              }
              dispatch({ type: 'set_place', place });
              send({ type: 'location', ...place });
              close();
            }}
          >
            <Navigation size={18} strokeWidth={2} aria-hidden="true" />
            <span className="loc-current-text">
              <span>{locating ? 'Finding you…' : 'Use current location'}</span>
              {state.locationDenied && (
                <span className="loc-current-hint">Location is off. Allow it for this site in your browser settings.</span>
              )}
            </span>
            {usingGps && <Check size={18} strokeWidth={2} aria-hidden="true" />}
          </button>

          <label className="loc-search">
            <Search size={18} strokeWidth={2} aria-hidden="true" />
            <input
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Search an area or station"
              aria-label="Search an area or station"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <div className="sheet-opts loc-results">
            {results.map((area) => (
              <SheetOption
                key={area.name}
                label={area.name}
                tone="neutral"
                on={state.place?.source === 'search' && state.place.label === area.name}
                onToggle={() => {
                  const place = placeFromArea(area);
                  dispatch({ type: 'set_place', place });
                  send({ type: 'location', ...place });
                  close();
                }}
              />
            ))}
            {results.length === 0 && <p className="loc-empty">No matches. Try a nearby station.</p>}
          </div>
        </>
      )}
    </Sheet>
  );
}
