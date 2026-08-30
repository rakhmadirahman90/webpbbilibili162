import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const appPath = 'src/App.tsx';
const adminRoutePath = 'src/components/AdminRouteView.tsx';
const adminLayoutPath = 'src/components/AdminLayout.tsx';

function once(file, fromCandidates, to, label) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(to)) return;
  const candidates = Array.isArray(fromCandidates) ? fromCandidates : [fromCandidates];
  const from = candidates.find((candidate) => src.includes(candidate));
  if (!from) {
    console.warn(`[patch-seeded-turnamen-menu] marker not found: ${label}; skipping safely`);
    return;
  }
  fs.writeFileSync(file, src.replace(from, to), 'utf8');
}

// Keep the admin navigation explicit and React-Router based. Older builds used
// a DOM clone bridge for the tournament registration entry; explicit NavLinks
// are more reliable on mobile and on direct route loads.
once(sidebarPath,
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },",
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Pendaftaran Peserta Turnamen', path: 'pendaftaran-turnamen', icon: Trophy, adminOnly: true },\n        { name: 'Seeded Resmi Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },",
  'admin tournament and seeded entries');

// Normalize legacy menu path introduced by an earlier tournament patch.
{
  let src = fs.readFileSync(sidebarPath, 'utf8');
  const normalized = src.replaceAll("path: 'kelola-pendaftaran-turnamen'", "path: 'pendaftaran-turnamen'");
  if (normalized !== src) fs.writeFileSync(sidebarPath, normalized, 'utf8');
}

// Public seeded import/route remains available; hiding its public submenu is
// handled separately by the existing public-navigation patches.
once(appPath,
  [
    "const TournamentLeague = lazy(() => import('./components/TournamentLeague'));",
    "const PwaApkManager = lazy(() => import('./components/PwaApkManager'));",
    "import PwaInstallNotification from './components/PwaInstallNotification';"
  ],
  (src => {
    if (src.includes("const TournamentLeague = lazy(() => import('./components/TournamentLeague'));")) {
      return "const TournamentLeague = lazy(() => import('./components/TournamentLeague'));\nconst SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));";
    }
    if (src.includes("const PwaApkManager = lazy(() => import('./components/PwaApkManager'));")) {
      return "const PwaApkManager = lazy(() => import('./components/PwaApkManager'));\nconst SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));";
    }
    return "import PwaInstallNotification from './components/PwaInstallNotification';\nconst SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));";
  })(fs.readFileSync(appPath, 'utf8')),
  'App seeded import');

once(appPath,
  [
    '<Route path="pendaftaran" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to="/admin/dashboard" replace />} />',
    '<Route path="pendaftaran-turnamen" element={isAdmin ? <ManajemenTurnamen /> : <Navigate to="/admin/dashboard" replace />} />'
  ],
  '<Route path="pendaftaran" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to="/admin/dashboard" replace />} />\n              <Route path="seeded-turnamen" element={isAdmin ? <SeededTurnamen /> : <Navigate to="/admin/dashboard" replace />} />',
  'admin seeded route');

// AdminRouteView is the authoritative renderer for /admin/* in the current
// architecture. Support every legacy/current alias so no menu entry can fall
// through to the dashboard.
{
  let src = fs.readFileSync(adminRoutePath, 'utf8');
  const marker = "    case 'pendaftaran-turnamen': return adminOnly(AdminPendaftaranTurnamenModern);";
  const replacement = "    case 'pendaftaran-turnamen':\n    case 'kelola-pendaftaran-turnamen':\n    case 'peserta-turnamen':\n    case 'pendaftaran-peserta': return adminOnly(AdminPendaftaranTurnamenModern);";
  if (src.includes(marker) && !src.includes("case 'kelola-pendaftaran-turnamen':")) {
    src = src.replace(marker, replacement);
  }

  const seededMarker = "    case 'seeded':\n    case 'pendaftaran/seeded-peserta': return adminOnly(SeededTurnamen);";
  const seededReplacement = "    case 'seeded':\n    case 'seeded-turnamen':\n    case 'seeded-peserta':\n    case 'pendaftaran/seeded-peserta': return adminOnly(SeededTurnamen);";
  if (src.includes(seededMarker) && !src.includes("case 'seeded-turnamen':")) {
    src = src.replace(seededMarker, seededReplacement);
  }
  fs.writeFileSync(adminRoutePath, src, 'utf8');
}

// Prevent the legacy DOM bridge from creating a duplicate tournament entry
// when the explicit Sidebar item above already exists.
{
  let src = fs.readFileSync(adminLayoutPath, 'utf8');
  const old = "const already = nav.querySelector('a[data-tournament-registration-entry=\"true\"]');";
  const fresh = "const already = nav.querySelector('a[data-tournament-registration-entry=\"true\"], a[href=\"/admin/pendaftaran-turnamen\"]');";
  if (src.includes(old)) src = src.replace(old, fresh);
  fs.writeFileSync(adminLayoutPath, src, 'utf8');
}

console.log('[patch-seeded-turnamen-menu] admin seeded + tournament registration navigation fixed safely');
