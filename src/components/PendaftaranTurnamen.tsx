import React, { useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { broadcastDataChange } from '../utils/realtimeHelper';
import Swal from 'sweetalert2';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, FileUp, MapPin, Phone, Send, ShieldCheck, Trophy, Users, X } from 'lucide-react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  'Ganda Putra AD/BC-/C+C Ajatappareng',
  'Ganda Putra CC Lokal Parepare'
];
const FEE = 150000;
const ADMIN_WA = '6289641676342';

const emptyForm = {
  nama_pemain_1: '',
  nama_pemain_2: '',
  whatsapp: '',
  email: '',
  asal_pb: '',
  domisili: '',
  kategori: CATEGORIES[0],
};

function generateCode() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `B162-${stamp}-${rand}`;
}

export default function PendaftaranTurnamen() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [proof, setProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ code: string; wa: string } | null>(null);

  const selectedLabel = useMemo(() => form.kategori === CATEGORIES[0] ? 'Ajatappareng' : 'Lokal Parepare', [form.kategori]);

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const next = () => {
    if (step === 1 && (!form.nama_pemain_1.trim() || !form.nama_pemain_2.trim() || !form.whatsapp.trim())) {
      Swal.fire({ icon: 'warning', title: 'Data pasangan belum lengkap', text: 'Nama kedua pemain dan WhatsApp wajib diisi.', confirmButtonColor: '#2563eb' });
      return;
    }
    if (step === 2 && (!form.asal_pb.trim() || !form.domisili.trim())) {
      Swal.fire({ icon: 'warning', title: 'Data tim belum lengkap', text: 'Asal PB/Klub dan domisili wajib diisi.', confirmButtonColor: '#2563eb' });
      return;
    }
    setStep(v => Math.min(3, v + 1));
  };

  const previous = () => setStep(v => Math.max(1, v - 1));

  const handleProof = (file: File | null) => {
    setProof(file);
    if (!file) return setProofPreview(null);
    if (file.size > 5 * 1024 * 1024) {
      setProof(null);
      setProofPreview(null);
      Swal.fire({ icon: 'warning', title: 'File terlalu besar', text: 'Ukuran bukti pembayaran maksimal 5 MB.', confirmButtonColor: '#2563eb' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProofPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!proof) {
      Swal.fire({ icon: 'warning', title: 'Bukti pembayaran belum dipilih', text: 'Unggah bukti pembayaran agar admin dapat memverifikasi pendaftaran.', confirmButtonColor: '#2563eb' });
      return;
    }
    setLoading(true);
    try {
      const code = generateCode();
      let proofUrl = '';
      const ext = proof.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `turnamen-bilibili-162/${code}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('uploads').upload(path, proof, { upsert: false, contentType: proof.type || 'application/octet-stream' });
      if (uploadError) throw new Error(`Upload bukti pembayaran gagal: ${uploadError.message}`);
      proofUrl = supabase.storage.from('uploads').getPublicUrl(path).data.publicUrl;

      const payload = {
        kode_pendaftaran: code,
        nama_pemain_1: form.nama_pemain_1.trim().toUpperCase(),
        nama_pemain_2: form.nama_pemain_2.trim().toUpperCase(),
        whatsapp: form.whatsapp.trim(),
        email: form.email.trim().toLowerCase() || null,
        asal_pb: form.asal_pb.trim().toUpperCase(),
        domisili: form.domisili.trim().toUpperCase(),
        kategori: form.kategori,
        biaya_pendaftaran: FEE,
        status_pembayaran: 'Menunggu Verifikasi',
        bukti_pembayaran_url: proofUrl,
        status_pendaftaran: 'Pending'
      };
      const { error } = await supabase.from('pendaftaran_turnamen').insert(payload);
      if (error) throw error;
      broadcastDataChange('pendaftaran_turnamen', 'INSERT', payload);

      const wa = form.whatsapp.replace(/\D/g, '').replace(/^0/, '62');
      const message = encodeURIComponent(
        `*PENDAFTARAN BILIBILI 162 CUP I 2026*\n\n` +
        `Kode: *${code}*\n` +
        `Kategori: *${form.kategori}*\n` +
        `Pasangan: *${form.nama_pemain_1.toUpperCase()} & ${form.nama_pemain_2.toUpperCase()}*\n` +
        `Asal PB/Klub: ${form.asal_pb.toUpperCase()}\n` +
        `Domisili: ${form.domisili.toUpperCase()}\n` +
        `Biaya: *Rp150.000/pasang*\n` +
        `Status: *MENUNGGU VERIFIKASI ADMIN*\n\n` +
        `Tanggal: 09-12 September 2026\n` +
        `Lokasi: GOR Titik Kumpul Soreang Parepare`
      );
      setSuccess({ code, wa: wa || ADMIN_WA });
      window.open(`https://wa.me/${wa || ADMIN_WA}?text=${message}`, '_blank');
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Pendaftaran gagal', text: err?.message || 'Terjadi kesalahan saat menyimpan pendaftaran.', confirmButtonColor: '#ef4444' });
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center py-8">
      <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-xl rounded-3xl border border-emerald-400/25 bg-slate-950/90 p-6 sm:p-9 shadow-2xl text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-400"><CheckCircle2 size={44}/></div>
        <p className="text-[11px] font-black tracking-[.25em] text-emerald-400 uppercase">Pendaftaran Berhasil</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white">BILIBILI 162 CUP I</h2>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[.03] p-5">
          <p className="text-xs text-slate-400 uppercase tracking-widest">Kode Pendaftaran</p>
          <p className="mt-1 text-xl font-black text-amber-300 tracking-wider">{success.code}</p>
          <p className="mt-4 text-xs leading-relaxed text-slate-300">Simpan kode ini. Pendaftaran akan berstatus <b className="text-amber-300">Menunggu Verifikasi</b> sampai admin memeriksa pembayaran dan data pasangan.</p>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button onClick={() => window.open(`https://wa.me/${ADMIN_WA}`, '_blank')} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white uppercase tracking-wider">Hubungi Admin WhatsApp</button>
          <button onClick={() => { setSuccess(null); setForm(emptyForm); setProof(null); setProofPreview(null); setStep(1); }} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-slate-200 uppercase tracking-wider">Daftar Pasangan Lain</button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="w-full py-2 sm:py-5">
      <div className="relative overflow-hidden rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-[#071225] via-[#0b1730] to-[#050a14] shadow-2xl">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{backgroundImage:'radial-gradient(circle at 20% 10%, #2563eb 0, transparent 30%), radial-gradient(circle at 85% 20%, #f59e0b 0, transparent 28%)'}} />
        <div className="relative p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-300"><Trophy size={13}/> Bilibili 162 Cup I • 2026</div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-black italic uppercase text-white">Pendaftaran Peserta</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">Daftarkan satu pasangan untuk Turnamen Badminton Bilibili 162 Cup I Tahun 2026. Data pendaftaran akan tersimpan di sistem dan dapat diverifikasi admin.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 shrink-0">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><CalendarDays size={18} className="text-blue-400"/><p className="mt-2 text-[10px] text-slate-400 uppercase">Pelaksanaan</p><p className="text-sm font-black text-white">09–12 Sep 2026</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><MapPin size={18} className="text-amber-400"/><p className="mt-2 text-[10px] text-slate-400 uppercase">Lokasi</p><p className="text-sm font-black text-white">GOR Titik Kumpul Soreang Parepare</p></div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
            {[['1','Pasangan'],['2','Tim'],['3','Pembayaran']].map(([n,label]) => <div key={n} className={`rounded-xl px-3 py-2 text-center ${step === Number(n) ? 'bg-blue-600 text-white' : 'text-slate-500'}`}><span className="text-[10px] font-black">{n}</span><p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">{label}</p></div>)}
          </div>

          {step === 1 && <section className="mt-7 space-y-5">
            <div><label className="text-[11px] font-black uppercase tracking-widest text-slate-300">Kategori Pertandingan</label><select value={form.kategori} onChange={e=>update('kategori',e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500"><option>{CATEGORIES[0]}</option><option>{CATEGORIES[1]}</option></select><p className="mt-2 text-xs text-slate-500">Kategori aktif: <span className="text-amber-300 font-bold">{selectedLabel}</span></p></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field icon={<Users size={15}/>} label="Nama Pemain 1" value={form.nama_pemain_1} onChange={v=>update('nama_pemain_1',v)} />
              <Field icon={<Users size={15}/>} label="Nama Pemain 2" value={form.nama_pemain_2} onChange={v=>update('nama_pemain_2',v)} />
              <Field icon={<Phone size={15}/>} label="WhatsApp Ketua/Penanggung Jawab" value={form.whatsapp} onChange={v=>update('whatsapp',v)} type="tel" />
              <Field icon={<Send size={15}/>} label="Email (opsional)" value={form.email} onChange={v=>update('email',v)} type="email" />
            </div>
          </section>}

          {step === 2 && <section className="mt-7 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4"><Field icon={<ShieldCheck size={15}/>} label="Asal PB / Klub" value={form.asal_pb} onChange={v=>update('asal_pb',v)} /><Field icon={<MapPin size={15}/>} label="Kota / Domisili" value={form.domisili} onChange={v=>update('domisili',v)} /></div>
            <div className="rounded-2xl border border-blue-400/15 bg-blue-500/5 p-4"><div className="flex gap-3"><Trophy className="text-amber-400 shrink-0" size={22}/><div><p className="text-xs font-black uppercase tracking-widest text-white">Biaya Pendaftaran</p><p className="mt-1 text-2xl font-black text-amber-300">Rp150.000 <span className="text-xs font-bold text-slate-400">/ pasangan</span></p><p className="mt-1 text-[11px] text-slate-400">Kedua kategori pada poster menggunakan biaya Rp150.000 per pasangan.</p></div></div></div>
          </section>}

          {step === 3 && <section className="mt-7 space-y-5">
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"><p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Ringkasan</p><div className="mt-3 grid sm:grid-cols-2 gap-3 text-xs"><Summary label="Kategori" value={form.kategori}/><Summary label="Pasangan" value={`${form.nama_pemain_1.toUpperCase()} & ${form.nama_pemain_2.toUpperCase()}`}/><Summary label="Asal PB/Klub" value={form.asal_pb.toUpperCase()}/><Summary label="Domisili" value={form.domisili.toUpperCase()}/></div></div>
            <div><label className="text-[11px] font-black uppercase tracking-widest text-slate-300">Upload Bukti Pembayaran</label><label className="mt-2 flex min-h-36 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-blue-400/30 bg-blue-500/5 p-5 text-center hover:bg-blue-500/10"><input type="file" accept="image/*,.pdf" className="hidden" onChange={e=>handleProof(e.target.files?.[0] || null)}/>{proofPreview ? <div className="flex items-center gap-3"><img src={proofPreview} className="h-20 w-20 rounded-xl object-cover border border-white/10"/><div className="text-left"><p className="text-xs font-bold text-white">{proof?.name}</p><p className="mt-1 text-[10px] text-emerald-400">File siap dikirim</p></div></div> : <div><FileUp className="mx-auto text-blue-400" size={30}/><p className="mt-2 text-xs font-bold text-white">Pilih bukti transfer</p><p className="mt-1 text-[10px] text-slate-500">JPG/PNG/PDF • maksimal 5 MB</p></div>}</label></div>
          </section>}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-5">
            <button onClick={previous} disabled={step===1 || loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-black text-slate-300 disabled:opacity-30"><ChevronLeft size={15}/> Kembali</button>
            {step < 3 ? <button onClick={next} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-blue-900/30">Lanjut <ChevronRight size={15}/></button> : <button onClick={submit} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60">{loading ? 'Mengirim...' : 'Kirim Pendaftaran'} <CheckCircle2 size={15}/></button>}
          </div>
          <p className="mt-4 text-center text-[10px] text-slate-500">Pertanyaan pendaftaran: <button onClick={()=>window.open(`https://wa.me/${ADMIN_WA}`,'_blank')} className="font-bold text-blue-400 hover:text-blue-300">Admin PB Bilibili 162 • 0896 1674 6342</button></p>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, value, onChange, type='text' }: { icon: React.ReactNode; label: string; value: string; onChange: (v:string)=>void; type?: string }) {
  return <label className="block"><span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-300">{icon}{label}</span><input type={type} value={value} onChange={e=>onChange(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500" /></label>;
}
function Summary({ label, value }: { label:string; value:string }) { return <div className="rounded-xl border border-white/10 bg-white/5 p-3"><p className="text-[9px] uppercase tracking-widest text-slate-500">{label}</p><p className="mt-1 font-bold text-white leading-relaxed">{value}</p></div>; }
