import { useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { triggerPushNotification } from '../utils/firebaseMessaging';
import { broadcastDataChange } from '../utils/realtimeHelper';

const processedEvents = new Set<string>();
let activeGlobalChannel: any = null;

const localBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('kas-realtime-channel')
  : null;

const DAFTAR_PEMASUKAN = [
  'Iuran Bulanan Tetap (10k)',
  'Pembayaran Iuran Binaan',
  'Pembayaran Shuttlecock',
  'Pendaftaran Atlet Baru',
  'Sumbangan Sukarela'
];

const checkIsMasuk = (tx: any) => !!tx && (
  String(tx.jenis_transaksi || '').toLowerCase() === 'masuk' ||
  (tx.kategori && DAFTAR_PEMASUKAN.includes(tx.kategori))
);

const formatRupiah = (num: number | null | undefined) => {
  const val = num !== null && num !== undefined && !isNaN(Number(num)) ? Number(num) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(val);
};

const escapeHtml = (value: any) => String(value ?? '-')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatTransactionDateTime = (tx: any) => {
  const txDate = String(tx?.tanggal_transaksi || '').slice(0, 10);
  let dateText = txDate || '-';
  if (/^\d{4}-\d{2}-\d{2}$/.test(txDate)) {
    const [y, m, d] = txDate.split('-').map(Number);
    dateText = new Date(y, m - 1, d).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  const created = tx?.created_at ? new Date(tx.created_at) : null;
  if (created && !isNaN(created.getTime())) {
    return `${dateText}, ${created.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar'
    })} WITA`;
  }
  return dateText;
};

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getActiveKasFilter = () => {
  const today = getTodayString();
  const firstDay = today.substring(0, 8) + '01';
  let start = '';
  let end = '';

  try {
    start = localStorage.getItem('kas_filter_start') || '';
    end = localStorage.getItem('kas_filter_end') || '';
  } catch {}

  const dateInputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
  const startInput = dateInputs.find(input => /Dari\s*:/i.test(input.parentElement?.innerText || input.closest('div')?.innerText || ''));
  const endInput = dateInputs.find(input => /Sampai\s*:/i.test(input.parentElement?.innerText || input.closest('div')?.innerText || ''));

  if (!start && startInput?.value) start = startInput.value;
  if (!end && endInput?.value) end = endInput.value;

  return { startDate: start || firstDay, endDate: end || today };
};

const sortKas = (list: any[]) => [...list].sort((a, b) => {
  const dateCmp = String(a.tanggal_transaksi || '').localeCompare(String(b.tanggal_transaksi || ''));
  if (dateCmp !== 0) return dateCmp;
  return String(a.created_at || a.id || '').localeCompare(String(b.created_at || b.id || ''));
});

const isInFilter = (tx: any, startDate: string, endDate: string) => {
  const txDate = String(tx?.tanggal_transaksi || '').slice(0, 10);
  return !!txDate && txDate >= startDate && txDate <= endDate;
};

const sortLatest = (list: any[]) => [...list].sort((a, b) => {
  const ca = String(a.created_at || '');
  const cb = String(b.created_at || '');
  if (ca !== cb) return cb.localeCompare(ca);
  return String(b.tanggal_transaksi || '').localeCompare(String(a.tanggal_transaksi || ''));
});

const getLatestTransaction = (list: any[], isIncome: boolean) => {
  const filtered = list.filter(tx => checkIsMasuk(tx) === isIncome);
  return filtered.length ? sortLatest(filtered)[0] : null;
};

const transactionWaBlock = (title: string, tx: any, isIncome: boolean) => {
  if (!tx) return `${title}: *Nihil*\n\n`;
  return `${title}:\n` +
    `• Status: ✅ BERHASIL\n` +
    `• Jenis: ${isIncome ? '📥 Pemasukan' : '📤 Pengeluaran'}\n` +
    `• Tanggal & Waktu: *${formatTransactionDateTime(tx)}*\n` +
    `• Nama/Keterangan: *${tx.nama_pembayar || '-'}*\n` +
    `• Kategori: ${tx.kategori || '-'}\n` +
    `• Jumlah: *${formatRupiah(tx.jumlah_bayar || 0)}*\n` +
    (tx.keterangan ? `• Catatan: ${tx.keterangan}\n` : '') + '\n';
};

const transactionHtmlBlock = (title: string, tx: any, isIncome: boolean) => {
  if (!tx) {
    return `<div class="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 mb-2">
      <div class="text-[9px] font-black uppercase tracking-wider text-slate-400">${title}</div>
      <div class="text-[11px] font-bold text-slate-500 mt-1">Nihil</div>
    </div>`;
  }
  const main = isIncome ? 'emerald' : 'rose';
  return `<div class="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-1.5 mb-2">
    <div class="flex items-center justify-between gap-2 text-[9px] text-slate-400 pb-1 border-b border-white/5">
      <span class="font-bold uppercase tracking-wider">${title}</span>
      <span class="px-1.5 py-0.5 rounded text-[8px] font-black bg-${main}-500/10 text-${main}-400 border border-${main}-500/30">${isIncome ? '📥 PEMASUKAN' : '📤 PENGELUARAN'}</span>
    </div>
    <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Status:</span><b class="text-emerald-400">✅ BERHASIL</b></div>
    <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Jenis:</span><b class="text-${main}-400">${isIncome ? '📥 Pemasukan' : '📤 Pengeluaran'}</b></div>
    <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Tanggal & Waktu:</span><b class="text-white text-right">${escapeHtml(formatTransactionDateTime(tx))}</b></div>
    <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Nama/Keterangan:</span><b class="text-white text-right break-words">${escapeHtml(tx.nama_pembayar || '-')}</b></div>
    <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Kategori:</span><b class="text-cyan-400 text-right">${escapeHtml(tx.kategori || '-')}</b></div>
    <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Jumlah:</span><b class="text-${main}-400">${formatRupiah(tx.jumlah_bayar || 0)}</b></div>
    ${tx.keterangan ? `<div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Catatan:</span><span class="text-slate-300 italic text-right">${escapeHtml(tx.keterangan)}</span></div>` : ''}
  </div>`;
};

export const broadcastKasChange = async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', payloadData: any) => {
  const payload = {
    eventType,
    new: eventType !== 'DELETE' ? payloadData : null,
    old: eventType !== 'INSERT' ? payloadData : null,
  };

  broadcastDataChange('kas_pb', eventType, payloadData);
  if (localBroadcastChannel) localBroadcastChannel.postMessage(payload);

  try {
    if (activeGlobalChannel) {
      await activeGlobalChannel.send({ type: 'broadcast', event: 'kas-changed', payload });
      return;
    }
    const channel = supabase.channel('global-kas-broadcast', { config: { broadcast: { self: true } } });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'kas-changed', payload }).then(() => {
          setTimeout(() => supabase.removeChannel(channel), 5000);
        });
      }
    });
  } catch (error) {
    console.error('[Realtime-Broadcast] Failed:', error);
  }
};

