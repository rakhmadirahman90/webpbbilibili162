import fs from 'node:fs';

const file = 'src/components/News.tsx';
let source = fs.readFileSync(file, 'utf8');

const start = source.indexOf("  const handleShare = async (news: Berita, platform: 'wa' | 'wa_link' | 'fb' | 'x' | 'copy' | 'native') => {");
const end = source.indexOf('\n\n  return (', start);

if (start < 0 || end <= start) {
  console.error('[patch-news-share-preview] handleShare block not found');
  process.exit(1);
}

const replacement = `  const handleShare = async (news: Berita, platform: 'wa' | 'wa_link' | 'fb' | 'x' | 'copy' | 'native') => {
    const publicDomain = 'https://pbilibili162.99apps.id';
    const shareUrl = publicDomain + '/berita?newsId=' + encodeURIComponent(news.id) + '&share=news-v2';
    const titleClean = String(news.judul || 'Berita PB Bilibili 162').trim();

    // WhatsApp reads the primary photo from the server-side OG metadata at
    // /api/share-berita. The message itself is intentionally simple: title,
    // followed by the direct article URL. This lets the WA preview card show
    // the uploaded primary photo instead of the PB Bilibili logo.
    const waText = titleClean + '\\n' + shareUrl;

    if (platform === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: titleClean,
          text: titleClean,
          url: shareUrl,
        });
        return;
      } catch (err) {
        console.warn('[news-share] native share canceled or unavailable', err);
      }
    }

    switch (platform) {
      case 'wa':
      case 'wa_link':
        window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(waText), '_blank');
        break;
      case 'fb':
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl), '_blank');
        break;
      case 'x':
        window.open('https://twitter.com/intent/tweet?text=' + encodeURIComponent(titleClean) + '&url=' + encodeURIComponent(shareUrl), '_blank');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopySuccess(news.id);
          setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
          console.error('Gagal menyalin tautan', err);
        }
        break;
    }
  };`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-news-share-preview] v2 applied: primary photo OG preview + title + direct link');
