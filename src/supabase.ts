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

// 3. Create configured Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
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

