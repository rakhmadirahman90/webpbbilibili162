import { useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { triggerPushNotification } from '../utils/firebaseMessaging';
import { broadcastDataChange } from '../utils/realtimeHelper';

// Set to track processed events and prevent double popup triggers (from both postgres_changes and manual broadcast)
const processedEvents = new Set<string>();

// Active reference to the main global channel to avoid teardown conflicts
let activeGlobalChannel: any = null;

// HTML5 BroadcastChannel for instant local cross-tab communication
const localBroadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('kas-realtime-channel')
  : null;

export const broadcastKasChange = async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', payloadData: any) => {
  console.log('[Realtime-Broadcast] Attempting to broadcast change:', { eventType, payloadData });
  const payload = {
    eventType,
    new: eventType !== 'DELETE' ? payloadData : null,
    old: eventType !== 'INSERT' ? payloadData : null,
  };

  // 1. Instantly trigger over HTML5 BroadcastChannel & Universal Realtime Helper for zero-latency local testing
  broadcastDataChange('kas_pb', eventType, payloadData);
  if (localBroadcastChannel) {
    console.log('[Realtime-Broadcast] Broadcasting instantly via HTML5 BroadcastChannel...');
    localBroadcastChannel.postMessage(payload);
  }

  // 2. Broadcast over Supabase Realtime channel
  try {
    if (activeGlobalChannel) {
      console.log('[Realtime-Broadcast] Reusing active global channel to broadcast to other devices...');
      await activeGlobalChannel.send({
        type: 'broadcast',
        event: 'kas-changed',
        payload
      });
      console.log('[Realtime-Broadcast] Broadcast sent successfully via active global channel.');
    } else {
      console.log('[Realtime-Broadcast] No active global channel found. Creating temporary channel...');
      const channel = supabase.channel('global-kas-broadcast', {
        config: {
          broadcast: { self: true }
        }
      });

      channel.subscribe((status) => {
        console.log(`[Realtime-Broadcast] Temporary Channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'kas-changed',
            payload
          }).then(() => {
            // Give 5 seconds buffer to ensure the WebSocket frames are successfully pushed out
            setTimeout(() => {
              supabase.removeChannel(channel);
              console.log('[Realtime-Broadcast] Temporary channel cleaned up.');
            }, 5000);
          });
        }
      });
    }
  } catch (error) {
    console.error('[Realtime-Broadcast] Critical failure in sending real-time broadcast:', error);
  }
};

export default function KasRealtimeNotifier() {
  useEffect(() => {
    console.log('[Realtime-Notifier] Mounting KasRealtimeNotifier. Setting up real-time listener...');

    const handlePayload = (payload: any) => {
      console.log('[Realtime-Notifier] Received live payload to process:', payload);
      const record = payload.new || payload.old;
      const recordId = record?.id || 'gen_' + Date.now();
      const eventKey = `${payload.eventType}-${recordId}-${record?.jumlah_bayar || 0}`;

      if (processedEvents.has(eventKey)) {
        console.log(`[Realtime-Notifier] Event with key "${eventKey}" already processed. Skipping duplicate trigger.`);
        return;
      }

      console.log(`[Realtime-Notifier] Processing new unique event: ${eventKey}`);
      processedEvents.add(eventKey);
      setTimeout(() => {
        processedEvents.delete(eventKey);
        console.log(`[Realtime-Notifier] Cleared event key "${eventKey}" from deduplication list.`);
      }, 3000);

      // 1. Dispatch custom event globally so other active components (like tables) can refresh state
      console.log('[Realtime-Notifier] Dispatching global "kas-updated" CustomEvent.');
      window.dispatchEvent(new CustomEvent('kas-updated', { detail: payload }));

      // 2. Setup format and styling utilities
      const formatRupiah = (num: number | null | undefined) => {
        const val = num !== null && num !== undefined && !isNaN(Number(num)) ? Number(num) : 0;
        return new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      };

      const formatDateTime = (dateStr?: string) => {
        if (!dateStr) {
          const now = new Date();
          return now.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }) + ' WITA';
        }
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return dateStr;
          
          const hasTime = dateStr.includes('T') || dateStr.includes(':');
          if (!hasTime) {
            return d.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            });
          }
          
          return d.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }) + ' WITA';
        } catch (e) {
          return dateStr;
        }
      };

      const DAFTAR_PEMASUKAN = [
        'Iuran Bulanan Tetap (10k)',
        'Pembayaran Iuran Binaan',
        'Pembayaran Shuttlecock',
        'Pendaftaran Atlet Baru',
        'Sumbangan Sukarela'
      ];

      const checkIsMasuk = (tx: any) => {
        if (!tx) return false;
        return tx.jenis_transaksi === 'Masuk' || (tx.kategori && DAFTAR_PEMASUKAN.includes(tx.kategori));
      };

      const newTx = payload.new || payload.old;
      const eventType = payload.eventType;

      let titleText = 'Update Kas Terbaru!';
      let txDetailText = '';

      if (eventType === 'INSERT') {
        titleText = 'Transaksi Kas Baru!';
      } else if (eventType === 'DELETE') {
        titleText = 'Transaksi Kas Dihapus!';
      }

      const isMasuk = newTx ? checkIsMasuk(newTx) : null;

      if (newTx) {
        const badgeBg = isMasuk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
        const badgeText = isMasuk ? 'Pemasukan' : 'Pengeluaran';
        
        txDetailText = `
          <div class="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 space-y-1.5 mb-2">
            <div class="flex items-center justify-between text-[9px] text-slate-400 pb-1 border-b border-white/5">
              <span class="font-bold uppercase tracking-wider text-slate-400">Detail Transaksi</span>
              <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wide ${badgeBg}">${badgeText}</span>
            </div>
            <div class="flex items-start justify-between gap-2 text-[10px]">
              <span class="text-slate-400 shrink-0">Keterangan:</span>
              <span class="font-bold text-white text-right break-words max-w-[180px]">${newTx.nama_pembayar || '-'}</span>
            </div>
            <div class="flex items-center justify-between gap-2 text-[10px]">
              <span class="text-slate-400 shrink-0">Kategori:</span>
              <span class="font-semibold text-cyan-400 text-right">${newTx.kategori || '-'}</span>
            </div>
            <div class="flex items-center justify-between gap-2 text-[10px]">
              <span class="text-slate-400 shrink-0">Nominal:</span>
              <span class="font-black text-xs ${isMasuk ? 'text-emerald-400' : 'text-rose-400'} tabular-nums text-right">${formatRupiah(newTx.jumlah_bayar || 0)}</span>
            </div>
            ${newTx.keterangan ? `
            <div class="flex items-start justify-between gap-2 text-[10px]">
              <span class="text-slate-400 shrink-0">Catatan:</span>
              <span class="font-medium text-slate-300 italic text-right break-words max-w-[180px]">${newTx.keterangan}</span>
            </div>
            ` : ''}
            <div class="flex items-center justify-between gap-2 text-[9px] pt-1 border-t border-white/5 text-slate-400">
              <span>Waktu:</span>
              <span class="font-medium text-slate-300 text-right">${formatDateTime(newTx.created_at || newTx.tanggal_transaksi)}</span>
            </div>
          </div>
        `;
      }

      // SHOW SWAL NOTIFICATION IMMEDIATELY (0ms DELAY)
      const initialHtml = `
        <div class="text-left font-sans text-[11px] text-slate-300 mt-1 space-y-2">
          ${txDetailText}
          <div class="space-y-2 bg-[#0b1220] p-4 rounded-xl border border-slate-800/80 shadow-inner flex flex-col items-center justify-center min-h-[140px]">
            <div class="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-[9px] font-bold text-cyan-400/80 uppercase tracking-widest animate-pulse">Menghitung Saldo Kas...</span>
          </div>
        </div>
      `;

      let titleHtml = '';
      let borderClass = 'border-cyan-500/30';

      if (isMasuk !== null) {
        const colorBg = isMasuk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30';
        const dotColor = isMasuk ? 'bg-emerald-400' : 'bg-rose-400';
        borderClass = isMasuk ? 'border-emerald-500/40 shadow-emerald-950/30' : 'border-rose-500/40 shadow-rose-950/30';

        titleHtml = `
          <div class="flex items-center justify-between w-full pr-1 gap-2">
            <div class="flex items-center gap-2 text-white font-black uppercase tracking-wider text-[11px] sm:text-xs">
              <span class="relative flex h-2 w-2 shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${isMasuk ? 'bg-emerald-400 opacity-75' : 'bg-rose-400 opacity-75'}"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 ${dotColor}"></span>
              </span>
              ${titleText}
            </div>
            <span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${colorBg} border shrink-0">
              ${isMasuk ? '📥 Pemasukan' : '📤 Pengeluaran'}
            </span>
          </div>
        `;
      } else {
        titleHtml = `
          <div class="flex items-center justify-between w-full pr-1 gap-2">
            <div class="flex items-center gap-2 text-white font-black uppercase tracking-wider text-[11px] sm:text-xs">
              <span class="relative flex h-2 w-2 shrink-0">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
              </span>
              ${titleText}
            </div>
            <span class="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
              LIVE SYNC
            </span>
          </div>
        `;
      }

      // Close schedule popup if open to prevent screen clutter/overlap
      window.dispatchEvent(new Event('pb-close-schedule'));

      Swal.fire({
        title: titleHtml,
        html: initialHtml,
        position: 'top-end',
        showConfirmButton: false,
        timer: 9000,
        timerProgressBar: true,
        background: '#070d1a',
        color: '#fff',
        toast: true,
        customClass: {
          popup: `border ${borderClass} rounded-2xl shadow-2xl shadow-black/90 p-2.5 sm:p-3.5 !max-w-[360px] w-[92vw] sm:w-[360px] max-h-[85vh] overflow-y-auto custom-scrollbar`,
          container: 'z-[9999999]'
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
          
          const progressBar = toast.querySelector('.swal2-timer-progress-bar') as HTMLElement;
          if (progressBar) {
            if (isMasuk === true) {
              progressBar.style.backgroundColor = '#10b981';
            } else if (isMasuk === false) {
              progressBar.style.backgroundColor = '#f43f5e';
            } else {
              progressBar.style.backgroundColor = '#06b6d4';
            }
          }
        }
      });

      // 3. FETCH DATABASE BALANCES ASYNC IN THE BACKGROUND
      const fetchKasListAsync = async () => {
        let kasList: any[] = [];
        try {
          const { data: allKas, error } = await supabase
            .from('kas_pb')
            .select('*')
            .order('tanggal_transaksi', { ascending: true });

          if (!error && allKas && Array.isArray(allKas) && allKas.length > 0) {
            kasList = allKas;
            try { localStorage.setItem('cached_kas_pb', JSON.stringify(allKas)); } catch (e) {}
          } else {
            if (error) {
              console.warn('[Realtime-Notifier] Supabase fetch fallback to local cache:', error.message || error);
            }
            const cached = localStorage.getItem('cached_kas_pb');
            if (cached) kasList = JSON.parse(cached);
          }
        } catch (err: any) {
          console.warn('[Realtime-Notifier] Network notice, using cached database state:', err?.message || err);
          try {
            const cached = localStorage.getItem('cached_kas_pb');
            if (cached) kasList = JSON.parse(cached);
          } catch (e) {}
        }

        try {
          // Sort stably by tanggal_transaksi ascending, then by id / created_at if available
          const sortedKasList = [...kasList].sort((a, b) => {
            const dateA = a.tanggal_transaksi || '';
            const dateB = b.tanggal_transaksi || '';
            if (dateA !== dateB) {
              return dateA.localeCompare(dateB);
            }
            const idA = String(a.id || '');
            const idB = String(b.id || '');
            return idA.localeCompare(idB);
          });

          // Compute running balances
          let runningBalance = 0;
          const itemBalances = new Map<string, { balanceBefore: number, balanceAfter: number }>();

          sortedKasList.forEach((item) => {
            const amt = item.jumlah_bayar || 0;
            const isMasuk = checkIsMasuk(item);
            const change = isMasuk ? amt : -amt;
            
            const balanceBefore = runningBalance;
            runningBalance += change;
            const balanceAfter = runningBalance;
            
            if (item.id) {
              itemBalances.set(String(item.id), { balanceBefore, balanceAfter });
            }
          });

          // Calculate fields matching the club's financial dashboard (as shown in the user's attached image)
          const maxDate = sortedKasList.length > 0 
            ? sortedKasList[sortedKasList.length - 1].tanggal_transaksi 
            : new Date().toISOString().split('T')[0];

          // 1. Saldo Sebelumnya (cumulative cash balance accumulated before the latest update date)
          const saldoSebelumnya = sortedKasList
            .filter(item => item.tanggal_transaksi < maxDate)
            .reduce((acc, curr) => {
              const isMasuk = checkIsMasuk(curr);
              return isMasuk ? acc + (curr.jumlah_bayar || 0) : acc - (curr.jumlah_bayar || 0);
            }, 0);

          // 2. Pemasukan (Pemasukan Terbaru per tanggal transaksi terakhir)
          const pemasukanBulanIni = sortedKasList
            .filter(item => item.tanggal_transaksi === maxDate && checkIsMasuk(item))
            .reduce((acc, curr) => acc + (curr.jumlah_bayar || 0), 0);

          // 3. Pengeluaran (Pengeluaran Terbaru per tanggal transaksi terakhir)
          const pengeluaranBulanIni = sortedKasList
            .filter(item => item.tanggal_transaksi === maxDate && !checkIsMasuk(item))
            .reduce((acc, curr) => acc + (curr.jumlah_bayar || 0), 0);

          // 4. Saldo Akhir Kas
          const sisaSaldoAkhir = saldoSebelumnya + pemasukanBulanIni - pengeluaranBulanIni;

          const modalTetap = 600000;
          const saldoBendahara = sisaSaldoAkhir - modalTetap;

          const incomes = sortedKasList.filter(k => checkIsMasuk(k));
          const latestIncome = incomes.length > 0 ? incomes[incomes.length - 1] : null;

          const expenses = sortedKasList.filter(k => !checkIsMasuk(k));
          const latestExpense = expenses.length > 0 ? expenses[expenses.length - 1] : null;

          const incomeDetail = latestIncome 
            ? `<span class="font-bold text-emerald-400">${formatRupiah(latestIncome.jumlah_bayar)}</span> <span class="text-slate-500 text-[9px]">(${latestIncome.nama_pembayar || latestIncome.kategori})</span>`
            : '<span class="text-slate-500 font-medium">-</span>';

          const expenseDetail = latestExpense
            ? `<span class="font-bold text-rose-400">${formatRupiah(latestExpense.jumlah_bayar)}</span> <span class="text-slate-500 text-[9px]">(${latestExpense.nama_pembayar || latestExpense.kategori})</span>`
            : '<span class="text-slate-500 font-medium">-</span>';

          let waText = '';
          if (newTx) {
            const isMasuk = checkIsMasuk(newTx);
            waText = `📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\n\n` +
              `*Detail Transaksi Terbaru:*\n` +
              `• Status: ${eventType === 'DELETE' ? '❌ DIHAPUS' : '✅ BERHASIL'}\n` +
              `• Jenis: ${isMasuk ? '📥 Pemasukan' : '📤 Pengeluaran'}\n` +
              `• Tanggal & Waktu: *${formatDateTime(newTx.created_at || newTx.tanggal_transaksi)}*\n` +
              `• Nama/Keterangan: *${newTx.nama_pembayar || '-'}*\n` +
              `• Kategori: ${newTx.kategori || '-'}\n` +
              `• Jumlah: *${formatRupiah(newTx.jumlah_bayar || 0)}*\n` +
              (newTx.keterangan ? `• Catatan: ${newTx.keterangan}\n\n` : `\n`) +
              `*Status Keuangan Klub (Update Terbaru):*\n` +
              `• Saldo Sebelumnya: ${formatRupiah(saldoSebelumnya)}\n` +
              `• Pemasukan Terbaru: ${formatRupiah(pemasukanBulanIni)}\n` +
              `• Pengeluaran Terbaru: ${formatRupiah(pengeluaranBulanIni)}\n` +
              `• *Sisa Saldo Akhir: ${formatRupiah(sisaSaldoAkhir)}*\n` +
              `  - Modal Tetap (Pengelola Bola): ${formatRupiah(modalTetap)}\n` +
              `  - Kas Bendahara: ${formatRupiah(saldoBendahara)}\n\n` +
              `🔗 *Akses Kas Klub:* ${window.location.origin}/kas\n\n` +
              `Admin PB Bilibili 162`;
          } else {
            waText = `📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\n\n` +
              `• Tanggal & Waktu Laporan: *${formatDateTime()}*\n\n` +
              `*Status Keuangan Klub (Update Terbaru):*\n` +
              `• Saldo Sebelumnya: ${formatRupiah(saldoSebelumnya)}\n` +
              `• Pemasukan Terbaru: ${formatRupiah(pemasukanBulanIni)}\n` +
              `• Pengeluaran Terbaru: ${formatRupiah(pengeluaranBulanIni)}\n` +
              `• *Sisa Saldo Akhir: ${formatRupiah(sisaSaldoAkhir)}*\n` +
              `  - Modal Tetap (Pengelola Bola): ${formatRupiah(modalTetap)}\n` +
              `  - Kas Bendahara: ${formatRupiah(saldoBendahara)}\n\n` +
              `🔗 *Akses Kas Klub:* ${window.location.origin}/kas\n\n` +
              `Admin PB Bilibili 162`;
          }
          const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

          const loadedHtml = `
            <div class="text-left font-sans text-[11px] text-slate-300 mt-1 space-y-2 animate-[fadeIn_0.2s_ease-out]">
              ${txDetailText}
              <div class="space-y-2 bg-[#0b1220] p-3 rounded-xl border border-slate-800/80 shadow-lg">
                <!-- Header Box -->
                <div class="flex items-center justify-between text-[9px] text-slate-400 pb-1.5 border-b border-white/5">
                  <div class="flex items-center gap-1.5 font-bold uppercase tracking-wider text-cyan-400">
                    <svg class="w-3 h-3 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Status Keuangan PB Bilibili</span>
                  </div>
                  <span class="font-medium text-slate-400 tabular-nums">${formatDateTime()}</span>
                </div>
                
                <!-- Dashboard Bento Cards (Tight & Balanced) -->
                <div class="grid grid-cols-2 gap-1.5">
                  <!-- Saldo Sebelumnya -->
                  <div class="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                    <div class="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Saldo Awal</div>
                    <div class="text-[11px] font-bold text-slate-200 mt-0.5 tabular-nums tracking-tight">${formatRupiah(saldoSebelumnya)}</div>
                  </div>
                  <!-- Pemasukan -->
                  <div class="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20 flex flex-col justify-between">
                    <div class="text-[8px] font-bold uppercase text-emerald-400 tracking-wider">Pemasukan</div>
                    <div class="text-[11px] font-extrabold text-emerald-400 mt-0.5 tabular-nums tracking-tight">${formatRupiah(pemasukanBulanIni)}</div>
                  </div>
                  <!-- Pengeluaran -->
                  <div class="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 flex flex-col justify-between">
                    <div class="text-[8px] font-bold uppercase text-rose-400 tracking-wider">Pengeluaran</div>
                    <div class="text-[11px] font-extrabold text-rose-400 mt-0.5 tabular-nums tracking-tight">${formatRupiah(pengeluaranBulanIni)}</div>
                  </div>
                  <!-- Saldo Akhir Kas -->
                  <div class="p-2 rounded-lg bg-gradient-to-br from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 flex flex-col justify-between">
                    <div class="text-[8px] font-extrabold uppercase text-cyan-300 tracking-wider">Saldo Akhir Kas</div>
                    <div class="text-[11px] font-black text-cyan-300 mt-0.5 tabular-nums tracking-tight">${formatRupiah(sisaSaldoAkhir)}</div>
                  </div>
                </div>

                <!-- Breakdown Alokasi -->
                <div class="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80 text-[9px] space-y-1">
                  <div class="flex items-center justify-between text-slate-400">
                    <span class="flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0"></span>
                      <span>Modal Tetap (Pengelola Bola):</span>
                    </span>
                    <span class="font-semibold text-slate-200 tabular-nums">${formatRupiah(modalTetap)}</span>
                  </div>
                  <div class="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                    <span class="flex items-center gap-1.5">
                      <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0"></span>
                      <span class="font-medium">Kas Bendahara:</span>
                    </span>
                    <span class="font-bold text-cyan-400 tabular-nums">${formatRupiah(saldoBendahara)}</span>
                  </div>
                </div>
              </div>

              <!-- Action Button WhatsApp -->
              <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:from-emerald-700 active:to-emerald-600 text-[11px] font-extrabold text-white uppercase tracking-wider text-center no-underline border border-emerald-400/30 shadow-lg shadow-emerald-950/50 transition-all duration-150 active:scale-[0.98]">
                <svg class="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.59 1.975 14.11 1.01 11.477 1.01 6.041 1.01 1.62 5.379 1.615 10.807c-.001 1.702.453 3.361 1.314 4.815L1.96 21.02l5.687-1.488z"/>
                </svg>
                <span>Kirim Laporan ke WhatsApp</span>
              </a>
            </div>
          `;

          // Dynamically swap the skeleton with computed figures
          if (Swal.isVisible()) {
            Swal.update({
              html: loadedHtml
            });
          }

          // Trigger real-time FCM Push Notification (in background)
          if (newTx) {
            const isMasuk = checkIsMasuk(newTx);
            const amtStr = formatRupiah(newTx.jumlah_bayar || 0);
            const detailDesc = newTx.nama_pembayar || '-';
            const fcmBody = `${isMasuk ? 'Pemasukan' : 'Pengeluaran'}: ${detailDesc} sebesar ${amtStr}. Saldo saat ini: ${formatRupiah(sisaSaldoAkhir)}`;
            triggerPushNotification(titleText, fcmBody, 'kas');
          } else {
            triggerPushNotification(titleText, `Sisa Saldo Kas saat ini: ${formatRupiah(sisaSaldoAkhir)}`, 'kas');
          }
        } catch (calcErr) {
          console.warn('[Realtime-Notifier] Error during notification summary calculation:', calcErr);
        }
      };

      fetchKasListAsync();
    };

    // Listen to local BroadcastChannel (cross-tab local events)
    const handleLocalBroadcast = (event: MessageEvent) => {
      console.log('%c[Realtime-Notifier] Received local cross-tab event from BroadcastChannel!', 'color: #3b82f6; font-weight: bold;', event.data);
      handlePayload(event.data);
    };

    if (localBroadcastChannel) {
      localBroadcastChannel.addEventListener('message', handleLocalBroadcast);
    }

    const handleShowKasPopup = () => {
      console.log('[Realtime-Notifier] Manual trigger show-kas-popup received.');
      handlePayload({ eventType: 'UPDATE', new: null, old: null });
    };
    window.addEventListener('show-kas-popup', handleShowKasPopup);

    console.log('[Realtime-Notifier] Subscribing to Supabase broadcast channel "global-kas-broadcast"...');
    const broadcastChannel = supabase
      .channel('global-kas-broadcast', {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'broadcast',
        { event: 'kas-changed' },
        (response: any) => {
          console.log('%c[Realtime-Notifier] Broadcast Event "kas-changed" Received!', 'color: #10b981; font-weight: bold;', response);
          if (response.payload) {
            handlePayload(response.payload);
          }
        }
      );

    broadcastChannel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Broadcast channel active');
      }
    });

    console.log('[Realtime-Notifier] Subscribing to Supabase database channel "global-kas-db-changes"...');
    const dbChannel = supabase
      .channel('global-kas-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kas_pb' },
        (payload: any) => {
          console.log('[Realtime-Notifier] Postgres Change Detected on table "kas_pb"!', payload);
          handlePayload(payload);
        }
      );

    dbChannel.subscribe((status, err) => {
       if (status === 'SUBSCRIBED') {
         console.log('[Realtime] Database channel active');
       }
     });

    // Store globally active channel for broadcasting (uses the reliable broadcast channel)
    activeGlobalChannel = broadcastChannel;

    return () => {
      console.log('[Realtime-Notifier] Unmounting KasRealtimeNotifier. Cleaning up references and channels...');
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbChannel);
      activeGlobalChannel = null;
      window.removeEventListener('show-kas-popup', handleShowKasPopup);
      if (localBroadcastChannel) {
        localBroadcastChannel.removeEventListener('message', handleLocalBroadcast);
      }
    };
  }, []);

  return null;
}
