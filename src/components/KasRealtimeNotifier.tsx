import { useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { broadcastDataChange } from '../utils/realtimeHelper';

const DAFTAR_PEMASUKAN = [
  'Iuran Bulanan Tetap (10k)',
  'Pembayaran Iuran Binaan',
  'Pembayaran Shuttlecock',
  'Pendaftaran Atlet Baru',
  'Sumbangan Sukarela'
];

const processedEvents = new Set<string>();
let activeGlobalChannel: any = null;
let activeGlobalChannelPromise: Promise<any> | null = null;

const formatRupiah = (value: any) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(Number(value || 0));

const isMasuk = (tx: any) => !!tx && (
  String(tx.jenis_transaksi || '').toLowerCase() === 'masuk' ||
  DAFTAR_PEMASUKAN.includes(String(tx.kategori || ''))
);

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getFilter = () => {
  const t = today();
  const first = `${t.slice(0, 8)}01`;
  let start = '';
  let end = '';
  try {
    start = localStorage.getItem('kas_filter_start') || '';
    end = localStorage.getItem('kas_filter_end') || '';
  } catch {}
  const inputs = Array.from(document.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
  const from = inputs.find(i => /Dari\s*:/i.test(i.parentElement?.innerText || i.closest('div')?.innerText || ''));
  const to = inputs.find(i => /Sampai\s*:/i.test(i.parentElement?.innerText || i.closest('div')?.innerText || ''));
  return { startDate: start || from?.value || first, endDate: end || to?.value || t };
};

const inFilter = (tx: any, start: string, end: string) => {
  const d = String(tx?.tanggal_transaksi || '').slice(0, 10);
  return !!d && d >= start && d <= end;
};

const latest = (items: any[], income: boolean) => [...items]
  .filter(tx => isMasuk(tx) === income)
  .sort((a, b) => String(b.created_at || b.tanggal_transaksi || '').localeCompare(String(a.created_at || a.tanggal_transaksi || '')))[0] || null;

const formatDateTime = (tx: any) => {
  const date = String(tx?.tanggal_transaksi || '-').slice(0, 10);
  if (!tx?.created_at) return date;
  const d = new Date(tx.created_at);
  if (isNaN(d.getTime())) return date;
  return `${date}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' })} WITA`;
};

const detail = (label: string, tx: any, income: boolean) => {
  if (!tx) return `${label}: Nihil\n`;
  return `${label}:\n• Status: BERHASIL\n• Jenis: ${income ? 'Pemasukan' : 'Pengeluaran'}\n• Tanggal & Waktu: ${formatDateTime(tx)}\n• Nama/Keterangan: ${tx.nama_pembayar || '-'}\n• Kategori: ${tx.kategori || '-'}\n• Jumlah: ${formatRupiah(tx.jumlah_bayar)}\n`;
};

/**
 * Get/create the global broadcast channel safely.
 * IMPORTANT: every `.on(...)` callback is registered BEFORE `.subscribe()`.
 */
const getGlobalChannel = async () => {
  if (activeGlobalChannel) return activeGlobalChannel;
  if (activeGlobalChannelPromise) return activeGlobalChannelPromise;

  activeGlobalChannelPromise = new Promise((resolve, reject) => {
    const channel = supabase.channel('global-kas-db-changes', {
      config: { broadcast: { self: true } }
    });

    channel.subscribe((status: string, error?: any) => {
      if (status === 'SUBSCRIBED') {
        activeGlobalChannel = channel;
        activeGlobalChannelPromise = null;
        resolve(channel);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        activeGlobalChannelPromise = null;
        try { supabase.removeChannel(channel); } catch {}
        reject(error || new Error(`Realtime channel status: ${status}`));
      }
    });
  });

  return activeGlobalChannelPromise;
};

export const broadcastKasChange = async (
  eventType: 'INSERT' | 'UPDATE' | 'DELETE',
  payloadData: any
) => {
  const payload = {
    eventType,
    new: eventType !== 'DELETE' ? payloadData : null,
    old: eventType !== 'INSERT' ? payloadData : null
  };

  broadcastDataChange('kas_pb', eventType, payloadData);

  try {
    const channel = await getGlobalChannel();
    await channel.send({ type: 'broadcast', event: 'kas-changed', payload });
  } catch (error) {
    // Realtime broadcast is an enhancement; CRUD must remain functional if it is unavailable.
    console.warn('[KasRealtime] broadcast skipped:', error);
  }
};

export default function KasRealtimeNotifier() {
  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const handlePayload = async (payload: any) => {
      if (!mounted) return;
      const eventTx = payload?.new || payload?.old || null;
      const eventType = payload?.eventType || payload?.event || 'UPDATE';
      const eventId = eventTx?.id || `${eventType}-${Date.now()}`;
      const eventKey = `${eventType}-${eventId}-${eventTx?.jumlah_bayar || 0}`;
      if (processedEvents.has(eventKey)) return;
      processedEvents.add(eventKey);
      window.setTimeout(() => processedEvents.delete(eventKey), 4000);
      window.dispatchEvent(new CustomEvent('kas-updated', { detail: payload }));

      const { startDate, endDate } = getFilter();
      const { data, error } = await supabase
        .from('kas_pb')
        .select('*')
        .order('tanggal_transaksi', { ascending: true });
      if (!mounted) return;

      const all = !error && Array.isArray(data) ? data : [];
      const period = all.filter(tx => inFilter(tx, startDate, endDate));
      const income = period.filter(isMasuk).reduce((s, tx) => s + Number(tx.jumlah_bayar || 0), 0);
      const expense = period.filter(tx => !isMasuk(tx)).reduce((s, tx) => s + Number(tx.jumlah_bayar || 0), 0);
      const previous = all
        .filter(tx => String(tx.tanggal_transaksi || '').slice(0, 10) < startDate)
        .reduce((s, tx) => s + (isMasuk(tx) ? 1 : -1) * Number(tx.jumlah_bayar || 0), 0);
      const saldo = previous + income - expense;
      const latestIncome = latest(period, true);
      const latestExpense = latest(period, false);
      const eventInFilter = !!eventTx && inFilter(eventTx, startDate, endDate);

      const title = eventInFilter
        ? eventType === 'INSERT' ? 'TRANSAKSI KAS BARU!' : eventType === 'DELETE' ? 'TRANSAKSI KAS DIHAPUS!' : 'UPDATE KAS TERBARU!'
        : 'LAPORAN KAS TERBARU';

      const waText = `📢 *${title} — PB BILIBILI 162*\n\n` +
        detail('*Detail Penerimaan Terbaru*', latestIncome, true) + '\n' +
        detail('*Detail Pengeluaran Terbaru*', latestExpense, false) + '\n' +
        `*Ringkasan Periode ${startDate} s/d ${endDate}:*\n` +
        `• Saldo Sebelumnya: ${formatRupiah(previous)}\n` +
        `• Total Pemasukan: ${formatRupiah(income)}\n` +
        `• Total Pengeluaran: ${formatRupiah(expense)}\n` +
        `• *Saldo Akhir: ${formatRupiah(saldo)}*\n\n` +
        `🔗 ${window.location.origin}/kas\n\nAdmin PB Bilibili 162`;

      const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
      if (mounted) {
        await Swal.fire({
          icon: eventType === 'DELETE' ? 'warning' : 'success',
          title,
          html: `<div style="text-align:left;font-size:13px;line-height:1.6">` +
            `<b>Periode:</b> ${startDate} s/d ${endDate}<br/>` +
            `<b>Pemasukan:</b> ${formatRupiah(income)}<br/>` +
            `<b>Pengeluaran:</b> ${formatRupiah(expense)}<br/>` +
            `<b>Saldo Akhir:</b> ${formatRupiah(saldo)}<br/><br/>` +
            `<b>Penerimaan Terbaru:</b> ${latestIncome ? `${latestIncome.nama_pembayar || latestIncome.kategori} — ${formatRupiah(latestIncome.jumlah_bayar)}` : 'Nihil'}<br/>` +
            `<b>Pengeluaran Terbaru:</b> ${latestExpense ? `${latestExpense.nama_pembayar || latestExpense.kategori} — ${formatRupiah(latestExpense.jumlah_bayar)}` : 'Nihil'}` +
            `</div>`,
          showCancelButton: true,
          confirmButtonText: 'Buka WhatsApp',
          cancelButtonText: 'Tutup',
          confirmButtonColor: '#25D366'
        }).then(result => {
          if (result.isConfirmed) window.open(waHref, '_blank', 'noopener,noreferrer');
        });
      }
    };

    const startRealtime = async () => {
      try {
        // CRITICAL ORDER: register postgres_changes BEFORE subscribe().
        channel = supabase
          .channel('global-kas-db-changes', { config: { broadcast: { self: true } } })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'kas_pb'
          }, (payload: any) => {
            handlePayload({
              eventType: payload.eventType,
              new: payload.new,
              old: payload.old
            });
          })
          .on('broadcast', { event: 'kas-changed' }, (message: any) => {
            const payload = message?.payload || message;
            handlePayload(payload);
          });

        await new Promise<void>((resolve, reject) => {
          channel.subscribe((status: string, error?: any) => {
            if (status === 'SUBSCRIBED') resolve();
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') reject(error || new Error(status));
          });
        });

        if (mounted) {
          activeGlobalChannel = channel;
          activeGlobalChannelPromise = null;
        }
      } catch (error) {
        console.warn('[KasRealtime] subscription unavailable:', error);
        if (channel) {
          try { await supabase.removeChannel(channel); } catch {}
        }
        if (activeGlobalChannel === channel) activeGlobalChannel = null;
      }
    };

    startRealtime();

    return () => {
      mounted = false;
      if (channel) {
        try { supabase.removeChannel(channel); } catch {}
      }
      if (activeGlobalChannel === channel) activeGlobalChannel = null;
      activeGlobalChannelPromise = null;
    };
  }, []);

  return null;
}
