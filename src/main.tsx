import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './utils/stableNavigation.ts';
import './utils/galleryRouteStability.ts';
import './utils/galleryBackButtonRuntime.ts';
import './utils/galleryFilePicker.ts';
import './utils/publicScrollRecovery.ts';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initializeLocalDatabase } from './data/localDatabase.ts';
import { installNavigationPrefetch } from './utils/navigationPrefetch.ts';
import { installAdminExportEnhancer } from './utils/adminExportEnhancer.ts';
import './index.css';
import './responsive-hardening.css';
import './professional-responsive.css';
import './news-footer-fix.css';
import './public-footer-flow.css';
import './gallery-stability.css';
import './gallery-back-button-fix.css';
import './gallery-audio-hide.css';
import './kas-notification-responsive.css';
import './kelola-surat-mobile.css';
import './tournament-mobile-input-fix.css';
import './admin-ui-polish.css';
import './tournament-admin-ui.css';

if (typeof window !== 'undefined') {
  const syncGalleryRouteClass = () => {
    document.body.classList.toggle('gallery-route', /^\/(galeri|gallery)(?:\/|$)/i.test(window.location.pathname));
  };

  syncGalleryRouteClass();
  window.addEventListener('popstate', syncGalleryRouteClass);

  const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const isTournamentRegistrationTarget = (el: Element | null) => {
    if (!el) return false;
    const text = normalize(el.textContent);
    const aria = normalize(el.getAttribute('aria-label'));
    const href = normalize(el.getAttribute('href'));
    return (
      href === '/pendaftaran-turnamen' ||
      href === '/pendaftaran' ||
      text === 'formulir pendaftaran turnamen' ||
      text.includes('formulir pendaftaran turnamen') ||
      aria.includes('formulir pendaftaran turnamen')
    );
  };
  const handleTournamentRegistrationClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const target = event.target instanceof Element ? event.target.closest('button,a,[role="menuitem"]') : null;
    if (!isTournamentRegistrationTarget(target)) return;
    event.preventDefault();
    event.stopPropagation();
    try { (event as any).stopImmediatePropagation?.(); } catch {}
    const targetPath = '/pendaftaran-turnamen';
    if (window.location.pathname !== targetPath) window.location.assign(targetPath);
  };
  document.addEventListener('click', handleTournamentRegistrationClick, true);

  window.setTimeout(() => {
    try { initializeLocalDatabase(); }
    catch (error) { console.warn('[startup] local database initialization skipped:', error); }
  }, 0);

  installNavigationPrefetch();
  installAdminExportEnhancer();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
