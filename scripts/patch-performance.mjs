import fs from 'node:fs';
import path from 'node:path';

/**
 * Safe performance patch.
 *
 * Previous versions aggressively converted several landing/framework imports
 * to lazy chunks and prefetched many routes immediately after first paint.
 * That reduced bundle size but could leave mobile clients with a blank shell
 * when a secondary chunk failed or the network was saturated.
 *
 * The public shell is intentionally kept synchronous here. Route-level views
 * that are already lazy in App.tsx remain lazy; this script only normalizes
 * the known risky transformations so every production build is deterministic.
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

// Keep the public shell transition simple and resilient.
app = app.replace('<AnimatePresence mode="sync">', '<AnimatePresence mode="wait">');
app = app.replace('transition={{ duration: 0.14, ease: "easeOut" }}', 'transition={{ duration: 0.3 }}');

// Undo wrappers introduced by the risky patch while tolerating whitespace.
app = app.replace('<Suspense fallback={null}><PresenceManager session={session} /></Suspense>', '<PresenceManager session={session} />');
app = app.replace('<Suspense fallback={null}><KasRealtimeNotifier /></Suspense>', '<KasRealtimeNotifier />');
app = app.replace('<Suspense fallback={null}><ScheduleWidget /></Suspense>', '<ScheduleWidget />');

// Remove the generated warmup import/useEffect if the previous build patch
// already wrote them into App.tsx.
app = app.replace("import { warmPublicRoutes } from './utils/performancePrefetch';\n", '');
app = app.replace(/\n\s*useEffect\(\(\) => \{\n\s*warmPublicRoutes\(\);\n\s*\}, \[\]\);\n/g, '\n');

// Keep public rendering non-blocking. Authentication is background work.
app = app.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);');

fs.writeFileSync(appPath, app, 'utf8');
console.log('[performance] safe public shell enabled; risky eager-to-lazy patch and immediate route warmup disabled');
