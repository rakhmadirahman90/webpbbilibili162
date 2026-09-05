import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

const select = "id,created_at,kode_pendaftaran,kategori,nama_pemain_1,nama_pemain_2,whatsapp,email,asal_pb,domisili,biaya_pendaftaran,status_pembayaran,status_pendaftaran,bukti_pembayaran_url,nik_pemain_1,nik_pemain_2,wilayah_nik_pemain_1,wilayah_nik_pemain_2,foto_pemain_1_url,foto_pemain_2_url,ktp_pemain_1_url,ktp_pemain_2_url,verifikasi_nik_status,verifikasi_nik_detail,catatan_admin";
const load = `const { data, error } = await supabase.from('pendaftaran_turnamen').select('${select}').order('created_at', { ascending: false }).range(0, 999);`;
const capacityState = `\n  const categoryCapacity = useMemo(() => {\n    const normalizeCategory = (value: unknown) => clean(value).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    const ajatappareng = rows.filter(r => normalizeCategory(r.kategori).includes('ajatappareng')).length;\n    const lokalCcParepare = rows.filter(r => { const s = normalizeCategory(r.kategori); return s.includes('lokal') && s.includes('parepare'); }).length;\n    return { ajatappareng, lokalCcParepare };\n  }, [rows]);\n`;
const card = `\nfunction CategoryCapacityCard({ label, current, target, subtitle }: { label: string; current: number; target: number; subtitle: string }) {\n  const percent = Math.min(100, Math.round((current / Math.max(1, target)) * 100));\n  const remaining = Math.max(0, target - current);\n  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">Kategori</p><h3 className="mt-1 text-sm font-black text-slate-900">{label}</h3></div><div className="text-right"><p className="text-xl font-black text-blue-700">{current}<span className="text-sm font-bold text-slate-400"> / {target}</span></p><p className="text-[10px] font-bold text-slate-500">pasang</p></div></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{width: percent + '%'}} /></div><div className="mt-2 flex items-center justify-between text-[10px] font-bold"><span className="text-slate-500">{subtitle}</span><span className="text-blue-700">{percent}% terisi · {remaining} tersisa</span></div></div>;
}\n`;
const cards = `\n        <div className="dashboard-category-targets grid gap-3 border-t border-slate-200 bg-slate-50/80 p-4 sm:grid-cols-2"><CategoryCapacityCard label="AD/BC-/C+C Ajatappareng" current={categoryCapacity.ajatappareng} target={64} subtitle="Target 64 pasang" /><CategoryCapacityCard label="CC Lokal Parepare" current={categoryCapacity.lokalCcParepare} target={128} subtitle="Target 128 pasang" /></div>`;
const statContrast = `\n        <style>{\`.tournament-admin-page .dashboard-stat-grid > div { color:#0f172a !important; } .tournament-admin-page .dashboard-stat-grid > div > div:last-child, .tournament-admin-page .dashboard-stat-grid > div > p:last-child { color:#0f172a !important; text-shadow:none !important; -webkit-text-fill-color:#0f172a !important; } .tournament-admin-page .dashboard-category-targets h3 { color:#0f172a !important; }\`}</style>`;

for (const path of paths) {
  if (!fs.existsSync(path)) continue;
  let src = fs.readFileSync(path, 'utf8');
  src = src.replaceAll('supabaseDirect.from(', 'supabase.from(');
  src = src.replace(/const \{ data, error \} = await (?:supabase|supabaseDirect)\.rpc\('admin_get_pendaftaran_turnamen', \{ p_pin: adminPin \}\);/g, load);
  src = src.replace(/const \{ data, error \} = await supabase\.from\('pendaftaran_turnamen'\)\.select\('\*'\)\.order\('created_at', \{ ascending: false \}\);/g, load);
  src = src.replaceAll('payload.catatan_verifikasi = note', 'payload.catatan_admin = note');
  src = src.replaceAll('PENDAFTARAN PESERTA — PB BILIBILI 162', 'PENDAFTARAN PESERTA - TURNAMEN BADMINTON BILIBILI CUP I TAHUN 2026');
  if (!src.includes('const categoryCapacity = useMemo')) {
    const stats = '  const stats = useMemo(() => ({';
    const end = src.indexOf('  const updateStatus =', src.indexOf(stats));
    if (end > 0) src = src.slice(0, end) + capacityState + src.slice(end);
  }
  if (!src.includes('function CategoryCapacityCard')) {
    const marker = 'export default function AdminPendaftaranTurnamenModernV2() {';
    if (src.includes(marker)) src = src.replace(marker, card + marker);
  }
  if (!src.includes('<CategoryCapacityCard label="Ajatappareng"') && !src.includes('<CategoryCapacityCard label="AD/BC-/C+C Ajatappareng"')) {
    const headerEnd = src.indexOf('</header>');
    if (headerEnd > 0) src = src.slice(0, headerEnd) + cards + src.slice(headerEnd);
  } else {
    src = src.replaceAll('<CategoryCapacityCard label="Ajatappareng"', '<CategoryCapacityCard label="AD/BC-/C+C Ajatappareng"');
  }
  src = src.replace('grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5', 'dashboard-stat-grid grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5');
  if (!src.includes('dashboard-stat-grid .')) {
    const returnMarker = '  return <div className="tournament-admin-page';
    if (src.includes(returnMarker)) src = src.replace(returnMarker, '  return <div className="tournament-admin-page' + statContrast + '');
  }
  fs.writeFileSync(path, src, 'utf8');
}
