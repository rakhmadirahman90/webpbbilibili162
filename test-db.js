import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://missjyvqfehamtpyodjr.supabase.co';
const supabaseKey = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('pendaftaran').select('*');
  console.log("Pendaftaran records:", error ? error.message : data?.length);
  if (data && data.length > 0) {
    console.log("Sample names:", data.slice(0, 5).map(d => d.nama));
  }
}

test();
