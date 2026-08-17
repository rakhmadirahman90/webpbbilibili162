import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const transform of transforms) source = transform(source);
  fs.writeFileSync(path, source);
}

// IMPORTANT: this runs in Vercel's prebuild step. The public Prestasi menu
// must survive the URL -> activeView synchronizer and News must filter the
// Supabase public.berita rows by kategori.
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
  // Normalize custom Supabase menu paths such as "berita?category=Prestasi"
  // before the legacy routing conditions inspect the target path.
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
    // Always open the dedicated Prestasi route, including legacy/custom
    // Supabase navbar entries that still use berita?category=Prestasi.
    const old = "    // 6. Prestasi\n    if (targetPath === 'prestasi') {\n      onNavigate('prestasi');\n      return;\n    }";
    const replacement = `    // 6. Prestasi: always open the dedicated filtered Prestasi page.
    // Supports both the canonical "prestasi" path and legacy/custom
    // Supabase values such as "berita?category=Prestasi".
    if (targetPath === 'prestasi' || (targetPath === 'berita' && targetCategory === 'prestasi')) {
      setActiveDropdown(null);
      setIsMobileMenuOpen(false);
      navigate('/prestasi');
      return;
    }`;
    if (s.includes("targetPath === 'berita' && targetCategory === 'prestasi'")) return s;
    if (!s.includes(old)) throw new Error('Prestasi patch: legacy Prestasi handler marker not found');
    return s.replace(old, replacement);
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
]);

console.log('Prestasi routing/filter patch applied successfully.');
