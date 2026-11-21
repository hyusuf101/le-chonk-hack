import { useEffect, useState } from 'react';
import { demoMode, displayMode } from './lib/mode';
import { DemoPanel } from './components/DemoPanel';
import { DecisionScreen } from './components/DecisionScreen';
import { StoreProvider, useStore } from './state/store';
import { Board } from './components/Board';
import { LoadingScreen } from './components/LoadingScreen';
import { ReconnectBanner } from './components/ReconnectBanner';
import { StartScreen } from './components/StartScreen';
import { TicketStack } from './components/TicketStack';
import { Toasts } from './components/Toasts';

function Screens() {
  const { state } = useStore();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const decision = state.decision;
  const key = decision ? JSON.stringify([decision.item_id, decision.by]) : null;
  const row = decision && state.board?.rows.find((candidate) => candidate.id === decision.item_id);
  const showDecision = decision && row && key !== dismissed;
  useEffect(() => {
    if (!decision) setDismissed(null);
  }, [decision]);
  return (
    <div className={displayMode ? 'app app--display' : 'app'}>
      {state.screen === 'start' && <StartScreen />}
      {state.screen === 'loading' && <LoadingScreen />}
      {state.screen === 'board' && <Board covered={!!showDecision || !!state.ticket} />}
      {state.screen === 'board' && !displayMode && state.ticket && <TicketStack key={state.ticket.id} open={state.ticket} covered={!!showDecision} />}
      {state.screen === 'board' && showDecision && <DecisionScreen decision={decision} row={row} onDismiss={() => setDismissed(key)} />}
      {demoMode && state.screen === 'board' && <DemoPanel />}
      <ReconnectBanner />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Screens />
    </StoreProvider>
  );
}
