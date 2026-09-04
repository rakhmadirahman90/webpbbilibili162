type Loader = () => Promise<unknown>;

const publicRouteLoaders: Loader[] = [
  () => import('../components/Players'),
  () => import('../components/Rankings'),
];

const adminRouteLoaders: Loader[] = [
  () => import('../components/AdminDashboard'),
  () => import('../ManajemenPendaftaran'),
  () => import('../ManajemenAtlet'),
  () => import('../components/AdminBerita'),
];

let publicStarted = false;
let adminStarted = false;

function canPrefetch() {
  if (typeof window === 'undefined') return false;
  const connection = (navigator as any).connection;
  return !connection?.saveData && connection?.effectiveType !== 'slow-2g' && connection?.effectiveType !== '2g';
}

function scheduleIdle(task: () => void, delay = 3000) {
  if (typeof window === 'undefined') return;
  window.setTimeout(() => {
    if (!canPrefetch()) return;
    const idle = (window as any).requestIdleCallback as ((cb: () => void, opts?: { timeout: number }) => number) | undefined;
    if (idle) idle(task, { timeout: 5000 });
    else setTimeout(task, 0);
  }, delay);
}

async function preloadInBatches(loaders: Loader[], batchSize = 2) {
  for (let i = 0; i < loaders.length; i += batchSize) {
    await Promise.allSettled(loaders.slice(i, i + batchSize).map(loader => loader()));
  }
}

export function preloadPublicExperience(_getSiteSetting?: (key: string) => Promise<any>) {
  if (publicStarted || typeof window === 'undefined') return;
  publicStarted = true;
  scheduleIdle(() => void preloadInBatches(publicRouteLoaders), 4000);
}

export function preloadAdminExperience(_getSiteSetting?: (key: string) => Promise<any>) {
  if (adminStarted || typeof window === 'undefined') return;
  adminStarted = true;
  scheduleIdle(() => void preloadInBatches(adminRouteLoaders), 5000);
}
