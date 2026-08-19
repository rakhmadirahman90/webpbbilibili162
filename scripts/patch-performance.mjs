import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

// Public rendering must never wait for authentication/network work.
app = app.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(false);");

// Keep heavy/dedicated views out of the first bundle.
const eagerToLazy = [
  ["import Sejarah from './components/Sejarah';", "const Sejarah = lazy(() => import('./components/Sejarah'));"],
  ["import VisiMisi from './components/VisiMisi';", "const VisiMisi = lazy(() => import('./components/VisiMisi'));"],
  ["import Fasilitas from './components/Fasilitas';", "const Fasilitas = lazy(() => import('./components/Fasilitas'));"],
  ["import News from './components/News';", "const News = lazy(() => import('./components/News'));"],
  ["import Contact from './components/Contact';", "const Contact = lazy(() => import('./components/Contact'));"],
  ["import Login from './components/Login';", "const Login = lazy(() => import('./components/Login'));"],
  ["import Sidebar from './components/Sidebar';", "const Sidebar = lazy(() => import('./components/Sidebar'));"],
  ["import JadwalLatihanView from './components/JadwalLatihanView';", "const JadwalLatihanView = lazy(() => import('./components/JadwalLatihanView'));"],
  ["import PresenceManager from './components/PresenceManager';", "const PresenceManager = lazy(() => import('./components/PresenceManager'));"],
  ["import KasRealtimeNotifier from './components/KasRealtimeNotifier';", "const KasRealtimeNotifier = lazy(() => import('./components/KasRealtimeNotifier'));"],
  ["import ScheduleWidget from './components/ScheduleWidget';", "const ScheduleWidget = lazy(() => import('./components/ScheduleWidget'));"],
];
for (const [from, to] of eagerToLazy) app = app.replace(from, to);

app = app.replace('<AnimatePresence mode="wait">', '<AnimatePresence mode="sync">');
app = app.replace('transition={{ duration: 0.3 }}', 'transition={{ duration: 0.14, ease: "easeOut" }}');
app = app.replace('<PresenceManager session={session} />', '<Suspense fallback={null}><PresenceManager session={session} /></Suspense>');
app = app.replace('<KasRealtimeNotifier />', '<Suspense fallback={null}><KasRealtimeNotifier /></Suspense>');
app = app.replace('<ScheduleWidget />', '<Suspense fallback={null}><ScheduleWidget /></Suspense>');

// Authentication remains background synchronization.
app = app.replace("    // Safety fallback: Force loading = false after 2.5s if Supabase/network is slow\n", "    // Authentication is background synchronization and never blocks public rendering.\n");

const helperPath = path.join(root, 'src', 'utils', 'performancePrefetch.ts');
const helper = `const warmed = new Set<string>();

export function warmPublicRoutes() {
  if (typeof window === 'undefined') return;
  const jobs = [
    () => import('../components/Players'),
    () => import('../components/Rankings'),
    () => import('../components/Gallery'),
    () => import('../components/News'),
    () => import('../components/PublicFAQ'),
    () => import('../components/PublicPrestasi'),
    () => import('../components/PublicProgram'),
    () => import('../components/PublicKasView'),
    () => import('../components/DokumenPenting'),
    () => import('../components/StrukturOrganisasiPublic'),
    () => import('../components/PublicInventaris'),
    () => import('../components/RegistrationForm'),
    () => import('../components/JadwalLatihanView'),
  ];
  const run = () => jobs.forEach((job, index) => {
    const key = String(index);
    if (warmed.has(key)) return;
    warmed.add(key);
    void job().catch(() => warmed.delete(key));
  });
  // Start very shortly after first paint. This makes normal menu taps hit
  // already-downloaded chunks without delaying the landing page itself.
  window.setTimeout(run, 120);
}
`;
fs.writeFileSync(helperPath, helper);

const importMarker = "import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper';";
if (!app.includes("./utils/performancePrefetch")) {
  app = app.replace(importMarker, `${importMarker}\nimport { warmPublicRoutes } from './utils/performancePrefetch';`);
}
if (!app.includes('warmPublicRoutes();')) {
  const marker = "  useEffect(() => {\n    // Authentication is background synchronization and never blocks public rendering.";
  if (app.includes(marker)) {
    app = app.replace(marker, "  useEffect(() => {\n    warmPublicRoutes();\n  }, []);\n\n" + marker);
  }
}
fs.writeFileSync(appPath, app);
console.log('[performance] public render unblocked; public route chunks prefetched after first paint; transitions reduced; realtime services deferred');
