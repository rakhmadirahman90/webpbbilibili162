import fs from 'node:fs';

const appPath = 'src/App.tsx';
const navPath = 'src/components/Navbar.tsx';

function replaceOnce(file, from, to, label) {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`[patch-tournament-navigation-stability] marker not found in ${file}: ${label}`);
  fs.writeFileSync(file, src.replace(from, to), 'utf8');
}

let app = fs.readFileSync(appPath, 'utf8');

// Tournament registration is a real standalone route. It must not participate
// in activeView <-> URL synchronization because that legacy state machine can
// briefly render the landing page before switching to the form on desktop.
app = app.replace(
  "const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));",
  "import PendaftaranTurnamen from './components/PendaftaranTurnamen';"
);

// Remove the tournament path from initial activeView allowlists. The dedicated
// route owns this URL; activeView must remain null while it is mounted.
app = app.replace(/'pendaftaran-turnamen',\s*/g, '');
app = app.replace(/,\s*'pendaftaran-turnamen'/g, '');

// Make UrlSynchronizer completely ignore the standalone tournament page.
const syncStart = app.indexOf('function UrlSynchronizer(');
const syncEnd = app.indexOf('\n\nconst renderDescriptionWithLinks', syncStart);
if (syncStart >= 0 && syncEnd > syncStart) {
  let block = app.slice(syncStart, syncEnd);
  if (!block.includes('__standaloneTournament')) {
    block = block.replace(
      '  const isInitialMount = useRef(true);',
      "  const isInitialMount = useRef(true);\n  const __standaloneTournament = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran-turnamen';"
    );
  }
  block = block.replace(
    "if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;",
    "if (__standaloneTournament || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
  );
  block = block.replace(
    "if (__standaloneTournament || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;",
    "if (__standaloneTournament || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
  );
  app = app.slice(0, syncStart) + block + app.slice(syncEnd);
}

// Add one exact route before the generic /:viewParam route. The page keeps the
// global navbar, but the form itself is mounted directly without the animated
// activeView shell or Suspense fallback.
const routeMarker = '        <Route path="/:viewParam" element={renderPublicHome()} />';
const standaloneRoute = '        <Route path="/pendaftaran-turnamen" element={<div className="min-h-screen bg-[#070d1a]"><Navbar onNavigate={handleNavigate} /><main className="pt-14 lg:pt-16 min-h-screen"><div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 pb-8"><PendaftaranTurnamen /></div></main></div>} />';
if (!app.includes(standaloneRoute)) {
  if (!app.includes(routeMarker)) throw new Error('[patch-tournament-navigation-stability] public route marker not found');
  app = app.replace(routeMarker, `${standaloneRoute}\n${routeMarker}`);
}

fs.writeFileSync(appPath, app, 'utf8');

// Desktop and mobile navbar clicks must use React Router directly for the
// standalone page. This bypasses onNavigate -> activeView -> URL feedback.
let nav = fs.readFileSync(navPath, 'utf8');
const goMarker = "  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {";
const goReplacement = "  const go = (path: string, subPath?: string) => {\n    const { section, tab } = resolveNavigationTarget(path, subPath);\n    try {\n      if (section === 'pendaftaran-turnamen') {\n        navigate('/pendaftaran-turnamen');\n        return;\n      }";
if (!nav.includes("if (section === 'pendaftaran-turnamen')")) {
  if (!nav.includes(goMarker)) throw new Error('[patch-tournament-navigation-stability] Navbar go marker not found');
  nav = nav.replace(goMarker, goReplacement);
}
fs.writeFileSync(navPath, nav, 'utf8');

console.log('[patch-tournament-navigation-stability] standalone tournament route + direct navbar navigation applied');