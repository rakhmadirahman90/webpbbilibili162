const IMAGE_FILE_INPUT = 'input[type="file"]';

function enableGallerySelection(root: ParentNode = document) {
  root.querySelectorAll<HTMLInputElement>(IMAGE_FILE_INPUT).forEach((input) => {
    const accept = (input.getAttribute('accept') || '').toLowerCase();
    if (!accept.includes('image')) return;

    // `capture` forces many mobile browsers directly into the camera.
    // Removing it keeps the normal chooser available: Camera + Gallery/Files.
    if (input.hasAttribute('capture')) input.removeAttribute('capture');
    input.setAttribute('data-gallery-upload', 'true');
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const start = () => enableGallerySelection();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        enableGallerySelection(node as Element);
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export {};
