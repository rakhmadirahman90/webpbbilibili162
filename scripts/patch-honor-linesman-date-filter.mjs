import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/AdminHonorLinesman.tsx');
let s = fs.readFileSync(file, 'utf8');
const marker = '/* HONOR_LINEsMAN_DATE_FILTER_V1 */';
if (s.includes(marker)) {
  console.log('Honor linesman date filter already applied.');
  process.exit(0);
}

const stateNeedle = "  const [search, setSearch] = useState('');\n";
if (!s.includes(stateNeedle)) throw new Error('Could not find search state anchor.');
s = s.replace(stateNeedle, `${stateNeedle}  const [dateFrom, setDateFrom] = useState('');\n  const [dateTo, setDateTo] = useState('');\n`);

const filteredNeedle = `  const filtered = useMemo(() => {\n    const q = search.trim().toLowerCase();\n    if (!q) return rows;\n    return rows.filter(r => [r.nama_linesman, r.pertandingan, r.lapangan, r.status_pembayaran, r.metode_pembayaran, r.keterangan].map(v => String(v || '')).join(' ').toLowerCase().includes(q));\n  }, [rows, search]);`;
const filteredReplacement = `  const filtered = useMemo(() => {\n    const q = search.trim().toLowerCase();\n    return rows.filter(r => {\n      const tanggal = String(r.tanggal_pertandingan || '').slice(0, 10);\n      const matchesSearch = !q || [r.nama_linesman, r.pertandingan, r.lapangan, r.status_pembayaran, r.metode_pembayaran, r.keterangan]\n        .map(v => String(v || '')).join(' ').toLowerCase().includes(q);\n      const matchesFrom = !dateFrom || tanggal >= dateFrom;\n      const matchesTo = !dateTo || tanggal <= dateTo;\n      return matchesSearch && matchesFrom && matchesTo;\n    });\n  }, [rows, search, dateFrom, dateTo]);`;
if (!s.includes(filteredNeedle)) throw new Error('Could not find filtered block.');
s = s.replace(filteredNeedle, filteredReplacement);

const statsNeedle = `  }), [rows]);\n\n  const openAdd`;
if (!s.includes(statsNeedle)) throw new Error('Could not find stats dependency anchor.');
s = s.replace(statsNeedle, `  }), [filtered]);\n\n  const openAdd`);

const toolbarNeedle = `<div className="p-3 sm:p-4 border-b border-white/10 flex flex-col md:flex-row gap-2 justify-between"><div className="relative flex-1 min-w-0"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama linesman, pertandingan, lapangan..." className="w-full rounded-xl border border-white/10 bg-[#070d1a] py-3 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-500"/></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 shrink-0"><RefreshCw size={15}/> Refresh</button></div>`;
const toolbarReplacement = `<div className="${marker} p-3 sm:p-4 border-b border-white/10 space-y-3">\n        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-2 items-end">\n          <label className="block min-w-0"><span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Tanggal Mulai</span><input type="date" value={dateFrom} max={dateTo || undefined} onChange={e => setDateFrom(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-3 text-xs text-white outline-none focus:border-blue-500" /></label>\n          <label className="block min-w-0"><span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Tanggal Sampai</span><input type="date" value={dateTo} min={dateFrom || undefined} onChange={e => setDateTo(e.target.value)} className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-3 text-xs text-white outline-none focus:border-blue-500" /></label>\n          <button type="button" onClick={() => { setDateFrom(''); setDateTo(''); }} disabled={!dateFrom && !dateTo} className="inline-flex items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase text-slate-300 disabled:cursor-not-allowed disabled:opacity-40">Reset Tanggal</button>\n        </div>\n        <div className="flex flex-col md:flex-row gap-2 justify-between">\n          <div className="relative flex-1 min-w-0"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama linesman, pertandingan, lapangan..." className="w-full rounded-xl border border-white/10 bg-[#070d1a] py-3 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-500"/></div>\n          <button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 shrink-0"><RefreshCw size={15}/> Refresh</button>\n        </div>\n      </div>`;
if (!s.includes(toolbarNeedle)) throw new Error('Could not find toolbar block.');
s = s.replace(toolbarNeedle, toolbarReplacement);

fs.writeFileSync(file, s);
console.log('Applied honor linesman date filter.');
