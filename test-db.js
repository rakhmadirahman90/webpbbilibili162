import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://missjyvqfehamtpyodjr.supabase.co', 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn');
async function test() {
  const { data, error } = await supabase.from('navbar_settings').select('*');
  console.log("Navbar:", data?.length, error);
}
test();
