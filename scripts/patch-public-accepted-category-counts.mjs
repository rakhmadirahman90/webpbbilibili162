import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// This patch runs after patch-public-accepted-category.mjs, which can expand
// the category declaration across multiple lines. Use a whitespace-tolerant
// replacement so the production build remains deterministic.
if (!src.includes('const categoryCounts = useMemo')) {
  const categoryRegex = /  const categories = useMemo\(\(\) => \{[\s\S]*?\}, \[rows\]\);/;
  const countBlock = `  const categories = useMemo(() => {\n    const dynamic = rows.map(r => categoryLabel(r.kategori)).filter(Boolean);\n    return ['Semua', ...ACCEPTED_CATEGORY_OPTIONS, ...Array.from(new Set(dynamic.filter(v => !ACCEPTED_CATEGORY_OPTIONS.includes(v))))];\n  }, [rows]);\n  const categoryCounts = useMemo(() => {\n    let cc = 0;\n    let adBc = 0;\n    for (const row of rows) {\n      const code = categoryCode(clean(row.kategori));\n      if (code === 'CC') cc += 1;\n      if (code === 'AD/BC-/C+C') adBc += 1;\n    }\n    return { cc, adBc };\n  }, [rows]);`;

  if (categoryRegex.test(src)) {
    src = src.replace(categoryRegex, countBlock);
  } else {
    console.warn('[patch-public-accepted-category-counts] Expanded category declaration not found; counters will not be injected.');
  }
}

// Replace the single total badge in the hero with two category-specific badges.
if (src.includes('const categoryCounts = useMemo') && !src.includes('CC Lokal Parepare</span>')) {
  const singleBadgeRegex = /<div className="flex items-center gap-2 rounded-xl border border-white\/10 bg-white\/\[\.04\] px-3 py-1\.5 text-\[11px\] font-bold text-slate-300"><Users size=\{14\} className="text-blue-300"\/> \{rows\.length\.toLocaleString\('id-ID'\)\} pasangan diterima<\/div>/;
  const categoryBadges = `<div className="flex flex-wrap items-center justify-end gap-1.5 sm:max-w-[560px]">\n              <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/[.07] px-2.5 py-1.5 text-[9px] font-black text-emerald-200 sm:text-[10px]"><Users size={13} className="shrink-0 text-emerald-300"/><span>CC Lokal Parepare</span><strong className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">{categoryCounts.cc}</strong><span className="font-semibold text-emerald-200/60">pasangan</span></div>\n              <div className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/20 bg-amber-400/[.07] px-2.5 py-1.5 text-[9px] font-black text-amber-200 sm:text-[10px]"><Users size={13} className="shrink-0 text-amber-300"/><span>AD/BC-/C+C Ajatappareng</span><strong className="rounded-md bg-amber-400/10 px-1.5 py-0.5 text-amber-300">{categoryCounts.adBc}</strong><span className="font-semibold text-amber-200/60">pasangan</span></div>\n            </div>`;
  if (singleBadgeRegex.test(src)) {
    src = src.replace(singleBadgeRegex, categoryBadges);
  } else {
    console.warn('[patch-public-accepted-category-counts] Hero total badge marker not found; leaving hero unchanged.');
  }
}

