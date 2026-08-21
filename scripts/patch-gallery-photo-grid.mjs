import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');
const original = source;

// Remove the old horizontal thumbnail strip. The full album will be shown as
// a proper photo grid below the album title, with every photo independently clickable.
source = source.replace(/\n\s*\{activeMedia\.type === 'image' && count > 1 && \(\n\s*<div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">[\s\S]*?\n\s*\)\}\n\n(?=\s*<div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-8">)/, '\n\n');

const albumGrid = `
                  {activeMedia.type === 'image' && count > 1 && (
                    <div className="max-w-5xl mx-auto px-5 sm:px-8 pb-2" data-gallery-photo-grid="true">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                        {images.map((img, idx) => (
                          <button
                            key={\`${activeMedia.id}-album-${idx}\`}
                            onClick={() => setActiveImgIndex(idx)}
                            className={\`group relative overflow-hidden rounded-xl bg-slate-100 border-2 transition-all aspect-[4/3] \${idx === activeImgIndex ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent hover:border-slate-300'}\`}
                            aria-label={\`Buka foto \${idx + 1}\`}
                          >
                            <img
                              src={getOptimizedImageUrl(img, 500)}
                              alt={\`${activeMedia.title || 'Foto'} - Foto \${idx + 1}\`}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
`;

// Put the complete photo grid immediately below the album title.
const titleMarker = '                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight mb-3">{activeMedia.title}</h2>';
if (!source.includes('data-gallery-photo-grid="true"') && source.includes(titleMarker)) {
  source = source.replace(titleMarker, titleMarker + albumGrid);
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-gallery-photo-grid] clickable album photo grid applied');
} else {
  console.log('[patch-gallery-photo-grid] no changes needed');
}
