import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

// This patch runs after restore-app-from-known-good.mjs, so never assume
// that the restored App.tsx contains the newer public-view markers.
const importLine = "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));";
if (!s.includes(importLine)) {
  const importAnchors = [
    "const PublicPrestasi = lazy(() => import('./components/PublicPrestasi'));",
    "const PublicFAQ = lazy(() => import('./components/PublicFAQ'));",
    "const PublicProgram = lazy(() => import('./components/PublicProgram'));",
    "// Lazy-Loaded Admin & Complex Views",
    "const AdminDashboard = lazy(() => import('./components/AdminDashboard'));"
  ];
  const anchor = importAnchors.find((candidate) => s.includes(candidate));
  if (!anchor) throw new Error('[patch-public-seeded-route] no stable import anchor found in restored App.tsx');
  s = s.replace(anchor, `${importLine}\n${anchor}`);
}

const route = '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';
if (!s.includes(route)) {
  const routeAnchors = [
    '<Route path="/login" element={<Login />} />',
    '<Route path="/admin/*" element=',
    '<Route path="*" element='
  ];
  const anchor = routeAnchors.find((candidate) => s.includes(candidate));
  if (!anchor) throw new Error('[patch-public-seeded-route] no stable route anchor found in restored App.tsx');
  s = s.replace(anchor, `${route}\n          ${anchor}`);
}

// Keep the dedicated public URL recognized by UrlSynchronizer/initial state.
const seededPath = "'pendaftaran/seeded-peserta'";
if (!s.includes(seededPath)) {
  const replacements = [
    ["'register','pendaftaran'", "'register','pendaftaran','pendaftaran/seeded-peserta'"],
    ["'register', 'pendaftaran'", "'register', 'pendaftaran', 'pendaftaran/seeded-peserta'"],
    ["'register','pendaftaran',", "'register','pendaftaran','pendaftaran/seeded-peserta',"],
    ["'register', 'pendaftaran',", "'register', 'pendaftaran', 'pendaftaran/seeded-peserta',"]
  ];
  for (const [from, to] of replacements) {
    if (s.includes(from)) {
      s = s.replace(from, to);
      break;
    }
  }
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-route] public seeded route applied safely');
