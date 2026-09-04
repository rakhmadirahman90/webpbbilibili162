import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, RefreshCw, UsersRound } from 'lucide-react';

const IURAN_KEY = 'Iuran Bulanan Tetap';
const SEPTEMBER_START = '2026-09-01';
const SEPTEMBER_END = '2026-09-30';
const IURAN_MINIMUM = 10000;

type Payment = {
  id: string;
  tanggal_transaksi: string;
  created_at: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  tipe_anggota: string | null;
  jenis_transaksi: string;
  keterangan: string | null;
};

const money = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);

const localDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ').toUpperCase();
const isIuran = (row: Payment) => row.jenis_transaksi === 'Masuk' && row.kategori.toLowerCase().includes('iuran');

export default function RekapIuranSeptember() {
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const today = localDateKey();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kas_pb')
      .select('id,tanggal_transaksi,created_at,nama_pembayar,kategori,jumlah_bayar,tipe_anggota,jenis_transaksi,keterangan')
      .gte('tanggal_transaksi', SEPTEMBER_START)
      .lte('tanggal_transaksi', SEPTEMBER_END)
      .order('tanggal_transaksi', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRows((data as Payment[]).filter(isIuran));
      setUpdatedAt(new Date());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('kas-iuran-september-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const septemberTotal = useMemo(() => rows.reduce((sum, row) => sum + Number(row.jumlah_bayar || 0), 0), [rows]);
  const septemberPayers = useMemo(() => new Set(rows.map(row => normalizeName(row.nama_pembayar))).size, [rows]);
  const todayRows = useMemo(() => rows.filter(row => row.tanggal_transaksi === today), [rows, today]);
  const todayTotal = useMemo(() => todayRows.reduce((sum, row) => sum + Number(row.jumlah_bayar || 0), 0), [todayRows]);
  const groupedPayers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number; latest: string; note?: string | null }>();
    rows.forEach(row => {
      const key = normalizeName(row.nama_pembayar);
      const previous = map.get(key);
      const amount = Number(row.jumlah_bayar || 0);
      if (!previous) map.set(key, { name: key, total: amount, count: 1, latest: row.tanggal_transaksi, note: row.keterangan });
      else map.set(key, { ...previous, total: previous.total + amount, count: previous.count + 1, latest: previous.latest > row.tanggal_transaksi ? previous.latest : row.tanggal_transaksi, note: previous.note || row.keterangan });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
  }, [rows]);

  const todayLabel = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_55px_rgba(15,23,42,.08)] overflow-visible">
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 px-5 py-5 md:px-7 md:py-6 text-white">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-blue-200">
              <CalendarDays className="h-4 w-4" /> Rekap Iuran Peserta
            </div>
            <h2 className="mt-1 text-xl md:text-2xl font-black tracking-tight">September 2026</h2>
            <p className="mt-1 text-xs text-slate-300">Pembayaran iuran yang tercatat di kas PB Bilibili 162 • diperbarui otomatis.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[10px] font-black uppercase tracking-wider text-white disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat Ulang
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4 md:p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><UsersRound className="h-4 w-4" /> Pembayar</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{septemberPayers}</div>
          <div className="mt-1 text-[10px] text-slate-500">unik di September</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500"><CircleDollarSign className="h-4 w-4" /> Total iuran</div>
          <div className="mt-2 text-lg font-black text-emerald-600">{money(septemberTotal)}</div>
          <div className="mt-1 text-[10px] text-slate-500">penerimaan tercatat</div>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-700"><Clock3 className="h-4 w-4" /> Hari ini</div>
          <div className="mt-2 text-2xl font-black text-blue-900">{todayRows.length}</div>
          <div className="mt-1 text-[10px] text-blue-700">transaksi iuran</div>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Masuk hari ini</div>
          <div className="mt-2 text-lg font-black text-emerald-800">{money(todayTotal)}</div>
          <div className="mt-1 text-[10px] text-emerald-700">{todayLabel}</div>
        </div>
      </div>

      <div className="grid gap-5 px-4 pb-5 md:grid-cols-[1.05fr_.95fr] md:px-6 md:pb-6">
        <div className="rounded-2xl border border-slate-200 overflow-visible">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
            <div><h3 className="text-sm font-black text-slate-900">Pembayaran Hari Ini</h3><p className="text-[10px] text-slate-500">{todayLabel}</p></div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-700">{todayRows.length} TRANSAKSI</span>
          </div>
          <div className="overflow-visible">
            {loading && !todayRows.length ? <div className="p-6 text-center text-xs text-slate-500">Memuat data pembayaran…</div> : !todayRows.length ? <div className="p-6 text-center text-xs text-slate-500">Belum ada pembayaran iuran hari ini.</div> : todayRows.map(row => (
              <div key={row.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0">
                <div className="min-w-0"><div className="truncate text-xs font-black text-slate-900">{normalizeName(row.nama_pembayar)}</div><div className="mt-0.5 text-[10px] text-slate-500">{row.tipe_anggota || 'Anggota'}{row.keterangan ? ` • ${row.keterangan}` : ''}</div></div>
                <div className="shrink-0 text-right"><div className="text-xs font-black text-emerald-700">{money(Number(row.jumlah_bayar || 0))}</div><div className="mt-0.5 text-[9px] text-slate-400">{new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-visible">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3"><h3 className="text-sm font-black text-slate-900">Status Iuran September</h3><p className="text-[10px] text-slate-500">Nama yang sudah tercatat membayar.</p></div>
          <div className="overflow-visible">
            {groupedPayers.map(payer => {
              const paid = payer.total >= IURAN_MINIMUM;
              return <div key={payer.name} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"><div className="min-w-0"><div className="truncate text-xs font-black text-slate-900">{payer.name}</div><div className="mt-0.5 text-[9px] text-slate-400">Terakhir {new Date(`${payer.latest}T00:00:00`).toLocaleDateString('id-ID')}</div></div><div className="shrink-0 text-right"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black ${paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{paid ? 'LUNAS' : 'BELUM LENGKAP'}</span><div className="mt-1 text-[10px] font-bold text-slate-600">{money(payer.total)}</div></div></div>;
            })}
            {!loading && !groupedPayers.length && <div className="p-6 text-center text-xs text-slate-500">Belum ada data iuran September.</div>}
          </div>
        </div>
      </div>

      {updatedAt && <div className="border-t border-slate-100 px-4 py-3 text-[9px] font-medium text-slate-400 md:px-6">Sinkron terakhir: {updatedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • sumber: <strong>kas_pb</strong> • fokus kategori iuran.</div>}
    </section>
  );
}
