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

  if (!s.includes('Handshake,')) {
    const iconAnchor = '  HeartPulse,\n';
    if (s.includes(iconAnchor)) s = s.replace(iconAnchor, `${iconAnchor}  Handshake,\n`);
  }

  if (!alreadyHasSection) {
    const tournamentPaths = [
      'turnamen-liga', 'live-score', 'kelola-turnamen', 'pendaftaran-turnamen',
      'peserta-diterima', 'seeded-turnamen', 'keuangan-turnamen', 'sponsorship', 'skor'
    ];

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

    // patch-admin-member-menus runs earlier in prebuild and rebuilds the sidebar.
    // Put Pusat Turnamen immediately after Portal Utama so it is visible near the top.
    const portalAnchorRe = /(\n\s*\{\s*\n\s*section: 'Portal Utama',[\s\S]*?\n\s*\]\s*\n\s*\},)/;

    if (portalAnchorRe.test(s)) {
      s = s.replace(portalAnchorRe, `$&${section}`);
    } else {
      // Safe fallback: find the final closing ]; of allMenuItems before menuItems.
      const allMenuStart = s.indexOf('const allMenuItems = [');
      const menuItemsMarker = '\n  const menuItems = allMenuItems';
      const menuItemsPos = s.indexOf(menuItemsMarker, allMenuStart);
      const closingArrayPos = menuItemsPos > allMenuStart
        ? s.lastIndexOf('\n  ];', menuItemsPos)
        : -1;

      if (allMenuStart >= 0 && closingArrayPos > allMenuStart) {
        console.warn('[patch-admin-tournament-center] Portal Utama anchor not found; inserting before final allMenuItems ];');
        s = s.slice(0, closingArrayPos) + `\n${section}` + s.slice(closingArrayPos);
      } else {
        console.warn('[patch-admin-tournament-center] sidebar insertion anchor not found; skipping safely');
      }
    }
  }

  if (/section:\s*'Pusat Turnamen'/.test(s) && !s.includes(marker)) {
    s += `\n${marker}\n`;
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
    }
  }

  if (!/case\s*['\"]pusat-turnamen['\"]/.test(r)) {
    const routeAnchor = /case\s*['\"]turnamen-liga['\"]\s*:\s*return\s*<TournamentLeague isAdmin=\{isAdmin\}\s*\/>;/;
    if (routeAnchor.test(r) && r.includes("import AdminPusatTurnamen from './AdminPusatTurnamen';")) {
      r = r.replace(routeAnchor, `$&\n    case 'pusat-turnamen': return adminOnly(AdminPusatTurnamen);`);
    }
  }
  write(routePath, r);
}

console.log('[patch-admin-tournament-center] complete tournament admin navigation applied safely');
