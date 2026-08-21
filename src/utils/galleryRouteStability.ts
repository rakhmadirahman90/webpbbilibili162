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
  window.addEventListener('pushstate', syncGalleryRoute as EventListener);
  window.addEventListener('replacestate', syncGalleryRoute as EventListener);

  const observer = new MutationObserver(syncGalleryRoute);
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
