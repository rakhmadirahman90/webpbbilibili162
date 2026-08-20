// Global navigation stability layer.
// Keeps menu navigation immediate and prevents route changes from being
// visually animated or accompanied by smooth-scroll movement.

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const root = document.documentElement;
  root.classList.add('pb-stable-navigation');
  root.style.scrollBehavior = 'auto';

  // Framer Motion respects the reduced-motion media query. The application
  // intentionally uses a stable, non-animated navigation mode so opening a
  // menu never flashes the previous page, fallback, or an intermediate frame.
  const originalMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = ((query: string) => {
    const result = originalMatchMedia(query);
    if (!/prefers-reduced-motion/.test(query)) return result;

    const reduce = /reduce/.test(query) && !/no-preference/.test(query);
    const noPreference = /no-preference/.test(query);
    const matches = reduce ? true : noPreference ? false : result.matches;

    return {
      ...result,
      matches,
      media: query,
      onchange: result.onchange,
      addListener: result.addListener.bind(result),
      removeListener: result.removeListener.bind(result),
      addEventListener: result.addEventListener.bind(result),
      removeEventListener: result.removeEventListener.bind(result),
      dispatchEvent: result.dispatchEvent.bind(result),
    } as MediaQueryList;
  }) as typeof window.matchMedia;

  // The application uses smooth scrolling for menu actions. Force those
  // programmatic scrolls to complete immediately; this removes the visible
  // slide/scroll flash when changing between full-page menu views.
  const nativeScrollTo = window.scrollTo.bind(window);
  window.scrollTo = ((...args: any[]) => {
    if (args.length === 1 && typeof args[0] === 'object') {
      nativeScrollTo({ ...args[0], behavior: 'auto' });
      return;
    }
    nativeScrollTo(...args as [number, number]);
  }) as typeof window.scrollTo;

  const nativeElementScrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
    if (arg && typeof arg === 'object') {
      nativeElementScrollIntoView.call(this, { ...arg, behavior: 'auto' });
      return;
    }
    nativeElementScrollIntoView.call(this, arg);
  };
}
