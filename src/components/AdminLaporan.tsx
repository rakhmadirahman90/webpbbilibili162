import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, MapPin, Trophy, Users, Wallet, ArrowDownRight, ArrowUpRight,
  FileSpreadsheet, Printer, RefreshCw, Search, Medal, CircleDollarSign,
  Building2, CheckCircle2, Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase';

type Tab = 'ringkasan' | 'peserta' | 'juara' | 'keuangan';

type Tournament = {
  id: number;
  name: string;
  organizer: string;
  event_start: string;
  event_end: string;
  venue: string;
  registration_fee: string | number;
  match_system: string;
  status: string;
};

type Registration = {
  id: string;
  kode_pendaftaran: string;
  nama_pemain_1: string;
  nama_pemain_2: string;
  kategori: string;
  asal_pb: string | null;
  domisili: string | null;
  status_pendaftaran: string;
  status_pembayaran: string | null;
  created_at: string;
};

type FinanceRow = {
  id: number;
  source_name?: string;
  classification?: string;
  description?: string;
  category?: string;
  amount: number | string;
  received_at?: string;
  expense_date?: string;
  notes?: string | null;
};

const WINNERS = [
  {
    category: 'Ganda Putra CC Lokal Parepare',
    rows: [
      { rank: 'Juara I', pair: 'Tison & Kambo', club: 'PB Sari Indah', prize: 4000000 },
      { rank: 'Juara II', pair: 'Muslim & Sam', club: 'Rajawali 42', prize: 3000000 },
      { rank: 'Juara III Bersama', pair: 'Denis & Yusuf', club: 'PB Bilibili 162', prize: 1500000 },
      { rank: 'Juara III Bersama', pair: 'Ome & Ardi', club: 'Rajawali 42', prize: 1500000 }
    ]
  },
  {
    category: 'Ganda Putra AD/BC-/C+C Ajatappareng',
    rows: [
      { rank: 'Juara I', pair: 'Andi M Fahrul & Ichal Bin Tura', club: 'Ajatappareng', prize: 5000000 },
      { rank: 'Juara II', pair: 'Data juara II', club: 'Menunggu pembaruan data resmi', prize: 3000000 },
      { rank: 'Juara III Bersama', pair: 'Semifinalis 1', club: 'Menunggu pembaruan data resmi', prize: 1500000 },
      { rank: 'Juara III Bersama', pair: 'Semifinalis 2', club: 'Menunggu pembaruan data resmi', prize: 1500000 }
    ]
  }
];

const rupiah = (value: number | string) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));

const number = (value: number | string) =>
  new Intl.NumberFormat('id-ID').format(Number(value || 0));

const dateID = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value));
};

const shortDate = (value?: string) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

