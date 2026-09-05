import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');

  // Use the direct native-fetch client for this admin page so it bypasses
  // the application's cachedFetch timeout/abort path.
  src = src.replace(
    "import { supabaseDirect as supabase } from '../supabaseDirect';",
    "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
  );
  src = src.replace(
    "import { supabase } from '../supabase';",
    "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';"
  );

  // Collapse duplicate direct imports introduced by repeated preparation runs.
  const importRegex = /import \{ supabaseDirect \} from '\.\.\/supabaseDirect';\n/g;
  let seen = false;
  src = src.replace(importRegex, (m) => {
    if (seen) return '';
    seen = true;
    return m;
  });

  // Keep the admin list query lightweight and aligned with the real table schema.
  // IMPORTANT: pendaftaran_turnamen does NOT have catatan_verifikasi.
  const loadRegex = /const \{ data, error \} = await (?:supabase|supabaseDirect)\.rpc\('admin_get_pendaftaran_turnamen', \{ p_pin: adminPin \}\);/;
  const newLoad = "const { data, error } = await supabaseDirect.from('pendaftaran_turnamen').select('id,created_at,kode_pendaftaran,kategori,nama_pemain_1,nama_pemain_2,whatsapp,email,asal_pb,domisili,biaya_pendaftaran,status_pembayaran,status_pendaftaran,bukti_pembayaran_url,nik_pemain_1,nik_pemain_2,wilayah_nik_pemain_1,wilayah_nik_pemain_2,foto_pemain_1_url,foto_pemain_2_url,ktp_pemain_1_url,ktp_pemain_2_url,verifikasi_nik_status,verifikasi_nik_detail,catatan_admin').order('created_at', { ascending: false }).range(0, 999);";
  if (loadRegex.test(src)) src = src.replace(loadRegex, newLoad);

  // Also replace the original broad list query if a prior RPC patch was not present.
  const broadLoad = "const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });";
  if (src.includes(broadLoad)) src = src.replace(broadLoad, newLoad);

  // The actual database column for admin notes is catatan_admin.
  src = src.replaceAll('payload.catatan_verifikasi = note', 'payload.catatan_admin = note');

  // Keep the PDF report title consistent with the official tournament name.
  src = src.replaceAll(
    'PENDAFTARAN PESERTA — PB BILIBILI 162',
    'PENDAFTARAN PESERTA - TURNAMEN BADMINTON BILIBILI CUP I TAHUN 2026'
  );

  fs.writeFileSync(path, src, 'utf8');
  console.log(`[patch-admin-registration-direct-client] schema/query/PDF-title patch applied to ${path}`);
}
