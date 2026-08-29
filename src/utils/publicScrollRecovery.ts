// Keep public landing-page routes vertically scrollable on mobile.
// Some legacy overlays/navigation handlers can leave a stale inline scroll lock.
if (typeof window !== 'undefined') {
  const isPublicRoute = () => !/^\/(admin|login)(?:\/|$)/i.test(window.location.pathname);

  const restorePublicScroll = () => {
    if (!isPublicRoute()) return;
    const html = document.documentElement;
    const body = document.body;
    if (html.style.overflowY !== 'auto') html.style.overflowY = 'auto';
    if (html.style.height !== 'auto') html.style.height = 'auto';
    if (body.style.overflowY !== 'auto') body.style.overflowY = 'auto';
    if (body.style.height !== 'auto') body.style.height = 'auto';
    if (body.style.touchAction !== 'pan-y') body.style.touchAction = 'pan-y';
    if (body.style.overscrollBehaviorY !== 'auto') body.style.overscrollBehaviorY = 'auto';
  };

  restorePublicScroll();
  window.addEventListener('popstate', restorePublicScroll);
  window.addEventListener('pageshow', restorePublicScroll);
  window.addEventListener('pb-overlay-close', restorePublicScroll);

  const observer = new MutationObserver(() => restorePublicScroll());
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

  window.setTimeout(restorePublicScroll, 0);
  window.setTimeout(restorePublicScroll, 150);
  window.setTimeout(restorePublicScroll, 500);
}