// ---------------------------------------------------------------------------
// FAST PUBLIC PARTICIPANT PHOTO DELIVERY
// ---------------------------------------------------------------------------
// The accepted-participants page previously resolved private Storage URLs one
// row at a time and rendered images with loading="lazy". On a 24-card first
// page that creates a long waterfall and deliberately delays above-the-fold
// photos. Resolve the first page in parallel, cache signed URLs briefly, and
// eagerly load visible images. Keep the existing private Storage bucket.
if (!src.includes('PB_FAST_PHOTO_CACHE_V1')) {
  src = src.replace(
    "const clean = (v: unknown) => String(v ?? '').trim();",
    `const PB_FAST_PHOTO_CACHE_V1 = 'pb_accepted_photo_cache_v1';\nconst PB_FAST_PHOTO_CACHE_TTL = 55 * 60 * 1000;\n\nconst clean = (v: unknown) => String(v ?? '').trim();`
  );

  src = src.replace(
    "  useEffect(() => {\n    let cancelled = false;\n    const resolvePhotos = async () => {\n      const next: Record<string, { foto1: string; foto2: string }> = {};\n      for (const row of rows) {\n        const result = { foto1: directUrl(row.foto_pemain_1_url), foto2: directUrl(row.foto_pemain_2_url) };\n        const entries: Array<[keyof typeof result, keyof Registration]> = [['foto1', 'foto_pemain_1_url'], ['foto2', 'foto_pemain_2_url']];\n        for (const [key, field] of entries) {\n          if (result[key]) continue;\n          const raw = clean(row[field]);\n          if (!raw) continue;\n          try {\n            const { data, error: e } = await supabase.storage.from('turnamen-dokumen').createSignedUrl(raw, 60 * 60);\n            if (!e && data?.signedUrl) result[key] = data.signedUrl;\n          } catch {}\n        }\n        next[String(row.id)] = result;\n      }\n      if (!cancelled) setPhotoUrls(next);\n    };\n    void resolvePhotos();\n    return () => { cancelled = true; };\n  }, [rows]);",
    `  useEffect(() => {\n    let cancelled = false;\n    const readPhotoCache = (): Record<string, { foto1: string; foto2: string }> => {\n      try {\n        const raw = localStorage.getItem(PB_FAST_PHOTO_CACHE_V1);\n        if (!raw) return {};\n        const parsed = JSON.parse(raw);\n        if (!parsed || parsed.expiresAt < Date.now() || !parsed.items) return {};\n        return parsed.items as Record<string, { foto1: string; foto2: string }>;\n      } catch { return {}; }\n    };\n    const writePhotoCache = (items: Record<string, { foto1: string; foto2: string }>) => {\n      try { localStorage.setItem(PB_FAST_PHOTO_CACHE_V1, JSON.stringify({ expiresAt: Date.now() + PB_FAST_PHOTO_CACHE_TTL, items })); } catch {}\n    };\n    const resolveOne = async (row: Registration) => {\n      const cached = readPhotoCache()[String(row.id)];\n      const result = {\n        foto1: directUrl(row.foto_pemain_1_url) || cached?.foto1 || '',\n        foto2: directUrl(row.foto_pemain_2_url) || cached?.foto2 || ''\n      };\n      const resolveField = async (field: keyof Registration, key: 'foto1' | 'foto2') => {\n        if (result[key]) return;\n        const raw = clean(row[field]);\n        if (!raw) return;\n        try {\n          const { data, error: e } = await supabase.storage.from('turnamen-dokumen').createSignedUrl(raw, 60 * 60);\n          if (!e && data?.signedUrl) result[key] = data.signedUrl;\n        } catch {}\n      };\n      await Promise.all([resolveField('foto_pemain_1_url', 'foto1'), resolveField('foto_pemain_2_url', 'foto2')]);\n      return [String(row.id), result] as const;\n    };\n    const resolvePhotos = async () => {\n      const firstPageRows = rows.slice(0, Math.max(12, pageSize));\n      const cache = readPhotoCache();\n      if (!cancelled) {\n        const cachedVisible: Record<string, { foto1: string; foto2: string }> = {};\n        for (const row of firstPageRows) if (cache[String(row.id)]) cachedVisible[String(row.id)] = cache[String(row.id)];\n        if (Object.keys(cachedVisible).length) setPhotoUrls(prev => ({ ...prev, ...cachedVisible }));\n      }\n      const pairs = await Promise.all(firstPageRows.map(resolveOne));\n      if (cancelled) return;\n      const next = { ...cache };\n      const visible: Record<string, { foto1: string; foto2: string }> = {};\n      for (const [id, value] of pairs) { next[id] = value; visible[id] = value; }\n      writePhotoCache(next);\n      setPhotoUrls(prev => ({ ...prev, ...visible }));\n    };\n    void resolvePhotos();\n    return () => { cancelled = true; };\n  }, [rows, pageSize]);`
  );

  src = src.replace(
    "loading=\"lazy\" className=\"h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]\"",
    "loading=\"eager\" decoding=\"async\" fetchPriority=\"high\" className=\"h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]\""
  );
  src = src.replace(
    "const publicPairs: PublicPair[] = visible.map(row => {",
    "const publicPairs: PublicPair[] = visible.map(row => {"
  );
  console.log('[patch-public-accepted-category-counts] fast accepted-participant photo delivery enabled');
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-public-accepted-category-counts] Category participant counters applied safely.');
