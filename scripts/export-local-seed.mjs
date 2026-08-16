import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = 'https://missjyvqfehamtpyodjr.supabase.co';
const SUPABASE_KEY = 'sb_publishable_trhfpzLX50WdkdaItRPFMQ_ewqF0fgn';

// Public/frontend tables. Missing tables are skipped so the build remains
// compatible with older database schemas. Private auth tables are excluded.
const TABLES = [
  'pendaftaran','rankings','atlet_stats','site_settings','konfigurasi_popup',
  'berita','galeri','prestasi','program','faq','contact','inventaris',
  'kas','transaksi_kas','dokumen','arsip_surat','absensi','jadwal',
  'pertandingan','match','matches','hasil_pertandingan','struktur_organisasi',
  'visi_misi','fasilitas','testimonial','testimonials','navbar','footer',
  'hero_config','pengurus','pelatih','atlet','prestasi_atlet','laporan',
  'surat','agenda','pengumuman','pengaturan','site_settings'
];

async function fetchTable(table) {
  const url = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(table)}?select=*`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const seed = { version: 1, generated_at: new Date().toISOString(), source: 'supabase-build-export', tables: {} };
  const seen = new Set();
  for (const table of TABLES) {
    if (seen.has(table)) continue;
    seen.add(table);
    const rows = await fetchTable(table);
    if (rows !== null) seed.tables[table] = rows;
  }

  const publicDir = path.resolve('public');
  fs.mkdirSync(publicDir, { recursive: true });
  fs.writeFileSync(path.join(publicDir, 'local_seed.json'), JSON.stringify(seed));
  const summary = Object.entries(seed.tables).map(([name, rows]) => `${name}=${rows.length}`).join(', ');
  console.log(`[local-db] Seeded ${Object.keys(seed.tables).length} tables: ${summary}`);
}

main().catch((error) => {
  console.warn('[local-db] Seed export failed; frontend will still use local IndexedDB.', error?.message || error);
  fs.mkdirSync(path.resolve('public'), { recursive: true });
  const file = path.resolve('public/local_seed.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ version: 1, generated_at: new Date().toISOString(), source: 'local-only', tables: {} }));
});
