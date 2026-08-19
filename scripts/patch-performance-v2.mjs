import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src/App.tsx');
const navbarPath = path.join(root, 'src/components/Navbar.tsx');
const sidebarPath = path.join(root, 'src/components/Sidebar.tsx');
const preloadPath = path.join(root, 'src/utils/routePreload.ts');

function patch(pathname, transform) {
  let source = fs.readFileSync(pathname, 'utf8');
  const next = transform(source);
  if (next !== source) fs.writeFileSync(pathname, next, 'utf8');
}

patch(appPath, (app) => {
  // Never block the application shell on Supabase auth I/O. Auth still syncs in
  // the background and protected routes remain guarded by the current session.
  app = app.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(false);');

  if (!app.includes("from './utils/routePreload'")) {
    app = app.replace(
      "import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper';",
      "import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper';\nimport { preloadPublicExperience, preloadAdminExperience } from './utils/routePreload';"
    );
  }

  if (!app.includes('preloadPublicExperience(getSiteSetting);')) {
    const marker = 'export default function App() {\n  const [session, setSession] = useState<any>(null);';
    const replacement = 'export default function App() {\n  const [session, setSession] = useState<any>(null);\n\n  // Warm only the most useful public route chunks after first paint.\n  useEffect(() => {\n    preloadPublicExperience(getSiteSetting);\n  }, []);';
    app = app.replace(marker, replacement);
  }

  if (!app.includes('preloadAdminExperience(getSiteSetting);')) {
    const marker = '  useEffect(() => {\n    // Safety fallback: Force loading = false after 2.5s if Supabase/network is slow';
    const replacement = '  useEffect(() => {\n    if (session) preloadAdminExperience(getSiteSetting);\n  }, [session]);\n\n  useEffect(() => {\n    // Safety fallback: Force loading = false after 2.5s if Supabase/network is slow';
    app = app.replace(marker, replacement);
  }

  // Keep route transitions short and GPU-friendly on mobile.
  app = app.replace("transition={{ duration: 0.3 }}", "transition={{ duration: 0.18, ease: 'easeOut' }}");
  return app;
});

patch(navbarPath, (source) => {
  if (!source.includes("from '../utils/routePreload'")) {
    source = source.replace(
      "import { forceRefreshSiteSettings } from '../utils/siteSettingsHelper';",
      "import { forceRefreshSiteSettings } from '../utils/siteSettingsHelper';\nimport { preloadPublicRoute } from '../utils/routePreload';"
    );
  }
  const marker = "const p = (path || '').toLowerCase(); const s = (subPath || '').toLowerCase();\n    if (p === 'home' || p === 'beranda')";
  const replacement = "const p = (path || '').toLowerCase(); const s = (subPath || '').toLowerCase();\n    void preloadPublicRoute(s || p);\n    if (p === 'home' || p === 'beranda')";
  return source.replace(marker, replacement);
});

patch(sidebarPath, (source) => {
  if (!source.includes("from '../utils/routePreload'")) {
    source = source.replace(
      "import { forceRefreshSiteSettings } from '../utils/siteSettingsHelper';",
      "import { forceRefreshSiteSettings } from '../utils/siteSettingsHelper';\nimport { preloadAdminRoute } from '../utils/routePreload';"
    );
  }

  // The sidebar status probe was running an extra DB request on every mount and
  // every 30 seconds. Navigation requests already surface their own failures.
  source = source.replace(
    "    checkConnection();\n    const interval = setInterval(checkConnection, 30000);\n    return () => clearInterval(interval);",
    "    // Do not probe Supabase on sidebar mount; keep the shell responsive.\n    // Actual data requests update their own state when an error occurs."
  );

  const clickMarker = 'onClick={onClose}\n                            className={`group flex items-center justify-between';
  const clickReplacement = 'onClick={() => { void preloadAdminRoute(item.path); onClose?.(); }}\n                            className={`group flex items-center justify-between';
  source = source.replace(clickMarker, clickReplacement);
  return source;
});

