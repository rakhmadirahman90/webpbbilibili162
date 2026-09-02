import fs from 'node:fs';

const fail = (message) => {
  throw new Error(`[iuran-report-patch] ${message}`);
};

const update = (path, mutator) => {
  const before = fs.readFileSync(path, 'utf8');
  const after = mutator(before);
  if (after === before) {
    console.log(`[iuran-report-patch] no change: ${path}`);
    return;
  }
  fs.writeFileSync(path, after, 'utf8');
  console.log(`[iuran-report-patch] updated: ${path}`);
};

update('src/components/AdminRouteView.tsx', (source) => {
  let next = source;
  const importAnchor = "import AdminRekapKeuangan from './AdminRekapKeuangan';";
  if (!next.includes("import AdminLaporanIuran from './AdminLaporanIuran';")) {
    if (!next.includes(importAnchor)) fail('AdminRouteView import anchor not found');
    next = next.replace(importAnchor, `${importAnchor}\nimport AdminLaporanIuran from './AdminLaporanIuran';`);
  }
  if (!next.includes("case 'laporan-iuran':")) {
    const routeRegex = /(\s*case\s+'rekap-keuangan':\s*return\s+adminOnly\(AdminRekapKeuangan\);\s*)/;
    if (!routeRegex.test(next)) fail('AdminRouteView route anchor not found');
    next = next.replace(routeRegex, `$1    case 'laporan-iuran': return adminOnly(AdminLaporanIuran);\n`);
  }
  return next;
});

update('src/components/Sidebar.tsx', (source) => {
  if (source.includes("{ name: 'Laporan Pembayaran Iuran'")) return source;
  const sectionRegex = /(\{\s*section:\s*'Administrasi & Keuangan',[\s\S]*?items:\s*\[\s*)/;
  if (!sectionRegex.test(source)) {
    console.warn('[iuran-report-patch] Sidebar finance section not found; menu patch skipped safely');
    return source;
  }
  return source.replace(sectionRegex, `$1        { name: 'Laporan Pembayaran Iuran', path: 'laporan-iuran', icon: FileSpreadsheet, adminOnly: true },\n`);
});

update('src/components/KasManager.tsx', (source) => {
  let next = source;
  const importAnchor = "import autoTable from 'jspdf-autotable';";
  if (!next.includes("import '../kas-manager-responsive.css';")) {
    if (!next.includes(importAnchor)) fail('KasManager import anchor not found');
    next = next.replace(importAnchor, `${importAnchor}\nimport '../kas-manager-responsive.css';`);
  }
  if (!next.includes('data-kas-manager')) {
    const rootRegex = /(export default function KasManager[\s\S]*?\n\s*return\s*\(\s*)<div\b/;
    if (!rootRegex.test(next)) {
      console.warn('[iuran-report-patch] KasManager root marker not found; responsive marker skipped safely');
    } else {
      next = next.replace(rootRegex, '$1<div data-kas-manager="true" ');
    }
  }
  return next;
});

console.log('[iuran-report-patch] complete');
