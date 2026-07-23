const fs = require('fs');

const dummyStruktur = `const defaultStruktur = [
  { id: 'st1', name: 'H. Andi (Dewan Penasihat)', role: 'Pelindung / Penasihat', category: 'Penasihat', level: 1, sort_order: 1, photo_url: 'https://ui-avatars.com/api/?name=Andi&background=0b1224&color=fff&size=200' },
  { id: 'st2', name: 'Budi Santoso', role: 'Ketua Umum', category: 'Pengurus Inti', level: 2, sort_order: 2, photo_url: 'https://ui-avatars.com/api/?name=Budi+Santoso&background=0b1224&color=fff&size=200' },
  { id: 'st3', name: 'Cipto', role: 'Wakil Ketua', category: 'Pengurus Inti', level: 3, sort_order: 3, photo_url: 'https://ui-avatars.com/api/?name=Cipto&background=0b1224&color=fff&size=200' },
  { id: 'st4', name: 'Diana', role: 'Sekretaris', category: 'Pengurus Inti', level: 4, sort_order: 4, photo_url: 'https://ui-avatars.com/api/?name=Diana&background=0b1224&color=fff&size=200' },
  { id: 'st5', name: 'Eka', role: 'Bendahara', category: 'Pengurus Inti', level: 5, sort_order: 5, photo_url: 'https://ui-avatars.com/api/?name=Eka&background=0b1224&color=fff&size=200' },
  { id: 'st6', name: 'Fahri', role: 'Kepala Pelatih (Head Coach)', category: 'Kepelatihan', level: 6, sort_order: 6, photo_url: 'https://ui-avatars.com/api/?name=Fahri&background=0b1224&color=fff&size=200' },
  { id: 'st7', name: 'Gani', role: 'Koord. Bidang Pembinaan Prestasi', category: 'Bidang-Bidang', level: 7, sort_order: 7, photo_url: 'https://ui-avatars.com/api/?name=Gani&background=0b1224&color=fff&size=200' },
  { id: 'st8', name: 'Hadi', role: 'Koord. Bidang Sarana & Prasarana', category: 'Bidang-Bidang', level: 7, sort_order: 8, photo_url: 'https://ui-avatars.com/api/?name=Hadi&background=0b1224&color=fff&size=200' },
];`;

let struktur = fs.readFileSync('src/components/StrukturOrganisasiPublic.tsx', 'utf-8');
if (!struktur.includes('const defaultStruktur = [')) {
  struktur = struktur.replace(
    /if \(data\) setMembers\(data\);/, 
    "if (data && data.length > 0) { setMembers(data); } else { " + dummyStruktur + " setMembers(defaultStruktur); }"
  );
  fs.writeFileSync('src/components/StrukturOrganisasiPublic.tsx', struktur);
}

let adminStruktur = fs.readFileSync('src/components/AdminStructure.tsx', 'utf-8');
if (!adminStruktur.includes('const defaultStruktur = [')) {
  adminStruktur = adminStruktur.replace(
    /if \(data\) setMembers\(data\);/, 
    "if (data && data.length > 0) { setMembers(data); } else { " + dummyStruktur + " setMembers(defaultStruktur); }"
  );
  fs.writeFileSync('src/components/AdminStructure.tsx', adminStruktur);
}
