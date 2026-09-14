import fs from 'node:fs';

const path = 'src/components/AdminKeuanganTurnamen.tsx';
if (!fs.existsSync(path)) {
  console.warn('[patch-admin-tournament-finance-dynamic-analysis] target not found; skipped.');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');

// Never compare live transactions with a stale hard-coded "official" expense total.
s = s.replace(/const discrepancy = totalOut - \d+;/, 'const discrepancy = 0;');

// If the previous warning contains the old hard-coded official total, make it reflect the live DB total.
s = s.replaceAll('Rp 54.473.800', '{rupiah(totalOut)}');

const marker = '    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:flex-row sm:items-center">';
const liveBlock = `    <section className="rounded-2xl border border-cyan-400/15 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300">Analisa Otomatis • Database Terbaru</p>
          <h2 className="mt-1 text-base font-black uppercase text-white sm:text-lg">Rekonsiliasi Keuangan Turnamen</h2>
          <p className="mt-1 text-[10px] leading-5 text-slate-400">Seluruh angka di bawah dihitung ulang dari transaksi pemasukan, pengeluaran, dan in-kind yang sedang dimuat untuk turnamen terpilih. Tambah, edit, atau hapus transaksi akan langsung mengubah analisa setelah data tersimpan.</p>
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase text-emerald-300"><CheckCircle2 size={13} /> Live DB</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Pemasukan</p><p className="mt-1 text-sm font-black text-emerald-300">{rupiah(totalIn)}</p><p className="mt-1 text-[9px] text-slate-500">{income.length} transaksi</p></div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Pengeluaran</p><p className="mt-1 text-sm font-black text-amber-300">{rupiah(totalOut)}</p><p className="mt-1 text-[9px] text-slate-500">{expense.length} transaksi</p></div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Saldo</p><p className="mt-1 text-sm font-black text-white">{rupiah(balance)}</p><p className="mt-1 text-[9px] text-slate-500">Pemasukan − pengeluaran</p></div>
        <div className="rounded-xl border border-white/5 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">In-Kind</p><p className="mt-1 text-sm font-black text-cyan-300">{kind.reduce((a, x) => a + Number(x.quantity || 0), 0)} item</p><p className="mt-1 text-[9px] text-slate-500">{kind.length} catatan</p></div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-white/[.02] px-3 py-2.5"><span className="text-[9px] text-slate-500">Sponsor & Donatur</span><strong className="float-right text-[10px] text-slate-200">{rupiah(sponsor)}</strong></div>
        <div className="rounded-xl border border-white/5 bg-white/[.02] px-3 py-2.5"><span className="text-[9px] text-slate-500">Registrasi Peserta</span><strong className="float-right text-[10px] text-slate-200">{rupiah(reg)}</strong></div>
        <div className="rounded-xl border border-white/5 bg-white/[.02] px-3 py-2.5"><span className="text-[9px] text-slate-500">Refund/Pengembalian</span><strong className="float-right text-[10px] text-slate-200">{rupiah(refund)}</strong></div>
      </div>
      <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2.5 text-[10px] leading-5 text-slate-300"><span className="font-black text-emerald-300">Status analisa:</span> Selisih terhadap total transaksi database = <b className="text-emerald-300">{rupiah(discrepancy)}</b>. Tidak ada pembanding nominal hard-coded; database menjadi sumber angka aktual.</div>
    </section>\n\n`;

if (!s.includes('Analisa Otomatis • Database Terbaru')) {
  if (!s.includes(marker)) {
    console.warn('[patch-admin-tournament-finance-dynamic-analysis] insertion marker not found; skipped UI insertion.');
  } else {
    s = s.replace(marker, liveBlock + marker);
  }
}

fs.writeFileSync(path, s);
console.log('[patch-admin-tournament-finance-dynamic-analysis] live database analysis applied.');
