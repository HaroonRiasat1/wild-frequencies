import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import { App } from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
  </React.StrictMode>,
);

// Dev-only handle for poking the show from the console: __wf.director.skip(), etc.
if (import.meta.env.DEV) {
  Promise.all([import('./audio/engine'), import('./show/director'), import('./state/store'), import('./conductor/conductor'), import('tone'), import('./audio/trackPlayer'), import('./party/party')]).then(
    ([{ engine }, { director }, { useShow }, { conductor }, Tone, { trackPlayer }, { party }]) => {
      (window as unknown as Record<string, unknown>).__wf = { engine, director, useShow, conductor, Tone, trackPlayer, party };
    },
  );
}
