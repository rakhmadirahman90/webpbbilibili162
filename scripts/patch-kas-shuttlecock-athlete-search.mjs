import fs from 'node:fs';

const path = 'src/components/KasManager.tsx';
let s = fs.readFileSync(path, 'utf8');

const marker = '/* KAS_SHUTTLECOCK_AUTO_CALC_V1 */';
if (s.includes(marker)) {
  console.log('[patch-kas-shuttlecock-athlete-search] already applied');
  process.exit(0);
}

// Price is intentionally explicit because the club may use Rp4.000 or Rp5.000 per shuttlecock.
s = s.replace(
  "const emptyForm = () => ({ nama_pembayar: '', kategori: DAFTAR_PEMASUKAN[0], jumlah_bayar: 10000, jumlah_bola: 0, tipe_anggota: 'Anggota Tetap', jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar', tanggal_transaksi: localToday(), keterangan: '' });",
  "const HARGA_BOLA_OPTIONS = [4000, 5000];\nconst formatHargaBola = (value: number) => `Rp ${formatRupiah(value)} / bola`;\nconst emptyForm = () => ({ nama_pembayar: '', kategori: DAFTAR_PEMASUKAN[0], jumlah_bayar: 10000, jumlah_bola: 0, tipe_anggota: 'Anggota Tetap', jenis_transaksi: 'Masuk' as 'Masuk' | 'Keluar', tanggal_transaksi: localToday(), keterangan: '' });"
);

s = s.replace(
  "const [atlets, setAtlets] = useState<Atlet[]>([]);",
  "const [atlets, setAtlets] = useState<Atlet[]>([]);\n  const [hargaBola, setHargaBola] = useState(5000);"
);

s = s.replace(
  "const resetForm = () => { setEditingId(null); setFormData(emptyForm()); setActiveMobileTab('list'); };",
  "const resetForm = () => { setEditingId(null); setHargaBola(5000); setFormData(emptyForm()); setActiveMobileTab('list'); };"
);

s = s.replace(
  "const finalData = { ...formData, nama_pembayar: formData.nama_pembayar.trim(), jumlah_bayar: Number(formData.jumlah_bayar), jumlah_bola: Number(formData.jumlah_bola || 0), jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' as const : formData.jenis_transaksi, keterangan: formData.keterangan.trim() || null };",
  "const jumlahBolaFinal = Number(formData.jumlah_bola || 0);\n      const nominalFinal = formData.kategori === 'Pembayaran Shuttlecock' && formData.jenis_transaksi === 'Masuk' && jumlahBolaFinal > 0 ? jumlahBolaFinal * hargaBola : Number(formData.jumlah_bayar);\n      const finalData = { ...formData, nama_pembayar: formData.nama_pembayar.trim(), jumlah_bayar: nominalFinal, jumlah_bola: jumlahBolaFinal, jenis_transaksi: DAFTAR_PEMASUKAN.includes(formData.kategori) ? 'Masuk' as const : formData.jenis_transaksi, keterangan: formData.keterangan.trim() || null };"
);

s = s.replace(
  "const editKas = (row: KasEntry) => { setEditingId(row.id); setFormData({ nama_pembayar: row.nama_pembayar || '', kategori: row.kategori || DAFTAR_PEMASUKAN[0], jumlah_bayar: Number(row.jumlah_bayar || 0), jumlah_bola: Number(row.jumlah_bola || 0), tipe_anggota: row.tipe_anggota || 'Anggota Tetap', jenis_transaksi: row.jenis_transaksi, tanggal_transaksi: row.tanggal_transaksi, keterangan: row.keterangan || '' }); setActiveMobileTab('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };",
  "const editKas = (row: KasEntry) => { const balls = Number(row.jumlah_bola || 0); const storedRate = balls > 0 ? Number(row.jumlah_bayar || 0) / balls : 5000; const detectedRate = HARGA_BOLA_OPTIONS.includes(storedRate) ? storedRate : 5000; setEditingId(row.id); setHargaBola(detectedRate); setFormData({ nama_pembayar: row.nama_pembayar || '', kategori: row.kategori || DAFTAR_PEMASUKAN[0], jumlah_bayar: Number(row.jumlah_bayar || 0), jumlah_bola: balls, tipe_anggota: row.tipe_anggota || 'Anggota Tetap', jenis_transaksi: row.jenis_transaksi, tanggal_transaksi: row.tanggal_transaksi, keterangan: row.keterangan || '' }); setActiveMobileTab('form'); window.scrollTo({ top: 0, behavior: 'smooth' }); };"
);

