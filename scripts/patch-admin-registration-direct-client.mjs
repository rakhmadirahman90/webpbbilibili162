import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');

  // Use the direct native-fetch client under the existing `supabase` name.
  // This avoids the cachedFetch timeout/abort path on the admin registration page.
  src = src.replace(
    "import { supabaseDirect as supabase } from '../supabaseDirect';",
    "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
  );
  src = src.replace(
    "import { supabase } from '../supabase';",
    "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
  );

  // Collapse duplicate direct imports introduced by repeated production patches.
  const importLine = "import { supabaseDirect } from '../supabaseDirect';";
  const importCount = (src.match(/import \{ supabaseDirect \} from '\.\.\/supabaseDirect';/g) || []).length;
  if (importCount > 1) {
    let seen = false;
    src = src.replace(/import \{ supabaseDirect \} from '\.\.\/supabaseDirect';\n/g, (m) => {
      if (seen) return '';
      seen = true;
      return m;
    });
  }

  // Any previous direct-client aliases are normalized to the explicit client.
  src = src.replaceAll('supabaseDirect.from(', 'supabaseDirect.from(');
  src = src.replaceAll('supabaseDirect.storage', 'supabaseDirect.storage');
  src = src.replaceAll('supabaseDirect.channel', 'supabaseDirect.channel');
  src = src.replaceAll('supabaseDirect.removeChannel', 'supabaseDirect.removeChannel');

  // Keep the admin list query lightweight. The previous PIN RPC could stall at
  // the database gateway (522), leaving the UI permanently on "Memuat data".
  // Select only fields used by the admin page and cap the first page at 1000.
  const loadRegex = /const \{ data, error \} = await (?:supabase|supabaseDirect)\.rpc\('admin_get_pendaftaran_turnamen', \{ p_pin: adminPin \}\);/;
  const newLoad = "const { data, error } = await supabaseDirect.from('pendaftaran_turnamen').select('id,created_at,kode_pendaftaran,kategori,nama_pemain_1,nama_pemain_2,whatsapp,email,asal_pb,domisili,biaya_pendaftaran,status_pembayaran,status_pendaftaran,bukti_pembayaran_url,nik_pemain_1,nik_pemain_2,wilayah_nik_pemain_1,wilayah_nik_pemain_2,foto_pemain_1_url,foto_pemain_2_url,ktp_pemain_1_url,ktp_pemain_2_url,verifikasi_nik_status,verifikasi_nik_detail,catatan_verifikasi,catatan_admin').order('created_at', { ascending: false }).range(0, 999);";
  if (loadRegex.test(src)) src = src.replace(loadRegex, newLoad);

  // Also replace the original broad list query if a prior RPC patch was not present.
  const broadLoad = "const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });";
  if (src.includes(broadLoad)) src = src.replace(broadLoad, newLoad);

  fs.writeFileSync(path, src, 'utf8');
  console.log(`[patch-admin-registration-direct-client] lightweight direct query applied to ${path}`);
}
