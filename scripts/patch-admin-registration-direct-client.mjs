import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

const newLoad = "const { data, error } = await supabaseDirect.from('pendaftaran_turnamen').select('id,created_at,kode_pendaftaran,kategori,nama_pemain_1,nama_pemain_2,whatsapp,email,asal_pb,domisili,biaya_pendaftaran,status_pembayaran,status_pendaftaran,bukti_pembayaran_url,nik_pemain_1,nik_pemain_2,wilayah_nik_pemain_1,wilayah_nik_pemain_2,foto_pemain_1_url,foto_pemain_2_url,ktp_pemain_1_url,ktp_pemain_2_url,verifikasi_nik_status,verifikasi_nik_detail,catatan_admin').order('created_at', { ascending: false }).range(0, 999);";

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');

  // Direct client for reliable admin reads.
  if (!src.includes("import { supabaseDirect } from '../supabaseDirect';")) {
    src = src.replace("import { supabase } from '../supabase';", "import { supabase } from '../supabase';\nimport { supabaseDirect } from '../supabaseDirect';");
  }

  // Keep the admin list query lightweight and aligned with the real schema.
  src = src.replace(/const \{ data, error \} = await (?:supabase|supabaseDirect)\.rpc\('admin_get_pendaftaran_turnamen', \{ p_pin: adminPin \}\);/g, newLoad);
  src = src.replace("const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });", newLoad);

  // Actual database column.
  src = src.replaceAll('payload.catatan_verifikasi = note', 'payload.catatan_admin = note');

  // Official PDF title.
  src = src.replaceAll('PENDAFTARAN PESERTA — PB BILIBILI 162', 'PENDAFTARAN PESERTA - TURNAMEN BADMINTON BILIBILI CUP I TAHUN 2026');

  // Category capacity state: one registration row = one pair.
  if (!src.includes('const categoryCapacity = useMemo')) {
    const marker = '  const stats = useMemo(() => ({';
    const start = src.indexOf(marker);
    const end = start >= 0 ? src.indexOf('  const updateStatus =', start) : -1;
    if (start >= 0 && end > start) {
      const block = src.slice(start, end);
      const capacity = "\n  const categoryCapacity = useMemo(() => {\n    const normalizeCategory = (value: unknown) => clean(value).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    const ajatappareng = rows.filter(r => normalizeCategory(r.kategori).includes('ajatappareng')).length;\n    const lokalCcParepare = rows.filter(r => { const s = normalizeCategory(r.kategori); return s.includes('lokal') && s.includes('parepare'); }).length;\n    return { ajatappareng, lokalCcParepare };\n  }, [rows]);\n";
      src = src.slice(0, end) + capacity + src.slice(end);
    }
  }

  // Reusable counter card. Avoid nested template literals so this patch script itself remains valid JS.
  if (!src.includes('function CategoryCapacityCard')) {
    const marker = 'export default function AdminPendaftaranTurnamenModernV2() {';
    const helper = "function CategoryCapacityCard({ label, current, target, subtitle }: { label: string; current: number; target: number; subtitle: string }) {\n  const safeTarget = Math.max(1, target);\n  const percent = Math.min(100, Math.round((current / safeTarget) * 100));\n  const remaining = Math.max(0, safeTarget - current);\n  return <div className=\"rounded-2xl border border-slate-200 bg-white p-4 shadow-sm\">\n    <div className=\"flex items-start justify-between gap-3\">\n      <div><p className=\"text-[10px] font-black uppercase tracking-[.14em] text-slate-500\">Kategori</p><h3 className=\"mt-1 text-sm font-black text-slate-900\">{label}</h3></div>\n      <div className=\"text-right\"><p className=\"text-xl font-black text-blue-700\">{current}<span className=\"text-sm font-bold text-slate-400\"> / {safeTarget}</span></p><p className=\"text-[10px] font-bold text-slate-500\">pasang</p></div>\n    </div>\n    <div className=\"mt-3 h-2 overflow-hidden rounded-full bg-slate-200\"><div className=\"h-full rounded-full bg-blue-600 transition-all\" style={{ width: percent + '%' }} /></div>\n    <div className=\"mt-2 flex items-center justify-between text-[10px] font-bold\"><span className=\"text-slate-500\">{subtitle}</span><span className=\"text-blue-700\">{percent}% terisi · {remaining} tersisa</span></div>\n  </div>;\n}\n\n";
    if (src.includes(marker)) src = src.replace(marker, helper + marker);
  }

  // Insert the two counters directly after the existing 5 stat cards, using the actual JSX structure.
  if (!src.includes('<CategoryCapacityCard label="Ajatappareng"')) {
    const statsOpen = '<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5">';
    const statsStart = src.indexOf(statsOpen);
    const statsEnd = statsStart >= 0 ? src.indexOf('</div>', statsStart) : -1;
    if (statsStart >= 0 && statsEnd > statsStart) {
      const insert = '\n        <div className="grid gap-3 border-t border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2"><CategoryCapacityCard label="Ajatappareng" current={categoryCapacity.ajatappareng} target={64} subtitle="Target 64 pasang" /><CategoryCapacityCard label="Lokal CC Parepare" current={categoryCapacity.lokalCcParepare} target={128} subtitle="Target 128 pasang" /></div>';
      src = src.slice(0, statsEnd + 6) + insert + src.slice(statsEnd + 6);
    }
  }

  fs.writeFileSync(path, src, 'utf8');
  console.log(`[patch-admin-registration-direct-client] applied schema, PDF title, and category capacity to ${path}`);
}
