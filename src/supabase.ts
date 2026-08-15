import { createClient } from '@supabase/supabase-js';

// PB BILIBILI 162 Supabase project
const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

// Prefer deployment environment variables, while keeping the application
// explicitly pointed at the PB BILIBILI 162 Supabase project by default.
const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_URL
    : undefined;

const envKey =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_SUPABASE_ANON || import.meta.env.VITE_SUPABASE_ANON_KEY
    : undefined;

export const supabase = createClient(
  envUrl || SUPABASE_URL,
  envKey || SUPABASE_PUBLISHABLE_KEY
);
