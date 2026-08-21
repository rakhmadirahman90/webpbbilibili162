import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');
const original = source;

// Mobile gallery detail: show the complete album below the title/description.
const hiddenAlbum = '{images.length > 1 && <div className="hidden sm:block mt-8 pt-6 border-t border-gray-100">';
const visibleAlbum = '{images.length > 1 && <div className="gallery-album-grid mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">';
if (source.includes(hiddenAlbum)) {
  source = source.replace(hiddenAlbum, visibleAlbum);
}

// Add a stable class to the existing album thumbnail container when possible.
source = source.replace(
  '<div className="gallery-album-grid mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">',
  '<div className="gallery-album-grid mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 [&_img]:w-full [&_img]:h-auto [&_img]:object-cover [&_img]:rounded-xl">'
);

// Make the album section responsive without changing the desktop carousel.
if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-gallery-album-mobile] album photos enabled below detail text');
} else {
  console.log('[patch-gallery-album-mobile] no changes needed');
}
