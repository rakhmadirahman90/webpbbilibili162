import fs from 'node:fs';

const path = 'src/components/AdminKelolaTurnamen.tsx';
if (!fs.existsSync(path)) {
  console.warn('[patch-admin-tournament-linked-mobile-cards] source not found; skipped.');
  process.exit(0);
}

let s = fs.readFileSync(path, 'utf8');

const old = `<div className="overflow-x-auto rounded-xl border border-white/5"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-950 text-[9px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Kode</th><th className="px-3 py-3">Pasangan</th><th className="px-3 py-3">Kategori</th><th className="px-3 py-3">PB / Domisili</th><th className="px-3 py-3">Pendaftaran</th><th className="px-3 py-3">Pembayaran</th><th className="px-3 py-3">Tanggal</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map(r=><tr key={r.id} className="hover:bg-white/[.02]"><td className="px-3 py-3 font-mono text-blue-300">{r.kode_pendaftaran}</td><td className="px-3 py-3"><div className="font-bold">{r.nama_pemain_1}</div><div className="text-slate-500">& {r.nama_pemain_2}</div></td><td className="px-3 py-3 text-slate-300">{r.kategori}</td><td className="px-3 py-3"><div>{r.asal_pb||'-'}</div><div className="text-slate-500">{r.domisili||'-'}</div></td><td className="px-3 py-3"><span className={text(r.status_pendaftaran).toLowerCase()==='diterima'?'text-emerald-300':'text-amber-300'}>{r.status_pendaftaran}</span></td><td className="px-3 py-3"><div>{r.status_pembayaran}</div><div className="text-slate-500">{money(r.biaya_pendaftaran)}</div></td><td className="px-3 py-3 text-slate-500">{new Date(r.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</td></tr>)}</tbody></table>{!filtered.length&&<div className="p-8 text-center text-xs text-slate-500">Tidak ada pendaftaran sesuai filter.</div>}</div>`;

// Use placeholders for ${...} so this build script never nests template expressions.
const replacementTemplate = String.raw`<div className="space-y-3">
  <div className="hidden overflow-x-auto rounded-xl border border-white/5 md:block">
    <table className="w-full min-w-[900px] text-left text-xs">
      <thead className="bg-slate-950 text-[9px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Kode</th><th className="px-3 py-3">Pasangan</th><th className="px-3 py-3">Kategori</th><th className="px-3 py-3">PB / Domisili</th><th className="px-3 py-3">Pendaftaran</th><th className="px-3 py-3">Pembayaran</th><th className="px-3 py-3">Tanggal</th></tr></thead>
      <tbody className="divide-y divide-white/5">__DOLLAR__{filtered.map(r=><tr key={r.id} className="hover:bg-white/[.02]"><td className="px-3 py-3 font-mono text-blue-300">__DOLLAR__{r.kode_pendaftaran}</td><td className="px-3 py-3"><div className="font-bold">__DOLLAR__{r.nama_pemain_1}</div><div className="text-slate-500">& __DOLLAR__{r.nama_pemain_2}</div></td><td className="px-3 py-3 text-slate-300">__DOLLAR__{r.kategori}</td><td className="px-3 py-3"><div>__DOLLAR__{r.asal_pb||'-'}</div><div className="text-slate-500">__DOLLAR__{r.domisili||'-'}</div></td><td className="px-3 py-3"><span className={text(r.status_pendaftaran).toLowerCase()==='diterima'?'text-emerald-300':'text-amber-300'}>__DOLLAR__{r.status_pendaftaran}</span></td><td className="px-3 py-3"><div>__DOLLAR__{r.status_pembayaran}</div><div className="text-slate-500">__DOLLAR__{money(r.biaya_pendaftaran)}</div></td><td className="px-3 py-3 text-slate-500">__DOLLAR__{new Date(r.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</td></tr>)}__DOLLAR__</tbody>
    </table>
  </div>
  <div className="space-y-3 md:hidden">
    __DOLLAR__{filtered.map(r => { const accepted = text(r.status_pendaftaran).toLowerCase() === 'diterima'; const paid = text(r.status_pembayaran).toLowerCase().includes('terver'); return <article key={r.id} className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-lg">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-black uppercase tracking-wider text-blue-300">__DOLLAR__{r.kode_pendaftaran || 'ID ' + r.id}</p><h3 className="mt-1 text-sm font-black leading-5 text-white">__DOLLAR__{r.nama_pemain_1 || '-'} <span className="text-slate-500">&</span> __DOLLAR__{r.nama_pemain_2 || '-'}</h3></div>
        <span className={__DOLLAR__{'accepted ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}'}>{__DOLLAR__{accepted ? 'Diterima' : (r.status_pendaftaran || 'Pending')}}</span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/5">
        <div className="bg-slate-950/70 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Kategori</p><p className="mt-1 break-words text-xs font-bold leading-5 text-slate-200">__DOLLAR__{r.kategori || '-'}</p></div>
        <div className="bg-slate-950/70 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Pembayaran</p><p className={__DOLLAR__{'mt-1 break-words text-xs font-bold leading-5 ' + (paid ? 'text-emerald-300' : 'text-amber-300')}}>__DOLLAR__{r.status_pembayaran || 'Menunggu'}<br/><span className="text-[10px] text-slate-500">__DOLLAR__{money(r.biaya_pendaftaran)}</span></p></div>
        <div className="bg-slate-950/70 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">PB / Domisili</p><p className="mt-1 break-words text-xs font-bold leading-5 text-slate-200">__DOLLAR__{r.asal_pb || '-'}<br/><span className="font-normal text-slate-500">__DOLLAR__{r.domisili || '-'}</span></p></div>
        <div className="bg-slate-950/70 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">Tanggal Daftar</p><p className="mt-1 text-[10px] font-bold leading-5 text-slate-300">__DOLLAR__{new Date(r.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</p></div>
      </div>
    </article>; })}
    __DOLLAR__{!filtered.length && <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-xs text-slate-500">Tidak ada pendaftaran sesuai filter.</div>}
  </div>
</div>`;
const replacement = replacementTemplate.replaceAll('__DOLLAR__', '$');

if (!s.includes('tournament-linked-mobile-cards-v2')) {
  if (!s.includes(old)) {
    console.warn('[patch-admin-tournament-linked-mobile-cards] target table markup not found; skipped.');
    process.exit(0);
  }
  s = s.replace(old, replacement);
  s = s.replace('return <div className="min-h-full bg-[#050b17]', '/* tournament-linked-mobile-cards-v2 */\n  return <div className="min-h-full bg-[#050b17]');
}

// Stable two-column tabs on phones; prevent the long label from wrapping vertically.
s = s.replace('<div className="flex flex-wrap border-b border-white/10">', '<div className="grid grid-cols-2 border-b border-white/10">');
s = s.replace('px-4 py-3 text-[10px] font-black uppercase tracking-wider ${tab===\'tournament\'?', 'min-w-0 px-2 py-3 text-center text-[10px] font-black uppercase tracking-wide leading-4 whitespace-nowrap ${tab===\'tournament\'?');
s = s.replace('px-4 py-3 text-[10px] font-black uppercase tracking-wider ${tab===\'participants\'?', 'min-w-0 px-2 py-3 text-center text-[10px] font-black uppercase tracking-wide leading-4 whitespace-nowrap ${tab===\'participants\'?');

fs.writeFileSync(path, s);
console.log('[patch-admin-tournament-linked-mobile-cards] mobile cards + stable tabs applied.');
