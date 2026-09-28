import { useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { broadcastDataChange } from '../utils/realtimeHelper';

const DAFTAR_PEMASUKAN = ['Iuran Bulanan Tetap (10k)', 'Pembayaran Iuran Binaan', 'Pembayaran Shuttlecock', 'Pendaftaran Atlet Baru', 'Sumbangan Sukarela'];
const processedEvents = new Set<string>();
let activeGlobalChannel: any = null;
let activeGlobalChannelPromise: Promise<any> | null = null;
const formatRupiah = (value: any) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value || 0));
const isMasuk = (tx: any) => !!tx && (String(tx.jenis_transaksi || '').toLowerCase() === 'masuk' || DAFTAR_PEMASUKAN.includes(String(tx.kategori || '')));
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const getFilter = () => { const t = today(); const first = `${t.slice(0, 8)}01`; let start = '', end = ''; try { start = localStorage.getItem('kas_filter_start') || ''; end = localStorage.getItem('kas_filter_end') || ''; } catch {} const inputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[]; const from = inputs.find(i => /Dari\s*:/i.test(i.parentElement?.innerText || i.closest('div')?.innerText || '')); const to = inputs.find(i => /Sampai\s*:/i.test(i.parentElement?.innerText || i.closest('div')?.innerText || '')); return { startDate: start || from?.value || first, endDate: end || to?.value || t }; };
const activityDate = (tx: any) => String(tx?.updated_at || tx?.tanggal_transaksi || '').slice(0, 10);
const inFilter = (tx: any, start: string, end: string) => { const transactionDate = String(tx?.tanggal_transaksi || '').slice(0, 10); const updateDate = String(tx?.updated_at || '').slice(0, 10); return (!!transactionDate && transactionDate >= start && transactionDate <= end) || (!!updateDate && updateDate >= start && updateDate <= end); };
const latest = (items: any[], income: boolean) => [...items].filter(tx => isMasuk(tx) === income).sort((a, b) => String(b.updated_at || b.created_at || b.tanggal_transaksi || '').localeCompare(String(a.updated_at || a.created_at || a.tanggal_transaksi || '')))[0] || null;
const formatDateTime = (tx: any) => { const date = String(tx?.tanggal_transaksi || '-').slice(0, 10); if (!tx?.created_at) return date; const d = new Date(tx.created_at); if (isNaN(d.getTime())) return date; return `${date}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' })} WITA`; };
const DEFAULT_KAS_LOGO = 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/branding/logo-1775228962198.png';
const hasAttachment = (tx: any) => !!String(tx?.lampiran_url || '').trim();
const attachmentLine = (tx: any, fallbackTx?: any) => {
  const source = hasAttachment(tx) ? tx : (hasAttachment(fallbackTx) ? fallbackTx : null);
  if (!source) return '';
  const imageUrl = source.lampiran_url;
  const name = source.lampiran_nama || 'Bukti transaksi kas';
  let previewUrl = '';
  try {
    const u = new URL(imageUrl);
    const marker = '/storage/v1/object/public/';
    const index = u.pathname.indexOf(marker);
    if (index >= 0) {
      const rest = u.pathname.slice(index + marker.length);
      const slash = rest.indexOf('/');
      const bucket = slash > 0 ? rest.slice(0, slash) : '';
      const path = slash > 0 ? rest.slice(slash + 1) : '';
      if (bucket && path) {
        previewUrl = `${window.location.origin}/api/kas-share?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}`;
      }
    }
  } catch {}
  return `📎 *Bukti Transaksi Terakhir*
• File: *${name}*
• Preview: ${previewUrl}`;
};

const detail = (tx: any, income: boolean) => {
  if (!tx) return 'Nihil';
  return [
    `• Status: *BERHASIL*`,
    `• Jenis: ${income ? '📥 Pemasukan' : '📤 Pengeluaran'}`,
    `• Tanggal: *${formatDateTime(tx)}*`,
    `• Nama: *${tx.nama_pembayar || '-'}*`,
    `• Kategori: ${tx.kategori || '-'}`,
    `• Jumlah: *${formatRupiah(tx.jumlah_bayar)}*`,
    `• Catatan: ${tx.keterangan || '-'}`,
  ].join('\n');
};

