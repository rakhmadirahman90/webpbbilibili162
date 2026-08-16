import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/Gallery.tsx');
const source = fs.readFileSync(file, 'utf8');

// Gallery.tsx is now maintained directly in source control and reads public.gallery.
// This build-time hook must be idempotent and must never fail the production build
// merely because an older patch marker is no longer present.
const readsPublicGallery = /\.from\(['"]gallery['"]\)/.test(source);
const usesLegacyGallerySource = /gallery_list|DEFAULT_GALLERY|getSiteSetting\(/.test(source);

if (readsPublicGallery && !usesLegacyGallerySource) {
  console.log('[patch-gallery-remote-read] Gallery already reads public.gallery; no patch needed.');
  process.exit(0);
}

// Safety fallback for older branches: do not perform blind text replacement.
// The source file must be updated intentionally if its structure differs.
console.warn('[patch-gallery-remote-read] No safe patch applied. Gallery source requires manual migration.');
process.exit(0);
