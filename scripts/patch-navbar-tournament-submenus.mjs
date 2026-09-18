import fs from 'node:fs';

const path = 'src/components/Navbar.tsx';
let src = fs.readFileSync(path, 'utf8');

// Navbar.tsx now owns the complete Atlet submenu logic.
// This build patch only keeps the tournament route preloading mapping compatible.
const preloadOld = `                                  : effective === 'pendaftaran-turnamen'
                                    ? '/pendaftaran-turnamen'
                                    : null;`;
const preloadNew = `                                  : (effective === 'pendaftaran-turnamen' || effective === 'pendaftaran/seeded-peserta' || effective === 'pendaftaran/peserta-diterima' || effective === 'sponsorship')
                                    ? (effective === 'sponsorship' ? '/sponsorship' : effective === 'pendaftaran/seeded-peserta' ? '/pendaftaran/seeded-peserta' : effective === 'pendaftaran/peserta-diterima' ? '/pendaftaran/peserta-diterima' : '/pendaftaran-turnamen')
                                    : null;`;

if (src.includes(preloadOld)) {
  src = src.replace(preloadOld, preloadNew);
  fs.writeFileSync(path, src, 'utf8');
  console.log('[patch-navbar-tournament-submenus] tournament preload mapping updated');
} else {
  console.log('[patch-navbar-tournament-submenus] no-op; Navbar.tsx already contains current submenu/preload logic');
}
