import React, { useMemo, useState } from 'react';
import { Search, Trophy, ShieldCheck, FileText, Users, Filter, ChevronDown, Info } from 'lucide-react';

const CURRENT_REFERENCE = [
  { gender: 'Putra', category: 'B-', total: 57, pages: '1–2' },
  { gender: 'Putra', category: 'C+', total: 218, pages: '2–6' },
  { gender: 'Putra', category: 'C-', total: 275, pages: '7–13' },
  { gender: 'Putri', category: 'A-', total: 10, pages: '14' },
  { gender: 'Putri', category: 'B+', total: 15, pages: '14–15' },
  { gender: 'Putri', category: 'B-', total: 28, pages: '14–15' },
  { gender: 'Putri', category: 'C+', total: 35, pages: '15–16' },
  { gender: 'Putri', category: 'C-', total: 88, pages: '16–18' },
];
const ARCHIVE = [
  { title: 'Daftar Seeded Khusus Putra — Ganda Perorangan Utama (A+)', pages: '19–20' },
  { title: 'Daftar Seeded Khusus Putra — Ganda Perorangan Utama (B)', pages: '21–22' },
  { title: 'Daftar Seeded Khusus Putra — Ganda Perorangan Utama (C)', pages: '23–28' },
  { title: 'Daftar Seeded Khusus Putra — Ganda Perorangan Utama (C-)', pages: '23–28' },
];

export default function SeededTurnamen() {
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('Semua');
  const [category, setCategory] = useState('Semua');
  const [showArchive, setShowArchive] = useState(false);
  const filtered = useMemo(() => CURRENT_REFERENCE.filter(row => {
    const q = query.trim().toLowerCase();
    return (!q || `${row.gender} ${row.category} ${row.pages}`.toLowerCase().includes(q)) && (gender === 'Semua' || row.gender === gender) && (category === 'Semua' || row.category === category);
  }), [query, gender, category]);
  const total = CURRENT_REFERENCE.reduce((sum, row) => sum + row.total, 0);
  return <div className="min-h-full bg-[#050b17] text-white p-3 sm:p-5 md:p-8"><div className="mx-auto max-w-[1450px] space-y-5">
    <section className="relative overflow-hidden rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-[#07152d] via-[#0b1730] to-[#050914] p-5 sm:p-7 md:p-9 shadow-2xl"><div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"/><div className="relative"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-300"><Trophy size={14}/> Seeded • Referensi PBSI</div><h1 className="mt-3 text-2xl sm:text-4xl font-black italic uppercase tracking-tight">Daftar Seeded Resmi</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Bilibili 162 Cup I Tahun 2026 — pusat informasi seeded yang ringkas, mudah dicari, dan profesional.</p></div><div className="grid grid-cols-2 gap-2 sm:gap-3"><Stat label="Data referensi 2026" value={total} icon={<Users size={17}/>}/><Stat label="Kategori" value={CURRENT_REFERENCE.length} icon={<ShieldCheck size={17}/>}/></div></div></div></section>
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4 sm:p-5"><div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-amber-300" size={18}/><div className="text-xs sm:text-sm leading-relaxed text-slate-300"><b className="text-amber-200">Catatan sumber:</b> file terlampir tidak berjudul sebagai seeded Bilibili 162 Cup I. Halaman 1–18 berjudul <b>“SEEDED KATEGORI PUTRA DAN PUTRI BAROKAH CUP 3 JULI 2026”</b>, sedangkan halaman 19–28 merupakan arsip <b>“DAFTAR SEEDED KEABSAHAN PBSI PAREPARE 25 JULI 2024”</b>. Data di bawah mempertahankan kategori dan jumlah dari sumber tersebut tanpa mengubahnya menjadi keputusan seeded resmi Bilibili.</div></div></section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5 shadow-xl"><div className="grid gap-2 md:grid-cols-[1fr_170px_170px]"><label className="relative block"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kategori atau halaman..." className="w-full rounded-xl border border-white/10 bg-slate-950 px-10 py-2.5 text-xs outline-none focus:border-blue-500/50"/></label><select value={gender} onChange={e=>setGender(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none"><option>Semua</option><option>Putra</option><option>Putri</option></select><select value={category} onChange={e=>setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none"><option>Semua</option>{Array.from(new Set(CURRENT_REFERENCE.map(x=>x.category))).map(x=><option key={x}>{x}</option>)}</select></div></section>
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl"><div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5"><div><h2 className="font-black uppercase tracking-wider text-sm sm:text-base">Rekap Seeded Referensi 2026</h2><p className="mt-1 text-[10px] text-slate-500">Jumlah mengikuti nomor terakhir pada masing-masing tabel di dokumen.</p></div><Filter size={18} className="text-blue-400"/></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-white/[.03] text-[9px] uppercase tracking-widest text-slate-500"><tr><th className="p-3 sm:p-4">No</th><th>Kelompok</th><th>Kategori</th><th>Jumlah</th><th>Halaman</th><th>Status Sumber</th></tr></thead><tbody>{filtered.map((row,i)=><tr key={`${row.gender}-${row.category}`} className="border-t border-white/5 hover:bg-white/[.025]"><td className="p-3 sm:p-4 font-mono text-xs text-slate-500">{i+1}</td><td className="text-xs font-bold">{row.gender}</td><td><span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-300">{row.category}</span></td><td className="text-sm font-black">{row.total}</td><td className="text-xs text-slate-400">{row.pages}</td><td><span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-300">Referensi dokumen</span></td></tr>)}{filtered.length===0&&<tr><td colSpan={6} className="p-10 text-center text-xs text-slate-500">Tidak ada kategori yang cocok.</td></tr>}</tbody></table></div></section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl"><button onClick={()=>setShowArchive(v=>!v)} className="flex w-full items-center justify-between p-4 sm:p-5 text-left"><div><h2 className="font-black uppercase tracking-wider text-sm">Arsip Seeded PBSI Parepare 2024</h2><p className="mt-1 text-[10px] text-slate-500">Halaman 19–28 pada file terlampir.</p></div><ChevronDown size={18} className={`transition-transform ${showArchive?'rotate-180':''}`}/></button>{showArchive&&<div className="grid gap-2 border-t border-white/10 p-4 sm:grid-cols-2 sm:p-5">{ARCHIVE.map(item=><div key={item.title} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="flex gap-3"><FileText size={17} className="mt-0.5 shrink-0 text-amber-300"/><div><p className="text-xs font-bold text-slate-200">{item.title}</p><p className="mt-1 text-[10px] text-slate-500">Halaman {item.pages}</p></div></div></div>)}</div>}</section>
  </div></div>;
}
function Stat({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="min-w-[135px] rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between text-blue-300"><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>{icon}</div><p className="mt-1 text-xl font-black">{value}</p></div>}
