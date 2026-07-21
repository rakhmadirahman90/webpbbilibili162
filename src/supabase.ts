import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://missjyvqfehamtpyodjr.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON || 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
