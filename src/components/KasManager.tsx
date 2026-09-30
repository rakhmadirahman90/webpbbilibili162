import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { broadcastKasChange } from './KasRealtimeNotifier';
import KasRealtimeNotifier from './KasRealtimeNotifier';
import RekapIuranSeptember from './RekapIuranSeptember';
import { Wallet, Plus, Search, FileText, Loader2, Filter, Trash2, Paperclip, Image as ImageIcon, Edit3, X, ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, RefreshCw, Bell, Calendar, MessageCircle, TrendingUp, TrendingDown, CircleDollarSign } from 'lucide-react';
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

interface KasEntry { id: string; created_at: string; tanggal_transaksi: string; nama_pembayar: string; kategori: string; jumlah_bayar: number; jumlah_bola: number; tipe_anggota: string; jenis_transaksi: 'Masuk' | 'Keluar'; keterangan?: string | null; lampiran_url?: string | null; lampiran_nama?: string | null; lampiran_type?: string | null; lampiran_size?: number | null; updated_at?: string | null; }
interface Atlet { id: string; player_name: string; }
interface KasFormData { nama_pembayar: string; kategori: string; jumlah_bayar: number; jumlah_bola: number; tipe_anggota: string; jenis_transaksi: 'Masuk' | 'Keluar'; tanggal_transaksi: string; keterangan: string; lampiran_url: string; lampiran_nama: string; lampiran_type: string; lampiran_size: number | null; }

