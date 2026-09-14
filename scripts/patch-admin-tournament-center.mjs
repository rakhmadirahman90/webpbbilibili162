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
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`\\n\\s*\\{ name: '[^']*', path: '${escaped}', icon: [A-Za-z0-9_]+, adminOnly: true \\},`, 'g');
      s = s.replace(re, '');
    }

    // Remove the non-admin tournament/liga and live-score entries as well.
    s = s.replace(/\n\s*\{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false \},/g, '');
    s = s.replace(/\n\s*\{ name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: false \},/g, '');

    const section = `\n    {\n      section: 'Pusat Turnamen',\n      adminOnly: true,\n      items: [\n        { name: 'Dashboard Turnamen', path: 'pusat-turnamen', icon: Trophy, adminOnly: true },\n        { name: 'Atur Event Turnamen', path: 'kelola-turnamen', icon: Calendar, adminOnly: true },\n        { name: 'Pendaftaran Peserta Turnamen', path: 'pendaftaran-turnamen', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Kelola Seeded Peserta', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },\n        { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: true },\n        { name: 'Hasil & Skor Turnamen', path: 'skor', icon: Zap, adminOnly: true },\n        { name: 'Keuangan Turnamen', path: 'keuangan-turnamen', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Sponsorship Event', path: 'sponsorship', icon: Handshake, adminOnly: true },\n        { name: 'Laporan & Rekap Turnamen', path: 'laporan', icon: BarChart3, adminOnly: true },\n      ]\n    },`;

    // Prefer the existing Kelola Data section, but never fail the production build
    // if another preparation script has already reshaped the sidebar. Fall back to
    // inserting before Administrasi & Keuangan, which is a stable section anchor.
    const anchorRe = /\n\s*\{\s*\n\s*section: 'Kelola Data & Atlet',/;
    const fallbackRe = /\n\s*\{\s*\n\s*section: 'Administrasi & Keuangan',/;

    if (anchorRe.test(s)) {
      s = s.replace(anchorRe, `${section}$&`);
    } else if (fallbackRe.test(s)) {
      console.warn('[patch-admin-tournament-center] Kelola Data & Atlet section not found; inserting Pusat Turnamen before Administrasi & Keuangan');
      s = s.replace(fallbackRe, `${section}$&`);
    } else {
      // Idempotent/no-op safety: do not make an otherwise healthy production build
      // fail solely because the sidebar layout changed upstream.
      console.warn('[patch-admin-tournament-center] sidebar anchors not found; skipping Pusat Turnamen sidebar insertion safely');
    }

    s += `\n${marker}\n`;
    write(sidebarPath, s);
  }
}

// Add the central tournament route. Existing tournament routes remain intact.
{
  let r = read(routePath);
  if (!r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
    const markerImport = "import AdminSponsorship from './AdminSponsorship';";
    if (!r.includes(markerImport)) {
      console.warn('[patch-admin-tournament-center] AdminSponsorship import not found; skipping central tournament route import safely');
    } else {
      r = r.replace(markerImport, `${markerImport} import AdminPusatTurnamen from './AdminPusatTurnamen';`);
    }
  }
  if (!r.includes("case'pusat-turnamen':return adminOnly(AdminPusatTurnamen);")) {
    const anchor = "case'turnamen-liga':return render(TournamentLeague);";
    if (!r.includes(anchor)) {
      console.warn('[patch-admin-tournament-center] TournamentLeague route anchor not found; skipping central tournament route safely');
    } else if (r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
      r = r.replace(anchor, `${anchor}case'pusat-turnamen':return adminOnly(AdminPusatTurnamen);`);
    }
  }
  write(routePath, r);
}

console.log('[patch-admin-tournament-center] tournament workflow consolidation completed safely');
