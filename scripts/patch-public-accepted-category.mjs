import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

const marker = '// PATCH_PUBLIC_ACCEPTED_CATEGORY_V2';

if (!s.includes(marker)) {
  const anchor = "const categoryCode = (category: string) => {";
  const helpers = `${marker}\nconst ACCEPTED_CATEGORY_OPTIONS = [\n  'Ganda Putra CC Lokal Parepare',\n  'Ganda Putra AD / BC- / C+C Ajatappareng',\n];\n\nconst normalizeAcceptedCategory = (value: unknown) => String(value ?? '')\n  .trim()\n  .toLowerCase()\n  .replace(/[–—−]/g, '-')\n  .replace(/\\s+/g, ' ')\n  .replace(/\\s*\\/\\s*/g, '/')\n  .replace(/\\s*-\\s*/g, '-')\n  .trim();\n\nconst categoryLabel = (category: unknown) => {\n  const raw = clean(category);\n  const c = normalizeAcceptedCategory(raw);\n  if (c.includes('cc') && c.includes('parepare')) return 'Ganda Putra CC Lokal Parepare';\n  if (c.includes('ajatappareng') || c.includes('ad/bc') || (c.includes('ad') && c.includes('bc') && c.includes('c+c'))) {\n    return 'Ganda Putra AD / BC- / C+C Ajatappareng';\n  }\n  return raw;\n};\n\nconst categoryMatches = (rowCategory: unknown, selectedCategory: string) => {\n  if (selectedCategory === 'Semua') return true;\n  return categoryLabel(rowCategory) === selectedCategory;\n};\n\n`;
  if (!s.includes(anchor)) throw new Error('[patch-public-accepted-category] categoryCode anchor not found');
  s = s.replace(anchor, helpers + anchor);
}

// Always make the two tournament categories visible in the public dropdown,
// even when only one category currently has accepted registrations.
const categoryLine = /const categories = useMemo\(\(\) => .*?\[rows\]\);/s;
if (categoryLine.test(s)) {
  s = s.replace(categoryLine, `const categories = useMemo(() => {\n    const dynamic = rows.map(r => categoryLabel(r.kategori)).filter(Boolean);\n    return ['Semua', ...ACCEPTED_CATEGORY_OPTIONS, ...Array.from(new Set(dynamic.filter(v => !ACCEPTED_CATEGORY_OPTIONS.includes(v))))];\n  }, [rows]);`);
}

s = s.replace(
  /\(category === 'Semua' \|\| clean\(r\.kategori\) === category\)/g,
  `(category === 'Semua' || categoryMatches(r.kategori, category))`
);

s = s.replace(
  /\{clean\(row\.kategori\) \|\| '-'\} • \{clean\(row\.asal_pb\) \|\| 'PB\/Club'\}/g,
  `{categoryLabel(row.kategori) || '-'} • {clean(row.asal_pb) || 'PB/Club'}`
);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-accepted-category] canonical categories injected: CC Lokal Parepare + AD / BC- / C+C Ajatappareng');
