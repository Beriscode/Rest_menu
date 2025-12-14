
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

  // Service Worker Registration with Origin Validation
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        // Resolve Service Worker URL explicitly against current window location
        const swUrl = new URL('./sw.js', window.location.href).href;
        
        // Only attempt registration if the script is on the same origin as the current page
        // to avoid "SecurityError: The origin of the provided scriptURL does not match..."
        if (new URL(swUrl).origin === window.location.origin) {
          navigator.serviceWorker.register(swUrl)
            .then(registration => {
              console.debug('IRSW Service Worker active:', registration.scope);
            })
            .catch(err => {
              console.warn('IRSW Service Worker failed to initialize:', err);
            });
        } else {
          console.debug('IRSW Service Worker skipped: Origin mismatch in preview environment.');
        }
      } catch (e) {
        console.warn('IRSW Service Worker setup error:', e);
      }
    });
  }
};

// Ensure DOM is ready before initializing React root
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
