import React from 'react';

const QRIS_PAYLOAD = '00020101021126690021ID.CO.BANKMANDIRI.WWW01189360000802195114700211721951147030303UMI51440014ID.CO.QRIS.WWW0215ID10265643934560303UMI5204794153033605802ID5915PB Bilibili 1626015Parepare (Kota)61059113362070703A01630411B7';
const QRIS_URL = `https://api.qrserver.com/v1/create-qr-code/?size=800x800&margin=24&format=png&data=${encodeURIComponent(QRIS_PAYLOAD)}`;

export default function PaymentInstructions(){
  return <div className="space-y-4">
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5">
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Pembayaran Wajib</p><p className="mt-1 text-lg font-black text-white">Rp150.000 / pasangan</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1 text-[9px] font-black uppercase text-amber-300">Sebelum kirim</span></div>
      <p className="mt-3 text-xs leading-relaxed text-slate-300">Silakan pilih salah satu metode pembayaran: <b className="text-white">transfer Bank Syariah Indonesia (BSI) atas nama PB Bilibili 162</b> atau scan QRIS resmi di bawah.</p>
    </div>
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Transfer BSI</p>
        <p className="mt-3 text-sm font-black text-white">PB Bilibili 162</p>
        <p className="mt-1 text-xs text-slate-400">Bank Syariah Indonesia (BSI)</p>
        <div className="mt-4 rounded-xl border border-blue-400/20 bg-blue-500/5 p-4"><p className="text-[9px] font-black uppercase tracking-widest text-blue-300">Nomor Rekening</p><p className="mt-1 text-2xl font-black tracking-wider text-white">1160319902</p><button type="button" onClick={()=>navigator.clipboard?.writeText('1160319902')} className="mt-3 min-h-11 rounded-lg border border-white/10 px-4 py-2 text-[10px] font-black text-slate-300 hover:bg-white/5">Salin Nomor Rekening</button></div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">QRIS • PB BILIBILI 162</p>
        <div className="mx-auto mt-3 w-full max-w-[340px] rounded-2xl bg-white p-5 shadow-xl">
          <img src={QRIS_URL} alt="QRIS pembayaran PB Bilibili 162" className="block h-auto w-full select-none" width={800} height={800} decoding="sync" draggable="false" style={{imageRendering:'pixelated'}} />
        </div>
        <p className="mt-3 text-[10px] font-bold text-slate-400">NMID: ID1026564393456 • A01</p>
        <p className="mt-1 text-[9px] leading-relaxed text-slate-500">QR dibuat langsung dari payload QRIS terverifikasi, bukan dari screenshot atau gambar yang direkonstruksi. Area kode dipertahankan tajam tanpa overlay, crop, radius, atau kompresi.</p>
      </div>
    </div>
    <div className="rounded-2xl border border-blue-400/15 bg-blue-500/5 p-4 text-xs leading-relaxed text-slate-300"><b className="text-blue-300">Alur cepat:</b> Bayar Rp150.000 → simpan bukti transaksi → unggah bukti pembayaran pada form → kirim pendaftaran. Admin melakukan verifikasi pembayaran sebelum peserta dinyatakan terdaftar.</div>
  </div>;
}
