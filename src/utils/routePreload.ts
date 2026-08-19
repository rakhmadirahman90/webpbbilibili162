type Loader = () => Promise<unknown>;

/**
 * Preloads the public route chunks after first paint so a sidebar/menu click
 * does not pay the first dynamic-import network cost.
 */
const publicRouteLoaders: Loader[] = [
  () => import('../components/Players'),
  () => import('../components/Rankings'),
  () => import('../components/BadmintonQuiz'),
  () => import('../components/Gallery'),
  () => import('../components/RegistrationForm'),
  () => import('../components/PublicKasView'),
  () => import('../components/DokumenPenting'),
  () => import('../components/StrukturOrganisasiPublic'),
  () => import('../components/PublicInventaris'),
  () => import('../components/PublicPrestasi'),
  () => import('../components/PublicFAQ'),
  () => import('../components/PublicProgram'),
];

const adminRouteLoaders: Loader[] = [
  () => import('../components/AdminDashboard'),
  () => import('../ManajemenPendaftaran'),
  () => import('../ManajemenAtlet'),
  () => import('../components/AdminBerita'),
  () => import('../components/AdminMatch'),
  () => import('../components/AdminRanking'),
  () => import('../components/AdminGallery'),
  () => import('../components/AdminContact'),
  () => import('../components/KelolaNavbar'),
  () => import('../components/ManajemenPoin'),
  () => import('../components/AuditLogPoin'),
  () => import('../components/AdminLaporan'),
  () => import('../components/AdminLogs'),
  () => import('../components/AdminTampilan'),
  () => import('../components/KelolaHero'),
  () => import('../components/AdminPopup'),
  () => import('../components/AdminFooter'),
  () => import('../components/AdminAbsensi'),
  () => import('../components/AdminInventaris'),
  () => import('../components/AdminPrestasi'),
  () => import('../components/AdminFAQ'),
  () => import('../components/AdminProgram'),
  () => import('../components/AdminAbout'),
  () => import('../components/AdminStructure'),
  () => import('../components/AdminSejarah'),
  () => import('../components/AdminVisiMisi'),
  () => import('../components/AdminFasilitas'),
  () => import('../components/ManajemenDokumen'),
  () => import('../components/KelolaSurat'),
  () => import('../components/KasManager'),
  () => import('../components/ProfilAnggota'),
  () => import('../components/AdminUsers'),
  () => import('../components/AdminRekapKeuangan'),
  () => import('../components/AnalisisPerforma'),
  () => import('../components/TournamentLeague'),
  () => import('../components/RaporAtlet'),
  () => import('../components/LiveScoreWidget'),
  () => import('../components/TestimonialUlasan'),
  () => import('../components/FcmSettingsDashboard'),
  () => import('../components/PwaApkManager'),
];

const publicDataKeys = [
  'hero_config',
  'gallery_list',
  'prestasi_list',
  'program_list',
  'faq_list',
  'inventaris_list',
  'documents_list',
  'structure_list',
  'fasilitas_list',
  'sambutan_ketua',
  'news_list',
];

let publicStarted = false;
let adminStarted = false;

function scheduleIdle(task: () => void, delay = 120) {
  if (typeof window === 'undefined') return;
  const run = () => {
    const idle = (window as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined;
    if (idle) idle(task, { timeout: 1500 });
    else setTimeout(task, 0);
  };
  window.setTimeout(run, delay);
}

async function preloadInBatches(loaders: Loader[], batchSize = 3) {
  for (let i = 0; i < loaders.length; i += batchSize) {
    const batch = loaders.slice(i, i + batchSize);
    await Promise.allSettled(batch.map(loader => loader()));
  }
}

export function preloadPublicExperience(getSiteSetting: (key: string) => Promise<any>) {
  if (publicStarted || typeof window === 'undefined') return;
  publicStarted = true;

  scheduleIdle(() => {
    // Start data and route-chunk warming together. Nothing here blocks rendering.
    void Promise.allSettled([
      ...publicDataKeys.map(key => getSiteSetting(key)),
      preloadInBatches(publicRouteLoaders),
    ]);
  });
}

export function preloadAdminExperience(getSiteSetting: (key: string) => Promise<any>) {
  if (adminStarted || typeof window === 'undefined') return;
  adminStarted = true;

  scheduleIdle(() => {
    void Promise.allSettled([
      preloadInBatches(adminRouteLoaders),
      ...publicDataKeys.map(key => getSiteSetting(key)),
    ]);
  }, 80);
}
