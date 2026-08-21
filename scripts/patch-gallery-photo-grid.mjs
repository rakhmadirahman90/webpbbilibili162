import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');
const original = source;

// Replace the complete old album block instead of depending on the old
// thumbnail markup. This makes the layout stable across previous patches.
function findMatchingDivEnd(text, start) {
  let depth = 0;
  const tagRe = /<div\b[^>]*>|<\/div\s*>/g;
  tagRe.lastIndex = start;
  let match;
  while ((match = tagRe.exec(text))) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return match.index + match[0].length;
    } else {
      depth += 1;
    }
  }
  return -1;
}

const albumClass = 'gallery-album-grid';
const albumStart = source.indexOf(albumClass);
if (albumStart >= 0) {
  const openStart = source.lastIndexOf('<div', albumStart);
  const openEnd = source.indexOf('>', albumStart);
  if (openStart >= 0 && openEnd > openStart) {
    const closeEnd = findMatchingDivEnd(source, openStart);
    if (closeEnd > openStart) {
      const oldBlock = source.slice(openStart, closeEnd);
      const newBlock = `<div className="max-w-5xl mx-auto px-5 sm:px-8 pb-6" data-gallery-photo-grid="true">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {images.map((img, idx) => (
                        <button
                          key={\`${activeMedia.id}-album-${idx}\`}
                          type="button"
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
                  </div>`;
      source = source.replace(oldBlock, newBlock);
    }
  }
}

// Restore the album's existing text: category, share action, title and
// description must remain visible above the photo album.
const detailBlock = `                <div data-gallery-title-before-album="true">
                  <div className="max-w-5xl mx-auto px-5 sm:px-8 py-6 sm:py-8">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{activeMedia.category || 'DOKUMENTASI'}</span>
                      <button onClick={() => handleShare(activeMedia, 'copy')} className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"><Link2 size={14} /> {copySuccess === activeMedia.id ? 'Tersalin' : 'Salin Link'}</button>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight mb-3">{activeMedia.title}</h2>
                    {activeMedia.description && <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{activeMedia.description}</p>}
                  </div>
                </div>`;

if (!source.includes('data-gallery-title-before-album="true"')) {
  const photoAreaMarker = '                <div className="w-full bg-[#030712] relative h-[38vh] sm:h-[48vh] md:h-[58vh] lg:h-[65vh] overflow-hidden flex items-center justify-center border-b border-slate-900/40">';
  const markerIndex = source.indexOf(photoAreaMarker);
  if (markerIndex >= 0) {
    source = source.slice(0, markerIndex) + detailBlock + '\n\n' + source.slice(markerIndex);
  }
}

if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-gallery-photo-grid] restored album text and replaced thumbnail strip with clickable photo grid');
} else {
  console.log('[patch-gallery-photo-grid] no changes needed');
}
