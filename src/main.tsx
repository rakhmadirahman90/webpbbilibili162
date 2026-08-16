import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initializeLocalDatabase } from './data/localDatabase.ts';
import { startGlobalRealtimeSync } from './utils/globalRealtime.ts';
import './index.css';

// Initialize local database storage eagerly
initializeLocalDatabase();

// Subscribe once to authoritative Supabase realtime changes for all public
// navbar data. Public routes are remounted after a debounced database event.
startGlobalRealtimeSync();

// Register Service Worker for Progressive Web App (PWA)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('PWA ServiceWorker registered with scope:', reg.scope);
    }).catch((err) => {
      console.log('PWA ServiceWorker registration failed:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);


