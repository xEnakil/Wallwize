import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { installStartupErrorOverlay } from './startup-error';
import '../styles/index.css';

installStartupErrorOverlay();

async function mountApp() {
  // The native preload bridge always wins. Lazy-loading also keeps demo data
  // out of packaged production builds.
  if (import.meta.env.MODE === 'demo' && !window.wallwize) {
    const { createDemoApi } = await import('./demo/createDemoApi');
    if (!window.wallwize) {
      window.wallwize = createDemoApi();
    }
  }

  createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void mountApp();
