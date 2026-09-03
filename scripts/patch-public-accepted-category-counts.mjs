import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

const countMarker = "  const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);";
const countBlock = `  const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);
  const categoryCounts = useMemo(() => {
    let cc = 0;
    let adBc = 0;
    for (const row of rows) {
      const code = categoryCode(clean(row.kategori));
      if (code === 'CC') cc += 1;
      if (code === 'AD/BC-/C+C') adBc += 1;
    }
    return { cc, adBc };
  }, [rows]);`;

if (!src.includes('const categoryCounts = useMemo')) {
  if (src.includes(countMarker)) {
    src = src.replace(countMarker, countBlock);
  } else {
    console.warn('[patch-public-accepted-category-counts] Category count marker not found; leaving current source unchanged.');
  }
}

const headerMarker = `        </section>\n\n        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-2.5 shadow-xl sm:p-3">`;
const statsBlock = `        </section>\n\n        <section className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">\n          <div className="relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/[.10] via-slate-900/80 to-slate-950 p-3.5 shadow-xl sm:p-4">\n            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl" />\n            <div className="relative flex items-center justify-between gap-3">\n              <div className="min-w-0">\n                <p className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-300">Ganda Putra CC Lokal Parepare</p>\n                <p className="mt-1 text-[10px] font-semibold text-slate-500">Peserta diterima</p>\n              </div>\n              <div className="shrink-0 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-center">\n                <span className="block text-2xl font-black leading-none text-emerald-300 sm:text-3xl">{categoryCounts.cc}</span>\n                <span className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-emerald-200/70">Pasangan</span>\n              </div>\n            </div>\n          </div>\n          <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[.10] via-slate-900/80 to-slate-950 p-3.5 shadow-xl sm:p-4">\n            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />\n            <div className="relative flex items-center justify-between gap-3">\n              <div className="min-w-0">\n                <p className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300">Ganda Putra AD/BC-/C+C Ajatappareng</p>\n                <p className="mt-1 text-[10px] font-semibold text-slate-500">Peserta diterima</p>\n              </div>\n              <div className="shrink-0 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-center">\n                <span className="block text-2xl font-black leading-none text-amber-300 sm:text-3xl">{categoryCounts.adBc}</span>\n                <span className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-amber-200/70">Pasangan</span>\n              </div>\n            </div>\n          </div>\n        </section>\n\n        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-2.5 shadow-xl sm:p-3">`;

if (!src.includes('Ganda Putra CC Lokal Parepare</p>')) {
  if (src.includes(headerMarker)) {
    src = src.replace(headerMarker, statsBlock);
  } else {
    console.warn('[patch-public-accepted-category-counts] Header/filter marker not found; category counters were not inserted.');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-accepted-category-counts] Category participant counters patch completed safely.');
