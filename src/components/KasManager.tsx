import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { broadcastKasChange } from './KasRealtimeNotifier';
import RekapIuranSeptember from './RekapIuranSeptember';
import { Wallet, Plus, Search, FileText, Loader2, Filter, Trash2, Edit3, X, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const DAFTAR_PEMASUKAN = ['Iuran Bulanan Tetap (10k)', 'Pembayaran Iuran Binaan', 'Pembayaran Shuttlecock', 'Pendaftaran Atlet Baru', 'Sumbangan Sukarela'];
const DAFTAR_PENGELUARAN = ['Biaya Operasional Bulanan', 'Biaya Operasional Family Gathering', 'Biaya Perlengkapan', 'Biaya Turnamen', 'Lainnya'];
const todayKey = () => new Date().toISOString().slice(0, 10);
const formatRupiah = (value: number | string | null | undefined) => new Intl.NumberFormat('id-ID').format(Number(value || 0));
const parseRupiah = (value: string) => Number(value.replace(/[^0-9]/g, '') || 0);
const rupiah = (value: number) => `Rp ${formatRupiah(value)}`;

interface KasEntry {
  id: string; created_at: string; tanggal_transaksi: string; nama_pembayar: string; kategori: string;
  jumlah_bayar: number; jumlah_bola: number; tipe_anggota: string; jenis_transaksi: 'Masuk' | 'Keluar'; keterangan?: string | null;
}
const emptyForm = () => ({ nama_pembayar: '', kategori: DAFTAR_PEMASUKAN[0], jumlah_bayar: 0, jumlah_bola: 0, tipe_anggota: 'Anggota Tetap', jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar', tanggal_transaksi: todayKey(), keterangan: '' });

export default function KasManager() {
  const [kasData, setKasData] = useState<KasEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState(emptyForm);
  const pageSize = 15;

  const loadKas = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: false }).order('created_at', { ascending: false });
      if (error) throw error;
      const next = (data || []) as KasEntry[];
      setKasData(next);
      try { localStorage.setItem('cached_kas_pb', JSON.stringify(next)); } catch {}
    } catch (error: any) {
      console.error('[KasManager] load failed', error);
      Swal.fire({ icon: 'error', title: 'Gagal memuat data kas', text: error?.message || 'Periksa koneksi database.' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void loadKas();
    const channel = supabase.channel('kas-manager-live').on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, () => void loadKas()).subscribe();
    const onChanged = () => void loadKas();
    window.addEventListener('app_data_changed', onChanged);
    window.addEventListener('table_updated_kas_pb', onChanged);
    return () => { window.removeEventListener('app_data_changed', onChanged); window.removeEventListener('table_updated_kas_pb', onChanged); void supabase.removeChannel(channel); };
  }, [loadKas]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return kasData.filter(row => {
      const dateOk = (!startDate || row.tanggal_transaksi >= startDate) && (!endDate || row.tanggal_transaksi <= endDate);
      const text = [row.nama_pembayar, row.kategori, row.tipe_anggota, row.jenis_transaksi, row.keterangan].map(v => String(v || '')).join(' ').toLowerCase();
      return dateOk && (!q || text.includes(q));
    });
  }, [kasData, searchTerm, startDate, endDate]);
  useEffect(() => setCurrentPage(1), [searchTerm, startDate, endDate]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const stats = useMemo(() => {
    const masuk = filtered.filter(r => r.jenis_transaksi === 'Masuk').reduce((s, r) => s + Number(r.jumlah_bayar || 0), 0);
    const keluar = filtered.filter(r => r.jenis_transaksi === 'Keluar').reduce((s, r) => s + Number(r.jumlah_bayar || 0), 0);
    return { masuk, keluar, saldo: masuk - keluar, count: filtered.length };
  }, [filtered]);
  const resetForm = () => { setFormData(emptyForm()); setEditingId(null); };

  const saveKas = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.nama_pembayar.trim() || !formData.tanggal_transaksi || Number(formData.jumlah_bayar) <= 0) {
      await Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Nama, tanggal, dan nominal harus diisi.' }); return;
    }
    setSaving(true);
    try {
      const payload = { nama_pembayar: formData.nama_pembayar.trim(), kategori: formData.kategori, jumlah_bayar: Number(formData.jumlah_bayar), jumlah_bola: Number(formData.jumlah_bola || 0), tipe_anggota: formData.tipe_anggota, jenis_transaksi: formData.jenis_transaksi, tanggal_transaksi: formData.tanggal_transaksi, keterangan: formData.keterangan.trim() || null };
      const result = editingId ? await supabase.from('kas_pb').update(payload).eq('id', editingId).select().single() : await supabase.from('kas_pb').insert(payload).select().single();
      if (result.error) throw result.error;
      resetForm(); await loadKas(); try { broadcastKasChange(); } catch {}
      await Swal.fire({ icon: 'success', title: editingId ? 'Data kas diperbarui' : 'Data kas ditambahkan', timer: 1100, showConfirmButton: false });
    } catch (error: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan data kas', text: error?.message || 'Perubahan ditolak database.' }); }
    finally { setSaving(false); }
  };

  const editKas = (row: KasEntry) => {
    setEditingId(row.id); setFormData({ nama_pembayar: row.nama_pembayar || '', kategori: row.kategori || (row.jenis_transaksi === 'Masuk' ? DAFTAR_PEMASUKAN[0] : DAFTAR_PENGELUARAN[0]), jumlah_bayar: Number(row.jumlah_bayar || 0), jumlah_bola: Number(row.jumlah_bola || 0), tipe_anggota: row.tipe_anggota || 'Anggota Tetap', jenis_transaksi: row.jenis_transaksi, tanggal_transaksi: row.tanggal_transaksi, keterangan: row.keterangan || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const deleteKas = async (row: KasEntry) => {
    const confirm = await Swal.fire({ icon: 'warning', title: 'Hapus transaksi?', html: `<b>${row.nama_pembayar}</b><br>${rupiah(Number(row.jumlah_bayar))}<br><small>${row.tanggal_transaksi}</small>`, showCancelButton: true, confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
    if (!confirm.isConfirmed) return;
    try { const { error } = await supabase.from('kas_pb').delete().eq('id', row.id); if (error) throw error; await loadKas(); try { broadcastKasChange(); } catch {} Swal.fire({ icon: 'success', title: 'Transaksi dihapus', timer: 1000, showConfirmButton: false }); }
    catch (error: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error?.message || 'Perubahan ditolak database.' }); }
  };
  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' }); doc.setFontSize(16); doc.text('Laporan Kas PB Bilibili 162', 14, 15); doc.setFontSize(9); doc.text(`${startDate || 'Semua'} s/d ${endDate || 'Semua'}`, 14, 22);
    autoTable(doc, { startY: 28, head: [['Tanggal','Nama','Kategori','Jenis','Nominal','Bola','Keterangan']], body: filtered.map(r => [r.tanggal_transaksi,r.nama_pembayar,r.kategori,r.jenis_transaksi,rupiah(Number(r.jumlah_bayar)),String(r.jumlah_bola || 0),r.keterangan || '']), styles: { fontSize: 8 } });
    doc.save(`laporan-kas-${startDate || 'semua'}-${endDate || 'semua'}.pdf`);
  };
  const categories = formData.jenis_transaksi === 'Masuk' ? DAFTAR_PEMASUKAN : DAFTAR_PENGELUARAN;
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

  return (
    <div data-kas-manager="true" className="kas-manager-root w-full min-h-0 flex flex-col p-3 sm:p-5 md:p-8 space-y-4 md:space-y-6 overflow-visible select-none pb-28 md:pb-8">
      <RekapIuranSeptember />
      <section className="kas-manager-header rounded-3xl bg-gradient-to-r from-slate-950 via-[#0b1224] to-slate-900 p-4 sm:p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.18em] text-blue-300">PB Bilibili 162 • Administrasi</div><h1 className="mt-1 text-2xl font-black sm:text-3xl">Kelola Kas</h1><p className="mt-1 text-xs text-slate-300">Kelola seluruh transaksi tanpa menimpa data lama.</p></div><div className="kas-manager-actions flex flex-wrap gap-2"><button type="button" onClick={() => void loadKas()} className="kas-action-btn inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-black"><RefreshCw size={15}/> Muat Ulang</button><button type="button" onClick={exportPdf} className="kas-action-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black"><FileText size={15}/> PDF</button></div></div>
      </section>
      <section className="kas-stat-grid grid grid-cols-2 gap-3 md:grid-cols-4"><div className="kas-stat-card rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase text-slate-500">Transaksi</div><div className="mt-1 text-2xl font-black text-slate-900">{stats.count}</div></div><div className="kas-stat-card rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"><div className="text-[10px] font-black uppercase text-emerald-700">Total Masuk</div><div className="mt-1 text-lg font-black text-emerald-800">{rupiah(stats.masuk)}</div></div><div className="kas-stat-card rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm"><div className="text-[10px] font-black uppercase text-red-700">Total Keluar</div><div className="mt-1 text-lg font-black text-red-800">{rupiah(stats.keluar)}</div></div><div className="kas-stat-card rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm"><div className="text-[10px] font-black uppercase text-blue-700">Saldo</div><div className="mt-1 text-lg font-black text-blue-900">{rupiah(stats.saldo)}</div></div></section>
      <form onSubmit={saveKas} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">{editingId ? 'Edit Transaksi Kas' : 'Tambah Transaksi Kas'}</h2><p className="text-xs text-slate-500">Simpan baru = INSERT; edit = UPDATE berdasarkan ID transaksi.</p></div>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black"><X size={14}/> Batal</button>}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-bold text-slate-600">Tanggal<input className={inputClass+' mt-1'} type="date" value={formData.tanggal_transaksi} onChange={e=>setFormData(f=>({...f,tanggal_transaksi:e.target.value}))}/></label><label className="text-xs font-bold text-slate-600">Jenis<select className={inputClass+' mt-1'} value={formData.jenis_transaksi} onChange={e=>setFormData(f=>({...f,jenis_transaksi:e.target.value as 'Masuk'|'Keluar',kategori:e.target.value==='Masuk'?DAFTAR_PEMASUKAN[0]:DAFTAR_PENGELUARAN[0]}))}><option>Masuk</option><option>Keluar</option></select></label><label className="text-xs font-bold text-slate-600">Nama / Pembayar<input className={inputClass+' mt-1'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))} placeholder="Nama"/></label><label className="text-xs font-bold text-slate-600">Kategori<select className={inputClass+' mt-1'} value={formData.kategori} onChange={e=>setFormData(f=>({...f,kategori:e.target.value}))}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="text-xs font-bold text-slate-600">Nominal<input className={inputClass+' mt-1'} inputMode="numeric" value={formData.jumlah_bayar?formatRupiah(formData.jumlah_bayar):''} onChange={e=>setFormData(f=>({...f,jumlah_bayar:parseRupiah(e.target.value)}))} placeholder="10.000"/></label><label className="text-xs font-bold text-slate-600">Jumlah Bola<input className={inputClass+' mt-1'} type="number" min="0" value={formData.jumlah_bola} onChange={e=>setFormData(f=>({...f,jumlah_bola:Number(e.target.value||0)}))}/></label><label className="text-xs font-bold text-slate-600">Tipe Anggota<select className={inputClass+' mt-1'} value={formData.tipe_anggota} onChange={e=>setFormData(f=>({...f,tipe_anggota:e.target.value}))}><option>Anggota Tetap</option><option>Anggota Binaan</option><option>Umum</option></select></label><label className="text-xs font-bold text-slate-600">Keterangan<input className={inputClass+' mt-1'} value={formData.keterangan} onChange={e=>setFormData(f=>({...f,keterangan:e.target.value}))} placeholder="Keterangan transaksi"/></label></div><button disabled={saving} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-60 sm:w-auto">{saving?<Loader2 className="animate-spin" size={17}/>:editingId?<Edit3 size={17}/>:<Plus size={17}/>} {saving?'Menyimpan…':editingId?'Simpan Perubahan':'Simpan Transaksi'}</button></form>
      <section className="kas-date-filter rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row lg:items-end"><label className="flex-1 text-xs font-bold text-slate-600">Cari transaksi<input className={inputClass+' mt-1'} value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Nama, kategori, keterangan…"/></label><label className="text-xs font-bold text-slate-600">Dari<input className={inputClass+' mt-1'} type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><label className="text-xs font-bold text-slate-600">Sampai<input className={inputClass+' mt-1'} type="date" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label><button type="button" onClick={()=>{setStartDate('');setEndDate('');}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black"><Filter size={15}/> Semua Tanggal</button></div></section>
      <section className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div><h2 className="text-lg font-black text-slate-900">Riwayat Transaksi Kas</h2><p className="text-xs text-slate-500">{filtered.length} transaksi • sumber: <b>kas_pb</b></p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">Halaman {page}/{totalPages}</span></div>{loading?<div className="p-10 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Memuat data kas…</div>:visible.length===0?<div className="p-10 text-center text-sm text-slate-500">Tidak ada transaksi.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Tanggal</th><th className="p-3">Nama</th><th className="p-3">Kategori</th><th className="p-3">Jenis</th><th className="p-3">Nominal</th><th className="p-3">Bola</th><th className="p-3">Keterangan</th><th className="p-3 text-right">Aksi</th></tr></thead><tbody>{visible.map(row=><tr key={row.id} className="border-t border-slate-100"><td className="p-3 text-xs font-bold">{row.tanggal_transaksi}</td><td className="p-3 text-xs font-black">{row.nama_pembayar}</td><td className="p-3 text-xs">{row.kategori}</td><td className="p-3">{row.jenis_transaksi==='Masuk'?<span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700"><ArrowUpCircle size={13}/>Masuk</span>:<span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-700"><ArrowDownCircle size={13}/>Keluar</span>}</td><td className="p-3 text-xs font-black">{rupiah(Number(row.jumlah_bayar))}</td><td className="p-3 text-xs">{row.jumlah_bola||0}</td><td className="max-w-[280px] p-3 text-xs">{row.keterangan||'-'}</td><td className="p-3"><div className="flex justify-end gap-2"><button type="button" onClick={()=>editKas(row)} title="Edit" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><Edit3 size={15}/></button><button type="button" onClick={()=>void deleteKas(row)} title="Hapus" className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-700"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>}<div className="flex items-center justify-between border-t border-slate-200 p-4"><button type="button" disabled={page<=1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black disabled:opacity-40"><ChevronLeft size={15}/> Sebelumnya</button><span className="text-xs font-bold text-slate-500">{filtered.length?`${(page-1)*pageSize+1}-${Math.min(page*pageSize,filtered.length)}`:'0'} / {filtered.length}</span><button type="button" disabled={page>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">Berikutnya <ChevronRight size={15}/></button></div></section>
    </div>
  );
}
