import fs from 'node:fs';

const path = 'src/components/PublicPesertaTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');

const oldHelpers = `const categoryCode = (category: string) => {\n  const c = normalized(category);\n  if (c.includes('cc') && c.includes('parepare')) return 'CC';\n  if (c.includes('ajatappareng') || c.includes('ad/bc') || c.includes('ad/ bc')) return 'AD/BC-/C+C';\n  return clean(category) || 'UMUM';\n};`;
const newHelpers = `const categoryCode = (category: string) => {\n  const c = normalized(category);\n  if (c.includes('cc') && c.includes('parepare')) return 'CC';\n  if (c.includes('ajatappareng') || c.includes('ad/bc') || c.includes('ad / bc') || (c.includes('ad') && c.includes('bc') && c.includes('c+c'))) return 'AD/BC-/C+C';\n  return clean(category) || 'UMUM';\n};\n\nconst categoryLabel = (category: unknown) => {\n  const raw = clean(category);\n  const c = normalized(raw);\n  if (c.includes('cc') && c.includes('parepare')) return 'Ganda Putra CC Lokal Parepare';\n  if (c.includes('ajatappareng') || c.includes('ad/bc') || c.includes('ad / bc') || (c.includes('ad') && c.includes('bc') && c.includes('c+c'))) return 'Ganda Putra AD / BC- / C+C Ajatappareng';\n  return raw;\n};`;
if (s.includes(oldHelpers)) s = s.replace(oldHelpers, newHelpers);

const oldCategories = `const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);`;
const newCategories = `const categories = useMemo(() => {\n    const known = ['Ganda Putra CC Lokal Parepare', 'Ganda Putra AD / BC- / C+C Ajatappareng'];\n    const dynamic = rows.map(r => categoryLabel(r.kategori)).filter(Boolean);\n    return ['Semua', ...known, ...Array.from(new Set(dynamic.filter(v => !known.includes(v))))];\n  }, [rows]);`;
if (s.includes(oldCategories)) s = s.replace(oldCategories, newCategories);

const oldFilter = `(category === 'Semua' || clean(r.kategori) === category)`;
const newFilter = `(category === 'Semua' || categoryLabel(r.kategori) === category)`;
if (s.includes(oldFilter)) s = s.replace(oldFilter, newFilter);

const oldCardCategory = `{clean(row.kategori) || '-'} • {clean(row.asal_pb) || 'PB/Club'}`;
const newCardCategory = `{categoryLabel(row.kategori) || '-'} • {clean(row.asal_pb) || 'PB/Club'}`;
if (s.includes(oldCardCategory)) s = s.replace(oldCardCategory, newCardCategory);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-accepted-category] added canonical Ganda Putra AD / BC- / C+C Ajatappareng category support');
