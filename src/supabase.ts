import { createClient } from '@supabase/supabase-js';

let rawUrl: string | undefined;
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_PROJECT_URL || import.meta.env.SUPABASE_URL;
  }
} catch (e) {}
if (!rawUrl && typeof process !== 'undefined' && process.env) {
  rawUrl = process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
}

let envUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl !== 'undefined'
  ? rawUrl
  : 'https://missjyvqfehamtpyodjr.supabase.co').trim();
if (envUrl.endsWith('/rest/v1/')) envUrl = envUrl.substring(0, envUrl.length - 9);
else if (envUrl.endsWith('/rest/v1')) envUrl = envUrl.substring(0, envUrl.length - 8);
if (envUrl.endsWith('/')) envUrl = envUrl.substring(0, envUrl.length - 1);

let rawAnon: string | undefined;
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    rawAnon = import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.SUPABASE_KEY;
  }
} catch (e) {}
if (!rawAnon && typeof process !== 'undefined' && process.env) {
  rawAnon = process.env.VITE_SUPABASE_ANON || process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
}

export const SUPABASE_URL = envUrl;
export const SUPABASE_ANON_KEY = (rawAnon && typeof rawAnon === 'string' && rawAnon.trim() !== '' && rawAnon !== 'undefined'
  ? rawAnon
  : 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewQF0fgn').trim();

// Global stale-while-revalidate cache for Supabase REST reads.
type CachedResponse = {
  body: string;
  status: number;
  statusText: string;
  headers: [string, string][];
  savedAt: number;
};

const memoryQueryCache = new Map<string, CachedResponse>();
const inFlightQueries = new Map<string, Promise<Response>>();
// Return cached data immediately; refresh it silently in the background.
const MEMORY_TTL = 60_000;
const SESSION_MAX_AGE = 30 * 60_000;
const SESSION_PREFIX = 'pb_supabase_query_v4:';

// Public/read-only datasets used by landing, member and public menu pages.
// These are safe to cache because all writes invalidate the read cache below.
const PUBLIC_CACHE_TABLES = new Set([
  'site_settings', 'berita', 'komentar', 'galeri', 'gallery', 'hero_sliders',
  'navbar_menu', 'navbar_settings', 'page_contents', 'documents',
  'organizational_structure', 'inventaris', 'rankings', 'pertandingan',
  'pendaftaran', 'atlet_stats', 'kas_pb', 'prestasi', 'program', 'faq',
  'fasilitas', 'jadwal_latihan'
]);

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.toString();
  return input.url;
}
function getFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  return String(init?.method || (typeof Request !== 'undefined' && input instanceof Request ? input.method : 'GET')).toUpperCase();
}
function getHeader(input: RequestInfo | URL, init: RequestInit | undefined, name: string): string {
  const source: HeadersInit | undefined = init?.headers || (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined);
  if (!source) return '';
  try { return new Headers(source).get(name) || ''; } catch { return ''; }
}
function getTableFromRestUrl(url: string): string {
  const marker = '/rest/v1/';
  const index = url.indexOf(marker);
  if (index < 0) return '';
  const rest = url.substring(index + marker.length);
  return decodeURIComponent(rest.split('?')[0].split('/')[0]);
}
function isPublicTable(table: string): boolean { return PUBLIC_CACHE_TABLES.has(table); }
function makeMemoryKey(url: string, authorization: string): string {
  const scope = authorization && authorization !== `Bearer ${SUPABASE_ANON_KEY}` ? authorization.slice(-24) : 'public';
  return `${scope}|${url}`;
}
function makeSessionKey(url: string): string {
  try { return `${SESSION_PREFIX}${btoa(unescape(encodeURIComponent(url))).replace(/=+$/g, '')}`; }
  catch { return `${SESSION_PREFIX}${encodeURIComponent(url)}`; }
}
function responseFromCached(cached: CachedResponse): Response {
  return new Response(cached.body, { status: cached.status, statusText: cached.statusText, headers: cached.headers });
}
async function persistPublicCache(url: string, cached: CachedResponse) {
  try {
    if (cached.body.length > 1_500_000) return;
    sessionStorage.setItem(makeSessionKey(url), JSON.stringify(cached));
  } catch {}
}
function readPublicSessionCache(url: string): CachedResponse | null {
  try {
    const raw = sessionStorage.getItem(makeSessionKey(url));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedResponse;
    if (!parsed || typeof parsed.body !== 'string' || !parsed.savedAt) return null;
    if (Date.now() - parsed.savedAt > SESSION_MAX_AGE) {
      sessionStorage.removeItem(makeSessionKey(url));
      return null;
    }
    return parsed;
  } catch { return null; }
}
function invalidateSupabaseReadCache() {
  memoryQueryCache.clear();
  inFlightQueries.clear();
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SESSION_PREFIX)) keys.push(key);
    }
    keys.forEach(key => sessionStorage.removeItem(key));
  } catch {}
}

const nativeFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

async function networkSupabaseGet(input: RequestInfo | URL, init?: RequestInit, memoryKey?: string, url?: string): Promise<Response> {
  const targetUrl = url || getFetchUrl(input);
  const existing = memoryKey ? inFlightQueries.get(memoryKey) : undefined;
  if (existing) return existing.then(r => r.clone());

  const requestPromise = (async () => {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = typeof window !== 'undefined' ? window.setTimeout(() => controller?.abort(), 5_000) : setTimeout(() => controller?.abort(), 5_000);
    try {
      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller?.signal });
      if (response.ok && memoryKey) {
        const body = await response.clone().text();
        const cached: CachedResponse = {
          body,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          savedAt: Date.now()
        };
        memoryQueryCache.set(memoryKey, cached);
        const table = getTableFromRestUrl(targetUrl);
        if (typeof window !== 'undefined' && isPublicTable(table)) void persistPublicCache(targetUrl, cached);
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  })();

  if (memoryKey) inFlightQueries.set(memoryKey, requestPromise);
  try { return await requestPromise; }
  finally { if (memoryKey) inFlightQueries.delete(memoryKey); }
}

const cachedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = getFetchUrl(input);
  const method = getFetchMethod(input, init);
  const isSupabaseRestRead = url.startsWith(`${envUrl}/rest/v1/`) && (method === 'GET' || method === 'HEAD');

  if (!isSupabaseRestRead) {
    const response = await nativeFetch(input, init);
    if (url.startsWith(`${envUrl}/rest/v1/`) && method !== 'GET' && method !== 'HEAD') invalidateSupabaseReadCache();
    return response;
  }

  const table = getTableFromRestUrl(url);
  const authorization = getHeader(input, init, 'Authorization');
  const memoryKey = makeMemoryKey(url, authorization);
  const cached = memoryQueryCache.get(memoryKey);

  if (cached) {
    // Never block the UI on revalidation. The component receives the current cached
    // snapshot immediately while a single in-flight request refreshes it silently.
    if (Date.now() - cached.savedAt > MEMORY_TTL) void networkSupabaseGet(input, init, memoryKey, url).catch(() => {});
    return responseFromCached(cached);
  }

  if (typeof window !== 'undefined' && isPublicTable(table)) {
    const sessionCached = readPublicSessionCache(url);
    if (sessionCached) {
      memoryQueryCache.set(memoryKey, sessionCached);
      void networkSupabaseGet(input, init, memoryKey, url).catch(() => {});
      return responseFromCached(sessionCached);
    }
  }

  return networkSupabaseGet(input, init, memoryKey, url);
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: cachedFetch,
    headers: { 'x-application-name': 'pb-bilibili-162' }
  },
  realtime: { params: { eventsPerSecond: 10 } }
});

