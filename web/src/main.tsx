import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { unlockAudio } from './audio/context';
import './styles/tokens.css';
import './styles/global.css';

// The first tap anywhere unlocks audio, so announcements can play even after a reload straight to the board.
document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
