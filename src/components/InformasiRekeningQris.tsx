import React from 'react';
import { Building2, CreditCard, ShieldCheck, Copy, CheckCircle2, Info, Landmark, Share2, MessageCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';

const BSI_ACCOUNT = '7372006514';
const BSI_ACCOUNT_NAME = 'PB BILIBILI 162';
const QRIS_IMAGE = '/qris-pb-bilibili-162.svg?v=20260920';

export default function InformasiRekeningQris() {
  const [copied, setCopied] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [shareMessage, setShareMessage] = React.useState('');

  const shareText = [
    '🏸 PB BILIBILI 162 — REKENING & QRIS RESMI',
    '',
    'Bank: Bank Syariah Indonesia (BSI)',
    'Nomor Rekening: ' + BSI_ACCOUNT,
    'Nama Rekening: ' + BSI_ACCOUNT_NAME,
    '',
    'Gunakan QRIS resmi PB BILIBILI 162 pada gambar yang dibagikan.',
    'Pastikan nama penerima adalah PB BILIBILI 162 sebelum transaksi.',
  ].join('\n');

  const copyAccount = async () => {
    try {
      await navigator.clipboard?.writeText(BSI_ACCOUNT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  const shareToWhatsApp = async () => {
    if (sharing) return;
    setSharing(true);
    setShareMessage('');

    try {
      const imageUrl = new URL(QRIS_IMAGE, window.location.origin).href;
      const response = await fetch(imageUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error('QRIS tidak dapat diambil');

      const svgText = await response.text();
      const pngBlob = await new Promise<Blob>((resolve, reject) => {
        const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
        const objectUrl = URL.createObjectURL(svgBlob);
        const image = new Image();

        image.onload = () => {
          try {
            // Rasterize the original QRIS asset only so WhatsApp/Android can
            // accept it as a standard PNG attachment. No QR content is redrawn.
            const canvas = document.createElement('canvas');
            const size = Math.max(image.naturalWidth || 1200, image.naturalHeight || 1200);
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas tidak tersedia');

            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, size, size);
            context.drawImage(image, 0, 0, size, size);

            canvas.toBlob((blob) => {
              URL.revokeObjectURL(objectUrl);
              if (blob) resolve(blob);
              else reject(new Error('Gagal membuat gambar QRIS'));
            }, 'image/png');
          } catch (error) {
            URL.revokeObjectURL(objectUrl);
            reject(error);
          }
        };

        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Gagal membaca gambar QRIS'));
        };

        image.src = objectUrl;
      });

      const file = new File([pngBlob], 'QRIS-PB-BILIBILI-162.png', {
        type: 'image/png',
      });

      // Android/Chrome + WhatsApp: native share sheet menerima teks dan
      // gambar PNG sehingga WhatsApp dapat melampirkannya ke chat penerima.
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Rekening & QRIS PB BILIBILI 162',
          text: shareText,
          files: [file],
        });
        setShareMessage('Berhasil membuka menu berbagi. Pilih WhatsApp lalu pilih penerima dan tekan Kirim.');
        return;
      }

      // Fallback untuk browser yang tidak mendukung file sharing.
      // WhatsApp tetap menerima seluruh teks rekening; gambar QRIS tersedia
      // melalui tautan resmi agar dapat dilampirkan dari chat.
      const fallbackText =
        shareText +
        '\\n\\nQRIS resmi: ' +
        imageUrl +
        '\\n\\nCatatan: browser ini tidak mendukung pengiriman gambar langsung ke WhatsApp.';

      window.location.href = 'https://wa.me/?text=' + encodeURIComponent(fallbackText);
      setShareMessage('WhatsApp dibuka dengan data rekening lengkap. Lampirkan QRIS jika browser tidak mendukung berbagi gambar.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;

      setShareMessage(
        'Berbagi QRIS gagal. Coba gunakan tombol Share ke WhatsApp lagi atau simpan QRIS terlebih dahulu.'
      );
    } finally {
      setSharing(false);
      window.setTimeout(() => setShareMessage(''), 7000);
    }
  };
  const downloadQris = () => {
    const link = document.createElement('a');
    link.href = QRIS_IMAGE;
    link.download = 'QRIS-PB-BILIBILI-162.svg';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="w-full min-h-full bg-[#070d1a] text-white relative overflow-hidden py-1 sm:py-3 md:py-6">
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-indigo-600/10 blur-[90px] rounded-full pointer-events-none -ml-20 -mb-20" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 flex flex-col">
        {/* Consistent public-information header */}
        <div className="text-center mb-3 sm:mb-4 lg:mb-6 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-full mb-1"
          >
            <CreditCard size={12} className="text-blue-400" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              Informasi Transaksi Resmi
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter italic uppercase text-white"
          >
            REKENING <span className="text-blue-500">&amp; QRIS</span>
          </motion.h2>

          <p className="text-slate-400 max-w-xl mx-auto uppercase tracking-widest text-[8px] sm:text-[10px] md:text-xs font-bold mt-0.5">
            Informasi Pembayaran Resmi PB Bilibili 162 Parepare
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 md:gap-6 items-stretch">
          {/* Rekening */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-white/10 mb-3 sm:mb-4 relative">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 sm:h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                <div className="flex items-center gap-1.5 text-blue-400 font-black text-xs sm:text-base md:text-lg uppercase tracking-tight italic">
                  <Landmark size={16} />
                  <span>Rekening Resmi</span>
                </div>
              </div>
              <span className="hidden xs:inline-flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                <ShieldCheck size={11} /> Resmi
              </span>
            </div>

            <div className="relative space-y-2.5 sm:space-y-3">
              <button
                type="button"
                onClick={shareToWhatsApp}
                disabled={sharing}
                className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait px-4 py-3 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white transition-colors shadow-lg shadow-emerald-900/20"
              >
                {sharing ? <Share2 size={16} className="animate-pulse" /> : <MessageCircle size={16} />}
                {sharing ? 'Menyiapkan QRIS…' : 'Bagikan Rekening + QRIS ke WhatsApp'}
              </button>
              {shareMessage && (
                <p className="text-[9px] sm:text-[10px] leading-4 text-emerald-300 bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2">
                  {shareMessage}
                </p>
              )}
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 sm:p-4">
                <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest font-black">Nama Rekening</p>
                <p className="mt-1 text-sm sm:text-base md:text-lg font-black text-white">{BSI_ACCOUNT_NAME}</p>
              </div>

              <div className="bg-white/5 border border-blue-500/15 rounded-xl p-3 sm:p-4">
                <div className="flex items-start gap-2.5">
                  <span className="w-9 h-9 shrink-0 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <CreditCard size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] sm:text-[9px] text-slate-500 uppercase tracking-widest font-black">Nomor Rekening</p>
                    <p className="mt-1 text-xl sm:text-2xl font-black tracking-[.08em] text-white break-all">{BSI_ACCOUNT}</p>
                    <button
                      type="button"
                      onClick={copyAccount}
                      className="mt-2.5 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white transition-colors"
                    >
                      {copied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                      {copied ? 'Tersalin' : 'Salin Rekening'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3">
                  <Building2 size={16} className="text-blue-400" />
                  <p className="mt-1.5 text-[8px] text-slate-500 uppercase tracking-widest font-black">Bank</p>
                  <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-slate-200">BSI</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <p className="mt-1.5 text-[8px] text-slate-500 uppercase tracking-widest font-black">Status</p>
                  <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-emerald-300">Resmi</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 text-[10px] sm:text-xs leading-5 text-slate-300">
                <Info size={15} className="mt-0.5 shrink-0 text-blue-400" />
                <p>Pastikan nama penerima adalah <b className="text-white">PB BILIBILI 162</b> sebelum transaksi.</p>
              </div>
            </div>
          </motion.div>

          {/* QRIS */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: .05 }}
            className="lg:col-span-7 bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between gap-2 pb-2 sm:pb-2.5 border-b border-white/10 mb-3 sm:mb-4 relative">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-5 sm:h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
                <div className="flex items-center gap-1.5 text-blue-400 font-black text-xs sm:text-base md:text-lg uppercase tracking-tight italic min-w-0">
                  <CreditCard size={16} />
                  <span className="truncate">QRIS Resmi</span>
                </div>
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded-full border border-white/10 shrink-0">
                PB BILIBILI 162
              </span>
            </div>

            <div className="relative flex flex-col items-center">
              {/* IMPORTANT: render the original QRIS asset as-is; never redraw or modify the QR code */}
              <div className="w-full max-w-[720px] bg-white rounded-xl sm:rounded-2xl p-1.5 sm:p-2 border border-white/10 shadow-xl">
                <img
                  src={QRIS_IMAGE}
                  alt="QRIS resmi PB BILIBILI 162"
                  className="block w-full h-auto object-contain select-none"
                  decoding="sync"
                  draggable="false"
                />
              </div>
              <div className="w-full max-w-[720px] mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={shareToWhatsApp}
                  disabled={sharing}
                  className="min-h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 px-3 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white transition-colors"
                >
                  <MessageCircle size={14} />
                  {sharing ? 'Menyiapkan…' : 'Share ke WhatsApp'}
                </button>
                <button
                  type="button"
                  onClick={downloadQris}
                  className="min-h-10 inline-flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-200 transition-colors"
                >
                  <Download size={14} />
                  Simpan QRIS
                </button>
              </div>
              <div className="w-full max-w-[720px] mt-2.5 flex items-start gap-2.5 bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 text-[9px] sm:text-[10px] leading-5 text-slate-400">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-blue-400" />
                <p>Gunakan QRIS resmi PB BILIBILI 162 yang ditampilkan pada halaman ini.</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-2.5 sm:mt-4 bg-[#0b1224]/90 border border-white/10 rounded-2xl p-3 sm:p-4 md:p-5 shadow-xl">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <ShieldCheck size={17} className="text-blue-400" />
            </span>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight italic text-white">Informasi Penting</h3>
              <p className="mt-1 text-[9px] sm:text-[10px] md:text-xs leading-5 text-slate-400">
                Halaman ini hanya menampilkan rekening dan QRIS resmi PB Bilibili 162. Simpan bukti transaksi Anda sebagai arsip.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
