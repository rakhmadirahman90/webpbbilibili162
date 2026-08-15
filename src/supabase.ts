import { createClient } from '@supabase/supabase-js';

// PB BILIBILI 162 production Supabase project.
// The production app must never be redirected by a stale Vercel environment
// variable to another Supabase project.
const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

// Always use the canonical production project/key. Environment variables are
// intentionally ignored here because an old Vercel VITE_SUPABASE_* value was
// able to make different deployments talk to different projects.
const resolvedKey = SUPABASE_PUBLISHABLE_KEY;

// Supabase supplies authentication headers through the fetch init object.
// Clone them with Headers and explicitly restore apikey/Authorization so a
// custom fetch wrapper can never drop them. This directly prevents the
// "No API key found in request" failure seen in production.
const retryFetch: typeof fetch = async (input, init) => {
  const maxAttempts = 3;
  const delays = [350, 900];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const headers = new Headers(init?.headers);
      headers.set('apikey', resolvedKey);
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${resolvedKey}`);
      }
      headers.set('Cache-Control', 'no-cache');
      headers.set('Pragma', 'no-cache');

      const requestInit: RequestInit = {
        ...init,
        cache: 'no-store',
        headers,
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