/** Route-aware background prefetch. It never blocks rendering. */
export function warmupRouteData(pathname?: string) {
  if (typeof window === 'undefined') return;
  const path = (pathname || window.location.pathname).toLowerCase();
  const tasks: Promise<any>[] = [];
  const warm = (promise: Promise<any>) => tasks.push(promise.catch(() => null));

  if (path === '/' || path === '/berita' || path === '/news' || path.startsWith('/admin/berita')) {
    warm(supabase.from('berita').select('*, comments_count:komentar(count)').order('tanggal', { ascending: false }));
  }
  if (path === '/peringkat' || path === '/rankings' || path === '/ranking' || path === '/atlet' || path === '/players' || path.startsWith('/admin/atlet') || path.startsWith('/admin/ranking')) {
    warm(supabase.from('rankings').select('*'));
    warm(supabase.from('atlet_stats').select('pendaftaran_id, player_name, points, total_points, seed'));
    warm(supabase.from('pendaftaran').select('id, nama, foto_url, kategori_atlet'));
  }
  if (path === '/galeri' || path === '/gallery' || path.startsWith('/admin/galeri')) {
    warm(supabase.from('galeri').select('*'));
    warm(supabase.from('gallery').select('*'));
  }
  if (path === '/kas' || path.startsWith('/admin/kas') || path.startsWith('/admin/rekap-keuangan')) {
    warm(supabase.from('kas_pb').select('*').order('tanggal', { ascending: false }));
  }
  if (path === '/dokumen' || path === '/documents' || path.startsWith('/admin/dokumen')) {
    warm(supabase.from('documents').select('*'));
  }
  if (path === '/struktur' || path === '/struktur-organisasi' || path.startsWith('/admin/struktur')) {
    warm(supabase.from('organizational_structure').select('*'));
  }
  if (path === '/inventaris' || path.startsWith('/admin/inventaris')) {
    warm(supabase.from('inventaris').select('*'));
  }

  // Public information pages were previously only warmed for admin routes.
  // Warm the same keys before the lazy public component renders.
  const publicSettingKey =
    path === '/sejarah' || path === '/tentang-kami' || path === '/about' || path === '/tentang'
      ? 'history_content'
      : path === '/visi-misi' || path === '/visi' || path === '/misi'
        ? 'visi_misi_content'
        : path === '/fasilitas'
          ? 'fasilitas_list'
          : path === '/faq'
            ? 'faq_list'
            : path === '/prestasi'
              ? 'prestasi_list'
              : path === '/program'
                ? 'program_list'
                : null;
  if (publicSettingKey) {
    warm(supabase.from('site_settings').select('value, updated_at').eq('key', publicSettingKey).maybeSingle());
  }

  if (path === '/admin/prestasi' || path === '/admin/program' || path === '/admin/faq' || path === '/admin/sejarah' || path === '/admin/visi-misi' || path === '/admin/fasilitas') {
    const key = path.includes('prestasi') ? 'prestasi_list' : path.includes('program') ? 'program_list' : path.includes('faq') ? 'faq_list' : path.includes('sejarah') ? 'history_content' : path.includes('visi-misi') ? 'visi_misi_content' : 'fasilitas_list';
    warm(supabase.from('site_settings').select('value, updated_at').eq('key', key).maybeSingle());
  }
  if (tasks.length) void Promise.allSettled(tasks);
}

if (typeof window !== 'undefined') {
  const w = window as any;
  if (!w.__PB_BILIBILI_ROUTE_WARMUP__) {
    w.__PB_BILIBILI_ROUTE_WARMUP__ = true;
    const notifyRoute = () => setTimeout(() => warmupRouteData(window.location.pathname), 20);
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = ((...args: Parameters<History['pushState']>) => {
      const result = originalPushState(...args);
      window.dispatchEvent(new Event('pb-route-change'));
      return result;
    }) as History['pushState'];
    history.replaceState = ((...args: Parameters<History['replaceState']>) => {
      const result = originalReplaceState(...args);
      window.dispatchEvent(new Event('pb-route-change'));
      return result;
    }) as History['replaceState'];
    window.addEventListener('pb-route-change', notifyRoute);
    window.addEventListener('popstate', notifyRoute);
    notifyRoute();
  }
}

export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; timestamp: string }> {
  try {
    const { error } = await supabase.from('site_settings').select('key').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { connected: false, message: error.message || 'Database query error', timestamp: new Date().toISOString() };
    }
    return { connected: true, message: 'Supabase Database Connected Successfully', timestamp: new Date().toISOString() };
  } catch (err: any) {
    return { connected: false, message: err.message || 'Network / Connectivity Exception', timestamp: new Date().toISOString() };
  }
}
