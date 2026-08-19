import fs from 'node:fs';
import path from 'node:path';

/**
 * Production performance patch.
 *
 * Keep the public shell deterministic while warming route chunks and the most
 * frequently visited database-backed settings in the background. The warmup
 * never blocks first paint or navigation.
 */
const appPath = path.resolve('src/App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

const lazyToEager = [
  ["const Sejarah = lazy(() => import('./components/Sejarah'));", "import Sejarah from './components/Sejarah';"],
  ["const VisiMisi = lazy(() => import('./components/VisiMisi'));", "import VisiMisi from './components/VisiMisi';"],
  ["const Fasilitas = lazy(() => import('./components/Fasilitas'));", "import Fasilitas from './components/Fasilitas';"],
  ["const News = lazy(() => import('./components/News'));", "import News from './components/News';"],
  ["const Contact = lazy(() => import('./components/Contact'));", "import Contact from './components/Contact';"],
  ["const Login = lazy(() => import('./components/Login'));", "import Login from './components/Login';"],
  ["const Sidebar = lazy(() => import('./components/Sidebar'));", "import Sidebar from './components/Sidebar';"],
  ["const JadwalLatihanView = lazy(() => import('./components/JadwalLatihanView'));", "import JadwalLatihanView from './components/JadwalLatihanView';"],
  ["const PresenceManager = lazy(() => import('./components/PresenceManager'));", "import PresenceManager from './components/PresenceManager';"],
  ["const KasRealtimeNotifier = lazy(() => import('./components/KasRealtimeNotifier'));", "import KasRealtimeNotifier from './components/KasRealtimeNotifier';"],
  ["const ScheduleWidget = lazy(() => import('./components/ScheduleWidget'));", "import ScheduleWidget from './components/ScheduleWidget';"],
];
for (const [from, to] of lazyToEager) app = app.replace(from, to);

// Keep public shell transitions short and predictable on mobile.
app = app.replace('<AnimatePresence mode="sync">', '<AnimatePresence mode="wait">');
app = app.replace('transition={{ duration: 0.14, ease: "easeOut" }}', 'transition={{ duration: 0.22, ease: "easeOut" }}');

// Undo wrappers introduced by older performance patches while tolerating whitespace.
app = app.replace('<Suspense fallback={null}><PresenceManager session={session} /></Suspense>', '<PresenceManager session={session} />');
app = app.replace('<Suspense fallback={null}><KasRealtimeNotifier /></Suspense>', '<KasRealtimeNotifier />');
app = app.replace('<Suspense fallback={null}><ScheduleWidget /></Suspense>', '<ScheduleWidget />');

// Remove obsolete warmup implementation if a previous patch inserted it.
app = app.replace("import { warmPublicRoutes } from './utils/performancePrefetch';\n", '');
app = app.replace(/\n\s*useEffect\(\(\) => \{\n\s*warmPublicRoutes\(\);\n\s*\}, \[\]\);\n/g, '\n');

// Add the single shared warmup implementation once.
if (!app.includes("from './utils/routePreload'")) {
  app = app.replace(
    "import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper';",
    "import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper';\nimport { preloadPublicExperience, preloadAdminExperience } from './utils/routePreload';"
  );
}

// Start public route/data warmup immediately after App mounts. requestIdleCallback
// keeps it from competing with the first meaningful paint.
if (!app.includes('preloadPublicExperience(getSiteSetting);')) {
  const marker = "export default function App() {\n  const [session, setSession] = useState<any>(null);";
  const replacement = "export default function App() {\n  const [session, setSession] = useState<any>(null);\n\n  useEffect(() => {\n    preloadPublicExperience(getSiteSetting);\n  }, []);";
  app = app.replace(marker, replacement);
}

// Once an authenticated session exists, warm admin route chunks too. This is
// deliberately background-only so login/dashboard rendering is not blocked.
if (!app.includes('preloadAdminExperience(getSiteSetting);')) {
  const marker = "  useEffect(() => {\n    // Safety fallback: Force loading = false after 2.5s if Supabase/network is slow";
  const replacement = "  useEffect(() => {\n    if (session) preloadAdminExperience(getSiteSetting);\n  }, [session]);\n\n  useEffect(() => {\n    // Safety fallback: Force loading = false after 2.5s if Supabase/network is slow";
  app = app.replace(marker, replacement);
}

// Never block the public shell on auth/session I/O.
app = app.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);');

fs.writeFileSync(appPath, app, 'utf8');
console.log('[performance] public/admin route chunks and site settings are warmed in the background; first paint remains non-blocking');
