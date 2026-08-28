import fs from 'node:fs';

const app = 'src/App.tsx';
let s = fs.readFileSync(app, 'utf8');

// This patch intentionally adds a public, read-only seeded participant list to the
// registration submenu. The public view exposes only player name, PB/club, gender,
// and seeded quality; no admin-only fields are rendered.
if (s.includes('PublicSeededPeserta')) {
  console.log('[patch-landing-seeded-list] already applied');
  process.exit(0);
}

const importCandidates = [
  "const SeededTurnamen = lazy(() => import('./components/SeededTurnamen'));",
  "const SeededTurnamenIO = lazy(() => import('./components/SeededTurnamenIO'));"
];
const componentImport = "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));";
const marker = importCandidates.find(x => s.includes(x));
if (marker) {
  s = s.replace(marker, `${marker}\n${componentImport}`);
} else {
  throw new Error('[patch-landing-seeded-list] Seeded import marker not found in App.tsx');
}

// Add a public route. It is deliberately outside isAdmin gating.
const routePatterns = [
  /<Route path=["']([^"']*pendaftaran[^"']*)["'][^>]*>/i,
  /<Route path=["']\/pendaftaran[^"']*["'][^>]*>/i
];
let routeMatch = null;
for (const re of routePatterns) { routeMatch = s.match(re); if (routeMatch) break; }
if (!routeMatch) {
  // Common fallback: place the route immediately before the seeded admin route.
  const seededRoute = '<Route path="seeded-turnamen"';
  if (s.includes(seededRoute)) {
    s = s.replace(seededRoute, '<Route path="pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />\n    <Route path="seeded-turnamen"');
  } else {
    throw new Error('[patch-landing-seeded-list] Could not locate registration/seeded route anchor');
  }
} else {
  // Insert directly before the first registration-related route so the public
  // submenu can navigate to a stable child URL without changing existing routes.
  const idx = s.indexOf(routeMatch[0]);
  s = s.slice(0, idx) + '<Route path="pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />\n    ' + s.slice(idx);
}

fs.writeFileSync(app, s, 'utf8');
console.log('[patch-landing-seeded-list] public seeded participant route added');
