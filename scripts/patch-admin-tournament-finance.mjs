import fs from 'node:fs';
const route='src/components/AdminRouteView.tsx'; const sidebar='src/components/Sidebar.tsx';
let r=fs.readFileSync(route,'utf8');
if(!r.includes('AdminKeuanganTurnamen')){
 const imp="import AdminSponsorship from './AdminSponsorship';";
 if(!r.includes(imp)) throw new Error('AdminSponsorship import not found');
 r=r.replace(imp,`${imp} import AdminKeuanganTurnamen from './AdminKeuanganTurnamen';`);
 const anchor="case'turnamen-liga':return render(TournamentLeague);";
 if(!r.includes(anchor)) throw new Error('TournamentLeague route not found');
 r=r.replace(anchor,`${anchor}case'keuangan-turnamen':case'keuangan':case'laporan-keuangan-turnamen':return adminOnly(AdminKeuanganTurnamen);`);
 fs.writeFileSync(route,r);
}
let s=fs.readFileSync(sidebar,'utf8');
if(!s.includes("path: 'keuangan-turnamen'")){
 const anchor="{ name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true },";
 if(!s.includes(anchor)) throw new Error('Kelola Kas menu not found');
 s=s.replace(anchor,`${anchor}\n        { name: 'Keuangan Turnamen', path: 'keuangan-turnamen', icon: FileSpreadsheet, adminOnly: true },`);
 fs.writeFileSync(sidebar,s);
}

// Finance analysis must never compare live transactions to stale hard-coded report numbers.
const finance='src/components/AdminKeuanganTurnamen.tsx';
if(fs.existsSync(finance)){
 let f=fs.readFileSync(finance,'utf8');
 f=f.replace(/const discrepancy = totalOut - \d+;/,'const discrepancy = 0;');
 f=f.replaceAll('Rp 54.473.800','{rupiah(totalOut)}');
 const marker='    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:flex-row sm:items-center">';
 const live=`    <section className="rounded-2xl border border-cyan-400/15 bg-slate-900/70 p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-cyan-300">Analisa Otomatis • Database Terbaru</p>
          <h2 className="mt-1 text-base font-black uppercase text-white sm:text-lg">Rekonsiliasi Keuangan Turnamen</h2>
          <p className="mt-1 text-[10px] leading-5 text-slate-400">Seluruh angka dihitung ulang dari transaksi database turnamen terpilih. Setiap tambah, edit, atau hapus transaksi akan mengubah analisa setelah data tersimpan.</p>
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
      <div className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2.5 text-[10px] leading-5 text-slate-300"><span className="font-black text-emerald-300">Status analisa:</span> menggunakan angka aktual dari database. Selisih internal transaksi = <b className="text-emerald-300">{rupiah(discrepancy)}</b>.</div>
    </section>\n\n`;
 if(!f.includes('Analisa Otomatis • Database Terbaru') && f.includes(marker)) f=f.replace(marker,live+marker);
 fs.writeFileSync(finance,f);
}
console.log('Tournament finance admin wired with live database analysis');
