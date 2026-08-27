import React, { useEffect, useMemo, useState } from 'react';
import { Search, Trophy, ShieldCheck, Users, Filter, ChevronDown, Info, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

type Player = {
  id: number;
  source_sheet: string;
  source_no: number | null;
  player_name: string;
  club_name: string | null;
  seeded_quality: string | null;
  division_level: string | null;
  tournament_qualification: string | null;
  region_status: string | null;
  validity_status: string | null;
  archive_category: string | null;
  gender: string | null;
  eligible_category: string | null;
};

const SHEET_ORDER = [
  'PBSI - Seeded Utama & Sulsel',
  'Seeded Putra (B-, C+, C-)',
  'PBSI - Arsip Utama B & C',
  'Seeded Putri (Database PBSI)'
];

export default function SeededTurnamen() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('Semua');
  const [quality, setQuality] = useState('Semua');
  const [sheet, setSheet] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showArchive, setShowArchive] = useState(false);

  const loadPlayers = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: queryError } = await supabase
        .from('seeded_players')
        .select('id,source_sheet,source_no,player_name,club_name,seeded_quality,division_level,tournament_qualification,region_status,validity_status,archive_category,gender,eligible_category')
        .order('source_sheet', { ascending: true })
        .order('source_no', { ascending: true });
      if (queryError) throw queryError;
      setPlayers((data || []) as Player[]);
    } catch (err: any) {
      console.error('Seeded database load failed:', err);
      setError(err?.message || 'Data seeded belum dapat dimuat.');
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPlayers(); }, []);

  const qualities = useMemo(() => Array.from(new Set(players.map(p => p.seeded_quality).filter(Boolean))) as string[], [players]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return players.filter(p => {
      const haystack = [p.player_name, p.club_name, p.seeded_quality, p.source_sheet, p.region_status, p.eligible_category, p.archive_category].filter(Boolean).join(' ').toLowerCase();
      return (!q || haystack.includes(q)) &&
        (gender === 'Semua' || (p.gender || '') === gender) &&
        (quality === 'Semua' || (p.seeded_quality || '') === quality) &&
        (sheet === 'Semua' || p.source_sheet === sheet);
    });
  }, [players, query, gender, quality, sheet]);

  const summary = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of players) {
      const key = `${p.gender || 'Lainnya'} • ${p.seeded_quality || 'Tanpa kelas'}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [players]);

  return (
    <div className="min-h-full bg-[#050b17] text-white p-3 sm:p-5 md:p-8">
      <div className="mx-auto max-w-[1450px] space-y-5">
        <section className="relative overflow-hidden rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-[#07152d] via-[#0b1730] to-[#050914] p-5 sm:p-7 md:p-9 shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-300"><Trophy size={14} /> Seeded • Database Terhubung</div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-black italic uppercase tracking-tight">Seeded Resmi Bilibili 162</h1>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">Database seeded lengkap dari empat lembar sumber, tersimpan di Supabase dan siap digunakan sebagai referensi mapping, evaluasi pasangan, serta drawing.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <Stat label="Total seeded" value={players.length} icon={<Users size={17} />} />
              <Stat label="Kualitas" value={qualities.length} icon={<ShieldCheck size={17} />} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4 sm:p-5">
          <div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-amber-300" size={18} /><div className="text-xs sm:text-sm leading-relaxed text-slate-300"><b className="text-amber-200">Sumber data:</b> 1.103 baris seeded pemain dari PBSI - Seeded Utama & Sulsel, Seeded Putra (B-, C+, C-), PBSI - Arsip Utama B & C, dan Seeded Putri (Database PBSI). Data sumber dipertahankan melalui kolom <code>raw_data</code> pada database.</div></div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:p-5 shadow-xl">
          <div className="grid gap-2 md:grid-cols-[1fr_150px_150px_190px_auto]">
            <label className="relative block"><Search size={16} className="absolute left-3 top-3 text-slate-500" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, klub, kelas, wilayah..." className="w-full rounded-xl border border-white/10 bg-slate-950 px-10 py-2.5 text-xs outline-none focus:border-blue-500/50" /></label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none"><option>Semua</option><option>Putra</option><option>Putri</option></select>
            <select value={quality} onChange={e => setQuality(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none"><option>Semua</option>{qualities.map(x => <option key={x}>{x}</option>)}</select>
            <select value={sheet} onChange={e => setSheet(e.target.value)} className="rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs outline-none"><option>Semua sumber</option>{SHEET_ORDER.map(x => <option key={x}>{x}</option>)}</select>
            <button onClick={loadPlayers} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-blue-600 px-4 py-2.5 text-xs font-black hover:bg-blue-500"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          </div>
        </section>

        {error && <section className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-200">{error}</section>}

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 p-4 sm:p-5"><div><h2 className="font-black uppercase tracking-wider text-sm sm:text-base">Daftar Seeded Pemain</h2><p className="mt-1 text-[10px] text-slate-500">Menampilkan {filtered.length} dari {players.length} data.</p></div><Filter size={18} className="text-blue-400" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-white/[.03] text-[9px] uppercase tracking-widest text-slate-500"><tr><th className="p-3 sm:p-4">No</th><th>Nama</th><th>Klub / PB</th><th>Gender</th><th>Seeded</th><th>Sumber</th><th>Wilayah / Kategori</th></tr></thead>
          <tbody>{loading ? <tr><td colSpan={7} className="p-10 text-center text-xs text-slate-500">Memuat database seeded...</td></tr> : filtered.map((p, i) => <tr key={p.id} className="border-t border-white/5 hover:bg-white/[.025]"><td className="p-3 sm:p-4 font-mono text-xs text-slate-500">{p.source_no ?? i + 1}</td><td className="text-xs font-black text-white">{p.player_name}</td><td className="text-xs text-slate-300">{p.club_name || '-'}</td><td className="text-xs">{p.gender || '-'}</td><td><span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-300">{p.seeded_quality || '-'}</span></td><td className="max-w-[230px] text-[10px] text-slate-400">{p.source_sheet}</td><td className="text-[10px] text-slate-400">{p.region_status || p.eligible_category || p.archive_category || '-'}</td></tr>)}{!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-xs text-slate-500">Tidak ada data yang cocok.</td></tr>}</tbody></table></div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
          <button onClick={() => setShowArchive(v => !v)} className="flex w-full items-center justify-between p-4 sm:p-5 text-left"><div><h2 className="font-black uppercase tracking-wider text-sm">Ringkasan Kualitas Seeded</h2><p className="mt-1 text-[10px] text-slate-500">Rekap dihitung langsung dari database production.</p></div><ChevronDown size={18} className={`transition-transform ${showArchive ? 'rotate-180' : ''}`} /></button>
          {showArchive && <div className="grid gap-2 border-t border-white/10 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{summary.map(([key, count]) => <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] font-bold text-slate-400">{key}</div><div className="mt-1 text-xl font-black">{count}</div></div>)}</div>}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="min-w-[135px] rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center justify-between text-blue-300"><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>{icon}</div><p className="mt-1 text-xl font-black">{value}</p></div>;
}
