// Hard runtime fallback for Gallery detail navigation.
// Mounted directly on document.body so the control is independent of
// navbar/sidebar layout, overflow containers, and responsive utility classes.
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
      button.setAttribute('data-gallery-back', 'true');
      button.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M15.5 5.5 9 12l6.5 6.5" />
        </svg>
        <span class="sr-only">Kembali ke Daftar Foto</span>
      `;
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (original) original.click();
        else window.history.back();
      });
      document.body.appendChild(button);
    }

    const mobile = window.innerWidth < 768;

    // Modern compact icon control: visually light, touch-friendly, and
    // positioned below the navbar so it never covers the site logo/sidebar.
    button.style.setProperty('display', 'flex', 'important');
    button.style.setProperty('position', 'fixed', 'important');
    button.style.setProperty('top', mobile ? '78px' : '82px', 'important');
    button.style.setProperty('left', mobile ? '12px' : '18px', 'important');
    button.style.setProperty('right', 'auto', 'important');
    button.style.setProperty('bottom', 'auto', 'important');
    button.style.setProperty('z-index', '2147483647', 'important');
    button.style.setProperty('visibility', 'visible', 'important');
    button.style.setProperty('opacity', '1', 'important');
    button.style.setProperty('width', mobile ? '44px' : '46px', 'important');
    button.style.setProperty('height', mobile ? '44px' : '46px', 'important');
    button.style.setProperty('min-width', mobile ? '44px' : '46px', 'important');
    button.style.setProperty('min-height', mobile ? '44px' : '46px', 'important');
    button.style.setProperty('padding', '0', 'important');
    button.style.setProperty('margin', '0', 'important');
    button.style.setProperty('box-sizing', 'border-box', 'important');
    button.style.setProperty('display', 'flex', 'important');
    button.style.setProperty('align-items', 'center', 'important');
    button.style.setProperty('justify-content', 'center', 'important');
    button.style.setProperty('font-family', 'inherit', 'important');
    button.style.setProperty('line-height', '1', 'important');
    button.style.setProperty('color', '#f8fafc', 'important');
    button.style.setProperty('background', 'rgba(15, 23, 42, 0.88)', 'important');
    button.style.setProperty('border', '1px solid rgba(255,255,255,0.18)', 'important');
    button.style.setProperty('border-radius', '50%', 'important');
    button.style.setProperty('box-shadow', '0 8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)', 'important');
    button.style.setProperty('backdrop-filter', 'blur(12px)', 'important');
    button.style.setProperty('-webkit-backdrop-filter', 'blur(12px)', 'important');
    button.style.setProperty('cursor', 'pointer', 'important');
    button.style.setProperty('pointer-events', 'auto', 'important');
    button.style.setProperty('transition', 'transform 160ms ease, background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease', 'important');
    button.style.setProperty('touch-action', 'manipulation', 'important');
    button.style.setProperty('outline', 'none', 'important');

    const svg = button.querySelector('svg');
    if (svg) {
      svg.style.width = mobile ? '21px' : '22px';
      svg.style.height = mobile ? '21px' : '22px';
      svg.style.display = 'block';
      svg.style.fill = 'none';
      svg.style.stroke = 'currentColor';
      svg.style.strokeWidth = '2.25';
      svg.style.strokeLinecap = 'round';
      svg.style.strokeLinejoin = 'round';
      svg.style.pointerEvents = 'none';
    }

    const styleId = 'gallery-back-runtime-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        #${BUTTON_ID}:hover {
          background: rgba(37, 99, 235, 0.96) !important;
          border-color: rgba(147, 197, 253, 0.7) !important;
          box-shadow: 0 10px 28px rgba(37, 99, 235, 0.28), inset 0 1px 0 rgba(255,255,255,0.14) !important;
          transform: translateY(-1px) !important;
        }
        #${BUTTON_ID}:active {
          transform: scale(0.94) !important;
        }
        #${BUTTON_ID}:focus-visible {
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.38), 0 8px 24px rgba(0,0,0,0.28) !important;
        }
        #${BUTTON_ID} .sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
        @media (prefers-reduced-motion: reduce) {
          #${BUTTON_ID} { transition: none !important; }
        }
      `;
      document.head.appendChild(style);
    }
  };

  const observer = new MutationObserver(installGalleryBackButton);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', installGalleryBackButton, { passive: true });
  window.setTimeout(installGalleryBackButton, 0);
}
