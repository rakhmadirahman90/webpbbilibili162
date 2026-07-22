import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://missjyvqfehamtpyodjr.supabase.co';
const supabaseKey = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing login with admin@pb162.com...");
  const { data: d1, error: e1 } = await supabase.auth.signInWithPassword({
    email: 'admin@pb162.com',
    password: 'admin'
  });
  console.log("admin@pb162.com result:", e1 ? e1.message : "SUCCESS", d1?.user?.email);

  console.log("Testing login with admin@pbbilibili162.com...");
  const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
    email: 'admin@pbbilibili162.com',
    password: 'admin'
  });
  console.log("admin@pbbilibili162.com result:", e2 ? e2.message : "SUCCESS", d2?.user?.email);
}

test();
