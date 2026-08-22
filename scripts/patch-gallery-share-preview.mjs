import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

// v11: make the WhatsApp message deterministic and independent of any
// previously generated share URL or stale client bundle.
const start = source.indexOf('const handleShare =');
const end = source.indexOf('const goToImage =', start);

if (start < 0 || end <= start) {
  console.error('[patch-gallery-share-preview] handleShare block not found');
  process.exit(1);
}

const replacement = `const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const activityTitle = String(item.title || item.description || item.category || 'Dokumentasi PB Bilibili 162').trim();
    // v11: public root URL is intentionally used so Vercel can serve the
    // crawler-specific /api/share-galeri OG preview while normal users are
    // redirected back to the gallery detail page.
    const currentUrl = window.location.origin + '/?gallery=' + encodeURIComponent(item.id) + '&share=v11';
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
console.log('[patch-gallery-share-preview] v11 share handler applied successfully');
