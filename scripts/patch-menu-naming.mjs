import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src');
const sidebarPath = path.join(root, 'components', 'Sidebar.tsx');
const extensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (extensions.has(path.extname(entry.name))) {
      const source = fs.readFileSync(full, 'utf8');
      const replacement = source.split('Edit Sambutan Ketua Umum').join('Kelola Sambutan Ketua Umum');
      if (replacement !== source) {
        fs.writeFileSync(full, replacement, 'utf8');
        console.log(`[patch-menu-naming] standardized sambutan label in ${path.relative(process.cwd(), full)}`);
      }
    }
  }
}

walk(root);

// Admin navigation is intentionally task-oriented: only management, operational,
// content, finance, website configuration, and system tools belong in the admin menu.
// Public browsing/navigation items are kept out of the admin sidebar to reduce clutter.
const adminMenuBlock = `  const allMenuItems = role === 'admin' ? [
    {
      section: 'Portal Admin',
      items: [
        { name: 'Dashboard Admin', path: 'dashboard', icon: LayoutDashboard, adminOnly: true },
        { name: 'Profil Saya', path: 'profil', icon: UserCheck, adminOnly: true },
      ]
    },
    {
      section: 'Kelola Anggota & Atlet',
      items: [
        { name: 'Kelola User', path: 'users', icon: ShieldCheck, adminOnly: true },
        { name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },
        { name: 'Manajemen Atlet', path: 'atlet', icon: Users, adminOnly: true },
        { name: 'Absensi Latihan', path: 'absensi', icon: UserCheck, adminOnly: true },
      ]
    },
    {
      section: 'Kompetisi & Performa',
      items: [
        { name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: true },
        { name: 'Manajemen Poin', path: 'poin', icon: Star, adminOnly: true },
        { name: 'Audit Log Poin', path: 'audit-poin', icon: History, adminOnly: true },
        { name: 'Peringkat & Poin', path: 'ranking', icon: Trophy, adminOnly: true },
        { name: 'Hasil Skor', path: 'skor', icon: Zap, adminOnly: true },
        { name: 'Analisis Performa', path: 'analisis-performa', icon: BarChart3, adminOnly: true },
        { name: 'Rapor Atlet', path: 'rapor-atlet', icon: HeartPulse, adminOnly: true },
        { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: true },
        { name: 'Testimoni & Ulasan', path: 'testimoni', icon: MessageSquare, adminOnly: true },
      ]
    },
    {
      section: 'Konten & Informasi',
      items: [
        { name: 'Berita & Pengumuman', path: 'berita', icon: Newspaper, adminOnly: true },
        { name: 'Galeri Media', path: 'galeri', icon: Image, adminOnly: true },
        { name: 'Dokumen Klub', path: 'dokumen', icon: BookOpen, adminOnly: true },
        { name: 'Kelola Program', path: 'program', icon: Target, adminOnly: true },
        { name: 'Kelola Prestasi', path: 'prestasi', icon: Trophy, adminOnly: true },
        { name: 'Kelola FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: true },
      ]
    },
    {
      section: 'Profil Klub',
      items: [
        { name: 'Kelola Sejarah', path: 'sejarah', icon: Info, adminOnly: true },
        { name: 'Kelola Visi & Misi', path: 'visi-misi', icon: Info, adminOnly: true },
        { name: 'Kelola Fasilitas', path: 'fasilitas', icon: Info, adminOnly: true },
        { name: 'Kelola Struktur Organisasi', path: 'struktur', icon: Network, adminOnly: true },
        { name: 'Kelola Sambutan Ketua Umum', path: 'sambutan-ketua', icon: MessageSquare, adminOnly: true },
      ]
    },
    {
      section: 'Administrasi & Keuangan',
      items: [
        { name: 'Laporan & Rekap', path: 'laporan', icon: BarChart3, adminOnly: true },
        { name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true },
        { name: 'Rekap Kas Anggota', path: 'rekap-keuangan', icon: FileSpreadsheet, adminOnly: true },
        { name: 'Kelola Surat', path: 'surat', icon: Mail, adminOnly: true },
        { name: 'Kelola Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: true },
        { name: 'Kelola Kontak', path: 'kontak', icon: Phone, adminOnly: true },
      ]
    },
    {
      section: 'Pengaturan Website',
      items: [
        { name: 'Kelola Tampilan', path: 'tampilan', icon: Layout, adminOnly: true },
        { name: 'Kelola Navbar', path: 'navbar', icon: Menu, adminOnly: true },
        { name: 'Kelola Hero', path: 'hero', icon: Images, adminOnly: true },
        { name: 'Kelola Pop-up', path: 'popup', icon: Megaphone, adminOnly: true },
        { name: 'Kelola Footer', path: 'footer', icon: LayoutGrid, adminOnly: true },
      ]
    },
    {
      section: 'Sistem',
      items: [
        { name: 'Notifikasi Push', path: 'notifications', icon: Megaphone, adminOnly: true },
        { name: 'Aplikasi Mobile & APK', path: 'pwa-apk', icon: Smartphone, adminOnly: true },
        { name: 'Log Aktivitas', path: 'logs', icon: FileSearch, adminOnly: true },
      ]
    },
  ] : [
    {
      section: 'Portal Utama',
      items: [
        { name: 'Dashboard Anggota', path: 'dashboard', icon: LayoutDashboard, adminOnly: false },
        { name: 'Profil Saya', path: 'profil', icon: UserCheck, adminOnly: false },
      ]
    },
    {
      section: 'Informasi & Kegiatan',
      items: [
        { name: 'Jadwal Latihan', path: 'jadwal', icon: Calendar, adminOnly: false },
        { name: 'Peringkat & Poin', path: 'ranking', icon: Trophy, adminOnly: false },
        { name: 'Hasil Skor', path: 'skor', icon: Zap, adminOnly: false },
        { name: 'Kas Klub', path: 'kas', icon: Wallet, adminOnly: false },
        { name: 'Rekap Kas Anggota', path: 'rekap-keuangan', icon: FileSpreadsheet, adminOnly: false },
        { name: 'Berita & Pengumuman', path: 'berita', icon: Newspaper, adminOnly: false },
        { name: 'Galeri Media', path: 'galeri', icon: Image, adminOnly: false },
        { name: 'Dokumen Klub', path: 'dokumen', icon: BookOpen, adminOnly: false },
        { name: 'Program Klub', path: 'program', icon: Target, adminOnly: false },
        { name: 'Prestasi', path: 'prestasi', icon: Trophy, adminOnly: false },
        { name: 'FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: false },
      ]
    },
    {
      section: 'Profil Klub & Fasilitas',
      items: [
        { name: 'Sejarah Klub', path: 'sejarah', icon: Info, adminOnly: false },
        { name: 'Visi & Misi', path: 'visi-misi', icon: Info, adminOnly: false },
        { name: 'Fasilitas', path: 'fasilitas', icon: Info, adminOnly: false },
        { name: 'Struktur Organisasi', path: 'struktur', icon: Network, adminOnly: false },
        { name: 'Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: false },
      ]
    },
    {
      section: 'Interaktif & Kompetisi',
      items: [
        { name: 'Analisis Performa', path: 'analisis-performa', icon: BarChart3, adminOnly: false },
        { name: 'Rapor Atlet', path: 'rapor-atlet', icon: HeartPulse, adminOnly: false },
        { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: false },
        { name: 'Testimoni & Ulasan', path: 'testimoni', icon: MessageSquare, adminOnly: false },
        { name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false },
      ]
    },
  ];`;

