import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import './admin-laporan-iuran.css';

type StatusIuran = 'LUNAS' | 'BELUM BAYAR';

type Athlete = {
  id: string;
  name: string;
  category: string;
};

type Payment = {
  id: string;
  date: string;
  name: string;
  category: string;
  amount: number;
  type: string;
  note: string;
  createdAt: string;
};

type ReportRow = Athlete & {
  target: number;
  iuranBulanan: number;
  iuranBinaan: number;
  totalIuran: number;
  status: StatusIuran;
  lastPaymentDate: string;
  lastPaymentAmount: number;
  lastPaymentNote: string;
};

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const IURAN_BULANAN = 'Iuran Bulanan Tetap (10k)';
const IURAN_BINAAN = 'Pembayaran Iuran Binaan';
const TARGET_IURAN = 10000;

const normalizeName = (value: string | null | undefined) =>
  (value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const formatRupiah = (value: number) => `Rp ${Math.max(0, Number(value || 0)).toLocaleString('id-ID')}`;

const formatDate = (value: string) => {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getLocalDateString = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const monthKey = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

const parseMonthsFromNote = (note: string) => {
  const match = (note || '').match(/\[Bulan:\s*([^\]]+)\]/i);
  return match ? match[1].split(',').map(v => v.trim()).filter(Boolean) : [];
};

const paymentBelongsToMonth = (payment: Payment, selectedYear: number, selectedMonthIndex: number) => {
  const targetMonth = MONTHS_ID[selectedMonthIndex];
  const explicitMonths = parseMonthsFromNote(payment.note);
  if (explicitMonths.length > 0) {
    const normalizedTarget = targetMonth.toLowerCase();
    if (explicitMonths.some(m => m.toLowerCase() === normalizedTarget)) return true;
    return false;
  }
  return payment.date.startsWith(monthKey(selectedYear, selectedMonthIndex));
};

export default function AdminLaporanIuran() {
  const today = getLocalDateString();
  const todayDate = new Date(`${today}T00:00:00`);
  const [selectedYear, setSelectedYear] = useState(todayDate.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(todayDate.getMonth());
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'SEMUA' | StatusIuran>('SEMUA');
  const [categoryFilter, setCategoryFilter] = useState('SEMUA');
  const [page, setPage] = useState(1);
  const itemsPerPage = 12;

  const periodStart = monthKey(selectedYear, selectedMonthIndex);
  const periodEndDate = new Date(selectedYear, selectedMonthIndex + 1, 0);
  const periodEnd = monthKey(periodEndDate.getFullYear(), periodEndDate.getMonth());

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [rankingsRes, membersRes, kasRes] = await Promise.all([
        supabase.from('rankings').select('id, player_name, category').order('player_name', { ascending: true }),
        supabase.from('pendaftaran').select('id, nama, kategori_atlet, kategori').order('nama', { ascending: true }),
        supabase.from('kas_pb').select('id, tanggal_transaksi, nama_pembayar, kategori, jumlah_bayar, tipe_anggota, keterangan, created_at').order('tanggal_transaksi', { ascending: false }),
      ]);

      if (rankingsRes.error) throw rankingsRes.error;
      if (membersRes.error) throw membersRes.error;
      if (kasRes.error) throw kasRes.error;

      const byName = new Map<string, Athlete>();
      (membersRes.data || []).forEach((row: any) => {
        const name = row.nama || '';
        if (!name) return;
        byName.set(normalizeName(name), {
          id: row.id,
          name,
          category: row.kategori_atlet || row.kategori || 'SENIOR',
        });
      });
      (rankingsRes.data || []).forEach((row: any) => {
        const name = row.player_name || '';
        if (!name) return;
        const key = normalizeName(name);
        if (!byName.has(key)) {
          byName.set(key, {
            id: String(row.id),
            name,
            category: row.category || 'SENIOR',
          });
        }
      });

      const nextAthletes = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name, 'id'));
      const nextPayments: Payment[] = (kasRes.data || []).map((row: any) => ({
        id: row.id,
        date: row.tanggal_transaksi,
        name: row.nama_pembayar || '',
        category: row.kategori || '',
        amount: Number(row.jumlah_bayar || 0),
        type: row.tipe_anggota || 'Anggota Tetap',
        note: row.keterangan || '',
        createdAt: row.created_at || '',
      }));

      setAthletes(nextAthletes);
      setPayments(nextPayments);
    } catch (error: any) {
      console.error('Laporan iuran gagal dimuat:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memuat Laporan Iuran',
        text: error?.message || 'Terjadi kesalahan saat mengambil data.',
        confirmButtonColor: '#2563EB',
        background: '#0F172A',
        color: '#fff',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('laporan_iuran_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => loadData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, () => loadData(true))
      .subscribe();
    const handleKasUpdate = () => loadData(true);
    window.addEventListener('kas-updated', handleKasUpdate);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('kas-updated', handleKasUpdate);
    };
  }, []);

  const reportRows = useMemo<ReportRow[]>(() => {
    return athletes.map((athlete) => {
      const relevant = payments
        .filter((payment) => normalizeName(payment.name) === normalizeName(athlete.name))
        .filter((payment) => payment.category === IURAN_BULANAN || payment.category === IURAN_BINAAN)
        .filter((payment) => paymentBelongsToMonth(payment, selectedYear, selectedMonthIndex));

      const iuranBulanan = relevant
        .filter(payment => payment.category === IURAN_BULANAN)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const iuranBinaan = relevant
        .filter(payment => payment.category === IURAN_BINAAN)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const totalIuran = iuranBulanan + iuranBinaan;
      const latest = [...relevant].sort((a, b) => {
        const ta = new Date(a.createdAt || `${a.date}T00:00:00`).getTime();
        const tb = new Date(b.createdAt || `${b.date}T00:00:00`).getTime();
        return tb - ta;
      })[0];

      return {
        ...athlete,
        target: TARGET_IURAN,
        iuranBulanan,
        iuranBinaan,
        totalIuran,
        status: totalIuran >= TARGET_IURAN ? 'LUNAS' : 'BELUM BAYAR',
        lastPaymentDate: latest?.date || '',
        lastPaymentAmount: latest?.amount || 0,
        lastPaymentNote: latest?.note || '',
      };
    });
  }, [athletes, payments, selectedYear, selectedMonthIndex]);

  const categories = useMemo(() => {
    return ['SEMUA', ...Array.from(new Set(reportRows.map(row => row.category).filter(Boolean))).sort()];
  }, [reportRows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return reportRows.filter(row => {
      const matchSearch = !q || row.name.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'SEMUA' || row.status === statusFilter;
      const matchCategory = categoryFilter === 'SEMUA' || row.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [reportRows, searchTerm, statusFilter, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safePage = Math.min(page, totalPages);
  const currentRows = filteredRows.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage);

  useEffect(() => {
    setPage(1);
  }, [selectedYear, selectedMonthIndex, searchTerm, statusFilter, categoryFilter]);

  const summary = useMemo(() => {
    const lunas = reportRows.filter(row => row.status === 'LUNAS').length;
    const belum = reportRows.length - lunas;
    const totalTarget = reportRows.length * TARGET_IURAN;
    const totalPaid = reportRows.reduce((sum, row) => sum + row.totalIuran, 0);
    const progress = totalTarget > 0 ? Math.min(100, (totalPaid / totalTarget) * 100) : 0;
    return { totalAthletes: reportRows.length, lunas, belum, totalTarget, totalPaid, progress };
  }, [reportRows]);

  const todayPayments = useMemo(() => {
    return payments
      .filter(p => p.date === today && (p.category === IURAN_BULANAN || p.category === IURAN_BINAAN))
      .sort((a, b) => new Date(b.createdAt || `${b.date}T00:00:00`).getTime() - new Date(a.createdAt || `${a.date}T00:00:00`).getTime());
  }, [payments, today]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('SEMUA');
    setCategoryFilter('SEMUA');
  };

  const exportExcel = () => {
    const rows = filteredRows.map((row, index) => ({
      No: index + 1,
      'Nama Atlet': row.name.toUpperCase(),
      'Kategori': row.category,
      'Target Iuran': row.target,
      'Iuran Bulanan': row.iuranBulanan,
      'Iuran Binaan': row.iuranBinaan,
      'Total Dibayar': row.totalIuran,
      Status: row.status,
      'Pembayaran Terakhir': row.lastPaymentDate ? formatDate(row.lastPaymentDate) : '-',
      Keterangan: row.lastPaymentNote || '-',
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 6 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 35 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Iuran');
    XLSX.writeFile(workbook, `Laporan_Iuran_PB_Bilibili_162_${selectedYear}_${String(selectedMonthIndex + 1).padStart(2, '0')}.xlsx`);
  };

  const exportPDF = () => {
    if (filteredRows.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Data Kosong', text: 'Tidak ada data laporan untuk diekspor.', confirmButtonColor: '#2563EB' });
      return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const periodTitle = `${MONTHS_ID[selectedMonthIndex]} ${selectedYear}`;
    doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(15, 23, 42);
    doc.text('PB. BILIBILI 162', 14, 15);
    doc.setFontSize(11).setTextColor(30, 64, 175);
    doc.text(`LAPORAN PEMBAYARAN IURAN ATLET — ${periodTitle.toUpperCase()}`, 14, 23);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(90, 90, 90);
    doc.text(`Total Atlet: ${summary.totalAthletes} | Lunas: ${summary.lunas} | Belum Bayar: ${summary.belum} | Total Dibayar: ${formatRupiah(summary.totalPaid)}`, 14, 29);
    autoTable(doc, {
      startY: 35,
      head: [['No', 'Nama Atlet', 'Kategori', 'Target', 'Bulanan', 'Binaan', 'Total Bayar', 'Status', 'Bayar Terakhir', 'Keterangan']],
      body: filteredRows.map((row, index) => [
        index + 1,
        row.name.toUpperCase(),
        row.category,
        formatRupiah(row.target),
        formatRupiah(row.iuranBulanan),
        formatRupiah(row.iuranBinaan),
        formatRupiah(row.totalIuran),
        row.status,
        row.lastPaymentDate ? formatDate(row.lastPaymentDate) : '-',
        row.lastPaymentNote || '-',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 7.5, halign: 'center' },
      bodyStyles: { fontSize: 7.2, textColor: 45 },
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        1: { cellWidth: 43, fontStyle: 'bold' },
        2: { cellWidth: 24 },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 21, halign: 'right' },
        5: { cellWidth: 21, halign: 'right' },
        6: { cellWidth: 21, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        8: { cellWidth: 24, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 7) {
          data.cell.styles.textColor = data.cell.raw === 'LUNAS' ? [5, 150, 105] : [220, 38, 38];
        }
      },
      margin: { left: 14, right: 14, bottom: 16 },
    });
    const finalY = (doc as any).lastAutoTable?.finalY || 35;
    doc.setFontSize(7).setTextColor(120, 120, 120);
    doc.text(`Digenerate: ${new Date().toLocaleString('id-ID')}`, 14, Math.min(finalY + 8, 198));
    doc.save(`Laporan_Iuran_PB_Bilibili_162_${selectedYear}_${String(selectedMonthIndex + 1).padStart(2, '0')}.pdf`);
  };

  return (
    <div className="iuran-report-page">
      <section className="iuran-report-header">
        <div className="iuran-report-heading">
          <div className="iuran-report-eyebrow"><Wallet size={14} /> Administrasi & Keuangan</div>
          <h1>Laporan Pembayaran Iuran Atlet</h1>
          <p>Rekap lengkap pembayaran iuran seluruh atlet per bulan, tersusun realtime dan siap diekspor.</p>
        </div>
        <div className="iuran-report-actions">
          <button type="button" className="iuran-btn secondary" onClick={() => loadData(true)} disabled={refreshing}>
            {refreshing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            <span>Refresh</span>
          </button>
          <button type="button" className="iuran-btn success" onClick={exportExcel} disabled={!filteredRows.length}>
            <FileSpreadsheet size={16} /><span>Excel</span>
          </button>
          <button type="button" className="iuran-btn primary" onClick={exportPDF} disabled={!filteredRows.length}>
            <FileText size={16} /><span>PDF</span>
          </button>
        </div>
      </section>

      <section className="iuran-filter-card">
        <div className="iuran-filter-grid">
          <label>
            <span><CalendarDays size={14} /> Bulan</span>
            <select value={selectedMonthIndex} onChange={e => setSelectedMonthIndex(Number(e.target.value))}>
              {MONTHS_ID.map((month, index) => <option key={month} value={index}>{month}</option>)}
            </select>
          </label>
          <label>
            <span><CalendarDays size={14} /> Tahun</span>
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
              {Array.from({ length: 5 }, (_, i) => todayDate.getFullYear() - 2 + i).map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
          <label className="iuran-search-field">
            <span><Search size={14} /> Cari Atlet</span>
            <div className="iuran-input-wrap">
              <Search size={17} />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Nama atlet..." />
              {searchTerm && <button type="button" onClick={() => setSearchTerm('')} aria-label="Hapus pencarian"><X size={15} /></button>}
            </div>
          </label>
          <label>
            <span>Status</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="SEMUA">Semua Status</option>
              <option value="LUNAS">Lunas</option>
              <option value="BELUM BAYAR">Belum Bayar</option>
            </select>
          </label>
          <label>
            <span>Kategori Atlet</span>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              {categories.map(category => <option key={category} value={category}>{category === 'SEMUA' ? 'Semua Kategori' : category}</option>)}
            </select>
          </label>
          <button type="button" className="iuran-btn reset" onClick={handleClearFilters}>Reset Filter</button>
        </div>
      </section>

      <section className="iuran-summary-grid">
        <article className="iuran-stat-card blue"><div className="iuran-stat-icon"><Users /></div><div><span>Total Atlet</span><strong>{summary.totalAthletes}</strong><small>seluruh atlet terdata</small></div></article>
        <article className="iuran-stat-card green"><div className="iuran-stat-icon"><CheckCircle2 /></div><div><span>Lunas</span><strong>{summary.lunas}</strong><small>status iuran tercapai</small></div></article>
        <article className="iuran-stat-card red"><div className="iuran-stat-icon"><CircleAlert /></div><div><span>Belum Bayar</span><strong>{summary.belum}</strong><small>perlu ditindaklanjuti</small></div></article>
        <article className="iuran-stat-card purple"><div className="iuran-stat-icon"><Wallet /></div><div><span>Total Dibayar</span><strong>{formatRupiah(summary.totalPaid)}</strong><small>target {formatRupiah(summary.totalTarget)}</small></div></article>
      </section>

      <section className="iuran-progress-card">
        <div className="iuran-progress-top"><div><strong>Progress Pembayaran {MONTHS_ID[selectedMonthIndex]} {selectedYear}</strong><span>{summary.progress.toFixed(1)}% dari target iuran</span></div><b>{formatRupiah(summary.totalPaid)} / {formatRupiah(summary.totalTarget)}</b></div>
        <div className="iuran-progress-track"><div style={{ width: `${summary.progress}%` }} /></div>
      </section>

      <section className="iuran-today-card">
        <div className="iuran-section-title"><div><h2>Pembayaran Hari Ini</h2><p>{todayPayments.length ? `${todayPayments.length} transaksi iuran tercatat hari ini.` : 'Belum ada transaksi iuran hari ini.'}</p></div><span className="iuran-live-badge">Realtime</span></div>
        <div className="iuran-today-list">
          {todayPayments.length ? todayPayments.map(payment => (
            <div className="iuran-today-item" key={payment.id}>
              <div className="iuran-today-avatar">{payment.name.slice(0, 1).toUpperCase() || '?'}</div>
              <div className="iuran-today-main"><strong>{payment.name}</strong><span>{payment.category} • {payment.type}</span>{payment.note && <small>{payment.note}</small>}</div>
              <div className="iuran-today-amount"><strong>{formatRupiah(payment.amount)}</strong><span>{payment.createdAt ? new Date(payment.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span></div>
            </div>
          )) : <div className="iuran-empty-inline">Belum ada pembayaran iuran tercatat hari ini.</div>}
        </div>
      </section>

      <section className="iuran-table-card">
        <div className="iuran-table-head">
          <div><h2>Rekap Iuran Seluruh Atlet</h2><p>Menampilkan {currentRows.length} dari {filteredRows.length} atlet pada periode {MONTHS_ID[selectedMonthIndex]} {selectedYear}.</p></div>
          <div className="iuran-page-count">Halaman {safePage} / {totalPages}</div>
        </div>

        {loading ? (
          <div className="iuran-loading"><Loader2 size={28} className="spin" /><span>Memuat laporan pembayaran...</span></div>
        ) : currentRows.length === 0 ? (
          <div className="iuran-empty"><Users size={38} /><strong>Data tidak ditemukan</strong><span>Coba ubah pencarian atau filter laporan.</span></div>
        ) : (
          <>
            <div className="iuran-desktop-table-wrap">
              <table className="iuran-table">
                <thead><tr><th>No</th><th>Atlet</th><th>Kategori</th><th>Target</th><th>Iuran Bulanan</th><th>Iuran Binaan</th><th>Total Bayar</th><th>Status</th><th>Terakhir Bayar</th></tr></thead>
                <tbody>
                  {currentRows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{(safePage - 1) * itemsPerPage + index + 1}</td>
                      <td><div className="iuran-athlete-name">{row.name}</div></td>
                      <td><span className="iuran-category-chip">{row.category}</span></td>
                      <td>{formatRupiah(row.target)}</td>
                      <td>{formatRupiah(row.iuranBulanan)}</td>
                      <td>{formatRupiah(row.iuranBinaan)}</td>
                      <td><strong>{formatRupiah(row.totalIuran)}</strong></td>
                      <td><span className={`iuran-status ${row.status === 'LUNAS' ? 'paid' : 'unpaid'}`}>{row.status}</span></td>
                      <td><div className="iuran-last-payment">{row.lastPaymentDate ? formatDate(row.lastPaymentDate) : '-'}{row.lastPaymentNote && <small>{row.lastPaymentNote}</small>}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="iuran-mobile-list">
              {currentRows.map((row, index) => (
                <article className="iuran-mobile-item" key={row.id}>
                  <div className="iuran-mobile-top"><span className="iuran-mobile-no">#{(safePage - 1) * itemsPerPage + index + 1}</span><span className={`iuran-status ${row.status === 'LUNAS' ? 'paid' : 'unpaid'}`}>{row.status}</span></div>
                  <div className="iuran-mobile-athlete"><div className="iuran-athlete-avatar">{row.name.slice(0, 1).toUpperCase()}</div><div><strong>{row.name}</strong><span>{row.category}</span></div></div>
                  <div className="iuran-mobile-money"><div><span>Target</span><b>{formatRupiah(row.target)}</b></div><div><span>Bayar</span><b>{formatRupiah(row.totalIuran)}</b></div><div><span>Bulanan</span><b>{formatRupiah(row.iuranBulanan)}</b></div><div><span>Binaan</span><b>{formatRupiah(row.iuranBinaan)}</b></div></div>
                  <div className="iuran-mobile-last"><span>Pembayaran terakhir</span><strong>{row.lastPaymentDate ? formatDate(row.lastPaymentDate) : 'Belum ada'}</strong>{row.lastPaymentNote && <small>{row.lastPaymentNote}</small>}</div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="iuran-pagination">
          <button type="button" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}><ChevronLeft size={16} /> Sebelumnya</button>
          <span>{safePage} / {totalPages}</span>
          <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}>Berikutnya <ChevronRight size={16} /></button>
        </div>
      </section>

      <div className="iuran-report-footnote"><Download size={14} /> Data diambil langsung dari database klub dan diperbarui otomatis ketika transaksi iuran berubah.</div>
    </div>
  );
}
