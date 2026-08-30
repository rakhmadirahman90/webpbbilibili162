import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
let app = fs.readFileSync(appPath, 'utf8');

const start = app.indexOf('function UrlSynchronizer(');
const end = app.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start >= 0 && end >= 0) {
  let sync = app.slice(start, end);
  if (!sync.includes('isStandalonePublicPage')) {
    sync = sync.replace('  const isInitialMount = useRef(true);', "  const isInitialMount = useRef(true);\n  const normalizedPath = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n  const isStandalonePublicPage = normalizedPath === '/register' || normalizedPath === '/pendaftaran' || normalizedPath === '/pendaftaran/seeded-peserta';");
  }
  sync = sync.replace(/if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g, "if (isStandalonePublicPage || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
  app = app.slice(0, start) + sync + app.slice(end);
} else {
  console.log('[public-stability] UrlSynchronizer not found; skipping synchronizer patch safely');
}
app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
app = app.replace("const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));", "import PublicSeededPeserta from './components/PublicSeededPeserta';");
for (const route of [
  '<Route path="/register" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />'
]) if (!app.includes(route) && app.includes('<Route path="*" element=')) app = app.replace('<Route path="*" element=', `          ${route}\n          <Route path="*" element=`);
fs.writeFileSync(appPath, app, 'utf8');

let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('const standaloneTarget =')) {
  const direct = `    const normalizedSection = String(section || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const normalizedSubPath = String(subPath || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const standaloneTarget = normalizedSection === 'pendaftaran/seeded-peserta' || normalizedSection === 'seeded-peserta' || normalizedSubPath === 'seeded-peserta' ? '/pendaftaran/seeded-peserta' : (normalizedSection === 'register' || normalizedSection === 'pendaftaran' || normalizedSection === 'formulir-pendaftaran' || normalizedSubPath === 'register' || normalizedSubPath === 'pendaftaran' ? '/register' : null);\n    if (standaloneTarget) {\n      const current = window.location.pathname.replace(/^\\/+|\\/+$/g, '').toLowerCase();\n      if (current !== standaloneTarget.slice(1)) navigate(standaloneTarget);\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }`;
  nav = nav.replace(marker, `${marker}\n${direct}`);
}
nav = nav.replace(/(\s*case '\/pendaftaran-turnamen': void import\('\.\/PendaftaranTurnamen'\); break;)+/g, "\n      case '/pendaftaran-turnamen': void import('./PendaftaranTurnamen'); break;");
nav = nav.replace(/(\s*case '\/pendaftaran\/seeded-peserta': void import\('\.\/PublicSeededPeserta'\); break;)+/g, "\n      case '/pendaftaran/seeded-peserta': void import('./PublicSeededPeserta'); break;");
fs.writeFileSync(navPath, nav, 'utf8');
console.log('[public-stability] completed safely');
