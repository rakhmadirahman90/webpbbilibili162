import { useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { triggerPushNotification } from '../utils/firebaseMessaging';

// Set to track processed events and prevent double popup triggers (from both postgres_changes and manual broadcast)
const processedEvents = new Set<string>();

export const broadcastKasChange = async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', payloadData: any) => {
  console.log('[Realtime-Broadcast] Attempting to broadcast change:', { eventType, payloadData });
  try {
    const channel = supabase.channel('global-kas-realtime', {
      config: {
        broadcast: { self: true }
      }
    });

    channel.subscribe((status) => {
      console.log(`[Realtime-Broadcast] Channel subscribe status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime-Broadcast] Successfully subscribed! Sending broadcast message...');
        channel.send({
          type: 'broadcast',
          event: 'kas-changed',
          payload: {
            eventType,
            new: eventType !== 'DELETE' ? payloadData : null,
            old: eventType !== 'INSERT' ? payloadData : null,
          }
        }).then((response) => {
          console.log('[Realtime-Broadcast] Broadcast message sent with response status:', response);
          setTimeout(() => {
            supabase.removeChannel(channel);
            console.log('[Realtime-Broadcast] Temporary broadcast channel closed.');
          }, 1500);
        });
      } else {
        console.warn(`[Realtime-Broadcast] Warning: Subscription status is not SUBSCRIBED, currently: ${status}`);
      }
    });
  } catch (error) {
    console.error('[Realtime-Broadcast] Critical failure in sending real-time broadcast:', error);
  }
};

export default function KasRealtimeNotifier() {
  useEffect(() => {
    console.log('[Realtime-Notifier] Mounting KasRealtimeNotifier. Setting up real-time listener for "kas_pb" table...');

    const handlePayload = (payload: any) => {
      console.log('[Realtime-Notifier] Received live payload to process:', payload);
      const record = payload.new || payload.old;
      const recordId = record?.id || 'gen_' + Date.now();
      const eventKey = `${payload.eventType}-${recordId}-${record?.jumlah_bayar || 0}`;

      if (processedEvents.has(eventKey)) {
        console.log(`[Realtime-Notifier] Event with key "${eventKey}" already processed within deduplication window. Skipping.`);
        return; // Prevent duplicate popup
      }

      console.log(`[Realtime-Notifier] Processing new unique event: ${eventKey}`);
      processedEvents.add(eventKey);
      setTimeout(() => {
        processedEvents.delete(eventKey);
        console.log(`[Realtime-Notifier] Removed event key "${eventKey}" from deduplication window.`);
      }, 3000);

      // 1. Dispatch custom event globally so other active components (like profile, etc.) can refresh their state
      console.log('[Realtime-Notifier] Dispatching global "kas-updated" CustomEvent for active tables/UI reloads.');
      window.dispatchEvent(new CustomEvent('kas-updated', { detail: payload }));

      // 2. Compute and display the notification popup
      supabase
        .from('kas_pb')
        .select('*')
        .order('tanggal_transaksi', { ascending: true })
        .then(({ data: allKas }) => {
          if (!allKas) return;

          const formatRupiah = (num: number) => {
            return new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(num);
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

          // Calculate Sisa Saldo Akhir (Final Balance)
          let totalMasuk = 0;
          let totalKeluar = 0;
          allKas.forEach((item) => {
            const amt = item.jumlah_bayar || 0;
            if (checkIsMasuk(item)) {
              totalMasuk += amt;
            } else {
              totalKeluar += amt;
            }
          });
          const sisaSaldoAkhir = totalMasuk - totalKeluar;

          // Find Latest Income and Latest Expense in DB
          const incomes = allKas.filter(k => checkIsMasuk(k));
          const latestIncome = incomes.length > 0 ? incomes[incomes.length - 1] : null;

          const expenses = allKas.filter(k => !checkIsMasuk(k));
          const latestExpense = expenses.length > 0 ? expenses[expenses.length - 1] : null;

          // Calculate previous remaining balance (Sisa Kas Sebelumnya) before this real-time payload event
          let currentChange = 0;
          const eventType = payload.eventType;

          if (eventType === 'INSERT' && payload.new) {
            const isMasuk = checkIsMasuk(payload.new);
            currentChange = isMasuk ? (payload.new.jumlah_bayar || 0) : -(payload.new.jumlah_bayar || 0);
          } else if (eventType === 'UPDATE' && payload.new && payload.old) {
            const isMasukNew = checkIsMasuk(payload.new);
            const isMasukOld = checkIsMasuk(payload.old);
            const amtNew = isMasukNew ? (payload.new.jumlah_bayar || 0) : -(payload.new.jumlah_bayar || 0);
            const amtOld = isMasukOld ? (payload.old.jumlah_bayar || 0) : -(payload.old.jumlah_bayar || 0);
            currentChange = amtNew - amtOld;
          } else if (eventType === 'DELETE' && payload.old) {
            const isMasukOld = checkIsMasuk(payload.old);
            currentChange = isMasukOld ? -(payload.old.jumlah_bayar || 0) : (payload.old.jumlah_bayar || 0);
          }

          const sisaKasSebelumnya = sisaSaldoAkhir - currentChange;

          // Construct title and transaction-specific info
          let titleText = 'Update Kas Terbaru!';
          let txDetailText = '';
          const newTx = payload.new || payload.old;

          if (eventType === 'INSERT') {
            titleText = 'Transaksi Kas Baru!';
          } else if (eventType === 'DELETE') {
            titleText = 'Transaksi Kas Dihapus!';
          }

          // Trigger real-time FCM Push Notification
          if (newTx) {
            const isMasuk = checkIsMasuk(newTx);
            const amtStr = formatRupiah(newTx.jumlah_bayar || 0);
            const detailDesc = newTx.nama_pembayar || '-';
            const fcmBody = `${isMasuk ? 'Pemasukan' : 'Pengeluaran'}: ${detailDesc} sebesar ${amtStr}. Saldo saat ini: ${formatRupiah(sisaSaldoAkhir)}`;
            triggerPushNotification(titleText, fcmBody, 'kas');
          } else {
            triggerPushNotification(titleText, `Sisa Saldo Kas saat ini: ${formatRupiah(sisaSaldoAkhir)}`, 'kas');
          }

          if (newTx) {
            const isMasuk = checkIsMasuk(newTx);
            const badgeBg = isMasuk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
            const badgeText = isMasuk ? 'Pemasukan' : 'Pengeluaran';
            
            txDetailText = `
              <div class="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1 mb-2">
                <div class="flex items-center justify-between text-[9px] text-slate-400">
                  <span>Detail Transaksi:</span>
                  <span class="px-1.5 py-0.5 rounded-[4px] text-[7px] font-black uppercase ${badgeBg}">${badgeText}</span>
                </div>
                <div class="flex items-start justify-between gap-3 text-[10px]">
                  <span class="text-slate-500">Keterangan:</span>
                  <span class="font-bold text-white text-right break-words max-w-[150px]">${newTx.nama_pembayar || '-'}</span>
                </div>
                <div class="flex items-center justify-between gap-3 text-[10px]">
                  <span class="text-slate-500">Kategori:</span>
                  <span class="font-semibold text-cyan-400 text-right">${newTx.kategori || '-'}</span>
                </div>
                <div class="flex items-center justify-between gap-3 text-[10px]">
                  <span class="text-slate-500">Jumlah:</span>
                  <span class="font-black ${isMasuk ? 'text-emerald-400' : 'text-rose-400'}">${formatRupiah(newTx.jumlah_bayar || 0)}</span>
                </div>
              </div>
            `;
          }

          const incomeDetail = latestIncome 
            ? `<span class="font-bold text-emerald-400">${formatRupiah(latestIncome.jumlah_bayar)}</span> <span class="text-slate-500 text-[9px]">(${latestIncome.nama_pembayar || latestIncome.kategori})</span>`
            : '<span class="text-slate-500 font-medium">-</span>';

          const expenseDetail = latestExpense
            ? `<span class="font-bold text-rose-400">${formatRupiah(latestExpense.jumlah_bayar)}</span> <span class="text-slate-500 text-[9px]">(${latestExpense.nama_pembayar || latestExpense.kategori})</span>`
            : '<span class="text-slate-500 font-medium">-</span>';

          // Build WhatsApp share content
          let waText = '';
          if (newTx) {
            const isMasuk = checkIsMasuk(newTx);
            waText = `📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\n\n` +
              `*Detail Transaksi:*\n` +
              `• Status: ${eventType === 'DELETE' ? '❌ DIHAPUS' : '✅ BERHASIL'}\n` +
              `• Jenis: ${isMasuk ? '📥 Pemasukan' : '📤 Pengeluaran'}\n` +
              `• Nama/Keterangan: *${newTx.nama_pembayar || '-'}*\n` +
              `• Kategori: ${newTx.kategori || '-'}\n` +
              `• Jumlah: *${formatRupiah(newTx.jumlah_bayar || 0)}*\n\n` +
              `*Status Keuangan Klub:*\n` +
              `• Saldo Sebelumnya: ${formatRupiah(sisaKasSebelumnya)}\n` +
              `• *Sisa Saldo Akhir: ${formatRupiah(sisaSaldoAkhir)}*\n\n` +
              `_Laporan real-time via Aplikasi PB Bilibili 162_`;
          } else {
            waText = `📢 *LAPORAN REAL-TIME KAS (PB BILIBILI 162)*\n\n` +
              `*Status Keuangan Klub:*\n` +
              `• *Sisa Saldo Akhir: ${formatRupiah(sisaSaldoAkhir)}*\n\n` +
              `_Laporan real-time via Aplikasi PB Bilibili 162_`;
          }
          const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;

          Swal.fire({
            title: `<div class="flex items-center gap-2 text-white font-black uppercase tracking-wider italic text-[11px] sm:text-xs"><span class="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shrink-0"></span>${titleText}</div>`,
            html: `
              <div class="text-left font-sans text-[11px] text-slate-300 mt-1.5 space-y-2">
                
                ${txDetailText}

                <div class="space-y-1.5 bg-[#0b1224] p-3 rounded-xl border border-white/5 shadow-inner">
                  <div class="text-[9px] font-black uppercase tracking-wider text-cyan-500 mb-1">Status Keuangan PB Bilibili</div>
                  
                  <div class="flex items-center justify-between gap-4">
                    <span class="text-slate-400">Sisa Kas Sebelumnya:</span>
                    <span class="font-semibold text-slate-300">${formatRupiah(sisaKasSebelumnya)}</span>
                  </div>
                  
                  <div class="flex flex-col gap-1 py-1.5 border-y border-white/5 my-1">
                    <div class="flex items-center justify-between gap-4">
                      <span class="text-slate-400">Penerimaan Terakhir:</span>
                      <span class="text-right">${incomeDetail}</span>
                    </div>
                    <div class="flex items-center justify-between gap-4">
                      <span class="text-slate-400">Pengeluaran Terakhir:</span>
                      <span class="text-right">${expenseDetail}</span>
                    </div>
                  </div>

                  <div class="flex items-center justify-between gap-4 pt-1">
                    <span class="text-cyan-400 font-bold">Sisa Saldo Akhir:</span>
                    <span class="font-extrabold text-xs sm:text-sm text-cyan-400">${formatRupiah(sisaSaldoAkhir)}</span>
                  </div>
                </div>

                <a href="${waHref}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-1.5 w-full mt-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black text-white uppercase tracking-wider text-center no-underline border border-emerald-500/20 shadow-lg transition-all duration-150 active:scale-[0.98] hover:scale-[1.01]">
                  <svg class="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.966C16.59 1.975 14.11 1.01 11.477 1.01 6.041 1.01 1.62 5.379 1.615 10.807c-.001 1.702.453 3.361 1.314 4.815L1.96 21.02l5.687-1.488z"/></svg>
                  <span>Kirim Laporan ke WhatsApp</span>
                </a>

              </div>
            `,
            position: 'top-end',
            showConfirmButton: false,
            timer: 9000,
            timerProgressBar: true,
            background: '#070d1a',
            color: '#fff',
            toast: true,
            customClass: {
              popup: 'border border-cyan-500/20 rounded-2xl shadow-2xl shadow-black/80 p-3.5 !max-w-[350px]',
              container: 'z-[9999999]'
            },
            didOpen: (toast) => {
              toast.addEventListener('mouseenter', Swal.stopTimer);
              toast.addEventListener('mouseleave', Swal.resumeTimer);
            }
          });
        });
    };

    console.log('[Realtime-Notifier] Subscribing to Supabase channel "global-kas-realtime" with self-broadcast enabled...');
    const channel = supabase
      .channel('global-kas-realtime', {
        config: {
          broadcast: { self: true }
        }
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kas_pb' },
        (payload: any) => {
          console.log('%c[Realtime-Notifier] Postgres Change Detected on table "kas_pb"!', 'color: #06b6d4; font-weight: bold;', payload);
          handlePayload(payload);
        }
      )
      .on(
        'broadcast',
        { event: 'kas-changed' },
        (response: any) => {
          console.log('%c[Realtime-Notifier] Broadcast Event "kas-changed" Received!', 'color: #10b981; font-weight: bold;', response);
          if (response.payload) {
            handlePayload(response.payload);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime-Notifier] Channel Subscription Status: ${status}`);
        if (err) {
          console.error('[Realtime-Notifier] Subscription Error:', err);
        }
        if (status === 'SUBSCRIBED') {
          console.log('%c[Realtime-Notifier] Real-time Channel Subscribed Successfully! Ready for updates.', 'color: #10b981; font-weight: bold;');
          console.log('[Realtime-Notifier] Note: For Postgres Changes to fire on actual database edits, please ensure:\n' +
                      '1. The "realtime" extension is active in your Supabase database.\n' +
                      '2. The "kas_pb" table has Realtime enabled (under Database -> Replication -> supabase_realtime in Supabase Console).');
        }
      });

    return () => {
      console.log('[Realtime-Notifier] Unmounting KasRealtimeNotifier. Removing channel subscription...');
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}
