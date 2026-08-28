import fs from 'node:fs';

const file = 'src/App.tsx';
let s = fs.readFileSync(file, 'utf8');
s = s.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
s = s.replace("const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));", "import PendaftaranTurnamen from './components/PendaftaranTurnamen';");
if (!s.includes("import RegistrationForm from './components/RegistrationForm';")) s = s.replace("import AdminDashboard from './components/AdminDashboard';", "import AdminDashboard from './components/AdminDashboard';\nimport RegistrationForm from './components/RegistrationForm';");
if (!s.includes("import PendaftaranTurnamen from './components/PendaftaranTurnamen';")) s = s.replace("import AdminDashboard from './components/AdminDashboard';", "import AdminDashboard from './components/AdminDashboard';\nimport PendaftaranTurnamen from './components/PendaftaranTurnamen';");

const start = s.indexOf('function UrlSynchronizer(');
const end = s.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start >= 0 && end > start) {
  let block = s.slice(start, end);
  if (!block.includes('__registrationStandalone')) block = block.replace('  const isInitialMount = useRef(true);', "  const isInitialMount = useRef(true);\n  const __registrationPath = location.pathname.replace(/\\/+$/, '').toLowerCase();\n  const __registrationStandalone = __registrationPath === '/register' || __registrationPath === '/pendaftaran' || __registrationPath === '/pendaftaran-turnamen';");
  block = block.replace(/if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g, "if (__registrationStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
  s = s.slice(0, start) + block + s.slice(end);
}
s = s.replace(/,'register','pendaftaran','pendaftaran-turnamen','pendaftaran\/seeded-peserta'/g, '');
s = s.replace(/,'register','pendaftaran','pendaftaran\/seeded-peserta'/g, '');
s = s.replace(/,'register','pendaftaran'/g, '');
const regRoutes = [
  '          <Route path="/register" element={<RegistrationForm />} />',
  '          <Route path="/pendaftaran" element={<RegistrationForm />} />',
  '          <Route path="/pendaftaran-turnamen" element={<PendaftaranTurnamen />} />'
];
const wildcard = '          <Route path="*" element=';
if (s.includes(wildcard)) {
  const missing = regRoutes.filter(r => !s.includes(r));
  if (missing.length) s = s.replace(wildcard, `${missing.join('\n')}\n${wildcard}`);
} else throw new Error('[registration-route-final] wildcard route not found');
fs.writeFileSync(file, s, 'utf8');

const navFile = 'src/components/Navbar.tsx';
let nav = fs.readFileSync(navFile, 'utf8');

// Normalize every known tournament-registration label/path to one canonical route.
const normalizeMarker = "  if (['beranda', 'home'].includes(p)) return 'home';";
const normalizePatch = "  if (['beranda', 'home'].includes(p)) return 'home';\n  if (['pendaftaran-turnamen','pendaftaran turnamen','formulir-pendaftaran-turnamen','formulir-pendaftaran turnamen','formulir-pendaftaran','daftar-turnamen','registrasi-turnamen','tournament-registration'].includes(p)) return 'pendaftaran-turnamen';";
if (nav.includes(normalizeMarker) && !nav.includes("'formulir-pendaftaran-turnamen'")) nav = nav.replace(normalizeMarker, normalizePatch);

const marker = "    const { section, tab } = resolveNavigationTarget(path, subPath);";
if (nav.includes(marker) && !nav.includes('__finalTournamentRegistrationTarget')) {
  const direct = "    const __finalRawPath = String(path || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __finalRawSubPath = String(subPath || '').toLowerCase().trim().replace(/^\\/+|\\/+$/g, '');\n    const __finalTournamentRegistrationTarget = String(section || '').toLowerCase().replace(/^\\/+|\\/+$/g, '') === 'pendaftaran-turnamen' || ['pendaftaran-turnamen','pendaftaran turnamen','formulir-pendaftaran-turnamen','formulir-pendaftaran turnamen','formulir-pendaftaran','daftar-turnamen','registrasi-turnamen','tournament-registration'].includes(__finalRawPath) || ['pendaftaran-turnamen','pendaftaran turnamen','formulir-pendaftaran-turnamen','formulir-pendaftaran turnamen','formulir-pendaftaran','daftar-turnamen','registrasi-turnamen','tournament-registration'].includes(__finalRawSubPath);\n    if (__finalTournamentRegistrationTarget) {\n      navigate('/pendaftaran-turnamen');\n      setOpenMenu(null);\n      setMobileOpen(false);\n      return;\n    }";
  nav = nav.replace(marker, `${marker}\n${direct}`);
}

// Also make preloading recognize the same aliases without ever blocking navigation.
if (nav.includes("effective === 'pendaftaran-turnamen'")) {
  nav = nav.replace("effective === 'pendaftaran-turnamen'\n                                    ? '/pendaftaran-turnamen'", "['pendaftaran-turnamen','pendaftaran turnamen','formulir-pendaftaran-turnamen','formulir-pendaftaran turnamen','formulir-pendaftaran','daftar-turnamen','registrasi-turnamen','tournament-registration'].includes(effective)\n                                    ? '/pendaftaran-turnamen'");
}
fs.writeFileSync(navFile, nav, 'utf8');
console.log('[registration-route-final] canonical tournament registration navigation fixed for desktop/mobile and all menu aliases');
