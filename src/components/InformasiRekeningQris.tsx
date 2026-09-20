import React from 'react';
import { ArrowLeft, Building2, CreditCard, ShieldCheck, Copy, CheckCircle2, Info, Smartphone, Landmark } from 'lucide-react';
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
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      {/* Header */}
      <section className="relative overflow-hidden bg-[#061a36] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(37,153,255,.25),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(0,205,255,.12),transparent_35%)]" />
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 pb-9 pt-7 sm:px-6 lg:px-8 lg:pb-12 lg:pt-9">
          <button
            type="button"
            onClick={goHome}
            className="mb-7 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3.5 text-xs font-bold text-slate-200 transition hover:bg-white/10"
          >
            <ArrowLeft size={15} /> Beranda
          </button>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.2em] text-cyan-300">
              <ShieldCheck size={13} /> Transaksi Resmi
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Rekening <span className="text-cyan-400">&amp; QRIS</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Gunakan rekening dan QRIS resmi PB Bilibili 162. Pastikan nama penerima sesuai sebelum transaksi.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid gap-5 lg:grid-cols-[.82fr_1.18fr]">
          {/* Account */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,.08)]"
          >
            <div className="bg-gradient-to-br from-[#07539b] to-[#0b75bd] px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/10">
                  <Landmark size={24} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-100">Rekening Resmi</p>
                  <h2 className="mt-1 text-lg font-black sm:text-xl">Bank Syariah Indonesia</h2>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-7">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-4 sm:p-5">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Nama Rekening</p>
                <p className="mt-1.5 text-lg font-black text-slate-900 sm:text-xl">{BSI_ACCOUNT_NAME}</p>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                    <CreditCard size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nomor Rekening</p>
                    <p className="mt-1 break-all text-xl font-black tracking-[.08em] text-[#06295a] sm:text-2xl">{BSI_ACCOUNT}</p>
                    <button
                      type="button"
                      onClick={copyAccount}
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#07539b] px-3.5 py-2 text-[10px] font-black uppercase tracking-wide text-white transition hover:bg-[#064782] active:scale-[.98]"
                    >
                      {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copied ? 'Tersalin' : 'Salin Rekening'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-3.5">
                  <Building2 size={18} className="text-blue-600" />
                  <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Bank</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-slate-800">BSI</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5">
                  <ShieldCheck size={18} className="text-emerald-600" />
                  <p className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-emerald-800">Resmi</p>
                </div>
              </div>

              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
                <Info size={18} className="mt-0.5 shrink-0 text-amber-600" />
                <p>Pastikan nama penerima <b>PB BILIBILI 162</b> sebelum menyelesaikan transaksi.</p>
              </div>
            </div>
          </motion.section>

          {/* QRIS */}
          <motion.section
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: .06 }}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_15px_45px_rgba(15,23,42,.08)]"
          >
            <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-[#07539b] to-[#0b75bd] px-5 py-5 text-white sm:px-7">
              <div className="flex min-w-0 items-center gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/10">
                  <CreditCard size={24} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-100">Pembayaran Digital</p>
                  <h2 className="mt-1 text-lg font-black sm:text-xl">QRIS PB BILIBILI 162</h2>
                </div>
              </div>
              <Smartphone className="hidden shrink-0 text-cyan-200 sm:block" size={25} />
            </div>

            <div className="p-3 sm:p-5 lg:p-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-1.5 shadow-inner sm:p-2">
                {/* Asset QRIS ditampilkan utuh. Barcode/kode QR tidak diubah atau digambar ulang. */}
                <img
                  src={QRIS_IMAGE}
                  alt="QRIS resmi PB BILI BILI 162"
                  className="mx-auto block h-auto w-full max-w-[680px] select-none object-contain"
                  decoding="sync"
                  draggable="false"
                />
              </div>
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <ShieldCheck size={19} className="mt-0.5 shrink-0 text-blue-600" />
                <div className="text-xs leading-5 text-blue-900">
                  <p className="font-black">Gunakan QRIS yang tampil di atas</p>
                  <p className="mt-0.5 text-blue-800/80">Jangan gunakan gambar QRIS dari sumber lain untuk transaksi resmi PB BILIBILI 162.</p>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#061a36] text-white">
              <ShieldCheck size={21} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-black text-slate-900 sm:text-base">Informasi Transaksi</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Halaman ini hanya menyediakan informasi rekening dan QRIS resmi PB Bilibili 162. Simpan bukti transaksi Anda sebagai arsip.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
