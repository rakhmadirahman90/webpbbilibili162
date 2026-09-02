import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

const importLine = "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));";
if (!s.includes(importLine)) {
  const anchors = [
    "const PublicPrestasi = lazy(() => import('./components/PublicPrestasi'));",
    "const PublicFAQ = lazy(() => import('./components/PublicFAQ'));",
    "const PublicProgram = lazy(() => import('./components/PublicProgram'));",
    "const AdminDashboard = lazy(() => import('./components/AdminDashboard'));"
  ];
  const anchor = anchors.find(candidate => s.includes(candidate));
  if (!anchor) throw new Error('[patch-public-seeded-route] no stable import anchor found');
  s = s.replace(anchor, `${importLine}\n${anchor}`);
}

const acceptedImport = "const PublicPesertaTurnamen = lazy(() => import('./components/PublicPesertaTurnamen'));";
if (!s.includes(acceptedImport)) s = s.replace(importLine, `${importLine}\n${acceptedImport}`);

const seededRoute = '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';
if (!s.includes(seededRoute)) {
  const anchors = ['<Route path="/login" element={<Login />} />', '<Route path="/admin/*" element=', '<Route path="*" element='];
  const anchor = anchors.find(candidate => s.includes(candidate));
  if (!anchor) throw new Error('[patch-public-seeded-route] no stable seeded route anchor found');
  s = s.replace(anchor, `${seededRoute}\n          ${anchor}`);
}

const acceptedRoute = '<Route path="/pendaftaran/peserta-diterima" element={<PublicPesertaTurnamen />} />';
if (!s.includes(acceptedRoute)) {
  if (s.includes(seededRoute)) s = s.replace(seededRoute, `${seededRoute}\n        ${acceptedRoute}`);
  else {
    const anchor = '<Route path="/login" element={<Login />} />';
    if (!s.includes(anchor)) throw new Error('[patch-public-seeded-route] no stable accepted route anchor found');
    s = s.replace(anchor, `${acceptedRoute}\n          ${anchor}`);
  }
}

// IMPORTANT: do not use replaceAll() on the seeded path here. The same string
// can occur as an object key in App.tsx (e.g. `seeded: 'pendaftaran/seeded-peserta'`).
// Blind insertion of the accepted path creates invalid object syntax. Add the
// accepted destination only to the route/state collections where it belongs.

const acceptedPath = 'pendaftaran/peserta-diterima';

// UrlSynchronizer: URL -> activeView.
const fullPageMarker = "    'register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta',";
if (s.includes(fullPageMarker) && !s.includes("'pendaftaran/peserta-diterima'", s.indexOf(fullPageMarker))) {
  s = s.replace(fullPageMarker, "    'register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta','pendaftaran/peserta-diterima',");
}

// Initial activeView must recognize the same path on a fresh/mobile load.
const supportedMarker = "'register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta','peringkat'";
if (s.includes(supportedMarker) && !s.includes("'pendaftaran/peserta-diterima'", s.indexOf(supportedMarker))) {
  s = s.replace(supportedMarker, "'register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta','pendaftaran/peserta-diterima','peringkat'");
}

// Render the standalone accepted-participants page through the same public shell.
const renderMarker = "      case 'prestasi': return <PublicPrestasi />;";
if (!s.includes("case 'pendaftaran/peserta-diterima': return <PublicPesertaTurnamen />;")) {
  if (!s.includes(renderMarker)) throw new Error('[patch-public-seeded-route] render marker not found');
  s = s.replace(renderMarker, "      case 'pendaftaran/peserta-diterima': return <PublicPesertaTurnamen />;\n" + renderMarker);
}

// Keep a direct Router route as an additional hard fallback. This is especially
// useful on mobile because it does not depend on activeView state synchronization.
if (!s.includes(acceptedRoute)) throw new Error('[patch-public-seeded-route] accepted route was not applied');

// If a later restore changes the formatting of the collections, use targeted
// token insertion as a final idempotent safeguard without touching aliases.
if (!s.includes("'pendaftaran/peserta-diterima'")) {
  throw new Error('[patch-public-seeded-route] accepted path missing from navigation state');
}

void acceptedPath;
fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-route] public seeded + accepted participants routes/state applied safely');
