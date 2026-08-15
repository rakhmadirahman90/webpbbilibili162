import { createClient } from '@supabase/supabase-js';

// PB BILIBILI 162 production Supabase project.
// The URL is intentionally fixed to prevent a stale Vercel variable from
// silently redirecting the frontend to another Supabase project.
const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

const envKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY
    : undefined;

const resolvedKey = envKey || SUPABASE_PUBLISHABLE_KEY;

// Supabase REST can transiently return gateway/network errors. Retry only
// transient failures; authorization, RLS and validation errors are returned
// immediately so the UI can surface the real database error.
const retryFetch: typeof fetch = async (input, init) => {
  const maxAttempts = 3;
  const delays = [350, 900];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const requestInit: RequestInit = {
        ...init,
        cache: 'no-store',
        headers: {
          ...(init?.headers || {}),
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      };

      const response = await fetch(input, requestInit);
      const transient = [408, 429, 500, 502, 503, 504, 522, 524].includes(response.status);

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

export const supabase = createClient(SUPABASE_URL, resolvedKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: retryFetch,
    headers: {
      'x-pb-project-ref': 'missjyvqfehamtpyodjr',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const SUPABASE_PROJECT_REF = 'missjyvqfehamtpyodjr';
export const SUPABASE_PROJECT_URL = SUPABASE_URL;
