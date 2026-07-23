const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf-8');

// I will replace allMenuItems array
const newMenuItems = `  const allMenuItems = [
    { 
      section: 'Portal Utama', 
      items: [
        { name: role === 'admin' ? 'Dashboard Admin' : 'Dashboard Anggota', path: 'dashboard', icon: LayoutDashboard, adminOnly: false },
        ...(role !== 'admin' ? [{ name: 'Profil Saya', path: 'profil', icon: UserCheck, adminOnly: false }] : []),
      ]
    },
    { 
      section: 'Informasi & Kegiatan', 
      items: [
        { name: 'Jadwal Latihan', path: 'jadwal', icon: Calendar, adminOnly: false },
        { name: 'Peringkat & Poin', path: 'ranking', icon: Trophy, adminOnly: false },
        { name: 'Hasil Skor', path: 'skor', icon: Zap, adminOnly: false }, 
        { name: 'Kas Club', path: 'kas', icon: Wallet, adminOnly: false },
        { name: 'Berita & Pengumuman', path: 'berita', icon: Newspaper, adminOnly: false },
        { name: 'Galeri Media', path: 'galeri', icon: Image, adminOnly: false },
        { name: 'Dokumen Club', path: 'dokumen', icon: BookOpen, adminOnly: false },
        ...(role !== 'admin' ? [
          { name: 'Program Klub', path: 'program', icon: Target, adminOnly: false },
          { name: 'Prestasi', path: 'prestasi', icon: Trophy, adminOnly: false },
          { name: 'FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: false }
        ] : [])
      ]
    },
    ...(role !== 'admin' ? [{
      section: 'Profil Klub & Fasilitas',
      items: [
        { name: 'Sejarah Klub', path: 'sejarah', icon: Info, adminOnly: false },
        { name: 'Visi & Misi', path: 'visi-misi', icon: Info, adminOnly: false },
        { name: 'Fasilitas', path: 'fasilitas', icon: Info, adminOnly: false },
        { name: 'Struktur Organisasi', path: 'struktur', icon: Network, adminOnly: false },
        { name: 'Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: false }
      ]
    }] : []),
    { 
      section: 'Kelola Data & Atlet', 
      adminOnly: true,
      items: [
        { name: 'Kelola User', path: 'users', icon: ShieldCheck, adminOnly: true },
        { name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },
        { name: 'Manajemen Atlet', path: 'atlet', icon: Users, adminOnly: true },
        { name: 'Absensi Latihan', path: 'absensi', icon: UserCheck, adminOnly: true },
        { name: 'Manajemen Poin', path: 'poin', icon: Star, adminOnly: true },
        { name: 'Audit Log Poin', path: 'audit-poin', icon: History, adminOnly: true },
      ]
    },
    {
      section: 'Administrasi & Keuangan',
      adminOnly: true,
      items: [
        { name: 'Laporan & Rekap', path: 'laporan', icon: BarChart3, adminOnly: true },
        { name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true }, 
        { name: 'Kelola Surat', path: 'surat', icon: Mail, adminOnly: true },
        { name: 'Kelola Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: true },
        { name: 'Log Aktivitas', path: 'logs', icon: FileSearch, adminOnly: true },
      ]
    },
    { 
      section: 'Pengaturan Website',
      adminOnly: true, 
      items: [
        { name: 'Kelola Sejarah', path: 'sejarah', icon: Info, adminOnly: true },
        { name: 'Kelola Program', path: 'program', icon: Target, adminOnly: true },
        { name: 'Kelola Prestasi', path: 'prestasi', icon: Trophy, adminOnly: true },
        { name: 'Kelola FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: true }, 
        { name: 'Kelola Visi Misi', path: 'visi-misi', icon: Info, adminOnly: true }, 
        { name: 'Kelola Fasilitas', path: 'fasilitas', icon: Info, adminOnly: true }, 
        { name: 'Kelola Struktur', path: 'struktur', icon: Network, adminOnly: true },
        { name: 'Kelola Tampilan', path: 'tampilan', icon: Layout, adminOnly: true }, 
        { name: 'Kelola Navbar', path: 'navbar', icon: Menu, adminOnly: true }, 
        { name: 'Kelola Hero', path: 'hero', icon: Images, adminOnly: true },
        { name: 'Kelola Pop-up', path: 'popup', icon: Megaphone, adminOnly: true },
        { name: 'Kelola Footer', path: 'footer', icon: LayoutGrid, adminOnly: true }, 
        { name: 'Kelola Kontak', path: 'kontak', icon: Phone, adminOnly: true },
      ]
    }
  ];`;

code = code.replace(/const allMenuItems = \[\s*\{[\s\S]*?\]\s*\}\s*\];/, newMenuItems);
fs.writeFileSync('src/components/Sidebar.tsx', code);