export default function AdminLaporan() {
  const [tab, setTab] = useState<Tab>('ringkasan');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Semua');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [income, setIncome] = useState<FinanceRow[]>([]);
  const [expense, setExpense] = useState<FinanceRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [t, r, i, e] = await Promise.all([
        supabase.from('seeded_tournaments').select('id,name,organizer,event_start,event_end,venue,registration_fee,match_system,status').eq('id', 2).single(),
        supabase.from('pendaftaran_turnamen').select('id,kode_pendaftaran,nama_pemain_1,nama_pemain_2,kategori,asal_pb,domisili,status_pendaftaran,status_pembayaran,created_at').eq('tournament_id', 2).eq('status_pendaftaran', 'Diterima').order('created_at', { ascending: true }),
        supabase.from('tournament_finance_income').select('id,source_name,classification,amount,received_at,notes').eq('tournament_id', 2).order('received_at', { ascending: true }),
        supabase.from('tournament_finance_expense').select('id,description,category,amount,expense_date,notes').eq('tournament_id', 2).order('expense_date', { ascending: true })
      ]);
      if (t.error) throw t.error;
      if (r.error) throw r.error;
      if (i.error) throw i.error;
      if (e.error) throw e.error;
      setTournament(t.data as Tournament);
      setRegistrations((r.data || []) as Registration[]);
      setIncome((i.data || []) as FinanceRow[]);
      setExpense((e.data || []) as FinanceRow[]);
    } catch (err: any) {
      console.error('AdminLaporan load error:', err);
      setError(err?.message || 'Data laporan gagal dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel('admin_laporan_tournament_cup1')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen', filter: 'tournament_id=eq.2' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_finance_income', filter: 'tournament_id=eq.2' }, () => load(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_finance_expense', filter: 'tournament_id=eq.2' }, () => load(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const categoryCounts = useMemo(() => {
    return registrations.reduce<Record<string, number>>((acc, row) => {
      acc[row.kategori] = (acc[row.kategori] || 0) + 1;
      return acc;
    }, {});
  }, [registrations]);

  const categories = useMemo(() => ['Semua', ...Object.keys(categoryCounts)], [categoryCounts]);

  const filteredRegistrations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registrations.filter(row => {
      const categoryOk = categoryFilter === 'Semua' || row.kategori === categoryFilter;
      const searchOk = !q || [row.nama_pemain_1, row.nama_pemain_2, row.kode_pendaftaran, row.asal_pb, row.domisili]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
      return categoryOk && searchOk;
    });
  }, [registrations, search, categoryFilter]);

  const totalIncome = useMemo(() => income.reduce((sum, row) => sum + Number(row.amount || 0), 0), [income]);
  const totalExpense = useMemo(() => expense.reduce((sum, row) => sum + Number(row.amount || 0), 0), [expense]);
  const balance = totalIncome - totalExpense;
  const sponsorIncome = useMemo(
    () => income.filter(row => /sponsor|donatur/i.test(row.classification || '')).reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [income]
  );
  const registrationIncome = useMemo(
    () => income.filter(row => /registrasi/i.test(row.source_name || '')).reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [income]
  );
  const prizeExpense = useMemo(
    () => expense.filter(row => /hadiah/i.test(row.description || '')).reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [expense]
  );

  const exportExcel = () => {
    if (!registrations.length) return;
    const wb = XLSX.utils.book_new();
    const summary = [
      ['LAPORAN & REKAP PB BILIBILI 162 CUP I TAHUN 2026'],
      ['Periode', '08–12 September 2026'],
      ['Lokasi', tournament?.venue || 'GOR Bulutangkis Titik Kumpul Soreang Kota Parepare'],
      ['Status', 'SELESAI'],
      [],
      ['INDIKATOR', 'NILAI'],
      ['Jumlah pasangan diterima', registrations.length],
      ['Jumlah slot atlet', registrations.length * 2],
      ['Total pemasukan', totalIncome],
      ['Total pengeluaran', totalExpense],
      ['Saldo akhir', balance],
      ['Sponsor & donatur', sponsorIncome],
      ['Pemasukan registrasi', registrationIncome],
      ['Hadiah pembinaan', prizeExpense]
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), 'Ringkasan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(registrations.map(r => ({
      Kode: r.kode_pendaftaran, Pemain_1: r.nama_pemain_1, Pemain_2: r.nama_pemain_2,
      Kategori: r.kategori, PB: r.asal_pb || '', Domisili: r.domisili || '',
      Status: r.status_pendaftaran, Pembayaran: r.status_pembayaran || '', Tanggal: r.created_at
    }))), 'Peserta');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(income), 'Pemasukan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expense), 'Pengeluaran');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(WINNERS.flatMap(g => g.rows.map(r => ({ Kategori: g.category, ...r })))), 'Juara');
    XLSX.writeFile(wb, 'Laporan_Rekap_BILIBILI_162_CUP_I_2026.xlsx');
  };

  const print = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d1a] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Memuat laporan CUP I...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d1a] text-white px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-8 print:bg-white print:text-black">
      <div className="max-w-[1500px] mx-auto space-y-4 sm:space-y-5">
        <header className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-blue-500/20 bg-gradient-to-br from-[#0d1b35] via-[#0b1224] to-[#07101f] p-4 sm:p-6 md:p-8 shadow-2xl print:border-black print:bg-white">
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">
                <CheckCircle2 size={13} /> Laporan Event Selesai
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl md:text-4xl font-black uppercase italic tracking-tight leading-none">
                BILIBILI 162 <span className="text-blue-500">CUP I</span>
              </h1>
              <p className="mt-2 text-[11px] sm:text-sm font-bold text-slate-300 uppercase tracking-wide">
                Laporan & Rekap Turnamen Tahun 2026
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-[9px] sm:text-[10px] font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-300">
                  <CalendarDays size={13} className="text-blue-400" /> 08–12 September 2026
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-slate-300">
                  <MapPin size={13} className="text-blue-400" /> GOR Titik Kumpul Soreang, Parepare
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => load(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-slate-200 hover:bg-white/10">
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={exportExcel} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-white hover:bg-emerald-500">
                <FileSpreadsheet size={14} /> Excel
              </button>
              <button onClick={print} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-[9px] font-black uppercase tracking-wider text-black hover:bg-slate-200">
                <Printer size={14} /> Cetak
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs font-bold text-red-300">
            {error}
          </div>
        )}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[
            { label: 'Pasangan Diterima', value: number(registrations.length), sub: '126 pasangan', icon: Users, cls: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { label: 'Slot Atlet', value: number(registrations.length * 2), sub: '2 atlet / pasangan', icon: Medal, cls: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
            { label: 'Pemasukan', value: rupiah(totalIncome), sub: 'Data kas event', icon: ArrowDownRight, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: 'Saldo Akhir', value: rupiah(balance), sub: 'Pemasukan − pengeluaran', icon: Wallet, cls: balance >= 0 ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20' }
          ].map((card) => (
            <div key={card.label} className={`rounded-2xl border p-3.5 sm:p-5 bg-[#0b1224] shadow-xl ${card.cls.split(' ').slice(-1)[0]}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400">{card.label}</p>
                <div className={`rounded-xl p-2 ${card.cls.split(' ').slice(0,2).join(' ')}`}><card.icon size={17} /></div>
              </div>
              <p className="mt-2 text-base sm:text-2xl font-black tracking-tight">{card.value}</p>
              <p className="mt-1 text-[8px] sm:text-[9px] text-slate-500">{card.sub}</p>
            </div>
          ))}
        </section>

        <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-[#0b1224] p-1.5 shadow-xl overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {([
              ['ringkasan', 'Ringkasan', Trophy],
              ['peserta', 'Peserta', Users],
              ['juara', 'Juara', Medal],
              ['keuangan', 'Keuangan', Wallet]
            ] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all ${tab === key ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'ringkasan' && (
          <div className="grid lg:grid-cols-3 gap-4">
            <section className="lg:col-span-2 rounded-3xl border border-white/10 bg-[#0b1224] p-4 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Informasi Event</p>
                  <h2 className="mt-1 text-lg sm:text-xl font-black uppercase italic">Identitas Turnamen</h2>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-black uppercase text-emerald-300">Selesai</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {[
                  ['Penyelenggara', tournament?.organizer || 'PB BILIBILI 162 PAREPARE'],
                  ['Tanggal', '08–12 September 2026'],
                  ['Tempat', tournament?.venue || 'GOR Bulutangkis Titik Kumpul Soreang Kota Parepare'],
                  ['Sistem Pertandingan', tournament?.match_system || 'Sistem Gugur (Knockout System)'],
                  ['Kategori', 'Ganda Putra AD/BC-/C+C Ajatappareng; Ganda Putra CC Lokal Parepare'],
                  ['Format', 'Best of 3 × 21 poin']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-black/20 p-3.5">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                    <p className="mt-1.5 text-[10px] sm:text-xs font-bold leading-relaxed text-slate-200">{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-[#0b1224] p-4 sm:p-6 shadow-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Komposisi Peserta</p>
              <h2 className="mt-1 text-lg font-black uppercase italic">126 Pasangan</h2>
              <div className="mt-5 space-y-3">
                {Object.entries(categoryCounts).map(([category, count]) => {
                  const pct = registrations.length ? Math.round((count / registrations.length) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between gap-3 text-[9px] font-black uppercase">
                        <span className="text-slate-300">{category}</span><span className="text-blue-400">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} /></div>
                      <p className="mt-1 text-[8px] text-slate-500">{pct}% dari peserta diterima</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5">
                <p className="text-[8px] font-black uppercase tracking-widest text-blue-300">Sumber</p>
                <p className="mt-1 text-[9px] leading-relaxed text-slate-400">Rekap dihitung langsung dari 126 pendaftaran turnamen berstatus Diterima pada tournament_id 2.</p>
              </div>
            </section>
          </div>
        )}

        {tab === 'peserta' && (
          <section className="rounded-3xl border border-white/10 bg-[#0b1224] shadow-xl overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-white/10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400">Daftar Resmi</p>
                  <h2 className="mt-1 text-lg sm:text-xl font-black uppercase italic">Peserta Diterima • {number(filteredRegistrations.length)}</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pemain / kode..." className="w-full sm:w-64 rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-[10px] text-white outline-none focus:border-blue-500" />
                  </div>
                  <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="rounded-xl border border-white/10 bg-[#07101f] px-3 py-2.5 text-[10px] font-bold text-slate-200 outline-none">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="bg-black/20 text-[8px] font-black uppercase tracking-widest text-slate-500">
                  <th className="px-5 py-4">No</th><th className="px-5 py-4">Kode</th><th className="px-5 py-4">Pasangan</th><th className="px-5 py-4">Kategori</th><th className="px-5 py-4">PB / Asal</th><th className="px-5 py-4">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRegistrations.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4 text-[10px] text-slate-500">{idx + 1}</td>
                      <td className="px-5 py-4 text-[9px] font-mono text-blue-300">{r.kode_pendaftaran}</td>
                      <td className="px-5 py-4"><p className="text-[11px] font-black uppercase">{r.nama_pemain_1} <span className="text-slate-600">&</span> {r.nama_pemain_2}</p><p className="text-[8px] text-slate-500 mt-1">{shortDate(r.created_at)}</p></td>
                      <td className="px-5 py-4 text-[9px] font-bold text-slate-300">{r.kategori}</td>
                      <td className="px-5 py-4 text-[9px] text-slate-400">{r.asal_pb || '-'}</td>
                      <td className="px-5 py-4"><span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[8px] font-black uppercase text-emerald-300">Diterima</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-3 space-y-2">
              {filteredRegistrations.map((r, idx) => (
                <div key={r.id} className="rounded-2xl border border-white/8 bg-black/15 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-[9px] font-black text-blue-300">{idx + 1}</span>
                      <div className="min-w-0"><p className="text-[10px] font-black uppercase leading-snug">{r.nama_pemain_1} & {r.nama_pemain_2}</p><p className="mt-1 text-[8px] font-mono text-slate-500">{r.kode_pendaftaran}</p></div>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 text-[7px] font-black uppercase text-emerald-300">Diterima</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[8px]">
                    <div className="rounded-xl bg-white/[0.03] p-2"><p className="text-slate-500 uppercase font-black">Kategori</p><p className="mt-1 text-slate-300 font-bold leading-snug">{r.kategori}</p></div>
                    <div className="rounded-xl bg-white/[0.03] p-2"><p className="text-slate-500 uppercase font-black">PB</p><p className="mt-1 text-slate-300 font-bold">{r.asal_pb || '-'}</p></div>
                  </div>
                </div>
              ))}
            </div>

            {!filteredRegistrations.length && (
              <div className="p-16 text-center text-slate-500"><Database className="mx-auto mb-3 opacity-30" /><p className="text-xs font-bold">Tidak ada peserta sesuai filter.</p></div>
            )}
          </section>
        )}

        {tab === 'juara' && (
          <div className="grid lg:grid-cols-2 gap-4">
            {WINNERS.map(group => (
              <section key={group.category} className="rounded-3xl border border-white/10 bg-[#0b1224] p-4 sm:p-6 shadow-xl">
                <div className="flex items-start gap-3 mb-5">
                  <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3"><Trophy className="text-amber-300" size={22} /></div>
                  <div><p className="text-[8px] font-black uppercase tracking-widest text-amber-300">Hasil Akhir</p><h2 className="mt-1 text-base sm:text-lg font-black uppercase italic">{group.category}</h2></div>
                </div>
                <div className="space-y-2">
                  {group.rows.map((row, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/5 bg-black/15 p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-300">{row.rank}</span>
                          <p className="mt-1 text-[11px] sm:text-xs font-black uppercase">{row.pair}</p>
                          <p className="mt-1 text-[9px] text-slate-500">{row.club}</p>
                        </div>
                        <span className="shrink-0 text-[9px] font-black text-emerald-300">{rupiah(row.prize)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-3 text-[8px] leading-relaxed text-slate-400">
                  Nama juara yang belum tersedia di basis data hasil resmi sengaja tidak diisi dengan tebakan.
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'keuangan' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {[
                ['Pemasukan', totalIncome, 'text-emerald-300', ArrowDownRight],
                ['Pengeluaran', totalExpense, 'text-red-300', ArrowUpRight],
                ['Saldo', balance, balance >= 0 ? 'text-cyan-300' : 'text-red-300', Wallet],
                ['Sponsor/Donatur', sponsorIncome, 'text-amber-300', Building2]
              ].map(([label, value, cls, Icon]) => (
                <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0b1224] p-4 shadow-xl">
                  <div className="flex items-center justify-between"><p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{label}</p><Icon size={16} className={String(cls)} /></div>
                  <p className={`mt-2 text-sm sm:text-lg font-black ${String(cls)}`}>{rupiah(Number(value))}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <section className="rounded-3xl border border-white/10 bg-[#0b1224] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10"><p className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Pemasukan</p><h3 className="mt-1 text-sm font-black uppercase">Rekap Dana Masuk</h3></div>
                <div className="max-h-[560px] overflow-auto divide-y divide-white/5">
                  {income.map(row => <div key={row.id} className="p-3.5"><div className="flex justify-between gap-3"><div><p className="text-[10px] font-black uppercase">{row.source_name}</p><p className="mt-1 text-[8px] text-slate-500">{row.classification || '-'} • {shortDate(row.received_at)}</p></div><p className="text-[10px] font-black text-emerald-300 whitespace-nowrap">{rupiah(row.amount)}</p></div></div>)}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-[#0b1224] overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/10"><p className="text-[9px] font-black uppercase tracking-widest text-red-300">Pengeluaran</p><h3 className="mt-1 text-sm font-black uppercase">Rekap Dana Keluar</h3></div>
                <div className="max-h-[560px] overflow-auto divide-y divide-white/5">
                  {expense.map(row => <div key={row.id} className="p-3.5"><div className="flex justify-between gap-3"><div><p className="text-[10px] font-black">{row.description}</p><p className="mt-1 text-[8px] text-slate-500">{row.category || '-'} • {shortDate(row.expense_date)}</p></div><p className="text-[10px] font-black text-red-300 whitespace-nowrap">{rupiah(row.amount)}</p></div></div>)}
                </div>
              </section>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 text-[9px] leading-relaxed text-slate-400">
              <strong className="text-blue-300">Rekonsiliasi:</strong> pemasukan {rupiah(totalIncome)} − pengeluaran {rupiah(totalExpense)} = saldo akhir {rupiah(balance)}. Nilai dihitung langsung dari tabel keuangan CUP I.
            </div>
          </div>
        )}

        <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 pb-3 text-[8px] uppercase tracking-widest text-slate-600 print:text-slate-500">
          <span>PB BILIBILI 162 • Dokumen Rekap Internal</span>
          <span>Data event: 08–12 September 2026 • Status: Selesai</span>
        </footer>
      </div>
    </div>
  );
}
