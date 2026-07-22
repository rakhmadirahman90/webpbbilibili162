import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://missjyvqfehamtpyodjr.supabase.co';
const supabaseKey = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const emails = ['admin@gmail.com', 'admin@pbbilibili.com', 'admin@pb162.org', 'admin@pb162.net'];
  for (const email of emails) {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: 'pbilibili162',
      options: {
        data: {
          role: 'admin',
          full_name: 'Administrator'
        }
      }
    });
    console.log(email, "->", error ? error.message : "SUCCESS!");
  }
}

test();
