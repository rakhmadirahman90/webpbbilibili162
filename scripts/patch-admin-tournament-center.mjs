import fs from 'node:fs';
const sidebarPath = 'src/components/Sidebar.tsx';
const routePath = 'src/components/AdminRouteView.tsx';
const read = p => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');
const marker = '/* __ADMIN_TOURNAMENT_CENTER_V2__ */';

{
  let s = read(sidebarPath);
  const alreadyHasSection = /section:\s*'Pusat Turnamen'/.test(s);
  if (!s.includes('Handshake,')) {
    const iconAnchor = '  HeartPulse,\n';
    if (s.includes(iconAnchor)) s = s.replace(iconAnchor, `${iconAnchor}  Handshake,\n`);
  }
  if (!alreadyHasSection) {
    const tournamentPaths = ['turnamen-liga','live-score','kelola-turnamen','pendaftaran-turnamen','peserta-diterima','seeded-turnamen','kategori-pertandingan','arsip-kategori-pertandingan','keuangan-turnamen','sponsorship','skor'];
    for (const path of tournamentPaths) {
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const adminRe = new RegExp(`\\n\\s*\\{ name: '[^']*', path: '${escaped}', icon: [A-Za-z0-9_]+, adminOnly: true \\},`, 'g');
      s = s.replace(adminRe, '');
    }
    s = s.replace(/\n\s*\{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false \},/g, '');
    s = s.replace(/\n\s*\{ name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: false \},/g, '');
    const section = `
    {
      section: 'Pusat Turnamen',
      adminOnly: true,
      items: [
        { name: 'Dashboard Turnamen', path: 'pusat-turnamen', icon: Trophy, adminOnly: true },
        { name: 'Atur Event Turnamen', path: 'kelola-turnamen', icon: Calendar, adminOnly: true },
        { name: 'Atur Kategori Pertandingan', path: 'kategori-pertandingan', icon: Settings, adminOnly: true },
        { name: 'Arsip Kategori Pertandingan', path: 'arsip-kategori-pertandingan', icon: History, adminOnly: true },
        { name: 'Pendaftaran Peserta', path: 'pendaftaran-turnamen', icon: FileSpreadsheet, adminOnly: true },
        { name: 'Peserta Diterima', path: 'peserta-diterima', icon: UserCheck, adminOnly: true },
        { name: 'Kelola Seeded Peserta', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },
        { name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: true },
        { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: true },
        { name: 'Hasil & Skor Turnamen', path: 'skor', icon: Zap, adminOnly: true },
        { name: 'Keuangan Turnamen', path: 'keuangan-turnamen', icon: FileSpreadsheet, adminOnly: true },
        { name: 'Sponsorship Event', path: 'sponsorship', icon: Handshake, adminOnly: true },
        { name: 'Laporan & Rekap Turnamen', path: 'laporan', icon: BarChart3, adminOnly: true },
      ]
    },`;
    const portalAnchorRe = /(\n\s*\{\s*\n\s*section: 'Portal Utama',[\s\S]*?\n\s*\]\s*\n\s*\},)/;
    if (portalAnchorRe.test(s)) s = s.replace(portalAnchorRe, `$&${section}`);
    else {
      const allMenuStart = s.indexOf('const allMenuItems = [');
      const menuItemsPos = s.indexOf('\n  const menuItems = allMenuItems', allMenuStart);
      const closingArrayPos = menuItemsPos > allMenuStart ? s.lastIndexOf('\n  ];', menuItemsPos) : -1;
      if (allMenuStart >= 0 && closingArrayPos > allMenuStart) s = s.slice(0, closingArrayPos) + `\n${section}` + s.slice(closingArrayPos);
    }
  } else if (!/path:\s*'arsip-kategori-pertandingan'/.test(s)) {
    const categoryAnchor = /([\t ]*\{ name: 'Atur Kategori Pertandingan', path: 'kategori-pertandingan', icon: Settings, adminOnly: true \},)/;
    if (categoryAnchor.test(s)) s = s.replace(categoryAnchor, `$1\n        { name: 'Arsip Kategori Pertandingan', path: 'arsip-kategori-pertandingan', icon: History, adminOnly: true },`);
  }
  if (/section:\s*'Pusat Turnamen'/.test(s) && !s.includes(marker)) s += `\n${marker}\n`;
  write(sidebarPath, s);
}

{
  let r = read(routePath);
  if (!r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
    const m = "import AdminSponsorship from './AdminSponsorship';";
    if (r.includes(m)) r = r.replace(m, `${m}\nimport AdminPusatTurnamen from './AdminPusatTurnamen';`);
  }
  if (!r.includes("import AdminKategoriPertandingan from './AdminKategoriPertandingan';")) {
    const m = "import AdminPusatTurnamen from './AdminPusatTurnamen';";
    if (r.includes(m)) r = r.replace(m, `${m}\nimport AdminKategoriPertandingan from './AdminKategoriPertandingan';`);
  }
  if (!r.includes("import AdminArsipKategoriPertandingan from './AdminArsipKategoriPertandingan';")) {
    const m = "import AdminKategoriPertandingan from './AdminKategoriPertandingan';";
    if (r.includes(m)) r = r.replace(m, `${m}\nimport AdminArsipKategoriPertandingan from './AdminArsipKategoriPertandingan';`);
  }
  if (!/case\s*['\"]arsip-kategori-pertandingan['\"]/.test(r)) {
    const a = /case\s*['\"]kategori-pertandingan['\"]:\n\s*case\s*['\"]kategori-turnamen['\"]:\n\s*case\s*['\"]atur-kategori-pertandingan['\"]:\n\s*return\s*adminOnly\(AdminKategoriPertandingan\);/;
    if (a.test(r)) r = r.replace(a, `$&\n    case 'arsip-kategori-pertandingan':\n      return adminOnly(AdminArsipKategoriPertandingan);`);
  }
  write(routePath, r);
}
console.log('[patch-admin-tournament-center] tournament admin navigation and archive applied safely');
