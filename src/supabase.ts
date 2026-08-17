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

// Authoritative remote client. Popup CRUD deliberately uses this client
// directly so the admin popup cannot be hidden by IndexedDB/site-settings data.
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

const isValidUuid = (value: unknown) =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const sanitizePopupRow = (row: any) => {
  if (!row || typeof row !== 'object') return row;
  if ('id' in row && row.id != null && !isValidUuid(row.id)) {
    const { id: _invalidId, ...cleanRow } = row;
    return cleanRow;
  }
  return row;
};

function popupRemoteQuery() {
  const target: any = remoteSupabase.from('konfigurasi_popup');
  return new Proxy(target, {
    get(remoteTarget, prop, receiver) {
      if (prop === 'insert') {
        return (values: any, options?: any) => {
          const clean = Array.isArray(values) ? values.map(sanitizePopupRow) : sanitizePopupRow(values);
          return remoteTarget.insert(clean, options);
        };
      }
      if (prop === 'upsert') {
        return (values: any, options?: any) => {
          const clean = Array.isArray(values) ? values.map(sanitizePopupRow) : sanitizePopupRow(values);
          return remoteTarget.upsert(clean, options);
        };
      }
      return Reflect.get(remoteTarget, prop, receiver);
    },
  });
}

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

// Proxy keeps the existing API surface. Normal tables remain local-first for
// compatibility, while konfigurasi_popup is fully Supabase-authoritative.
export const supabase: typeof remoteSupabase = new Proxy(remoteSupabase as any, {
  get(target, prop, receiver) {
    if (prop === 'from') {
      return (table: string) => {
        if (table === 'konfigurasi_popup') return popupRemoteQuery();

        const localQuery: any = localFrom(table);
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
