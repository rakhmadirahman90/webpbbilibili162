import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './utils/stableNavigation.ts';
import './utils/galleryRouteStability.ts';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initializeLocalDatabase } from './data/localDatabase.ts';
import { installNavigationPrefetch } from './utils/navigationPrefetch.ts';
import './index.css';
import './responsive-hardening.css';
import './news-footer-fix.css';
import './public-footer-flow.css';
import './gallery-stability.css';

// Keep the Gallery route visually stable while the lazy page and its data hydrate.
// This avoids a partially transparent/stuck route transition on mobile browsers.
if (typeof window !== 'undefined') {
  const syncGalleryRouteClass = () => {
    document.body.classList.toggle(
      'gallery-route',
      /^\/(galeri|gallery)(?:\/|$)/i.test(window.location.pathname)
    );
  };

  syncGalleryRouteClass();
  window.addEventListener('popstate', syncGalleryRouteClass);

  window.setTimeout(() => {
    try {
      initializeLocalDatabase();
    } catch (error) {
      console.warn('[startup] local database initialization skipped:', error);
    }
  }, 0);

  // Warm the Vite route chunks when the user shows intent to open a menu.
  // pointerdown/touchstart fires before the click that changes the route,
  // making mobile sidebar navigation feel immediate without delaying first paint.
  installNavigationPrefetch();
}

// Do not register a service worker during the critical production shell boot.
// A stale worker can serve an old JS graph after a deployment and produce a
// completely blank mobile screen. PWA assets remain available through the
// manifest, while the current Vercel deployment is always loaded directly.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
