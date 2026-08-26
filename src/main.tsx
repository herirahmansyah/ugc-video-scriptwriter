import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import AppRouter from './AppRouter.tsx';
import './index.css';

// Catch benign development websocket closing events
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && typeof event.reason === 'object') {
      const msg = String(event.reason.message || event.reason);
      if (msg.includes('WebSocket') || msg.includes('ws')) {
        event.preventDefault();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
