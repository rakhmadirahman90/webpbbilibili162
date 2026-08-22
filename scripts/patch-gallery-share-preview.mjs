import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

// Mandatory build-time guard. Locate the handler by stable symbol names,
// not whitespace, because Gallery.tsx may be formatted as one line.
const start = source.indexOf('const handleShare =');
const end = source.indexOf('const goToImage =', start);

if (start < 0 || end <= start) {
  console.error('[patch-gallery-share-preview] handleShare block not found');
  process.exit(1);
}

const replacement = `const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    // v10: always use the current gallery item's title in the WhatsApp text.
    // The versioned query also prevents reuse of older shared URLs/handlers.
    const currentUrl = window.location.origin + '/?gallery=' + encodeURIComponent(item.id) + '&share=v10';
    const activityTitle = String(item.title || '').trim() || 'Dokumentasi PB Bilibili 162';
    const shareText = 'Lihat dokumentasi "' + activityTitle + '" dari PB Bilibili 162:\\n' + currentUrl;

    if (platform === 'wa') {
      window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText), '_blank');
    }
    if (platform === 'fb') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(currentUrl), '_blank');
    }
    if (platform === 'copy') {
      navigator.clipboard?.writeText(currentUrl).then(() => {
        setCopySuccess(item.id);
        window.setTimeout(() => setCopySuccess(null), 2000);
      });
    }
  };
  `;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-gallery-share-preview] v10 share handler applied successfully');
