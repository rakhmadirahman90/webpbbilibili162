import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

// Force the final gallery share format at build time. This intentionally
// replaces any older share=v* implementation, so a stale handler cannot ship.
// The public root URL is intentional: Vercel rewrites /?gallery=... to the
// crawler-friendly /api/share-galeri endpoint for WhatsApp/Facebook/etc.
const startMarker = '  const handleShare = (item: GalleryItem, platform: \'wa\' | \'fb\' | \'copy\') => {';
const endMarker = '  const goToImage = (index: number, count: number) => {';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end <= start) {
  console.log('[patch-gallery-share-preview] handleShare block not found; skipping');
  process.exit(0);
}

const replacement = `  const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const currentUrl = window.location.origin + '/?gallery=' + encodeURIComponent(item.id) + '&share=v7';
    const activityTitle = (item.title || item.description || item.category || 'Dokumentasi PB Bilibili 162').trim();
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
console.log('[patch-gallery-share-preview] forced v7 root gallery URL + actual activity title');
