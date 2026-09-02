import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
const source = fs.readFileSync(path, 'utf8');

const marker = "// PATCH_PUBLIC_ACCEPTED_CATEGORY_DROPDOWN_V1";
if (source.includes(marker)) {
  console.log('[accepted-category-dropdown] already patched');
  process.exit(0);
}

let next = source;
next = next.replace(
  "const categoryCode = (category: string) => {",
  `${marker}\nconst ACCEPTED_CATEGORY_OPTIONS = [\n  'Ganda Putra CC Lokal Parepare',\n  'Ganda Putra AD / BC- / C+C Ajatappareng',\n];\n\nconst normalizeAcceptedCategory = (value: unknown) => String(value ?? '')\n  .trim()\n  .toLowerCase()\n  .replace(/[–—−]/g, '-')\n  .replace(/\\s+/g, ' ')\n  .replace(/\\s*\\/\\s*/g, '/')\n  .replace(/\\s*-\\s*/g, '-')\n  .trim();\n\nconst acceptedCategoryMatches = (rowCategory: unknown, selectedCategory: string) => {\n  if (selectedCategory === 'Semua') return true;\n  const row = normalizeAcceptedCategory(rowCategory);\n  const selected = normalizeAcceptedCategory(selectedCategory);\n  if (row === selected) return true;\n  if (selected.includes('ajatappareng')) {\n    return row.includes('ajatappareng') || row.includes('ad/bc') || row.includes('ad/bc-/c+c') || row.includes('ad/bc/c+c');\n  }\n  return false;\n};\n\nconst categoryCode = (category: string) => {`
);

next = next.replace(
  "const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);",
  "const categories = useMemo(() => ['Semua', ...Array.from(new Set([...ACCEPTED_CATEGORY_OPTIONS, ...rows.map(r => clean(r.kategori)).filter(Boolean)]))], [rows]);"
);

next = next.replace(
  "return (!q || hay.includes(q)) && (category === 'Semua' || clean(r.kategori) === category);",
  "return (!q || hay.includes(q)) && acceptedCategoryMatches(r.kategori, category);"
);

if (next === source || !next.includes('ACCEPTED_CATEGORY_OPTIONS') || !next.includes('acceptedCategoryMatches')) {
  throw new Error('[accepted-category-dropdown] expected source patterns were not found');
}

fs.writeFileSync(path, next);
console.log('[accepted-category-dropdown] patched');
