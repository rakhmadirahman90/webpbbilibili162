import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

function replaceIfMissing(path, from, to, label) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes(to)) return s;
  if (!s.includes(from)) {
    console.warn(`[patch-public-pages-mobile-fix] ${label}: marker not found; leaving unchanged`);
    return s;
  }
  s = s.replace(from, to);
  fs.writeFileSync(path, s, 'utf8');
  return s;
}

// Public tournament pages are real router destinations. Load them eagerly when
// possible so mobile navigation never shows a blank Suspense state. This patch
// is intentionally non-fatal because earlier stability patches may already have
// converted the same imports/routes into an equivalent form.
replaceIfMissing(
  appPath,
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm')); ",
  "import RegistrationForm from './components/RegistrationForm';",
  'registration eager import'
);
replaceIfMissing(
  appPath,
  "const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));",
  "import PendaftaranTurnamen from './components/PendaftaranTurnamen';",
  'tournament eager import'
);
replaceIfMissing(
  appPath,
  "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));",
  "import PublicSeededPeserta from './components/PublicSeededPeserta';",
  'seeded eager import'
);

// Add exact routes before the catch-all. Idempotent across builds.
let app = fs.readFileSync(appPath, 'utf8');
const routes = [
  '<Route path="/pendaftaran" element={<RegistrationForm />} />',
  '<Route path="/register" element={<RegistrationForm />} />',
  '<Route path="/pendaftaran-turnamen" element={<PendaftaranTurnamen />} />',
  '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />'
];
for (const route of routes) {
  if (app.includes(route)) continue;
  const anchor = '<Route path="*" element=';
  if (!app.includes(anchor)) {
    console.warn(`[patch-public-pages-mobile-fix] route anchor not found for ${route}; leaving unchanged`);
    continue;
  }
  app = app.replace(anchor, `          ${route}\n          ${anchor}`);
}

// Ensure URL synchronizer and initial route state recognize the tournament path.
const pathPatterns = [
  /'register','pendaftaran'(?!-turnamen)/g,
  /'register', 'pendaftaran'(?!-turnamen)/g
];
for (const re of pathPatterns) {
  app = app.replace(re, m => `${m},'pendaftaran-turnamen'`);
}

// A dedicated public page must not be redirected back through activeView.
const syncMarker = "  const location = useLocation();\n  const navigate = useNavigate();";
if (app.includes(syncMarker) && !app.includes('const isPublicTournamentPage =')) {
  app = app.replace(
    syncMarker,
    "  const location = useLocation();\n  const navigate = useNavigate();\n  const isPublicTournamentPage = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran-turnamen';"
  );
}
app = app.replace(
  "  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    const path = location.pathname.substring(1).toLowerCase();",
  "  useEffect(() => {\n    if (isPublicTournamentPage || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    const path = location.pathname.substring(1).toLowerCase();"
);
app = app.replace(
  "  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    if (isInitialMount.current) {",
  "  useEffect(() => {\n    if (isPublicTournamentPage || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    if (isInitialMount.current) {"
);

fs.writeFileSync(appPath, app, 'utf8');

// Mobile submenu clicks must use the same direct router transition as desktop.
let nav = fs.readFileSync(navPath, 'utf8');
const directNav = "if (section === 'pendaftaran/seeded-peserta' || section === 'pendaftaran-turnamen') { navigate(`/${section}`); return; }";
if (!nav.includes(directNav)) {
  const markers = [
    "      if (section === 'pendaftaran-turnamen') { navigate('/pendaftaran-turnamen'); return; }",
    "      if (section === 'pendaftaran/seeded-peserta') { navigate('/pendaftaran/seeded-peserta'); return; }",
    "      if (section === 'home' || section === 'beranda') onNavigate('home');"
  ];
  if (nav.includes(markers[0]) && nav.includes(markers[1])) {
    nav = nav.replace(markers[0] + '\n' + markers[1], `      ${directNav}`);
  } else if (nav.includes(markers[2])) {
    nav = nav.replace(markers[2], `      ${directNav}\n${markers[2]}`);
  } else {
    console.warn('[patch-public-pages-mobile-fix] Navbar navigation marker not found; leaving unchanged');
  }
}

// Exact preload targets for both public tournament pages; preload is optional.
if (!nav.includes("effective === 'pendaftaran-turnamen' ? '/pendaftaran-turnamen'")) {
  const marker = "    const effective = s || p;\n    const target = effective === 'atlet'";
  if (nav.includes(marker)) {
    nav = nav.replace(marker, "    const effective = s || p;\n    const target = effective === 'pendaftaran-turnamen' ? '/pendaftaran-turnamen'\n      : effective === 'atlet'");
  }
}
if (!nav.includes("case '/pendaftaran-turnamen': void import('./PendaftaranTurnamen'); break;")) {
  const marker = "      case '/register': void import('./RegistrationForm'); break;";
  if (nav.includes(marker)) nav = nav.replace(marker, `${marker}\n      case '/pendaftaran-turnamen': void import('./PendaftaranTurnamen'); break;`);
}
if (!nav.includes("case '/pendaftaran/seeded-peserta': void import('./PublicSeededPeserta'); break;")) {
  const marker = "      case '/register': void import('./RegistrationForm'); break;";
  if (nav.includes(marker)) nav = nav.replace(marker, `${marker}\n      case '/pendaftaran/seeded-peserta': void import('./PublicSeededPeserta'); break;`);
}

fs.writeFileSync(navPath, nav, 'utf8');
console.log('[patch-public-pages-mobile-fix] mobile + desktop tournament registration and seeded routes stabilized');
