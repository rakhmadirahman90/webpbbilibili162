import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

// Dedicated native-fetch client for critical admin reads/writes.
// It intentionally bypasses the application's cachedFetch layer so a
// lifecycle-triggered AbortSignal cannot cancel pendaftaran_turnamen requests.
const directFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : fetch;

export const supabaseDirect = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  global: {
    fetch: directFetch,
    headers: { 'x-application-name': 'pb-bilibili-162-admin-direct' }
  },
});
