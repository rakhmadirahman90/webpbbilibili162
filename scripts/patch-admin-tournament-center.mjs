import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const routePath = 'src/components/AdminRouteView.tsx';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');
const marker = '/* __ADMIN_TOURNAMENT_CENTER_V1__ */';

// Consolidate every tournament-specific navigation entry into one dedicated section.
{
  let s = read(sidebarPath);
  if (!s.includes(marker)) {
    const tournamentPaths = [
      'turnamen-liga',
      'live-score',
      'kelola-turnamen',
      'pendaftaran-turnamen',
      'seeded-turnamen',
      'keuangan-turnamen',
      'sponsorship',
      'skor',
    ];

    for (const path of tournamentPaths) {
      const re = new RegExp(`\\n\\s*\\{ name: '[^']*', path: '${path.replace(/[-/]/g, '\\$&')}', icon: [A-Za-z0-9_]+, adminOnly: true \\},`, 'g');
      s = s.replace(re, '');
    }

    // Remove the non-admin tournament/liga and live-score entries as well.
    s = s.replace(/\n\s*\{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false \},/g, '');
    s = s.replace(/\n\s*\{ name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: false \},/g, '');

    const anchor = "    { \n      section: 'Kelola Data & Atlet',";
    if (!s.includes(anchor)) throw new Error('[patch-admin-tournament-center] Kelola Data & Atlet section not found');

    const section = `    {\n      section: 'Pusat Turnamen',\n      adminOnly: true,\n      items: [\n        { name: 'Dashboard Turnamen', path: 'pusat-turnamen', icon: Trophy, adminOnly: true },\n        { name: 'Atur Event Turnamen', path: 'kelola-turnamen', icon: Calendar, adminOnly: true },\n        { name: 'Pendaftaran Peserta Turnamen', path: 'pendaftaran-turnamen', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Kelola Seeded Peserta', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },\n        { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: true },\n        { name: 'Hasil & Skor Turnamen', path: 'skor', icon: Zap, adminOnly: true },\n        { name: 'Keuangan Turnamen', path: 'keuangan-turnamen', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Sponsorship Event', path: 'sponsorship', icon: Handshake, adminOnly: true },\n        { name: 'Laporan & Rekap Turnamen', path: 'laporan', icon: BarChart3, adminOnly: true },\n      ]\n    },\n`;

    s = s.replace(anchor, `${section}${anchor}`);
    s += `\n${marker}\n`;
    write(sidebarPath, s);
  }
}

// Add the central tournament route. Existing tournament routes remain intact.
{
  let r = read(routePath);
  if (!r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
    const markerImport = "import AdminSponsorship from './AdminSponsorship';";
    if (!r.includes(markerImport)) throw new Error('[patch-admin-tournament-center] AdminSponsorship import not found');
    r = r.replace(markerImport, `${markerImport} import AdminPusatTurnamen from './AdminPusatTurnamen';`);
  }
  if (!r.includes("case'pusat-turnamen':return adminOnly(AdminPusatTurnamen);")) {
    const anchor = "case'turnamen-liga':return render(TournamentLeague);";
    if (!r.includes(anchor)) throw new Error('[patch-admin-tournament-center] TournamentLeague route anchor not found');
    r = r.replace(anchor, `${anchor}case'pusat-turnamen':return adminOnly(AdminPusatTurnamen);`);
  }
  write(routePath, r);
}

console.log('[patch-admin-tournament-center] tournament workflow consolidated into one admin section');