const oldBallBlock = `<div className=\"grid grid-cols-2 gap-3\"><label className=\"text-[9px] font-bold uppercase text-slate-500\">Tipe Member<select className={inputClass+' mt-1'} value={formData.tipe_anggota} onChange={e=>setFormData(f=>({...f,tipe_anggota:e.target.value}))}><option>Anggota Tetap</option><option>Anggota Tidak Tetap</option></select></label><label className=\"text-[9px] font-bold uppercase text-slate-500\">Jumlah Bola<input className={inputClass+' mt-1 text-emerald-400'} type=\"number\" min=\"0\" value={formData.jumlah_bola||''} onChange={e=>setFormData(f=>({...f,jumlah_bola:Number(e.target.value)||0}))}/></label></div>`;
const newBallBlock = `<div className=\"grid grid-cols-2 gap-3\"><label className=\"text-[9px] font-bold uppercase text-slate-500\">Tipe Member<select className={inputClass+' mt-1'} value={formData.tipe_anggota} onChange={e=>setFormData(f=>({...f,tipe_anggota:e.target.value}))}><option>Anggota Tetap</option><option>Anggota Tidak Tetap</option></select></label><label className=\"text-[9px] font-bold uppercase text-slate-500\">Harga / Bola<select className={inputClass+' mt-1'} value={hargaBola} onChange={e=>{const rate=Number(e.target.value);setHargaBola(rate);setFormData(f=>({...f,jumlah_bayar:Number(f.jumlah_bola||0)*rate}))}}>{HARGA_BOLA_OPTIONS.map(rate=><option key={rate} value={rate}>{formatHargaBola(rate)}</option>)}</select></label><label className=\"col-span-2 text-[9px] font-bold uppercase text-slate-500\">Jumlah Bola<input className={inputClass+' mt-1 text-emerald-400'} type=\"number\" min=\"0\" value={formData.jumlah_bola||''} onChange={e=>{const balls=Number(e.target.value)||0;setFormData(f=>({...f,jumlah_bola:balls,jumlah_bayar:balls*hargaBola}))}} placeholder=\"Jumlah bola\"/></label></div>`;
if (!s.includes(oldBallBlock)) {
  throw new Error('[patch-kas-shuttlecock-athlete-search] shuttlecock ball block not found');
}
s = s.replace(oldBallBlock, newBallBlock);

const oldAthlete = `<label className=\"block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400\">Nama / Keterangan{formData.jenis_transaksi==='Masuk'?<select required className={inputClass+' mt-1 p-3'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))}><option value=\"\">Pilih Atlet...</option>{atlets.map(a=><option key={a.id} value={a.player_name}>{a.player_name}</option>)}</select>:<input required className={inputClass+' mt-1 p-3'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))} placeholder=\"Nama Penerima\"/>}</label>`;
const newAthlete = `<label className=\"block text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400\">Nama / Keterangan{formData.jenis_transaksi==='Masuk'?<div className=\"mt-1 space-y-2\"><input required className={inputClass+' p-3'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))} placeholder=\"Cari nama atlet dari database...\" autoComplete=\"off\"/><div className=\"max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/80\">{formData.nama_pembayar.trim()&&atlets.filter(a=>a.player_name.toLowerCase().includes(formData.nama_pembayar.trim().toLowerCase())).slice(0,8).map(a=><button key={a.id} type=\"button\" className=\"block w-full border-b border-white/5 px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-blue-500/10\" onClick={()=>setFormData(f=>({...f,nama_pembayar:a.player_name}))}>{a.player_name}</button>)}{formData.nama_pembayar.trim()&&atlets.every(a=>!a.player_name.toLowerCase().includes(formData.nama_pembayar.trim().toLowerCase()))&&<div className=\"px-3 py-3 text-[10px] text-slate-500\">Nama atlet tidak ditemukan di database.</div>}</div></div>:<input required className={inputClass+' mt-1 p-3'} value={formData.nama_pembayar} onChange={e=>setFormData(f=>({...f,nama_pembayar:e.target.value}))} placeholder=\"Nama Penerima\"/>}</label>`;
if (!s.includes(oldAthlete)) {
  throw new Error('[patch-kas-shuttlecock-athlete-search] athlete dropdown block not found');
}
s = s.replace(oldAthlete, newAthlete);

const oldNominalHandler = "<input type=\"text\" inputMode=\"numeric\" className={inputClass+' pl-10 py-3 font-black text-blue-400'} value={formData.jumlah_bayar?formatRupiah(formData.jumlah_bayar):''} onChange={e=>setFormData(f=>({...f,jumlah_bayar:parseRupiah(e.target.value)}))}/>";
const newNominalHandler = "<input type=\"text\" inputMode=\"numeric\" readOnly={formData.kategori==='Pembayaran Shuttlecock'&&formData.jenis_transaksi==='Masuk'} className={inputClass+' pl-10 py-3 font-black text-blue-400'} value={formData.jumlah_bayar?formatRupiah(formData.jumlah_bayar):''} onChange={e=>setFormData(f=>({...f,jumlah_bayar:parseRupiah(e.target.value)}))}/>{formData.kategori==='Pembayaran Shuttlecock'&&formData.jenis_transaksi==='Masuk'&&<div className=\"mt-1 text-[9px] font-bold text-emerald-300\">Otomatis: {formData.jumlah_bola||0} bola × {formatHargaBola(hargaBola)}</div>}";
if (!s.includes(oldNominalHandler)) throw new Error('[patch-kas-shuttlecock-athlete-search] nominal input not found');
s = s.replace(oldNominalHandler, newNominalHandler);

// Keep a visible marker in the generated source so the patch is idempotent.
s = s.replace("export default function KasManager() {", `${marker}\nexport default function KasManager() {`);
fs.writeFileSync(path, s, 'utf8');
console.log('[patch-kas-shuttlecock-athlete-search] shuttlecock auto nominal + database athlete search applied');
