import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

// Standalone public pages must not participate in activeView <-> URL syncing.
let app = fs.readFileSync(appPath, 'utf8');
const start = app.indexOf('function UrlSynchronizer(');
const end = app.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start < 0 || end < 0) throw new Error('[desktop-flicker] synchronizer block not found');
const block = app.slice(start, end);
const guard = `  const normalizedPath = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n  const isStandalonePublicPage = normalizedPath === '/register' || normalizedPath === '/pendaftaran' || normalizedPath === '/pendaftaran/seeded-peserta';`;
if (!block.includes('const isStandalonePublicPage')) {
  app = app.slice(0, start) + block.replace('  const isInitialMount = useRef(true);', `  const isInitialMount = useRef(true);\n${guard}`) + app.slice(end);
}
app = app.replace(/if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g, "if (isStandalonePublicPage || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
app = app.replace(/if \(isInitialMount\.current\) \{/g, 'if (isStandalonePublicPage) return;\n    if (isInitialMount.current) {');
app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
app = app.replace("const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));", "import PublicSeededPeserta from './components/PublicSeededPeserta';");
for (const route of [
  '<Route path="/register" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />'
]) {
  if (!app.includes(route)) app = app.replace('<Route path="*" element=', `          ${route}\n          <Route path="*" element=`);
}
fs.writeFileSync(appPath, app, 'utf8');

// Desktop and mobile menu clicks for these pages use navigate() directly.
let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
const direct = `    const normalizedSection = String(section || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const normalizedSubPath = String(subPath || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const standaloneTarget = normalizedSection === 'pendaftaran/seeded-peserta' || normalizedSection === 'seeded-peserta' || normalizedSubPath === 'seeded-peserta' ? '/pendaftaran/seeded-peserta' : (normalizedSection === 'register' || normalizedSection === 'pendaftaran' || normalizedSection === 'formulir-pendaftaran' || normalizedSubPath === 'register' || normalizedSubPath === 'pendaftaran' ? '/register' : null);\n    if (standaloneTarget) {\n      const current = window.location.pathname.replace(/^\\/+|\\/+$/g, '').toLowerCase();\n      if (current !== standaloneTarget.slice(1)) navigate(standaloneTarget);\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }`;
if (nav.includes(marker) && !nav.includes('const standaloneTarget =')) nav = nav.replace(marker, `${marker}\n${direct}`);
// Avoid duplicate route preload switch cases from older patches.
nav = nav.replace(/(case '\/pendaftaran-turnamen': void import\('\.\/PendaftaranTurnamen'\); break;\s*)+/g, "      case '/pendaftaran-turnamen': void import('./PendaftaranTurnamen'); break;\n");
nav = nav.replace(/(case '\/pendaftaran\/seeded-peserta': void import\('\.\/PublicSeededPeserta'\); break;\s*)+/g, "      case '/pendaftaran/seeded-peserta': void import('./PublicSeededPeserta'); break;\n");
fs.writeFileSync(navPath, nav, 'utf8');
console.log('[desktop-flicker] registration and seeded navigation stabilized');
