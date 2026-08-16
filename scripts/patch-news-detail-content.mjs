import fs from 'node:fs';

const path = 'src/components/News.tsx';
let source = fs.readFileSync(path, 'utf8');

// This patch used to abort the entire Vercel build when the old heading marker
// was no longer present. The article detail is already implemented in the
// current News component, so the patch must be idempotent and safe to skip.
if (source.includes('PB_ARTICLE_BODY_RESTORE_V1')) {
  console.log('Article detail content block already present.');
  process.exit(0);
}

const marker = /(<h[1-6][^>]*>\s*)BERI APRESIASI BERITA INI/;
if (!marker.test(source)) {
  console.log('News appreciation heading marker not found; skipping legacy article restore patch.');
  process.exit(0);
}

const articleBlock = `
                    {/* PB_ARTICLE_BODY_RESTORE_V1: restore complete article detail content */}
                    {selectedNews && (
                      <article className="w-full mb-8 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {getNewsImages(selectedNews).length > 0 && (
                          <div className="w-full bg-slate-100">
                            <img
                              src={getNewsImages(selectedNews)[0]}
                              alt={selectedNews.judul}
                              className="block w-full max-h-[520px] object-cover cursor-zoom-in"
                              loading="eager"
                              onClick={() => { setLightboxIndex(0); setIsLightboxOpen(true); }}
                            />
                          </div>
                        )}
                        <div className="px-5 py-6 sm:px-8 sm:py-8">
                          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-600">
                            {selectedNews.kategori || 'BERITA'}
                          </div>
                          <h1 className="mb-4 text-2xl sm:text-3xl font-black leading-tight text-slate-900">
                            {selectedNews.judul}
                          </h1>
                          <div className="mb-6 text-sm font-semibold text-slate-500">
                            {formatJournalisticDate(selectedNews.tanggal).publisher} · {formatJournalisticDate(selectedNews.tanggal).fullDateline}
                          </div>
                          {selectedNews.ringkasan && (
                            <p className="mb-6 text-base sm:text-lg font-medium leading-7 text-slate-600">
                              {selectedNews.ringkasan}
                            </p>
                          )}
                          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-base leading-8 text-slate-800">
                            {(selectedNews.konten || '').replace(/<[^>]*>/g, '') || 'Isi berita belum tersedia.'}
                          </div>
                        </div>
                      </article>
                    )}
`;

source = source.replace(marker, `${articleBlock}$1BERI APRESIASI BERITA INI`);
fs.writeFileSync(path, source);
console.log('Restored article detail content block.');
