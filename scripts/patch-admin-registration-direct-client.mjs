import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');

  // Use the direct native-fetch client under the existing `supabase` name.
  // This avoids any runtime `supabaseDirect is not defined` reference while
  // guaranteeing this admin page bypasses the application's cachedFetch layer.
  src = src.replace(
    "import { supabase } from '../supabase';",
    "import { supabaseDirect as supabase } from '../supabaseDirect';"
  );

  // If an earlier patch already introduced a separate supabaseDirect import,
  // collapse it back to the single aliased import above.
  src = src.replace(
    "import { supabaseDirect } from '../supabaseDirect';\n",
    ""
  );

  // Normalize any references left by previous versions of this patch.
  src = src.replaceAll('supabaseDirect.from(', 'supabase.from(');
  src = src.replaceAll('supabaseDirect.storage', 'supabase.storage');
  src = src.replaceAll('supabaseDirect.channel', 'supabase.channel');
  src = src.replaceAll('supabaseDirect.removeChannel', 'supabase.removeChannel');

  // pendaftaran_turnamen is not publicly readable; use the PIN-validated RPC
  // for the list read while leaving mutation operations on the native client.
  const oldLoad = "const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });";
  const newLoad = "const adminPin = (() => { try { const raw = localStorage.getItem('pb162_user_pins'); const dict = raw ? JSON.parse(raw) : {}; return String(dict?.admin?.pin || ''); } catch { return ''; } })();\n      const { data, error } = await supabase.rpc('admin_get_pendaftaran_turnamen', { p_pin: adminPin });";
  if (src.includes(oldLoad)) src = src.replace(oldLoad, newLoad);

  fs.writeFileSync(path, src, 'utf8');
  console.log(`[patch-admin-registration-direct-client] native direct client applied to ${path}`);
}