const preloadSource = `type Loader = () => Promise<unknown>;

const publicLoaders: Record<string, Loader> = {
  atlet: () => import('../components/Players'),
  players: () => import('../components/Players'),
  player: () => import('../components/Players'),
  peringkat: () => import('../components/Rankings'),
  ranking: () => import('../components/Rankings'),
  rankings: () => import('../components/Rankings'),
  prestasi: () => import('../components/PublicPrestasi'),
  berita: () => import('../components/News'),
  news: () => import('../components/News'),
  galeri: () => import('../components/Gallery'),
  gallery: () => import('../components/Gallery'),
  jadwal: () => import('../components/JadwalLatihanView'),
  'jadwal-latihan': () => import('../components/JadwalLatihanView'),
  schedule: () => import('../components/JadwalLatihanView'),
  kas: () => import('../components/PublicKasView'),
  quiz: () => import('../components/BadmintonQuiz'),
  register: () => import('../components/RegistrationForm'),
  pendaftaran: () => import('../components/RegistrationForm'),
  faq: () => import('../components/PublicFAQ'),
  program: () => import('../components/PublicProgram'),
  inventaris: () => import('../components/PublicInventaris'),
  dokumen: () => import('../components/DokumenPenting'),
  'dokumen-penting': () => import('../components/DokumenPenting'),
  struktur: () => import('../components/StrukturOrganisasiPublic'),
  'struktur-organisasi': () => import('../components/StrukturOrganisasiPublic'),
  contact: () => import('../components/Contact'),
  kontak: () => import('../components/Contact'),
};

const adminLoaders: Record<string, Loader> = {
  dashboard: () => import('../components/AdminDashboard'),
  users: () => import('../components/AdminUsers'),
  pendaftaran: () => import('../ManajemenPendaftaran'),
  atlet: () => import('../ManajemenAtlet'),
  absensi: () => import('../components/AdminAbsensi'),
  poin: () => import('../components/ManajemenPoin'),
  'audit-poin': () => import('../components/AuditLogPoin'),
  berita: () => import('../components/AdminBerita'),
  prestasi: () => import('../components/AdminPrestasi'),
  program: () => import('../components/AdminProgram'),
  faq: () => import('../components/AdminFAQ'),
  sejarah: () => import('../components/AdminSejarah'),
  'visi-misi': () => import('../components/AdminVisiMisi'),
  fasilitas: () => import('../components/AdminFasilitas'),
  struktur: () => import('../components/AdminStructure'),
  tampilan: () => import('../components/AdminTampilan'),
  navbar: () => import('../components/KelolaNavbar'),
  hero: () => import('../components/KelolaHero'),
  popup: () => import('../components/AdminPopup'),
  footer: () => import('../components/AdminFooter'),
  kontak: () => import('../components/AdminContact'),
  inventaris: () => import('../components/AdminInventaris'),
  surat: () => import('../components/KelolaSurat'),
  kas: () => import('../components/KasManager'),
  logs: () => import('../components/AdminLogs'),
  laporan: () => import('../components/AdminLaporan'),
  profil: () => import('../components/ProfilAnggota'),
  'rekap-keuangan': () => import('../components/AdminRekapKeuangan'),
  'analisis-performa': () => import('../components/AnalisisPerforma'),
  'rapor-atlet': () => import('../components/RaporAtlet'),
  'live-score': () => import('../components/LiveScoreWidget'),
  testimoni: () => import('../components/TestimonialUlasan'),
  'turnamen-liga': () => import('../components/TournamentLeague'),
  notifications: () => import('../components/FcmSettingsDashboard'),
  'pwa-apk': () => import('../components/PwaApkManager'),
};

const warmed = new Set<string>();
const run = (map: Record<string, Loader>, key: string) => {
  const loader = map[key];
  if (!loader || warmed.has(key)) return;
  warmed.add(key);
  void loader().catch(() => warmed.delete(key));
};

export function preloadPublicRoute(path = '') {
  const key = path.toLowerCase().replace(/^\\//, '');
  if (typeof window === 'undefined') return;
  run(publicLoaders, key);
}

export function preloadAdminRoute(path = '') {
  const key = path.toLowerCase().replace(/^\\//, '');
  if (typeof window === 'undefined') return;
  run(adminLoaders, key);
}

function idle(task: () => void, delay = 900) {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    const ric = (window as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined;
    if (ric) ric(task, { timeout: 2500 }); else task();
  }, delay);
}

export function preloadPublicExperience(_getSiteSetting?: (key: string) => Promise<any>) {
  idle(() => {
    // Warm only the highest-traffic routes. Remaining chunks load on first intent.
    ['atlet', 'peringkat', 'berita', 'galeri'].forEach(key => preloadPublicRoute(key));
  }, 700);
}

export function preloadAdminExperience(_getSiteSetting?: (key: string) => Promise<any>) {
  idle(() => {
    ['dashboard', 'atlet', 'pendaftaran', 'berita'].forEach(key => preloadAdminRoute(key));
  }, 500);
}
`;

fs.writeFileSync(preloadPath, preloadSource, 'utf8');
console.log('[performance-v2] non-blocking shell, intent-based route prefetch, and mobile navigation optimization applied');
