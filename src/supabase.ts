import { createClient } from '@supabase/supabase-js';

// Canonical production Supabase project for PB Bilibili 162.
// Never allow stale Vercel/Vite variables to redirect the frontend to another project.
export const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
export const SUPABASE_PROJECT_REF = 'missjyvqfehamtpyodjr';
export const SUPABASE_PROJECT_URL = SUPABASE_URL;

// CRITICAL: Supabase's client supplies apikey/Authorization in the fetch init.
// The previous production wrapper rebuilt Headers without explicitly restoring
// them, which can make PostgREST return an empty/unauthorized result. Always
// preserve existing auth headers and provide safe defaults when they are absent.
const retryFetch: typeof fetch = async (input, init) => {
  const maxAttempts = 3;
  const delays = [350, 900];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const headers = new Headers(init?.headers);

      // Explicitly restore the publishable API key. This is safe to expose in
      // a browser and prevents the exact "No API key found in request" failure.
      headers.set('apikey', SUPABASE_ANON_KEY);

      // Preserve an authenticated user's access token when supabase-js has set
      // one. For an unauthenticated request, use the publishable key as the
      // bearer token so public RLS policies can be evaluated normally.
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      }

      headers.set('Cache-Control', 'no-cache');
      headers.set('Pragma', 'no-cache');

      const requestInit: RequestInit = {
        ...init,
        signal: init?.signal ?? controller.signal,
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
    } finally {
      clearTimeout(timeoutId);
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
