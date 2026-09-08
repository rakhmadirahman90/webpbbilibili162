import fs from 'node:fs';

const componentPath = 'src/components/KasManager.tsx';
const cssPath = 'src/index.css';
let src = fs.readFileSync(componentPath, 'utf8');

const oldSwitch = '<div className="flex rounded-xl border border-white/10 bg-black p-1"><button type="button" onClick={()=>setFormData(f=>({...f,jenis_transaksi:\'Masuk\',kategori:DAFTAR_PEMASUKAN.includes(f.kategori)?f.kategori:DAFTAR_PEMASUKAN[0]}))} className={`flex-1 rounded-lg py-1.5 text-[9px] sm:text-[10px] font-black uppercase ${formData.jenis_transaksi===\'Masuk\'?\'bg-emerald-600 text-white\':\'text-slate-500\'}`}>Pemasukan</button><button type="button" onClick={()=>setFormData(f=>({...f,jenis_transaksi:\'Keluar\',kategori:DAFTAR_PENGELUARAN[0]}))} className={`flex-1 rounded-lg py-1.5 text-[9px] sm:text-[10px] font-black uppercase ${formData.jenis_transaksi===\'Keluar\'?\'bg-red-600 text-white\':\'text-slate-500\'}`}>Pengeluaran</button></div>';
const newSwitch = '<div className="kas-transaction-switch grid w-full min-w-0 grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black p-1"><button type="button" onClick={()=>setFormData(f=>({...f,jenis_transaksi:\'Masuk\',kategori:DAFTAR_PEMASUKAN.includes(f.kategori)?f.kategori:DAFTAR_PEMASUKAN[0]}))} className={`min-w-0 w-full overflow-hidden rounded-lg py-2 text-[9px] sm:text-[10px] font-black uppercase whitespace-nowrap text-ellipsis ${formData.jenis_transaksi===\'Masuk\'?\'bg-emerald-600 text-white shadow-sm\':\'text-slate-500 hover:text-slate-300\'}`}>Pemasukan</button><button type="button" onClick={()=>setFormData(f=>({...f,jenis_transaksi:\'Keluar\',kategori:DAFTAR_PENGELUARAN[0]}))} className={`min-w-0 w-full overflow-hidden rounded-lg py-2 text-[9px] sm:text-[10px] font-black uppercase whitespace-nowrap text-ellipsis ${formData.jenis_transaksi===\'Keluar\'?\'bg-red-600 text-white shadow-sm\':\'text-slate-500 hover:text-slate-300\'}`}>Pengeluaran</button></div>';

if (src.includes(oldSwitch)) src = src.replace(oldSwitch, newSwitch);
src = src.replace('<form onSubmit={saveKas} className="space-y-3">', '<form onSubmit={saveKas} className="kas-entry-form space-y-3">');

const marker = '/* KAS_TRANSACTION_SWITCH_LAYOUT_V2 */';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.kas-entry-form { width: 100%; min-width: 0; display: flex !important; flex-direction: column !important; gap: 0.75rem; }\n.kas-entry-form > label { display: block !important; width: 100% !important; min-width: 0 !important; }\n.kas-entry-form input, .kas-entry-form select, .kas-entry-form textarea { width: 100% !important; max-width: 100% !important; min-width: 0 !important; box-sizing: border-box; }\n.kas-transaction-switch { width: 100% !important; min-width: 0 !important; display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; align-items: stretch; }\n.kas-transaction-switch button { width: 100% !important; min-width: 0 !important; max-width: 100% !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n@media (max-width: 767px) { .kas-entry-form { gap: 0.65rem; } .kas-transaction-switch { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; } .kas-transaction-switch button { min-height: 42px; font-size: 10px; } }\n`;
  fs.writeFileSync(cssPath, css, 'utf8');
}

fs.writeFileSync(componentPath, src, 'utf8');
console.log('[patch-kas-transaction-switch-layout] fixed transaction switch and forced clean vertical form layout');
