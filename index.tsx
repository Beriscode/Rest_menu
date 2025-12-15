
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const initApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Critical Failure: Mount target '#root' not found in DOM.");
    return;
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  /**
   * Service Worker Registration with Enhanced Sandbox Protection
   */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Normalizing path to ensure consistent scope across environments
      const swPath = './sw.js';
      
      navigator.serviceWorker.register(swPath, { scope: './' })
        .then(registration => {
          console.debug('IRSW Service Worker active. Scope:', registration.scope);
        })
        .catch((e: unknown) => {
          // Robust error narrowing for ESLint compliance
          const errorMessage = e instanceof Error ? e.message : String(e);
          const errorName = e instanceof Error ? e.name : 'UnknownError';

          if (errorName === 'SecurityError' || errorMessage.includes('origin')) {
            console.debug('IRSW Service Worker skipped: Environment restriction (Cross-Origin/Sandbox).');
          } else {
            console.warn('IRSW Service Worker registration failed:', errorMessage);
          }
        });
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
