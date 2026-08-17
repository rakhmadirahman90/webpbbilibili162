import fs from 'node:fs';

function patchFile(path, transforms) {
  let source = fs.readFileSync(path, 'utf8');
  for (const transform of transforms) source = transform(source);
  fs.writeFileSync(path, source);
}

// IMPORTANT: this runs in Vercel's prebuild step. The public Berita/Prestasi
// menu must survive the URL -> activeView synchronizer and Prestasi must filter
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
  // before routing conditions inspect the target path.
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
    // Berita and Prestasi are full navigation targets. Do not let the generic
    // Berita handler swallow a legacy Prestasi query path.
    const oldPrestasi = "    // 6. Prestasi\n    if (targetPath === 'prestasi') {\n      onNavigate('prestasi');\n      return;\n    }";
    const replacementPrestasi = `    // 6. Prestasi: always open the dedicated filtered Prestasi page.
    // Supports both canonical "prestasi" and legacy "berita?category=Prestasi".
    if (targetPath === 'prestasi' || (targetPath === 'berita' && targetCategory === 'prestasi')) {
      setActiveDropdown(null);
      setIsMobileMenuOpen(false);
      navigate('/prestasi');
      return;
    }`;
    if (!s.includes("targetPath === 'berita' && targetCategory === 'prestasi'")) {
      if (!s.includes(oldPrestasi)) throw new Error('Prestasi patch: Prestasi handler marker not found');
      s = s.replace(oldPrestasi, replacementPrestasi);
    }
    return s;
  },
  (s) => {
    // Berita must navigate to a dedicated URL as well, rather than relying only
    // on parent state. This makes the mobile submenu reliable after menu close.
    const old = "    // 5. Berita\n    if (targetPath === 'berita' || targetPath === 'news' || targetPath.includes('berita')) {\n      onNavigate('berita');\n      return;\n    }";
    const replacement = `    // 5. Berita: open the canonical news route.
    if (targetPath === 'berita' || targetPath === 'news' || targetPath.includes('berita')) {
      setActiveDropdown(null);
      setIsMobileMenuOpen(false);
      navigate('/berita');
      return;
    }`;
    if (s.includes("navigate('/berita');")) return s;
    if (!s.includes(old)) throw new Error('Prestasi patch: Berita handler marker not found');
    return s.replace(old, replacement);
  },
  (s) => {
    // Defensive mobile click delegation: if a custom navbar renderer omits the
    // handler on a submenu item, the exact visible labels Berita/Prestasi still
    // perform the canonical navigation. Capture phase avoids parent overlays.
    if (s.includes('pb-mobile-news-prestasi-delegation')) return s;
    const marker = "  // --- PERBAIKAN LOGIKA NAVIGASI ---\n";
    if (!s.includes(marker)) return s;
    const injection = `  // pb-mobile-news-prestasi-delegation\n  useEffect(() => {\n    const handleMobileNewsPrestasiClick = (event: MouseEvent) => {\n      const target = event.target as HTMLElement | null;\n      if (!target) return;\n      const clickable = target.closest('button, a, [role=\"button\"], div');\n      if (!clickable) return;\n      const label = (clickable.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();\n      if (label !== 'berita' && label !== 'prestasi') return;\n      // Only handle the visible navbar submenu labels, not article/content text.\n      const inNavbar = clickable.closest('header, nav, [class*=\"navbar\"], [class*=\"menu\"]');\n      if (!inNavbar) return;\n      event.preventDefault();\n      event.stopPropagation();\n      setActiveDropdown(null);\n      setIsMobileMenuOpen(false);\n      navigate(label === 'prestasi' ? '/prestasi' : '/berita');\n    };\n    document.addEventListener('click', handleMobileNewsPrestasiClick, true);\n    return () => document.removeEventListener('click', handleMobileNewsPrestasiClick, true);\n  }, [navigate]);\n\n`;
    return s.replace(marker, injection + marker);
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

console.log('Berita/Prestasi routing and strict Prestasi filter patch applied successfully.');
