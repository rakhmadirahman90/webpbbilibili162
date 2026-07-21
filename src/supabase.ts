import { createClient } from '@supabase/supabase-js';

// Get the URL from environment, fallback to hardcoded
let rawUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
let envUrl = rawUrl || 'https://missjyvqfehamtpyodjr.supabase.co';

// Strip /rest/v1 or /rest/v1/ if present in the URL
if (envUrl && typeof envUrl === 'string') {
  if (envUrl.endsWith('/rest/v1/')) {
    envUrl = envUrl.substring(0, envUrl.length - 9);
  } else if (envUrl.endsWith('/rest/v1')) {
    envUrl = envUrl.substring(0, envUrl.length - 8);
  }
}

const supabaseUrl = envUrl;
const rawAnon = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY) : undefined;
const supabaseAnonKey = rawAnon || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
