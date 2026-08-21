// Hard runtime fallback for Gallery detail navigation.
// Mounted directly on document.body so the control is independent of
// navbar/sidebar layout, overflow containers, and responsive utility classes.
if (typeof window !== 'undefined') {
  const BUTTON_ID = 'gallery-back-runtime-fixed';
  const SHARE_BUTTON_ID = 'gallery-whatsapp-share-runtime';

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
  };

  const getGalleryShareUrl = () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('gallery') || params.get('galleryId') || params.get('photoId') || '';
    if (!id) return '';
    return `${window.location.origin}/api/share-galeri?id=${encodeURIComponent(id)}`;
  };

  const installGalleryWhatsAppShare = () => {
    const shareUrl = getGalleryShareUrl();
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('button, a, [role="button"]'));
    const target = candidates.find((element) => {
      if (element.id === SHARE_BUTTON_ID) return true;
      if (element.closest(`#${SHARE_BUTTON_ID}`)) return false;
      const text = (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text === 'salin link' || text.includes('salin link');
    });

    if (!target || !shareUrl) return;
    if (target.id === SHARE_BUTTON_ID) return;

    const button = target.cloneNode(true) as HTMLElement;
    button.id = SHARE_BUTTON_ID;
    button.setAttribute('aria-label', 'Bagikan ke WhatsApp');
    button.setAttribute('title', 'Bagikan ke WhatsApp');
    button.setAttribute('data-gallery-whatsapp-share', 'true');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="width:18px;height:18px;flex:none">
        <path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 8.5c.2-.5.5-.5.8-.1l.8 1c.2.3.2.5 0 .8l-.5.5c.5 1 1.3 1.8 2.3 2.3l.5-.5c.3-.2.5-.2.8 0l1 .8c.4.3.4.6-.1.8-.5.2-1 .2-1.5 0-1.8-.7-3.3-2.2-4-4-.2-.5-.2-1 0-1.5Z" fill="currentColor" stroke="none"/>
      </svg>
      <span>Bagikan ke WhatsApp</span>
    `;

    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const params = new URLSearchParams(window.location.search);
      const id = params.get('gallery') || params.get('galleryId') || params.get('photoId') || '';
      const currentShareUrl = id ? `${window.location.origin}/api/share-galeri?id=${encodeURIComponent(id)}` : shareUrl;
      const title = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || 'Dokumentasi PB Bilibili 162';
      const text = `Lihat dokumentasi "${title}" dari PB Bilibili 162:`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${text}\n${currentShareUrl}`)}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    });

    target.replaceWith(button);
  };

  const styleId = 'gallery-runtime-modern-share-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #${SHARE_BUTTON_ID} { gap: 8px !important; transition: transform 160ms ease, box-shadow 160ms ease, background-color 160ms ease !important; }
      #${SHARE_BUTTON_ID}:hover { transform: translateY(-1px); }
      #${SHARE_BUTTON_ID}:active { transform: scale(.98); }
      #${SHARE_BUTTON_ID}:focus-visible { outline: 3px solid rgba(37,99,235,.25) !important; outline-offset: 2px !important; }
      #${SHARE_BUTTON_ID} svg { display:block; }
    `;
    document.head.appendChild(style);
  }

  const observer = new MutationObserver(() => {
    installGalleryBackButton();
    installGalleryWhatsAppShare();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', installGalleryBackButton, { passive: true });
  window.setTimeout(() => {
    installGalleryBackButton();
    installGalleryWhatsAppShare();
  }, 0);
}
