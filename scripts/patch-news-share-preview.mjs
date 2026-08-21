import fs from 'node:fs';

const file = 'src/components/News.tsx';
const source = fs.readFileSync(file, 'utf8');
const from = "const shareUrl = `${publicDomain}/berita?newsId=${news.id}`;";
const to = "const shareUrl = `${publicDomain}/berita?newsId=${news.id}&share=v3`;";

if (source.includes(to)) {
  console.log('[patch-news-share-preview] already patched');
} else if (source.includes(from)) {
  fs.writeFileSync(file, source.replace(from, to));
  console.log('[patch-news-share-preview] share URL versioned to refresh WhatsApp preview cache');
} else {
  console.log('[patch-news-share-preview] target not found; no change needed');
}
