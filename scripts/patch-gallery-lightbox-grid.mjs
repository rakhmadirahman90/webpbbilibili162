import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/Gallery.tsx');
if (!fs.existsSync(file)) {
  console.log('[patch-gallery-lightbox-grid] Gallery.tsx not found; skipping.');
  process.exit(0);
}

let source = fs.readFileSync(file, 'utf8');

// Replace the lightbox's horizontal thumbnail strip, regardless of harmless
// class-name changes made by earlier build-time gallery patches.
const pattern = /\n\s*\{activeMedia\.type === 'image' && count > 1 && \(\n\s*<div className=\"max-w-[^\"]+ mx-auto px-4 sm:px-6 pt-4\">[\s\S]*?<\/div>\n\s*\)\}\n\s*(?=<div className=\"max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-8\">)/;

const replacement = `

                {activeMedia.type === 'image' && count > 1 && (
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-2">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Album Foto</p>
                        <p className="text-sm font-extrabold text-slate-800">{count} foto dokumentasi</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Foto {activeImgIndex + 1} dipilih</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {images.map((img, idx) => (
                        <button
                          key={activeMedia.id + '-grid-' + idx}
                          onClick={() => setActiveImgIndex(idx)}
                          className={\`group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${idx === activeImgIndex ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent hover:border-slate-300'}\`}
                          aria-label={'Buka foto ' + (idx + 1)}
                        >
                          <img
                            src={getOptimizedImageUrl(img, 520)}
                            alt={'Foto ' + (idx + 1) + ' dari ' + count}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute left-2 bottom-2 min-w-7 h-7 px-2 rounded-full bg-black/75 text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                          {idx === activeImgIndex && <span className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Terpilih</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
`;

if (!pattern.test(source)) {
  console.log('[patch-gallery-lightbox-grid] Target thumbnail strip not found; no change needed.');
  process.exit(0);
}

source = source.replace(pattern, replacement);
fs.writeFileSync(file, source, 'utf8');
console.log('[patch-gallery-lightbox-grid] Gallery lightbox photo grid applied.');
