import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

const importLine = "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));";
if (!s.includes(importLine)) {
  const importAnchors = [
    "const PublicPrestasi = lazy(() => import('./components/PublicPrestasi'));",
    "const PublicFAQ = lazy(() => import('./components/PublicFAQ'));",
    "const Athletes = lazy(() => import('./components/Players'));"
  ];
  const anchor = importAnchors.find((candidate) => s.includes(candidate));
  if (!anchor) throw new Error('[patch-public-seeded-route] no public lazy import anchor found');
  s = s.replace(anchor, `${anchor}\n${importLine}`);
}

const route = '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';
if (!s.includes(route)) {
  const routeAnchors = [
    '<Route path="/login" element={<Login />} />',
    '<Route path="*" element='
  ];
  const anchor = routeAnchors.find((candidate) => s.includes(candidate));
  if (!anchor) throw new Error('[patch-public-seeded-route] no route anchor found');
  if (anchor === '<Route path="*" element=') {
    s = s.replace(anchor, `          ${route}\n          ${anchor}`);
  } else {
    s = s.replace(anchor, `${anchor}\n          ${route}`);
  }
}

const seededPath = "'pendaftaran/seeded-peserta'";
if (!s.includes(seededPath)) {
  const replacements = [
    ["'register','pendaftaran'", "'register','pendaftaran','pendaftaran/seeded-peserta'"],
    ["'register','pendaftaran',", "'register','pendaftaran','pendaftaran/seeded-peserta',"]
  ];
  for (const [from, to] of replacements) {
    if (s.includes(from)) { s = s.replace(from, to); break; }
  }
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-route] public seeded route applied safely');
