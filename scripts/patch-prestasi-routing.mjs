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

patchFile('src/components/News.tsx', [
  (s) => {
    const marker = 'export default function News() {\n';
    if (s.includes('const prestasiOnly =')) return s;
    if (!s.includes(marker)) throw new Error('Prestasi patch: News component marker not found');
    return s.replace(marker, `${marker}  // Dedicated Prestasi view: show only kategori=Prestasi.\n  const prestasiOnly = typeof window !== 'undefined' && window.location.pathname.toLowerCase() === '/prestasi';\n`);
  },
  (s) => {
    if (s.includes('Dedicated Prestasi menu filter')) return s;
    const marker = '    let result = [...beritaList];\n\n    // Filter by Category';
    if (!s.includes(marker)) throw new Error('Prestasi patch: filteredNews marker not found');
    return s.replace(marker, `    let result = [...beritaList];\n\n    // Dedicated Prestasi menu filter (case-insensitive).\n    if (prestasiOnly) {\n      result = result.filter(item => item.kategori?.trim().toLowerCase() === 'prestasi');\n    }\n\n    // Filter by Category`);
  },
  (s) => s.replace('[beritaList, selectedCategory, orderBy, orderDirection, searchTerm]', '[beritaList, selectedCategory, orderBy, orderDirection, searchTerm, prestasiOnly]'),
]);

console.log('Prestasi routing/filter patch applied successfully.');
