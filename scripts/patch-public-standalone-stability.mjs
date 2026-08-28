import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

let app = fs.readFileSync(appPath, 'utf8');

// Public registration and seeded pages are true router destinations. They must
// not participate in the legacy activeView <-> URL synchronizer because that
// creates a second navigation on desktop and can remount the page repeatedly.
const start = app.indexOf('function UrlSynchronizer(');
const endMarker = '\n\nconst renderDescriptionWithLinks';
const end = app.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('[patch-public-standalone-stability] UrlSynchronizer block not found');

const synchronizer = `function UrlSynchronizer({
  activeView,
  setActiveView
}: {
  activeView: string | null;
  setActiveView: (view: string | null) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  const normalizedPath = location.pathname.replace(/\\/+$/, '').toLowerCase() || '/';
  const isStandalonePublicPage =
    normalizedPath === '/register' ||
    normalizedPath === '/pendaftaran' ||
    normalizedPath === '/pendaftaran/seeded-peserta';

  // Standalone public pages own their URL through React Router. Never mirror
  // them into activeView, otherwise a click can cause URL -> state -> URL
  // feedback and repeated remounts/flicker.
  useEffect(() => {
    if (isStandalonePublicPage || normalizedPath.startsWith('/login') || normalizedPath.startsWith('/admin')) return;

    const path = normalizedPath.substring(1);
    const params = new URLSearchParams(location.search);
    const fullPageMenus = [
      'jadwal','jadwal-latihan','schedule','kas','quiz',
      'contact','kontak','struktur','struktur-organisasi',
      'dokumen-penting','dokumen','documents','register','pendaftaran',
      'peringkat','rankings','ranking','atlet','players','player',
      'tentang-kami','about','tentang','sejarah','galeri','gallery',
      'visi-misi','visi','misi','fasilitas','inventaris','public-inventaris',
      'berita','news','prestasi','program','faq','sambutan','sambutan-ketua'
    ];

    if (path === 'home' || path === 'beranda') {
      if (activeView !== null) setActiveView(null);
    } else if (path && fullPageMenus.includes(path)) {
      if (activeView !== path) setActiveView(path);
    } else if (!path && params.has('newsId')) {
      if (activeView !== 'berita') setActiveView('berita');
    } else if (!path && (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId'))) {
      if (activeView !== 'galeri') setActiveView('galeri');
    } else if (activeView !== null) {
      setActiveView(null);
    }
  }, [normalizedPath, location.search, isStandalonePublicPage]);

  useEffect(() => {
    if (isStandalonePublicPage || normalizedPath.startsWith('/login') || normalizedPath.startsWith('/admin')) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const currentPath = normalizedPath.substring(1);
    if (activeView) {
      if (currentPath !== activeView) {
        navigate(\`/\${activeView}\${location.search}\`, { replace: false });
      }
    } else if (currentPath) {
      navigate(\`/\${location.search}\`, { replace: false });
    }
  }, [activeView, navigate, normalizedPath, location.search, isStandalonePublicPage]);

  return null;
}`;

app = app.slice(0, start) + synchronizer + app.slice(end);

// Ensure public pages are eagerly loaded even if an earlier patch was skipped.
app = app.replace(
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm'));",
  "import RegistrationForm from './components/RegistrationForm';"
);
app = app.replace(
  "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));",
  "import PublicSeededPeserta from './components/PublicSeededPeserta';"
);

fs.writeFileSync(appPath, app, 'utf8');

let nav = fs.readFileSync(navPath, 'utf8');
const directGuard = "      if (section === 'register' || section === 'pendaftaran' || section === 'pendaftaran/seeded-peserta') { navigate(section === 'pendaftaran/seeded-peserta' ? '/pendaftaran/seeded-peserta' : '/register'); return; }";
if (!nav.includes(directGuard)) {
  const marker = "      if (section === 'home' || section === 'beranda') onNavigate('home');";
  if (!nav.includes(marker)) throw new Error('[patch-public-standalone-stability] Navbar navigation marker not found');
  nav = nav.replace(marker, `${directGuard}\n${marker}`);
}

// Direct preload targets reduce the chance of a desktop click showing an
// intermediate state. Preload is optional and never blocks navigation.
if (!nav.includes("effective === 'pendaftaran/seeded-peserta' ? '/pendaftaran/seeded-peserta'")) {
  const marker = "    const effective = s || p;\n    const target = effective === 'atlet'";
  if (nav.includes(marker)) {
    nav = nav.replace(marker, "    const effective = s || p;\n    const target = effective === 'pendaftaran/seeded-peserta' ? '/pendaftaran/seeded-peserta'\n      : effective === 'register' || effective === 'pendaftaran' ? '/register'\n      : effective === 'atlet'");
  }
}

fs.writeFileSync(navPath, nav, 'utf8');
console.log('[patch-public-standalone-stability] standalone public registration + seeded navigation stabilized');
