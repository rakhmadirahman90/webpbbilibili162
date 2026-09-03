const normalize = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const isSubmitButton = (el: Element | null): el is HTMLButtonElement => {
  if (!(el instanceof HTMLButtonElement)) return false;
  const text = normalize(el.textContent);
  const aria = normalize(el.getAttribute('aria-label'));
  return text.includes('kirim pendaftaran') || aria.includes('kirim pendaftaran');
};

const installTournamentSubmitClickFix = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if ((window as any).__tournamentSubmitClickFixInstalled) return;
  (window as any).__tournamentSubmitClickFixInstalled = true;

  const enhance = () => {
    const buttons = Array.from(document.querySelectorAll('button'))
      .filter(isSubmitButton);
    buttons.forEach((button) => {
      button.style.pointerEvents = 'auto';
      button.style.position = 'relative';
      button.style.zIndex = '60';
      button.style.touchAction = 'manipulation';
    });
  };

  enhance();
  const observer = new MutationObserver(enhance);
  observer.observe(document.body, { childList: true, subtree: true });

  // On some mobile layouts a transparent/sticky layer can sit above the final
  // button. Recover the intended click by dispatching a programmatic click when
  // the touch lands inside the visible submit button rectangle.
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const direct = event.target instanceof Element ? event.target.closest('button') : null;
    if (isSubmitButton(direct)) return;

    const x = event.clientX;
    const y = event.clientY;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const button = Array.from(document.querySelectorAll('button')).find((candidate) => {
      if (!isSubmitButton(candidate)) return false;
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    });

    if (button && !button.disabled) button.click();
  }, true);
};

export { installTournamentSubmitClickFix };
