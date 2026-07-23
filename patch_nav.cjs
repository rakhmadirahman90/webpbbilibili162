const fs = require('fs');

let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  /finalNav = \[\s*\{ id: '1', label: 'Home', path: 'home', type: 'link', order_index: 0 \},[\s\S]*?\];/g,
  `finalNav = [
          { id: '1', label: 'Home', path: 'home', type: 'link', order_index: 0 },
          { id: '2', label: 'Tentang Kami', path: 'tentang-kami', type: 'dropdown', order_index: 1 },
          { id: '2-1', parent_id: '2', label: 'Sejarah', path: 'sejarah', order_index: 1 },
          { id: '2-2', parent_id: '2', label: 'Visi & Misi', path: 'visi-misi', order_index: 2 },
          { id: '2-3', parent_id: '2', label: 'Fasilitas', path: 'fasilitas', order_index: 3 },
          { id: '2-4', parent_id: '2', label: 'Struktur Organisasi', path: 'struktur', order_index: 4 },
          { id: '2-5', parent_id: '2', label: 'Dokumen Penting', path: 'dokumen-penting', order_index: 5 },
          { id: '2-6', parent_id: '2', label: 'Inventaris', path: 'inventaris', order_index: 6 },
          { id: '3', label: 'Informasi', path: 'informasi', type: 'dropdown', order_index: 2 },
          { id: '3-1', parent_id: '3', label: 'Berita', path: 'berita', order_index: 1 },
          { id: '3-2', parent_id: '3', label: 'Program', path: 'program', order_index: 2 },
          { id: '3-3', parent_id: '3', label: 'Prestasi', path: 'prestasi', order_index: 3 },
          { id: '3-4', parent_id: '3', label: 'FAQ', path: 'faq', order_index: 4 },
          { id: '4', label: 'Peringkat', path: 'peringkat', type: 'dropdown', order_index: 3 },
          { id: '4-1', parent_id: '4', label: 'Ranking Atlet', path: 'peringkat' },
          { id: '4-2', parent_id: '4', label: 'Quiz Badminton', path: 'quiz' },
          { id: '5', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', order_index: 4 }
        ];`
);

code = code.replace(
  /'Sejarah': 1,\s*'Visi & Misi': 2,\s*'Fasilitas': 3,\s*'Struktur Organisasi': 4,\s*'Dokumen Penting': 5/g,
  `'Sejarah': 1,
          'Visi & Misi': 2,
          'Fasilitas': 3,
          'Struktur Organisasi': 4,
          'Dokumen Penting': 5,
          'Inventaris': 6`
);

fs.writeFileSync('src/components/Navbar.tsx', code);
