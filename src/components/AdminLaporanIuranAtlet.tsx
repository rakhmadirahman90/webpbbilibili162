import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';

type Props = { isAdmin?: boolean; session?: any };

type Member = {
  id: string;
  nama: string;
  whatsapp: string;
  kategori: string;
  kategori_atlet: string;
};

type Transaction = {
  id: string;
  tanggal_transaksi: string;
  nama_pembayar: string;
  kategori: string;
  jumlah_bayar: number;
  jenis_transaksi: 'Masuk' | 'Keluar';
  keterangan?: string | null;
  jumlah_bola?: number | null;
};

type PlayerReport = Member & {
  paid: boolean;
  paidAmount: number;
  paidDate: string | null;
  monthlyCategory: string;
  monthlyTransactions: Transaction[];
  totalContributions: number;
};

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const PAYMENT_CATEGORIES = [
  'Iuran Bulanan Tetap (10k)',
  'Pembayaran Iuran Binaan',
];

const ACTIVE_STATUSES = ['aktif', 'verified', 'Diterima', 'diterima', 'active'];

const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value || 0);

const normalizeName = (value: string) => (value || '').trim().toLowerCase();

const parseMonthsFromNote = (note?: string | null) => {
  const match = (note || '').match(/\[Bulan:\s*([^\]]+)\]/i);
  return match ? match[1].split(',').map((item) => item.trim()).filter(Boolean) : [];
};

const monthFromDate = (date?: string | null) => {
  if (!date) return -1;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getMonth();
};

const yearFromDate = (date?: string | null) => {
  if (!date) return -1;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? -1 : parsed.getFullYear();
};

const formatDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

