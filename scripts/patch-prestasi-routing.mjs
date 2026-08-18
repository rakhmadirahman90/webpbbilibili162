import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const transform of transforms) source = transform(source);
  fs.writeFileSync(path, source);
}

function replaceIfPresent(source, oldValue, newValue) {
  return source.includes(oldValue) ? source.replace(oldValue, newValue) : source;
}

// This patch must be safe to run on every Cloudflare build. Earlier versions
// assumed exact source markers that may legitimately differ after another
// mobile-navbar patch has normalized the same file. Missing markers are now
// treated as an already-applied/no-op condition instead of failing the build.
patchFile('src/App.tsx', [
  (s) => s.replace(/'berita', 'news', 'faq/g, "'berita', 'news', 'prestasi', 'faq"),
  (s) => {
    const marker = "                    {(activeView === 'berita' || activeView === 'news') && <News />}";
    if (s.includes("(activeView === 'prestasi') && <News />")) return s;
    return replaceIfPresent(s, marker, `${marker}\n                    {(activeView === 'prestasi') && <News />}`);
  },
]);

patchFile('src/components/Navbar.tsx', [
  (s) => {
    const old = "    const targetPath = (subPath || path || '').toLowerCase().trim();";
    const newer = `    const rawTargetPath = (subPath || path || '').trim();
    const [targetPathRaw, targetQueryRaw = ''] = rawTargetPath.split('?');
    const targetPath = targetPathRaw.toLowerCase().trim();
    const targetQuery = new URLSearchParams(targetQueryRaw);
    const targetCategory = (targetQuery.get('category') || '').trim().toLowerCase();`;
    if (s.includes('const targetQuery = new URLSearchParams(targetQueryRaw);')) return s;
    return replaceIfPresent(s, old, newer);
  },
  (s) => {
    const old = "    // 5. Berita\n    if (targetPath === 'berita' || targetPath === 'news' || targetPath.includes('berita')) {\n      onNavigate('berita');\n      return;\n    }";
    const replacement = `    // 5. Berita: use the existing App navigation callback.
    if (targetPath === 'berita' || targetPath === 'news' || targetPath.includes('berita')) {
      onNavigate('berita');
      return;
    }`;
    if (s.includes('// 5. Berita: use the existing App navigation callback.')) return s;
    return replaceIfPresent(s, old, replacement);
  },
  (s) => {
    const old = "    // 6. Prestasi\n    if (targetPath === 'prestasi') {\n      onNavigate('prestasi');\n      return;\n    }";
    const replacement = `    // 6. Prestasi: canonical route plus legacy category route.
    if (targetPath === 'prestasi' || (targetPath === 'berita' && targetCategory === 'prestasi')) {
      onNavigate('prestasi');
      return;
    }`;
    if (s.includes('// 6. Prestasi: canonical route plus legacy category route.')) return s;
    return replaceIfPresent(s, old, replacement);
  },
  (s) => {
    // Remove the old global capture-phase workaround if it still exists.
    const start = '  // pb-mobile-news-prestasi-delegation\n';
    if (!s.includes(start)) return s;
    const endMarker = '  // --- PERBAIKAN LOGIKA NAVIGASI ---\n';
    const startIndex = s.indexOf(start);
    const endIndex = s.indexOf(endMarker, startIndex);
    if (endIndex === -1) return s;
    return s.slice(0, startIndex) + s.slice(endIndex);
  },
]);

patchFile('src/components/News.tsx', [
  (s) => {
    const marker = 'export default function News() {\n';
    if (s.includes('const prestasiOnly =')) return s;
    return replaceIfPresent(s, marker, `${marker}  // /prestasi is a dedicated category view.\n  const prestasiOnly = typeof window !== 'undefined' && window.location.pathname.replace(/\\/$/, '').toLowerCase() === '/prestasi';\n`);
  },
  (s) => {
    const marker = "    let result = [...beritaList];\n\n    // Filter by Category";
    if (s.includes('// Dedicated Prestasi menu filter')) return s;
    return replaceIfPresent(s, marker, `    let result = [...beritaList];\n\n    // Dedicated Prestasi menu filter: ONLY kategori Prestasi.\n    if (prestasiOnly) {\n      result = result.filter(item => (item.kategori || '').trim().toLowerCase() === 'prestasi');\n    }\n\n    // Filter by Category`);
  },
  (s) => s.replace('[beritaList, selectedCategory, orderBy, orderDirection, searchTerm]', '[beritaList, selectedCategory, orderBy, orderDirection, searchTerm, prestasiOnly]'),
  (s) => {
    if (s.includes('// Prestasi route category state sync')) return s;
    const marker = "  useEffect(() => {\n    fetchNews();";
    if (!s.includes(marker)) return s;
    return s.replace(marker, "  // Prestasi route category state sync\n  useEffect(() => {\n    if (prestasiOnly) {\n      setSelectedCategory('ALL ARTICLES');\n      setTempCategory('ALL ARTICLES');\n      setCurrentPage(1);\n    }\n  }, [prestasiOnly]);\n\n" + marker);
  },
  (s) => {
    const old = `        const { data: commentRows } = await supabase
          .from('komentar')
          .select('berita_id');`;
    const replacement = `        const { data: commentRows } = await supabase
          .from('komentar')
          .select('berita_id')
          .in('berita_id', articleIds);`;
    if (s.includes(".select('berita_id')\n          .in('berita_id', articleIds)")) return s;
    return replaceIfPresent(s, old, replacement);
  },
]);

console.log('Stable Berita/Prestasi routing patch completed (safe/idempotent).');
