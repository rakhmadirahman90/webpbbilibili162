import fs from 'node:fs';

const path = 'src/App.tsx';
let s = fs.readFileSync(path, 'utf8');

const importMarker = "const PublicPrestasi = lazy(() => import('./components/PublicPrestasi'));";
const importLine = "const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));";
if (!s.includes('PublicSeededPeserta')) {
  if (!s.includes(importMarker)) throw new Error('[patch-public-seeded-route] public import marker not found');
  s = s.replace(importMarker, `${importMarker}\n${importLine}`);
}

const route = '<Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />';
if (!s.includes(route)) {
  const anchor = '<Route path="/login" element={<Login />} />';
  if (!s.includes(anchor)) throw new Error('[patch-public-seeded-route] route anchor not found');
  s = s.replace(anchor, `${anchor}\n          ${route}`);
}

for (const marker of ["'pendaftaran/seeded-peserta'"]) {
  if (!s.includes(marker)) {
    s = s.replace("'register','pendaftaran'", "'register','pendaftaran','pendaftaran/seeded-peserta'");
  }
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-route] public seeded route applied');
