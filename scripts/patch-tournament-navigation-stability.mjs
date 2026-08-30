import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';
let app = fs.readFileSync(appPath, 'utf8');

app = app.replace(
  "const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));",
  "import PendaftaranTurnamen from './components/PendaftaranTurnamen';"
);
app = app.replace(/'pendaftaran-turnamen',\s*/g, '');
app = app.replace(/,\s*'pendaftaran-turnamen'/g, '');

const syncStart = app.indexOf('function UrlSynchronizer(');
const syncEnd = app.indexOf('\n\nconst renderDescriptionWithLinks', syncStart);
if (syncStart < 0 || syncEnd <= syncStart) {
  console.log('[tournament-navigation-stability] UrlSynchronizer not found; skipping safely');
  process.exit(0);
}

const synchronizer = `function UrlSynchronizer({ activeView, setActiveView }: { activeView: string | null; setActiveView: (view: string | null) => void; }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pendingUrlSync = useRef(false);
  const standalonePath = location.pathname.replace(/\\/+$/, '').toLowerCase();
  const isStandaloneTournament = standalonePath === '/pendaftaran-turnamen';
  useEffect(() => {
    if (isStandaloneTournament || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;
    pendingUrlSync.current = true;
    const path = location.pathname.substring(1).toLowerCase();
    const params = new URLSearchParams(location.search);
    const fullPageMenus = ['jadwal','jadwal-latihan','schedule','kas','quiz','contact','kontak','struktur','struktur-organisasi','dokumen-penting','dokumen','documents','register','pendaftaran','pendaftaran/seeded-peserta','peringkat','rankings','ranking','atlet','players','player','tentang-kami','about','tentang','sejarah','galeri','gallery','visi-misi','visi','misi','fasilitas','inventaris','public-inventaris','berita','news','faq','sambutan','sambutan-ketua'];
    if (path) {
      if (path === 'home' || path === 'beranda') { if (activeView !== null) setActiveView(null); }
      else if (fullPageMenus.includes(path)) { if (activeView !== path) setActiveView(path); }
      else if (activeView !== null) setActiveView(null);
    } else if (params.has('newsId')) { if (activeView !== 'berita') setActiveView('berita'); }
    else if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) { if (activeView !== 'galeri') setActiveView('galeri'); }
    else if (activeView !== null) setActiveView(null);
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (isStandaloneTournament || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;
    if (pendingUrlSync.current) { pendingUrlSync.current = false; return; }
    const currentPath = location.pathname.substring(1).toLowerCase();
    if (activeView) { if (currentPath !== activeView) navigate('/' + activeView + location.search, { replace: false }); }
    else if (currentPath) navigate('/' + location.search, { replace: false });
  }, [activeView, navigate, location.pathname, location.search]);
  return null;
}`;
app = app.slice(0, syncStart) + synchronizer + app.slice(syncEnd);

const route = '          <Route path="/pendaftaran-turnamen" element={<div className="min-h-screen bg-[#070d1a]"><Navbar onNavigate={handleNavigate} /><main className="pt-14 lg:pt-16 min-h-screen"><div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 pb-8"><PendaftaranTurnamen /></div></main></div>} />';
const wildcard = '          <Route path="*" element=';
if (!app.includes(route)) {
  if (!app.includes(wildcard)) {
    console.log('[tournament-navigation-stability] wildcard route not found; skipping route patch safely');
  } else {
    app = app.replace(wildcard, route + '\n' + wildcard);
  }
}
fs.writeFileSync(appPath, app, 'utf8');

let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes("section === 'pendaftaran-turnamen'")) {
  nav = nav.replace(marker, marker + "\n    if (section === 'pendaftaran-turnamen') { navigate('/pendaftaran-turnamen'); setOpenMenu(null); setMobileOpen(false); return; }");
}
const fragmentClose = '\n  </>;\n}';
if (nav.includes(fragmentClose)) {
  const tailIndex = nav.lastIndexOf(fragmentClose);
  const beforeTail = nav.slice(0, tailIndex);
  const afterTail = nav.slice(tailIndex);
  if (!beforeTail.trimEnd().endsWith('</nav>')) nav = beforeTail + '\n    </nav>' + afterTail;
}
fs.writeFileSync(navPath, nav, 'utf8');
console.log('[tournament-navigation-stability] completed safely');
