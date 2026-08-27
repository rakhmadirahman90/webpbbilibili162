import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const appPath = 'src/App.tsx';

function once(file, fromCandidates, to, label) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(to)) return;
  const candidates = Array.isArray(fromCandidates) ? fromCandidates : [fromCandidates];
  const from = candidates.find((candidate) => src.includes(candidate));
  if (!from) throw new Error(`[seeded] marker not found: ${label}`);
  fs.writeFileSync(file, src.replace(from, to), 'utf8');
}

once(sidebarPath,
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },",
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Seeded Resmi Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },",
  'admin sidebar seeded entry');

once(sidebarPath,
  "{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false },",
  "{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false },\n        { name: 'Seeded Resmi Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: false },",
  'member sidebar seeded entry');

// Restore script may provide either the full known-good App (with TournamentLeague)
// or a later App where the AdminDashboard import is eager-loaded. Support both.
once(appPath,
  [
    "const TournamentLeague = lazy(() => import('./components/TournamentLeague'));",
    "const PwaApkManager = lazy(() => import('./components/PwaApkManager'));"
  ],
  (src => {
    if (src.includes("const TournamentLeague = lazy(() => import('./components/TournamentLeague'));")) {
      return "const TournamentLeague = lazy(() => import('./components/TournamentLeague'));\nconst SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));";
    }
    return "const PwaApkManager = lazy(() => import('./components/PwaApkManager'));\nconst SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));";
  })(fs.readFileSync(appPath, 'utf8')),
  'App seeded import');

once(appPath,
  [
    '<Route path="pendaftaran" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to="/admin/dashboard" replace />} />',
    '<Route path="pendaftaran-turnamen" element={isAdmin ? <ManajemenTurnamen /> : <Navigate to="/admin/dashboard" replace />} />'
  ],
  '<Route path="pendaftaran" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to="/admin/dashboard" replace />} />\n              <Route path="seeded-turnamen" element={isAdmin ? <SeededTurnamen /> : <Navigate to="/admin/dashboard" replace />} />',
  'admin seeded route');

console.log('[patch-seeded-turnamen-menu] seeded menu and route applied');
