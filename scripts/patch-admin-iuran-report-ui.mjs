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
  const importStatement = "import AdminLaporanIuran from './AdminLaporanIuran';";
  if (!next.includes(importStatement)) {
    // AdminRouteView is currently generated in a compact one-line format, so
    // do not depend on a newline-separated import anchor.
    const anchor = "import AdminRekapKeuangan from './AdminRekapKeuangan';";
    if (!next.includes(anchor)) fail('AdminRouteView import anchor not found');
    next = next.replace(anchor, `${anchor} ${importStatement}`);
  }

  if (!/case\s*['"]laporan-iuran['"]\s*:/.test(next)) {
    // Match both compact and pretty-printed switch cases, e.g.
    // case'rekap-keuangan':return adminOnly(AdminRekapKeuangan);
    const routeRegex = /(case\s*['"]rekap-keuangan['"]\s*:\s*return\s+adminOnly\(AdminRekapKeuangan\);)/;
    if (!routeRegex.test(next)) {
      // Safe fallback: insert immediately before the first case following the
      // rekap-keuangan route. This keeps the existing route structure intact.
      const switchMarker = /switch\s*\(path\)\s*\{/;
      if (!switchMarker.test(next)) fail('AdminRouteView switch anchor not found');
      const replacement = `$&case'laporan-iuran':return adminOnly(AdminLaporanIuran);`;
      next = next.replace(switchMarker, replacement);
    } else {
      next = next.replace(routeRegex, `$1case'laporan-iuran':return adminOnly(AdminLaporanIuran);`);
    }
  }

  return next;
});

update('src/components/Sidebar.tsx', (source) => {
  // Normalize malformed double-comma array entries from earlier generated builds.
  let next = source.replace(/\},,(?=\s*(?:\r?\n|$))/gm, '},');

  if (next.includes("path: 'laporan-iuran'") || next.includes('path:"laporan-iuran"')) return next;

  const kasRegex = /(^|\n)(\s*\{[^\n]*path:\s*['"]kas['"][^\n]*\}),(?=\s*(?:\r?\n|$))/m;
  if (kasRegex.test(next)) {
    next = next.replace(
      kasRegex,
      `$1$2,\n        { name: 'Laporan Pembayaran Iuran', path: 'laporan-iuran', icon: FileSpreadsheet, adminOnly: true },`
    );
  } else {
    // Compact generated Sidebar fallback: insert after the kas entry even if
    // it shares a line with neighboring entries.
    const compactKas = /(\{\s*name:\s*['"][^'"]*['"]\s*,\s*path:\s*['"]kas['"][^}]*\})/;
    if (compactKas.test(next)) {
      next = next.replace(compactKas, `$1, { name: 'Laporan Pembayaran Iuran', path: 'laporan-iuran', icon: FileSpreadsheet, adminOnly: true }`);
    } else {
      console.warn('[iuran-report-patch] path=kas menu entry not found; menu patch skipped safely');
    }
  }

  next = next.replace(/\},,(?=\s*(?:\r?\n|$))/gm, '},');
  return next;
});

update('src/components/KasManager.tsx', (source) => {
  let next = source;
  const importAnchor = "import autoTable from 'jspdf-autotable';";
  if (!next.includes("import '../kas-manager-responsive.css';")) {
    if (!next.includes(importAnchor)) {
      console.warn('[iuran-report-patch] KasManager import anchor not found; responsive import skipped safely');
    } else {
      next = next.replace(importAnchor, `${importAnchor}\nimport '../kas-manager-responsive.css';`);
    }
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

update('src/components/RekapIuranSeptember.tsx', (source) => {
  let next = source;
  if (next.includes('data-rekap-iuran')) return next;
  const sectionMarker = '    <section className=';
  if (!next.includes(sectionMarker)) {
    console.warn('[iuran-report-patch] RekapIuranSeptember section marker not found; responsive scope skipped safely');
    return next;
  }
  next = next.replace(sectionMarker, '    <section data-rekap-iuran="true" className=');
  return next;
});

console.log('[iuran-report-patch] complete');
