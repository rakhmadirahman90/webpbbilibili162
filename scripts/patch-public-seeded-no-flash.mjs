import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

function replaceOnce(path, from, to, label) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes(to)) return;
  if (!s.includes(from)) throw new Error(`[patch-public-seeded-no-flash] ${label}: marker not found`);
  s = s.replace(from, to);
  fs.writeFileSync(path, s, 'utf8');
}

// 1) The seeded public page is a real top-level route. Do not let the
// application-level activeView synchronizer also navigate it; that creates a
// two-step state/URL transition and a visible flash on desktop/mobile.
replaceOnce(
  appPath,
  "function UrlSynchronizer({ activeView, setActiveView }: { activeView: string | null; setActiveView: (view: string | null) => void; }) {\n  const location = useLocation();",
  "function UrlSynchronizer({ activeView, setActiveView }: { activeView: string | null; setActiveView: (view: string | null) => void; }) {\n  const location = useLocation();\n  const isPublicSeeded = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran/seeded-peserta';",
  'seeded synchronizer flag'
);
replaceOnce(
  appPath,
  "  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    const path = location.pathname.substring(1).toLowerCase();",
  "  useEffect(() => {\n    if (isPublicSeeded || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    const path = location.pathname.substring(1).toLowerCase();",
  'seeded synchronizer guard'
);
replaceOnce(
  appPath,
  "  }, [location.pathname, location.search]);\n  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;",
  "  }, [location.pathname, location.search, isPublicSeeded]);\n  useEffect(() => {\n    if (isPublicSeeded || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;",
  'seeded navigation effect guard'
);
replaceOnce(
  appPath,
  "  }, [activeView, navigate]);\n  return null;",
  "  }, [activeView, navigate, isPublicSeeded]);\n  return null;",
  'seeded navigation dependencies'
);

// 2) Navbar must navigate directly to the seeded route instead of first
// calling App.onNavigate(). This makes one click = one router transition.
replaceOnce(
  navPath,
  "  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);",
  "  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'pendaftaran/seeded-peserta') {\n        navigate('/pendaftaran/seeded-peserta', { replace: false });\n        return;\n      }\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);",
  'direct seeded navigation'
);

// 3) Preload the exact seeded chunk as well, but never make preload a
// prerequisite for navigation.
replaceOnce(
  navPath,
  "    if (!target) return;\n    try { warmupRouteData(target); } catch { /* prefetch must never block navigation */ }",
  "    if (!target) return;\n    try { warmupRouteData(target); } catch { /* prefetch must never block navigation */ }",
  'preload stability'
);

// 4) If the navbar's DB/default path is seeded, resolve it to the exact public
// URL before any legacy section handling.
replaceOnce(
  navPath,
  "    const effective = s || p;\n    const target = effective === 'atlet'",
  "    const effective = s || p;\n    const target = effective === 'pendaftaran/seeded-peserta'\n      ? '/pendaftaran/seeded-peserta'\n      : effective === 'atlet'",
  'seeded preload target'
);
replaceOnce(
  navPath,
  "      case '/register': void import('./RegistrationForm'); break;",
  "      case '/register': void import('./RegistrationForm'); break;\n      case '/pendaftaran/seeded-peserta': void import('./PublicSeededPeserta'); break;",
  'seeded preload import'
);

console.log('[patch-public-seeded-no-flash] seeded navigation stabilized for desktop/mobile');
