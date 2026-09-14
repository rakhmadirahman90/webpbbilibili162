import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useRealtimeSync } from '../utils/realtimeSync';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileText, Handshake, RefreshCw, ShieldCheck, Trophy, Tv, Users, WalletCards } from 'lucide-react';

type Tournament = { id: number; name: string; is_active: boolean; event_start?: string | null; event_end?: string | null; venue?: string | null };
type Registration = { id: string | number; tournament_id?: number | null; status_pendaftaran?: string | null; status_pembayaran?: string | null };

const clean = (v: unknown) => String(v ?? '').trim().toLowerCase();
const regStatus = (v?: string | null) => ['diterima', 'approved', 'terverifikasi', 'lolos'].includes(clean(v)) ? 'diterima' : ['ditolak', 'rejected'].includes(clean(v)) ? 'ditolak' : 'pending';
const payStatus = (v?: string | null) => clean(v).includes('terver') || clean(v).includes('lunas') || clean(v).includes('diterima') ? 'terverifikasi' : 'menunggu';
const dateId = (v?: string | null) => v ? new Date(`${v.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function AdminPusatTurnamen() {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tid, setTid] = useState<number | null>(null);
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: ts, error: te }, { data: rs, error: re }] = await Promise.all([
        supabase.from('seeded_tournaments').select('id,name,is_active,event_start,event_end,venue').order('is_active', { ascending: false }).order('event_start', { ascending: false }),
        supabase.from('pendaftaran_turnamen').select('id,tournament_id,status_pendaftaran,status_pembayaran').order('created_at', { ascending: false })
      ]);
      if (te) throw te;
      if (re) throw re;
      const list = (ts || []) as Tournament[];
      setTournaments(list);
      setTid(prev => prev && list.some(t => t.id === prev) ? prev : (list.find(t => t.is_active)?.id ?? list[0]?.id ?? null));
      setRows((rs || []) as Registration[]);
    } catch (e) {
      console.error('Tournament center load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useRealtimeSync({ tables: ['seeded_tournaments', 'pendaftaran_turnamen'], onUpdate: () => void load() });

  const selected = tournaments.find(t => t.id === tid) || null;
  const currentRows = useMemo(() => tid ? rows.filter(r => Number(r.tournament_id) === tid) : [], [rows, tid]);
  const stats = useMemo(() => ({
    total: currentRows.length,
    pending: currentRows.filter(r => regStatus(r.status_pendaftaran) === 'pending').length,
    accepted: currentRows.filter(r => regStatus(r.status_pendaftaran) === 'diterima').length,
    paid: currentRows.filter(r => payStatus(r.status_pembayaran) === 'terverifikasi').length,
  }), [currentRows]);

  const go = (path: string) => navigate(`/admin/${path}${tid ? `?tournamentId=${tid}` : ''}`);
  const actions = [
    { title: 'Atur Event', desc: 'Buat, edit, aktifkan, nonaktifkan, dan atur jadwal event.', path: 'kelola-turnamen', icon: CalendarDays },
    { title: 'Pendaftaran Peserta', desc: 'Pantau registrasi, verifikasi pembayaran, dan data pasangan.', path: 'pendaftaran-turnamen', icon: ClipboardList },
    { title: 'Seeded Peserta', desc: 'Kelola peserta seeded dan data unggulan event.', path: 'seeded-turnamen', icon: ShieldCheck },
    { title: 'Live Score Lapangan', desc: 'Pantau skor pertandingan secara realtime.', path: 'live-score', icon: Tv },
    { title: 'Hasil & Skor', desc: 'Kelola hasil pertandingan dan rekap skor event.', path: 'skor', icon: Trophy },
    { title: 'Keuangan Turnamen', desc: 'Pemasukan, pengeluaran, saldo, sponsor, dan pertanggungjawaban.', path: 'keuangan-turnamen', icon: WalletCards },
    { title: 'Sponsorship Event', desc: 'Kelola dukungan sponsor dan donatur event.', path: 'sponsorship', icon: Handshake },
    { title: 'Laporan & Rekap', desc: 'Buka laporan administrasi dan rekapitulasi terbaru.', path: 'laporan', icon: FileText },
  ];

  return <div className="min-h-full bg-slate-50 p-3 text-slate-900 sm:p-5 lg:p-8">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,.08)]">
        <div className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 p-5 text-white sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-amber-200"><Trophy size={14}/> Pusat Manajemen Turnamen</div>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">Satu Pusat untuk Setiap Event</h1>
              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">Kelola event berikut registrasi, peserta, seeded, pertandingan, keuangan, sponsorship, hingga pelaporan dari satu alur kerja. Data utama mengikuti database dan diperbarui realtime.</p>
            </div>
            <button onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black uppercase tracking-wide transition hover:bg-white/15 disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh Data</button>
          </div>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3"><Trophy size={18} className="shrink-0 text-amber-500"/><select value={tid ?? ''} onChange={e => setTid(Number(e.target.value) || null)} className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"><option value="">Pilih event turnamen...</option>{tournaments.map(t => <option key={t.id} value={t.id}>{t.is_active ? '● AKTIF — ' : ''}{t.name}</option>)}</select></div>
          {selected && <div className="text-right text-[10px] font-bold text-slate-500 sm:min-w-[230px]"><div>{dateId(selected.event_start)} — {dateId(selected.event_end)}</div><div className="truncate">{selected.venue || 'Lokasi belum diatur'}</div></div>}
        </div>
      </header>

      {selected ? <>
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Registrasi" value={stats.total} />
          <Stat label="Menunggu" value={stats.pending} />
          <Stat label="Diterima" value={stats.accepted} />
          <Stat label="Pembayaran OK" value={stats.paid} />
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">Workflow Event</p><h2 className="text-lg font-black sm:text-xl">Administrasi Turnamen</h2></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[9px] font-black uppercase text-emerald-700"><CheckCircle2 size={13}/> Live Database</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{actions.map(item => <button key={item.path} onClick={() => go(item.path)} className="group flex min-h-[128px] flex-col rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white hover:shadow-lg"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><item.icon size={19}/></span><ArrowRight size={16} className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-500"/></div><h3 className="mt-3 text-xs font-black uppercase tracking-wide text-slate-800">{item.title}</h3><p className="mt-1 text-[10px] leading-4 text-slate-500">{item.desc}</p></button>)}</div>
        </section>
      </> : <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center"><Trophy className="mx-auto text-amber-500" size={28}/><h2 className="mt-2 text-base font-black">Belum ada event turnamen</h2><p className="mt-1 text-xs text-slate-600">Buka Atur Event untuk membuat event berikutnya.</p><button onClick={() => go('kelola-turnamen')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase text-white hover:bg-blue-500">Atur Event <ArrowRight size={15}/></button></section>}
    </div>
  </div>;
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-900">{value}</p></div>; }
