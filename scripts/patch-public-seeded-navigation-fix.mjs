import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let s = fs.readFileSync(path, 'utf8');

const navGuard = "if (section === 'pendaftaran/seeded-peserta') { navigate('/pendaftaran/seeded-peserta'); return; }";
if (!s.includes(navGuard)) {
  const marker = "      if (section === 'home' || section === 'beranda') onNavigate('home');";
  if (!s.includes(marker)) throw new Error('[patch-public-seeded-navigation-fix] navigation marker not found');
  s = s.replace(marker, `      ${navGuard}\n${marker}`);
}

const preloadGuard = "if (effective === 'pendaftaran/seeded-peserta') { void import('./PublicSeededPeserta'); return; }";
if (!s.includes(preloadGuard)) {
  const marker = '    if (!target) return;';
  if (!s.includes(marker)) throw new Error('[patch-public-seeded-navigation-fix] preload marker not found');
  s = s.replace(marker, `    ${preloadGuard}\n${marker}`);
}

fs.writeFileSync(path, s, 'utf8');
console.log('[patch-public-seeded-navigation-fix] direct public seeded navigation applied');
