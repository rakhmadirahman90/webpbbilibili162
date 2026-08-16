import { createClient } from '@supabase/supabase-js';

// Canonical production Supabase project for PB Bilibili 162.
// IMPORTANT: do not allow Vercel/Vite variables to redirect the frontend to a
// different Supabase project. The database and all public/admin modules use
// this project as the single source of truth.
export const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
export const SUPABASE_PROJECT_REF = 'missjyvqfehamtpyodjr';
export const SUPABASE_PROJECT_URL = SUPABASE_URL;

// Supabase supplies a Headers instance containing the critical `apikey` and
// `Authorization` headers. Never spread Headers into an object: doing so
// drops its entries and causes "No API key found in request" and empty-data
// failures across the frontend. Clone Headers explicitly before adding cache
// controls so REST, Storage and Realtime requests retain authentication.
const retryFetch: typeof fetch = async (input, init) => {
  const maxAttempts = 3;
  const delays = [350, 900];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const headers = new Headers(init?.headers);
      headers.set('Cache-Control', 'no-cache');
      headers.set('Pragma', 'no-cache');

      const requestInit: RequestInit = {
        ...init,
        cache: 'no-store',
        headers,
      };

      const response = await fetch(input, requestInit);
      const transient = [408, 425, 429, 500, 502, 503, 504, 522, 524].includes(response.status);

      if (response.ok || !transient || attempt === maxAttempts - 1) {
        return response;
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delays[attempt] ?? 900));
  }

  throw new Error('Supabase request failed after retries');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: retryFetch,
    headers: {
      'x-application-name': 'pb-bilibili-162',
      'x-pb-project-ref': SUPABASE_PROJECT_REF,
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Health check helper used by diagnostics and admin UI.
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; timestamp: string }> {
  try {
    const { error } = await supabase.from('site_settings').select('key').limit(1);
    if (error) {
      return {
        connected: false,
        message: error.message || 'Database query error',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      connected: true,
      message: 'Supabase Database Connected Successfully',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      connected: false,
      message: err?.message || 'Network / Connectivity Exception',
      timestamp: new Date().toISOString(),
    };
  }
}
