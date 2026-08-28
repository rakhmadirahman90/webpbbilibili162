import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

let app = fs.readFileSync(appPath, 'utf8');

// Final safety layer: registration and public seeded pages are real router
// destinations. They must be completely invisible to the legacy activeView
// synchronizer, otherwise URL/state feedback can remount the page repeatedly.
const start = app.indexOf('function UrlSynchronizer(');
const end = app.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start < 0 || end < 0) throw new Error('[desktop-hard-stop] UrlSynchronizer block not found');
let sync = app.slice(start, end);

if (!sync.includes('const __standalonePublicPath')) {
  sync = sync.replace(
    '  const isInitialMount = useRef(true);',
    "  const isInitialMount = useRef(true);\n  const __standalonePublicPath = location.pathname.replace(/\\/+$/, '').toLowerCase();\n  const __isStandalonePublic = __standalonePublicPath === '/register' || __standalonePublicPath === '/pendaftaran' || __standalonePublicPath === '/pendaftaran/seeded-peserta';"
  );
}

// Make BOTH effects hard no-ops on the two affected pages.
sync = sync.replace(
  /useEffect\(\(\) => \{\n\s*if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g,
  "useEffect(() => {\n    if (__isStandalonePublic || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
);
sync = sync.replace(
  /useEffect\(\(\) => \{\n\s*if \(__isStandalonePublic \|\| location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g,
  "useEffect(() => {\n    if (__isStandalonePublic || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
);

// Do not let these paths enter the legacy full-page menu state machine.
sync = sync.replace(/'register','pendaftaran','pendaftaran\/seeded-peserta',/g, '');
app = app.slice(0, start) + sync + app.slice(end);

// Ensure the standalone pages are eagerly imported and explicitly routed.
app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
app = app.replace("const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));", "import PublicSeededPeserta from './components/PublicSeededPeserta';");
for (const route of [
  '<Route path="/register" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />'
]) {
  if (!app.includes(route)) {
    const anchor = '<Route path="/login" element={<Login />} />';
    if (!app.includes(anchor)) throw new Error(`[desktop-hard-stop] missing route anchor for ${route}`);
    app = app.replace(anchor, `${route}\n          ${anchor}`);
  }
}

fs.writeFileSync(appPath, app, 'utf8');

let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('__hardStandaloneTarget')) {
  const direct = `    const __rawPath = String(path || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const __rawSubPath = String(subPath || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const __hardStandaloneTarget = (__rawPath === 'register' || __rawPath === 'pendaftaran' || __rawSubPath === 'register' || __rawSubPath === 'pendaftaran') ? '/register' : ((__rawPath === 'pendaftaran/seeded-peserta' || __rawPath === 'seeded-peserta' || __rawPath === 'daftar-seeded' || __rawSubPath === 'seeded-peserta') ? '/pendaftaran/seeded-peserta' : null);\n    if (__hardStandaloneTarget) {\n      const __current = window.location.pathname.replace(/\\/+$/, '').toLowerCase();\n      if (__current !== __hardStandaloneTarget) window.location.assign(__hardStandaloneTarget);\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }`;
  nav = nav.replace(marker, `${marker}\n${direct}`);
}

fs.writeFileSync(navPath, nav, 'utf8');
console.log('[desktop-hard-stop] registration and seeded pages isolated from legacy navigation and forced one-way navigation');
