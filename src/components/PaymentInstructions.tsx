import React from 'react';

const BSI_ACCOUNT = '7372006514';
const BSI_ACCOUNT_NAME = 'PB BILIBILI 162';
const QRIS_IMAGE = '/qris-pb-bilibili-162.svg?v=20260920';

export default function PaymentInstructions(){
  const copyAccount=async()=>{try{await navigator.clipboard?.writeText(BSI_ACCOUNT);}catch{}};
  return <div className="space-y-4">
    <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Informasi Transaksi</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">Gunakan rekening BSI atau QRIS resmi PB BILIBILI 162 untuk transaksi resmi. Pastikan nama penerima sudah benar sebelum pembayaran.</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Transfer BSI</p>
        <p className="mt-3 text-sm font-black text-white">{BSI_ACCOUNT_NAME}</p>
        <p className="mt-1 text-xs text-slate-400">Bank Syariah Indonesia (BSI)</p>
        <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Nomor Rekening</p>
          <p className="mt-1 text-2xl font-black tracking-wider text-white">{BSI_ACCOUNT}</p>
          <button type="button" onClick={copyAccount} className="mt-3 min-h-11 rounded-lg border border-white/10 px-4 py-2 text-[10px] font-black text-slate-300 hover:bg-white/5">Salin Nomor Rekening</button>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">QRIS • PB BILIBILI 162</p>
        <div className="mx-auto mt-3 w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-xl">
          <img src={QRIS_IMAGE} alt="QRIS resmi PB BILIBILI 162" className="block h-auto w-full select-none" decoding="sync" draggable="false" />
        </div>
        <p className="mt-3 text-[10px] font-bold text-slate-400">NMID: ID1026582784348 • A01</p>
      </div>
    </div>
  </div>;
}
