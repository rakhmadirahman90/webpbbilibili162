import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import Swal from 'sweetalert2';
import { 
  Loader2, Send, CheckCircle2, User, Phone, 
  MapPin, Award, Image as ImageIcon, ChevronDown, 
  Users, Trophy, ArrowLeft, ArrowRight, UploadCloud, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const kategoriUmur = [
    "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
    "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)", 
    "Dewasa / Umum", "Veteran (35+ / 40+)"
  ];

  const [formData, setFormData] = useState({
    nama: '',
    whatsapp: '',
    jenis_kelamin: 'Putra',
    kategori: kategoriUmur[0],
    domisili: '',
    pengalaman: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFilePreview(null);
    }
  };

  const handleNextStep = () => {
    if (!formData.nama.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Lengkap Wajib Diisi',
        text: 'Silakan isi nama lengkap atlet terlebih dahulu.',
        confirmButtonColor: '#2563EB',
        background: '#1e293b',
        color: '#fff'
      });
      return;
    }
    if (!formData.whatsapp.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nomor WhatsApp Wajib Diisi',
        text: 'Silakan isi nomor WhatsApp aktif untuk koordinasi.',
        confirmButtonColor: '#2563EB',
        background: '#1e293b',
        color: '#fff'
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleNextStep();
      return;
    }

    if (!formData.domisili.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Domisili Wajib Diisi',
        text: 'Silakan lengkapi kota/kabupaten domisili saat ini.',
        confirmButtonColor: '#2563EB',
        background: '#1e293b',
        color: '#fff'
      });
      return;
    }

    if (!file) {
      Swal.fire({
        icon: 'warning',
        title: 'Foto Identitas Wajib Diunggah',
        text: 'Silakan unggah berkas identitas resmi (KK/AKTE/KIA).',
        confirmButtonColor: '#2563EB',
        background: '#1e293b',
        color: '#fff'
      });
      return;
    }

    setLoading(true);

    try {
      const listMuda = [
        "Pra Dini (U-9)", "Usia Dini (U-11)", "Anak-anak (U-13)", 
        "Pemula (U-15)", "Remaja (U-17)", "Taruna (U-19)"
      ];
      const kategori_atlet = listMuda.includes(formData.kategori) ? 'MUDA' : 'SENIOR';

      let publicUrl = "";
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `identitas/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('identitas-atlet')
          .upload(filePath, file);
          
        if (uploadError) throw new Error("Gagal upload foto: " + uploadError.message);
        
        const { data: urlData } = supabase.storage
          .from('identitas-atlet')
          .getPublicUrl(filePath);
          
        publicUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase
        .from('pendaftaran')
        .insert([{ 
          nama: formData.nama.toUpperCase().trim(), 
          whatsapp: formData.whatsapp.trim(), 
          jenis_kelamin: formData.jenis_kelamin,
          kategori: formData.kategori,
          kategori_atlet: kategori_atlet,
          domisili: formData.domisili.toUpperCase().trim(),
          pengalaman: formData.pengalaman || "-", 
          foto_url: publicUrl 
        }]);

      if (dbError) {
        if (dbError.message.includes("pengalaman")) {
          throw new Error("Kolom 'pengalaman' belum ada di database. Silakan hubungi Admin.");
        }
        throw dbError;
      }

      const adminPhoneNumber = "6281219027234";
      const waMessage = window.encodeURIComponent(
        `*PENDAFTARAN ATLET BARU*\n\n` +
        `*Nama:* ${formData.nama.toUpperCase()}\n` +
        `*Gender:* ${formData.jenis_kelamin}\n` +
        `*Kategori:* ${formData.kategori}\n` +
        `*Kelompok:* ${kategori_atlet}\n` +
        `*Domisili:* ${formData.domisili.toUpperCase()}\n` +
        `*Pengalaman:* ${formData.pengalaman || '-'}\n` +
        `*Link Foto:* ${publicUrl || 'Tidak ada foto'}`
      );
      
      window.open(`https://wa.me/${adminPhoneNumber}?text=${waMessage}`, '_blank');
      setSubmitted(true);

      // Elegant Modern Toast Notification
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000,
        timerProgressBar: true,
        background: '#0f172a',
        color: '#ffffff',
        iconColor: '#10b981',
        customClass: {
          popup: 'rounded-2xl border border-emerald-500/20 shadow-2xl backdrop-blur-xl font-sans',
          title: 'font-bold text-sm text-emerald-400',
          htmlContainer: 'text-xs text-slate-300'
        },
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });

      Toast.fire({
        icon: 'success',
        title: 'Pendaftaran Berhasil!',
        text: 'Data atlet telah diterima sistem PB Bilibili 162.'
      });
      
    } catch (err: any) {
      console.error("Registration Error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Gagal Mendaftar',
        text: "Kesalahan: " + err.message,
        confirmButtonColor: '#EF4444',
        background: '#1A1D26',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="h-[calc(100vh-140px)] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 md:p-10 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-emerald-500/30 text-center shadow-[0_0_50px_rgba(16,185,129,0.1)]"
        >
          <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-600/20">
              <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-tighter italic">PENDAFTARAN BERHASIL!</h2>
          <p className="text-slate-400 mb-8 text-xs font-medium leading-relaxed">Data Anda telah tersimpan secara aman. Admin <span className="text-blue-500 font-bold">PB Bilibili 162</span> akan segera memproses berkas Anda.</p>
          <button 
              onClick={() => { setSubmitted(false); setStep(1); setFile(null); setFilePreview(null); setFormData({ nama: '', whatsapp: '', jenis_kelamin: 'Putra', kategori: kategoriUmur[0], domisili: '', pengalaman: '' }); }} 
              className="w-full bg-white hover:bg-blue-600 text-black hover:text-white py-4 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-xl active:scale-95"
          >
              Daftar Atlet Lain
          </button>
        </motion.div>
      </div>
    );
  }

  const inputClass = "w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-slate-800 text-white font-semibold text-xs outline-none focus:border-blue-500/80 focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-600 placeholder:font-normal";

  return (
    <section className="h-[calc(100vh-150px)] flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Dynamic Background Accents */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/5 relative z-10 flex flex-col overflow-hidden max-h-full">
        {/* Glow Header Accent */}
        <div className="w-full h-1 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <form onSubmit={handleSubmit} className="p-5 md:p-6 flex flex-col justify-between flex-grow overflow-hidden">
          {/* Header */}
          <div className="text-center mb-5 shrink-0">
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Registrasi <span className="text-blue-500">Atlet</span></h2>
            <p className="text-slate-500 font-bold text-[8px] uppercase tracking-widest mt-1">PB Bilibili 162 Official Form</p>
          </div>

          {/* Stepper Dots & Labels */}
          <div className="flex items-center justify-between mb-5 max-w-[220px] mx-auto w-full shrink-0">
            <div className="flex items-center flex-col">
              <button 
                type="button"
                onClick={() => step === 2 && setStep(1)}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${step === 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/10' : 'bg-blue-600/20 text-blue-400 cursor-pointer'}`}
              >
                1
              </button>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">Biodata</span>
            </div>
            <div className="flex-1 h-[2px] bg-slate-800 mx-2 -mt-4">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: step === 2 ? '100%' : '0%' }}></div>
            </div>
            <div className="flex items-center flex-col">
              <button 
                type="button"
                onClick={() => step === 1 && handleNextStep()}
                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all duration-300 ${step === 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 ring-4 ring-blue-600/10' : 'bg-slate-800 text-slate-500'}`}
              >
                2
              </button>
              <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 mt-1">Berkas</span>
            </div>
          </div>

          {/* Form Content Steps with Transition */}
          <div className="flex-grow overflow-y-auto pr-1 -mr-1 py-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step-biodata"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Nama */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nama Lengkap Atlet *</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input required value={formData.nama} className={inputClass} placeholder="NAMA LENGKAP ATLET" onChange={e => setFormData({...formData, nama: e.target.value})} />
                    </div>
                  </div>

                  {/* Gender Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Jenis Kelamin</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Putra', 'Putri'].map((gender) => (
                        <label key={gender} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border cursor-pointer font-black text-xs transition-all active:scale-95 ${formData.jenis_kelamin === gender ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/10' : 'bg-slate-950/40 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                          <input type="radio" className="hidden" name="jenis_kelamin" value={gender} checked={formData.jenis_kelamin === gender} onChange={e => setFormData({...formData, jenis_kelamin: e.target.value})} />
                          <Users size={14} /> {gender.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nomor WhatsApp *</label>
                    <div className="relative group">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                      <input required type="tel" value={formData.whatsapp} className={inputClass} placeholder="CONTOH: 628121902..." onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="step-kategori"
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  {/* Domisili & Kategori (Side by side on small layouts to save space) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kota Domisili *</label>
                      <div className="relative group">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={15} />
                        <input required value={formData.domisili} className={`${inputClass} pl-10`} placeholder="KOTA DOMISILI" onChange={e => setFormData({...formData, domisili: e.target.value})} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Kategori Tanding</label>
                      <div className="relative group">
                        <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={15} />
                        <select value={formData.kategori} className={`${inputClass} pl-10 pr-8 appearance-none cursor-pointer`} onChange={e => setFormData({...formData, kategori: e.target.value})}>
                          {kategoriUmur.map((kat) => <option key={kat} value={kat} className="bg-slate-900">{kat}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Pengalaman */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Pengalaman Bertanding / Prestasi (Opsional)</label>
                    <div className="relative group">
                      <Trophy className="absolute left-4 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={15} />
                      <textarea 
                        value={formData.pengalaman} 
                        rows={2}
                        className={`${inputClass} pt-2.5 pl-11 h-14 resize-none`} 
                        placeholder="Tulis prestasi atau klub asal jika ada..." 
                        onChange={e => setFormData({...formData, pengalaman: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Upload File Sleek Layout */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">Berkas Identitas (KK/AKTE/KIA) *</label>
                    <div className="relative group">
                      <input required type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
                      
                      {filePreview ? (
                        <div className="w-full px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 shrink-0 rounded-lg overflow-hidden border border-emerald-500/20 bg-slate-950">
                              <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-bold text-emerald-400 truncate">{file?.name}</p>
                              <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-0.5">Selesai Terunggah</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); setFilePreview(null); }}
                            className="text-slate-400 hover:text-rose-500 transition-colors z-20"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full px-4 py-3 rounded-xl border-2 border-dashed bg-slate-950/40 border-slate-800 group-hover:border-blue-500/40 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-3">
                            <UploadCloud size={18} className="text-slate-500 group-hover:text-blue-500 transition-colors" />
                            <span className="text-slate-400 text-[10px] font-bold">UNGGAH FOTO IDENTITAS ATLET</span>
                          </div>
                          <div className="px-2.5 py-1 bg-slate-800 text-slate-300 font-extrabold text-[8px] uppercase tracking-wider rounded-md">
                            Pilih
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions / Buttons Footer */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 shrink-0">
            {step === 1 ? (
              <button 
                type="button" 
                onClick={handleNextStep}
                className="w-full bg-blue-600 hover:bg-white hover:text-black text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Lanjutkan <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3.5 rounded-xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft size={14} />
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-white hover:to-white hover:text-black text-white py-3.5 rounded-xl font-bold uppercase text-xs tracking-wider shadow-lg shadow-blue-600/10 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={14} /> Mengirim...</>
                  ) : (
                    <><Send size={13} /> Kirim & WhatsApp</>
                  )}
                </button>
              </div>
            )}
            <p className="text-[7px] text-center text-slate-600 mt-3 font-bold uppercase tracking-widest">
              Data pendaftaran akan diverifikasi langsung oleh Admin PB Bilibili 162
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}