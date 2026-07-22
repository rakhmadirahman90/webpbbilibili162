import React, { useState, useEffect } from 'react';
import { Users, User, Zap, Activity, KeyRound, ShieldCheck, Check, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAtlets: 0,
    totalMuda: 0,
    totalSenior: 0,
    totalPendaftaran: 0
  });

  const [currentUser, setCurrentUser] = useState<string>('admin');
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
        const name = parsed?.user?.user_metadata?.full_name || parsed?.user?.email || 'admin';
        setCurrentUser(name);
      }
    } catch (e) {
      console.error(e);
    }

    fetchStats();
  }, []);

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
    <div className="p-6 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white italic uppercase tracking-tighter">
            System <span className="text-blue-600">Dashboard</span>
          </h1>
          <p className="text-slate-400 text-xs font-semibold mt-1">
            Selamat datang, <span className="text-blue-400 font-bold">{currentUser}</span>
          </p>
        </div>

        {/* Quick PIN Security Management Button */}
        <button
          onClick={() => setShowPinModal(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider px-4 py-3 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer border border-blue-400/30 w-fit"
        >
          <KeyRound size={16} />
          <span>Pengaturan PIN Login</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Atlet Terdaftar', value: stats.totalAtlets, icon: Users, color: 'text-blue-500' },
          { title: 'Pendaftaran Baru', value: stats.totalPendaftaran, icon: User, color: 'text-emerald-500' },
          { title: 'Atlet Kategori Muda', value: stats.totalMuda, icon: Zap, color: 'text-indigo-500' },
          { title: 'Atlet Kategori Senior', value: stats.totalSenior, icon: Activity, color: 'text-rose-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-slate-900 p-6 rounded-3xl border border-white/5 shadow-xl">
            <stat.icon className={`mb-4 ${stat.color}`} size={32} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.title}</p>
            <p className="text-4xl font-black text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* PIN Security Info Card */}
      <div className="bg-slate-900/80 p-6 rounded-3xl border border-blue-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wide">Autentikasi PIN 6-Digit</h3>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 font-extrabold px-2 py-0.5 rounded-full border border-blue-500/30 flex items-center gap-1">
                <Sparkles size={10} /> Aktif
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Anda dapat mengaktifkan atau mengganti PIN 6-digit untuk login lebih cepat tanpa perlu ketik kata sandi panjang.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowPinModal(true)}
          className="text-xs font-bold text-blue-400 hover:text-blue-300 underline underline-offset-4 cursor-pointer shrink-0"
        >
          Ubah PIN 6-Digit
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
