import React from 'react';
import { ArrowLeft, Building2, CreditCard, ShieldCheck, Sparkles, Copy, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const BSI_ACCOUNT = '7372006514';
const BSI_ACCOUNT_NAME = 'PB BILIBILI 162';
const QRIS_IMAGE = '/qris-pb-bilibili-162.svg?v=20260920';

export default function InformasiRekeningQris() {
  const [copied, setCopied] = React.useState(false);

  const goHome = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyAccount = async () => {
    try {
      await navigator.clipboard?.writeText(BSI_ACCOUNT);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <section className="relative min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#070d1a] px-3 py-6 text-white sm:px-5 md:px-8 lg:py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-indigo-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button type="button" onClick={goHome}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3.5 text-[10px] font-black uppercase tracking-wider text-slate-300 transition hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white">
            <ArrowLeft size={14} /> Beranda
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.18em] text-emerald-300 sm:flex">
            <ShieldCheck size={13} /> Transaksi Resmi PB Bilibili 162
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#0d1b36] via-[#0b1224] to-[#070d1a] p-5 shadow-2xl sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-blue-300">
                <Sparkles size={12} /> Informasi Transaksi
              </div>
              <h1 className="mt-3 text-2xl font-black italic tracking-tight sm:text-4xl">
                INFORMASI REKENING <span className="text-blue-400">&amp; QRIS</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400 sm:text-sm">
                Informasi rekening dan QRIS resmi PB Bilibili 162 untuk kebutuhan transaksi resmi.
                Silakan periksa nama penerima sebelum menyelesaikan pembayaran.
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

        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-[#0b1224]/90 p-5 shadow-2xl sm:p-6">
            <div className="flex items-center gap-2 text-blue-300">
              <Building2 size={18} />
              <p className="text-[10px] font-black uppercase tracking-[.2em]">Rekening Resmi</p>
            </div>
            <p className="mt-5 text-lg font-black text-white">{BSI_ACCOUNT_NAME}</p>
            <p className="mt-1 text-sm text-slate-400">Bank Syariah Indonesia (BSI)</p>
            <div className="mt-5 rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Nomor Rekening</p>
              <p className="mt-2 break-all text-2xl font-black tracking-wider text-white">{BSI_ACCOUNT}</p>
              <button type="button" onClick={copyAccount}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black text-slate-300 hover:bg-white/5">
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? 'Tersalin' : 'Salin Nomor Rekening'}
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="rounded-3xl border border-white/10 bg-[#0b1224]/90 p-4 shadow-2xl sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">QRIS Resmi</p>
                <p className="mt-1 text-sm font-black text-white">PB BILI BILI 162</p>
              </div>
              <CreditCard size={22} className="text-emerald-400" />
            </div>
            <div className="mx-auto mt-4 w-full max-w-[440px] overflow-hidden rounded-2xl bg-white shadow-xl">
              <img src={QRIS_IMAGE} alt="QRIS resmi PB BILI BILI 162" className="block h-auto w-full select-none" decoding="sync" draggable="false" />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">NMID</p>
              <p className="mt-1 text-sm font-black text-white">ID1026582784348</p>
              <p className="mt-1 text-[10px] text-slate-500">A01 • Gunakan QRIS resmi yang ditampilkan di atas.</p>
            </div>
          </motion.div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-[10px] leading-relaxed text-slate-400 sm:text-xs">
          <span className="font-black text-amber-300">PENTING:</span> Pastikan nama penerima adalah <b className="text-white">PB BILIBILI 162</b> sebelum menyelesaikan transaksi. Halaman ini hanya menampilkan informasi rekening dan QRIS resmi.
        </div>
      </div>
    </section>
  );
}
