import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  const before = source;
  for (const transform of transforms) source = transform(source);
  if (source !== before) fs.writeFileSync(path, source);
}

patchFile('src/App.tsx', [
  (s) => s.replace(/'berita', 'news', 'faq/g, "'berita', 'news', 'prestasi', 'faq"),
  (s) => {
    const marker = "                    {(activeView === 'berita' || activeView === 'news') && <News />}";
    if (s.includes("(activeView === 'prestasi') && <News />")) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: News renderer marker not found in App.tsx');
    return s.replace(marker, `${marker}\n                    {(activeView === 'prestasi') && <News />}`);
  },
]);

patchFile('src/components/Navbar.tsx', [
  (s) => {
    const marker = "    // 6. Prestasi\n    if (targetPath === 'prestasi') {\n      onNavigate('prestasi');\n      return;\n    }";
    const replacement = "    // 6. Prestasi: always open the dedicated filtered Prestasi page.\n    // Direct navigation also works when the menu is loaded from Supabase/custom navbar settings.\n    if (targetPath === 'prestasi') {\n      setActiveDropdown(null);\n      setIsMobileMenuOpen(false);\n      navigate('/prestasi');\n      return;\n    }";
    if (s.includes("Direct navigation also works when the menu is loaded from Supabase/custom navbar settings.")) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: Navbar Prestasi handler marker not found');
    return s.replace(marker, replacement);
  },
]);

patchFile('src/components/News.tsx', [
  (s) => {
    const marker = 'export default function News() {\n';
    if (s.includes('const prestasiOnly =')) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: News component marker not found');
    return s.replace(marker, `${marker}  // Dedicated Prestasi view: show only berita with kategori Prestasi.\n  const prestasiOnly = typeof window !== 'undefined' && window.location.pathname.toLowerCase().replace(/\\/$/, '') === '/prestasi';\n`);
  },
  (s) => {
    const oldMarker = '    let result = [...beritaList];\n\n    // Filter by Category';
    if (s.includes('// Dedicated Prestasi menu filter (case-insensitive).')) return s;
    if (!s.includes(oldMarker)) throw new Error('Prestasi patch: filteredNews marker not found');
    return s.replace(oldMarker, `    let result = [...beritaList];\n\n    // Dedicated Prestasi menu filter (case-insensitive and whitespace-safe).\n    if (prestasiOnly) {\n      result = result.filter(item => (item.kategori || '').trim().toLowerCase() === 'prestasi');\n    }\n\n    // Filter by Category`);
  },
  (s) => s.replace('[beritaList, selectedCategory, orderBy, orderDirection, searchTerm]', '[beritaList, selectedCategory, orderBy, orderDirection, searchTerm, prestasiOnly]'),
  (s) => {
    // Reset the generic category selector while on the dedicated Prestasi route,
    // so the page cannot accidentally keep a previous non-Prestasi category in UI state.
    if (s.includes('Prestasi route category state sync')) return s;
    const marker = "  useEffect(() => {\n    fetchNews();";
    if (!s.includes(marker)) return s;
    return s.replace(marker, "  // Prestasi route category state sync\n  useEffect(() => {\n    if (prestasiOnly) {\n      setSelectedCategory('ALL ARTICLES');\n      setTempCategory('ALL ARTICLES');\n      setCurrentPage(1);\n    }\n  }, [prestasiOnly]);\n\n" + marker);
  },
]);

console.log('Prestasi routing/filter patch applied successfully.');
