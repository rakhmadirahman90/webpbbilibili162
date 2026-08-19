// Route-intent prefetcher for the mobile/desktop sidebar and navbar.
// It starts the matching Vite chunk on pointer/touch intent, before React Router
// renders the destination. The destination component still performs its own
// Supabase query, so this only removes avoidable JS/chunk latency.

type Loader = () => Promise<unknown>;

const loaders: Record<string, Loader> = {
  // Public routes
  '/atlet': () => import('../components/Players'),
  '/players': () => import('../components/Players'),
  '/player': () => import('../components/Players'),
  '/ranking': () => import('../components/Rankings'),
  '/rankings': () => import('../components/Rankings'),
  '/peringkat': () => import('../components/Rankings'),
  '/jadwal': () => import('../components/JadwalLatihanView'),
  '/jadwal-latihan': () => import('../components/JadwalLatihanView'),
  '/schedule': () => import('../components/JadwalLatihanView'),
  '/kas': () => import('../components/PublicKasView'),
  '/quiz': () => import('../components/BadmintonQuiz'),
  '/galeri': () => import('../components/Gallery'),
  '/gallery': () => import('../components/Gallery'),
  '/berita': () => import('../components/News'),
  '/news': () => import('../components/News'),
  '/dokumen': () => import('../components/DokumenPenting'),
  '/dokumen-penting': () => import('../components/DokumenPenting'),
  '/documents': () => import('../components/DokumenPenting'),
  '/struktur': () => import('../components/StrukturOrganisasiPublic'),
  '/struktur-organisasi': () => import('../components/StrukturOrganisasiPublic'),
  '/inventaris': () => import('../components/PublicInventaris'),
  '/public-inventaris': () => import('../components/PublicInventaris'),
  '/prestasi': () => import('../components/PublicPrestasi'),
  '/program': () => import('../components/PublicProgram'),
  '/faq': () => import('../components/PublicFAQ'),
  '/contact': () => import('../components/Contact'),
  '/kontak': () => import('../components/Contact'),
  '/sejarah': () => import('../components/Sejarah'),
  '/tentang': () => import('../components/Sejarah'),
  '/tentang-kami': () => import('../components/Sejarah'),
  '/about': () => import('../components/Sejarah'),
  '/visi-misi': () => import('../components/VisiMisi'),
  '/visi': () => import('../components/VisiMisi'),
  '/misi': () => import('../components/VisiMisi'),
  '/fasilitas': () => import('../components/Fasilitas'),
  '/sambutan': () => import('../components/SambutanKetua'),
  '/sambutan-ketua': () => import('../components/SambutanKetua'),
  '/register': () => import('../components/RegistrationForm'),
  '/pendaftaran': () => import('../components/RegistrationForm'),

  // Admin routes
  '/admin/dashboard': () => import('../components/AdminDashboard'),
  '/admin/profil': () => import('../components/ProfilAnggota'),
  '/admin/notifications': () => import('../components/FcmSettingsDashboard'),
  '/admin/pwa-apk': () => import('../components/PwaApkManager'),
  '/admin/analisis-performa': () => import('../components/AnalisisPerforma'),
  '/admin/rapor-atlet': () => import('../components/RaporAtlet'),
  '/admin/live-score': () => import('../components/LiveScoreWidget'),
  '/admin/testimoni': () => import('../components/TestimonialUlasan'),
  '/admin/turnamen-liga': () => import('../components/TournamentLeague'),
  '/admin/jadwal': () => import('../components/JadwalLatihanView'),
  '/admin/ranking': () => import('../components/AdminRanking'),
  '/admin/skor': () => import('../components/AdminMatch'),
  '/admin/kas': () => import('../components/KasManager'),
  '/admin/rekap-keuangan': () => import('../components/AdminRekapKeuangan'),
  '/admin/berita': () => import('../components/AdminBerita'),
  '/admin/galeri': () => import('../components/AdminGallery'),
  '/admin/dokumen': () => import('../ManajemenDokumen'),
  '/admin/program': () => import('../components/AdminProgram'),
  '/admin/prestasi': () => import('../components/AdminPrestasi'),
  '/admin/faq': () => import('../components/AdminFAQ'),
  '/admin/sejarah': () => import('../components/AdminSejarah'),
  '/admin/visi-misi': () => import('../components/AdminVisiMisi'),
  '/admin/fasilitas': () => import('../components/AdminFasilitas'),
  '/admin/struktur': () => import('../components/AdminStructure'),
  '/admin/inventaris': () => import('../components/AdminInventaris'),
  '/admin/users': () => import('../components/AdminUsers'),
  '/admin/pendaftaran': () => import('../ManajemenPendaftaran'),
  '/admin/atlet': () => import('../ManajemenAtlet'),
  '/admin/absensi': () => import('../components/AdminAbsensi'),
  '/admin/poin': () => import('../ManajemenPoin'),
  '/admin/audit-poin': () => import('../AuditLogPoin'),
  '/admin/laporan': () => import('../components/AdminLaporan'),
  '/admin/surat': () => import('../components/KelolaSurat').then((m) => ({ default: m.KelolaSurat })),
  '/admin/logs': () => import('../components/AdminLogs'),
  '/admin/tampilan': () => import('../components/AdminTampilan'),
  '/admin/navbar': () => import('../components/KelolaNavbar'),
  '/admin/hero': () => import('../components/KelolaHero'),
  '/admin/popup': () => import('../components/AdminPopup'),
  '/admin/footer': () => import('../components/AdminFooter'),
  '/admin/kontak': () => import('../components/AdminContact'),
  '/admin/sambutan-ketua': () => import('../components/AdminSambutanKetua'),
  '/admin/about': () => import('../components/AdminAbout'),
};

const inFlight = new Map<string, Promise<unknown>>();

function normalizePath(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    return url.pathname.replace(/\/+$/, '').toLowerCase() || '/';
  } catch {
    return value.split('?')[0].replace(/\/+$/, '').toLowerCase() || '/';
  }
}

export function prefetchRoute(path: string): void {
  if (typeof window === 'undefined') return;
  const key = normalizePath(path);
  const loader = loaders[key];
  if (!loader || inFlight.has(key)) return;

  const promise = loader().catch((error) => {
    // A failed prefetch must never interfere with normal navigation.
    inFlight.delete(key);
    console.debug('[route-prefetch] skipped:', key, error);
  });

  inFlight.set(key, promise);
}

export function installNavigationPrefetch(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const handleIntent = (event: Event) => {
    const target = event.target as HTMLElement | null;
    const link = target?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    if (link.origin !== window.location.origin) return;
    prefetchRoute(link.pathname);
  };

  // pointerover handles desktop hover and touch/pointerdown handles mobile.
  document.addEventListener('pointerover', handleIntent, { passive: true });
  document.addEventListener('pointerdown', handleIntent, { passive: true, capture: true });
  document.addEventListener('touchstart', handleIntent, { passive: true, capture: true });

  return () => {
    document.removeEventListener('pointerover', handleIntent);
    document.removeEventListener('pointerdown', handleIntent, true);
    document.removeEventListener('touchstart', handleIntent, true);
  };
}
