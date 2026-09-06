import fs from 'node:fs';

const fail = (message) => { throw new Error(`[iuran-report-patch] ${message}`); };
const update = (path, mutator) => {
  const before = fs.readFileSync(path, 'utf8');
  const after = mutator(before);
  if (after !== before) fs.writeFileSync(path, after, 'utf8');
};

// Keep the existing dedicated report component and route, but make the menu
// location explicit: it belongs beside Kelola Kas in Administrasi & Keuangan.
update('src/components/AdminRouteView.tsx', (source) => {
  let next = source;
  const importStatement = "import AdminLaporanIuran from './AdminLaporanIuran';";
  if (!next.includes(importStatement)) {
    const anchor = "import AdminRekapKeuangan from './AdminRekapKeuangan';";
    if (!next.includes(anchor)) fail('AdminRouteView import anchor not found');
    next = next.replace(anchor, `${anchor} ${importStatement}`);
  }
  if (!/case\s*['"]laporan-iuran['"]\s*:/.test(next)) {
    const routeRegex = /(case\s*['"]rekap-keuangan['"]\s*:\s*return\s+adminOnly\(AdminRekapKeuangan\);)/;
    if (routeRegex.test(next)) next = next.replace(routeRegex, `$1case'laporan-iuran':return adminOnly(AdminLaporanIuran);`);
    else {
      const switchMarker = /switch\s*\(path\)\s*\{/;
      if (!switchMarker.test(next)) fail('AdminRouteView switch anchor not found');
      next = next.replace(switchMarker, `$&case'laporan-iuran':return adminOnly(AdminLaporanIuran);`);
    }
  }
  return next;
});

update('src/components/Sidebar.tsx', (source) => {
  let next = source;
  // Remove any previous generated copies so the item can be placed exactly once.
  next = next.replace(/\s*\{\s*name:\s*['"](?:Laporan Pembayaran Iuran|Rekap Iuran Peserta)['"]\s*,\s*path:\s*['"]laporan-iuran['"][^}]*\},?/g, '');

  const adminSection = /(section:\s*['"]Administrasi\s*&\s*Keuangan['"][\s\S]*?items:\s*\[[\s\S]*?\{\s*name:\s*['"]Kelola Kas['"]\s*,\s*path:\s*['"]kas['"][^}]*\},?)/;
  if (adminSection.test(next)) {
    next = next.replace(adminSection, `$1\n        { name: 'Rekap Iuran Peserta', path: 'laporan-iuran', icon: FileSpreadsheet, adminOnly: true },`);
    return next;
  }

  // Compact fallback: target the admin section by its heading and insert after
  // the first Kelola Kas entry within that section.
  const headingIndex = next.indexOf("section: 'Administrasi & Keuangan'");
  if (headingIndex >= 0) {
    const tail = next.slice(headingIndex);
    const kasIndex = tail.indexOf("name: 'Kelola Kas'");
    if (kasIndex >= 0) {
      const absolute = headingIndex + kasIndex;
      const close = next.indexOf('},', absolute);
      if (close >= 0) next = next.slice(0, close + 2) + "\n        { name: 'Rekap Iuran Peserta', path: 'laporan-iuran', icon: FileSpreadsheet, adminOnly: true }," + next.slice(close + 2);
    }
  }
  return next;
});

update('src/components/KasManager.tsx', (source) => {
  let next = source.replace(/\s*import\s+RekapIuranSeptember\s+from\s+['"]\.\/RekapIuranSeptember['"];?\s*/g, '\n');
  next = next.replace(/\s*<RekapIuranSeptember\s*\/?>\s*/g, '\n');
  if (!next.includes('data-kas-manager')) {
    const rootRegex = /(export default function KasManager[\s\S]*?\n\s*return\s*\(\s*)<div\b/;
    if (rootRegex.test(next)) next = next.replace(rootRegex, '$1<div data-kas-manager="true" ');
  }
  return next;
});

update('src/components/RekapIuranSeptember.tsx', (source) => {
  if (source.includes('data-rekap-iuran')) return source;
  return source.replace('    <section className=', '    <section data-rekap-iuran="true" className=');
});

console.log('[iuran-report-patch] dedicated participant dues recap route/menu configured');
