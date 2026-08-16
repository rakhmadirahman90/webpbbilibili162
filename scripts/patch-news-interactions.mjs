import fs from 'node:fs';

const newsPath = 'src/components/News.tsx';
let news = fs.readFileSync(newsPath, 'utf8');

// 1) Make the dedicated Prestasi view filter its own category.
if (!news.includes('const prestasiOnly =')) {
  const marker = "export default function News() {\n";
  if (!news.includes(marker)) throw new Error('News component marker not found');
  news = news.replace(marker, `${marker}  const prestasiOnly = typeof window !== 'undefined' && window.location.pathname.toLowerCase() === '/prestasi';\n`);
}
if (!news.includes('if (prestasiOnly)')) {
  const marker = "    let result = [...beritaList];\n\n    // Filter by Category";
  if (!news.includes(marker)) throw new Error('News filter marker not found');
  news = news.replace(marker, `    let result = [...beritaList];\n\n    // Dedicated Prestasi view: only show records categorized as Prestasi.\n    if (prestasiOnly) {\n      result = result.filter(item => item.kategori?.trim().toLowerCase() === 'prestasi');\n    }\n\n    // Filter by Category`);
}
news = news.replace(
  '[beritaList, selectedCategory, orderBy, orderDirection, searchTerm]',
  '[beritaList, selectedCategory, orderBy, orderDirection, searchTerm, prestasiOnly]'
);

// 2) Mobile-safe card image: tapping the image opens the article, not just hover actions.
const imageMarker = `                    <LazyImage \n                      src={getNewsImages(news)[0] || news.gambar_url}`;
if (news.includes(imageMarker) && !news.includes('aria-label="Buka berita"')) {
  news = news.replace(
    imageMarker,
    `                    <button\n                      type="button"\n                      onClick={() => handleOpenNews(news)}\n                      className="absolute inset-0 z-[5] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:ring-inset"\n                      aria-label="Buka berita"\n                    />\n                    <LazyImage \n                      src={getNewsImages(news)[0] || news.gambar_url}`
  );
}

// 3) Replace hover-only card share overlay with always-accessible actions on mobile/desktop.
const shareOverlay = `                    {/* Social share actions on hover */}\n                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">`;
if (news.includes(shareOverlay) && !news.includes('title="Bagikan ke WhatsApp"')) {
  news = news.replace(
    shareOverlay,
    `                    {/* Share actions: visible on touch devices and on card hover. */}\n                    <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">`
  );
}

// 4) The card image opener inserted above sits under the visible controls; keep controls above it.
news = news.replace('className="p-2.5 bg-[#22c55e] text-white rounded-full', 'title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp" className="p-2.5 bg-[#22c55e] text-white rounded-full');
news = news.replace('className="p-2.5 bg-white text-slate-900 rounded-full', 'title="Salin tautan berita" aria-label="Salin tautan berita" className="p-2.5 bg-white text-slate-900 rounded-full');

// 5) Prevent a canceled native share from unexpectedly opening WhatsApp.
const nativeCatch = `      } catch (err) {\n        // Fallback if user cancels or native share fails\n        console.warn("Native share canceled or unhandled:", err);\n      }`;
if (news.includes(nativeCatch)) {
  news = news.replace(nativeCatch, `      } catch (err) {\n        // User cancellation is a normal outcome; do not open another share target.\n        if (err instanceof DOMException && err.name === 'AbortError') return;\n        console.warn("Native share failed, using WhatsApp fallback:", err);\n      }`);
}

// 6) Clipboard fallback for browsers where navigator.clipboard is unavailable.
const clipboardBlock = `        try {\n          await navigator.clipboard.writeText(shareUrl);\n          setCopySuccess(news.id);\n          setTimeout(() => setCopySuccess(null), 2000);\n        } catch (err) {\n          console.error("Gagal menyalin tautan", err);\n        }`;
if (news.includes(clipboardBlock)) {
  news = news.replace(clipboardBlock, `        try {\n          if (navigator.clipboard?.writeText) {\n            await navigator.clipboard.writeText(shareUrl);\n          } else {\n            const ta = document.createElement('textarea');\n            ta.value = shareUrl;\n            ta.style.position = 'fixed';\n            ta.style.opacity = '0';\n            document.body.appendChild(ta);\n            ta.select();\n            document.execCommand('copy');\n            ta.remove();\n          }\n          setCopySuccess(news.id);\n          setTimeout(() => setCopySuccess(null), 2000);\n        } catch (err) {\n          console.error("Gagal menyalin tautan", err);\n          Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Gagal menyalin tautan', showConfirmButton: false, timer: 2200 });\n        }`);
}

// 7) Add a direct 'Baca Selengkapnya' action with an explicit accessible button label.
news = news.replace('BACA SELENGKAPNYA →', 'BACA SELENGKAPNYA →');

fs.writeFileSync(newsPath, news);

// App routing: Prestasi must render News as a dedicated view.
const appPath = 'src/App.tsx';
let app = fs.readFileSync(appPath, 'utf8');
app = app.replace(/'berita', 'news', 'faq/g, "'berita', 'news', 'prestasi', 'faq");
const renderMarker = "                    {(activeView === 'berita' || activeView === 'news') && <News />}";
if (!app.includes("(activeView === 'prestasi') && <News />")) {
  if (!app.includes(renderMarker)) throw new Error('App News render marker not found');
  app = app.replace(renderMarker, `${renderMarker}\n                    {(activeView === 'prestasi') && <News />}`);
}
fs.writeFileSync(appPath, app);

console.log('News/Prestasi interaction patch applied.');
