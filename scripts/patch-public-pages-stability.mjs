import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
let app = fs.readFileSync(appPath, 'utf8');

// The public site historically uses an activeView state machine plus a
// URL synchronizer and AnimatePresence. Registration/Seeded are data-heavy
// public pages, so keep them as true router destinations instead of letting
// them participate in that state machine. This prevents remount/flicker.
const start = app.indexOf('function UrlSynchronizer(');
const end = app.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start < 0 || end < 0) throw new Error('[public-stability] UrlSynchronizer not found');
let sync = app.slice(start, end);

if (!sync.includes('__pbStandalonePath')) {
  sync = sync.replace(
    '  const isInitialMount = useRef(true);',
    "  const isInitialMount = useRef(true);\n  const __pbStandalonePath = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n  const __pbIsStandalone = __pbStandalonePath === '/register' || __pbStandalonePath === '/pendaftaran' || __pbStandalonePath === '/pendaftaran/seeded-peserta';"
  );
}

// Make both URL->state and state->URL effects no-ops on standalone routes.
sync = sync.replace(
  /if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) \{/g,
  "if (__pbIsStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) {"
);

app = app.slice(0, start) + sync + app.slice(end);

// Ensure components are available synchronously so there is no Suspense swap
// on these two routes after a hard refresh.
app = app.replace(
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm'));",
  "import RegistrationForm from './components/RegistrationForm';"
);
app = app.replace(
  "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));",
  "import PublicSeededPeserta from './components/PublicSeededPeserta';"
);

// Add exact routes BEFORE /:viewParam. React Router then never renders the
// animated activeView shell for these pages.
const rootRoute = '<Route path="/" element={renderPublicHome()} />';
const directRoutes = '<Route path="/register" element={<RegistrationForm />} />\n        <Route path="/pendaftaran" element={<RegistrationForm />} />\n        <Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';
if (!app.includes('<Route path="/register" element={<RegistrationForm />} />')) {
  if (!app.includes(rootRoute)) throw new Error('[public-stability] root route anchor not found');
  app = app.replace(rootRoute, `${rootRoute}\n        ${directRoutes}`);
}

fs.writeFileSync(appPath, app, 'utf8');

// Menu click must navigate directly to the router destination. Calling
// onNavigate first changes activeView and causes an unnecessary render before
// the URL changes; that is the visible desktop flicker the user reported.
let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('__pbDirectStandaloneTarget')) {
  const direct = "    const __pbRawPath = String(path || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __pbRawSubPath = String(subPath || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __pbDirectStandaloneTarget = (__pbRawPath === 'register' || __pbRawPath === 'pendaftaran' || __pbRawPath === 'formulir-pendaftaran' || __pbRawSubPath === 'register' || __pbRawSubPath === 'pendaftaran') ? '/register' : ((__pbRawPath === 'pendaftaran/seeded-peserta' || __pbRawPath === 'seeded-peserta' || __pbRawPath === 'daftar-seeded' || __pbRawSubPath === 'seeded-peserta') ? '/pendaftaran/seeded-peserta' : null);\n    if (__pbDirectStandaloneTarget) {\n      setOpenMenu(null);\n      setMobileOpen(false);\n      const __pbCurrentPath = window.location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';\n      if (__pbCurrentPath !== __pbDirectStandaloneTarget) navigate(__pbDirectStandaloneTarget);\n      return;\n    }";
  nav = nav.replace(marker, `${marker}\n${direct}`);
}
fs.writeFileSync(navPath, nav, 'utf8');
console.log('[public-stability] isolated router destinations + direct navigation applied');
