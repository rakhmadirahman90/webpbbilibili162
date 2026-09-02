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
import { installRegistrationClubAutocomplete } from './utils/registrationClubAutocomplete.ts';
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
import './admin-mobile-precision.css';
import './athlete-add-responsive.css';
import './admin-athlete-form-precision.css';
import './kas-manager-responsive.css';
import './kas-manager-final-responsive.css';

if (typeof window !== 'undefined') {
  const syncGalleryRouteClass = () => {
    document.body.classList.toggle('gallery-route', /^\/(galeri|gallery)(?:\/|$)/i.test(window.location.pathname));
  };

  syncGalleryRouteClass();
  window.addEventListener('popstate', syncGalleryRouteClass);

  // Mark the actual KasManager root so the scoped responsive stylesheet works
  // reliably even though KasManager is mounted through the admin router.
  const markKasManagerRoot = () => {
    const isKasRoute = /^\/admin\/kas\/?$/i.test(window.location.pathname);
    if (!isKasRoute) return;
    const candidates = Array.from(document.querySelectorAll('div')).filter((el) => {
      const className = typeof el.className === 'string' ? el.className : '';
      const text = (el.textContent || '').toUpperCase();
      return className.includes('w-full') && className.includes('min-h-full')
        && className.includes('flex') && className.includes('flex-col')
        && text.includes('KELOLA KAS KLUB');
    });
    const root = candidates[candidates.length - 1];
    if (root) root.setAttribute('data-kas-manager', 'true');
  };

  const kasRootObserver = new MutationObserver(() => markKasManagerRoot());
  kasRootObserver.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', markKasManagerRoot);
  window.setTimeout(markKasManagerRoot, 0);
  window.setTimeout(markKasManagerRoot, 250);
  window.setTimeout(markKasManagerRoot, 800);

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
  installRegistrationClubAutocomplete();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
