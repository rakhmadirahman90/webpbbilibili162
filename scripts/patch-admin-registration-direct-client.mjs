import fs from 'node:fs';

const path = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(path, 'utf8');

if (!src.includes("import { supabaseDirect } from '../supabaseDirect';")) {
  src = src.replace(
    "import { supabase } from '../supabase';",
    "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
  );
}

src = src.replaceAll("supabase.from('pendaftaran_turnamen')", "supabaseDirect.from('pendaftaran_turnamen')");

// The admin portal uses its own PIN session rather than Supabase Auth.
// pendaftaran_turnamen is intentionally not publicly readable, so route
// the admin read through a SECURITY DEFINER RPC that validates the PIN.
const oldLoad = "const { data, error } = await supabaseDirect.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });";
const newLoad = "const adminPin = (() => { try { const raw = localStorage.getItem('pb162_user_pins'); const dict = raw ? JSON.parse(raw) : {}; return String(dict?.admin?.pin || ''); } catch { return ''; } })();\n        const { data, error } = await supabaseDirect.rpc('admin_get_pendaftaran_turnamen', { p_pin: adminPin });";
if (src.includes(oldLoad)) {
  src = src.replace(oldLoad, newLoad);
}

fs.writeFileSync(path, src, 'utf8');
console.log('[patch-admin-registration-direct-client] tournament admin reads use protected PIN RPC; writes remain native Supabase client');
