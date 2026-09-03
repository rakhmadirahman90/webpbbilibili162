import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Add a stable derived count for each official tournament category.
if (!src.includes('const categoryCounts = useMemo')) {
  const categoryLine = "  const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);";
  const countBlock = `${categoryLine}\n  const categoryCounts = useMemo(() => {\n    let cc = 0;\n    let adBc = 0;\n    for (const row of rows) {\n      const code = categoryCode(clean(row.kategori));\n      if (code === 'CC') cc += 1;\n      if (code === 'AD/BC-/C+C') adBc += 1;\n    }\n    return { cc, adBc };\n  }, [rows]);`;

  if (src.includes(categoryLine)) {
    src = src.replace(categoryLine, countBlock);
  } else {
    const categoriesRegex = /  const categories = useMemo\(\(\) => .*?\[rows\]\);/;
    if (categoriesRegex.test(src)) {
      src = src.replace(categoriesRegex, countBlock);
    } else {
      console.warn('[patch-public-accepted-category-counts] Category declaration not found; counters will not be injected.');
    }
  }
}

// Replace the single total badge in the hero with two category-specific badges.
if (!src.includes('categoryCounts.cc') || !src.includes('categoryCounts.adBc')) {
  console.warn('[patch-public-accepted-category-counts] categoryCounts unavailable; skipping hero category badges.');
} else if (!src.includes('CC Lokal Parepare</span>')) {
  const singleBadgeRegex = /<div className="flex items-center gap-2 rounded-xl border border-white\/10 bg-white\/\[\.04\] px-3 py-1\.5 text-\[11px\] font-bold text-slate-300"><Users size=\{14\} className="text-blue-300"\/> \{rows\.length\.toLocaleString\('id-ID'\)\} pasangan diterima<\/div>/;
  const categoryBadges = `<div className="flex flex-wrap items-center justify-end gap-1.5 sm:max-w-[520px]">\n              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-2.5 py-1.5 text-[9px] font-black text-emerald-200 sm:text-[10px]"><Users size={13} className="shrink-0 text-emerald-300"/><span>CC Lokal Parepare</span><strong className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">{categoryCounts.cc}</strong><span className="font-semibold text-emerald-200/60">pasangan</span></div>\n              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/[.07] px-2.5 py-1.5 text-[9px] font-black text-amber-200 sm:text-[10px]"><Users size={13} className="shrink-0 text-amber-300"/><span>AD/BC-/C+C Ajatappareng</span><strong className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-amber-300">{categoryCounts.adBc}</strong><span className="font-semibold text-amber-200/60">pasangan</span></div>\n            </div>`;
  if (singleBadgeRegex.test(src)) {
    src = src.replace(singleBadgeRegex, categoryBadges);
  } else {
    console.warn('[patch-public-accepted-category-counts] Hero total badge marker not found; leaving hero unchanged.');
  }
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-accepted-category-counts] Category participant counters applied safely.');
