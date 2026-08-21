import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
const source = fs.readFileSync(file, 'utf8');

const from = "const currentUrl = `${window.location.origin}?gallery=${encodeURIComponent(item.id)}`;";
const to = "const publicDomain = 'https://pbilibili162.99apps.id';\n    const currentUrl = `${publicDomain}/?gallery=${encodeURIComponent(item.id)}&share=v1`;";

if (source.includes(to)) {
  console.log('[patch-gallery-share-preview] already patched to v1');
} else if (source.includes(from)) {
  fs.writeFileSync(file, source.replace(from, to));
  console.log('[patch-gallery-share-preview] gallery share URL now uses server-side OG preview');
} else {
  console.log('[patch-gallery-share-preview] target not found; no change needed');
}
