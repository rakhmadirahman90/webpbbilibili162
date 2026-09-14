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

    const anchorRe = /\n\s*\{\s*\n\s*section: 'Kelola Data & Atlet',/;
    const fallbackRe = /\n\s*\{\s*\n\s*section: 'Administrasi & Keuangan',/;
    const arrayEndRe = /(\n\s*\];\n)(\s*const menuItems = allMenuItems)/;

    if (anchorRe.test(s)) {
      s = s.replace(anchorRe, `${section}$&`);
    } else if (fallbackRe.test(s)) {
      s = s.replace(fallbackRe, `${section}$&`);
    } else if (arrayEndRe.test(s)) {
      // Important: insert INSIDE allMenuItems, immediately before its closing ];.
      // Never insert before `const menuItems`, which is outside the array and causes TS syntax errors.
      console.warn('[patch-admin-tournament-center] standard sections not found; inserting inside allMenuItems before closing ];');
      s = s.replace(arrayEndRe, `${section}$1$2`);
    } else {
      console.warn('[patch-admin-tournament-center] sidebar insertion anchor not found; skipping safely');
    }
  }

  if (/section:\s*'Pusat Turnamen'/.test(s) && !s.includes(marker)) {
    // Marker is intentionally a comment only and remains outside generated syntax-sensitive regions.
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
