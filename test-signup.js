import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://missjyvqfehamtpyodjr.supabase.co';
const supabaseKey = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Trying signUp admin@pb162.com...");
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@pb162.com',
    password: 'pbilibili162',
    options: {
      data: {
        role: 'admin',
        full_name: 'Administrator PB162'
      }
    }
  });

  if (error) {
    console.log("SignUp error:", error.message);
  } else {
    console.log("SignUp success:", data.user?.email, "Session:", !!data.session);
  }
}

test();
