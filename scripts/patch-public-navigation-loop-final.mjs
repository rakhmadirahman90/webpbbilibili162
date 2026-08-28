import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

let app = fs.readFileSync(appPath, 'utf8');

// Registration and public seeded are true router pages. Never let the legacy
// activeView synchronizer or Suspense transition own these routes.
app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm')); ", "import RegistrationForm from './components/RegistrationForm';\n");
app = app.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
app = app.replace("const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));", "import PublicSeededPeserta from './components/PublicSeededPeserta';");

// Remove affected routes from every fullPageMenus declaration.
app = app.replace(/'register','pendaftaran','pendaftaran\/seeded-peserta',/g, '');

// Add a stable standalone flag inside UrlSynchronizer.
if (!app.includes('const __pbStandaloneRoute')) {
  app = app.replace(
    '  const isInitialMount = useRef(true);',
    "  const isInitialMount = useRef(true);\n  const __pbStandaloneRoute = location.pathname.replace(/\\/+$/, '').toLowerCase();\n  const __pbStandalone = __pbStandaloneRoute === '/register' || __pbStandaloneRoute === '/pendaftaran' || __pbStandaloneRoute === '/pendaftaran/seeded-peserta';"
  );
}

// Make both synchronizer effects return before touching activeView/navigation.
app = app.replace(
  "  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;",
  "  useEffect(() => {\n    if (__pbStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
);
app = app.replace(
  "  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    if (isInitialMount.current)",
  "  useEffect(() => {\n    if (__pbStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    if (isInitialMount.current)"
);

// Ensure explicit routes exist before the catch-all route.
const routeBlock = `          <Route path="/register" element={<RegistrationForm />} />\n          <Route path="/pendaftaran" element={<RegistrationForm />} />\n          <Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />\n`;
if (!app.includes('<Route path="/register" element={<RegistrationForm />} />')) {
  const anchor = '          <Route path="/admin/*" element={<AdminDashboard />} />';
  if (!app.includes(anchor)) throw new Error('[final-navigation] route anchor missing');
  app = app.replace(anchor, routeBlock + anchor);
}

// Remove the outer Suspense around Routes only if it is exactly the public route
// wrapper. Standalone pages must not flash the fallback between clicks.
app = app.replace(
  /      <Suspense fallback=\{<ViewFallback \/>\}>\s*\n        <Routes>([\s\S]*?)\n        <\/Routes>\s*\n      <\/Suspense>/,
  '      <Routes>$1\n      </Routes>'
);

fs.writeFileSync(appPath, app, 'utf8');

// Navbar: bypass onNavigate/activeView completely for these two destinations.
let nav = fs.readFileSync(navPath, 'utf8');
const old = `  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);\n    } catch (error) {\n      const fallback = section === 'home' || section === 'beranda' ? '/' : \`/\${section}\`;\n      navigate(fallback);\n    } finally {\n      setOpenMenu(null);\n      setMobileOpen(false);\n    }\n  };`;
const replacement = `  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    const normalizedPath = String(path || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const normalizedSub = String(subPath || '').toLowerCase().replace(/^\\/+|\\/+$/g, '');\n    const standaloneTarget = (normalizedPath === 'register' || normalizedPath === 'pendaftaran' || normalizedSub === 'register' || normalizedSub === 'pendaftaran')\n      ? '/register'\n      : (normalizedPath === 'pendaftaran/seeded-peserta' || normalizedPath === 'seeded-peserta' || normalizedPath === 'daftar-seeded' || normalizedSub === 'seeded-peserta')\n        ? '/pendaftaran/seeded-peserta'\n        : null;\n    if (standaloneTarget) {\n      if (window.location.pathname.replace(/\\/+$/, '').toLowerCase() !== standaloneTarget) {\n        navigate(standaloneTarget);\n      }\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }\n    try {\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);\n    } catch (error) {\n      const fallback = section === 'home' || section === 'beranda' ? '/' : \`/\${section}\`;\n      navigate(fallback);\n    } finally {\n      setOpenMenu(null);\n      setMobileOpen(false);\n    }\n  };`;
if (nav.includes(old)) nav = nav.replace(old, replacement);
else if (!nav.includes('const standaloneTarget =')) throw new Error('[final-navigation] Navbar go() block not found');

fs.writeFileSync(navPath, nav, 'utf8');
console.log('[final-navigation] repeat-click navigation loop removed');
