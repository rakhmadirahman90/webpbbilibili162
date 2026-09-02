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
  const importAnchor = "import AdminRekapKeuangan from './AdminRekapKeuangan';\n";
  if (!next.includes("import AdminLaporanIuran from './AdminLaporanIuran';")) {
    if (!next.includes(importAnchor)) fail('AdminRouteView import anchor not found');
    next = next.replace(importAnchor, `${importAnchor}import AdminLaporanIuran from './AdminLaporanIuran';\n`);
  }
  const routeAnchor = "    case 'rekap-keuangan': return adminOnly(AdminRekapKeuangan);\n";
  if (!next.includes("case 'laporan-iuran':")) {
    if (!next.includes(routeAnchor)) fail('AdminRouteView route anchor not found');
    next = next.replace(routeAnchor, `${routeAnchor}    case 'laporan-iuran': return adminOnly(AdminLaporanIuran);\n`);
  }
  return next;
});

update('src/components/Sidebar.tsx', (source) => {
  const anchor = "        { name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true }, \n";
  if (source.includes("{ name: 'Laporan Pembayaran Iuran'")) return source;
  if (!source.includes(anchor)) fail('Sidebar cash menu anchor not found');
  return source.replace(anchor, `${anchor}        { name: 'Laporan Pembayaran Iuran', path: 'laporan-iuran', icon: FileSpreadsheet, adminOnly: true },\n`);
});

update('src/components/KasManager.tsx', (source) => {
  let next = source;
  const importAnchor = "import autoTable from 'jspdf-autotable';\n";
  if (!next.includes("import '../kas-manager-responsive.css';")) {
    if (!next.includes(importAnchor)) fail('KasManager import anchor not found');
    next = next.replace(importAnchor, `${importAnchor}import '../kas-manager-responsive.css';\n`);
  }
  const rootPrefix = "    <div className=\"w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8";
  if (!next.includes('data-kas-manager')) {
    if (!next.includes(rootPrefix)) fail('KasManager root anchor not found');
    next = next.replace(rootPrefix, "    <div data-kas-manager=\"true\" className=\"w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8");
  }
  return next;
});

console.log('[iuran-report-patch] complete');
