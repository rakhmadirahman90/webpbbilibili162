import React, { useState } from 'react';
import { supabase } from '../supabase';
import { CheckCircle2, FileText, Loader2, MessageSquarePlus, Send, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

export default function ContactFeedbackForm() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    nama: '', organisasi: '', whatsapp: '', email: '', jenis: 'Masukan / Saran', perihal: '', isi: ''
  });

  const update = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const chooseFile = (selected: File | undefined) => {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      Swal.fire({ icon: 'warning', title: 'File terlalu besar', text: 'Ukuran lampiran maksimal 10 MB.', background: '#0f172a', color: '#fff' });
      return;
    }
    if (selected.type && !ACCEPTED_TYPES.includes(selected.type)) {
      Swal.fire({ icon: 'warning', title: 'Format tidak didukung', text: 'Gunakan PDF, JPG, PNG, DOC, atau DOCX.', background: '#0f172a', color: '#fff' });
      return;
    }
    setFile(selected);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.perihal.trim() || !form.isi.trim()) {
      Swal.fire({ icon: 'warning', title: 'Lengkapi data', text: 'Nama, perihal, dan isi masukan/usulan wajib diisi.', background: '#0f172a', color: '#fff' });
      return;
    }
    setSaving(true);
    try {
      let lampiranUrl = '';
      const submissionId = crypto.randomUUID();
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `masukan-usulan/${submissionId}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from('surat-masukan').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
        if (uploadError) throw new Error(`Gagal mengunggah lampiran: ${uploadError.message}`);
        const { data } = supabase.storage.from('surat-masukan').getPublicUrl(path);
        lampiranUrl = data.publicUrl;
      }

      const { error } = await supabase.from('masukan_usulan_tamu').insert({
        id: submissionId,
        nama: form.nama.trim(),
        organisasi: form.organisasi.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        email: form.email.trim() || null,
        jenis: form.jenis,
        perihal: form.perihal.trim(),
        isi: form.isi.trim(),
        lampiran_url: lampiranUrl || null,
        lampiran_nama: file?.name || null,
        lampiran_type: file?.type || null,
        lampiran_size: file?.size || null,
        status: 'Baru'
      });
      if (error) throw error;

      setSuccess(true);
      setFile(null);
      setForm({ nama: '', organisasi: '', whatsapp: '', email: '', jenis: 'Masukan / Saran', perihal: '', isi: '' });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'Pengiriman gagal', text: err?.message || 'Silakan coba kembali.', background: '#0f172a', color: '#fff' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full px-2.5 sm:px-4 md:px-6 pb-5 md:pb-10">
      <div className="max-w-7xl mx-auto bg-[#0b1224]/95 border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 sm:p-6 md:p-8 border-b border-white/10 bg-gradient-to-r from-blue-600/10 to-indigo-600/5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0"><MessageSquarePlus className="text-blue-400" size={22}/></div>
            <div>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Terbuka Untuk Umum</p>
              <h3 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight">Masukan, Saran & Usulan Kegiatan</h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-1 leading-relaxed">Tamu, komunitas, klub, atau pihak lain dapat menyampaikan masukan dan mengajukan usulan Mabar/Sparing bersama PB Bilibili 162. Lampiran surat dapat disertakan secara opsional.</p>
            </div>
          </div>
        </div>

        {success ? (
          <div className="p-8 md:p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="text-emerald-400" size={34}/></div>
            <h4 className="mt-4 text-xl font-black text-white uppercase">Masukan Berhasil Dikirim</h4>
            <p className="mt-2 text-sm text-slate-400 max-w-xl mx-auto">Terima kasih. Pengurus PB Bilibili 162 akan memeriksa masukan/usulan yang masuk dan menindaklanjutinya sesuai kebutuhan.</p>
            <button onClick={() => setSuccess(false)} className="mt-5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider">Kirim Masukan Lain</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-4 sm:p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div><label className="field-label">Nama / Pengusul *</label><input value={form.nama} onChange={e => update('nama', e.target.value)} className="field-input" placeholder="Nama lengkap" required /></div>
              <div><label className="field-label">Klub / Organisasi</label><input value={form.organisasi} onChange={e => update('organisasi', e.target.value)} className="field-input" placeholder="Opsional" /></div>
              <div><label className="field-label">WhatsApp</label><input value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} className="field-input" placeholder="08xxxxxxxxxx" inputMode="tel" /></div>
              <div><label className="field-label">Email</label><input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="field-input" placeholder="email@contoh.com" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div><label className="field-label">Jenis Pengajuan *</label><select value={form.jenis} onChange={e => update('jenis', e.target.value)} className="field-input"><option>Masukan / Saran</option><option>Usulan Mabar</option><option>Usulan Sparing</option><option>Usulan Kegiatan</option><option>Lainnya</option></select></div>
              <div className="md:col-span-2"><label className="field-label">Perihal *</label><input value={form.perihal} onChange={e => update('perihal', e.target.value)} className="field-input" placeholder="Contoh: Usulan Mabar Persahabatan" required /></div>
            </div>
            <div><label className="field-label">Masukan / Detail Usulan *</label><textarea value={form.isi} onChange={e => update('isi', e.target.value)} rows={5} className="field-input resize-y" placeholder="Jelaskan usulan, tujuan, rencana waktu/tempat jika sudah ada, dan informasi lain yang diperlukan..." required /></div>
            <div className="rounded-2xl border border-dashed border-blue-500/25 bg-blue-500/5 p-4">
              <label className="field-label flex items-center gap-2"><FileText size={13} className="text-blue-400"/> Lampiran Surat <span className="text-slate-500 normal-case tracking-normal">(opsional, maksimal 10 MB)</span></label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase cursor-pointer border border-white/10"><Upload size={15}/> Pilih Lampiran<input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => chooseFile(e.target.files?.[0])}/></label>
                {file && <div className="flex items-center gap-2 min-w-0 text-xs text-slate-300"><FileText size={15} className="text-emerald-400 shrink-0"/><span className="truncate">{file.name}</span><button type="button" onClick={() => setFile(null)} className="p-1 rounded-lg hover:bg-white/10" aria-label="Hapus lampiran"><X size={14}/></button></div>}
              </div>
              <p className="text-[9px] text-slate-500 mt-2">Format: PDF, JPG, PNG, DOC, DOCX.</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <p className="text-[9px] text-slate-500">Data digunakan untuk keperluan komunikasi dan tindak lanjut pengurus.</p>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/20"><Send size={15}/>{saving ? 'Mengirim...' : 'Kirim Masukan / Usulan'}</button>
            </div>
          </form>
        )}
      </div>
      <style>{`.field-label{display:block;margin:0 0 .45rem .15rem;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#94a3b8}.field-input{width:100%;border-radius:.9rem;border:1px solid rgba(255,255,255,.1);background:rgba(2,6,23,.55);padding:.7rem .8rem;font-size:.75rem;font-weight:600;color:#e2e8f0;outline:none}.field-input:focus{border-color:rgba(59,130,246,.65);box-shadow:0 0 0 3px rgba(59,130,246,.1)}select.field-input option{background:#0f172a;color:#fff}`}</style>
    </section>
  );
}
