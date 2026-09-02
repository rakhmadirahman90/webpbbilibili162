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

// Add the accepted-participants path to both public route-recognition sets.
const acceptedLiteral = "'pendaftaran/peserta-diterima'";
if (!s.includes(acceptedLiteral)) {
  s = s.replaceAll("'pendaftaran/seeded-peserta'", "'pendaftaran/seeded-peserta','pendaftaran/peserta-diterima'");
}

// Ensure the dedicated route is handled by the public view switch as well when
// App uses the shell path instead of the explicit Route in a future refactor.
if (!s.includes("case 'pendaftaran/peserta-diterima'")) {
  const marker = "      case 'prestasi': return <PublicPrestasi />;";
  if (s.includes(marker)) s = s.replace(marker, "      case 'pendaftaran/peserta-diterima': return <PublicPesertaTurnamen />;\n" + marker);
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-route] public seeded + accepted participants routes applied');
