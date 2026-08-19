import fs from 'node:fs';

function patchFile(path, replacements) {
  let code = fs.readFileSync(path, 'utf8');
  const original = code;
  for (const [from, to] of replacements) {
    if (code.includes(to)) continue;
    if (!code.includes(from)) {
      throw new Error(`[patch-public-routing] Pattern not found in ${path}: ${from.slice(0, 120)}`);
    }
    code = code.replace(from, to);
  }
  if (code !== original) fs.writeFileSync(path, code);
}

const app = 'src/App.tsx';
patchFile(app, [
  [
    "'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'",
    "'berita', 'news', 'prestasi', 'program', 'faq', 'sambutan', 'sambutan-ketua'"
  ],
  [
    "'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'\n    ];",
    "'berita', 'news', 'prestasi', 'program', 'faq', 'sambutan', 'sambutan-ketua'\n    ];"
  ],
  [
    "                    {(activeView === 'berita' || activeView === 'news') && <News />}\n                    {(activeView === 'galeri' || activeView === 'gallery') && <Gallery />}",
    "                    {(activeView === 'berita' || activeView === 'news') && <News />}\n                    {(activeView === 'prestasi') && <PublicPrestasi />}\n                    {(activeView === 'program') && <PublicProgram onNavigate={(path) => handleNavigate(path)} />}\n                    {(activeView === 'galeri' || activeView === 'gallery') && <Gallery />}"
  ]
]);

const navbar = 'src/components/Navbar.tsx';
patchFile(navbar, [
  [
    "    if (p === 'home' || p === 'beranda') return onNavigate('home');\n    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');",
    "    if (p === 'home' || p === 'beranda') return onNavigate('home');\n    if (p === 'atlet' || p === 'players' || ['semua','senior','muda'].includes(s)) return onNavigate('atlet', subPath || 'Semua');\n    // Submenu navigation must target the child path, not the parent dropdown.\n    if (s) {\n      if (['sejarah','visi-misi','visi','misi','fasilitas','struktur','struktur-organisasi','dokumen','dokumen-penting','prestasi','program','faq','berita','news'].includes(s)) return onNavigate(s);\n      if (s === 'peringkat' || s === 'ranking' || s === 'rankings') return onNavigate('peringkat');\n      if (s === 'register' || s === 'pendaftaran') return onNavigate('register');\n      if (s === 'gallery' || s === 'galeri') return onNavigate('galeri');\n      if (s === 'jadwal' || s.includes('jadwal')) return onNavigate('jadwal');\n      if (s === 'contact' || s === 'kontak') return onNavigate('contact');\n    }"
  ]
]);

console.log('[patch-public-routing] Public submenu routing and dedicated views patched successfully.');
