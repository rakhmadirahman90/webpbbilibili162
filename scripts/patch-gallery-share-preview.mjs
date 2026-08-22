import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

// v12: keep the client WhatsApp text and crawler OG preview on the same
// versioned URL so WhatsApp cannot keep reusing the previous v4/v11 preview.
const start = source.indexOf('const handleShare =');
const end = source.indexOf('const goToImage =', start);

if (start < 0 || end <= start) {
  console.error('[patch-gallery-share-preview] handleShare block not found');
  process.exit(1);
}

const replacement = `const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const activityTitle = String(item.description || item.title || item.category || 'Dokumentasi PB Bilibili 162').replace(/\\s+/g, ' ').trim();
    // v12: use the public root share URL because /api/share-galeri supplies
    // crawler-specific OG metadata, while normal visitors are redirected to
    // the gallery detail view.
    const currentUrl = window.location.origin + '/?gallery=' + encodeURIComponent(item.id) + '&share=v12';
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
console.log('[patch-gallery-share-preview] v12 share handler applied successfully');
