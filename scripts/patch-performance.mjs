import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.tsx');
let app = fs.readFileSync(appPath, 'utf8');

// Public pages must not wait for authentication before the first paint.
app = app.replace("const [loading, setLoading] = useState(true);", "const [loading, setLoading] = useState(false);");

// Dedicated/public-only modules belong in route chunks, not the initial landing bundle.
const eagerToLazy = [
  ["import Sejarah from './components/Sejarah';", "const Sejarah = lazy(() => import('./components/Sejarah'));"],
  ["import VisiMisi from './components/VisiMisi';", "const VisiMisi = lazy(() => import('./components/VisiMisi'));"],
  ["import Fasilitas from './components/Fasilitas';", "const Fasilitas = lazy(() => import('./components/Fasilitas'));"],
  ["import News from './components/News';", "const News = lazy(() => import('./components/News'));"],
  ["import Contact from './components/Contact';", "const Contact = lazy(() => import('./components/Contact'));"],
  ["import Login from './components/Login';", "const Login = lazy(() => import('./components/Login'));"],
  ["import Sidebar from './components/Sidebar';", "const Sidebar = lazy(() => import('./components/Sidebar'));"],
  ["import JadwalLatihanView from './components/JadwalLatihanView';", "const JadwalLatihanView = lazy(() => import('./components/JadwalLatihanView'));"],
];
for (const [from, to] of eagerToLazy) app = app.replace(from, to);

// Route transitions should never serialize one view behind another.
app = app.replace('<AnimatePresence mode="wait">', '<AnimatePresence mode="sync">');
app = app.replace('transition={{ duration: 0.3 }}', 'transition={{ duration: 0.14, ease: "easeOut" }}');

// The auth synchronization remains background work; public rendering is already unblocked.
app = app.replace("    // Safety fallback: Force loading = false after 2.5s if Supabase/network is slow\n", "    // Authentication is background synchronization and must never block public rendering.\n");

fs.writeFileSync(appPath, app);

// Add a tiny runtime prefetch helper without importing route modules eagerly.
const helperPath = path.join(root, 'src', 'utils', 'performancePrefetch.ts');
const helper = `const warmed = new Set<string>();\n\nexport function warmPublicRoutes() {\n  if (typeof window === 'undefined') return;\n  const run = () => {\n    const jobs = [\n      () => import('../components/Players'),\n      () => import('../components/Rankings'),\n      () => import('../components/Gallery'),\n      () => import('../components/News'),\n      () => import('../components/PublicFAQ'),\n      () => import('../components/PublicPrestasi'),\n    ];\n    jobs.forEach((job, index) => {\n      const key = String(index);\n      if (warmed.has(key)) return;\n      warmed.add(key);\n      void job().catch(() => warmed.delete(key));\n    });\n  };\n  const ric = window.requestIdleCallback;\n  if (ric) ric(run, { timeout: 1200 });\n  else window.setTimeout(run, 700);\n}\n`;
fs.writeFileSync(helperPath, helper);

// Inject the prefetch call once, after the initial app effects are registered.
const importMarker = "import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper';";
if (!app.includes("./utils/performancePrefetch")) {
  app = app.replace(importMarker, `${importMarker}\nimport { warmPublicRoutes } from './utils/performancePrefetch';`);
}
const effectMarker = "  useEffect(() => {\n    // Authentication is background synchronization and must never block public rendering.";
if (!app.includes('warmPublicRoutes();')) {
  app = app.replace(effectMarker, "  useEffect(() => {\n    warmPublicRoutes();\n  }, []);\n\n" + effectMarker);
}
fs.writeFileSync(appPath, app);

console.log('[performance] public render unblocked, route chunks moved out of initial bundle, idle prefetch enabled');
