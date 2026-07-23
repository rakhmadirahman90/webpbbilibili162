const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /const fullPageMenus = \['jadwal', 'jadwal-latihan', 'schedule', 'kas', 'quiz', 'contact', 'kontak', 'struktur', 'struktur-organisasi', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery', 'sejarah', 'visi-misi', 'fasilitas', 'berita', 'news'\];/,
  `const fullPageMenus = ['jadwal', 'jadwal-latihan', 'schedule', 'kas', 'quiz', 'contact', 'kontak', 'struktur', 'struktur-organisasi', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery', 'sejarah', 'visi-misi', 'fasilitas', 'inventaris', 'berita', 'news'];`
);

fs.writeFileSync('src/App.tsx', code);
