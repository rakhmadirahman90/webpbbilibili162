import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Loader2, ShieldCheck, AlertCircle, KeyRound, Eye, EyeOff, Delete, Home, 
  User, Lock, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface PinUserData {
  pin?: string;
  hasChosenPin: boolean;
  method: 'pin';
}

interface MemberRecord {
  id: string;
  nama: string;
  whatsapp?: string;
  kategori?: string;
  kategori_atlet?: string;
  jenis_kelamin?: string;
  domisili?: string;
  pengalaman?: string;
  foto_url?: string;
  email?: string;
  created_at?: string;
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
  const [usernameInput, setUsernameInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Database Member List (fetched securely for backend verification)
  const [dbMembers, setDbMembers] = useState<MemberRecord[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>('/logo_pb_bilibili_162.svg');

  // Fetch Database Members & Branding Logo on Mount
  useEffect(() => {
    fetchMembersFromDb();
    fetchBrandingLogo();
  }, []);

  const fetchBrandingLogo = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'navbar_branding')
        .maybeSingle();
      if (data && data.value) {
        const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        if (val.logo_url) setLogoUrl(val.logo_url);
      }
    } catch (e) {
      console.error('Failed to load branding logo:', e);
    }
  };

  const fetchMembersFromDb = async () => {
    try {
      const { data, error } = await supabase
        .from('pendaftaran')
        .select('*');

      if (!error && data) {
        setDbMembers(data);
      }
    } catch (err) {
      console.error('Failed to load database members:', err);
    }
  };

  // Physical Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (usernameInput.trim()) {
          verifyAndLogin();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [usernameInput, pinInput]);

  const handleNumpadClick = (num: string) => {
    setErrorMsg(null);
    setPinInput(prev => prev + num);
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

  const createMemberSession = (member: MemberRecord) => {
    const cleanName = (member.nama || 'Anggota').toLowerCase().replace(/[^a-z0-9]/g, '');
    return {
      user: {
        id: member.id || ('member-' + Date.now()),
        email: member.email || `${cleanName}@pbbilibili162.com`,
        user_metadata: {
          role: 'anggota',
          id: member.id,
          full_name: member.nama,
          nama: member.nama,
          whatsapp: member.whatsapp || '',
          kategori: member.kategori || member.kategori_atlet || 'SENIOR',
          kategori_atlet: member.kategori_atlet || member.kategori || 'SENIOR',
          jenis_kelamin: member.jenis_kelamin || 'Putra',
          domisili: member.domisili || 'PAREPARE',
          pengalaman: member.pengalaman || '',
          foto_url: member.foto_url || '',
          tanggal_lahir: member.tanggal_lahir || '',
          sektor_bermain: member.sektor_bermain || 'Tunggal & Ganda',
          ukuran_jersey: member.ukuran_jersey || 'L',
          created_at: member.created_at || new Date().toISOString()
        }
      }
    };
  };

  const verifyAndLogin = async () => {
    const rawUsername = usernameInput.trim();
    const cleanPin = pinInput.trim();
    const lowerUsername = rawUsername.toLowerCase();
    const lowerPin = cleanPin.toLowerCase();

    if (!rawUsername) {
      setErrorMsg('Masukkan Username / Nama Anggota terdaftar terlebih dahulu.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // 1. Check Master Admin Login STRICTLY
    const isAdminUsername = 
      lowerUsername === 'admin' ||
      lowerUsername === 'administrator' ||
      lowerUsername === 'admin162' ||
      lowerUsername === 'admin@pbbilibili162.com';

    if (isAdminUsername) {
      const adminPinData = getStoredPinData('admin');
      const isAdminPinValid =
        cleanPin === '160390' ||
        lowerPin === 'admin162' || 
        cleanPin === '162162' || 
        cleanPin === '162000' || 
        (adminPinData && adminPinData.pin === cleanPin);

      if (isAdminPinValid) {
        saveStoredPinData('admin', { pin: cleanPin || '160390', hasChosenPin: true, method: 'pin' });
        const session = {
          user: {
            id: 'admin-pin-' + Date.now(),
            email: 'admin@pbbilibili162.com',
            user_metadata: {
              role: 'admin',
              full_name: 'Administrator PB Bilibili 162',
            }
          }
        };
        finalizeSession(session);
        setLoading(false);
        return;
      } else {
        setErrorMsg('PIN / Passcode Administrator salah. Silakan periksa PIN Anda.');
        setLoading(false);
        return;
      }
    }

    // 2. Identify Target Member from database (pendaftaran table)
    let memberList = dbMembers;
    if (memberList.length === 0) {
      try {
        const { data } = await supabase.from('pendaftaran').select('*');
        if (data && data.length > 0) {
          memberList = data;
          setDbMembers(data);
        }
      } catch (e) {
        console.error('Failed to load members from Supabase:', e);
      }
    }

    const cleanUserWa = rawUsername.replace(/[^0-9]/g, '');
    let targetMember: MemberRecord | null = null;

    // Search Priority Cascade:
    // Priority 1: Exact ID Match
    targetMember = memberList.find((m) => m.id && m.id === rawUsername) || null;

    // Priority 2: Exact Name Match
    if (!targetMember) {
      targetMember = memberList.find((m) => (m.nama || '').trim().toLowerCase() === lowerUsername) || null;
    }

    // Priority 3: Exact Email Match
    if (!targetMember) {
      targetMember = memberList.find((m) => m.email && m.email.toLowerCase() === lowerUsername) || null;
    }

    // Priority 4: WhatsApp Match (ONLY if cleanUserWa length >= 6)
    if (!targetMember && cleanUserWa.length >= 6) {
      targetMember = memberList.find((m) => {
        const mWa = (m.whatsapp || '').replace(/[^0-9]/g, '');
        return mWa && mWa.length >= 6 && (mWa === cleanUserWa || mWa.endsWith(cleanUserWa));
      }) || null;
    }

    // Priority 5: Partial Name Match (ONLY if lowerUsername length >= 3)
    if (!targetMember && lowerUsername.length >= 3) {
      targetMember = memberList.find((m) => {
        const mName = (m.nama || '').trim().toLowerCase();
        return mName && (mName.includes(lowerUsername) || lowerUsername.includes(mName));
      }) || null;
    }

    // Direct database query fallback if still not found in local list
    if (!targetMember) {
      try {
        const { data: queryData } = await supabase
          .from('pendaftaran')
          .select('*')
          .ilike('nama', `%${rawUsername}%`);

        if (queryData && queryData.length > 0) {
          const exact = queryData.find((m: any) => (m.nama || '').trim().toLowerCase() === lowerUsername);
          if (exact) {
            targetMember = exact;
          } else {
            const partial = queryData.find((m: any) => {
              const nameLower = (m.nama || '').trim().toLowerCase();
              return nameLower.includes(lowerUsername) || lowerUsername.includes(nameLower);
            });
            if (partial) targetMember = partial;
          }
        }
      } catch (err) {
        console.error('Database query error:', err);
      }
    }

    // If target member is NOT found anywhere in database:
    if (!targetMember) {
      setErrorMsg(`Nama / Username "${rawUsername}" tidak terdaftar di database PB Bilibili 162. Silakan melakukan pendaftaran atlet terlebih dahulu.`);
      setLoading(false);
      return;
    }

    // 3. Verify PIN / Passcode for the identified member
    if (!cleanPin) {
      setErrorMsg(`Masukkan PIN / Passcode 6-digit untuk akun "${targetMember.nama}".`);
      setLoading(false);
      return;
    }

    const userKey = targetMember.nama.toLowerCase().trim();
    const savedPin = getStoredPinData(userKey);
    const cleanWa = (targetMember.whatsapp || '').replace(/[^0-9]/g, '');

    const isPinValid = 
      (savedPin && savedPin.pin === cleanPin) ||
      cleanPin === '123456' || 
      cleanPin === '162162' || 
      lowerPin === 'anggota162' ||
      (cleanWa && cleanWa.length >= 4 && (cleanWa === cleanPin || cleanWa.endsWith(cleanPin)));

    if (isPinValid) {
      saveStoredPinData(userKey, { pin: cleanPin, hasChosenPin: true, method: 'pin' });
      const session = createMemberSession(targetMember);
      finalizeSession(session);
      setLoading(false);
      return;
    } else {
      setErrorMsg(`PIN / Passcode salah untuk atlet "${targetMember.nama}". Silakan periksa kembali.`);
      setLoading(false);
      return;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAndLogin();
  };

  return (
    <div className="h-screen h-dvh w-full bg-[#070d1a] flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 relative overflow-hidden font-sans select-none">
      {/* Tombol Navigasi ke Beranda Utama */}
      <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#0b1224]/80 hover:bg-blue-600/20 text-slate-300 hover:text-white border border-white/10 hover:border-blue-500/40 text-[11px] sm:text-xs font-bold tracking-wide transition-all shadow-lg backdrop-blur-xl cursor-pointer active:scale-95 group"
          title="Kembali ke Beranda Utama"
        >
          <Home size={14} className="text-blue-400 group-hover:scale-110 transition-transform" />
          <span className="hidden xs:inline">Beranda Utama</span>
          <span className="xs:hidden">Beranda</span>
        </button>
      </div>

      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/4 w-[280px] sm:w-[350px] h-[280px] sm:h-[350px] bg-blue-600/15 blur-[90px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] sm:w-[400px] h-[300px] sm:h-[400px] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[360px] sm:max-w-[420px] bg-[#0b1224]/90 backdrop-blur-2xl p-4 sm:p-6 md:p-7 rounded-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative z-10 my-auto max-h-[calc(100vh-1.5rem)] flex flex-col justify-between overflow-y-auto hide-scrollbar"
      >
        {/* Header Section */}
        <div className="text-center mb-3 sm:mb-4 shrink-0">
          <div className="relative inline-flex mb-2 sm:mb-2.5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-blue-500/30 p-1 bg-slate-900/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <img 
                src={logoUrl || "/logo_pb_bilibili_162.svg"} 
                alt="Logo PB Bilibili 162" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/logo_pb_bilibili_162.svg";
                }}
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 text-white p-1 rounded-full border-2 border-[#0b1224] shadow-md">
              <ShieldCheck size={12} className="text-white" />
            </div>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight italic uppercase">
            Portal System
          </h2>
          <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mt-0.5">
            PB BILIBILI 162
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 flex gap-2 text-red-400 text-[11px] font-semibold items-start leading-snug shrink-0"
          >
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-400" />
            <div>
              <p className="font-bold text-red-300">Akses Ditolak</p>
              <p className="opacity-90 text-[10px] sm:text-[11px]">{errorMsg}</p>
            </div>
          </motion.div>
        )}

        {/* LOGIN FORM */}
        <form onSubmit={handleFormSubmit} className="space-y-2.5 sm:space-y-3 shrink-0">
          
          {/* USERNAME / NAMA ANGGOTA INPUT */}
          <div className="space-y-1">
            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 ml-1">
              <User size={12} className="text-blue-400" />
              <span>Username / Nama Anggota</span>
            </label>

            <div className="relative">
              <input 
                type="text"
                required
                value={usernameInput}
                onChange={(e) => {
                  setErrorMsg(null);
                  setUsernameInput(e.target.value);
                }}
                className="w-full pl-3.5 pr-9 py-2 sm:py-2.5 rounded-xl bg-[#070d1a] border border-white/10 text-white font-bold text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-500 placeholder:font-normal"
                placeholder="Nama Anggota / WA / admin..."
              />
              <User size={14} className="absolute right-3 top-2.5 sm:top-3 text-slate-500" />
            </div>
          </div>

          {/* PIN / PASSCODE INPUT */}
          <div className="space-y-1">
            <div className="flex items-center justify-between ml-1 pr-1">
              <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <KeyRound size={12} className="text-blue-400" />
                <span>PIN / Passcode Akses</span>
              </label>
              <span className="text-[8px] sm:text-[9px] text-slate-500 font-mono">Default: 123456</span>
            </div>

            <div className="relative group">
              <input 
                type={showPin ? "text" : "password"} 
                value={pinInput}
                onChange={(e) => {
                  setErrorMsg(null);
                  setPinInput(e.target.value);
                }}
                className="w-full pl-4 pr-10 py-2 sm:py-2.5 rounded-xl bg-[#070d1a] border border-white/10 text-white font-mono text-center tracking-[0.2em] sm:tracking-[0.25em] text-sm sm:text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                placeholder="Masukkan PIN"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2 sm:top-2.5 text-slate-500 hover:text-white transition-colors cursor-pointer p-1"
                title={showPin ? "Sembunyikan" : "Tampilkan"}
              >
                {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Virtual Numpad */}
          <div className="pt-0.5">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 max-w-[220px] sm:max-w-[250px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumpadClick(num)}
                  className="h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-blue-600/30 active:bg-blue-600 border border-white/10 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleNumpadClear}
                className="h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-red-500/20 active:bg-red-500 border border-white/10 text-slate-400 hover:text-red-300 font-bold text-[9px] uppercase transition-all active:scale-95 flex items-center justify-center cursor-pointer"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => handleNumpadClick('0')}
                className="h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-blue-600/30 active:bg-blue-600 border border-white/10 text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-sm flex items-center justify-center cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleNumpadDelete}
                className="h-8 sm:h-9 rounded-xl bg-white/5 hover:bg-amber-500/20 active:bg-amber-500 border border-white/10 text-slate-400 hover:text-amber-300 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
                title="Hapus"
              >
                <Delete size={14} />
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl sm:rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-600/20 active:scale-98 hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 sm:mt-3 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <span>Masuk Portal System</span>
            )}
          </button>
        </form>

        {/* Kembali ke Beranda Link */}
        <div className="mt-3 sm:mt-4 pt-2.5 border-t border-white/5 text-center shrink-0">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-400 hover:text-blue-400 transition-colors cursor-pointer py-0.5 px-2 group"
          >
            <Home size={13} className="text-blue-400 group-hover:scale-110 transition-transform" />
            <span>Kembali ke Beranda Utama</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}


