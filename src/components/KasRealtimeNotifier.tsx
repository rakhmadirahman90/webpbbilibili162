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
  tx.jenis_transaksi === 'Masuk' || (tx.kategori && DAFTAR_PEMASUKAN.includes(tx.kategori))
);

const formatRupiah = (num: number | null | undefined) => {
  const val = num !== null && num !== undefined && !isNaN(Number(num)) ? Number(num) : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(val);
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) {
    return new Date().toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }) + ' WITA';
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const hasTime = dateStr.includes('T') || dateStr.includes(':');
    if (!hasTime) return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    return d.toLocaleString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false
    }) + ' WITA';
  } catch {
    return dateStr;
  }
};

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Read the actual KasManager filter currently visible on screen. */
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
  const startInput = dateInputs.find(input => {
    const text = input.parentElement?.innerText || input.closest('div')?.innerText || '';
    return /Dari\s*:/i.test(text);
  });
  const endInput = dateInputs.find(input => {
    const text = input.parentElement?.innerText || input.closest('div')?.innerText || '';
    return /Sampai\s*:/i.test(text);
  });

  if (!start && startInput?.value) start = startInput.value;
  if (!end && endInput?.value) end = endInput.value;

  return {
    startDate: start || firstDay,
    endDate: end || today
  };
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
      const record = payload.new || payload.old;
      const recordId = record?.id || 'gen_' + Date.now();
      const eventKey = `${payload.eventType}-${recordId}-${record?.jumlah_bayar || 0}`;

      if (processedEvents.has(eventKey)) return;
      processedEvents.add(eventKey);
      setTimeout(() => processedEvents.delete(eventKey), 3000);

      window.dispatchEvent(new CustomEvent('kas-updated', { detail: payload }));

      const newTx = payload.new || payload.old;
      const eventType = payload.eventType;
      const isMasuk = newTx ? checkIsMasuk(newTx) : null;
      const titleText = eventType === 'INSERT'
        ? 'Transaksi Kas Baru!'
        : eventType === 'DELETE' ? 'Transaksi Kas Dihapus!' : 'Update Kas Terbaru!';

      const badge = isMasuk === null ? 'LIVE SYNC' : (isMasuk ? '📥 Pemasukan' : '📤 Pengeluaran');
      const txDetailText = newTx ? `
        <div class="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-1.5 mb-2">
          <div class="flex items-center justify-between text-[9px] text-slate-400 pb-1 border-b border-white/5">
            <span class="font-bold uppercase tracking-wider">Detail Transaksi</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] font-black ${isMasuk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}">${badge}</span>
          </div>
          <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Nama/Keterangan:</span><b class="text-white text-right break-words">${newTx.nama_pembayar || '-'}</b></div>
          <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Jenis:</span><b class="${isMasuk ? 'text-emerald-400' : 'text-rose-400'}">${isMasuk ? 'Pemasukan' : 'Pengeluaran'}</b></div>
          <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Kategori:</span><b class="text-cyan-400 text-right">${newTx.kategori || '-'}</b></div>
          <div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Jumlah:</span><b class="${isMasuk ? 'text-emerald-400' : 'text-rose-400'}">${formatRupiah(newTx.jumlah_bayar || 0)}</b></div>
          ${newTx.keterangan ? `<div class="flex justify-between gap-2 text-[10px]"><span class="text-slate-400">Catatan:</span><span class="text-slate-300 italic text-right">${newTx.keterangan}</span></div>` : ''}
          <div class="flex justify-between gap-2 text-[9px] pt-1 border-t border-white/5"><span class="text-slate-400">Tanggal & Waktu:</span><span class="text-slate-300 text-right">${formatDateTime(newTx.created_at || newTx.tanggal_transaksi)}</span></div>
        </div>` : '';

      Swal.fire({
        title: `<div class="flex items-center justify-between gap-2"><span class="text-white font-black uppercase text-[11px] sm:text-xs">${titleText}</span><span class="px-2 py-0.5 rounded text-[8px] font-black bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">${badge}</span></div>`,
        html: `<div class="text-left text-[11px] text-slate-300">${txDetailText}<div class="p-4 rounded-xl bg-[#0b1220] border border-slate-800 text-center"><div class="w-5 h-5 mx-auto border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div><div class="text-[9px] mt-2 text-cyan-400 uppercase font-bold">Sinkronisasi saldo...</div></div></div>`,
        position: 'top-end', showConfirmButton: false, timer: 9000, timerProgressBar: true,
        background: '#070d1a', color: '#fff', toast: true,
        customClass: { popup: 'border border-cyan-500/30 rounded-2xl shadow-2xl p-3 !max-w-[380px] w-[92vw] max-h-[85vh] overflow-y-auto', container: 'z-[9999999]' }
      });

      try {
        const { data: allKas, error } = await supabase.from('kas_pb').select('*').order('tanggal_transaksi', { ascending: true });
        const kasList = !error && Array.isArray(allKas) ? allKas : (() => {
          try { return JSON.parse(localStorage.getItem('cached_kas_pb') || '[]'); } catch { return []; }
        })();

        const { startDate, endDate } = getActiveKasFilter();
        const sortedKasList = [...kasList].sort((a, b) => {
          const dateCmp = String(a.tanggal_transaksi || '').localeCompare(String(b.tanggal_transaksi || ''));
          if (dateCmp !== 0) return dateCmp;
          return String(a.created_at || a.id || '').localeCompare(String(b.created_at || b.id || ''));
        });

        // EXACTLY the same period as the KasManager filter: opening balance before start + all filtered income/expense.
        const saldoSebelumnya = sortedKasList
          .filter(item => item.tanggal_transaksi < startDate)
          .reduce((acc, item) => acc + (checkIsMasuk(item) ? 1 : -1) * Number(item.jumlah_bayar || 0), 0);

        const reportItems = sortedKasList.filter(item => item.tanggal_transaksi >= startDate && item.tanggal_transaksi <= endDate);
        const pemasukanPeriode = reportItems.filter(checkIsMasuk).reduce((acc, item) => acc + Number(item.jumlah_bayar || 0), 0);
        const pengeluaranPeriode = reportItems.filter(item => !checkIsMasuk(item)).reduce((acc, item) => acc + Number(item.jumlah_bayar || 0), 0);
        const saldoAkhir = saldoSebelumnya + pemasukanPeriode - pengeluaranPeriode;
        const modalTetap = 600000;
        const saldoBendahara = saldoAkhir - modalTetap;

        const incomeItems = reportItems.filter(checkIsMasuk);
        const expenseItems = reportItems.filter(item => !checkIsMasuk(item));
        const latestIncome = incomeItems.length ? [...incomeItems].sort((a, b) => String(b.created_at || b.tanggal_transaksi).localeCompare(String(a.created_at || a.tanggal_transaksi)))[0] : null;
        const latestExpense = expenseItems.length ? [...expenseItems].sort((a, b) => String(b.created_at || b.tanggal_transaksi).localeCompare(String(a.created_at || a.tanggal_transaksi)))[0] : null;

        const waText = `📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\n\n` +
          (newTx ? `*Detail Transaksi Terbaru:*\n` +
          `• Status: ${eventType === 'DELETE' ? '❌ DIHAPUS' : '✅ BERHASIL'}\n` +
          `• Jenis: ${isMasuk ? '📥 Pemasukan' : '📤 Pengeluaran'}\n` +
          `• Tanggal & Waktu: *${formatDateTime(newTx.created_at || newTx.tanggal_transaksi)}*\n` +
          `• Nama/Keterangan: *${newTx.nama_pembayar || '-'}*\n` +
          `• Kategori: ${newTx.kategori || '-'}\n` +
          `• Jumlah: *${formatRupiah(newTx.jumlah_bayar || 0)}*\n` +
          (newTx.keterangan ? `• Catatan: ${newTx.keterangan}\n` : '') + `\n` : '') +
          `*Status Keuangan Klub (Sesuai Filter ${startDate} s/d ${endDate}):*\n` +
          `• Saldo Sebelumnya: ${formatRupiah(saldoSebelumnya)}\n` +
          `• Total Pemasukan Periode: ${formatRupiah(pemasukanPeriode)}\n` +
          `• Total Pengeluaran Periode: ${formatRupiah(pengeluaranPeriode)}\n` +
          `• Detail Pemasukan Terakhir: ${latestIncome ? `${latestIncome.nama_pembayar || latestIncome.kategori} — ${formatRupiah(latestIncome.jumlah_bayar || 0)}` : '-'}\n` +
          `• Detail Pengeluaran Terakhir: ${latestExpense ? `${latestExpense.nama_pembayar || latestExpense.kategori} — ${formatRupiah(latestExpense.jumlah_bayar || 0)}` : '-'}\n` +
          `• *Sisa Saldo Akhir: ${formatRupiah(saldoAkhir)}*\n` +
          `  - Modal Tetap (Pengelola Bola): ${formatRupiah(modalTetap)}\n` +
          `  - Kas Bendahara: ${formatRupiah(saldoBendahara)}\n\n` +
          `🔗 *Akses Kas Klub:* ${window.location.origin}/kas\n\n` +
          `Admin PB Bilibili 162`;

        const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
        const incomeHtml = latestIncome ? `<div class="text-[9px] text-emerald-300">Pemasukan terakhir: <b>${latestIncome.nama_pembayar || latestIncome.kategori}</b> — ${formatRupiah(latestIncome.jumlah_bayar || 0)}</div>` : '';
        const expenseHtml = latestExpense ? `<div class="text-[9px] text-rose-300">Pengeluaran terakhir: <b>${latestExpense.nama_pembayar || latestExpense.kategori}</b> — ${formatRupiah(latestExpense.jumlah_bayar || 0)}</div>` : '';

        const loadedHtml = `<div class="text-left text-[11px] text-slate-300 space-y-2">
          ${txDetailText}
          <div class="p-3 rounded-xl bg-[#0b1220] border border-slate-800 space-y-2">
            <div class="text-[9px] text-cyan-400 font-black uppercase">Status Keuangan PB Bilibili</div>
            <div class="grid grid-cols-2 gap-1.5">
              <div class="p-2 rounded-lg bg-slate-900 border border-slate-800"><div class="text-[8px] text-slate-400 uppercase">Saldo Sebelumnya</div><b class="text-slate-200">${formatRupiah(saldoSebelumnya)}</b></div>
              <div class="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20"><div class="text-[8px] text-emerald-400 uppercase">Pemasukan</div><b class="text-emerald-400">${formatRupiah(pemasukanPeriode)}</b></div>
              <div class="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20"><div class="text-[8px] text-rose-400 uppercase">Pengeluaran</div><b class="text-rose-400">${formatRupiah(pengeluaranPeriode)}</b></div>
              <div class="p-2 rounded-lg bg-blue-950/30 border border-blue-500/20"><div class="text-[8px] text-cyan-300 uppercase">Saldo Akhir Kas</div><b class="text-cyan-300">${formatRupiah(saldoAkhir)}</b></div>
            </div>
            ${incomeHtml}${expenseHtml}
            <div class="text-[9px] text-slate-400 border-t border-white/5 pt-2">Filter aktif: <b class="text-white">${startDate} s/d ${endDate}</b></div>
            <div class="text-[9px] text-slate-400">Modal Tetap: ${formatRupiah(modalTetap)} · Kas Bendahara: <b class="text-cyan-300">${formatRupiah(saldoBendahara)}</b></div>
          </div>
          <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[11px] font-extrabold text-white uppercase tracking-wider no-underline">💬 Kirim Laporan ke WhatsApp</a>
        </div>`;

        if (Swal.isVisible()) Swal.update({ html: loadedHtml });

        if (newTx) {
          const fcmBody = `${isMasuk ? 'Pemasukan' : 'Pengeluaran'}: ${newTx.nama_pembayar || newTx.kategori} sebesar ${formatRupiah(newTx.jumlah_bayar || 0)}. Saldo akhir: ${formatRupiah(saldoAkhir)}`;
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
