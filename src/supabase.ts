import { createClient } from '@supabase/supabase-js';

// PB BILIBILI 162 production Supabase project.
// Keep this project ID explicit so a missing/misconfigured Vercel variable
// can never silently redirect the application to another Supabase project.
const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;

const envKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY
    : undefined;

const resolvedUrl = (envUrl || SUPABASE_URL).replace(/\/+$/, '');
const resolvedKey = envKey || SUPABASE_PUBLISHABLE_KEY;

// Supabase's REST endpoint can occasionally return a gateway timeout while the
// project is waking/recovering. Retry only transient network/5xx/522 responses;
// never retry authorization or validation failures.
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

      if (response.ok || ![408, 429, 500, 502, 503, 504, 522, 524].includes(response.status)) {
        return response;
      }

      if (attempt === maxAttempts - 1) return response;
    } catch (error) {
      if (attempt === maxAttempts - 1) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, delays[attempt] ?? 900));
  }

  throw new Error('Supabase request failed after retries');
};

export const supabase = createClient(resolvedUrl, resolvedKey, {
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
export const SUPABASE_PROJECT_URL = resolvedUrl;
