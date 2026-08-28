import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
const sidebarPath = 'src/components/Sidebar.tsx';

function replaceOnce(file, from, to, label) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(to)) {
    console.log(`[patch-tournament-registration] ${file}: ${label} already present`);
    return;
  }
  if (!src.includes(from)) {
    // The current production architecture may already implement this feature
    // differently (for example as an explicit React Router route). A build
    // patch must never destroy an otherwise valid build just because its old
    // marker no longer exists.
    console.log(`[patch-tournament-registration] ${file}: ${label} marker not found; no-op`);
    return;
  }
  fs.writeFileSync(file, src.replace(from, to));
  console.log(`[patch-tournament-registration] ${file}: ${label} applied`);
}

// Public + admin imports.
replaceOnce(appPath,
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm')); ",
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm'));\nconst PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen')); ",
  'public import');
replaceOnce(appPath,
  "const ManajemenPendaftaran = lazy(() => import('./ManajemenPendaftaran'));",
  "const ManajemenPendaftaran = lazy(() => import('./ManajemenPendaftaran'));\nconst ManajemenTurnamen = lazy(() => import('./components/ManajemenTurnamen'));",
  'admin import');

// URL synchronizer and initial active-view allowlist.
for (const marker of ["'register', 'pendaftaran',"]) {
  const src = fs.readFileSync(appPath, 'utf8');
  const escaped = marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const count = (src.match(new RegExp(escaped, 'g')) || []).length;
  if (count === 0) {
    console.log('[patch-tournament-registration] App registration marker not found; allowlist step no-op');
    continue;
  }
  const updated = src.replaceAll(marker, "'register', 'pendaftaran', 'pendaftaran-turnamen',");
  if (updated !== src) fs.writeFileSync(appPath, updated);
}

// Public render branch for legacy builds. Current App may already use an
// explicit React Router route, so absence of this marker is intentionally safe.
replaceOnce(appPath,
  "{(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}",
  "{(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}\n                    {(activeView === 'pendaftaran-turnamen') && <PendaftaranTurnamen />}",
  'public render');

replaceOnce(appPath,
  "!['register', 'pendaftaran', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView)",
  "!['register', 'pendaftaran', 'pendaftaran-turnamen', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView)",
  'footer exclusion');

replaceOnce(appPath,
  "<Route path=\"pendaftaran\" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to=\"/admin/dashboard\" replace />} />",
  "<Route path=\"pendaftaran\" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to=\"/admin/dashboard\" replace />} />\n              <Route path=\"kelola-pendaftaran-turnamen\" element={isAdmin ? <ManajemenTurnamen /> : <Navigate to=\"/admin/dashboard\" replace />} />",
  'admin route');

replaceOnce(navPath,
  "{ id: 'galeri', label: 'Galeri', path: 'gallery', type: 'link', parent_id: null, order_index: 5 },",
  "{ id: 'galeri', label: 'Galeri', path: 'gallery', type: 'link', parent_id: null, order_index: 5 },\n  { id: 'pendaftaran-turnamen', label: 'Pendaftaran Peserta', path: 'pendaftaran-turnamen', type: 'link', parent_id: null, order_index: 5.5 },",
  'navbar default');
replaceOnce(navPath,
  "const target = effective === 'atlet' || effective === 'players' || ['semua', 'senior', 'muda'].includes(effective)",
  "const target = effective === 'pendaftaran-turnamen' ? '/pendaftaran-turnamen' : effective === 'atlet' || effective === 'players' || ['semua', 'senior', 'muda'].includes(effective)",
  'navbar preload');
replaceOnce(navPath,
  "case '/register': void import('./RegistrationForm'); break;",
  "case '/register': void import('./RegistrationForm'); break;\n      case '/pendaftaran-turnamen': void import('./PendaftaranTurnamen'); break;",
  'navbar import');

replaceOnce(sidebarPath,
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },",
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Pendaftaran Peserta Turnamen', path: 'kelola-pendaftaran-turnamen', icon: Trophy, adminOnly: true },",
  'sidebar tournament entry');

console.log('Tournament registration patch completed safely.');
