import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './utils/stableNavigation.ts';
import './utils/galleryRouteStability.ts';
import './utils/galleryBackButtonRuntime.ts';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initializeLocalDatabase } from './data/localDatabase.ts';
import { installNavigationPrefetch } from './utils/navigationPrefetch.ts';
import './index.css';
import './responsive-hardening.css';
import './professional-responsive.css';
import './news-footer-fix.css';
import './public-footer-flow.css';
import './gallery-stability.css';
import './gallery-back-button-fix.css';
import './gallery-audio-hide.css';

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

  installNavigationPrefetch();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
