import React, { useState, useEffect } from 'react';
import { 
  Users, User, Zap, Activity, KeyRound, ShieldCheck, Check, Sparkles, 
  UserCheck, Trophy, Newspaper, Image, BookOpen, ArrowRight, Award, Star
} from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalAtlets: 0,
    totalMuda: 0,
    totalSenior: 0,
    totalPendaftaran: 0
  });

  const [currentUser, setCurrentUser] = useState<string>('admin');
  const [userRole, setUserRole] = useState<'admin' | 'anggota'>('admin');
  const [memberInfo, setMemberInfo] = useState<any>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const { count: atletCount } = await supabase.from('rankings').select('id', { count: 'exact', head: true });
      const { count: daftarCount } = await supabase.from('pendaftaran').select('id', { count: 'exact', head: true });
      const { data: muda } = await supabase.from('atlet_stats').select('id').eq('kategori', 'MUDA');
      const { data: senior } = await supabase.from('atlet_stats').select('id').eq('kategori', 'SENIOR');
      
      setStats({
        totalAtlets: atletCount || 0,
        totalPendaftaran: daftarCount || 0,
        totalMuda: muda?.length || 0,
        totalSenior: senior?.length || 0
      });
    }

    // Read local active session
    try {
      const raw = localStorage.getItem('local_admin_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        const meta = parsed?.user?.user_metadata || {};
        const name = meta.full_name || meta.nama || parsed?.user?.email || 'User';
        const role = meta.role === 'anggota' ? 'anggota' : 'admin';
        setCurrentUser(name);
        setUserRole(role);
        setMemberInfo(meta);
      }
    } catch (e) {
      console.error(e);
    }

    fetchStats();
  }, []);

  const isAdmin = userRole === 'admin';

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinErrorMsg(null);
    setPinSuccessMsg(null);

    if (pinInput.length !== 6 || !/^\d+$/.test(pinInput)) {
      setPinErrorMsg('PIN harus terdiri dari 6 angka.');
      return;
    }

    if (pinInput !== confirmPin) {
      setPinErrorMsg('Konfirmasi PIN tidak cocok.');
      return;
    }

    try {
      const userKey = currentUser.toLowerCase().trim();
      const raw = localStorage.getItem('pb162_user_pins');
      const dict = raw ? JSON.parse(raw) : {};
      dict[userKey] = {
        pin: pinInput,
        hasChosenPin: true,
        method: 'pin'
      };
      localStorage.setItem('pb162_user_pins', JSON.stringify(dict));

      setPinSuccessMsg('PIN 6-digit berhasil diperbarui!');
      setTimeout(() => {
        setShowPinModal(false);
        setPinInput('');
        setConfirmPin('');
        setPinSuccessMsg(null);
      }, 1500);
    } catch (err) {
      setPinErrorMsg('Gagal menyimpan PIN.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-2.5 sm:p-5 md:p-8 space-y-2.5 sm:space-y-4 md:space-y-6 overflow-hidden md:overflow-visible min-h-0 select-none">
      {/* Header Banner */}
      <div className="flex flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-[#0b1224] to-slate-900 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] sm:text-[10px] font-black uppercase tracking-widest mb-0.5 sm:mb-1">
            <Sparkles size={10} />
            <span>{isAdmin ? 'Panel Control Admin' : 'Portal Anggota Resmi'}</span>
          </div>
          <h1 className="text-base sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter truncate leading-tight">
            Dashboard <span className="text-blue-500">{isAdmin ? 'Admin' : 'Anggota'}</span>
          </h1>
          <p className="text-slate-400 text-[9px] sm:text-xs md:text-sm font-medium mt-0.5 truncate">
            Selamat datang, <span className="text-blue-400 font-bold">{currentUser}</span> 👋
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 flex items-center gap-1.5 shrink-0">
          {!isAdmin && (
            <button
              onClick={() => navigate('/admin/profil')}
              className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              <UserCheck size={14} className="text-blue-400" />
              <span className="hidden xs:inline">Profil</span>
            </button>
          )}

          <button
            onClick={() => setShowPinModal(true)}
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer border border-blue-400/30 shrink-0"
          >
            <KeyRound size={14} />
            <span className="hidden xs:inline">Atur PIN</span>
            <span className="xs:hidden">PIN</span>
          </button>
        </div>
      </div>

      {/* Member Profile Highlights for Anggota */}
      {!isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6 flex-1 min-h-0 items-stretch">
          <div className="lg:col-span-1 bg-gradient-to-b from-slate-900 to-[#0b1224] p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-blue-500/30 shadow-xl relative overflow-hidden flex flex-col justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                {memberInfo?.foto_url ? (
                  <img 
                    src={memberInfo.foto_url} 
                    alt={currentUser} 
                    className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl object-cover border-2 border-blue-500/50 shadow-lg"
                  />
                ) : (
                  <div className="w-11 h-11 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg sm:text-2xl shadow-lg border border-blue-400/30">
                    {currentUser.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 sm:p-1 rounded-full border-2 border-slate-900">
                  <ShieldCheck size={10} className="text-white" />
                </div>
              </div>
              <div className="overflow-hidden min-w-0">
                <h3 className="text-xs sm:text-base font-bold text-white truncate">{currentUser}</h3>
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider">
                  Anggota Terverifikasi
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 sm:mt-4 sm:pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/60 p-2 sm:p-3 rounded-xl border border-white/5">
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase">Kategori</p>
                <p className="font-bold text-blue-400 mt-0.5 text-[10px] sm:text-xs truncate">{memberInfo?.kategori || memberInfo?.kategori_atlet || 'SENIOR'}</p>
              </div>
              <div className="bg-slate-950/60 p-2 sm:p-3 rounded-xl border border-white/5">
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase">Sektor</p>
                <p className="font-bold text-indigo-400 mt-0.5 text-[10px] sm:text-xs truncate">{memberInfo?.sektor_bermain || 'Tunggal/Ganda'}</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-[#0b1224]/90 p-3 sm:p-5 rounded-2xl md:rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between flex-1 min-h-0">
            <div>
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider italic flex items-center gap-1.5">
                  <Award size={16} className="text-yellow-500" />
                  <span>Akses Cepat Portal Anggota</span>
                </h3>
              </div>
              <p className="text-[9px] sm:text-xs text-slate-400 mb-2 sm:mb-4">
                Akses informasi terkini peringkat, skor tanding, pengumuman, dan dokumen resmi PB Bilibili 162.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { label: 'Profil Saya', path: '/admin/profil', icon: UserCheck, color: 'text-blue-400' },
                  { label: 'Peringkat & Poin', path: '/admin/ranking', icon: Trophy, color: 'text-yellow-400' },
                  { label: 'Hasil Skor', path: '/admin/skor', icon: Zap, color: 'text-indigo-400' },
                  { label: 'Dokumen Club', path: '/admin/dokumen', icon: BookOpen, color: 'text-emerald-400' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(item.path)}
                    className="p-2 sm:p-3 bg-[#070d1a] hover:bg-slate-800 border border-white/5 hover:border-blue-500/40 rounded-xl sm:rounded-2xl flex flex-col items-center text-center transition-all group cursor-pointer"
                  >
                    <item.icon size={18} className={`${item.color} mb-1 group-hover:scale-110 transition-transform`} />
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 group-hover:text-white uppercase tracking-wider">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards for Admin */}
      {isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5 md:gap-6 shrink-0">
          {[
            { title: 'Total Atlet Terdaftar', value: stats.totalAtlets, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { title: 'Pendaftaran Baru', value: stats.totalPendaftaran, icon: User, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { title: 'Atlet Kategori Muda', value: stats.totalMuda, icon: Zap, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { title: 'Atlet Kategori Senior', value: stats.totalSenior, icon: Activity, color: 'text-rose-400', bg: 'bg-rose-500/10' }
          ].map((stat, i) => (
            <div key={i} className="bg-[#0b1224]/90 p-2.5 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[8px] sm:text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider truncate">{stat.title}</p>
                <div className={`p-1 sm:p-2 rounded-lg sm:rounded-xl ${stat.bg} ${stat.color} shrink-0`}>
                  <stat.icon size={14} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
              </div>
              <p className="text-lg sm:text-3xl md:text-4xl font-black text-white mt-1 sm:mt-2 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Quick Navigation Panel for Admin */}
      {isAdmin && (
        <div className="bg-[#0b1224]/90 p-2.5 sm:p-4 rounded-2xl md:rounded-3xl border border-white/10 shadow-xl flex flex-col justify-between flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-3.5 sm:h-5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
              <h3 className="text-[11px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider italic flex items-center gap-1.5">
                <Award size={14} className="text-amber-400" />
                <span>Navigasi Modul Admin Utama</span>
              </h3>
            </div>
            <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded-full border border-white/10">Akses Cepat</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 flex-1 items-stretch">
            {[
              { label: 'Kelola Atlet', path: '/admin/atlet', icon: Users, color: 'text-blue-400', desc: 'Database Atlet' },
              { label: 'Pendaftaran', path: '/admin/pendaftaran', icon: UserCheck, color: 'text-emerald-400', desc: 'Calon Anggota' },
              { label: 'Hasil Skor', path: '/admin/skor', icon: Zap, color: 'text-indigo-400', desc: 'Update Match' },
              { label: 'Dokumen', path: '/admin/dokumen', icon: BookOpen, color: 'text-amber-400', desc: 'Arsip Klub' },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => navigate(item.path)}
                className="p-2 sm:p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/40 rounded-xl sm:rounded-2xl flex flex-col justify-between text-left transition-all group cursor-pointer shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <item.icon size={18} className={`${item.color} group-hover:scale-110 transition-transform`} />
                  <ArrowRight size={11} className="text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-100 group-hover:text-blue-300 uppercase tracking-tight block leading-tight">{item.label}</span>
                  <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium block truncate mt-0.5">{item.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PIN Security Info Card */}
      <div className="bg-[#0b1224]/90 p-2.5 sm:p-4 rounded-2xl md:rounded-3xl border border-blue-500/20 shadow-xl flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck size={16} className="sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wide truncate">Autentikasi PIN 6-Digit</h3>
              <span className="text-[8px] sm:text-[9px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1 shrink-0">
                <Sparkles size={8} /> Aktif
              </span>
            </div>
            <p className="text-[8px] sm:text-xs text-slate-400 truncate mt-0.5">
              Atur atau perbarui PIN 6-digit akun {isAdmin ? 'Admin' : 'Anggota'} Anda untuk kemudahan login cepat.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPinModal(true)}
          className="text-[10px] sm:text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4 cursor-pointer shrink-0 whitespace-nowrap"
        >
          Ubah PIN
        </button>
      </div>

      {/* Modal Change PIN */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1224] border border-white/10 p-6 md:p-8 rounded-3xl max-w-sm w-full shadow-2xl relative">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2 text-white font-black text-base uppercase italic">
                <KeyRound size={18} className="text-blue-500" />
                <span>Atur PIN 6-Digit</span>
              </div>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinErrorMsg(null);
                  setPinSuccessMsg(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pinErrorMsg && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-400 font-semibold">
                {pinErrorMsg}
              </div>
            )}

            {pinSuccessMsg && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-400 font-semibold flex items-center gap-2">
                <Check size={16} />
                <span>{pinSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSavePin} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">PIN 6-Digit Baru</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 px-4 py-3 bg-[#070d1a] border border-white/10 rounded-xl text-white font-mono text-center tracking-[0.5em] text-lg focus:border-blue-500 outline-none"
                  placeholder="••••••"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400">Konfirmasi PIN</label>
                <input
                  type="password"
                  maxLength={6}
                  required
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full mt-1 px-4 py-3 bg-[#070d1a] border border-white/10 rounded-xl text-white font-mono text-center tracking-[0.5em] text-lg focus:border-blue-500 outline-none"
                  placeholder="••••••"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  Simpan PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