export default function KasRealtimeNotifier() {
  useEffect(() => {
    const handlePayload = async (payload: any) => {
      const eventTx = payload.new || payload.old || null;
      const eventType = payload.eventType || payload.event || 'UPDATE';
      const recordId = eventTx?.id || 'gen_' + Date.now();
      const eventKey = `${eventType}-${recordId}-${eventTx?.jumlah_bayar || 0}`;

      if (processedEvents.has(eventKey)) return;
      processedEvents.add(eventKey);
      setTimeout(() => processedEvents.delete(eventKey), 3000);
      window.dispatchEvent(new CustomEvent('kas-updated', { detail: payload }));

      try {
        const { startDate, endDate } = getActiveKasFilter();
        const { data: allKas, error } = await supabase
          .from('kas_pb')
          .select('*')
          .order('tanggal_transaksi', { ascending: true });

        const kasList = !error && Array.isArray(allKas) ? allKas : (() => {
          try { return JSON.parse(localStorage.getItem('cached_kas_pb') || '[]'); } catch { return []; }
        })();

        const sortedKasList = sortKas(kasList);
        const reportItems = sortedKasList.filter(item => isInFilter(item, startDate, endDate));

        // IMPORTANT: penerimaan dan pengeluaran terbaru dihitung SECARA TERPISAH
        // dari seluruh transaksi yang berada di filter aktif. Jadi transaksi yang
        // memicu realtime tidak menggantikan detail transaksi dari sisi lainnya.
        const latestIncome = getLatestTransaction(reportItems, true);
        const latestExpense = getLatestTransaction(reportItems, false);
        const eventInFilter = !!eventTx && isInFilter(eventTx, startDate, endDate);
        const eventIsMasuk = eventTx ? checkIsMasuk(eventTx) : null;

        const saldoSebelumnya = sortedKasList
          .filter(item => String(item.tanggal_transaksi || '').slice(0, 10) < startDate)
          .reduce((acc, item) => acc + (checkIsMasuk(item) ? 1 : -1) * Number(item.jumlah_bayar || 0), 0);

        const pemasukanPeriode = reportItems
          .filter(checkIsMasuk)
          .reduce((acc, item) => acc + Number(item.jumlah_bayar || 0), 0);
        const pengeluaranPeriode = reportItems
          .filter(item => !checkIsMasuk(item))
          .reduce((acc, item) => acc + Number(item.jumlah_bayar || 0), 0);
        const saldoAkhir = saldoSebelumnya + pemasukanPeriode - pengeluaranPeriode;
        const modalTetap = 600000;
        const saldoBendahara = saldoAkhir - modalTetap;

        const titleText = eventInFilter
          ? (eventType === 'INSERT' ? 'TRANSAKSI KAS BARU!' : eventType === 'DELETE' ? 'TRANSAKSI KAS DIHAPUS!' : 'UPDATE KAS TERBARU!')
          : 'LAPORAN KAS TERBARU';

        const waText = `📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\n\n` +
          transactionWaBlock('*Detail Transaksi Penerimaan Terbaru:*', latestIncome, true) +
          transactionWaBlock('*Detail Transaksi Pengeluaran Terbaru:*', latestExpense, false) +
          `*Status Keuangan Klub (Filter ${startDate} s/d ${endDate}):*\n` +
          `• Saldo Sebelumnya: ${formatRupiah(saldoSebelumnya)}\n` +
          `• Total Pemasukan Periode: ${formatRupiah(pemasukanPeriode)}\n` +
          `• Total Pengeluaran Periode: ${formatRupiah(pengeluaranPeriode)}\n` +
          `• Detail Pemasukan Terakhir: ${latestIncome ? `${latestIncome.nama_pembayar || latestIncome.kategori} — ${formatRupiah(latestIncome.jumlah_bayar || 0)}` : 'Nihil'}\n` +
          `• Detail Pengeluaran Terakhir: ${latestExpense ? `${latestExpense.nama_pembayar || latestExpense.kategori} — ${formatRupiah(latestExpense.jumlah_bayar || 0)}` : 'Nihil'}\n` +
          `• *Sisa Saldo Akhir: ${formatRupiah(saldoAkhir)}*\n` +
          `  - Modal Tetap (Pengelola Bola): ${formatRupiah(modalTetap)}\n` +
          `  - Kas Bendahara: ${formatRupiah(saldoBendahara)}\n\n` +
          `🔗 *Akses Kas Klub:* ${window.location.origin}/kas\n\n` +
          `Admin PB Bilibili 162`;

        const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
        const eventDetailHtml = eventInFilter && eventTx
          ? `<div class="p-2.5 rounded-xl border border-cyan-500/20 bg-cyan-950/20 mb-2">
              <div class="text-[9px] text-cyan-400 font-black uppercase tracking-wider mb-1">Transaksi Realtime Pemicu</div>
              <div class="text-[10px] text-slate-300">${eventIsMasuk ? '📥 Pemasukan' : '📤 Pengeluaran'} · <b class="text-white">${escapeHtml(eventTx.nama_pembayar || eventTx.kategori || '-')}</b> · ${formatRupiah(eventTx.jumlah_bayar || 0)}</div>
            </div>`
          : '';

        const loadedHtml = `<div class="text-left text-[11px] text-slate-300 space-y-2">
          ${eventDetailHtml}
          ${transactionHtmlBlock('Detail Transaksi Penerimaan Terbaru', latestIncome, true)}
          ${transactionHtmlBlock('Detail Transaksi Pengeluaran Terbaru', latestExpense, false)}
          <div class="p-3 rounded-xl bg-[#0b1220] border border-slate-800 space-y-2">
            <div class="text-[9px] text-cyan-400 font-black uppercase">STATUS KEUANGAN PB BILIBILI 162</div>
            <div class="grid grid-cols-2 gap-1.5">
              <div class="p-2 rounded-lg bg-slate-900 border border-slate-800"><div class="text-[8px] text-slate-400 uppercase">Saldo Sebelumnya</div><b class="text-slate-200">${formatRupiah(saldoSebelumnya)}</b></div>
              <div class="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20"><div class="text-[8px] text-emerald-400 uppercase">Pemasukan</div><b class="text-emerald-400">${formatRupiah(pemasukanPeriode)}</b></div>
              <div class="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20"><div class="text-[8px] text-rose-400 uppercase">Pengeluaran</div><b class="text-rose-400">${formatRupiah(pengeluaranPeriode)}</b></div>
              <div class="p-2 rounded-lg bg-blue-950/30 border border-blue-500/20"><div class="text-[8px] text-cyan-300 uppercase">Saldo Akhir Kas</div><b class="text-cyan-300">${formatRupiah(saldoAkhir)}</b></div>
            </div>
            <div class="text-[9px] text-slate-400 border-t border-white/5 pt-2">Filter aktif: <b class="text-white">${escapeHtml(startDate)} s/d ${escapeHtml(endDate)}</b></div>
            <div class="text-[9px] text-slate-400">Modal Tetap: ${formatRupiah(modalTetap)} · Kas Bendahara: <b class="text-cyan-300">${formatRupiah(saldoBendahara)}</b></div>
          </div>
          <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[11px] font-extrabold text-white uppercase tracking-wider no-underline">💬 KIRIM LAPORAN KE WHATSAPP</a>
        </div>`;

        Swal.fire({
          title: `<div class="flex items-center justify-between gap-2"><span class="text-white font-black uppercase text-[11px] sm:text-xs">${titleText}</span><span class="px-2 py-0.5 rounded text-[8px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">LIVE KAS</span></div>`,
          html: loadedHtml,
          position: 'top-end',
          showConfirmButton: false,
          timer: 15000,
          timerProgressBar: true,
          background: '#070d1a',
          color: '#fff',
          toast: true,
          customClass: {
            popup: 'border border-cyan-500/30 rounded-2xl shadow-2xl p-3 !max-w-[390px] w-[94vw] max-h-[88vh] overflow-y-auto',
            container: 'z-[9999999]'
          }
        });

        if (eventTx && eventInFilter) {
          const fcmBody = `${eventIsMasuk ? 'Pemasukan' : 'Pengeluaran'}: ${eventTx.nama_pembayar || eventTx.kategori} sebesar ${formatRupiah(eventTx.jumlah_bayar || 0)}. Saldo akhir: ${formatRupiah(saldoAkhir)}`;
          triggerPushNotification(titleText, fcmBody, 'kas');
        }
      } catch (error) {
        console.warn('[Realtime-Notifier] Summary calculation failed:', error);
      }
    };

    const handleLocalBroadcast = (event: MessageEvent) => handlePayload(event.data);
    if (localBroadcastChannel) localBroadcastChannel.addEventListener('message', handleLocalBroadcast);

    const handleShowKasPopup = () => handlePayload({ eventType: 'UPDATE', new: null, old: null });
    window.addEventListener('show-kas-popup', handleShowKasPopup);

    const broadcastChannel = supabase
      .channel('global-kas-broadcast', { config: { broadcast: { self: true } } })
      .on('broadcast', { event: 'kas-changed' }, (response: any) => {
        if (response.payload) handlePayload(response.payload);
      });

    const dbChannel = supabase
      .channel('global-kas-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kas_pb' }, (payload: any) => handlePayload(payload));

    broadcastChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') activeGlobalChannel = broadcastChannel;
    });
    dbChannel.subscribe();

    return () => {
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
      activeGlobalChannel = null;
      window.removeEventListener('show-kas-popup', handleShowKasPopup);
      if (localBroadcastChannel) localBroadcastChannel.removeEventListener('message', handleLocalBroadcast);
    };
  }, []);

  return null;
}
