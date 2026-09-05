import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');

  if (!src.includes("import { supabaseDirect } from '../supabaseDirect';")) {
    src = src.replace(
      "import { supabase } from '../supabase';",
      "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
    );
  }

  // Critical admin reads must bypass the application's cachedFetch layer.
  // The V2 route is the canonical /admin/pendaftaran-turnamen page.
  src = src.replaceAll("supabase.from('pendaftaran_turnamen')", "supabaseDirect.from('pendaftaran_turnamen')");

  // pendaftaran_turnamen is not publicly readable; use the PIN-validated RPC
  // for the list read while leaving mutation operations on the native client.
  const oldLoad = "const { data, error } = await supabaseDirect.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });";
  const newLoad = "const adminPin = (() => { try { const raw = localStorage.getItem('pb162_user_pins'); const dict = raw ? JSON.parse(raw) : {}; return String(dict?.admin?.pin || ''); } catch { return ''; } })();\n      const { data, error } = await supabaseDirect.rpc('admin_get_pendaftaran_turnamen', { p_pin: adminPin });";
  if (src.includes(oldLoad)) src = src.replace(oldLoad, newLoad);

  fs.writeFileSync(path, src, 'utf8');
  console.log(`[patch-admin-registration-direct-client] protected direct read applied to ${path}`);
}
