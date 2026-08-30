import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
let app = fs.readFileSync(appPath, 'utf8');

const start = app.indexOf('function UrlSynchronizer(');
const end = app.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start >= 0 && end >= 0) {
  let sync = app.slice(start, end);
  if (!sync.includes('__pbStandalonePath')) {
    sync = sync.replace(
      '  const isInitialMount = useRef(true);',
      "  const isInitialMount = useRef(true);\n  const __pbStandalonePath = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n  const __pbIsStandalone = __pbStandalonePath === '/register' || __pbStandalonePath === '/pendaftaran' || __pbStandalonePath === '/pendaftaran/seeded-peserta';"
    );
  }
  sync = sync.replace(
    /if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) \{/g,
    "if (__pbIsStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) {"
  );
  app = app.slice(0, start) + sync + app.slice(end);
} else {
  console.log('[public-stability] UrlSynchronizer not found; skipping synchronizer patch safely');
}

app = app.replace(
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm'));",
  "import RegistrationForm from './components/RegistrationForm';"
);
app = app.replace(
  "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));",
  "import PublicSeededPeserta from './components/PublicSeededPeserta';"
);

const rootRoute = '<Route path="/" element={renderPublicHome()} />';
const directRoutes = '<Route path="/register" element={<RegistrationForm />} />\n        <Route path="/pendaftaran" element={<RegistrationForm />} />\n        <Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';
if (!app.includes('<Route path="/register" element={<RegistrationForm />} />')) {
  if (app.includes(rootRoute)) {
    app = app.replace(rootRoute, `${rootRoute}\n        ${directRoutes}`);
  } else {
    console.log('[public-stability] root route anchor not found; skipping direct route patch safely');
  }
}
fs.writeFileSync(appPath, app, 'utf8');

let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('__pbDirectStandaloneTarget')) {
  const direct = "    const __pbRawPath = String(path || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __pbRawSubPath = String(subPath || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __pbDirectStandaloneTarget = (__pbRawPath === 'register' || __pbRawPath === 'pendaftaran' || __pbRawPath === 'formulir-pendaftaran' || __pbRawSubPath === 'register' || __pbRawSubPath === 'pendaftaran') ? '/register' : ((__pbRawPath === 'pendaftaran/seeded-peserta' || __pbRawPath === 'seeded-peserta' || __pbRawPath === 'daftar-seeded' || __pbRawSubPath === 'seeded-peserta') ? '/pendaftaran/seeded-peserta' : null);\n    if (__pbDirectStandaloneTarget) {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      const __pbCurrentPath = window.location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n      if (__pbCurrentPath !== __pbDirectStandaloneTarget) navigate(__pbDirectStandaloneTarget);\n      return;\n    }";
  nav = nav.replace(marker, `${marker}\n${direct}`);
} else if (!nav.includes(marker)) {
  console.log('[public-stability] Navbar navigation marker not found; skipping navigation patch safely');
}
fs.writeFileSync(navPath, nav, 'utf8');
console.log('[public-stability] completed safely');
