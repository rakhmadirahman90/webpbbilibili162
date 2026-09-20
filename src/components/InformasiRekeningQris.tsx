import React from 'react';
import { ArrowLeft, Building2, CreditCard, ShieldCheck, Copy, CheckCircle2, BadgeCheck, Handshake, Zap, Info } from 'lucide-react';
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

  const badges = [
    { icon: ShieldCheck, label: 'Aman' },
    { icon: BadgeCheck, label: 'Resmi' },
    { icon: Handshake, label: 'Terpercaya' },
    { icon: Zap, label: 'Mudah' },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="relative overflow-hidden bg-[#031b3a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,174,255,.18),transparent_35%),linear-gradient(115deg,#031b3a,#062c5c)]" />
        <div className="absolute -right-20 -top-16 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-8 sm:px-6 lg:px-8 lg:pb-10">
          <button type="button" onClick={goHome}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10">
            <ArrowLeft size={15} /> Beranda
          </button>

          <div className="max-w-4xl">
            <p className="text-xs font-black uppercase tracking-[.24em] text-cyan-300">Hubungi Kami</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
              Informasi Rekening &amp; QRIS
              <span className="block text-cyan-400">PB BILIBILI 162</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-lg">
              Gunakan rekening resmi dan QRIS PB Bilibili 162 untuk setiap transaksi yang Anda lakukan.
            </p>
          </div>

          <div className="mt-6 flex max-w-2xl flex-wrap overflow-hidden rounded-full border border-cyan-300/50 bg-white/[.03]">
            {badges.map(({ icon: Icon, label }) => (
              <div key={label} className="flex min-w-[50%] flex-1 items-center justify-center gap-2 border-white/10 px-4 py-3 text-xs font-bold sm:min-w-0">
                <Icon size={17} className="text-white" /> {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <header className="bg-gradient-to-r from-[#064a8c] to-[#0b5ca8] px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                  <Building2 size={28} />
                </span>
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">Rekening Resmi</h2>
                  <p className="mt-1 text-sm font-semibold text-cyan-300">PB BILIBILI 162</p>
                </div>
              </div>
            </header>

            <div className="p-5 sm:p-7">
              <div className="mb-7 flex items-end gap-3">
                <span className="text-6xl font-black tracking-tight text-[#08a7a5]">BSI</span>
                <span className="mb-1 text-xl font-semibold leading-tight text-[#08a7a5]">BANK SYARIAH<br />INDONESIA</span>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="flex gap-4 py-4">
                  <Building2 className="mt-1 shrink-0 text-[#064a8c]" size={25} />
                  <div><p className="text-xs text-slate-500">Nama Rekening</p><p className="mt-1 text-lg font-black text-[#06295a]">{BSI_ACCOUNT_NAME}</p></div>
                </div>
                <div className="flex gap-4 py-4">
                  <CreditCard className="mt-1 shrink-0 text-[#064a8c]" size={25} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-500">Nomor Rekening</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <p className="text-2xl font-black tracking-wider text-[#06295a]">{BSI_ACCOUNT}</p>
                      <button type="button" onClick={copyAccount}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-black text-[#064a8c] hover:bg-blue-100">
                        {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                        {copied ? 'Tersalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 py-4">
                  <Building2 className="mt-1 shrink-0 text-[#064a8c]" size={25} />
                  <div><p className="text-xs text-slate-500">Bank</p><p className="mt-1 text-base font-bold text-[#06295a]">Bank Syariah Indonesia (BSI)</p></div>
                </div>
                <div className="flex gap-4 py-4">
                  <ShieldCheck className="mt-1 shrink-0 text-[#064a8c]" size={25} />
                  <div><p className="text-xs text-slate-500">Jenis Rekening</p><p className="mt-1 text-base font-bold text-[#06295a]">Rekening Resmi Organisasi</p></div>
                </div>
              </div>

              <div className="mt-5 flex gap-3 rounded-2xl bg-sky-50 p-4 text-sm leading-6 text-blue-900">
                <Info className="mt-0.5 shrink-0 text-blue-600" size={20} />
                <p>Pastikan nama penerima sesuai dengan <b>PB BILIBILI 162</b> sebelum melakukan transaksi.</p>
              </div>
            </div>
          </motion.section>

          <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <header className="bg-gradient-to-r from-[#064a8c] to-[#0b5ca8] px-5 py-5 text-white sm:px-7">
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
                  <CreditCard size={28} />
                </span>
                <div>
                  <h2 className="text-xl font-black sm:text-2xl">QRIS Resmi</h2>
                  <p className="mt-1 text-sm font-semibold text-cyan-300">PB BILIBILI 162</p>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-inner">
                <img src={QRIS_IMAGE}
                  alt="QRIS resmi PB BILI BILI 162"
                  className="block h-auto w-full select-none object-contain"
                  decoding="sync"
                  draggable="false" />
              </div>
            </div>
          </motion.section>
        </div>

        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-600 text-white">
              <ShieldCheck size={25} />
            </span>
            <div>
              <h2 className="text-lg font-black text-amber-800">Informasi Penting</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-slate-700">
                <li>Gunakan hanya rekening dan QRIS resmi PB BILIBILI 162 untuk setiap transaksi.</li>
                <li>Pastikan nama penerima sesuai dengan <b>PB BILIBILI 162</b>.</li>
                <li>PB BILIBILI 162 tidak bertanggung jawab atas transaksi ke rekening selain yang tertera pada halaman ini.</li>
                <li>Simpan bukti transaksi Anda sebagai arsip pribadi.</li>
                <li>Jika ada pertanyaan terkait transaksi, silakan hubungi kami melalui menu <b>Kontak &amp; Markas Besar</b>.</li>
              </ol>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
