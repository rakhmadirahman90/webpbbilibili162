import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const transform of transforms) source = transform(source);
  fs.writeFileSync(path, source);
}

// Keep public Berita/Prestasi navigation deterministic and avoid global
// document click delegation, which can interfere with React Router events.
patchFile('src/App.tsx', [
  (s) => s.replace(/'berita', 'news', 'faq/g, "'berita', 'news', 'prestasi', 'faq"),
  (s) => {
    const marker = "                    {(activeView === 'berita' || activeView === 'news') && <News />}";
    if (s.includes("(activeView === 'prestasi') && <News />")) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: News renderer marker not found');
    return s.replace(marker, `${marker}\n                    {(activeView === 'prestasi') && <News />}`);
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
    if (!s.includes(old)) throw new Error('Prestasi patch: targetPath declaration not found');
    return s.replace(old, newer);
  },
  (s) => {
    const old = "    // 5. Berita\n    if (targetPath === 'berita' || targetPath === 'news' || targetPath.includes('berita')) {\n      onNavigate('berita');\n      return;\n    }";
    const replacement = `    // 5. Berita: use the existing App navigation callback.
    // This keeps React state and UrlSynchronizer as the single source of truth.
    if (targetPath === 'berita' || targetPath === 'news' || targetPath.includes('berita')) {
      onNavigate('berita');
      return;
    }`;
    if (s.includes('// 5. Berita: use the existing App navigation callback.')) return s;
    if (!s.includes(old)) throw new Error('Prestasi patch: Berita handler marker not found');
    return s.replace(old, replacement);
  },
  (s) => {
    const old = "    // 6. Prestasi\n    if (targetPath === 'prestasi') {\n      onNavigate('prestasi');\n      return;\n    }";
    const replacement = `    // 6. Prestasi: use the existing App navigation callback.
    // Supports canonical "prestasi" and legacy/custom "berita?category=Prestasi".
    if (targetPath === 'prestasi' || (targetPath === 'berita' && targetCategory === 'prestasi')) {
      onNavigate('prestasi');
      return;
    }`;
    if (s.includes('// 6. Prestasi: use the existing App navigation callback.')) return s;
    if (!s.includes(old)) throw new Error('Prestasi patch: Prestasi handler marker not found');
    return s.replace(old, replacement);
  },
  (s) => {
    // Remove the previous global capture-phase workaround. It could intercept
    // unrelated clicks and compete with React Router/React state updates.
    const start = '  // pb-mobile-news-prestasi-delegation\n';
    if (!s.includes(start)) return s;
    const endMarker = '  // --- PERBAIKAN LOGIKA NAVIGASI ---\n';
    const startIndex = s.indexOf(start);
    const endIndex = s.indexOf(endMarker, startIndex);
    if (endIndex === -1) throw new Error('Prestasi patch: delegation cleanup marker not found');
    return s.slice(0, startIndex) + s.slice(endIndex);
  },
]);

patchFile('src/components/News.tsx', [
  (s) => {
    const marker = 'export default function News() {\n';
    if (s.includes('const prestasiOnly =')) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: News component marker not found');
    return s.replace(marker, `${marker}  // /prestasi is a dedicated category view.\n  const prestasiOnly = typeof window !== 'undefined' && window.location.pathname.replace(/\\/$/, '').toLowerCase() === '/prestasi';\n`);
  },
  (s) => {
    const marker = "    let result = [...beritaList];\n\n    // Filter by Category";
    if (s.includes('// Dedicated Prestasi menu filter')) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: filteredNews marker not found');
    return s.replace(marker, `    let result = [...beritaList];\n\n    // Dedicated Prestasi menu filter: ONLY kategori Prestasi.\n    if (prestasiOnly) {\n      result = result.filter(item => (item.kategori || '').trim().toLowerCase() === 'prestasi');\n    }\n\n    // Filter by Category`);
  },
  (s) => s.replace('[beritaList, selectedCategory, orderBy, orderDirection, searchTerm]', '[beritaList, selectedCategory, orderBy, orderDirection, searchTerm, prestasiOnly]'),
  (s) => {
    if (s.includes('Prestasi route category state sync')) return s;
    const marker = "  useEffect(() => {\n    fetchNews();";
    if (!s.includes(marker)) return s;
    return s.replace(marker, "  // Prestasi route category state sync\n  useEffect(() => {\n    if (prestasiOnly) {\n      setSelectedCategory('ALL ARTICLES');\n      setTempCategory('ALL ARTICLES');\n      setCurrentPage(1);\n    }\n  }, [prestasiOnly]);\n\n" + marker);
  },
  (s) => {
    // Prevent the public news page from downloading the entire komentar table.
    // Only comments belonging to the currently loaded article set are needed
    // for the card counters.
    const old = `        const { data: commentRows } = await supabase
          .from('komentar')
          .select('berita_id');`;
    const replacement = `        const { data: commentRows } = await supabase
          .from('komentar')
          .select('berita_id')
          .in('berita_id', articleIds);`;
    if (s.includes('.select(\'berita_id\')\n          .in(\'berita_id\', articleIds)')) return s;
    if (!s.includes(old)) throw new Error('Prestasi patch: comment count query marker not found');
    return s.replace(old, replacement);
  },
]);

console.log('Stable Berita/Prestasi routing patch applied successfully.');
