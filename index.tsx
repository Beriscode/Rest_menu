
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
   * In many cloud preview environments (like AI Studio), service workers are restricted 
   * due to cross-origin isolation or iframe sandboxing.
   */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use a relative path directly for the service worker. 
      // Browsers handle relative paths better in sandboxes than absolute URLs.
      const swPath = './sw.js';
      
      navigator.serviceWorker.register(swPath)
        .then(registration => {
          console.debug('IRSW Service Worker registered:', registration.scope);
        })
        .catch(err => {
          // Log as debug rather than error if it's a known origin/security mismatch 
          // to keep the console clean for developers.
          if (err.name === 'SecurityError' || err.message.includes('origin')) {
            console.debug('IRSW Service Worker skipped: Environment restriction (Cross-Origin/Sandbox).');
          } else {
            console.warn('IRSW Service Worker failed to initialize:', err);
          }
        });
    });
  }
};

// Ensure DOM is ready before initializing React root
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
