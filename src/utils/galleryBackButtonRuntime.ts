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
      button.textContent = '←  KEMBALI KE DAFTAR FOTO';
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (original) original.click();
        else window.history.back();
      });
      document.body.appendChild(button);
    }

    // Inline !important styles deliberately bypass all project CSS.
    button.style.setProperty('display', 'flex', 'important');
    button.style.setProperty('position', 'fixed', 'important');
    button.style.setProperty('top', '12px', 'important');
    button.style.setProperty('left', '12px', 'important');
    button.style.setProperty('right', 'auto', 'important');
    button.style.setProperty('bottom', 'auto', 'important');
    button.style.setProperty('z-index', '2147483647', 'important');
    button.style.setProperty('visibility', 'visible', 'important');
    button.style.setProperty('opacity', '1', 'important');
    button.style.setProperty('width', 'auto', 'important');
    button.style.setProperty('height', 'auto', 'important');
    button.style.setProperty('min-width', window.innerWidth < 768 ? '210px' : '245px', 'important');
    button.style.setProperty('min-height', '46px', 'important');
    button.style.setProperty('padding', '10px 16px', 'important');
    button.style.setProperty('margin', '0', 'important');
    button.style.setProperty('box-sizing', 'border-box', 'important');
    button.style.setProperty('align-items', 'center', 'important');
    button.style.setProperty('justify-content', 'center', 'important');
    button.style.setProperty('font-family', 'Arial, sans-serif', 'important');
    button.style.setProperty('font-size', window.innerWidth < 768 ? '11px' : '12px', 'important');
    button.style.setProperty('font-weight', '900', 'important');
    button.style.setProperty('letter-spacing', '0.04em', 'important');
    button.style.setProperty('line-height', '1.2', 'important');
    button.style.setProperty('white-space', 'nowrap', 'important');
    button.style.setProperty('color', '#ffffff', 'important');
    button.style.setProperty('background', '#0f172a', 'important');
    button.style.setProperty('border', '2px solid #ffffff', 'important');
    button.style.setProperty('border-radius', '10px', 'important');
    button.style.setProperty('box-shadow', '0 4px 18px rgba(0,0,0,.55)', 'important');
    button.style.setProperty('cursor', 'pointer', 'important');
    button.style.setProperty('pointer-events', 'auto', 'important');
  };

  const observer = new MutationObserver(installGalleryBackButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', installGalleryBackButton);
  window.setTimeout(installGalleryBackButton, 0);
}