const buildWaText = ({ startDate, endDate, previous, income, expense, saldo, saldoTerakhir, latestIncome, latestExpense, latestAttachment }: { startDate: string; endDate: string; previous: number; income: number; expense: number; saldo: number; saldoTerakhir: number; latestIncome: any; latestExpense: any; latestAttachment?: any; }) => {
  const modalTetap = 600000;
  const bendahara = saldoTerakhir - modalTetap;
  const proof = latestAttachment
    ? `\n${attachmentLine(null, latestAttachment)}\n`
    : '';

  return [
    '📢 *LAPORAN REAL-TIME KAS*',
    '*PB BILIBILI 162*',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    `📅 *PERIODE LAPORAN*`,
    `${startDate} s/d ${endDate}`,
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '📥 *PEMASUKAN TERBARU*',
    detail(latestIncome, true),
    '',
    '📤 *PENGELUARAN TERBARU*',
    detail(latestExpense, false),
    '',
    '💰 *RINGKASAN KEUANGAN*',
    `• Saldo sebelumnya: ${formatRupiah(previous)}`,
    `• Total pemasukan: ${formatRupiah(income)}`,
    `• Total pengeluaran: ${formatRupiah(expense)}`,
    `• Saldo akhir periode: *${formatRupiah(saldo)}*`,
    '',
    '📊 *SALDO TERAKHIR & PEMBAGIAN SALDO*',
    `• Saldo terakhir saat ini: *${formatRupiah(saldoTerakhir)}*`,
    `• Modal tetap: ${formatRupiah(modalTetap)}`,
    `• Kas bendahara (sisa): *${formatRupiah(bendahara)}*`,
    proof ? proof.trim() : '',
    '',
    `🔗 *Akses Kelola Kas:* ${window.location.origin}/kas`,
    '',
    'Admin PB Bilibili 162',
  ].join('\n');
};
const getGlobalChannel = async () => { if (activeGlobalChannel) return activeGlobalChannel; if (activeGlobalChannelPromise) return activeGlobalChannelPromise; activeGlobalChannelPromise = new Promise((resolve, reject) => { const channel = supabase.channel('global-kas-db-changes', { config: { broadcast: { self: true } } }); channel.subscribe((status: string, error?: any) => { if (status === 'SUBSCRIBED') { activeGlobalChannel = channel; activeGlobalChannelPromise = null; resolve(channel); } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { activeGlobalChannelPromise = null; try { supabase.removeChannel(channel); } catch {} reject(error || new Error(`Realtime channel status: ${status}`)); } }); }); return activeGlobalChannelPromise; };
export const broadcastKasChange = async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', payloadData: any) => { const payload = { eventType, new: eventType !== 'DELETE' ? payloadData : null, old: eventType !== 'INSERT' ? payloadData : null }; broadcastDataChange('kas_pb', eventType, payloadData); try { const channel = await getGlobalChannel(); await channel.send({ type: 'broadcast', event: 'kas-changed', payload }); } catch (error) { console.warn('[KasRealtime] broadcast skipped:', error); } };
export default function KasRealtimeNotifier() {
  useEffect(() => {
    let mounted = true; let channel: any = null;
    const handlePayload = async (payload: any) => {
      if (!mounted) return;
      const eventTx = payload?.new || payload?.old || null;
      const eventType = payload?.eventType || payload?.event || 'UPDATE';
      const eventId = eventTx?.id || `${eventType}-${Date.now()}`;
      const eventKey = `${eventType}-${eventId}-${eventTx?.jumlah_bayar || 0}`;
      if (processedEvents.has(eventKey)) return;
      processedEvents.add(eventKey); window.setTimeout(() => processedEvents.delete(eventKey), 4000);
      window.dispatchEvent(new CustomEvent('kas-updated', { detail: payload }));

      // Real-time notification is a daily cash snapshot: opening balance is the
      // latest closing balance from the calendar day immediately before today.
      const { startDate: snapshotDate, endDate: snapshotEndDate } = getFilter();
      const previousDate = new Date(`${snapshotDate}T00:00:00+08:00`);
      previousDate.setDate(previousDate.getDate() - 1);
      const previousDateKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`;

      const { data, error } = await supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: true }).order('created_at', { ascending: true });
      if (!mounted) return;
      const all = !error && Array.isArray(data) ? data : [];
      const daily = all.filter(tx => inFilter(tx, snapshotDate, snapshotEndDate));
      const accountingDaily = all.filter(tx => { const d = String(tx.tanggal_transaksi || '').slice(0, 10); return !!d && d >= snapshotDate && d <= snapshotEndDate; });
      const previous = all.filter(tx => String(tx.tanggal_transaksi || '').slice(0, 10) <= previousDateKey).reduce((s, tx) => s + (isMasuk(tx) ? 1 : -1) * Number(tx.jumlah_bayar || 0), 0);
      const income = accountingDaily.filter(isMasuk).reduce((s, tx) => s + Number(tx.jumlah_bayar || 0), 0);
      const expense = accountingDaily.filter(tx => !isMasuk(tx)).reduce((s, tx) => s + Number(tx.jumlah_bayar || 0), 0);
      const saldo = previous + income - expense;
      // Current balance is independent of today's snapshot/filter: it is the
      // net value of every transaction currently stored in kas_pb.
      const saldoTerakhir = all.reduce((total, tx) => total + (isMasuk(tx) ? 1 : -1) * Number(tx.jumlah_bayar || 0), 0);
      const latestIncome = latest(daily, true);
      const latestExpense = latest(daily, false);
      const latestAttachment = [...all].filter(hasAttachment).sort((a, b) => String(b.updated_at || b.created_at || b.tanggal_transaksi || '').localeCompare(String(a.updated_at || a.created_at || a.tanggal_transaksi || '')))[0] || null;
      const eventInSnapshot = !!eventTx && inFilter(eventTx, snapshotDate, snapshotEndDate);
      const title = eventInSnapshot ? eventType === 'INSERT' ? 'TRANSAKSI KAS BARU!' : eventType === 'DELETE' ? 'TRANSAKSI KAS DIHAPUS!' : 'UPDATE KAS TERBARU!' : 'LAPORAN KAS TERBARU';
      const waText = buildWaText({ startDate: snapshotDate, endDate: snapshotEndDate, previous, income, expense, saldo, saldoTerakhir, latestIncome, latestExpense, latestAttachment });
      const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
      if (mounted) await Swal.fire({ icon: eventType === 'DELETE' ? 'warning' : 'success', title, html: `<div style="text-align:left;font-size:13px;line-height:1.6"><b>Snapshot:</b> ${snapshotDate}<br/><b>Saldo Sebelumnya:</b> ${formatRupiah(previous)}<br/><b>Total Pemasukan:</b> ${formatRupiah(income)}<br/><b>Total Pengeluaran:</b> ${formatRupiah(expense)}<br/><b>Saldo Akhir Periode:</b> ${formatRupiah(saldo)}<br/><br/><b>Saldo Terakhir Saat Ini:</b> ${formatRupiah(saldoTerakhir)}<br/><b>Modal Tetap:</b> ${formatRupiah(modalTetap)}<br/><b>Kas Bendahara:</b> ${formatRupiah(bendahara)}<br/><br/><b>Penerimaan Terbaru:</b> ${latestIncome ? `${latestIncome.nama_pembayar || latestIncome.kategori} — ${formatRupiah(latestIncome.jumlah_bayar)}` : 'Nihil'}<br/><b>Pengeluaran Terbaru:</b> ${latestExpense ? `${latestExpense.nama_pembayar || latestExpense.kategori} — ${formatRupiah(latestExpense.jumlah_bayar)}` : 'Nihil'}</div>`, showCancelButton: true, confirmButtonText: 'Buka WhatsApp', cancelButtonText: 'Tutup', confirmButtonColor: '#25D366' }).then(result => { if (result.isConfirmed) window.open(waHref, '_blank', 'noopener,noreferrer'); });
    };
    const startRealtime = async () => {
      try {
        channel = supabase.channel('global-kas-db-changes', { config: { broadcast: { self: true } } }).on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, (payload: any) => { handlePayload({ eventType: payload.eventType, new: payload.new, old: payload.old }); }).on('broadcast', { event: 'kas-changed' }, (message: any) => { handlePayload(message?.payload || message); });
        await new Promise<void>((resolve, reject) => { channel.subscribe((status: string, error?: any) => { if (status === 'SUBSCRIBED') resolve(); if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') reject(error || new Error(status)); }); });
        if (mounted) { activeGlobalChannel = channel; activeGlobalChannelPromise = null; }
      } catch (error) { console.warn('[KasRealtime] subscription unavailable:', error); if (channel) { try { await supabase.removeChannel(channel); } catch {} } if (activeGlobalChannel === channel) activeGlobalChannel = null; }
    };
    startRealtime();
    return () => { mounted = false; if (channel) { try { supabase.removeChannel(channel); } catch {} } if (activeGlobalChannel === channel) activeGlobalChannel = null; activeGlobalChannelPromise = null; };
  }, []);
  return null;
}
