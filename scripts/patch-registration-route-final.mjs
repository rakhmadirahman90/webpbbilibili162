import fs from 'node:fs';

const file = 'src/App.tsx';
let s = fs.readFileSync(file, 'utf8');

// 1) Registration must be an actual route, never the landing-page wildcard.
s = s.replace("const RegistrationForm = lazy(() => import('./components/RegistrationForm'));", "import RegistrationForm from './components/RegistrationForm';");
if (!s.includes("import RegistrationForm from './components/RegistrationForm';")) {
  s = s.replace("import AdminDashboard from './components/AdminDashboard';", "import AdminDashboard from './components/AdminDashboard';\nimport RegistrationForm from './components/RegistrationForm';");
}

// 2) Completely exclude registration from the legacy URL/state feedback loop.
const start = s.indexOf('function UrlSynchronizer(');
const end = s.indexOf('\n\nconst renderDescriptionWithLinks', start);
if (start >= 0 && end > start) {
  let block = s.slice(start, end);
  if (!block.includes('__registrationStandalone')) {
    block = block.replace('  const isInitialMount = useRef(true);', "  const isInitialMount = useRef(true);\n  const __registrationStandalone = location.pathname.replace(/\\/+$/, '').toLowerCase() === '/register' || location.pathname.replace(/\\/+$/, '').toLowerCase() === '/pendaftaran';");
  }
  block = block.replace(/if \(location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g, "if (__registrationStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
  block = block.replace(/if \(__registrationStandalone \|\| location\.pathname\.startsWith\('\/login'\) \|\| location\.pathname\.startsWith\('\/admin'\)\) return;/g, "if (__registrationStandalone || location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;");
  s = s.slice(0, start) + block + s.slice(end);
}

// 3) Remove registration paths from the legacy full-page menu lists.
s = s.replace(/,'register','pendaftaran','pendaftaran\/seeded-peserta'/g, '');
s = s.replace(/,'register','pendaftaran'/g, '');

// 4) Add explicit routes immediately before the wildcard route, once only.
const regRoutes = [
  '          <Route path="/register" element={<RegistrationForm />} />',
  '          <Route path="/pendaftaran" element={<RegistrationForm />} />'
];
const wildcard = '          <Route path="*" element=';
if (s.includes(wildcard)) {
  const missing = regRoutes.filter(r => !s.includes(r));
  if (missing.length) s = s.replace(wildcard, `${missing.join('\n')}\n${wildcard}`);
} else {
  throw new Error('[registration-route-final] wildcard route not found');
}

// 5) The registration page must not be wrapped by the app-level Suspense fallback.
// Keep Suspense for the legacy landing/admin modules.
fs.writeFileSync(file, s, 'utf8');
console.log('[registration-route-final] explicit registration routes + synchronizer isolation applied');
