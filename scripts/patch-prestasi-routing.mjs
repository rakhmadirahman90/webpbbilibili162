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
  (s) => {
    const marker = "    // 6. Prestasi\n    if (targetPath === 'prestasi') {\n      onNavigate('prestasi');\n      return;\n    }";
    if (!s.includes(marker) || s.includes('Prestasi: always open the dedicated filtered Prestasi page')) return s;
    return s.replace(marker, "    // 6. Prestasi: always open the dedicated filtered Prestasi page.\n    if (targetPath === 'prestasi') {\n      setActiveDropdown(null);\n      setIsMobileMenuOpen(false);\n      navigate('/prestasi');\n      return;\n    }");
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