export default function AdminLaporanIuranAtlet({ isAdmin = true, session }: Props) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lunas' | 'belum'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PlayerReport | null>(null);
  const [loggedInMemberName, setLoggedInMemberName] = useState('');

  const monthIndex = MONTHS.indexOf(selectedMonth);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersRes, transactionsRes] = await Promise.all([
        supabase
          .from('pendaftaran')
          .select('id, nama, whatsapp, kategori, kategori_atlet, status')
          .in('status', ACTIVE_STATUSES)
          .order('nama', { ascending: true }),
        supabase
          .from('kas_pb')
          .select('id, tanggal_transaksi, nama_pembayar, kategori, jumlah_bayar, jenis_transaksi, keterangan, jumlah_bola')
          .order('tanggal_transaksi', { ascending: false }),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (transactionsRes.error) throw transactionsRes.error;

      setMembers((membersRes.data || []) as Member[]);
      setTransactions((transactionsRes.data || []) as Transaction[]);
    } catch (error: any) {
      console.error('Gagal memuat laporan iuran:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Data',
        text: error?.message || 'Data laporan tidak dapat dimuat.',
        background: '#0b1224',
        color: '#fff',
        confirmButtonColor: '#2563eb',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('laporan_iuran_atlet_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    try {
      const raw = localStorage.getItem('local_admin_session');
      const name = raw ? JSON.parse(raw)?.user?.user_metadata?.nama || '' : '';
      setLoggedInMemberName(name);
    } catch {
      setLoggedInMemberName('');
    }
  }, [isAdmin, session]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(members.map((member) => member.kategori_atlet).filter(Boolean))).sort(),
    [members]
  );

  const reports = useMemo<PlayerReport[]>(() => {
    return members.map((member) => {
      const memberTransactions = transactions.filter(
        (transaction) => normalizeName(transaction.nama_pembayar) === normalizeName(member.nama)
      );

      const monthlyTransactions = memberTransactions.filter((transaction) => {
        if (!PAYMENT_CATEGORIES.includes(transaction.kategori)) return false;
        const months = parseMonthsFromNote(transaction.keterangan);
        const taggedMonth = months.includes(selectedMonth);
        const datedMonth =
          monthFromDate(transaction.tanggal_transaksi) === monthIndex &&
          yearFromDate(transaction.tanggal_transaksi) === selectedYear;
        return taggedMonth || datedMonth;
      });

      const paidAmount = monthlyTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.jumlah_bayar || 0),
        0
      );

      const monthlyCategory = member.kategori_atlet?.toLowerCase().includes('binaan')
        ? 'Iuran Binaan'
        : 'Iuran Reguler';

      const totalContributions = memberTransactions
        .filter((transaction) => transaction.jenis_transaksi === 'Masuk' || PAYMENT_CATEGORIES.includes(transaction.kategori))
        .reduce((sum, transaction) => sum + Number(transaction.jumlah_bayar || 0), 0);

      const paidDate =
        monthlyTransactions.length > 0
          ? monthlyTransactions
              .map((transaction) => transaction.tanggal_transaksi)
              .sort()
              .at(-1) || null
          : null;

      return {
        ...member,
        paid: monthlyTransactions.length > 0,
        paidAmount,
        paidDate,
        monthlyCategory,
        monthlyTransactions,
        totalContributions,
      };
    });
  }, [members, transactions, selectedMonth, selectedYear, monthIndex]);

  const filteredReports = useMemo(() => {
    const loggedName = normalizeName(loggedInMemberName);
    return reports.filter((item) => {
      const matchesSearch = normalizeName(item.nama).includes(normalizeName(search));
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'lunas' ? item.paid : !item.paid);
      const matchesCategory = categoryFilter === 'all' || item.kategori_atlet === categoryFilter;
      const matchesRole = isAdmin || normalizeName(item.nama) === loggedName;
      return matchesSearch && matchesStatus && matchesCategory && matchesRole;
    });
  }, [reports, search, statusFilter, categoryFilter, isAdmin, loggedInMemberName]);

  const totalPlayers = filteredReports.length;
  const totalPaid = filteredReports.filter((item) => item.paid).length;
  const totalUnpaid = totalPlayers - totalPaid;
  const totalCollected = filteredReports.reduce((sum, item) => sum + item.paidAmount, 0);
  const collectionRate = totalPlayers ? Math.round((totalPaid / totalPlayers) * 100) : 0;

  const getYearOptions = () => {
    const years = new Set<number>([new Date().getFullYear(), 2025, 2026]);
    transactions.forEach((transaction) => {
      const year = yearFromDate(transaction.tanggal_transaksi);
      if (year > 0) years.add(year);
    });
    return Array.from(years).sort((a, b) => b - a);
  };

  const exportExcel = () => {
    if (!filteredReports.length) return;
    const rows = filteredReports.map((item, index) => ({
      No: index + 1,
      'Nama Atlet': item.nama,
      'Kategori Umur': item.kategori,
      'Kategori Atlet': item.kategori_atlet,
      'Periode': `${selectedMonth} ${selectedYear}`,
      Status: item.paid ? 'LUNAS' : 'BELUM BAYAR',
      'Nominal Iuran': item.paidAmount,
      'Tanggal Bayar': item.paidDate ? formatDate(item.paidDate) : '-',
      'Total Kontribusi': item.totalContributions,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet['!cols'] = [
      { wch: 5 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
      { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 20 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Laporan Iuran Atlet');
    XLSX.writeFile(workbook, `Laporan_Iuran_Atlet_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const exportPDF = () => {
    if (!filteredReports.length) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('PB BILIBILI 162 PAREPARE', 14, 15);
    doc.setFontSize(12);
    doc.text(`LAPORAN PEMBAYARAN IURAN ATLET — ${selectedMonth.toUpperCase()} ${selectedYear}`, 14, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Lunas: ${totalPaid} | Belum Bayar: ${totalUnpaid} | Total Terkumpul: Rp ${rupiah(totalCollected)}`, 14, 29);

    autoTable(doc, {
      startY: 34,
      head: [['No', 'Nama Atlet', 'Kategori', 'Iuran', 'Status', 'Nominal', 'Tanggal Bayar']],
      body: filteredReports.map((item, index) => [
        index + 1,
        item.nama,
        item.kategori_atlet || '-',
        item.monthlyCategory,
        item.paid ? 'LUNAS' : 'BELUM BAYAR',
        item.paid ? `Rp ${rupiah(item.paidAmount)}` : '-',
        item.paidDate ? formatDate(item.paidDate) : '-',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 55 } },
    });

    doc.save(`Laporan_Iuran_Atlet_${selectedMonth}_${selectedYear}.pdf`);
  };

  return (
    <div className="min-h-full w-full bg-[#07101f] p-3 sm:p-5 md:p-8 pb-24">
      <div className="mx-auto max-w-[1500px] space-y-4 md:space-y-5">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1830] via-[#0b1224] to-[#09101f] p-4 sm:p-6 shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">
                <Wallet size={13} /> Administrasi & Keuangan
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                Laporan Pembayaran Iuran Atlet
              </h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">
                Pantau status pembayaran setiap atlet per bulan dengan tampilan yang ringkas, jelas, dan nyaman dibuka dari HP maupun desktop.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={loadData} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:bg-white/10 disabled:opacity-50">
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              {isAdmin && (
                <>
                  <button type="button" onClick={exportExcel} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500">
                    <FileSpreadsheet size={14} /> Excel
                  </button>
                  <button type="button" onClick={exportPDF} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[10px] font-black uppercase tracking-wider text-white hover:bg-blue-500">
                    <FileText size={14} /> PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400"><Users size={14} /> Total Atlet</div>
            <p className="mt-2 text-2xl font-black text-white">{totalPlayers}</p>
            <p className="mt-1 text-[9px] font-bold text-slate-500">{selectedMonth} {selectedYear}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-emerald-400"><CheckCircle2 size={14} /> Sudah Bayar</div>
            <p className="mt-2 text-2xl font-black text-emerald-300">{totalPaid}</p>
            <p className="mt-1 text-[9px] font-bold text-emerald-400/70">{collectionRate}% dari daftar</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-red-400"><AlertCircle size={14} /> Belum Bayar</div>
            <p className="mt-2 text-2xl font-black text-red-300">{totalUnpaid}</p>
            <p className="mt-1 text-[9px] font-bold text-red-400/70">Perlu ditindaklanjuti</p>
          </div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-blue-400"><Wallet size={14} /> Total Terkumpul</div>
            <p className="mt-2 text-lg font-black text-blue-200 sm:text-2xl">Rp {rupiah(totalCollected)}</p>
            <p className="mt-1 text-[9px] font-bold text-blue-400/70">Iuran {selectedMonth}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0b1224]/95 p-3 sm:p-4 shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
            <Filter size={14} className="text-blue-400" /> Filter Laporan
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Bulan</span>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0a1528] px-3 text-sm font-bold text-white outline-none focus:border-blue-500">
                {MONTHS.map((month) => <option key={month} value={month}>{month}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Tahun</span>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="h-11 w-full rounded-xl border border-white/10 bg-[#0a1528] px-3 text-sm font-bold text-white outline-none focus:border-blue-500">
                {getYearOptions().map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Status Pembayaran</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0a1528] px-3 text-sm font-bold text-white outline-none focus:border-blue-500">
                <option value="all">Semua Status</option>
                <option value="lunas">Sudah Bayar</option>
                <option value="belum">Belum Bayar</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Kategori Atlet</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0a1528] px-3 text-sm font-bold text-white outline-none focus:border-blue-500">
                <option value="all">Semua Kategori</option>
                {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label className="block lg:col-span-1">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">Cari Atlet</span>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#0a1528] px-3 focus-within:border-blue-500">
                <Search size={16} className="shrink-0 text-blue-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama atlet..." className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600" />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian"><X size={14} className="text-slate-500" /></button>}
              </div>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[9px] font-bold text-slate-500">
            <CalendarDays size={13} className="text-blue-400" />
            Menampilkan <span className="text-slate-300">{filteredReports.length}</span> atlet untuk <span className="text-slate-300">{selectedMonth} {selectedYear}</span>.
            <button type="button" onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); setSearch(''); }} className="ml-auto rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-black uppercase tracking-wider text-slate-300 hover:bg-white/10">Reset Filter</button>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/95 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 bg-black/20 px-4 py-3 sm:px-5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-white">Data Pembayaran Per Atlet</h2>
              <p className="mt-1 text-[9px] font-bold text-slate-500">Status iuran ditampilkan langsung per pemain.</p>
            </div>
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[9px] font-black text-blue-300">{filteredReports.length} data</span>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Memuat laporan...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center px-5 text-center">
              <Search size={34} className="text-slate-600" />
              <p className="mt-3 text-xs font-black uppercase tracking-widest text-slate-400">Data tidak ditemukan</p>
              <p className="mt-1 text-[10px] text-slate-600">Coba ubah bulan, status, kategori, atau kata pencarian.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 p-3 md:hidden">
                {filteredReports.map((item, index) => (
                  <article key={item.id} className="rounded-2xl border border-white/10 bg-[#0d172a] p-3.5 shadow-lg">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-sm font-black text-blue-300 ring-1 ring-blue-400/20">
                        {(item.nama || '?').trim().slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-black uppercase text-white">{item.nama}</h3>
                            <p className="mt-0.5 truncate text-[9px] font-bold text-slate-500">{item.kategori_atlet || 'Kategori belum diisi'} • {item.kategori || '-'}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${item.paid ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                            {item.paid ? '✓ Lunas' : 'Belum Bayar'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-black/20 p-2.5">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Iuran {selectedMonth}</p>
                        <p className={`mt-1 text-sm font-black ${item.paid ? 'text-emerald-300' : 'text-slate-300'}`}>
                          {item.paid ? `Rp ${rupiah(item.paidAmount)}` : 'Rp 0'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/20 p-2.5">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Tanggal Bayar</p>
                        <p className="mt-1 text-xs font-black text-slate-200">{item.paidDate ? formatDate(item.paidDate) : '-'}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2.5">
                      <span className="text-[9px] font-bold text-slate-500">Total kontribusi: <b className="text-slate-300">Rp {rupiah(item.totalContributions)}</b></span>
                      <button type="button" onClick={() => setDetail(item)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-blue-600/15 px-3 text-[9px] font-black uppercase tracking-wider text-blue-300 ring-1 ring-blue-500/20 hover:bg-blue-600 hover:text-white">
                        <Eye size={13} /> Detail
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[920px] text-left">
                  <thead className="bg-black/20">
                    <tr className="border-b border-white/5">
                      {['No', 'Nama Atlet', 'Kategori', 'Iuran', 'Status', 'Nominal', 'Tanggal Bayar', 'Aksi'].map((heading) => (
                        <th key={heading} className="px-4 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredReports.map((item, index) => (
                      <tr key={item.id} className="transition-colors hover:bg-white/[0.025]">
                        <td className="px-4 py-3 text-xs font-bold text-slate-600">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="font-black uppercase text-sm text-white">{item.nama}</div>
                          <div className="mt-0.5 text-[9px] font-bold text-slate-600">{item.whatsapp || 'WhatsApp belum diisi'}</div>
                        </td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400">{item.kategori_atlet || '-'}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-300">{item.monthlyCategory}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-wider ${item.paid ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-red-400/20 bg-red-400/10 text-red-300'}`}>
                            {item.paid ? 'Lunas' : 'Belum Bayar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-black text-emerald-300">{item.paid ? `Rp ${rupiah(item.paidAmount)}` : '-'}</td>
                        <td className="px-4 py-3 text-[10px] font-bold text-slate-400">{item.paidDate ? formatDate(item.paidDate) : '-'}</td>
                        <td className="px-4 py-3">
                          <button type="button" onClick={() => setDetail(item)} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/15 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-blue-300 hover:bg-blue-600 hover:text-white">
                            <Eye size={12} /> Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {detail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b1224] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Detail Pembayaran Atlet</p>
                <h3 className="mt-1 truncate text-lg font-black uppercase text-white">{detail.nama}</h3>
                <p className="text-[10px] font-bold text-slate-500">{detail.kategori_atlet || '-'} • {detail.whatsapp || '-'}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Tutup detail"><X size={18} /></button>
            </div>

            <div className="max-h-[calc(92vh-78px)] space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                  <p className="text-[8px] font-black uppercase text-emerald-400">{selectedMonth} {selectedYear}</p>
                  <p className="mt-1 text-sm font-black text-white">{detail.paid ? 'LUNAS' : 'BELUM'}</p>
                </div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                  <p className="text-[8px] font-black uppercase text-blue-400">Nominal</p>
                  <p className="mt-1 text-sm font-black text-white">Rp {rupiah(detail.paidAmount)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[8px] font-black uppercase text-slate-500">Tanggal</p>
                  <p className="mt-1 text-[10px] font-black text-slate-200">{formatDate(detail.paidDate)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[8px] font-black uppercase text-slate-500">Total Kontribusi</p>
                  <p className="mt-1 text-[10px] font-black text-slate-200">Rp {rupiah(detail.totalContributions)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/15 p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">Status Iuran Tahun {selectedYear}</h4>
                    <p className="mt-0.5 text-[9px] font-bold text-slate-500">Ringkasan pembayaran per bulan.</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {MONTHS.map((month, idx) => {
                    const paidForMonth = transactions.some((transaction) => {
                      if (normalizeName(transaction.nama_pembayar) !== normalizeName(detail.nama)) return false;
                      if (!PAYMENT_CATEGORIES.includes(transaction.kategori)) return false;
                      const months = parseMonthsFromNote(transaction.keterangan);
                      return (
                        (months.includes(month) && yearFromDate(transaction.tanggal_transaksi) === selectedYear) ||
                        (!months.length && monthFromDate(transaction.tanggal_transaksi) === idx && yearFromDate(transaction.tanggal_transaksi) === selectedYear)
                      );
                    });
                    return (
                      <div key={month} className={`rounded-xl border p-2.5 text-center ${paidForMonth ? 'border-emerald-400/20 bg-emerald-400/10' : idx <= new Date().getMonth() ? 'border-red-400/20 bg-red-400/10' : 'border-white/5 bg-white/[0.02]'}`}>
                        <p className="text-[9px] font-black uppercase text-slate-300">{month.slice(0, 3)}</p>
                        <p className={`mt-1 text-[8px] font-black uppercase ${paidForMonth ? 'text-emerald-300' : idx <= new Date().getMonth() ? 'text-red-300' : 'text-slate-600'}`}>
                          {paidForMonth ? 'Lunas' : idx <= new Date().getMonth() ? 'Belum' : 'Mendatang'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/15 p-3.5">
                <h4 className="mb-3 text-xs font-black uppercase tracking-wider text-white">Riwayat Pembayaran Iuran</h4>
                <div className="space-y-2">
                  {transactions
                    .filter((transaction) => normalizeName(transaction.nama_pembayar) === normalizeName(detail.nama) && PAYMENT_CATEGORIES.includes(transaction.kategori))
                    .slice(0, 30)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                        <div className="min-w-0">
                          <p className="truncate text-[10px] font-black text-slate-200">{transaction.kategori}</p>
                          <p className="mt-0.5 text-[9px] font-bold text-slate-500">{formatDate(transaction.tanggal_transaksi)} {transaction.keterangan ? `• ${transaction.keterangan}` : ''}</p>
                        </div>
                        <p className="shrink-0 text-xs font-black text-emerald-300">Rp {rupiah(transaction.jumlah_bayar)}</p>
                      </div>
                    ))}
                  {!transactions.some((transaction) => normalizeName(transaction.nama_pembayar) === normalizeName(detail.nama) && PAYMENT_CATEGORIES.includes(transaction.kategori)) && (
                    <p className="py-6 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">Belum ada riwayat pembayaran.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
