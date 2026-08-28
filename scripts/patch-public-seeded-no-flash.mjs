import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

function replaceIfNeeded(path, from, to, label) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes(to)) return false;
  if (!s.includes(from)) {
    console.warn(`[patch-public-seeded-no-flash] ${label}: marker not found; leaving unchanged`);
    return false;
  }
  s = s.replace(from, to);
  fs.writeFileSync(path, s, 'utf8');
  return true;
}

// Keep the public seeded page on its own router path. The older activeView
// synchronizer otherwise performs a second navigation and causes a flash.
let app = fs.readFileSync(appPath, 'utf8');
const syncStart = "function UrlSynchronizer({ activeView, setActiveView }: { activeView: string | null; setActiveView: (view: string | null) => void; }) {\n  const location = useLocation();";
if (app.includes(syncStart) && !app.includes('const isPublicSeeded = location.pathname.replace')) {
  app = app.replace(syncStart, `${syncStart}\n  const isPublicSeeded = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran/seeded-peserta';`);
}
app = app.replace(
  "  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    const path = location.pathname.substring(1).toLowerCase();",
  "  useEffect(() => {\n    if (isPublicSeeded || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;\n    const path = location.pathname.substring(1).toLowerCase();"
);
app = app.replace(
  "  }, [location.pathname, location.search]);\n  useEffect(() => {\n    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;",
  "  }, [location.pathname, location.search, isPublicSeeded]);\n  useEffect(() => {\n    if (isPublicSeeded || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
);
app = app.replace(
  "  }, [activeView, navigate]);",
  "  }, [activeView, navigate, isPublicSeeded]);"
);
fs.writeFileSync(appPath, app, 'utf8');

// Navbar: one click should produce one direct router transition.
replaceIfNeeded(
  navPath,
  "  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);",
  "  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'pendaftaran/seeded-peserta') {\n        navigate('/pendaftaran/seeded-peserta', { replace: false });\n        return;\n      }\n      if (section === 'home' || section === 'beranda') onNavigate('home');\n      else onNavigate(section, tab);",
  'direct seeded navigation'
);

replaceIfNeeded(
  navPath,
  "    const effective = s || p;\n    const target = effective === 'atlet'",
  "    const effective = s || p;\n    const target = effective === 'pendaftaran/seeded-peserta'\n      ? '/pendaftaran/seeded-peserta'\n      : effective === 'atlet'",
  'seeded preload target'
);
replaceIfNeeded(
  navPath,
  "      case '/register': void import('./RegistrationForm'); break;",
  "      case '/register': void import('./RegistrationForm'); break;\n      case '/pendaftaran/seeded-peserta': void import('./PublicSeededPeserta'); break;",
  'seeded preload import'
);

console.log('[patch-public-seeded-no-flash] seeded navigation stabilized for desktop/mobile');
