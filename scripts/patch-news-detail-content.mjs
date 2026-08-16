import fs from 'node:fs';

const path = 'src/components/News.tsx';
let source = fs.readFileSync(path, 'utf8');

if (!source.includes('PB_ARTICLE_BODY_RESTORE_V1')) {
  const marker = /(<h[1-6][^>]*>\s*)BERI APRESIASI BERITA INI/;
  if (!marker.test(source)) throw new Error('News appreciation heading marker not found');

  const articleBlock = `\n                    {/* PB_ARTICLE_BODY_RESTORE_V1: restore complete article detail content */}\n                    {selectedNews && (\n                      <article className="w-full mb-8 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">\n                        {getNewsImages(selectedNews).length > 0 && (\n                          <div className="w-full bg-slate-100">\n                            <img\n                              src={getNewsImages(selectedNews)[0]}\n                              alt={selectedNews.judul}\n                              className="block w-full max-h-[520px] object-cover cursor-zoom-in"\n                              loading="eager"\n                              onClick={() => { setLightboxIndex(0); setIsLightboxOpen(true); }}\n                            />\n                          </div>\n                        )}\n                        <div className="px-5 py-6 sm:px-8 sm:py-8">\n                          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-600">\n                            {selectedNews.kategori || 'BERITA'}\n                          </div>\n                          <h1 className="mb-4 text-2xl sm:text-3xl font-black leading-tight text-slate-900">\n                            {selectedNews.judul}\n                          </h1>\n                          <div className="mb-6 text-sm font-semibold text-slate-500">\n                            {formatJournalisticDate(selectedNews.tanggal).publisher} · {formatJournalisticDate(selectedNews.tanggal).fullDateline}\n                          </div>\n                          {selectedNews.ringkasan && (\n                            <p className="mb-6 text-base sm:text-lg font-medium leading-7 text-slate-600">\n                              {selectedNews.ringkasan}\n                            </p>\n                          )}\n                          <div className="prose prose-slate max-w-none whitespace-pre-wrap text-base leading-8 text-slate-800">\n                            {(selectedNews.konten || '').replace(/<[^>]*>/g, '') || 'Isi berita belum tersedia.'}\n                          </div>\n                        </div>\n                      </article>\n                    )}\n`;

  source = source.replace(marker, `${articleBlock}$1BERI APRESIASI BERITA INI`);
  fs.writeFileSync(path, source);
  console.log('Restored article detail content block.');
} else {
  console.log('Article detail content block already present.');
}
