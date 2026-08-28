import fs from 'node:fs';

const file = 'src/App.tsx';
let s = fs.readFileSync(file, 'utf8');

// Registration pages are true router destinations. Keep the tournament form
// eager-loaded so a direct desktop/mobile visit never renders a blank lazy
// boundary while the chunk is being resolved.
s = s.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
s = s.replace("const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));", "import PendaftaranTurnamen from './components/PendaftaranTurnamen';");
if (!s.includes("import RegistrationForm from './components/RegistrationForm';")) {
  s = s.replace("import AdminDashboard from './components/AdminDashboard';", "import AdminDashboard from './components/AdminDashboard';\nimport RegistrationForm from './components/RegistrationForm';");
}
if (!s.includes("import PendaftaranTurnamen from './components/PendaftaranTurnamen';")) {
  s = s.replace("import AdminDashboard from './components/AdminDashboard';", "import AdminDashboard from './components/AdminDashboard';\nimport PendaftaranTurnamen from './components/PendaftaranTurnamen';");
}

// Standalone registration pages must never participate in the legacy
// activeView <-> URL feedback loop. This is the main protection against
// desktop/mobile flicker and immediate navigation back to the previous page.
const start = s.indexOf('function UrlSynchronizer(');
const end = s.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start >= 0 && end > start) {
  let block = s.slice(start, end);
  if (!block.includes('__registrationStandalone')) {
    block = block.replace(
      '  const isInitialMount = useRef(true);',
      "  const isInitialMount = useRef(true);\n  const __registrationPath = location.pathname.replace(/\\/+$/, '').toLowerCase();\n  const __registrationStandalone = __registrationPath === '/register' || __registrationPath === '/pendaftaran' || __registrationPath === '/pendaftaran-turnamen';"
    );
  }
  block = block.replace(
    /if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g,
    "if (__registrationStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
  );
  block = block.replace(
    /if \(__registrationStandalone \|\| location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g,
    "if (__registrationStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;"
  );
  s = s.slice(0, start) + block + s.slice(end);
}

// Remove registration pages from the legacy activeView lists when the known
// good App restoration contains those entries.
s = s.replace(/,'register','pendaftaran','pendaftaran-turnamen','pendaftaran\/seeded-peserta'/g, '');
s = s.replace(/,'register','pendaftaran','pendaftaran\/seeded-peserta'/g, '');
s = s.replace(/,'register','pendaftaran'/g, '');

// Add exact router destinations before the catch-all route. Existing routes
// are preserved; each route is inserted at most once.
const regRoutes = [
  '          <Route path="/register" element={<RegistrationForm />} />',
  '          <Route path="/pendaftaran" element={<RegistrationForm />} />',
  '          <Route path="/pendaftaran-turnamen" element={<PendaftaranTurnamen />} />'
];
const wildcard = '          <Route path="*" element=';
if (s.includes(wildcard)) {
  const missing = regRoutes.filter(r => !s.includes(r));
  if (missing.length) s = s.replace(wildcard, `${missing.join('\n')}\n${wildcard}`);
} else {
  throw new Error('[registration-route-final] wildcard route not found');
}

fs.writeFileSync(file, s, 'utf8');

// Make the Navbar route authoritative as well. This bypasses activeView and
// guarantees the tournament form opens directly from desktop and mobile menus.
const navFile = 'src/components/Navbar.tsx';
let nav = fs.readFileSync(navFile, 'utf8');
const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('__finalTournamentRegistrationTarget')) {
  const direct = "    const __finalTournamentRegistrationTarget = String(section || '').toLowerCase().replace(/^\\/+|\\/+$/g, '') === 'pendaftaran-turnamen' || String(path || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '') === 'pendaftaran-turnamen';\n    if (__finalTournamentRegistrationTarget) {\n      navigate('/pendaftaran-turnamen');\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }";
  nav = nav.replace(marker, `${marker}\n${direct}`);
}
fs.writeFileSync(navFile, nav, 'utf8');

console.log('[registration-route-final] tournament registration is now an eager standalone router destination with direct desktop/mobile navigation');
