import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');

const startMarker = "  const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {";
const endMarker = '  const goToImage = (index: number, count: number) => {';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);

if (start < 0 || end <= start) {
  console.log('[patch-gallery-share-preview] handleShare block not found; no change needed');
  process.exit(0);
}

const replacement = `  const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const publicDomain = 'https://pbilibili162.99apps.id';
    // Use the normal gallery route with the gallery query so one click opens
    // the selected album/photo detail directly. Do not route users through an
    // intermediate /api/share-galeri page.
    const currentUrl = \`${publicDomain}/galeri?gallery=\${encodeURIComponent(item.id)}&share=v5\`;

    // Some legacy records use a generic title such as "Dokumentasi PB Bilibili 162".
    // Prefer the real activity title/description for the WhatsApp message.
    const rawTitle = (item.title || '').trim();
    const rawDescription = (item.description || '').trim();
    const isGenericTitle = !rawTitle || /^(dokumentasi(?: pb bilibili 162)?|photo gallery|gallery)$/i.test(rawTitle);
    const activityTitle = isGenericTitle
      ? (rawDescription || item.category || 'Dokumentasi PB Bilibili 162')
      : rawTitle;

    const shareText = \`Lihat dokumentasi "\${activityTitle}" dari PB Bilibili 162:\\n\${currentUrl}\`;
    if (platform === 'wa') window.open(\`https://api.whatsapp.com/send?text=\${encodeURIComponent(shareText)}\`, '_blank');
    if (platform === 'fb') window.open(\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(currentUrl)}\`, '_blank');
    if (platform === 'copy') navigator.clipboard?.writeText(currentUrl).then(() => { setCopySuccess(item.id); window.setTimeout(() => setCopySuccess(null), 2000); });
  };
`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-gallery-share-preview] direct gallery detail URL + activity title sharing applied');