if (fs.existsSync(sidebarPath)) {
  const source = fs.readFileSync(sidebarPath, 'utf8');
  const startMarker = '  const allMenuItems = ';
  const endMarker = '\n\n  const menuItems = allMenuItems';
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);

  if (start !== -1 && end !== -1) {
    let updated = source.slice(0, start) + adminMenuBlock + source.slice(end);

    // Better information architecture: start collapsed and open only the active group.
    updated = updated.replace(
      "  const [allExpanded, setAllExpanded] = useState(true);",
      "  const [allExpanded, setAllExpanded] = useState(false);"
    );
    updated = updated.replace(
      "    // Initialize ALL sections as open by default so no menu items are hidden\n    menuItems.forEach((group) => {\n      // Default all sections to open (true)\n      initialSections[group.section] = true;\n    });",
      "    // Keep the sidebar compact: only the active section opens automatically.\n    const activeGroup = menuItems.find(g => g.items.some(i => i.path === currentPath));\n    menuItems.forEach((group) => {\n      initialSections[group.section] = activeGroup ? group.section === activeGroup.section : group.section === 'Portal Admin';\n    });"
    );
    updated = updated.replace(
      "        return { ...prev, [activeGroup.section]: true };",
      "        return { ...prev, [activeGroup.section]: true };"
    );

    fs.writeFileSync(sidebarPath, updated, 'utf8');
    console.log('[patch-menu-naming] audited and streamlined admin sidebar information architecture');
  } else {
    console.warn('[patch-menu-naming] Sidebar menu block markers not found; skipped menu replacement');
  }
}

console.log('[patch-menu-naming] menu audit complete');