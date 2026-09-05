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

  // Add live category capacity counters: each registration row represents one pair.
  if (!src.includes('const categoryCapacity = useMemo')) {
    const statsMarker = "  const stats = useMemo(() => ({ total: rows.length, pending: rows.filter(r => statusReg(r.status_pendaftaran) === 'pending').length, accepted: rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length, rejected: rows.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length, paid: rows.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi').length }), [rows]);";
    const capacityCode = `${statsMarker}\n  const categoryCapacity = useMemo(() => {\n    const normalizeCategory = (value: unknown) => clean(value).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    const ajatappareng = rows.filter(r => normalizeCategory(r.kategori).includes('ajatappareng')).length;\n    const lokalCcParepare = rows.filter(r => { const s = normalizeCategory(r.kategori); return s.includes('lokal') && s.includes('parepare'); }).length;\n    return { ajatappareng, lokalCcParepare };\n  }, [rows]);`;
    if (src.includes(statsMarker)) src = src.replace(statsMarker, capacityCode);
  }

  // Render the two category counters directly below the overall registration stats.
  const statsGrid = '<div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5"><Stat label="Total Peserta" value={stats.total} icon={<Users size={17}/>} /><Stat label="Menunggu" value={stats.pending} icon={<Clock3 size={17}/>} /><Stat label="Diterima" value={stats.accepted} icon={<CheckCircle2 size={17}/>} /><Stat label="Ditolak" value={stats.rejected} icon={<XCircle size={17}/>} /><Stat label="Pembayaran OK" value={stats.paid} icon={<CreditCard size={17}/>} /></div>';
  const statsWithCapacity = `${statsGrid}<div className="grid gap-3 border-t border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2"><CategoryCapacityCard label="Ajatappareng" current={categoryCapacity.ajatappareng} target={64} subtitle="Target 64 pasang" /><CategoryCapacityCard label="Lokal CC Parepare" current={categoryCapacity.lokalCcParepare} target={128} subtitle="Target 128 pasang" /></div>`;
  if (src.includes(statsGrid) && !src.includes('<CategoryCapacityCard label="Ajatappareng"')) src = src.replace(statsGrid, statsWithCapacity);

  // Add a compact reusable capacity card before the main component.
  if (!src.includes('function CategoryCapacityCard')) {
    const componentMarker = 'export default function AdminPendaftaranTurnamenModernV2() {';
    const helper = `function CategoryCapacityCard({ label, current, target, subtitle }: { label: string; current: number; target: number; subtitle: string }) {\n  const safeTarget = Math.max(1, target);\n  const percent = Math.min(100, Math.round((current / safeTarget) * 100));\n  const remaining = Math.max(0, safeTarget - current);\n  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">\n    <div className="flex items-start justify-between gap-3">\n      <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Kategori</p><h3 className="mt-1 text-sm font-black text-slate-900">{label}</h3></div>\n      <div className="text-right"><p className="text-xl font-black text-blue-700">{current}<span className="text-sm font-bold text-slate-400"> / {safeTarget}</span></p><p className="text-[10px] font-bold text-slate-500">pasang</p></div>\n    </div>\n    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: \\`${percent}%\\` }} /></div>\n    <div className="mt-2 flex items-center justify-between text-[10px] font-bold"><span className="text-slate-500">{subtitle}</span><span className="text-blue-700">{percent}% terisi · {remaining} tersisa</span></div>\n  </div>;\n}\n\n`;
    if (src.includes(componentMarker)) src = src.replace(componentMarker, helper + componentMarker);
  }

  fs.writeFileSync(path, src, 'utf8');
  console.log(`[patch-admin-registration-direct-client] schema/query/PDF-title/category-capacity patch applied to ${path}`);
}
