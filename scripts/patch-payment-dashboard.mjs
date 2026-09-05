import fs from 'node:fs';

const componentPath = 'src/components/AdminPendaftaranTurnamenModern.tsx';
let src = fs.readFileSync(componentPath, 'utf8');
let changes = 0;

if (!src.includes('const paymentDisplayLabel =')) {
  const marker = "const statusPay = (v?: string) => {\n  const s = clean(v).toLowerCase();\n  return s.includes('terver') || s.includes('lunas') || s.includes('diterima') ? 'terverifikasi' : 'menunggu';\n};\n";
  if (!src.includes(marker)) throw new Error('[patch-payment-dashboard] statusPay marker not found');
  src = src.replace(marker, marker + "const paymentDisplayLabel = (v?: string) => statusPay(v) === 'terverifikasi' ? 'Lunas' : 'Belum Lunas';\n");
  changes++;
}

const oldStats = `  const stats = useMemo(() => ({\n    total: rows.length,\n    pending: rows.filter(r => statusReg(r.status_pendaftaran) === 'pending').length,\n    accepted: rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length,\n    rejected: rows.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length,\n    paid: rows.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi').length\n  }), [rows]);`;
const newStats = `  const stats = useMemo(() => {\n    const paidRows = rows.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi');\n    return {\n      total: rows.length,\n      pending: rows.filter(r => statusReg(r.status_pendaftaran) === 'pending').length,\n      accepted: rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length,\n      rejected: rows.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length,\n      paid: paidRows.length,\n      totalPayment: paidRows.reduce((sum, r) => sum + Number(r.biaya_pendaftaran || 0), 0)\n    };\n  }, [rows]);`;
if (!src.includes('totalPayment')) {
  if (!src.includes(oldStats)) throw new Error('[patch-payment-dashboard] stats boundary not found');
  src = src.replace(oldStats, newStats);
  changes++;
}

const replacements = [
  ['grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5', 'grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6'],
  ['<Stat label="Pembayaran OK" value={stats.paid} icon={<CreditCard size={17}/>} />', '<Stat label="Lunas" value={stats.paid} icon={<CreditCard size={17}/>} />\n            <Stat label="Total Pembayaran" value={rupiah(stats.totalPayment)} icon={<CreditCard size={17}/>} />'],
  ["(paymentStatus === 'Semua' || statusPay(r.status_pembayaran) === paymentStatus)", "(paymentStatus === 'Semua' || paymentDisplayLabel(r.status_pembayaran) === paymentStatus)"],
  ["options={['Semua','menunggu','terverifikasi']}", "options={['Semua','Belum Lunas','Lunas']}"],
  ["update({ status_pembayaran: 'Terverifikasi' })", "update({ status_pembayaran: 'Lunas' })"],
  ["title: 'Verifikasi pembayaran?'", "title: 'Tandai pembayaran Lunas?'"],
  ["confirmButtonText: 'Verifikasi'", "confirmButtonText: 'Simpan Lunas'"],
  ["title: 'Pembayaran terverifikasi'", "title: 'Pembayaran Lunas'"]
];
for (const [from, to] of replacements) {
  if (src.includes(from)) { src = src.replace(from, to); changes++; }
}

const oldRowPay = `<td className="px-4 py-4">{ps==='terverifikasi'?badge('Terverifikasi','green'):badge('Menunggu','amber')}</td>`;
const newRowPay = `<td className="px-4 py-4"><div className="flex flex-col gap-1">{paymentDisplayLabel(row.status_pembayaran)==='Lunas'?badge('Lunas','green'):badge('Belum Lunas','amber')}<span className="whitespace-nowrap text-[10px] font-bold text-slate-500">{rupiah(row.biaya_pendaftaran)}</span></div></td>`;
if (src.includes(oldRowPay)) { src = src.replace(oldRowPay, newRowPay); changes++; }

const oldMobileMeta = `<p className="mt-2 text-[11px] text-slate-500">{clean(row.asal_pb)||'-'} • {clean(row.domisili)||'-'}</p>`;
const newMobileMeta = `<div className="mt-2 flex flex-col gap-0.5"><span className="text-[11px] font-black text-slate-700">Biaya pendaftaran: {rupiah(row.biaya_pendaftaran)}</span><span className="text-[11px] text-slate-500">{clean(row.asal_pb)||'-'} • {clean(row.domisili)||'-'}</span></div>`;
if (src.includes(oldMobileMeta)) { src = src.replace(oldMobileMeta, newMobileMeta); changes++; }

src = src.replace('{label:string,value:number,icon:React.ReactNode}', '{label:string,value:React.ReactNode,icon:React.ReactNode}');
src = src.replace('className="mt-1 text-2xl font-black text-slate-900"', 'className="mt-1 whitespace-nowrap text-xl font-black text-slate-900 sm:text-2xl"');

const exportPath = 'src/utils/adminExportEnhancer.ts';
let exp = fs.readFileSync(exportPath, 'utf8');
const oldPayFilter = "const pay=(v:unknown)=>{const x=norm(v);return x.includes('terver')||x.includes('lunas')||x.includes('diterima')?'terverifikasi':'menunggu'};";
const newPayFilter = "const pay=(v:unknown)=>{const x=norm(v);return x.includes('terver')||x.includes('lunas')||x.includes('diterima')?'Lunas':'Belum Lunas'};";
if (exp.includes(oldPayFilter)) { exp = exp.replace(oldPayFilter, newPayFilter); changes++; }
const oldExportStatus = "Status_Pembayaran:clean(r.status_pembayaran)||'-'";
const newExportStatus = "Status_Pembayaran:(/terver|lunas|diterima/i.test(clean(r.status_pembayaran))?'Lunas':'Belum Lunas')";
if (exp.includes(oldExportStatus)) { exp = exp.replace(oldExportStatus, newExportStatus); changes++; }

fs.writeFileSync(componentPath, src);
fs.writeFileSync(exportPath, exp);

const required = ['paymentDisplayLabel', "options={['Semua','Belum Lunas','Lunas']}", 'Tandai pembayaran Lunas?', 'Pembayaran Lunas'];
for (const marker of required) {
  if (!src.includes(marker)) throw new Error(`[patch-payment-dashboard] required UI marker missing after patch: ${marker}`);
}
console.log(`[patch-payment-dashboard] applied ${changes} changes; payment labels verified`);
