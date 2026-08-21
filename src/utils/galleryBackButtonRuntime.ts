// Hard runtime fallback for Gallery detail navigation.
// The control is mounted directly on document.body so it cannot be hidden
// by the Gallery header layout, Tailwind responsive classes, or overflow rules.
if (typeof window !== 'undefined') {
  const BUTTON_ID = 'gallery-back-runtime-fixed';

  const installGalleryBackButton = () => {
    const lightbox = document.querySelector<HTMLElement>('.gallery-lightbox');
    const existing = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;

    if (!lightbox) {
      existing?.remove();
      return;
    }

    const original = lightbox.querySelector<HTMLButtonElement>('button[aria-label="Kembali"]');
    let button = existing;

    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.setAttribute('aria-label', 'Kembali ke Daftar Foto');
      button.setAttribute('title', 'Kembali ke Daftar Foto');
      button.textContent = '←';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (original) original.click();
        else window.history.back();
      });
      document.body.appendChild(button);
    }

    // Compact icon-only control. It sits below the main navbar so it does
    // not cover the site logo, navigation, or mobile sidebar controls.
    button.style.setProperty('display', 'flex', 'important');
    button.style.setProperty('position', 'fixed', 'important');
    button.style.setProperty('top', window.innerWidth < 768 ? '76px' : '82px', 'important');
    button.style.setProperty('left', window.innerWidth < 768 ? '12px' : '18px', 'important');
    button.style.setProperty('right', 'auto', 'important');
    button.style.setProperty('bottom', 'auto', 'important');
    button.style.setProperty('z-index', '2147483647', 'important');
    button.style.setProperty('visibility', 'visible', 'important');
    button.style.setProperty('opacity', '1', 'important');
    button.style.setProperty('width', window.innerWidth < 768 ? '44px' : '46px', 'important');
    button.style.setProperty('height', window.innerWidth < 768 ? '44px' : '46px', 'important');
    button.style.setProperty('min-width', window.innerWidth < 768 ? '44px' : '46px', 'important');
    button.style.setProperty('min-height', window.innerWidth < 768 ? '44px' : '46px', 'important');
    button.style.setProperty('padding', '0', 'important');
    button.style.setProperty('margin', '0', 'important');
    button.style.setProperty('box-sizing', 'border-box', 'important');
    button.style.setProperty('align-items', 'center', 'important');
    button.style.setProperty('justify-content', 'center', 'important');
    button.style.setProperty('font-family', 'Arial, sans-serif', 'important');
    button.style.setProperty('font-size', window.innerWidth < 768 ? '24px' : '25px', 'important');
    button.style.setProperty('font-weight', '900', 'important');
    button.style.setProperty('line-height', '1', 'important');
    button.style.setProperty('color', '#ffffff', 'important');
    button.style.setProperty('background', '#0f172a', 'important');
    button.style.setProperty('border', '2px solid #ffffff', 'important');
    button.style.setProperty('border-radius', '9999px', 'important');
    button.style.setProperty('box-shadow', '0 4px 16px rgba(0,0,0,.55)', 'important');
    button.style.setProperty('cursor', 'pointer', 'important');
    button.style.setProperty('pointer-events', 'auto', 'important');
  };

  const observer = new MutationObserver(installGalleryBackButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', installGalleryBackButton);
  window.setTimeout(installGalleryBackButton, 0);
}
