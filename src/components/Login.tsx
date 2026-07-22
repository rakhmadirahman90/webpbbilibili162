import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Loader2, ShieldCheck, AlertCircle, KeyRound, Eye, EyeOff, Delete, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PinUserData {
  pin?: string;
  hasChosenPin: boolean;
  method: 'pin';
}

const getStoredPinData = (userKey: string): PinUserData | null => {
  try {
    const raw = localStorage.getItem('pb162_user_pins');
    if (!raw) return null;
    const dict = JSON.parse(raw);
    return dict[userKey.toLowerCase().trim()] || null;
  } catch (e) {
    return null;
  }
};

const saveStoredPinData = (userKey: string, data: PinUserData) => {
  try {
    const raw = localStorage.getItem('pb162_user_pins');
    const dict = raw ? JSON.parse(raw) : {};
    dict[userKey.toLowerCase().trim()] = data;
    localStorage.setItem('pb162_user_pins', JSON.stringify(dict));
  } catch (e) {
    console.error('Error saving PIN data:', e);
  }
};

export default function Login() {
  const navigate = useNavigate();
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keyboard listener for physical typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (pinInput.trim()) {
          verifyPinAndLogin(pinInput.trim());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput]);

  const handleNumpadClick = (num: string) => {
    setErrorMsg(null);
    const nextPin = pinInput + num;
    setPinInput(nextPin);
  };

  const handleNumpadDelete = () => {
    setErrorMsg(null);
    setPinInput(prev => prev.slice(0, -1));
  };

  const handleNumpadClear = () => {
    setErrorMsg(null);
    setPinInput('');
  };

  const finalizeSession = (sessionData: any) => {
    localStorage.setItem('local_admin_session', JSON.stringify(sessionData));
    window.dispatchEvent(new Event('local-session-changed'));
  };

  const verifyPinAndLogin = async (enteredPin: string) => {
    const cleanPin = enteredPin.trim();
    if (!cleanPin) {
      setErrorMsg('Masukkan PIN / Passcode terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const lowerPin = cleanPin.toLowerCase();

    // 1. Check Admin Credentials: admin162, 162162, 162000 or saved admin PIN
    const adminPinData = getStoredPinData('admin');
    if (
      lowerPin === 'admin162' || 
      cleanPin === '162162' || 
      cleanPin === '162000' || 
      (adminPinData && adminPinData.pin === cleanPin)
    ) {
      saveStoredPinData('admin', { pin: cleanPin, hasChosenPin: true, method: 'pin' });
      const session = {
        user: {
          id: 'admin-pin-' + Date.now(),
          email: 'admin@pbbilibili162.com',
          user_metadata: {
            role: 'admin',
            full_name: 'Administrator PB 162',
          }
        }
      };
      finalizeSession(session);
      setLoading(false);
      return;
    }

    // 2. Check Anggota Credentials: anggota162, 123456 or saved anggota PIN
    const anggotaPinData = getStoredPinData('anggota');
    if (
      lowerPin === 'anggota162' || 
      cleanPin === '123456' || 
      cleanPin === '162162' ||
      (anggotaPinData && anggotaPinData.pin === cleanPin)
    ) {
      saveStoredPinData('anggota', { pin: cleanPin, hasChosenPin: true, method: 'pin' });
      const session = {
        user: {
          id: 'anggota-pin-' + Date.now(),
          email: 'anggota@pb162.com',
          user_metadata: {
            role: 'anggota',
            full_name: 'Anggota PB 162',
            kategori: 'SENIOR',
          }
        }
      };
      finalizeSession(session);
      setLoading(false);
      return;
    }

    // 3. Check custom saved user PINs in localStorage
    try {
      const raw = localStorage.getItem('pb162_user_pins');
      if (raw) {
        const dict = JSON.parse(raw);
        for (const key in dict) {
          if (dict[key]?.pin === cleanPin) {
            const isAdmin = key === 'admin';
            const session = {
              user: {
                id: (isAdmin ? 'admin-' : 'user-') + Date.now(),
                email: isAdmin ? 'admin@pbbilibili162.com' : `${key}@pb162.com`,
                user_metadata: {
                  role: isAdmin ? 'admin' : 'anggota',
                  full_name: isAdmin ? 'Administrator PB 162' : key.toUpperCase(),
                  kategori: 'SENIOR',
                }
              }
            };
            finalizeSession(session);
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }

    // 4. Check Database Anggota (pendaftaran) for matching member PIN or WhatsApp or Name
    try {
      const { data: pendaftaranList } = await supabase.from('pendaftaran').select('*');
      if (pendaftaranList && pendaftaranList.length > 0) {
        const matchedMember = pendaftaranList.find((m: any) => {
          const userKey = (m.nama || '').trim().toLowerCase();
          const savedPin = getStoredPinData(userKey);
          return savedPin && savedPin.pin === cleanPin;
        });

        if (matchedMember) {
          const session = {
            user: {
              id: 'member-' + (matchedMember.id || Date.now()),
              email: matchedMember.email || `${matchedMember.nama.toLowerCase().replace(/[^a-z0-9]/g, '')}@pb162.com`,
              user_metadata: {
                role: 'anggota',
                full_name: matchedMember.nama,
                kategori: matchedMember.kategori || 'SENIOR',
                whatsapp: matchedMember.whatsapp || '',
              }
            }
          };
          finalizeSession(session);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }

    setErrorMsg('PIN / Passcode tidak valid. Silakan coba lagi.');
    setPinInput('');
    setLoading(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim()) {
      verifyPinAndLogin(pinInput.trim());
    } else {
      setErrorMsg('Masukkan PIN / Passcode terlebih dahulu.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1a] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans">
      {/* Tombol Navigasi ke Beranda Utama */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-20">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0b1224]/80 hover:bg-blue-600/20 text-slate-300 hover:text-white border border-white/10 hover:border-blue-500/40 text-xs font-bold tracking-wide transition-all shadow-lg backdrop-blur-xl cursor-pointer active:scale-95 group"
          title="Kembali ke Beranda Utama"
        >
          <Home size={15} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span>Beranda Utama</span>
        </button>
      </div>

      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-blue-600/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md bg-[#0b1224]/90 backdrop-blur-2xl p-7 md:p-9 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10"
      >
        {/* Header Section */}
        <div className="text-center mb-6">
          <div className="relative inline-flex mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500/30 p-1 bg-slate-900/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <img 
                src="/logo_pb_bilibili_162.svg" 
                alt="Logo PB Bilibili 162" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=150&auto=format&fit=crop&q=80";
                }}
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1.5 rounded-full border-2 border-[#0b1224] shadow-md">
              <ShieldCheck size={14} className="text-white" />
            </div>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight italic uppercase">
            Portal System
          </h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
            PB BILIBILI 162
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-5 bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex gap-3 text-red-400 text-xs font-semibold items-start leading-relaxed"
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold text-red-300">Informasi Access</p>
              <p className="opacity-90 mt-0.5">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Direct PIN Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1 pr-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <KeyRound size={13} className="text-blue-400" />
                <span>PIN / Passcode Akses</span>
              </label>
            </div>

            <div className="relative group">
              <input 
                type={showPin ? "text" : "password"} 
                required
                value={pinInput}
                onChange={(e) => {
                  setErrorMsg(null);
                  setPinInput(e.target.value);
                }}
                className="w-full pl-5 pr-12 py-3.5 rounded-2xl bg-[#070d1a]/80 border border-white/10 text-white font-mono text-center tracking-[0.3em] text-lg outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                placeholder="Masukkan PIN / Passcode"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors cursor-pointer p-1"
                title={showPin ? "Sembunyikan" : "Tampilkan"}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Virtual Numpad */}
          <div className="pt-2">
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadClick(num)}
                  className="h-12 rounded-2xl bg-white/5 hover:bg-blue-600/30 active:bg-blue-600 border border-white/10 text-white font-black text-lg transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleNumpadClear}
                className="h-12 rounded-2xl bg-white/5 hover:bg-red-500/20 active:bg-red-500 border border-white/10 text-slate-400 hover:text-red-300 font-bold text-xs transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => handleNumpadClick('0')}
                className="h-12 rounded-2xl bg-white/5 hover:bg-blue-600/30 active:bg-blue-600 border border-white/10 text-white font-black text-lg transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleNumpadDelete}
                className="h-12 rounded-2xl bg-white/5 hover:bg-amber-500/20 active:bg-amber-500 border border-white/10 text-slate-400 hover:text-amber-300 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                title="Hapus"
              >
                <Delete size={18} />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 active:scale-98 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 mt-4 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <span>Masuk Portal System</span>
            )}
          </button>
        </form>

        {/* Kembali ke Beranda Link */}
        <div className="mt-5 pt-4 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer py-1 px-3 group"
          >
            <Home size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Kembali ke Beranda Utama</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
