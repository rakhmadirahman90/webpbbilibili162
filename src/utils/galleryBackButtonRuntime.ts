// Runtime fallback for the Gallery detail back control.
// This intentionally creates a real DOM button so the navigation cannot be
// hidden by Tailwind/global CSS rules applied to the original JSX button.
if (typeof window !== 'undefined') {
  const installGalleryBackButton = () => {
    document.querySelectorAll<HTMLElement>('.gallery-lightbox').forEach(lightbox => {
      const header = lightbox.firstElementChild as HTMLElement | null;
      if (!header) return;

      const original = header.querySelector<HTMLButtonElement>('button[aria-label="Kembali"]');
      if (original) {
        original.style.setProperty('display', 'inline-flex', 'important');
        original.style.setProperty('visibility', 'visible', 'important');
        original.style.setProperty('opacity', '1', 'important');
        original.style.setProperty('min-width', '235px', 'important');
      }

      let button = header.querySelector<HTMLButtonElement>('[data-gallery-back-runtime="true"]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-gallery-back-runtime', 'true');
        button.setAttribute('aria-label', 'Kembali ke Daftar Foto');
        button.innerHTML = '<span aria-hidden="true" style="font-size:20px;line-height:1">←</span><span>Kembali ke Daftar Foto</span>';
        button.addEventListener('click', () => {
          if (original) {
            original.click();
          } else {
            window.history.back();
          }
        });
        header.insertBefore(button, header.firstChild);
      }

      button.style.setProperty('display', 'inline-flex', 'important');
      button.style.setProperty('visibility', 'visible', 'important');
      button.style.setProperty('opacity', '1', 'important');
      button.style.setProperty('align-items', 'center', 'important');
      button.style.setProperty('justify-content', 'center', 'important');
      button.style.setProperty('gap', '8px', 'important');
      button.style.setProperty('min-width', window.innerWidth < 768 ? '205px' : '235px', 'important');
      button.style.setProperty('min-height', '44px', 'important');
      button.style.setProperty('padding', '8px 14px', 'important');
      button.style.setProperty('margin', '0', 'important');
      button.style.setProperty('background', '#1e293b', 'important');
      button.style.setProperty('color', '#ffffff', 'important');
      button.style.setProperty('border', '1px solid rgba(255,255,255,.25)', 'important');
      button.style.setProperty('border-radius', '10px', 'important');
      button.style.setProperty('font-size', window.innerWidth < 768 ? '11px' : '12px', 'important');
      button.style.setProperty('font-weight', '900', 'important');
      button.style.setProperty('white-space', 'nowrap', 'important');
      button.style.setProperty('z-index', '99999999', 'important');
      button.style.setProperty('position', 'relative', 'important');
      button.style.setProperty('cursor', 'pointer', 'important');
    });
  };

  const observer = new MutationObserver(installGalleryBackButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', installGalleryBackButton);
  window.setTimeout(installGalleryBackButton, 0);
}
