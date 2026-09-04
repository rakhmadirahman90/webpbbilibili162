import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { broadcastKasChange } from './KasRealtimeNotifier';
import KasRealtimeNotifier from './KasRealtimeNotifier';
import RekapIuranSeptember from './RekapIuranSeptember';
import { Wallet, Plus, Search, FileText, Loader2, Filter, Trash2, Edit3, X, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, RefreshCw, Bell, Calendar, MessageCircle, TrendingUp, TrendingDown, CircleDollarSign } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAFTAR_PEMASUKAN = ['Iuran Bulanan Tetap (10k)', 'Pembayaran Iuran Binaan', 'Pembayaran Shuttlecock', 'Pendaftaran Atlet Baru', 'Sumbangan Sukarela'];
const DAFTAR_PENGELUARAN = ['Biaya Operasional Bulanan', 'Biaya Operasional Family Gathering', 'Biaya Perlengkapan', 'Biaya Turnamen', 'Lainnya'];
const MODAL_TETAP = 600000;
const todayKey = () => new Date().toISOString().slice(0, 10);
const localToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const formatRupiah = (value: number | string | null | undefined) => new Intl.NumberFormat('id-ID').format(Number(value || 0));
const parseRupiah = (value: string) => Number(value.replace(/[^0-9]/g, '') || 0);
const rupiah = (value: number) => `Rp ${formatRupiah(value)}`;
const terbilang = (nominal: number) => {
  if (!nominal || nominal <= 0) return '';
  const a = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  const f = (n: number): string => {
    if (n < 12) return a[n]; if (n < 20) return `${f(n - 10)} Belas`; if (n < 100) return `${f(Math.floor(n / 10))} Puluh ${f(n % 10)}`;
    if (n < 200) return `Seratus ${f(n - 100)}`; if (n < 1000) return `${f(Math.floor(n / 100))} Ratus ${f(n % 100)}`;
    if (n < 2000) return `Seribu ${f(n - 1000)}`; if (n < 1000000) return `${f(Math.floor(n / 1000))} Ribu ${f(n % 1000)}`;
    if (n < 1000000000) return `${f(Math.floor(n / 1000000))} Juta ${f(n % 1000000)}`; return '';
  };
  return `Terbilang: ${f(nominal).replace(/\s+/g, ' ').trim()} Rupiah`;
};

interface KasEntry { id: string; created_at: string; tanggal_transaksi: string; nama_pembayar: string; kategori: string; jumlah_bayar: number; jumlah_bola: number; tipe_anggota: string; jenis_transaksi: 'Masuk' | 'Keluar'; keterangan?: string | null; }
interface Atlet { id: string; player_name: string; }

