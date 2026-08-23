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

const replacement = `const handleShare = async (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const activityTitle = String(item.title || '').replace(/\\s+/g, ' ').trim() || 'Dokumentasi PB Bilibili 162';
    const currentUrl = window.location.origin + '/api/share-galeri?id=' + encodeURIComponent(item.id) + '&v=22';
    const shareText = 'Lihat dokumentasi "' + activityTitle + '" dari PB Bilibili 162:' + '\\n' + currentUrl;

    if (platform === 'wa') {
      // WhatsApp must receive the photo as an actual File and the caption/link
      // in the same Web Share operation. The same-origin API proxy avoids CORS
      // restrictions from Supabase Storage and guarantees the primary photo can
      // be downloaded by Android Chrome before opening WhatsApp.
      if (item.type === 'image' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          const imageUrl = window.location.origin + '/api/gallery-share-image?id=' + encodeURIComponent(item.id);
          const response = await fetch(imageUrl, { cache: 'no-store' });
          if (!response.ok) throw new Error('Image proxy HTTP ' + response.status);
          const blob = await response.blob();
          if (!blob.type || !blob.type.toLowerCase().startsWith('image/')) throw new Error('Primary media is not an image');
          const extension = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
          const safeName = activityTitle.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'PB-Bilibili-162';
          const fileToShare = new File([blob], safeName + '.' + extension, { type: blob.type });
          const shareData = { files: [fileToShare], text: shareText };
          const supported = typeof navigator.canShare !== 'function' || navigator.canShare({ files: [fileToShare] });
          if (supported) {
            await navigator.share(shareData);
            return;
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          console.warn('[gallery-share] Native image share failed; falling back to link share', error);
        }
      }

      // Fallback for browsers without file-sharing support. This keeps the
      // working title + link behavior, while supported Android browsers use the
      // single-message image + caption path above.
      window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(shareText), '_blank');
      return;
    }

    if (platform === 'fb') {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(currentUrl), '_blank');
    }
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(currentUrl);
        setCopySuccess(item.id);
        window.setTimeout(() => setCopySuccess(null), 2000);
      } catch (error) {
        console.error('Gagal menyalin tautan galeri:', error);
      }
    }
  };
  `;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-gallery-share-preview] v22: primary photo attachment + caption/link in one WhatsApp share');
