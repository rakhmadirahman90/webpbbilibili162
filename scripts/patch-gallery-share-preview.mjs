import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

// v16: keep the client WhatsApp text and crawler OG preview on a fresh
// versioned URL. Include the gallery description/news text in the message;
// the server OG endpoint exposes the same description plus the main photo.
const start = source.indexOf('const handleShare =');
const end = source.indexOf('const goToImage =', start);

if (start < 0 || end <= start) {
  console.error('[patch-gallery-share-preview] handleShare block not found');
  process.exit(1);
}

const replacement = `const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const activityTitle = String(item.title || item.description || item.category || 'Dokumentasi PB Bilibili 162').replace(/\\s+/g, ' ').trim();
    const activityDescription = String(item.description || '').replace(/\\s+/g, ' ').trim();
    // v16: root share URL is rewritten to /api/share-galeri for crawlers.
    // The API supplies OG title, news/description text and the main photo.
    const currentUrl = window.location.origin + '/?gallery=' + encodeURIComponent(item.id) + '&share=v16&v=16';
    const shareText = 'Lihat dokumentasi "' + activityTitle + '" dari PB Bilibili 162:' + (activityDescription ? '\\n\\n' + activityDescription : '') + '\\n\\n' + currentUrl;

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
console.log('[patch-gallery-share-preview] v16 share handler applied successfully');
