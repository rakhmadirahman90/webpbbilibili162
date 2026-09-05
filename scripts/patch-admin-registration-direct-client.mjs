import fs from 'node:fs';

const paths = [
  'src/components/AdminPendaftaranTurnamenModern.tsx',
  'src/components/AdminPendaftaranTurnamenModernV2.tsx',
];

const select = "id,created_at,kode_pendaftaran,kategori,nama_pemain_1,nama_pemain_2,whatsapp,email,asal_pb,domisili,biaya_pendaftaran,status_pembayaran,status_pendaftaran,bukti_pembayaran_url,nik_pemain_1,nik_pemain_2,wilayah_nik_pemain_1,wilayah_nik_pemain_2,foto_pemain_1_url,foto_pemain_2_url,ktp_pemain_1_url,ktp_pemain_2_url,verifikasi_nik_status,verifikasi_nik_detail,catatan_admin";
const load = `const { data, error } = await supabase.from('pendaftaran_turnamen').select('${select}').order('created_at', { ascending: false }).range(0, 999);`;
const capacityState = `\n  const categoryCapacity = useMemo(() => {\n    const normalizeCategory = (value: unknown) => clean(value).toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n    const ajatappareng = rows.filter(r => normalizeCategory(r.kategori).includes('ajatappareng')).length;\n    const lokalCcParepare = rows.filter(r => { const s = normalizeCategory(r.kategori); return s.includes('lokal') && s.includes('parepare'); }).length;\n    return { ajatappareng, lokalCcParepare };\n  }, [rows]);\n`;
const card = `\nfunction CategoryCapacityCard({ label, current, target, subtitle }: { label: string; current: number; target: number; subtitle: string }) {\n  const percent = Math.min(100, Math.round((current / Math.max(1, target)) * 100));\n  const remaining = Math.max(0, target - current);\n  return <div className="dashboard-category-card rounded-2xl border border-blue-900/80 bg-slate-950 p-4 shadow-sm sm:p-5"><div className="grid min-h-[74px] grid-cols-[minmax(0,1fr)_auto] items-start gap-4"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-300">Kategori</p><h3 className="mt-1 text-base font-black leading-6 text-white sm:text-lg">{label}</h3></div><div className="min-w-[76px] text-right"><p className="whitespace-nowrap text-2xl font-black leading-none text-blue-300 sm:text-3xl">{current}<span className="text-base font-bold text-slate-300 sm:text-lg"> / {target}</span></p><p className="mt-1 text-[10px] font-bold leading-4 text-slate-300">pasang</p></div></div><div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-300"><div className="h-full rounded-full bg-blue-600 transition-all" style={{width: percent + '%'}} /></div><div className="mt-2.5 grid grid-cols-[auto_1fr_auto] items-center gap-2 text-[10px] font-bold sm:text-[11px]"><span className="whitespace-nowrap text-slate-300">{subtitle}</span><span className="hidden h-4 w-px bg-slate-600 sm:block" /><span className="whitespace-nowrap text-right text-blue-300">{percent}% terisi · {remaining} tersisa</span></div></div>;\n}\n`;
const cards = `\n        <div className="dashboard-category-targets grid gap-3 border-t border-slate-700 bg-slate-950/60 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5"><CategoryCapacityCard label="AD/BC-/C+C Ajatappareng" current={categoryCapacity.ajatappareng} target={64} subtitle="Target 64 pasang" /><CategoryCapacityCard label="CC Lokal Parepare" current={categoryCapacity.lokalCcParepare} target={128} subtitle="Target 128 pasang" /></div>`;
const statContrast = `<style>{\`.tournament-admin-page .dashboard-stat-grid > div { color:#0f172a !important; } .tournament-admin-page .dashboard-stat-grid > div > div:last-child, .tournament-admin-page .dashboard-stat-grid > div > p:last-child { color:#0f172a !important; text-shadow:none !important; -webkit-text-fill-color:#0f172a !important; } .tournament-admin-page .dashboard-category-targets .dashboard-category-card, .tournament-admin-page .dashboard-category-targets .dashboard-category-card * { color:inherit; } .tournament-admin-page .dashboard-category-targets .dashboard-category-card h3 { color:#f8fafc !important; -webkit-text-fill-color:#f8fafc !important; text-shadow:none !important; } .tournament-admin-page .dashboard-category-targets .dashboard-category-card p { color:#cbd5e1 !important; -webkit-text-fill-color:#cbd5e1 !important; text-shadow:none !important; } .tournament-admin-page .dashboard-category-targets .dashboard-category-card .text-blue-300 { color:#93c5fd !important; -webkit-text-fill-color:#93c5fd !important; } .tournament-admin-page .dashboard-category-targets .dashboard-category-card .bg-blue-600 { background-color:#2563eb !important; } .tournament-admin-page .dashboard-category-targets .dashboard-category-card .bg-slate-300 { background-color:#cbd5e1 !important; }\`}</style>`;

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
  if (!src.includes('dashboard-stat-grid .tournament-admin-stat-contrast')) {
    const rootMarker = '  return <div className="tournament-admin-page min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">';
    if (src.includes(rootMarker)) src = src.replace(rootMarker, `${rootMarker}<div className="tournament-admin-stat-contrast">${statContrast}</div>`);
  }
  fs.writeFileSync(path, src, 'utf8');
}
