import fs from 'node:fs';

const sidebarPath = 'src/components/Sidebar.tsx';
const appPath = 'src/App.tsx';

function once(file, from, to, label) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`[seeded] marker not found: ${label}`);
  fs.writeFileSync(file, src.replace(from, to), 'utf8');
}

// Put the seeded menu in the ADMIN navigation and the member navigation.
once(sidebarPath,
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },",
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },\n            { name: 'Seeded Resmi Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: true },",
  'admin sidebar seeded entry');

once(sidebarPath,
  "{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false },",
  "{ name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false },\n            { name: 'Seeded Resmi Bilibili 162', path: 'seeded-turnamen', icon: ShieldCheck, adminOnly: false },",
  'member sidebar seeded entry');

// App lazy import.
once(appPath,
  "const TournamentLeague = lazy(() => import('./components/TournamentLeague'));",
  "const TournamentLeague = lazy(() => import('./components/TournamentLeague'));\nconst SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));",
  'App seeded import');

// Admin route. The application already exposes nested admin routes.
once(appPath,
  '<Route path="pendaftaran-turnamen" element={isAdmin ? <ManajemenTurnamen /> : <Navigate to="/admin/dashboard" replace />} />',
  '<Route path="pendaftaran-turnamen" element={isAdmin ? <ManajemenTurnamen /> : <Navigate to="/admin/dashboard" replace />} />\n              <Route path="seeded-turnamen" element={<SeededTurnamen />} />',
  'admin seeded route');

console.log('[patch-seeded-turnamen-menu] seeded menu and route applied');