const emptyForm = () => ({ nama_pembayar: '', kategori: DAFTAR_PEMASUKAN[0], jumlah_bayar: 10000, jumlah_bola: 0, tipe_anggota: 'Anggota Tetap', jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar', tanggal_transaksi: localToday(), keterangan: '', lampiran_url: '', lampiran_nama: '', lampiran_type: '', lampiran_size: null });

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
  const [formData, setFormData] = useState<KasFormData>(emptyForm);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<KasEntry | null>(null);
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
  const transactionDateKey = (row: KasEntry) => String(row.tanggal_transaksi || '').slice(0, 10);
  const inSelectedTransactionPeriod = useCallback((row: KasEntry) => {
    const d = transactionDateKey(row);
    if (!d) return false;
    return (!startDate || d >= startDate) && (!endDate || d <= endDate);
  }, [startDate, endDate]);

  // Filter tanggal WAJIB berdasarkan tanggal_transaksi, bukan created_at/updated_at.
  // Waktu input/edit hanya metadata dan tidak boleh memindahkan transaksi ke periode lain.
  const periodTransactions = useMemo(() =>
    normalized
      .filter(inSelectedTransactionPeriod)
      .sort((a, b) => transactionDateKey(a).localeCompare(transactionDateKey(b)) || String(a.created_at || '').localeCompare(String(b.created_at || ''))),
    [normalized, inSelectedTransactionPeriod]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return periodTransactions.filter(row => {
      const text = [row.nama_pembayar, row.kategori, row.tipe_anggota, row.jenis_transaksi, row.keterangan].map(v => String(v || '')).join(' ').toLowerCase();
      return !q || text.includes(q);
    });
  }, [periodTransactions, searchTerm]);
  useEffect(() => setCurrentPage(1), [searchTerm, startDate, endDate]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(currentPage, totalPages);
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    // Single source of truth: every calculation is rebuilt from the current
    // kas_pb rows returned by Supabase. Filters affect the period report only;
    // they must never be mixed with the opening/current balance calculation.
    const allRows = normalized;
    const periodRows = periodTransactions;

    const sum = (rows: KasEntry[]) => rows.reduce(
      (total, row) => total + (row.jenis_transaksi === 'Masuk' ? 1 : -1) * Number(row.jumlah_bayar || 0),
      0
    );

    const masuk = periodRows
      .filter(r => r.jenis_transaksi === 'Masuk')
      .reduce((s, r) => s + Number(r.jumlah_bayar || 0), 0);
    const keluar = periodRows
      .filter(r => r.jenis_transaksi === 'Keluar')
      .reduce((s, r) => s + Number(r.jumlah_bayar || 0), 0);

    // Opening balance = all transactions strictly before the selected period.
    const sebelumnya = startDate
      ? sum(allRows.filter(r => String(r.tanggal_transaksi || '').slice(0, 10) < startDate))
      : 0;

    // Period ending balance is opening + net movement inside the selected period.
    const akhirPeriode = sebelumnya + masuk - keluar;

    // Current/last balance ALWAYS uses every current row in kas_pb, regardless
    // of pagination or date filter. Editing/deleting any row therefore changes
    // this value immediately after Supabase is reloaded.
    const saldoTerakhir = sum(allRows);

    return {
      masuk,
      keluar,
      sebelumnya,
      akhir: akhirPeriode,
      saldoTerakhir,
      bendahara: saldoTerakhir - MODAL_TETAP,
      bendaharaPeriode: akhirPeriode - MODAL_TETAP,
      count: periodRows.length
    };
  }, [normalized, periodTransactions, startDate, endDate]);

  // Notifikasi mengikuti data yang sedang tampil pada filter periode terbaru.
  // Urutan utama = tanggal_transaksi, lalu waktu update/input sebagai tie-breaker.
  const notificationRows = useMemo(() => [...periodTransactions].sort((a, b) =>
    transactionDateKey(b).localeCompare(transactionDateKey(a)) ||
    String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || ''))
  ), [periodTransactions]);
  const latestIncome = useMemo(() => notificationRows.find(r => r.jenis_transaksi === 'Masuk') || null, [notificationRows]);
  const latestExpense = useMemo(() => notificationRows.find(r => r.jenis_transaksi === 'Keluar') || null, [notificationRows]);
  const latestFilteredTransaction = notificationRows[0] || null;
  const latestDate = latestFilteredTransaction?.tanggal_transaksi || endDate || startDate || localToday();

  const resetForm = () => { setEditingId(null); setFormData(emptyForm()); setActiveMobileTab('list'); };
  const whatsappUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;

  const saveKas = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_pembayar.trim() || !formData.tanggal_transaksi || Number(formData.jumlah_bayar) <= 0) { await Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Nama, tanggal, dan nominal harus diisi.' }); return; }
    setSaving(true);
    const wasEditing = Boolean(editingId);
    try {
      const finalData = { ...formData, nama_pembayar: formData.nama_pembayar.trim(), jumlah_bayar: Number(formData.jumlah_bayar), jumlah_bola: Number(formData.jumlah_bola || 0), jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' as const : formData.jenis_transaksi, keterangan: formData.keterangan.trim() || null, lampiran_url: formData.lampiran_url || null, lampiran_nama: formData.lampiran_nama || null, lampiran_type: formData.lampiran_type || null, lampiran_size: formData.lampiran_size || null };
      let savedRow: any = null;
      if (editingId) {
        let updatePayload: any = { ...finalData, updated_at: new Date().toISOString() };
        let result = await supabase.from('kas_pb').update(updatePayload).eq('id', editingId).select().single();
        if (result.error && /updated_at|column/i.test(String(result.error.message || ''))) {
          updatePayload = finalData;
          result = await supabase.from('kas_pb').update(updatePayload).eq('id', editingId).select().single();
        }
        if (result.error) throw result.error;
        savedRow = result.data || { id: editingId, ...updatePayload };
        await broadcastKasChange('UPDATE', savedRow);
      } else {
        const { data, error } = await supabase.from('kas_pb').insert(finalData).select().single();
        if (error) throw error;
        savedRow = data || finalData;
        await broadcastKasChange('INSERT', savedRow);
      }
      await loadKas(false);

      // Restore the post-save WhatsApp action for both new and edited transactions.
      const actionLabel = wasEditing ? 'DIPERBARUI' : 'DITAMBAHKAN';
      const typeIcon = savedRow.jenis_transaksi === 'Keluar' ? '🔴' : '🟢';
      const savedHasImage = Boolean(savedRow.lampiran_url) && getAttachmentKind(savedRow as KasEntry) === 'image';
      const savedAttachment = savedRow.lampiran_url ? `\n\n📎 *Bukti transaksi terlampir*` : '';
      // Jika ada bukti gambar, jadikan URL gambar sebagai satu-satunya URL preview agar
      // WhatsApp tidak memilih OG/logo website. Logo website hanya dipakai bila tanpa lampiran.
      const savedFallbackSite = `\n\n🔗 *Preview transaksi:*\nhttps://pbilibili162.99apps.id/kas-share?id=${encodeURIComponent(savedRow.id)}&v=${encodeURIComponent(String(savedRow.updated_at || savedRow.created_at || Date.now()))}\n\n🔗 *Akses Kelola Kas:* https://pbilibili162.99apps.id/kas\n\n🌐 *Info lebih lanjut:* https://pbilibili162.99apps.id/`;
      const fmtWita = (row: KasEntry) => {
        const raw = String(row.updated_at || row.created_at || '');
        if (!raw) return String(row.tanggal_transaksi || '-');
        const d = new Date(raw);
        const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar', hour12: false }).format(d).replace('.', '.');
        return `${row.tanggal_transaksi || '-'}, ${time} WITA`;
      };
      const periodRows = kasData.filter((r) => r.tanggal_transaksi === savedRow.tanggal_transaksi);
      const rowsWithSaved = [savedRow, ...periodRows.filter((r) => r.id !== savedRow.id)];
      const latestByType = (type: string) => rowsWithSaved
        .filter((r) => String(r.jenis_transaksi || '').toLowerCase() === type.toLowerCase())
        .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))[0];
      const latestMasuk = latestByType('Masuk');
      const latestKeluar = latestByType('Keluar');
      const periodMasuk = rowsWithSaved.filter(r => String(r.jenis_transaksi||'').toLowerCase()==='masuk').reduce((s,r)=>s+Number(r.jumlah_bayar||0),0);
      const periodKeluar = rowsWithSaved.filter(r => String(r.jenis_transaksi||'').toLowerCase()==='keluar').reduce((s,r)=>s+Number(r.jumlah_bayar||0),0);
      const currentBalance = stats.saldoTerakhir;
      const beforePeriod = stats.sebelumnya;
      const endPeriod = beforePeriod + periodMasuk - periodKeluar;
      const modalTetap = 600000;
      const bendahara = Math.max(0, currentBalance - modalTetap);
      const rowText = (row: KasEntry | undefined, masuk: boolean) => !row ? 'Nihil' : `• Status: *BERHASIL*\n• Jenis: ${masuk ? '📥 Pemasukan' : '📤 Pengeluaran'}\n• Tanggal: *${fmtWita(row)}*\n• Nama: *${row.nama_pembayar || '-'}*\n• Kategori: ${row.kategori || '-'}\n• Jumlah: *${rupiah(Number(row.jumlah_bayar || 0))}*${row.keterangan ? `\n• Catatan: ${row.keterangan}` : ''}`;
      const previewUrl = `https://pbilibili162.99apps.id/kas-share?id=${encodeURIComponent(savedRow.id)}&v=${encodeURIComponent(String(savedRow.updated_at || savedRow.created_at || Date.now()))}`;
      const fileName = savedRow.lampiran_nama || (savedRow.lampiran_url ? decodeURIComponent(String(savedRow.lampiran_url).split('/').pop() || 'Bukti transaksi') : '');
      const proofBlock = savedRow.lampiran_url
        ? `📎 *Bukti Transaksi Terakhir*\n• File: *${fileName}*\n• Preview: ${previewUrl}`
        : `📎 *Bukti Transaksi Terakhir*\n• File: Nihil\n• Preview logo: ${previewUrl}`;
      const waMessage = `📢 *LAPORAN REAL-TIME KAS*\n*PB BILIBILI 162*\n\n━━━━━━━━━━━━━━━━━━━━\n📅 *PERIODE LAPORAN*\n${savedRow.tanggal_transaksi || '-'} s/d ${savedRow.tanggal_transaksi || '-'}\n━━━━━━━━━━━━━━━━━━━━\n\n📥 *PEMASUKAN TERBARU*\n${rowText(latestMasuk, true)}\n\n📤 *PENGELUARAN TERBARU*\n${rowText(latestKeluar, false)}\n\n💰 *RINGKASAN KEUANGAN*\n• Saldo sebelumnya: ${rupiah(beforePeriod)}\n• Total pemasukan: ${rupiah(periodMasuk)}\n• Total pengeluaran: ${rupiah(periodKeluar)}\n• Saldo akhir periode: *${rupiah(endPeriod)}*\n• Saldo terakhir saat ini: *${rupiah(currentBalance)}*\n\n📊 *PEMBAGIAN SALDO*\n• Modal tetap: ${rupiah(modalTetap)}\n• Kas bendahara: ${rupiah(bendahara)}\n\n${proofBlock}\n\n🔗 *Akses Kelola Kas:* https://pbilibili162.99apps.id/kas\n\n🌐 *Info lebih lanjut:* https://pbilibili162.99apps.id/\n\n_Admin PB Bilibili 162_`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(waMessage)}`;
      await Swal.fire({
        icon: 'success',
        title: wasEditing ? 'Data kas berhasil diperbarui' : 'Data kas berhasil disimpan',
        html: `<div class="text-left text-xs space-y-3">
          <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 font-bold text-emerald-700">Transaksi berhasil disimpan. Tekan tombol hijau di bawah untuk membuka WhatsApp dan mengirim notifikasi.</div>
          <textarea id="kas-save-wa-message" class="swal2-textarea !m-0 !w-full !text-xs !h-44 !rounded-xl">${waMessage}</textarea>
          <a id="kas-wa-direct-link" href="${whatsappUrl(waMessage)}" class="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-center text-sm font-black text-white no-underline shadow-lg">💬 KIRIM DATA KE WHATSAPP</a>
        </div>`,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Selesai',
        didOpen: () => {
          const textarea = document.getElementById('kas-save-wa-message') as HTMLTextAreaElement | null;
          const link = document.getElementById('kas-wa-direct-link') as HTMLAnchorElement | null;
          if (textarea && link) textarea.addEventListener('input', () => {
            link.href = whatsappUrl(textarea.value || waMessage);
          });
        }
      });
      resetForm();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan data', text: error?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' });
    } finally { setSaving(false); }
  };

  const editKas = (row: KasEntry) => { setEditingId(row.id); setFormData({ nama_pembayar: row.nama_pembayar || '', kategori: row.kategori || DAFTAR_PEMASUKAN[0], jumlah_bayar: Number(row.jumlah_bayar || 0), jumlah_bola: Number(row.jumlah_bola || 0), tipe_anggota: row.tipe_anggota || 'Anggota Tetap', jenis_transaksi: row.jenis_transaksi, tanggal_transaksi: row.tanggal_transaksi, keterangan: row.keterangan || '', lampiran_url: row.lampiran_url || '', lampiran_nama: row.lampiran_nama || '', lampiran_type: row.lampiran_type || '', lampiran_size: row.lampiran_size || null }); setActiveMobileTab('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleAttachmentUpload = async (file: File | null) => {
    if (!file) return;
    const allowed = ['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'];
    if (!allowed.includes(file.type)) { await Swal.fire({ icon: 'warning', title: 'Format tidak didukung', text: 'Gunakan JPG, PNG, WEBP, HEIC/HEIF, atau PDF.' }); return; }
    if (file.size > 12 * 1024 * 1024) { await Swal.fire({ icon: 'warning', title: 'File terlalu besar', text: 'Ukuran maksimal 12 MB.' }); return; }
    setUploadingAttachment(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const path = `kas/${localToday()}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from('uploads').getPublicUrl(path);
      setFormData(f => ({ ...f, lampiran_url: data.publicUrl, lampiran_nama: file.name, lampiran_type: file.type, lampiran_size: file.size }));
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Lampiran berhasil diupload', showConfirmButton: false, timer: 1600 });
    } catch (error: any) { await Swal.fire({ icon: 'error', title: 'Upload gagal', text: error?.message || 'Tidak dapat mengupload lampiran.' }); }
    finally { setUploadingAttachment(false); }
  };

  const getAttachmentKind = (row: KasEntry | null) => {
    const type = String(row?.lampiran_type || '').toLowerCase().trim();
    const name = String(row?.lampiran_nama || row?.lampiran_url || '').toLowerCase();
    if (type.startsWith('image/') || /\\.(jpe?g|png|webp|gif|heic|heif|bmp|avif)(?:[?#]|$)/i.test(name)) return 'image';
    if (type === 'application/pdf' || /\\.pdf(?:[?#]|$)/i.test(name)) return 'pdf';
    return 'file';
  };
  const isImageAttachment = (row: KasEntry | null) => getAttachmentKind(row) === 'image';
  const openAttachment = (row: KasEntry) => {
    if (!row.lampiran_url) return;
    setPreviewAttachment(row);
  };

  const deleteKas = async (row: KasEntry) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Hapus transaksi?', html: `<b>${row.nama_pembayar || '-'}</b><br>${rupiah(Number(row.jumlah_bayar))}<br><small>${row.tanggal_transaksi}</small>`, showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!result.isConfirmed) return;
    try { const { data, error } = await supabase.from('kas_pb').delete().eq('id', row.id).select().single(); if (error) throw error; await broadcastKasChange('DELETE', data || row); await loadKas(false); Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Transaksi berhasil dihapus', showConfirmButton: false, timer: 1800 }); }
    catch (error: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' }); }
  };


  const testNotification = async () => {
    const source = latestFilteredTransaction;
    if (!source) {
      await Swal.fire({ icon:'info', title:'Tidak ada transaksi pada filter ini', text:`Tidak ditemukan transaksi berdasarkan tanggal transaksi ${startDate || 'awal'} s/d ${endDate || 'akhir'}.` });
      return;
    }
    const mock:any = { ...source };
    try {
      const fmtWita = (row: KasEntry) => {
        const raw=String(row.updated_at||row.created_at||'');
        if(!raw) return String(row.tanggal_transaksi||'-');
        const time=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Makassar',hour12:false}).format(new Date(raw));
        return `${row.tanggal_transaksi||'-'}, ${time} WITA`;
      };
      const rows=[...periodTransactions].sort((a,b)=>String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||'')));
      const latestMasuk=rows.find(r=>r.jenis_transaksi==='Masuk');
      const latestKeluar=rows.find(r=>r.jenis_transaksi==='Keluar');
      const rowText=(row:KasEntry|undefined,masuk:boolean)=>!row?'Nihil':`• Status: *BERHASIL*\n• Jenis: ${masuk?'📥 Pemasukan':'📤 Pengeluaran'}\n• Tanggal: *${fmtWita(row)}*\n• Nama: *${row.nama_pembayar||'-'}*\n• Kategori: ${row.kategori||'-'}\n• Jumlah: *${rupiah(Number(row.jumlah_bayar||0))}*${row.keterangan?`\n• Catatan: ${row.keterangan}`:''}`;
      const hasImageAttachment=Boolean(mock.lampiran_url)&&getAttachmentKind(mock as KasEntry)==='image';
      const previewUrl=`https://pbilibili162.99apps.id/kas-share?id=${encodeURIComponent(mock.id)}&v=${encodeURIComponent(String(mock.updated_at||mock.created_at||Date.now()))}`;
      const fileName=mock.lampiran_nama||(mock.lampiran_url?decodeURIComponent(String(mock.lampiran_url).split('/').pop()||'Bukti transaksi'):'');
      const proofBlock=mock.lampiran_url?`📎 *Bukti Transaksi Terakhir*\n• File: *${fileName}*\n• Preview: ${previewUrl}`:`📎 *Bukti Transaksi Terakhir*\n• File: Nihil\n• Preview logo: ${previewUrl}`;
      const message=`📢 *LAPORAN REAL-TIME KAS*\n*PB BILIBILI 162*\n\n━━━━━━━━━━━━━━━━━━━━\n📅 *PERIODE LAPORAN*\n${startDate||'Awal'} s/d ${endDate||'Akhir'}\n━━━━━━━━━━━━━━━━━━━━\n\n📥 *PEMASUKAN TERBARU*\n${rowText(latestMasuk,true)}\n\n📤 *PENGELUARAN TERBARU*\n${rowText(latestKeluar,false)}\n\n💰 *RINGKASAN KEUANGAN*\n• Saldo sebelumnya: ${rupiah(stats.sebelumnya)}\n• Total pemasukan: ${rupiah(stats.masuk)}\n• Total pengeluaran: ${rupiah(stats.keluar)}\n• Saldo akhir periode: *${rupiah(stats.akhir)}*\n• Saldo terakhir saat ini: *${rupiah(stats.akhir)}*\n\n📊 *PEMBAGIAN SALDO*\n• Modal tetap: ${rupiah(MODAL_TETAP)}\n• Kas bendahara: ${rupiah(stats.bendaharaPeriode)}\n\n${proofBlock}\n\n🔗 *Akses Kelola Kas:* https://pbilibili162.99apps.id/kas\n\n🌐 *Info lebih lanjut:* https://pbilibili162.99apps.id/\n\n_Admin PB Bilibili 162_`;
      await Swal.fire({
        icon:mock.jenis_transaksi==='Keluar'?'warning':'success',title:'Laporan Real-Time Kas',
        html:`<div class="text-left text-xs space-y-3"><div class="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3"><div class="font-black text-blue-700">PERIODE AKTIF</div><div class="mt-1 font-bold">${startDate||'Awal'} s/d ${endDate||'Akhir'}</div></div>${hasImageAttachment?`<div class="overflow-hidden rounded-xl border border-emerald-200 bg-black/5"><a href="${mock.lampiran_url}" target="_blank" rel="noopener noreferrer" class="block"><img src="${mock.lampiran_url}" alt="Bukti transaksi" class="max-h-56 w-full cursor-pointer object-contain"/></a></div>`:''}<textarea id="kas-test-wa-message" class="swal2-textarea !m-0 !w-full !text-xs !h-64 !rounded-xl">${message}</textarea><a id="kas-test-wa-link" href="${whatsappUrl(message)}" class="flex min-h-[54px] w-full items-center justify-center rounded-xl bg-[#25D366] px-4 py-3 text-center text-sm font-black text-white no-underline shadow-lg">💬 KIRIM LAPORAN KE WHATSAPP</a></div>`,
        showConfirmButton:false,showCancelButton:true,cancelButtonText:'Tutup',
        didOpen:()=>{const ta=document.getElementById('kas-test-wa-message') as HTMLTextAreaElement|null;const link=document.getElementById('kas-test-wa-link') as HTMLAnchorElement|null;if(ta&&link)ta.addEventListener('input',()=>{link.href=whatsappUrl(ta.value||message);});}
      });
    } catch(error:any){Swal.fire({icon:'error',title:'Gagal menampilkan notifikasi',text:error?.message||'Coba lagi.'});}
  };

  const exportPdf = async () => {
    try {
      // PDF selalu memakai seluruh transaksi pada periode tanggal_transaksi yang dipilih.
      // Pencarian/paginasi layar tidak boleh menghilangkan rincian dari LPJ.
      const reportRows = [...periodTransactions];
      const incomeRows = reportRows.filter(r => r.jenis_transaksi === 'Masuk');
      const expenseRows = reportRows.filter(r => r.jenis_transaksi === 'Keluar');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const fmtDate = (v: string) => {
        const [y,m,d] = String(v || '').slice(0,10).split('-');
        return y && m && d ? `${d}/${m}/${y}` : (v || '-');
      };
      const drawHeader = () => {
        doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(30, 64, 175); doc.text('PB. BILI BILI 162', 14, 16);
        doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(20); doc.text('LAPORAN PERTANGGUNGJAWABAN KEUANGAN KAS', 148, 25, { align: 'center' });
        doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90); doc.text(`Periode tanggal transaksi: ${startDate ? fmtDate(startDate) : 'Awal'} s/d ${endDate ? fmtDate(endDate) : 'Akhir'}`, 148, 31, { align: 'center' });
      };
      const tableBody = (rows: KasEntry[]) => rows.map((r, idx) => [
        String(idx + 1), fmtDate(r.tanggal_transaksi), r.nama_pembayar || '-', r.kategori || '-',
        String(r.jumlah_bola || 0), rupiah(Number(r.jumlah_bayar)), r.keterangan || '-'
      ]);
      drawHeader();
      doc.setFont('helvetica','bold').setFontSize(10).setTextColor(22,101,52); doc.text(`RINCIAN PENERIMAAN (${incomeRows.length} transaksi)`, 14, 38);
      autoTable(doc, {
        startY: 42, head: [['No','Tanggal Transaksi','Nama','Kategori','Bola','Nominal','Keterangan']],
        body: tableBody(incomeRows), theme: 'striped',
        headStyles: { fillColor: [22, 101, 52], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 }, margin: { left:14, right:14, bottom:18 },
        columnStyles: { 0:{cellWidth:10}, 1:{cellWidth:27}, 4:{cellWidth:14}, 5:{cellWidth:31} }
      });
      let y = ((doc as any).lastAutoTable?.finalY || 42) + 6;
      doc.setFont('helvetica','bold').setFontSize(9).setTextColor(22,101,52);
      doc.text(`Total Penerimaan: ${rupiah(incomeRows.reduce((s,r)=>s+Number(r.jumlah_bayar||0),0))}`, 283, y, {align:'right'});

      if (y > 145) { doc.addPage(); drawHeader(); y = 40; } else y += 10;
      doc.setFont('helvetica','bold').setFontSize(10).setTextColor(185,28,28); doc.text(`RINCIAN PENGELUARAN (${expenseRows.length} transaksi)`, 14, y);
      autoTable(doc, {
        startY: y + 4, head: [['No','Tanggal Transaksi','Nama/Penerima','Kategori','Bola','Nominal','Keterangan']],
        body: tableBody(expenseRows), theme: 'striped',
        headStyles: { fillColor: [185, 28, 28], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 }, margin: { left:14, right:14, bottom:35 },
        columnStyles: { 0:{cellWidth:10}, 1:{cellWidth:27}, 4:{cellWidth:14}, 5:{cellWidth:31} }
      });
      y = ((doc as any).lastAutoTable?.finalY || y) + 6;
      if (y > 165) { doc.addPage(); drawHeader(); y = 42; }
      doc.setFont('helvetica','bold').setFontSize(9).setTextColor(185,28,28);
      doc.text(`Total Pengeluaran: ${rupiah(expenseRows.reduce((s,r)=>s+Number(r.jumlah_bayar||0),0))}`, 283, y, {align:'right'});
      y += 9;
      doc.setTextColor(40);
      doc.text(`Saldo Sebelumnya: ${rupiah(stats.sebelumnya)}`, 283, y, { align: 'right' });
      doc.text(`Total Pemasukan: ${rupiah(stats.masuk)}`, 283, y + 6, { align: 'right' });
      doc.text(`Total Pengeluaran: ${rupiah(stats.keluar)}`, 283, y + 12, { align: 'right' });
      doc.setTextColor(30, 64, 175); doc.text(`Saldo Akhir Kas: ${rupiah(stats.akhir)}`, 283, y + 19, { align: 'right' });
      doc.setFont('helvetica', 'normal').setTextColor(70);
      doc.text(`Modal Tetap: ${rupiah(MODAL_TETAP)}`, 283, y + 26, { align: 'right' });
      doc.text(`Kas Bendahara (periode): ${rupiah(stats.bendaharaPeriode)}`, 283, y + 32, { align: 'right' });
      const fileName = `LPJ_KAS_PB162_${startDate || 'semua'}_TO_${endDate || 'semua'}.pdf`; doc.save(fileName);
      const message = `*LAPORAN KAS PB BILIBILI 162*\n\nPeriode tanggal transaksi: *${startDate || 'Semua'} s/d ${endDate || 'Semua'}*\n• Jumlah transaksi: ${reportRows.length}\n• Saldo Sebelumnya: ${rupiah(stats.sebelumnya)}\n• Total Pemasukan: ${rupiah(stats.masuk)}\n• Total Pengeluaran: ${rupiah(stats.keluar)}\n• *Saldo Akhir Kas: ${rupiah(stats.akhir)}*\n  - Modal Tetap: ${rupiah(MODAL_TETAP)}\n  - Kas Bendahara: ${rupiah(stats.bendaharaPeriode)}\n\nLaporan PDF sudah diunduh.\n\nAdmin PB Bilibili 162`;
      const { isConfirmed, value } = await Swal.fire({ title: '📱 Kirim Ringkasan Kas ke WhatsApp', html: `<div class="text-left text-xs space-y-3"><div class="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 font-bold">PDF berhasil dibuat dengan ${reportRows.length} transaksi sesuai tanggal transaksi.</div><textarea id="kas-wa-message" class="swal2-textarea !m-0 !w-full !text-xs !h-36 !rounded-xl">${message}</textarea></div>`, showCancelButton: true, confirmButtonText: '💬 Buka WhatsApp', cancelButtonText: 'Tutup', confirmButtonColor: '#25D366', focusConfirm: false, preConfirm: () => (document.getElementById('kas-wa-message') as HTMLTextAreaElement)?.value || message });
      if (isConfirmed) window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(value || message)}`, '_blank');
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
              <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400"><Paperclip size={14} className="text-blue-400"/> Lampiran Bukti <span className="text-slate-600">(Opsional)</span></div>
                <input id="kas-attachment" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" className="hidden" onChange={e=>void handleAttachmentUpload(e.target.files?.[0] || null)}/>
                <div className="flex flex-wrap gap-2">
                  <label htmlFor="kas-attachment" className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-3 py-2 text-[10px] font-black text-blue-300">{uploadingAttachment?<Loader2 size={14} className="animate-spin"/>:<Paperclip size={14}/>} {uploadingAttachment?'Mengupload...':'Pilih File / Gambar'}</label>
                  {formData.lampiran_url && <button type="button" onClick={()=>setFormData(f=>({...f,lampiran_url:'',lampiran_nama:'',lampiran_type:'',lampiran_size:null}))} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black text-red-300">Hapus Lampiran</button>}
                </div>
                {formData.lampiran_url && <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-950/60 p-2">
                  {getAttachmentKind({ ...formData, id: 'form-preview', created_at: '', tanggal_transaksi: formData.tanggal_transaksi, nama_pembayar: formData.nama_pembayar, kategori: formData.kategori, jumlah_bayar: formData.jumlah_bayar, jumlah_bola: formData.jumlah_bola, tipe_anggota: formData.tipe_anggota, jenis_transaksi: formData.jenis_transaksi } as KasEntry) === 'image' ? <img src={formData.lampiran_url} alt={formData.lampiran_nama || 'Lampiran kas'} className="max-h-52 w-full rounded-lg object-contain"/> : <a href={formData.lampiran_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[10px] font-bold text-blue-300"><FileText size={18}/> {formData.lampiran_nama || 'Buka dokumen'}</a>}
                  <div className="mt-1 truncate text-[9px] text-slate-500">{formData.lampiran_nama || formData.lampiran_url}</div>
                </div>}
              </div>
              <button disabled={saving} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-blue-900/20 disabled:opacity-50">{saving?<Loader2 size={17} className="animate-spin"/>:editingId?<Edit3 size={17}/>:<Plus size={17}/>} {saving?'Menyimpan...':editingId?'Simpan Perubahan':'Simpan Transaksi'}</button>
            </form>
          </div>
        </div>

        <div className={`lg:col-span-8 ${activeMobileTab==='list'?'block':'hidden md:block'} min-w-0`}>
          <div className="overflow-hidden rounded-2xl md:rounded-[2.5rem] border border-white/10 bg-[#0b1224]/95 shadow-xl">
            <div className="flex flex-col gap-2 border-b border-white/10 p-3 sm:p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-sm sm:text-lg font-black uppercase tracking-tight text-white">Riwayat Transaksi Kas</h3><p className="mt-0.5 text-[9px] sm:text-xs text-slate-500">{filtered.length} transaksi pada periode aktif • sumber <b className="text-blue-400">kas_pb</b></p></div><span className="rounded-full bg-blue-500/10 px-3 py-1 text-[9px] font-black text-blue-300">Halaman {page}/{totalPages}</span></div>
            {loading?<div className="p-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 animate-spin"/>Memuat data kas...</div>:visible.length===0?<div className="p-12 text-center text-sm text-slate-500">Tidak ada transaksi pada periode/filter ini.</div>:<div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-black/30 text-[9px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Tanggal</th><th className="p-3">Nama</th><th className="p-3">Kategori</th><th className="p-3">Jenis</th><th className="p-3 text-right">Nominal</th><th className="p-3">Bola</th><th className="p-3">Keterangan</th><th className="p-3">Bukti</th><th className="p-3 text-right">Aksi</th></tr></thead><tbody>{visible.map(row=><tr key={row.id} className="border-t border-white/5 hover:bg-white/[0.025]"><td className="p-3 text-[10px] font-bold text-slate-300">{row.tanggal_transaksi}</td><td className="p-3 text-[10px] font-black text-white">{row.nama_pembayar||'-'}</td><td className="p-3 text-[10px] text-slate-300">{row.kategori||'-'}</td><td className="p-3">{row.jenis_transaksi==='Masuk'?<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black text-emerald-300"><ArrowUpCircle size={12}/>Masuk</span>:<span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-1 text-[9px] font-black text-red-300"><ArrowDownCircle size={12}/>Keluar</span>}</td><td className={`p-3 text-right text-[10px] font-black ${row.jenis_transaksi==='Masuk'?'text-emerald-300':'text-red-300'}`}>{rupiah(Number(row.jumlah_bayar))}</td><td className="p-3 text-[10px] text-slate-300">{row.jumlah_bola||0}</td><td className="max-w-[240px] p-3 text-[10px] text-slate-400">{row.keterangan||'-'}</td>
                    <td className="p-3">
                      {row.lampiran_url ? (
                        <button type="button" onClick={()=>openAttachment(row)} title={row.lampiran_nama || 'Lihat bukti transaksi'} className="group relative h-11 w-14 overflow-hidden rounded-lg border border-blue-500/20 bg-slate-950/70 text-left">
                          {getAttachmentKind(row) === 'image' ? (
                            <img src={row.lampiran_url} alt={row.lampiran_nama || 'Bukti transaksi'} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-blue-300"><FileText size={18}/></span>
                          )}
                          <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[7px] font-black text-white">LIHAT</span>
                        </button>
                      ) : <span className="text-[9px] text-slate-600">—</span>}
                    </td>
                    <td className="p-3"><div className="flex justify-end gap-1.5"><button type="button" onClick={()=>editKas(row)} title="Edit" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300"><Edit3 size={14}/></button><button type="button" onClick={()=>void deleteKas(row)} title="Hapus" className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-300"><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>}
            <div className="flex items-center justify-between border-t border-white/10 p-3 sm:p-4"><button type="button" disabled={page<=1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black text-slate-300 disabled:opacity-30"><ChevronLeft size={14}/> Sebelumnya</button><span className="text-[9px] font-bold text-slate-500">{filtered.length?`${(page-1)*pageSize+1}-${Math.min(page*pageSize,filtered.length)}`:'0'} / {filtered.length}</span><button type="button" disabled={page>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[9px] font-black text-slate-300 disabled:opacity-30">Berikutnya <ChevronRight size={14}/></button></div>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-950/50 via-slate-900/90 to-slate-950 p-3 sm:p-5 shadow-xl"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-300"><MessageCircle size={15}/> Ringkasan Informasi Kas</div><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Saldo akhir dihitung dari saldo sebelumnya + pemasukan periode − pengeluaran periode. Modal tetap pengelola bola dipisahkan dari kas bendahara.</p></div><div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] sm:text-[10px]"><div className="text-slate-500">Saldo Sebelumnya <b className="ml-1 text-slate-200">{rupiah(stats.sebelumnya)}</b></div><div className="text-slate-500">Pemasukan <b className="ml-1 text-emerald-300">{rupiah(stats.masuk)}</b></div><div className="text-slate-500">Pengeluaran <b className="ml-1 text-red-300">{rupiah(stats.keluar)}</b></div><div className="text-slate-500">Saldo Akhir Periode <b className="ml-1 text-blue-300">{rupiah(stats.akhir)}</b><br/><span className="text-[8px] text-slate-500">Saldo Terakhir Saat Ini <b className="ml-1 text-emerald-300">{rupiah(stats.saldoTerakhir)}</b></span></div><div className="text-slate-500">Modal Tetap <b className="ml-1 text-slate-200">{rupiah(MODAL_TETAP)}</b></div><div className="text-slate-500">Kas Bendahara <b className="ml-1 text-blue-300">{rupiah(stats.bendahara)}</b></div></div></div></section>
      {previewAttachment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3 sm:p-6" role="dialog" aria-modal="true" onClick={()=>setPreviewAttachment(null)}>
          <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224] shadow-2xl" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Bukti Transaksi</p>
                <p className="truncate text-xs font-bold text-white">{previewAttachment.lampiran_nama || 'Lampiran transaksi'}</p>
              </div>
              <button type="button" onClick={()=>setPreviewAttachment(null)} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10" aria-label="Tutup">
                <X size={18}/>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/30 p-3 sm:p-5">
              {isImageAttachment(previewAttachment) ? (
                <img src={previewAttachment.lampiran_url || ''} alt={previewAttachment.lampiran_nama || 'Bukti transaksi'} className="max-h-[68vh] max-w-full rounded-xl object-contain shadow-lg" />
              ) : (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <FileText size={48} className="text-blue-300"/>
                  <p className="max-w-md text-xs text-slate-300">{previewAttachment.lampiran_nama || 'Dokumen transaksi'}</p>
                  <a href={previewAttachment.lampiran_url || '#'} target="_blank" rel="noreferrer" className="rounded-xl bg-blue-600 px-4 py-2 text-[10px] font-black text-white">Buka Dokumen</a>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <div className="min-w-0 text-[9px] text-slate-500">
                <span>{previewAttachment.tanggal_transaksi}</span>
                <span className="mx-1.5">•</span>
                <span className="font-bold text-slate-300">{previewAttachment.nama_pembayar || '-'}</span>
              </div>
              <a href={previewAttachment.lampiran_url || '#'} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[9px] font-black text-blue-300">Buka Asli</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
