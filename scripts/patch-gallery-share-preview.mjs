import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

// Always replace the runtime share handler during Vercel build. The source file
// has historically contained older handlers, so this is deliberately versioned
// and whitespace-tolerant.
const start = source.indexOf('const handleShare =');
const end = source.indexOf('const goToImage =', start);

if (start < 0 || end <= start) {
  console.error('[patch-gallery-share-preview] handleShare block not found');
  process.exit(1);
}

const replacement = `const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const activityTitle = String(item.title || '').replace(/\\s+/g, ' ').trim() || 'Dokumentasi PB Bilibili 162';
    // v20: share the public preview endpoint so WhatsApp gets the same title/photo
    // that the crawler sees. The endpoint itself reads the current gallery.title.
    const currentUrl = window.location.origin + '/api/share-galeri?id=' + encodeURIComponent(item.id) + '&v=20';
    const shareText = 'Lihat dokumentasi "' + activityTitle + '" dari PB Bilibili 162:' + '\\n' + currentUrl;

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
console.log('[patch-gallery-share-preview] v20: actual photo title + fresh preview URL applied');
