import React, { useEffect, useMemo, useState } from 'react';
import { Archive, ChevronDown, Copy, RefreshCw, Search, Trophy } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type ArchiveRow = {
  id: string; tournament_id: number | null; source_name: string; source_code: string | null; short_name: string | null;
  event_type: string | null; gender: string | null; age_group: string | null; skill_class: string | null;
  seeded_mode: string | null; allowed_seeded_levels: string[]; seeded_pair_rules: { level1: string; level2: string }[];
  max_entries: number | null; entry_fee: number | null; prize_pool: number | null; match_format: string | null;
  best_of: number | null; points_per_game: number | null; historical_entry_count: number; first_used_at: string | null; last_used_at: string | null;
  description: string | null; archive_note: string | null; snapshot: Record<string, unknown>;
};

type Tournament = { id: number; name: string; is_active: boolean };
const money = (v: unknown) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v || 0));
const dateId = (v: string | null) => v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function AdminArsipKategoriPertandingan() {
  const [rows, setRows] = useState<ArchiveRow[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [query, setQuery] = useState('');
  const [event, setEvent] = useState('Semua');
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: a, error: ae }, { data: t, error: te }] = await Promise.all([
        supabase.from('tournament_category_archives').select('*').order('historical_entry_count', { ascending: false }).order('source_name', { ascending: true }),
        supabase.from('seeded_tournaments').select('id,name,is_active').order('is_active', { ascending: false }).order('name', { ascending: true })
      ]);
      if (ae) throw ae; if (te) throw te;
      setRows((a || []).map((x: any) => ({ ...x, allowed_seeded_levels: Array.isArray(x.allowed_seeded_levels) ? x.allowed_seeded_levels : [], seeded_pair_rules: Array.isArray(x.seeded_pair_rules) ? x.seeded_pair_rules : [], snapshot: x.snapshot || {} })) as ArchiveRow[]);
      setTournaments((t || []) as Tournament[]);
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Arsip gagal dimuat', text: e?.message || 'Periksa koneksi database.' }); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const eventMap = useMemo(() => new Map(tournaments.map(t => [t.id, t.name])), [tournaments]);
  const events = useMemo(() => Array.from(new Set(rows.map(r => eventMap.get(r.tournament_id || 0) || 'Arsip historis'))).sort(), [rows, eventMap]);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('id-ID');
    return rows.filter(r => {
      const eventName = eventMap.get(r.tournament_id || 0) || 'Arsip historis';
      const hay = [r.source_name, r.source_code, r.short_name, r.event_type, r.gender, r.age_group, r.skill_class, eventName].join(' ').toLocaleLowerCase('id-ID');
      return (!q || hay.includes(q)) && (event === 'Semua' || eventName === event);
    });
  }, [rows, query, event, eventMap]);

  const copyReference = async (r: ArchiveRow) => {
    const text = [
      `Nama: ${r.source_name}`, `Kode: ${r.source_code || '-'}`, `Event: ${eventMap.get(r.tournament_id || 0) || 'Arsip historis'}`,
      `Jenis: ${r.event_type || '-'} • ${r.gender || '-'}`, `Usia: ${r.age_group || '-'} • Kelas: ${r.skill_class || '-'}`,
      `Seeded: ${r.seeded_mode || '-'} • Level: ${(r.allowed_seeded_levels || []).join(', ') || '-'}`,
      `Kombinasi: ${(r.seeded_pair_rules || []).map(x => `${x.level1}+${x.level2}`).join(', ') || '-'}`,
      `Kuota: ${r.max_entries ?? '-'} • Biaya: ${money(r.entry_fee)} • Format: ${r.match_format || '-'}`,
      `Best of: ${r.best_of ?? '-'} • Poin: ${r.points_per_game ?? '-'}`, `Riwayat pendaftaran: ${r.historical_entry_count}`,
      `Periode penggunaan: ${dateId(r.first_used_at)} — ${dateId(r.last_used_at)}`
    ].join('\n');
    try { await navigator.clipboard.writeText(text); Swal.fire({ icon: 'success', title: 'Referensi disalin', timer: 900, showConfirmButton: false }); }
    catch { Swal.fire({ icon: 'info', title: 'Salin manual', text }); }
  };

  return <div className="min-h-full bg-slate-50 p-3 sm:p-5 lg:p-8"><div className="mx-auto max-w-[1500px] space-y-5">
    <header className="rounded-[28px] bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-5 text-white shadow-xl sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-amber-200"><Archive size={14}/> Arsip Kategori Pertandingan</div><h1 className="mt-3 text-2xl font-black sm:text-4xl">Referensi Kategori Historis</h1><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">Kategori yang pernah digunakan disimpan sebagai arsip referensi. Data arsip tidak dipakai otomatis untuk event baru sehingga konfigurasi event aktif tetap aman.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black uppercase"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div></header>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3"><Stat label="Total Arsip" value={rows.length}/><Stat label="Pendaftaran Historis" value={rows.reduce((n,r) => n + Number(r.historical_entry_count || 0), 0)}/><Stat label="Kategori Ditampilkan" value={filtered.length}/></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_280px]"><label className="relative block"><Search size={16} className="absolute left-3 top-3.5 text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, kode, kelas, seeded..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-500"/></label><select value={event} onChange={e => setEvent(e.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold"><option>Semua</option>{events.map(x => <option key={x}>{x}</option>)}</select></div></section>
    <section className="space-y-3">{filtered.map(r => { const eventName = eventMap.get(r.tournament_id || 0) || 'Arsip historis'; const open = openId === r.id; return <article key={r.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><button onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-start gap-3 p-4 text-left sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><Trophy size={19}/></span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><span className="rounded-full bg-slate-900 px-2 py-1 text-[8px] font-black text-white">{r.source_code || 'ARSIP'}</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-black text-amber-700">{r.historical_entry_count} pendaftaran</span></span><span className="mt-2 block text-base font-black text-slate-900">{r.source_name}</span><span className="mt-1 block text-[10px] text-slate-500">{eventName} • {r.event_type || '-'} • {r.gender || '-'} • {r.skill_class || '-'}</span></span><ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}/></button>{open && <div className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Info label="Kelompok Usia" value={r.age_group || '-'}/><Info label="Kelas" value={r.skill_class || '-'}/><Info label="Seeded" value={r.seeded_mode || '-'}/><Info label="Level Seeded" value={(r.allowed_seeded_levels || []).join(', ') || '-'}/><Info label="Kuota" value={String(r.max_entries ?? '-')}/><Info label="Biaya" value={money(r.entry_fee)}/><Info label="Format" value={r.match_format || '-'}/><Info label="Skor" value={`Best of ${r.best_of ?? '-'} • ${r.points_per_game ?? '-'} poin`}/></div><div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-blue-700">Kombinasi seeded historis</p><div className="mt-2 flex flex-wrap gap-1.5">{(r.seeded_pair_rules || []).map((x,i) => <span key={i} className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-blue-900 shadow-sm">{x.level1} + {x.level2}</span>)}{r.seeded_pair_rules?.length === 0 && <span className="text-xs text-slate-500">Tidak ada aturan kombinasi tersimpan.</span>}</div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-400">Riwayat penggunaan</p><p className="mt-1 text-xs font-bold">{dateId(r.first_used_at)} — {dateId(r.last_used_at)}</p><p className="mt-1 text-[10px] text-slate-500">{r.historical_entry_count} pendaftaran historis</p></div><div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[9px] font-black uppercase text-slate-400">Catatan arsip</p><p className="mt-1 text-xs leading-5 text-slate-600">{r.description || r.archive_note || 'Tidak ada catatan tambahan.'}</p></div></div><button onClick={() => void copyReference(r)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black uppercase text-white"><Copy size={14}/> Salin sebagai referensi</button></div>}</article>; })}</section>
    {!loading && filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-400">Belum ada arsip yang sesuai pencarian.</div>}
  </div></div>;
}
function Stat({label,value}:{label:string;value:number}){return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-slate-200 bg-white p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-xs font-black text-slate-800">{value}</p></div>}
