import fs from 'node:fs';
import path from 'node:path';

const sidebarPath = path.resolve('src/components/Sidebar.tsx');
const appPath = path.resolve('src/App.tsx');

function replaceOnce(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function patchSidebar() {
  const source = fs.readFileSync(sidebarPath, 'utf8');
  const startMarker = '    const allMenuItems = [';
  const endMarker = '  const menuItems = allMenuItems';
  const replacement = `    const allMenuItems = [
      {
        section: 'Portal Utama',
        items: [
          { name: role === 'admin' ? 'Dashboard Admin' : 'Dashboard Anggota', path: 'dashboard', icon: LayoutDashboard, adminOnly: false },
          { name: 'Profil Saya', path: 'profil', icon: UserCheck, adminOnly: false },
        ]
      },
      ...(role === 'admin' ? [
        {
          section: 'Manajemen Anggota & Atlet',
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
          section: 'Operasional Club',
          adminOnly: true,
          items: [
            { name: 'Jadwal Latihan', path: 'jadwal', icon: Calendar, adminOnly: true },
            { name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true },
            { name: 'Laporan & Rekap', path: 'laporan', icon: BarChart3, adminOnly: true },
            { name: 'Kelola Surat', path: 'surat', icon: Mail, adminOnly: true },
            { name: 'Kelola Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: true },
            { name: 'Log Aktivitas', path: 'logs', icon: FileSearch, adminOnly: true },
          ]
        },
        {
          section: 'Konten & Media',
          adminOnly: true,
          items: [
            { name: 'Kelola Berita', path: 'berita', icon: Newspaper, adminOnly: true },
            { name: 'Kelola Galeri', path: 'galeri', icon: Image, adminOnly: true },
            { name: 'Kelola Dokumen', path: 'dokumen', icon: BookOpen, adminOnly: true },
          ]
        },
        {
          section: 'Pengaturan Website',
          adminOnly: true,
          items: [
            { name: 'Kelola Sambutan Ketua', path: 'sambutan-ketua', icon: Info, adminOnly: true },
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
      ] : []),
      ...(role !== 'admin' ? [
        {
          section: 'Kegiatan & Performa',
          items: [
            { name: 'Jadwal Latihan', path: 'jadwal', icon: Calendar, adminOnly: false },
            { name: 'Peringkat & Poin', path: 'ranking', icon: Trophy, adminOnly: false },
            { name: 'Hasil Skor', path: 'skor', icon: Zap, adminOnly: false },
            { name: 'Analisis Performa', path: 'analisis-performa', icon: BarChart3, adminOnly: false },
            { name: 'Rapor Atlet', path: 'rapor-atlet', icon: HeartPulse, adminOnly: false },
            { name: 'Live Score Lapangan', path: 'live-score', icon: Tv, adminOnly: false },
            { name: 'Turnamen & Liga', path: 'turnamen-liga', icon: Trophy, adminOnly: false },
            { name: 'Testimoni & Ulasan', path: 'testimoni', icon: MessageSquare, adminOnly: false },
          ]
        },
        {
          section: 'Informasi Club',
          items: [
            { name: 'Berita & Pengumuman', path: 'berita', icon: Newspaper, adminOnly: false },
            { name: 'Galeri Media', path: 'galeri', icon: Image, adminOnly: false },
            { name: 'Dokumen Club', path: 'dokumen', icon: BookOpen, adminOnly: false },
            { name: 'Program Klub', path: 'program', icon: Target, adminOnly: false },
            { name: 'Prestasi', path: 'prestasi', icon: Trophy, adminOnly: false },
            { name: 'FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: false },
            { name: 'Sejarah Klub', path: 'sejarah', icon: Info, adminOnly: false },
            { name: 'Visi & Misi', path: 'visi-misi', icon: Info, adminOnly: false },
            { name: 'Fasilitas', path: 'fasilitas', icon: Info, adminOnly: false },
            { name: 'Struktur Organisasi', path: 'struktur', icon: Network, adminOnly: false },
          ]
        }
      ] : [])
    ];

`;
  fs.writeFileSync(sidebarPath, replaceOnce(source, startMarker, endMarker, replacement), 'utf8');
}

function patchApp() {
  let source = fs.readFileSync(appPath, 'utf8');
  if (!source.includes("import AdminSambutanKetua from './components/AdminSambutanKetua';")) {
    source = source.replace(
      "const AdminFooter = lazy(() => import('./components/AdminFooter'));",
      "const AdminFooter = lazy(() => import('./components/AdminFooter'));\nconst AdminSambutanKetua = lazy(() => import('./components/AdminSambutanKetua'));"
    );
  }
  if (!source.includes('path="sambutan-ketua"')) {
    source = source.replace(
      '<Route path="footer" element={isAdmin ? <AdminFooter /> : <Navigate to="/admin/dashboard" replace />} />',
      '<Route path="footer" element={isAdmin ? <AdminFooter /> : <Navigate to="/admin/dashboard" replace />} />\n              <Route path="sambutan-ketua" element={isAdmin ? <AdminSambutanKetua /> : <Navigate to="/admin/dashboard" replace />} />'
    );
  }
  fs.writeFileSync(appPath, source, 'utf8');
}

patchSidebar();
patchApp();
console.log('[patch-admin-member-menus] sidebar and app routes updated');
