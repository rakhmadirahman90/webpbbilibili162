import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

let app = fs.readFileSync(appPath, 'utf8');

// Tournament registration must be a real standalone page. Keep it outside the
// legacy activeView <-> URL feedback loop; otherwise navigating from another
// page can race with the stale activeView and bounce the URL back and forth.
app = app.replace(
  "const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));",
  "import PendaftaranTurnamen from './components/PendaftaranTurnamen';"
);

const syncStart = app.indexOf('function UrlSynchronizer(');
const syncEnd = app.indexOf('\n\nconst renderDescriptionWithLinks', syncStart);
if (syncStart < 0 || syncEnd <= syncStart) throw new Error('[tournament-navigation-stability] UrlSynchronizer not found');

let block = app.slice(syncStart, syncEnd);
if (!block.includes('__standaloneTournament')) {
  block = block.replace(
    '  const isInitialMount = useRef(true);',
    "  const isInitialMount = useRef(true);\n  const __standaloneTournament = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran-turnamen';"
  );
}

// IMPORTANT: there are TWO synchronizer effects. Guard BOTH. The second effect
// is the actual source of the endless bounce: it sees the old activeView after
// clicking the tournament menu and navigates back to the previous page.
block = block.replace(
  /if \((?:__standaloneTournament \|\| )?location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g,
  "if (__standaloneTournament || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
);

// Remove tournament from the legacy full-page lists so the initial activeView
// cannot claim ownership of the standalone URL.
block = block.replace(/'pendaftaran-turnamen',\s*/g, '');
app = app.slice(0, syncStart) + block + app.slice(syncEnd);
app = app.replace(/'pendaftaran-turnamen',\s*/g, '');
app = app.replace(/,\s*'pendaftaran-turnamen'/g, '');

// Add the standalone route before the wildcard route. It can remain inside the
// global Suspense boundary because the component itself is eager-loaded above.
const route = '          <Route path="/pendaftaran-turnamen" element={<div className="min-h-screen bg-[#070d1a]"><Navbar onNavigate={handleNavigate} /><main className="pt-14 lg:pt-16 min-h-screen"><div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 pb-8"><PendaftaranTurnamen /></div></main></div>} />';
const wildcard = '          <Route path="*" element=';
if (!app.includes(route)) {
  if (!app.includes(wildcard)) throw new Error('[tournament-navigation-stability] wildcard route not found');
  app = app.replace(wildcard, `${route}\n${wildcard}`);
}

fs.writeFileSync(appPath, app, 'utf8');

// Direct navigation from the navbar prevents onNavigate/activeView from
// participating in this route at all.
let nav = fs.readFileSync(navPath, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes("section === 'pendaftaran-turnamen'")) {
  nav = nav.replace(
    marker,
    `${marker}\n    if (section === 'pendaftaran-turnamen') { navigate('/pendaftaran-turnamen'); setOpenMenu(null); setMobileOpen(false); return; }`
  );
}
fs.writeFileSync(navPath, nav, 'utf8');

console.log('[tournament-navigation-stability] fixed both URL synchronizer effects and direct tournament navigation');