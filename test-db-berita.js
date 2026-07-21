import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://missjyvqfehamtpyodjr.supabase.co', 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn');
async function test() {
  const { data, error } = await supabase.from('berita').select('*').limit(1);
  console.log("Berita:", data, error);
}
test();
