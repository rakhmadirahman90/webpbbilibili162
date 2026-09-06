import fs from 'node:fs';

// The participant dues recap now has its own admin route/menu.
// This compatibility patch removes the old inline mount from KasManager so
// Kelola Kas remains focused on cash transactions only.
const path = 'src/components/KasManager.tsx';
let source = fs.readFileSync(path, 'utf8');
const before = source;
source = source.replace(/\s*import\s+RekapIuranSeptember\s+from\s+['"]\.\/RekapIuranSeptember['"];?\s*/g, '\n');
source = source.replace(/\s*<RekapIuranSeptember\s*\/?>\s*/g, '\n');
if (source !== before) {
  fs.writeFileSync(path, source, 'utf8');
  console.log('[patch-kas-iuran-september] removed inline dues recap from KasManager');
} else {
  console.log('[patch-kas-iuran-september] inline dues recap already absent');
}
