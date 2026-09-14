import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const routePath = 'src/components/AdminRouteView.tsx';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s, 'utf8');
const marker = '/* __ADMIN_TOURNAMENT_CENTER_V2__ */';

// Consolidate every tournament-specific navigation entry into one dedicated section.
{
  let s = read(sidebarPath);
  const alreadyHasSection = /section:\s*'Pusat Turnamen'/.test(s);

  // The sidebar uses lucide-react icons. Keep Handshake available because the
  // sponsorship menu is part of the complete tournament workflow.
  if (!s.includes('Handshake,')) {
    const iconAnchor = '  HeartPulse,\n';
    if (s.includes(iconAnchor)) {
      s = s.replace(iconAnchor, `${iconAnchor}  Handshake,\n`);
    }
  }

  if (!alreadyHasSection) {
    const tournamentPaths = [
      'turnamen-liga',
      'live-score',
      'kelola-turnamen',
      'pendaftaran-turnamen',
      'peserta-diterima',
      'seeded-turnamen',
      'keuangan-turnamen',
      'sponsorship',
      'skor',
    ];

    for (const path of tournamentPaths) {
      const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const adminRe = new RegExp(`\\n\\s*\\{ name: '[^']*', path: '${escaped}', icon: [A-Za-z0-9_]+, adminOnly: true \\},`, 'g');
      s = s.replace(adminRe, '');
    }

    // Remove public-facing tournament entries so admin gets one authoritative section.
    s = s.replace(/\n\s*\{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false \},/g, '');
    s = s.replace(/\n\s*\{ name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: false \},/g, '');

    const section = `\n      {\n        section: 'Pusat Turnamen',\n        adminOnly: true,\n        items: [\n          { name: 'Dashboard Turnamen', path: 'pusat-turnamen', icon: Trophy, adminOnly: true },\n          { name: 'Atur Event Turnamen', path: 'kelola-turnamen', icon: Calendar, adminOnly: true },\n          { name: 'Pendaftaran Peserta', path: 'pendaftaran-turnamen', icon: FileSpreadsheet, adminOnly: true },\n          { name: 'Peserta Diterima', path: 'peserta-diterima', icon: UserCheck, adminOnly: true },\n          { name: 'Kelola Seeded Peserta', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },\n          { name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: true },\n          { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: true },\n          { name: 'Hasil & Skor Turnamen', path: 'skor', icon: Zap, adminOnly: true },\n          { name: 'Keuangan Turnamen', path: 'keuangan-turnamen', icon: FileSpreadsheet, adminOnly: true },\n          { name: 'Sponsorship Event', path: 'sponsorship', icon: Handshake, adminOnly: true },\n          { name: 'Laporan & Rekap Turnamen', path: 'laporan', icon: BarChart3, adminOnly: true },\n        ]\n      },`;

    const anchorRe = /\n\s*\{\s*\n\s*section: 'Kelola Data & Atlet',/;
    const fallbackRe = /\n\s*\{\s*\n\s*section: 'Administrasi & Keuangan',/;
    const endMarker = '  const menuItems = allMenuItems';

    if (anchorRe.test(s)) {
      s = s.replace(anchorRe, `${section}$&`);
    } else if (fallbackRe.test(s)) {
      console.warn('[patch-admin-tournament-center] Kelola Data & Atlet section not found; inserting before Administrasi & Keuangan');
      s = s.replace(fallbackRe, `${section}$&`);
    } else if (s.includes(endMarker)) {
      // patch-admin-member-menus intentionally rebuilds the allMenuItems array,
      // so its closing point is the most stable insertion anchor in production.
      console.warn('[patch-admin-tournament-center] standard sidebar sections not found; inserting before menuItems safely');
      s = s.replace(endMarker, `${section}\n${endMarker}`);
    } else {
      console.warn('[patch-admin-tournament-center] sidebar insertion anchor not found; skipping safely');
    }
  }

  // Only mark the sidebar as patched after the section really exists.
  if (/section:\s*'Pusat Turnamen'/.test(s)) {
    if (!s.includes(marker)) s += `\n${marker}\n`;
  }
  write(sidebarPath, s);
}

// Ensure the central tournament route exists without making the build brittle.
{
  let r = read(routePath);
  if (!r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
    const markerImport = "import AdminSponsorship from './AdminSponsorship';";
    if (r.includes(markerImport)) {
      r = r.replace(markerImport, `${markerImport}\nimport AdminPusatTurnamen from './AdminPusatTurnamen';`);
    } else {
      console.warn('[patch-admin-tournament-center] AdminSponsorship import not found; skipping central tournament route import safely');
    }
  }

  if (!/case\s*['\"]pusat-turnamen['\"]/.test(r)) {
    const routeAnchor = /case\s*['\"]turnamen-liga['\"]\s*:\s*return\s*<TournamentLeague isAdmin=\{isAdmin\}\s*\/>;/;
    if (routeAnchor.test(r) && r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
      r = r.replace(routeAnchor, `$&\n    case 'pusat-turnamen': return adminOnly(AdminPusatTurnamen);`);
    } else {
      console.warn('[patch-admin-tournament-center] TournamentLeague route anchor not found; central route already absent, skipping safely');
    }
  }
  write(routePath, r);
}

console.log('[patch-admin-tournament-center] complete tournament admin navigation applied safely');
