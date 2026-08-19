import { createClient } from '@supabase/supabase-js';

// 1. Resolve Supabase URL from Vite env or process env with reliable fallback
let rawUrl: string | undefined;
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    rawUrl =
      import.meta.env.VITE_SUPABASE_URL ||
      import.meta.env.VITE_SUPABASE_PROJECT_URL ||
      import.meta.env.SUPABASE_URL;
  }
} catch (e) {}

if (!rawUrl && typeof process !== 'undefined' && process.env) {
  rawUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_PROJECT_URL ||
    process.env.SUPABASE_URL;
}

let envUrl = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim() !== '' && rawUrl !== 'undefined'
  ? rawUrl
  : 'https://missjyvqfehamtpyodjr.supabase.co'
).trim();

// Strip /rest/v1 or trailing slash if present in the URL
if (envUrl.endsWith('/rest/v1/')) {
  envUrl = envUrl.substring(0, envUrl.length - 9);
} else if (envUrl.endsWith('/rest/v1')) {
  envUrl = envUrl.substring(0, envUrl.length - 8);
}
if (envUrl.endsWith('/')) {
  envUrl = envUrl.substring(0, envUrl.length - 1);
}

// 2. Resolve Supabase Publishable / Anon Key
let rawAnon: string | undefined;
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    rawAnon =
      import.meta.env.VITE_SUPABASE_ANON ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      import.meta.env.VITE_SUPABASE_KEY ||
      import.meta.env.SUPABASE_ANON_KEY ||
      import.meta.env.SUPABASE_KEY;
  }
} catch (e) {}

if (!rawAnon && typeof process !== 'undefined' && process.env) {
  rawAnon =
    process.env.VITE_SUPABASE_ANON ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY;
}

export const SUPABASE_URL = envUrl;
export const SUPABASE_ANON_KEY = (
  rawAnon && typeof rawAnon === 'string' && rawAnon.trim() !== '' && rawAnon !== 'undefined'
    ? rawAnon
    : 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn'
).trim();

/**
 * Global read-through cache for Supabase REST GET requests.
 * - In-memory cache makes SPA menu navigation effectively instant.
 * - sessionStorage keeps public data available after a page refresh.
 * - Stale data is returned immediately while a background request refreshes it.
 * - Writes invalidate the cache so edits remain visible without waiting for TTL.
 */
type CachedResponse = {
  body: string;
  status: number;
  statusText: string;
  headers: [string, string][];
  savedAt: number;
};

const memoryQueryCache = new Map<string, CachedResponse>();
const inFlightQueries = new Map<string, Promise<Response>>();
const MEMORY_TTL = 20_000;
const SESSION_MAX_AGE = 30 * 60_000;
const SESSION_PREFIX = 'pb_supabase_query_v2:';

const PUBLIC_CACHE_TABLES = new Set([
  'site_settings',
  'berita',
  'komentar',
  'galeri',
  'gallery',
  'hero_sliders',
  'navbar_menu',
  'navbar_settings',
  'page_contents',
  'documents',
  'organizational_structure',
  'inventaris',
  'rankings',
  'pertandingan'
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
  try {
    const headers = new Headers(source);
    return headers.get(name) || '';
  } catch {
    return '';
  }
}

function getTableFromRestUrl(url: string): string {
  const marker = '/rest/v1/';
  const index = url.indexOf(marker);
  if (index < 0) return '';
  const rest = url.substring(index + marker.length);
  return decodeURIComponent(rest.split('?')[0].split('/')[0]);
}

function isPublicTable(table: string): boolean {
  return PUBLIC_CACHE_TABLES.has(table);
}

function makeMemoryKey(url: string, authorization: string): string {
  // Keep authenticated users isolated in memory without persisting JWTs.
  const scope = authorization && authorization !== `Bearer ${SUPABASE_ANON_KEY}`
    ? authorization.slice(-24)
    : 'public';
  return `${scope}|${url}`;
}

function makeSessionKey(url: string): string {
  try {
    return `${SESSION_PREFIX}${btoa(unescape(encodeURIComponent(url))).replace(/=+$/g, '')}`;
  } catch {
    return `${SESSION_PREFIX}${encodeURIComponent(url)}`;
  }
}

function responseFromCached(cached: CachedResponse): Response {
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers
  });
}

async function persistPublicCache(url: string, cached: CachedResponse) {
  try {
    if (cached.body.length > 1_500_000) return;
    sessionStorage.setItem(makeSessionKey(url), JSON.stringify(cached));
  } catch {
    // Storage quota/private mode: memory cache still works.
  }
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
  } catch {
    return null;
  }
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

async function networkSupabaseGet(input: RequestInfo | URL, init?: RequestInit, memoryKey?: string, url?: string): Promise<Response> {
  const targetUrl = url || getFetchUrl(input);
  const existing = memoryKey ? inFlightQueries.get(memoryKey) : undefined;
  if (existing) return existing.then(r => r.clone());

  const requestPromise = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await nativeFetch(input, { ...init, signal: init?.signal || controller.signal });
      if (response.ok && memoryKey) {
        const clone = response.clone();
        const body = await clone.text();
        const cached: CachedResponse = {
          body,
          status: response.status,
          statusText: response.statusText,
          headers: Array.from(response.headers.entries()),
          savedAt: Date.now()
        };
        memoryQueryCache.set(memoryKey, cached);
        const table = getTableFromRestUrl(targetUrl);
        if (typeof window !== 'undefined' && isPublicTable(table)) {
          void persistPublicCache(targetUrl, cached);
        }
      }
      return response;
    } finally {
      window.clearTimeout(timeout);
    }
  })();

  if (memoryKey) inFlightQueries.set(memoryKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    if (memoryKey) inFlightQueries.delete(memoryKey);
  }
}

const nativeFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

const cachedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = getFetchUrl(input);
  const method = getFetchMethod(input, init);
  const isSupabaseRestRead = url.startsWith(`${envUrl}/rest/v1/`) && (method === 'GET' || method === 'HEAD');

  if (!isSupabaseRestRead) {
    const response = await nativeFetch(input, init);
    if (url.startsWith(`${envUrl}/rest/v1/`) && method !== 'GET' && method !== 'HEAD') {
      invalidateSupabaseReadCache();
    }
    return response;
  }

  const table = getTableFromRestUrl(url);
  const authorization = getHeader(input, init, 'Authorization');
  const memoryKey = makeMemoryKey(url, authorization);
  const cached = memoryQueryCache.get(memoryKey);

  if (cached) {
    if (Date.now() - cached.savedAt > MEMORY_TTL) {
      void networkSupabaseGet(input, init, memoryKey, url).catch(() => {});
    }
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

// 3. Create configured Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: cachedFetch,
    headers: {
      'x-application-name': 'pb-bilibili-162'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Health check helper to verify Supabase database connectivity
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; timestamp: string }> {
  try {
    const { error } = await supabase.from('site_settings').select('key').limit(1);
    if (error && error.code !== 'PGRST116') {
      return {
        connected: false,
        message: error.message || 'Database query error',
        timestamp: new Date().toISOString()
      };
    }
    return {
      connected: true,
      message: 'Supabase Database Connected Successfully',
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err.message || 'Network / Connectivity Exception',
      timestamp: new Date().toISOString()
    };
  }
}