const emptyForm = () => ({ nama_pembayar: '', kategori: DAFTAR_PEMASUKAN[0], jumlah_bayar: 10000, jumlah_bola: 0, tipe_anggota: 'Anggota Tetap', jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar', tanggal_transaksi: localToday(), keterangan: '' });

export default function KasManager() {
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [atlets, setAtlets] = useState<Atlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<'list' | 'form'>('list');
  const [startDate, setStartDate] = useState(() => `${localToday().slice(0, 8)}01`);
  const [endDate, setEndDate] = useState(localToday);
  const [formData, setFormData] = useState(emptyForm);
  const pageSize = 8;

  const loadKas = useCallback(async (resetPeriod = false) => {
    setLoading(true);
    try {
      const [kasRes, membersRes] = await Promise.all([
        supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('pendaftaran').select('id, nama, atlet_stats (player_name)').order('nama', { ascending: true })
      ]);
      if (kasRes.error) throw kasRes.error;
      const next = (kasRes.data || []) as KasEntry[];
      setKasData(next);
      try { localStorage.setItem('cached_kas_pb', JSON.stringify(next)); } catch {}
      if (membersRes.data) {
        const members = membersRes.data.map((item: any) => ({ id: item.id, player_name: item.nama || (Array.isArray(item.atlet_stats) ? item.atlet_stats[0]?.player_name : item.atlet_stats?.player_name) || 'Unknown' }));
        setAtlets(members); try { localStorage.setItem('cached_kas_atlets', JSON.stringify(members)); } catch {}
      }
      if (next.length && resetPeriod) {
        const latest = [...next].sort((a, b) => String(a.tanggal_transaksi).localeCompare(String(b.tanggal_transaksi))).at(-1)?.tanggal_transaksi || localToday();
        setStartDate(latest.slice(0, 8) === localToday().slice(0, 8) ? `${localToday().slice(0, 8)}01` : latest);
        setEndDate(localToday() >= latest ? localToday() : latest);
      }
    } catch (error: any) {
      console.error('[KasManager] load failed', error);
      try {
        const cached = JSON.parse(localStorage.getItem('cached_kas_pb') || '[]');
        if (Array.isArray(cached) && cached.length) setKasData(cached);
      } catch {}
      Swal.fire({ icon: 'error', title: 'Gagal memuat data kas', text: error?.message || 'Periksa koneksi database.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadKas(false);
    const channel = supabase.channel('kas-manager-live').on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, () => void loadKas(false)).subscribe();
    const onChanged = () => void loadKas(false);
    window.addEventListener('app_data_changed', onChanged);
    window.addEventListener('table_updated_kas_pb', onChanged);
    window.addEventListener('kas-updated', onChanged);
    return () => { window.removeEventListener('app_data_changed', onChanged); window.removeEventListener('table_updated_kas_pb', onChanged); window.removeEventListener('kas-updated', onChanged); void supabase.removeChannel(channel); };
  }, [loadKas]);

  const normalized = useMemo(() => kasData.map(item => ({ ...item, jenis_transaksi: DAFTAR_PEMASUKAN.includes(item.kategori) ? 'Masuk' as const : item.jenis_transaksi })), [kasData]);
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return normalized.filter(row => {
      const dateOk = (!startDate || row.tanggal_transaksi >= startDate) && (!endDate || row.tanggal_transaksi <= endDate);
      const text = [row.nama_pembayar, row.kategori, row.tipe_anggota, row.jenis_transaksi, row.keterangan].map(v => String(v || '')).join(' ').toLowerCase();
      return dateOk && (!q || text.includes(q));
    });
  }, [normalized, searchTerm, startDate, endDate]);
  useEffect(() => setCurrentPage(1), [searchTerm, startDate, endDate]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    const masuk = filtered.filter(r => r.jenis_transaksi === 'Masuk').reduce((s, r) => s + Number(r.jumlah_bayar || 0), 0);
    const keluar = filtered.filter(r => r.jenis_transaksi === 'Keluar').reduce((s, r) => s + Number(r.jumlah_bayar || 0), 0);
    const sebelumnya = normalized.filter(r => r.tanggal_transaksi < startDate).reduce((s, r) => s + (r.jenis_transaksi === 'Masuk' ? 1 : -1) * Number(r.jumlah_bayar || 0), 0);
    const akhir = sebelumnya + masuk - keluar;
    return { masuk, keluar, sebelumnya, akhir, bendahara: akhir - MODAL_TETAP, count: filtered.length };
  }, [filtered, normalized, startDate]);

  const latestIncome = useMemo(() => [...normalized].filter(r => r.jenis_transaksi === 'Masuk').sort((a, b) => String(b.created_at || b.tanggal_transaksi).localeCompare(String(a.created_at || a.tanggal_transaksi)))[0] || null, [normalized]);
  const latestExpense = useMemo(() => [...normalized].filter(r => r.jenis_transaksi === 'Keluar').sort((a, b) => String(b.created_at || b.tanggal_transaksi).localeCompare(String(a.created_at || a.tanggal_transaksi)))[0] || null, [normalized]);
  const latestDate = normalized.length ? [...normalized].sort((a, b) => String(a.tanggal_transaksi).localeCompare(String(b.tanggal_transaksi))).at(-1)?.tanggal_transaksi || localToday() : localToday();

  const resetForm = () => { setEditingId(null); setFormData(emptyForm()); setActiveMobileTab('list'); };
  const saveKas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pembayar.trim() || !formData.tanggal_transaksi || Number(formData.jumlah_bayar) <= 0) { await Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Nama, tanggal, dan nominal harus diisi.' }); return; }
    setSaving(true);
    try {
      const finalData = { ...formData, nama_pembayar: formData.nama_pembayar.trim(), jumlah_bayar: Number(formData.jumlah_bayar), jumlah_bola: Number(formData.jumlah_bola || 0), jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' as const : formData.jenis_transaksi, keterangan: formData.keterangan.trim() || null };
      if (editingId) {
        const { data, error } = await supabase.from('kas_pb').update(finalData).eq('id', editingId).select().single(); if (error) throw error;
        await broadcastKasChange('UPDATE', data || { id: editingId, ...finalData });
      } else {
        const { data, error } = await supabase.from('kas_pb').insert(finalData).select().single(); if (error) throw error;
        await broadcastKasChange('INSERT', data);
      }
      resetForm(); await loadKas(false);
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: editingId ? 'Data kas diperbarui' : 'Data kas berhasil disimpan', showConfirmButton: false, timer: 2200 });
    } catch (error: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan data', text: error?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' }); }
    finally { setSaving(false); }
  };

  const editKas = (row: KasEntry) => { setEditingId(row.id); setFormData({ nama_pembayar: row.nama_pembayar || '', kategori: row.kategori || DAFTAR_PEMASUKAN[0], jumlah_bayar: Number(row.jumlah_bayar || 0), jumlah_bola: Number(row.jumlah_bola || 0), tipe_anggota: row.tipe_anggota || 'Anggota Tetap', jenis_transaksi: row.jenis_transaksi, tanggal_transaksi: row.tanggal_transaksi, keterangan: row.keterangan || '' }); setActiveMobileTab('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const deleteKas = async (row: KasEntry) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Hapus transaksi?', html: `<b>${row.nama_pembayar || '-'}</b><br>${rupiah(Number(row.jumlah_bayar))}<br><small>${row.tanggal_transaksi}</small>`, showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!result.isConfirmed) return;
    try { const { data, error } = await supabase.from('kas_pb').delete().eq('id', row.id).select().single(); if (error) throw error; await broadcastKasChange('DELETE', data || row); await loadKas(false); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Transaksi berhasil dihapus', showConfirmButton: false, timer: 1800 }); }
    catch (error: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' }); }
  };

  const testNotification = async () => {
    const source = latestIncome || latestExpense;
    const mock = source ? { ...source, id: `test_${Date.now()}_${source.id}`, keterangan: source.keterangan || 'Simulasi notifikasi kas real-time' } : { id: `test_${Date.now()}`, nama_pembayar: 'Simulasi Kas PB Bilibili 162', kategori: 'Sumbangan Sukarela', jumlah_bayar: 150000, jumlah_bola: 0, tipe_anggota: 'Umum', jenis_transaksi: 'Masuk' as const, tanggal_transaksi: localToday(), keterangan: 'Simulasi notifikasi kas real-time', created_at: new Date().toISOString() };
    try { await broadcastKasChange('INSERT', mock); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Notifikasi test dikirim', showConfirmButton: false, timer: 2200 }); }
    catch (error: any) { Swal.fire({ icon: 'error', title: 'Gagal mengirim notifikasi test', text: error?.message || 'Coba lagi.' }); }
  };

  const exportPdf = async () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(30, 64, 175); doc.text('PB. BILI BILI 162', 14, 16);
      doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(20); doc.text('LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS', 148, 25, { align: 'center' });
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90); doc.text(`Periode: ${startDate || 'Semua'} s/d ${endDate || 'Semua'}`, 148, 31, { align: 'center' });
      autoTable(doc, { startY: 38, head: [['Tanggal', 'Nama', 'Jenis', 'Kategori', 'Bola', 'Nominal', 'Keterangan']], body: filtered.map(r => [r.tanggal_transaksi, r.nama_pembayar || '-', r.jenis_transaksi, r.kategori || '-', r.jumlah_bola || 0, rupiah(Number(r.jumlah_bayar)), r.keterangan || '-']), theme: 'striped', headStyles: { fillColor: [30, 64, 175], textColor: 255, fontSize: 8 }, bodyStyles: { fontSize: 7.5 }, margin: { bottom: 55 } });
      const y = Math.min(((doc as any).lastAutoTable?.finalY || 150) + 10, 220);
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(40); doc.text(`Saldo Sebelumnya: ${rupiah(stats.sebelumnya)}`, 150, y, { align: 'right' }); doc.text(`Total Pemasukan: ${rupiah(stats.masuk)}`, 150, y + 6, { align: 'right' }); doc.text(`Total Pengeluaran: ${rupiah(stats.keluar)}`, 150, y + 12, { align: 'right' }); doc.setTextColor(30, 64, 175); doc.text(`Saldo Akhir Kas: ${rupiah(stats.akhir)}`, 150, y + 19, { align: 'right' }); doc.setFont('helvetica', 'normal').setTextColor(70); doc.text(`Modal Tetap: ${rupiah(MODAL_TETAP)}`, 150, y + 26, { align: 'right' }); doc.text(`Kas Bendahara: ${rupiah(stats.bendahara)}`, 150, y + 32, { align: 'right' });
      const fileName = `LPJ_KAS_PB162_${startDate || 'semua'}_TO_${endDate || 'semua'}.pdf`; doc.save(fileName);
      const message = `*LAPORAN KAS PB BILIBILI 162*\n\nPeriode: *${startDate || 'Semua'} s/d ${endDate || 'Semua'}*\n• Saldo Sebelumnya: ${rupiah(stats.sebelumnya)}\n• Total Pemasukan: ${rupiah(stats.masuk)}\n• Total Pengeluaran: ${rupiah(stats.keluar)}\n• *Saldo Akhir Kas: ${rupiah(stats.akhir)}*\n  - Modal Tetap: ${rupiah(MODAL_TETAP)}\n  - Kas Bendahara: ${rupiah(stats.bendahara)}\n\nLaporan PDF sudah diunduh.\n\nAdmin PB Bilibili 162`;
      const { isConfirmed } = await Swal.fire({ title: '📱 Kirim Ringkasan Kas ke WhatsApp', html: `<div class="text-left text-xs space-y-3"><div class="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-bold">PDF berhasil dibuat. Anda dapat mengirim ringkasannya melalui WhatsApp.</div><textarea id="kas-wa-message" class="swal2-textarea !m-0 !w-full !text-xs !h-36 !rounded-xl">${message}</textarea></div>`, showCancelButton: true, confirmButtonText: '💬 Buka WhatsApp', cancelButtonText: 'Tutup', confirmButtonColor: '#25D366', focusConfirm: false, preConfirm: () => (document.getElementById('kas-wa-message') as HTMLTextAreaElement)?.value || message });
      if (isConfirmed) { const msg = (document.getElementById('kas-wa-message') as HTMLTextAreaElement)?.value || message; window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank'); }
    } catch (error: any) { console.error(error); Swal.fire({ icon: 'error', title: 'Gagal membuat PDF', text: error?.message || 'Terjadi kesalahan.' }); }
  };

  const setQuickPeriod = (mode: 'month' | 'latest' | 'all') => {
    if (mode === 'all') { setStartDate(''); setEndDate(''); return; }
    if (mode === 'latest') { setStartDate(latestDate); setEndDate(localToday() >= latestDate ? localToday() : latestDate); return; }
    setStartDate(`${localToday().slice(0, 8)}01`); setEndDate(localToday());
  };
  const categories = formData.jenis_transaksi === 'Masuk' ? DAFTAR_PEMASUKAN : DAFTAR_PENGELUARAN;
  const inputClass = 'w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 text-xs sm:text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div data-kas-manager="true" className="kas-manager-root w-full min-h-full flex flex-col p-3 sm:p-5 md:p-8 space-y-3 sm:space-y-4 md:space-y-6 overflow-y-auto select-none pb-28 md:pb-8">
      <KasRealtimeNotifier />
      <RekapIuranSeptember />

      <header className="relative overflow-hidden rounded-2xl md:rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 shadow-2xl">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400"><Wallet size={11}/> Treasury Master Hub</div>
            <h1 className="mt-1 text-base sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">Kelola <span className="text-blue-500">Kas Klub</span></h1>
            <p className="mt-0.5 text-[9px] sm:text-xs md:text-sm font-medium text-slate-400">PB. BILI BILI 162 FINANCIAL HUB • Informasi kas terintegrasi & real-time</p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <div className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-1.5 sm:w-52"><Search size={14} className="shrink-0 text-blue-400"/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Cari transaksi..." className="w-full bg-transparent text-[10px] sm:text-xs font-bold text-white outline-none placeholder:text-slate-600"/>{searchTerm&&<X size={13} onClick={()=>setSearchTerm('')} className="cursor-pointer text-slate-500"/>}</div>
            <button type="button" onClick={()=>void loadKas(false)} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs font-black text-white"><RefreshCw size={14}/> Muat Ulang</button>
            <button type="button" onClick={()=>void exportPdf()} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs font-black text-white"><FileText size={14}/> Export PDF</button>
            <button type="button" onClick={()=>void testNotification()} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-600 px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs font-black text-white"><Bell size={14} className="animate-pulse"/> Test Notifikasi</button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-4">
        <div className="rounded-2xl md:rounded-[2rem] border border-white/10 bg-slate-800/60 p-2.5 sm:p-5"><p className="mb-1 flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400"><Calendar size={12}/> Saldo Sebelumnya</p><h2 className="truncate text-xs sm:text-lg md:text-xl font-black italic text-slate-100">{rupiah(stats.sebelumnya)}</h2></div>
        <div className="rounded-2xl md:rounded-[2rem] border border-emerald-500/20 bg-emerald-500/10 p-2.5 sm:p-5"><p className="mb-1 flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-400"><TrendingUp size={12}/> Pemasukan</p><h2 className="truncate text-xs sm:text-lg md:text-xl font-black italic text-emerald-300">{rupiah(stats.masuk)}</h2></div>
        <div className="rounded-2xl md:rounded-[2rem] border border-red-500/20 bg-red-500/10 p-2.5 sm:p-5"><p className="mb-1 flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-red-400"><TrendingDown size={12}/> Pengeluaran</p><h2 className="truncate text-xs sm:text-lg md:text-xl font-black italic text-red-300">{rupiah(stats.keluar)}</h2></div>
        <div className="rounded-2xl md:rounded-[2rem] border border-blue-500/20 bg-blue-500/10 p-2.5 sm:p-5"><p className="mb-1 flex items-center gap-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-blue-400"><CircleDollarSign size={12}/> Saldo Akhir Kas</p><h2 className="truncate text-xs sm:text-lg md:text-xl font-black italic text-white">{rupiah(stats.akhir)}</h2><div className="mt-1 space-y-0.5 text-[9px] font-medium text-blue-300"><div>• Modal Tetap: {rupiah(MODAL_TETAP)}</div><div>• Bendahara: {rupiah(stats.bendahara)}</div></div></div>
      </div>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-emerald-500/20 bg-[#0b1224]/95 p-3 sm:p-4 shadow-xl"><div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-400"><ArrowUpCircle size={15}/> Pemasukan Terbaru</div><span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold text-emerald-300">REAL-TIME</span></div>{latestIncome?<div className="grid grid-cols-2 gap-2 text-[10px]"><div><span className="text-slate-500">Nama</span><p className="truncate font-black text-white">{latestIncome.nama_pembayar||'-'}</p></div><div><span className="text-slate-500">Nominal</span><p className="font-black text-emerald-400">{rupiah(Number(latestIncome.jumlah_bayar))}</p></div><div><span className="text-slate-500">Kategori</span><p className="truncate text-slate-300">{latestIncome.kategori}</p></div><div><span className="text-slate-500">Tanggal</span><p className="text-slate-300">{latestIncome.tanggal_transaksi}</p></div></div>:<p className="text-xs text-slate-500">Belum ada pemasukan.</p>}</div>
        <div className="rounded-2xl border border-red-500/20 bg-[#0b1224]/95 p-3 sm:p-4 shadow-xl"><div className="mb-2 flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-red-400"><ArrowDownCircle size={15}/> Pengeluaran Terbaru</div><span className="rounded-full bg-red-500/10 px-2 py-1 text-[8px] font-bold text-red-300">REAL-TIME</span></div>{latestExpense?<div className="grid grid-cols-2 gap-2 text-[10px]"><div><span className="text-slate-500">Nama/Penerima</span><p className="truncate font-black text-white">{latestExpense.nama_pembayar||'-'}</p></div><div><span className="text-slate-500">Nominal</span><p className="font-black text-red-400">{rupiah(Number(latestExpense.jumlah_bayar))}</p></div><div><span className="text-slate-500">Kategori</span><p className="truncate text-slate-300">{latestExpense.kategori}</p></div><div><span className="text-slate-500">Tanggal</span><p className="text-slate-300">{latestExpense.tanggal_transaksi}</p></div></div>:<p className="text-xs text-slate-500">Belum ada pengeluaran.</p>}</div>
      </section>

      <div className="flex md:hidden gap-1.5 rounded-2xl border border-white/10 bg-slate-900/90 p-1.5 shadow-xl"><button type="button" onClick={()=>setActiveMobileTab('list')} className={`flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider ${activeMobileTab==='list'?'bg-blue-600 text-white':'bg-black/40 text-slate-400'}`}>📋 Daftar ({kasData.length})</button><button type="button" onClick={()=>setActiveMobileTab('form')} className={`flex-1 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-wider ${activeMobileTab==='form'?'bg-blue-600 text-white':'bg-black/40 text-slate-400'}`}>{editingId?'✏️ Edit':'➕ Tambah Kas'}</button></div>

      <section className="rounded-2xl border border-white/10 bg-slate-900/90 p-3 sm:p-4 shadow-lg"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-300"><Calendar size={16} className="text-blue-400"/> Filter Periode Transaksi</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-bold text-slate-400">Dari:<input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-white outline-none"/></label><label className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/60 px-2.5 py-1.5 text-[9px] font-bold text-slate-400">Sampai:<input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="bg-transparent text-[10px] font-bold text-white outline-none"/></label><button type="button" onClick={()=>setQuickPeriod('month')} className="rounded-xl border border-blue-500/30 bg-blue-600/20 px-3 py-1.5 text-[9px] font-black uppercase text-blue-300">Bulan Ini</button><button type="button" onClick={()=>setQuickPeriod('latest')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase text-slate-300">Transaksi Terakhir</button><button type="button" onClick={()=>setQuickPeriod('all')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase text-slate-300">Semua</button></div></div></section>

      <div className="grid min-h-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-12 md:gap-6">
        <div className={`lg:col-span-4 ${activeMobileTab==='form'?'flex':'hidden md:flex'} min-h-0 flex-col`}>
          <div className="flex h-auto max-h-[85vh] min-h-0 flex-col overflow-y-auto rounded-2xl md:rounded-[2.5rem] border border-white/10 bg-[#0b1224]/95 p-3 sm:p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm sm:text-lg font-black italic uppercase tracking-tighter text-blue-400">{editingId?<Edit3 size={16}/>:<Plus size={16}/>} {editingId?'Edit Record':'Add Entry'}</h3>{editingId&&<button type="button" onClick={resetForm} className="rounded-lg border border-white/10 p-1.5 text-slate-400"><X size={15}/></button>}</div>
            <form onSubmit={saveKas} className="space-y-3">
              <div className="flex rounded-xl border border-white/10 bg-black p-1"><button type="button" onClick={()=>setFormData(f=>({...f,jenis_transaksi:'Masuk',kategori:DAFTAR_PEMASUKAN.includes(f.kategori)?f.kategori:DAFTAR_PEMASUKAN[0]}))} className={`flex-1 rounded-lg py-1.5 text-[9px] sm:text-[10px] font-black uppercase ${formData.jenis_transaksi==='Masuk'?'bg-emerald-600 text-white':'text-slate-500'}`}>Pemasukan</button><button type="button" onClick={()=>setFormData(f=>({...f,jenis_transaksi:'Keluar',kategori:DAFTAR_PENGELUARAN[0]}))} className={`flex-1 rounded-lg py-1.5 text-[9px] sm:text-[10px] font-black uppercase ${formData.jenis_transaksi==='Keluar'?'bg-red-600 text-white':'text-slate-500'}`}>Pengeluaran</button></div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Kategori{formData.jenis_transaksi==='Masuk'?<select className={inputClass+' mt-1'} value={formData.kategori} onChange={e=>{let nominal=10000;if(e.target.value==='Pendaftaran Atlet Baru')nominal=50000;if(e.target.value==='Pembayaran Iuran Binaan')nominal=25000;setFormData(f=>({...f,kategori:e.target.value,jumlah_bayar:nominal}))}}>{DAFTAR_PEMASUKAN.map(k=><option key={k}>{k}</option>)}</select>:<select className={inputClass+' mt-1'} value={formData.kategori} onChange={e=>setFormData(f=>({...f,kategori:e.target.value}))}>{DAFTAR_PENGELUARAN.map(k=><option key={k}>{k}</option>)}</select>}</label>
              {formData.kategori==='Pembayaran Shuttlecock'&&formData.jenis_transaksi==='Masuk'&&<div className="grid grid-cols-2 gap-3"><label className="text-[9px] font-bold uppercase text-slate-500">Tipe Member<select className={inputClass+' mt-1'} value={formData.tipe_anggota} onChange={e=>setFormData(f=>({...f,tipe_anggota:e.target.value}))}><option>Anggota Tetap</option><option>Anggota Tidak Tetap</option></select></label><label className="text-[9px] font-bold uppercase text-slate-500">Jumlah Bola<input className={inputClass+' mt-1 text-emerald-400'} type="number" min="0" value={formData.jumlah_bola||''} onChange={e=>setFormData(f=>({...f,jumlah_bola:Number(e.target.value)||0}))}/></label></div>}
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Tanggal<input type="date" required className={inputClass+' mt-1 p-3'} value={formData.tanggal_transaksi} onChange={e=>setFormData(f=>({...f,tanggal_transaksi:e.target.value}))}/></label>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Nama / Keterangan{formData.jenis_transaksi==='Masuk'?<select required className={inputClass+' mt-1 p-3'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))}><option value="">Pilih Atlet...</option>{atlets.map(a=><option key={a.id} value={a.player_name}>{a.player_name}</option>)}</select>:<input required className={inputClass+' mt-1 p-3'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))} placeholder="Nama Penerima"/>}</label>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Nominal (Rp)<div className="relative mt-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">Rp</span><input type="text" inputMode="numeric" className={inputClass+' pl-10 py-3 font-black text-blue-400'} value={formData.jumlah_bayar?formatRupiah(formData.jumlah_bayar):''} onChange={e=>setFormData(f=>({...f,jumlah_bayar:parseRupiah(e.target.value)}))}/></div>{formData.jumlah_bayar>0&&<div className="mt-1.5 rounded-lg border border-blue-900/30 bg-blue-950/40 px-3 py-1.5 text-[9px] font-bold italic text-blue-300">{terbilang(formData.jumlah_bayar)}</div>}<div className="mt-2 flex flex-wrap gap-1.5"><button type="button" onClick={()=>setFormData(f=>({...f,jumlah_bayar:10000}))} className="rounded-md border border-white/5 bg-white/5 px-2.5 py-1 text-[9px] font-black text-slate-300">Set 10k</button><button type="button" onClick={()=>setFormData(f=>({...f,jumlah_bayar:(f.jumlah_bayar||0)+10000}))} className="rounded-md border border-white/5 bg-white/5 px-2.5 py-1 text-[9px] font-black text-slate-300">+10k</button><button type="button" onClick={()=>setFormData(f=>({...f,jumlah_bayar:(f.jumlah_bayar||0)+50000}))} className="rounded-md border border-white/5 bg-white/5 px-2.5 py-1 text-[9px] font-black text-slate-300">+50k</button><button type="button" onClick={()=>setFormData(f=>({...f,jumlah_bayar:(f.jumlah_bayar||0)+100000}))} className="rounded-md border border-white/5 bg-white/5 px-2.5 py-1 text-[9px] font-black text-slate-300">+100k</button></div></label>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Tipe Anggota<select className={inputClass+' mt-1'} value={formData.tipe_anggota} onChange={e=>setFormData(f=>({...f,tipe_anggota:e.target.value}))}><option>Anggota Tetap</option><option>Anggota Binaan</option><option>Anggota Tidak Tetap</option><option>Umum</option></select></label>
              <label className="block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">Keterangan<input className={inputClass+' mt-1'} value={formData.keterangan} onChange={e=>setFormData(f=>({...f,keterangan:e.target.value}))} placeholder="Catatan transaksi"/></label>
              <button disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-900/20 disabled:opacity-50">{saving?<Loader2 size={17} className="animate-spin"/>:editingId?<Edit3 size={17}/>:<Plus size={17}/>} {saving?'Menyimpan...':editingId?'Simpan Perubahan':'Simpan Transaksi'}</button>
            </form>
          </div>
        </div>

        <div className={`lg:col-span-8 ${activeMobileTab==='list'?'block':'hidden md:block'} min-w-0`}>
          <div className="overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-white/10 bg-[#0b1224]/95 shadow-xl">
            <div className="flex flex-col gap-2 border-b border-white/10 p-3 sm:p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-white">Riwayat Transaksi Kas</h3><p className="mt-0.5 text-[9px] sm:text-xs text-slate-500">{filtered.length} transaksi pada periode aktif • sumber <b className="text-blue-400">kas_pb</b></p></div><span className="rounded-full bg-blue-500/10 px-3 py-1 text-[9px] font-black text-blue-300">Halaman {page}/{totalPages}</span></div>
            {loading?<div className="p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Memuat data kas...</div>:visible.length===0?<div className="p-12 text-center text-sm text-slate-500">Tidak ada transaksi pada periode/filter ini.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-black/30 text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Tanggal</th><th className="p-3">Nama</th><th className="p-3">Kategori</th><th className="p-3">Jenis</th><th className="p-3 text-right">Nominal</th><th className="p-3">Bola</th><th className="p-3">Keterangan</th><th className="p-3 text-right">Aksi</th></tr></thead><tbody>{visible.map(row=><tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.025]"><td className="p-3 text-[10px] font-bold text-slate-300">{row.tanggal_transaksi}</td><td className="p-3 text-[10px] font-black text-white">{row.nama_pembayar||'-'}</td><td className="p-3 text-[10px] text-slate-300">{row.kategori||'-'}</td><td className="p-3">{row.jenis_transaksi==='Masuk'?<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300"><ArrowUpCircle size={12}/>Masuk</span>:<span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-black text-red-300"><ArrowDownCircle size={12}/>Keluar</span>}</td><td className={`p-3 text-right text-[10px] font-black ${row.jenis_transaksi==='Masuk'?'text-emerald-300':'text-red-300'}`}>{rupiah(Number(row.jumlah_bayar))}</td><td className="p-3 text-[10px] text-slate-300">{row.jumlah_bola||0}</td><td className="max-w-[240px] p-3 text-[10px] text-slate-400">{row.keterangan||'-'}</td><td className="p-3"><div className="flex justify-end gap-1.5"><button type="button" onClick={()=>editKas(row)} title="Edit" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><Edit3 size={14}/></button><button type="button" onClick={()=>void deleteKas(row)} title="Hapus" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300"><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>}
            <div className="flex items-center justify-between border-t border-white/10 p-3 sm:p-4"><button type="button" disabled={page<=1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black text-slate-300 disabled:opacity-30"><ChevronLeft size={14}/> Sebelumnya</button><span className="text-[9px] font-bold text-slate-500">{filtered.length?`${(page-1)*pageSize+1}-${Math.min(page*pageSize,filtered.length)}`:'0'} / {filtered.length}</span><button type="button" disabled={page>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black text-slate-300 disabled:opacity-30">Berikutnya <ChevronRight size={14}/></button></div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/50 via-slate-900/90 to-slate-950 p-3 sm:p-5 shadow-xl"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300"><MessageCircle size={15}/> Ringkasan Informasi Kas</div><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Saldo akhir dihitung dari saldo sebelumnya + pemasukan periode − pengeluaran periode. Modal tetap pengelola bola dipisahkan dari kas bendahara.</p></div><div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] sm:text-[10px]"><div className="text-slate-500">Saldo Sebelumnya <b className="ml-1 text-slate-200">{rupiah(stats.sebelumnya)}</b></div><div className="text-slate-500">Pemasukan <b className="ml-1 text-emerald-300">{rupiah(stats.masuk)}</b></div><div className="text-slate-500">Pengeluaran <b className="ml-1 text-red-300">{rupiah(stats.keluar)}</b></div><div className="text-slate-500">Saldo Akhir <b className="ml-1 text-blue-300">{rupiah(stats.akhir)}</b></div><div className="text-slate-500">Modal Tetap <b className="ml-1 text-slate-200">{rupiah(MODAL_TETAP)}</b></div><div className="text-slate-500">Kas Bendahara <b className="ml-1 text-blue-300">{rupiah(stats.bendahara)}</b></div></div></div></section>
    </div>
  );
}
