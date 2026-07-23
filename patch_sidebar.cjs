const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

code = code.replace(/{ name: 'Kelola Sejarah', path: 'sejarah', icon: Info, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola Sejarah' : 'Sejarah Klub', path: 'sejarah', icon: Info, adminOnly: false }");
code = code.replace(/{ name: 'Kelola Program', path: 'program', icon: Target, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola Program' : 'Program Klub', path: 'program', icon: Target, adminOnly: false }");
code = code.replace(/{ name: 'Kelola Prestasi', path: 'prestasi', icon: Trophy, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola Prestasi' : 'Prestasi', path: 'prestasi', icon: Trophy, adminOnly: false }");
code = code.replace(/{ name: 'Kelola FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola FAQ' : 'FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: false }");
code = code.replace(/{ name: 'Kelola Visi Misi', path: 'visi-misi', icon: Info, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola Visi Misi' : 'Visi & Misi', path: 'visi-misi', icon: Info, adminOnly: false }");
code = code.replace(/{ name: 'Kelola Fasilitas', path: 'fasilitas', icon: Info, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola Fasilitas' : 'Fasilitas', path: 'fasilitas', icon: Info, adminOnly: false }");
code = code.replace(/{ name: 'Kelola Struktur', path: 'struktur', icon: Network, adminOnly: true }/, "{ name: role === 'admin' ? 'Kelola Struktur' : 'Struktur Organisasi', path: 'struktur', icon: Network, adminOnly: false }");
code = code.replace(/{ name: 'Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: false }/, "{ name: role === 'admin' ? 'Kelola Inventaris' : 'Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: false }");

fs.writeFileSync('src/components/Sidebar.tsx', code);
