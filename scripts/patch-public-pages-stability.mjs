import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

// Public registration/seeded pages must not flash while their lazy chunks load.
// These two pages are lightweight enough to be eager imports, which also makes
// navigation deterministic on slower mobile connections.
s = s.replace(
  "const RegistrationForm = lazy(() => import('./components/RegistrationForm')); ",
  "import RegistrationForm from './components/RegistrationForm';"
);
s = s.replace(
  "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));",
  "import PublicSeededPeserta from './components/PublicSeededPeserta';"
);

// Ensure both public URLs are real React Router routes. This is intentionally
// idempotent because other routing patches may already have inserted seeded.
const registerRoute = '<Route path="/register" element={<RegistrationForm />} />';
const pendaftaranRoute = '<Route path="/pendaftaran" element={<RegistrationForm />} />';
const seededRoute = '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';

if (!s.includes(registerRoute)) {
  const anchor = seededRoute && s.includes(seededRoute)
    ? seededRoute
    : '<Route path="/login" element={<Login />} />';
  if (!s.includes(anchor)) throw new Error('[patch-public-pages-stability] route anchor not found for register');
  s = s.replace(anchor, `${registerRoute}\n          ${anchor}`);
}
if (!s.includes(pendaftaranRoute)) {
  const anchor = registerRoute;
  s = s.replace(anchor, `${anchor}\n          ${pendaftaranRoute}`);
}
if (!s.includes(seededRoute)) {
  const anchor = '<Route path="/login" element={<Login />} />';
  if (!s.includes(anchor)) throw new Error('[patch-public-pages-stability] route anchor not found for seeded');
  s = s.replace(anchor, `${seededRoute}\n          ${anchor}`);
}

// Keep the route shell stable while other lazy admin/public chunks resolve.
// If a top-level Suspense wraps Routes, its fallback blanks the entire page.
// Move Suspense inside the route content only when the exact current structure exists.
s = s.replace(
  /<Suspense fallback=\{<ViewFallback \/>\}>\s*<Routes>([\s\S]*?)<\/Routes>\s*<\/Suspense>/,
  '<Routes>$1</Routes>'
);

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-pages-stability] stable public registration + seeded navigation applied');
