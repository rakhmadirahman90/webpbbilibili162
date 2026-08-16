import { createClient } from '@supabase/supabase-js';
import { from as localFrom, flushSyncQueue, startLocalFirstSync, localDbExport, localDbImport } from './localFirstDb';

function readEnv(name: string): string | undefined {
  try {
    const vite = (import.meta as any)?.env;
    if (vite?.[name]) return vite[name];
  } catch {}
  try {
    if (typeof process !== 'undefined' && process.env?.[name]) return process.env[name];
  } catch {}
  return undefined;
}

let envUrl = (readEnv('VITE_SUPABASE_URL') || readEnv('VITE_SUPABASE_PROJECT_URL') || readEnv('SUPABASE_URL') || 'https://missjyvqfehamtpyodjr.supabase.co').trim();
envUrl = envUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const anon = (readEnv('VITE_SUPABASE_ANON') || readEnv('VITE_SUPABASE_ANON_KEY') || readEnv('VITE_SUPABASE_KEY') || readEnv('SUPABASE_ANON_KEY') || readEnv('SUPABASE_KEY') || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn').trim();

export const SUPABASE_URL = envUrl;
export const SUPABASE_ANON_KEY = anon;
export const SUPABASE_PROJECT_URL = envUrl;
export const SUPABASE_PROJECT_REF = envUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || '';

// Authoritative remote client. All public frontend reads use this client so
// the UI cannot be permanently masked by an empty or stale IndexedDB cache.
export const remoteSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: { headers: { 'x-application-name': 'pb-bilibili-162' } },
  realtime: { params: { eventsPerSecond: 10 } },
});

(globalThis as any).__PB_REMOTE_SUPABASE = remoteSupabase;

// Local-first remains the write layer for compatibility with existing admin
// persistence. Reads are deliberately remote-authoritative.
const localFromForWrite = (table: string) => localFrom(table);

function remoteFromForRead(table: string) {
  const target: any = remoteSupabase.from(table);
  return new Proxy(target, {
    get(remoteTarget, prop, receiver) {
      if (prop === 'select') {
        return (...args: any[]) => {
          let query: any = remoteTarget.select(...args);
          try {
            if (table === 'berita' && typeof window !== 'undefined') {
              const category = new URLSearchParams(window.location.search).get('category')?.trim();
              if (category) query = query.ilike('kategori', category);
            }
          } catch {}
          return query;
        };
      }
      return Reflect.get(remoteTarget, prop, receiver);
    },
  });
}

// Proxy keeps the existing API surface. Mutations remain local-first; SELECT
// always comes directly from Supabase. This makes every navbar page display
// the current database state on each mount while preserving offline writes.
export const supabase: typeof remoteSupabase = new Proxy(remoteSupabase as any, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => {
        const localQuery: any = localFromForWrite(table);
        const remoteQuery: any = remoteFromForRead(table);
        return new Proxy(localQuery, {
          get(localTarget, method, localReceiver) {
            if (method === 'select') return remoteQuery.select.bind(remoteQuery);
            return Reflect.get(localTarget, method, localReceiver);
          },
        });
      };
    }
    return Reflect.get(target, prop, receiver);
  },
});

if (typeof window !== 'undefined') {
  startLocalFirstSync();
  window.addEventListener('online', () => { void flushSyncQueue(); });
}

export { localDbExport, localDbImport, flushSyncQueue };

export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; timestamp: string }> {
  try {
    const { error } = await remoteSupabase.from('site_settings').select('key').limit(1);
    if (error && error.code !== 'PGRST116') {
      return { connected:false, message:error.message || 'Database query error', timestamp:new Date().toISOString() };
    }
    return { connected:true, message:'Supabase Database Connected Successfully', timestamp:new Date().toISOString() };
  } catch (err:any) {
    return { connected:false, message:err?.message || 'Network / Connectivity Exception', timestamp:new Date().toISOString() };
  }
}
