/* Keep the gallery route marked before the lazy component paints. */
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const syncGalleryRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const isGalleryPath = path === '/galeri' || path === '/gallery' || path.startsWith('/galeri/') || path.startsWith('/gallery/');
    const hasGallery = !!document.getElementById('gallery');
    document.body.classList.toggle('gallery-route', isGalleryPath || hasGallery);
  };

  syncGalleryRoute();
  window.addEventListener('popstate', syncGalleryRoute);

  // React Router uses history.pushState/replaceState, which do not emit
  // popstate. Patch only the notification side so the stability class updates
  // immediately without changing navigation behavior.
  const history = window.history;
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);
  history.pushState = ((...args: Parameters<History['pushState']>) => {
    const result = originalPushState(...args);
    window.dispatchEvent(new Event('gallery-route-state-change'));
    return result;
  }) as History['pushState'];
  history.replaceState = ((...args: Parameters<History['replaceState']>) => {
    const result = originalReplaceState(...args);
    window.dispatchEvent(new Event('gallery-route-state-change'));
    return result;
  }) as History['replaceState'];
  window.addEventListener('gallery-route-state-change', syncGalleryRoute);

  const observer = new MutationObserver(syncGalleryRoute);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
