import React from 'react';
import { ArrowLeft, Building2, CreditCard, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import PaymentInstructions from './PaymentInstructions';

export default function InformasiRekeningQris() {
  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#070d1a] px-3 py-6 text-white sm:px-5 md:px-8 lg:py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goHome}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
          >
            <ArrowLeft size={14} />
            Beranda
          </button>

          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-emerald-300 sm:flex">
            <ShieldCheck size={13} />
            Pembayaran Resmi PB Bilibili 162
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#0d1b36] via-[#0b1224] to-[#070d1a] p-5 shadow-2xl sm:p-7"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-blue-300">
                <Sparkles size={12} />
                Informasi Pembayaran
              </div>
              <h1 className="mt-3 text-2xl font-black italic tracking-tight sm:text-4xl">
                INFORMASI REKENING <span className="text-blue-400">&amp; QRIS</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                Gunakan informasi berikut untuk melakukan transaksi resmi kepada rekening PB Bilibili 162.
                Nomor rekening dan QRIS disajikan konsisten dengan informasi pembayaran pada form pendaftaran turnamen.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
              <div className="rounded-2xl border border-blue-400/15 bg-blue-500/5 p-3">
                <Building2 size={18} className="text-blue-400" />
                <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500">Bank</p>
                <p className="mt-0.5 text-xs font-black text-white">BSI</p>
              </div>
              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-3">
                <CreditCard size={18} className="text-emerald-400" />
                <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-500">QRIS</p>
                <p className="mt-0.5 text-xs font-black text-white">PB BILIBILI 162</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-3xl border border-white/10 bg-[#0b1224]/90 p-3 shadow-2xl backdrop-blur-xl sm:p-5 md:p-6"
        >
          <PaymentInstructions />
        </motion.div>

        <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-[10px] leading-relaxed text-slate-400 sm:text-xs">
          <span className="font-black text-amber-300">PENTING:</span> Pastikan nama penerima adalah <b className="text-white">PB BILIBILI 162</b> sebelum menyelesaikan transaksi. Simpan bukti pembayaran untuk kebutuhan verifikasi panitia.
        </div>
      </div>
    </section>
  );
}
