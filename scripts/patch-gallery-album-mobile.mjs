import fs from 'node:fs';

const file = 'src/components/Gallery.tsx';
let source = fs.readFileSync(file, 'utf8');
const original = source;

// Mobile gallery detail: show the complete album below the title/description.
const hiddenAlbum = '{images.length > 1 && <div className="hidden sm:block mt-8 pt-6 border-t border-gray-100">';
const visibleAlbum = '{images.length > 1 && <div className="gallery-album-grid mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">';
if (source.includes(hiddenAlbum)) source = source.replace(hiddenAlbum, visibleAlbum);
source = source.replace(
  '<div className="gallery-album-grid mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">',
  '<div className="gallery-album-grid mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100 [&_img]:w-full [&_img]:h-auto [&_img]:object-cover [&_img]:rounded-xl">'
);
if (source !== original) {
  fs.writeFileSync(file, source);
  console.log('[patch-gallery-album-mobile] album photos enabled below detail text');
} else {
  console.log('[patch-gallery-album-mobile] no changes needed');
}

// Restore the news article photo carousel directly below the article text.
const newsFile = 'src/components/News.tsx';
let newsSource = fs.readFileSync(newsFile, 'utf8');
const newsOriginal = newsSource;

const carouselBlock = `                  {/* 3. Supporting Inline Multi-Image Slider/Gallery Carousel */}
                  {newsImages.length > 1 && (
                    <div className="mt-10 pt-8 border-t border-gray-100">
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                          <span>●</span> FOTO DOKUMENTASI TERKAIT
                        </h3>
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">FOTO {activeImgIndex + 1} / {newsImages.length}</span>
                      </div>
                      <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-lg border border-slate-100">
                        <div className="aspect-[16/10] sm:aspect-[16/9] relative cursor-zoom-in" onClick={() => { setLightboxIndex(activeImgIndex); setIsLightboxOpen(true); }}>
                          <img
                            src={getOptimizedImageUrl(newsImages[activeImgIndex], 1200)}
                            alt={selectedNews.judul + ' - Foto ' + (activeImgIndex + 1)}
                            loading="eager"
                            decoding="async"
                            className="w-full h-full object-contain bg-black"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10 pointer-events-none"></div>
                          <button onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === 0 ? newsImages.length - 1 : prev - 1)); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm shadow-lg z-20 active:scale-90" aria-label="Foto sebelumnya"><ChevronLeft size={20} /></button>
                          <button onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === newsImages.length - 1 ? 0 : prev + 1)); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm shadow-lg z-20 active:scale-90" aria-label="Foto berikutnya"><ChevronRight size={20} /></button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-[10px] font-black tracking-wider z-20">FOTO {activeImgIndex + 1} / {newsImages.length}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 overflow-x-auto py-3 px-1 scrollbar-thin snap-x snap-mandatory">
                        {newsImages.map((img, idx) => (
                          <button key={idx} onClick={() => setActiveImgIndex(idx)} className={activeImgIndex === idx ? 'relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden border-2 border-emerald-500 ring-2 ring-emerald-500/20 opacity-100 snap-start transition-all' : 'relative shrink-0 w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden border-2 border-transparent opacity-70 hover:opacity-100 snap-start transition-all'} aria-label={'Buka foto ' + (idx + 1)}>
                            <img src={getOptimizedImageUrl(img, 220)} alt={'Thumbnail foto ' + (idx + 1)} loading="lazy" decoding="async" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <span className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] font-black px-1.5 py-0.5">{idx + 1}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

`;

// Hide the old static documentation grid so only the carousel remains visible.
newsSource = newsSource.replace(
  '<div className="mt-10 pt-8 border-t border-gray-100">\n                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">\n                        <span>●</span> FOTO DOKUMENTASI TERKAIT',
  '<div className="hidden">\n                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">\n                        <span>●</span> FOTO DOKUMENTASI TERKAIT'
);

// Insert the carousel immediately before the reaction section, i.e. directly after article text/photo area.
const marker = '                  {/* 3.5. Dedicated Interactive Reaction / Apresiasi Box */}';
if (!newsSource.includes('Supporting Inline Multi-Image Slider/Gallery Carousel') && newsSource.includes(marker)) {
  newsSource = newsSource.replace(marker, carouselBlock + marker);
}

if (newsSource !== newsOriginal) {
  fs.writeFileSync(newsFile, newsSource);
  console.log('[patch-gallery-album-mobile] news article photo carousel restored below article text');
} else {
  console.log('[patch-gallery-album-mobile] news carousel already restored or target not found');
}
