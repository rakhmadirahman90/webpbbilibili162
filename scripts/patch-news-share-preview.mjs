import './patch-public-news-mobile-detail.mjs';
import fs from 'node:fs';

const file = 'src/components/News.tsx';
const source = fs.readFileSync(file, 'utf8');
const targets = [
  ["const shareUrl = `${publicDomain}/berita?newsId=${news.id}`;", "const shareUrl = `${publicDomain}/berita?newsId=${news.id}&share=v4`;"],
  ["const shareUrl = `${publicDomain}/berita?newsId=${news.id}&share=v3`;", "const shareUrl = `${publicDomain}/berita?newsId=${news.id}&share=v4`;"]
];

let updated = source;
for (const [from, to] of targets) {
  if (updated.includes(from)) updated = updated.replace(from, to);
}

if (updated !== source) {
  fs.writeFileSync(file, updated);
  console.log('[patch-news-share-preview] share URL versioned to v4 to force a fresh WhatsApp preview');
} else if (source.includes('&share=v4')) {
  console.log('[patch-news-share-preview] already patched to v4');
} else {
  console.log('[patch-news-share-preview] target not found; no change needed');
}
