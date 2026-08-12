import React, { useState } from 'react';
import { supabase } from '../supabase'; 
import Swal from 'sweetalert2';
import { 
  Loader2, Send, CheckCircle2, User, Phone, 
  MapPin, Award, ChevronDown, 
  Users, Trophy, ArrowLeft, ArrowRight, UploadCloud, X,
  Mail, Lock, Eye, EyeOff, UserPlus, ShieldCheck, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegistrationForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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
    pengalaman: '',
    email: '',
    password: ''
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

  const handleNextStep = (currentStep: number) => {
    if (currentStep === 1) {
      if (!formData.nama.trim()) {
        Swal.fire({
          icon: 'warning',
          title: 'Nama Lengkap Wajib Diisi',
          text: 'Silakan isi nama lengkap atlet terlebih dahulu.',
          confirmButtonColor: '#2563EB',
          background: '#0b1224',
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
          background: '#0b1224',
          color: '#fff'
        });
        return;
      }
      setStep(2);
    } else if (currentStep === 2) {
      if (!formData.domisili.trim()) {
        Swal.fire({ icon: 'warning', title: 'Domisili Wajib Diisi', background: '#0b1224', color: '#fff', confirmButtonColor: '#2563EB' });
        return;
      }
      if (!file) {
        Swal.fire({ icon: 'warning', title: 'Foto Identitas Wajib Diunggah', text: 'Silakan unggah foto KK / AKTE / KIA resmi.', background: '#0b1224', color: '#fff', confirmButtonColor: '#2563EB' });
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      handleNextStep(1);
      return;
    }
    if (step === 2) {
      handleNextStep(2);
      return;
    }

    if (!formData.email.trim() || !formData.password.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Kredensial Akun Belum Lengkap',
        text: 'Silakan isi Email dan Password untuk login akun anggota.',
        confirmButtonColor: '#2563EB',
        background: '#0b1224',
        color: '#fff'
      });
      return;
    }

    setLoading(true);

    try {
      const cleanNama = formData.nama.toUpperCase().trim();
      const cleanEmail = formData.email.trim().toLowerCase();

      // 1. Pre-check if athlete name already exists in pendaftaran to avoid duplicate constraint error
      const { data: existingAthlete } = await supabase
        .from('pendaftaran')
        .select('id, nama')
        .ilike('nama', cleanNama)
        .maybeSingle();

      if (existingAthlete) {
        Swal.fire({
          icon: 'warning',
          title: 'Nama Atlet Sudah Terdaftar!',
          html: `Nama atlet <b class="text-amber-400 font-bold">${cleanNama}</b> sudah terdaftar dalam sistem PB Bilibili 162.<br/><br/><span class="text-xs text-slate-300">Mohon tambahkan pembeda (misalnya nama belakang/inisial) agar nama atlet tidak bentrok dengan data yang sudah ada.<br/>Jika Anda sudah pernah mendaftar, silakan lakukan Login.</span>`,
          confirmButtonColor: '#2563EB',
          background: '#0b1224',
          color: '#fff'
        });
        setLoading(false);
        return;
      }

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

      const { error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: formData.password,
        options: {
          data: {
            role: 'anggota',
            full_name: cleanNama
          }
        }
      });
      if (authError) {
        let msg = authError.message;
        if (msg.includes("User already registered") || msg.includes("already registered") || msg.includes("user_already_exists")) {
          msg = `Email "${cleanEmail}" sudah terdaftar pada sistem. Silakan gunakan email lain atau langsung Login.`;
        }
        throw new Error(msg);
      }

      const { error: dbError } = await supabase
        .from('pendaftaran')
        .insert([{ 
          nama: cleanNama, 
          whatsapp: formData.whatsapp.trim(), 
          jenis_kelamin: formData.jenis_kelamin,
          kategori: formData.kategori,
          kategori_atlet: kategori_atlet,
          domisili: formData.domisili.toUpperCase().trim(),
          pengalaman: formData.pengalaman || "-", 
          foto_url: publicUrl,
          status: 'Pending'
        }]);

      if (dbError) {
        if (
          dbError.message.includes("pendaftaran_nama_key") ||
          dbError.message.includes("duplicate key value violates unique constraint") ||
          (dbError as any).code === "23505"
        ) {
          throw new Error(`Nama atlet "${cleanNama}" sudah terdaftar di sistem. Silakan tambahkan pembeda (misalnya nama belakang/inisial).`);
        }
        if (dbError.message.includes("pengalaman")) {
          throw new Error("Kolom 'pengalaman' belum ada di database. Silakan hubungi Admin.");
        }
        throw dbError;
      }

      const rawWa = formData.whatsapp.replace(/\D/g, '');
      const userWa = rawWa.startsWith('0') ? '62' + rawWa.slice(1) : rawWa;
      const adminPhoneNumber = "6281219027234";

      const waSummaryText = 
        `*PENDAFTARAN ATLET BARU PB BILIBILI 162*\n\n` +
        `Halo *${cleanNama}*, pendaftaran Anda telah berhasil diproses!\n\n` +
        `📋 *DETAIL AKUN & DOKUMEN PENDAFTARAN:*\n` +
        `• *Nama Lengkap:* ${cleanNama}\n` +
        `• *Email / Username:* ${cleanEmail}\n` +
        `• *Password Login:* ${formData.password}\n` +
        `• *No. WhatsApp:* ${formData.whatsapp}\n` +
        `• *Jenis Kelamin:* ${formData.jenis_kelamin}\n` +
        `• *Kategori Umur:* ${formData.kategori}\n` +
        `• *Kategori Atlet:* ${kategori_atlet}\n` +
        `• *Domisili:* ${formData.domisili.toUpperCase()}\n` +
        `• *Status Pendaftaran:* ⏳ *MENUNGGU VERIFIKASI ADMIN*\n` +
        `• *Link Foto:* ${publicUrl || 'Tidak ada foto'}\n\n` +
        `🌐 *LINK LOGIN SISTEM:*\nhttps://pbilibili162.99apps.id/login\n\n` +
        `⚠️ *PENTING:* Simpan pesan ini sebagai histori bukti akun pendaftaran Anda. Terimakasih!`;

      const encodedMsg = encodeURIComponent(waSummaryText);

      setSubmitted(true);

      // SweetAlert confirmation modal with choices to send WA to Athlete / Admin
      Swal.fire({
        icon: 'success',
        title: '<span class="text-emerald-400 font-black italic">PENDAFTARAN BERHASIL!</span>',
        html: `
          <div class="text-left space-y-3 text-xs text-slate-200 mt-2">
            <p className="font-medium text-slate-300">Data pendaftaran dan akun login Anda telah berhasil dibuat dalam sistem PB BILIBILI 162 Parepare.</p>

            <div class="bg-slate-900/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-1.5 font-mono">
              <div class="text-[10px] text-emerald-400 font-bold uppercase tracking-widest border-b border-slate-800 pb-1">🔑 credentials akun login Anda:</div>
              <div><span class="text-slate-400">Email:</span> <b class="text-white">${cleanEmail}</b></div>
              <div><span class="text-slate-400">Password:</span> <b class="text-amber-300">${formData.password}</b></div>
              <div><span class="text-slate-400">Status:</span> <span class="text-amber-400 font-bold">⏳ MENUNGGU VERIFIKASI ADMIN</span></div>
            </div>

            <p class="text-[11px] text-slate-400 italic">Silakan simpan rincian akun Anda dan kirim konfirmasi bukti pendaftaran melalui WhatsApp di bawah ini:</p>
          </div>
        `,
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '📱 Kirim Ke WA Atlet',
        denyButtonText: '💬 Kirim Ke WA Admin',
        cancelButtonText: 'Tutup',
        confirmButtonColor: '#10B981',
        denyButtonColor: '#2563EB',
        cancelButtonColor: '#64748B',
        background: '#0b1224',
        color: '#ffffff',
        customClass: {
          popup: 'rounded-3xl border border-emerald-500/40 shadow-2xl backdrop-blur-xl',
          title: 'text-lg',
          confirmButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
          denyButton: 'rounded-xl text-xs font-bold px-4 py-2.5',
          cancelButton: 'rounded-xl text-xs font-bold px-4 py-2.5'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          window.open(`https://wa.me/${userWa}?text=${encodedMsg}`, '_blank');
        } else if (result.isDenied) {
          window.open(`https://wa.me/${adminPhoneNumber}?text=${encodedMsg}`, '_blank');
        }
      });
      
    } catch (err: any) {
      console.error("Registration Error:", err);
      let errorMsg = err?.message || "Terjadi kesalahan pada sistem.";
      if (
        errorMsg.includes("pendaftaran_nama_key") ||
        errorMsg.includes("duplicate key value violates unique constraint") ||
        err?.code === "23505"
      ) {
        errorMsg = `Nama atlet "${formData.nama.toUpperCase().trim()}" sudah terdaftar di sistem PB Bilibili 162. Silakan tambahkan nama belakang atau inisial sebagai pembeda.`;
      } else if (errorMsg.includes("User already registered") || errorMsg.includes("user_already_exists")) {
        errorMsg = `Email "${formData.email}" sudah terdaftar. Silakan gunakan email lain atau langsung Login.`;
      }

      Swal.fire({
        icon: 'error',
        title: 'Gagal Mendaftar',
        text: errorMsg,
        confirmButtonColor: '#EF4444',
        background: '#0b1224',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center p-3 sm:p-6 my-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-6 sm:p-8 bg-[#0b1224]/90 backdrop-blur-2xl rounded-3xl border border-emerald-500/30 text-center shadow-2xl relative overflow-hidden"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-xl shadow-emerald-500/20 text-white">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2 uppercase tracking-tight italic">
            PENDAFTARAN BERHASIL!
          </h2>
          <p className="text-slate-300 mb-6 text-xs sm:text-sm font-medium leading-relaxed">
            Data Anda telah tersimpan secara aman di database <span className="text-blue-400 font-bold">PB Bilibili 162</span>. Admin akan melakukan diverifikasi berkas resmi Anda.
          </p>
          <button 
            onClick={() => { 
              setSubmitted(false); 
              setStep(1); 
              setFile(null); 
              setFilePreview(null); 
              setFormData({ nama: '', whatsapp: '', jenis_kelamin: 'Putra', kategori: kategoriUmur[0], domisili: '', pengalaman: '', email: '', password: '' }); 
            }} 
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer"
          >
            Daftar Atlet Lainnya
          </button>
        </motion.div>
      </div>
    );
  }

  const inputClass = "w-full pl-10 pr-3.5 py-2.5 sm:py-3 rounded-xl bg-[#070d1a] border border-white/10 text-white font-bold text-xs sm:text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 placeholder:font-normal";

  return (
    <section className="w-full flex flex-col items-center justify-center py-4 sm:py-8 pb-28 sm:pb-36 px-3 sm:px-4 relative">
      {/* Glow Backdrop */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 bg-blue-600/10 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md sm:max-w-lg bg-[#0b1224]/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/10 relative z-10 flex flex-col overflow-hidden">
        {/* Glow Header Accent Bar */}
        <div className="w-full h-1 sm:h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col justify-between">
          {/* Form Header with Top Navigation Bar */}
          <div className="relative mb-3 sm:mb-4 shrink-0 text-center space-y-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest">
                <UserPlus size={12} />
                <span>Pendaftaran Atlet Resmi</span>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('pb-navigate-home'))}
                className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer"
                title="Kembali ke Beranda"
              >
                <X size={15} />
              </button>
            </div>
            
            <h2 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight">
              Registrasi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Atlet PB Bilibili 162</span>
            </h2>
            <p className="text-slate-400 text-[10px] sm:text-xs font-medium">
              Isi data diri dengan akurat sesuai berkas identitas resmi.
            </p>
          </div>

          {/* Stepper Dots & Bar */}
          <div className="bg-[#070d1a] border border-white/5 p-2 rounded-2xl mb-4 shrink-0">
            <div className="flex items-center justify-between max-w-xs mx-auto w-full px-2">
              {/* Step 1 */}
              <div 
                onClick={() => step >= 2 && setStep(1)} 
                className={`flex items-center gap-1.5 cursor-pointer ${step >= 1 ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${step === 1 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-2 ring-blue-400' : 'bg-slate-800 text-slate-300'}`}>
                  1
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 hidden sm:inline">Biodata</span>
              </div>

              <div className="flex-1 h-0.5 bg-slate-800 mx-2">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: step >= 2 ? '100%' : '0%' }} />
              </div>

              {/* Step 2 */}
              <div 
                onClick={() => step === 1 ? handleNextStep(1) : setStep(2)} 
                className={`flex items-center gap-1.5 cursor-pointer ${step >= 2 ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${step === 2 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-2 ring-blue-400' : 'bg-slate-800 text-slate-300'}`}>
                  2
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 hidden sm:inline">Berkas</span>
              </div>

              <div className="flex-1 h-0.5 bg-slate-800 mx-2">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: step === 3 ? '100%' : '0%' }} />
              </div>

              {/* Step 3 */}
              <div 
                onClick={() => step === 2 && handleNextStep(2)} 
                className={`flex items-center gap-1.5 cursor-pointer ${step === 3 ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all ${step === 3 ? 'bg-blue-600 text-white shadow-md shadow-blue-600/40 ring-2 ring-blue-400' : 'bg-slate-800 text-slate-300'}`}>
                  3
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 hidden sm:inline">Akun</span>
              </div>
            </div>
          </div>

          {/* Form Fields Container */}
          <div className="py-1">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step-biodata"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {/* Nama Lengkap */}
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Nama Lengkap Atlet *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        required 
                        type="text"
                        value={formData.nama} 
                        className={inputClass} 
                        placeholder="NAMA SESUAI IDENTITAS" 
                        onChange={e => setFormData({...formData, nama: e.target.value})} 
                      />
                    </div>
                  </div>

                  {/* Gender Toggle */}
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Jenis Kelamin *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Putra', 'Putri'].map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => setFormData({...formData, jenis_kelamin: gender})}
                          className={`py-2 sm:py-2.5 rounded-xl border flex items-center justify-center gap-2 font-black text-xs transition-all cursor-pointer ${
                            formData.jenis_kelamin === gender 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30' 
                              : 'bg-[#070d1a] border-white/10 text-slate-400 hover:text-white'
                          }`}
                        >
                          <Users size={14} />
                          <span>{gender.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Nomor WhatsApp *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        required 
                        type="tel" 
                        value={formData.whatsapp} 
                        className={inputClass} 
                        placeholder="CONTOH: 081219027234" 
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})} 
                      />
                    </div>
                  </div>
                </motion.div>
              ) : step === 2 ? (
                <motion.div
                  key="step-kategori"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {/* Domisili & Kategori (Grid 2 kolom) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Kota Domisili *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input 
                          required 
                          value={formData.domisili} 
                          className={inputClass} 
                          placeholder="KOTA DOMISILI" 
                          onChange={e => setFormData({...formData, domisili: e.target.value})} 
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Kategori Tanding</label>
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        <select 
                          value={formData.kategori} 
                          className={`${inputClass} pr-8 appearance-none cursor-pointer`} 
                          onChange={e => setFormData({...formData, kategori: e.target.value})}
                        >
                          {kategoriUmur.map((kat) => (
                            <option key={kat} value={kat} className="bg-[#0b1224] text-white">{kat}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
                      </div>
                    </div>
                  </div>

                  {/* Pengalaman */}
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Pengalaman / Prestasi (Opsional)</label>
                    <div className="relative">
                      <Trophy className="absolute left-3 top-3 text-slate-500" size={16} />
                      <textarea 
                        value={formData.pengalaman} 
                        rows={2}
                        className={`${inputClass} pt-2.5 resize-none h-14`} 
                        placeholder="Tulis klub asal atau prestasi yang pernah dicapai..." 
                        onChange={e => setFormData({...formData, pengalaman: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Upload Berkas Dropzone */}
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Foto Berkas Identitas (KK/AKTE/KIA) *</label>
                    <div className="relative">
                      <input 
                        required 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                        onChange={handleFileChange} 
                      />
                      
                      {filePreview ? (
                        <div className="w-full p-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 flex items-center justify-between">
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <img src={filePreview} alt="Preview" className="w-9 h-9 object-cover rounded-lg border border-emerald-500/30 shrink-0" />
                            <div className="overflow-hidden">
                              <p className="text-[11px] font-bold text-emerald-400 truncate">{file?.name}</p>
                              <p className="text-[9px] text-slate-400 uppercase font-mono">Berkas Siap Diunggah</p>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setFile(null); setFilePreview(null); }}
                            className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:text-white z-20 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="w-full p-3 rounded-xl border-2 border-dashed border-white/10 bg-[#070d1a] hover:border-blue-500/50 flex items-center justify-between transition-all">
                          <div className="flex items-center gap-2.5">
                            <UploadCloud size={18} className="text-blue-400" />
                            <span className="text-slate-300 text-[11px] font-bold">UNGGAH FOTO IDENTITAS ATLET</span>
                          </div>
                          <span className="px-2.5 py-1 bg-blue-600/20 text-blue-400 font-black text-[9px] uppercase tracking-wider rounded-lg border border-blue-500/30">
                            Pilih Foto
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : step === 3 ? (
                <motion.div
                  key="step-akun"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Alamat Email Login *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        required 
                        type="email" 
                        value={formData.email} 
                        className={inputClass} 
                        placeholder="email@domain.com" 
                        onChange={(e) => setFormData({...formData, email: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-wider">Kata Sandi Akun *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input 
                        required 
                        type={showPassword ? "text" : "password"} 
                        value={formData.password} 
                        className={`${inputClass} pr-10`} 
                        placeholder="Minimal 6 Karakter" 
                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Action Footer Buttons */}
          <div className="mt-4 pt-3 border-t border-white/10 shrink-0 space-y-2">
            {step < 3 ? (
              <button 
                type="button" 
                onClick={() => handleNextStep(step)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
              >
                <span>Lanjutkan ke Step {step + 1}</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setStep(step - 1)}
                  className="px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Kembali</span>
                </button>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-xl font-black uppercase text-xs tracking-wider shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <><Loader2 className="animate-spin" size={14} /> Memproses...</>
                  ) : (
                    <><Send size={14} /> Kirim & WhatsApp 🔥</>
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-[9px] text-slate-400 font-medium">
              <ShieldCheck size={12} className="text-emerald-400 shrink-0" />
              <span>Diverifikasi langsung oleh Pengurus Resmi PB Bilibili 162</span>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
