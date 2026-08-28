import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

function replaceIfNeeded(path, from, to, label) {
  let s = fs.readFileSync(path, 'utf8');
  if (s.includes(to)) return false;
  if (!s.includes(from)) {
    console.log(`[patch-public-seeded-no-flash] ${label}: marker not found; leaving unchanged`);
    return false;
  }
  s = s.replace(from, to);
  fs.writeFileSync(path, s, 'utf8');
  return true;
}

// Keep the public seeded page on its own router path. The older activeView
// synchronizer otherwise performs a second navigation and can flash or loop.
let app = fs.readFileSync(appPath, 'utf8');
const seededGuard = "  const isPublicSeeded = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran/seeded-peserta';";
const locationMarker = '  const location = useLocation();\n  const navigate = useNavigate();';

// Always ensure the declaration exists before any effect can reference it.
if (!app.includes(seededGuard) && app.includes(locationMarker)) {
  app = app.replace(locationMarker, `${locationMarker}\n${seededGuard}`);
}

// Support both the current source and older generated variants. Apply the
// guard to every synchronizer effect, not only the first matching occurrence.
const normalGuard = "    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;";
const seededNormalGuard = "    if (isPublicSeeded || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;";
app = app.split(normalGuard).join(seededNormalGuard);

const oldDeps = "  }, [location.pathname, location.search]);";
const newDeps = "  }, [location.pathname, location.search, isPublicSeeded]);";
app = app.split(oldDeps).join(newDeps);

const oldActiveDeps = "  }, [activeView, navigate]);";
const newActiveDeps = "  }, [activeView, navigate, isPublicSeeded]);";
app = app.split(oldActiveDeps).join(newActiveDeps);

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

console.log('[patch-public-seeded-no-flash] seeded navigation guard stabilized for desktop/mobile');
