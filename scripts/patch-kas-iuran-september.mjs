import fs from 'node:fs';

const path = 'src/components/KasManager.tsx';
let source = fs.readFileSync(path, 'utf8');
const importMarker = "import RekapIuranSeptember from './RekapIuranSeptember';";

if (!source.includes(importMarker)) {
  const anchor = "import autoTable from 'jspdf-autotable';";
  if (!source.includes(anchor)) throw new Error('[patch-kas-iuran-september] import anchor not found');
  source = source.replace(anchor, `${anchor}\n${importMarker}`);
}

if (source.includes('<RekapIuranSeptember />')) {
  console.log('[patch-kas-iuran-september] already applied');
  process.exit(0);
}

const match = source.match(/(export default function KasManager[\s\S]*?\n\s*return\s*\(\s*<div[^>]*>)/);
if (!match) {
  console.log('[patch-kas-iuran-september] KasManager root return marker not found; no-op');
  process.exit(0);
}

source = source.replace(match[1], `${match[1]}\n      <RekapIuranSeptember />`);
fs.writeFileSync(path, source);
console.log('[patch-kas-iuran-september] September dues recap + today payment panel mounted');
