import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
let app = fs.readFileSync(appPath, 'utf8');

const start = app.indexOf('function UrlSynchronizer(');
const end = app.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start < 0 || end < 0) throw new Error('[public-stability] UrlSynchronizer not found');
let sync = app.slice(start, end);

if (!sync.includes('__pbStandalonePath')) {
  sync = sync.replace('  const isInitialMount = useRef(true);', "  const isInitialMount = useRef(true);\n  const __pbStandalonePath = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n  const __pbIsStandalone = __pbStandalonePath === '/register' || __pbStandalonePath === '/pendaftaran' || __pbStandalonePath === '/pendaftaran/seeded-peserta';");
}

// Disable BOTH directions of the legacy URL/state synchronizer on standalone pages.
sync = sync.replace(/useEffect\(\(\) => \{\n\s*if \([^\n]*location\.pathname\.startsWith\('\/login'\)[^\n]*\) return;/g, "useEffect(() => {\n    if (__pbIsStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
sync = sync.replace(/useEffect\(\(\) => \{\n\s*if \(__pbIsStandalone[^\n]*\) return;/g, "useEffect(() => {\n    if (__pbIsStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");

// Do not include standalone pages in the legacy activeView menu list.
sync = sync.replace(/'register','pendaftaran','pendaftaran\/seeded-peserta',/g, '');
app = app.slice(0, start) + sync + app.slice(end);

app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm')); ", "import RegistrationForm from './components/RegistrationForm';");
app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
app = app.replace("const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));", "import PublicSeededPeserta from './components/PublicSeededPeserta';");

for (const route of [
  '<Route path="/register" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />'
]) {
  if (!app.includes(route)) {
    const anchor = '<Route path="/login" element={<Login />} />';
    if (!app.includes(anchor)) throw new Error(`[public-stability] route anchor missing for ${route}`);
    app = app.replace(anchor, `${route}\n          ${anchor}`);
  }
}

app = app.replace(/<Suspense fallback=\{<ViewFallback \/>\}>\s*<Routes>([\s\S]*?)<\/Routes>\s*<\/Suspense>/, '<Routes>$1</Routes>');
fs.writeFileSync(appPath, app, 'utf8');

let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('__pbHardStandaloneTarget')) {
  const hard = "    const __pbRawPath = String(path || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __pbRawSubPath = String(subPath || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __pbHardStandaloneTarget = (__pbRawPath === 'register' || __pbRawPath === 'pendaftaran' || __pbRawPath === 'formulir-pendaftaran' || __pbRawSubPath === 'register' || __pbRawSubPath === 'pendaftaran') ? '/register' : ((__pbRawPath === 'pendaftaran/seeded-peserta' || __pbRawPath === 'seeded-peserta' || __pbRawPath === 'daftar-seeded' || __pbRawSubPath === 'seeded-peserta') ? '/pendaftaran/seeded-peserta' : null);\n    if (__pbHardStandaloneTarget) {\n      const __pbCurrentPath = window.location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n      if (__pbCurrentPath !== __pbHardStandaloneTarget) window.location.assign(__pbHardStandaloneTarget);\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }";
  nav = nav.replace(marker, `${marker}\n${hard}`);
}
fs.writeFileSync(navPath, nav, 'utf8');
console.log('[public-stability] hard-stop registration + seeded navigation applied');
