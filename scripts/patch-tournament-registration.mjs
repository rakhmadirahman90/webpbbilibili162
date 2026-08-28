import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
const sidebarPath = 'src/components/Sidebar.tsx';

function replaceOnce(file, from, to, label) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`Patch tournament: marker not found in ${file}: ${label}`);
  fs.writeFileSync(file, src.replace(from, to));
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

// URL synchronizer and initial active-view allowlist. The tournament page is
// subsequently converted to a standalone route by the stability patch.
for (const marker of ["'register', 'pendaftaran',"]) {
  const src = fs.readFileSync(appPath, 'utf8');
  const count = (src.match(new RegExp(marker.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'g')) || []).length;
  if (count === 0) throw new Error('Patch tournament: App full-page registration marker missing');
  const updated = src.replaceAll(marker, "'register', 'pendaftaran', 'pendaftaran-turnamen',");
  fs.writeFileSync(appPath, updated);
}

// Public render branch for legacy builds; the final stability patch moves this
// page to an explicit React Router route so activeView no longer owns it.
replaceOnce(appPath,
  "{(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}",
  "{(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}\n                    {(activeView === 'pendaftaran-turnamen') && <PendaftaranTurnamen />}",
  'public render');

// Do not render footer under the tournament registration page.
replaceOnce(appPath,
  "!['register', 'pendaftaran', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView)",
  "!['register', 'pendaftaran', 'pendaftaran-turnamen', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView)",
  'footer exclusion');

// IMPORTANT: never share the public /pendaftaran-turnamen URL with an admin
// route. A same-path protected route can outrank the public page and cause a
// redirect/render bounce. Give the admin screen its own URL instead.
replaceOnce(appPath,
  "<Route path=\"pendaftaran\" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to=\"/admin/dashboard\" replace />} />",
  "<Route path=\"pendaftaran\" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to=\"/admin/dashboard\" replace />} />\n              <Route path=\"kelola-pendaftaran-turnamen\" element={isAdmin ? <ManajemenTurnamen /> : <Navigate to=\"/admin/dashboard\" replace />} />",
  'admin route');

// Navbar fallback + route preloading for environments where DB navbar is empty.
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

// Admin sidebar entry uses a different URL so it cannot collide with the public
// tournament registration form.
replaceOnce(sidebarPath,
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },",
  "{ name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },\n        { name: 'Pendaftaran Peserta Turnamen', path: 'kelola-pendaftaran-turnamen', icon: Trophy, adminOnly: true },",
  'sidebar tournament entry');

console.log('Tournament registration patch applied with separated public/admin routes.');