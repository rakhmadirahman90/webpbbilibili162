import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  UserCheck, 
  KeyRound, 
  ShieldCheck, 
  Award, 
  Trophy, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit3, 
  Save, 
  CheckCircle2, 
  Lock, 
  QrCode, 
  Camera, 
  Star, 
  Activity, 
  Loader2, 
  AlertCircle,
  Copy,
  Check,
  RefreshCcw,
  Sparkles,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';

interface ProfilAnggotaProps {
  session?: any;
}

export default function ProfilAnggota({ session: propSession }: ProfilAnggotaProps) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKtaModal, setShowKtaModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Data Member State
  const [memberData, setMemberData] = useState<{
    id?: string;
    nama: string;
    email: string;
    whatsapp: string;
    domisili: string;
    kategori: string;
    jenis_kelamin: string;
    pengalaman: string;
    foto_url: string;
    role: string;
    created_at?: string;
  }>({
    nama: '',
    email: '',
    whatsapp: '',
    domisili: '',
    kategori: 'Senior',
    jenis_kelamin: 'Putra',
    pengalaman: '2 Tahun',
    foto_url: '',
    role: 'anggota'
  });

  // Stats State
  const [stats, setStats] = useState({
    points: 0,
    totalPoints: 0,
    rank: '-',
    seed: 0
  });

  // PIN Change State
  const [pinForm, setPinForm] = useState({
    oldPin: '',
    newPin: '',
    confirmPin: ''
  });

  useEffect(() => {
    loadUserData();
  }, [propSession]);

  const loadUserData = async () => {
    setLoading(true);
    let activeSession = propSession;

    if (!activeSession) {
      const raw = localStorage.getItem('local_admin_session');
      if (raw) {
        try {
          activeSession = JSON.parse(raw);
        } catch (e) {
          console.error('Error parsing session:', e);
        }
      }
    }

    setSession(activeSession);

    if (activeSession?.user) {
      const userMeta = activeSession.user.user_metadata || {};
      const userEmail = activeSession.user.email || '';
      const fullName = userMeta.full_name || userEmail.split('@')[0] || 'Anggota PB Bilibili 162';
      const userRole = userMeta.role || 'anggota';

      // Load matching member from pendaftaran table
      let dbMember: any = null;
      try {
        const { data: pendaftaranList } = await supabase.from('pendaftaran').select('*');
        if (pendaftaranList && pendaftaranList.length > 0) {
          dbMember = pendaftaranList.find((m: any) => {
            const mNama = (m.nama || '').trim().toLowerCase();
            const userLower = fullName.trim().toLowerCase();
            const emailLower = userEmail.trim().toLowerCase();
            const metaId = userMeta.id || activeSession.user.id;
            const cleanWa = (m.whatsapp || '').replace(/[^0-9]/g, '');
            const metaWa = (userMeta.whatsapp || '').replace(/[^0-9]/g, '');

            return (
              (m.id && metaId && (m.id === metaId || `member-${m.id}` === metaId)) ||
              mNama === userLower ||
              (m.email && m.email.toLowerCase() === emailLower) ||
              (cleanWa && metaWa && cleanWa === metaWa) ||
              mNama.includes(userLower) ||
              userLower.includes(mNama)
            );
          });
        }
      } catch (err) {
        console.error('Error fetching member profile:', err);
      }

      const initialMember = {
        id: dbMember?.id || userMeta.id || activeSession.user.id,
        nama: dbMember?.nama || userMeta.nama || fullName,
        email: dbMember?.email || userEmail,
        whatsapp: dbMember?.whatsapp || userMeta.whatsapp || '-',
        domisili: dbMember?.domisili || userMeta.domisili || 'Makassar',
        kategori: dbMember?.kategori || dbMember?.kategori_atlet || userMeta.kategori || userMeta.kategori_atlet || 'Senior',
        jenis_kelamin: dbMember?.jenis_kelamin || userMeta.jenis_kelamin || 'Putra',
        pengalaman: dbMember?.pengalaman || userMeta.pengalaman || 'Aktif Bermain',
        foto_url: dbMember?.foto_url || userMeta.foto_url || userMeta.avatar_url || '',
        role: userRole,
        created_at: dbMember?.created_at || userMeta.created_at || activeSession.user.created_at || new Date().toISOString()
      };

      setMemberData(initialMember);

      // Fetch stats from atlet_stats
      if (dbMember?.id) {
        try {
          const { data: statData } = await supabase
            .from('atlet_stats')
            .select('*')
            .eq('pendaftaran_id', dbMember.id)
            .maybeSingle();

          if (statData) {
            setStats({
              points: statData.points || 0,
              totalPoints: statData.total_points || statData.points || 0,
              rank: statData.seed ? `#${statData.seed}` : 'Provisio',
              seed: statData.seed || 0
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (memberData.id) {
        // Update to Supabase pendaftaran if record exists
        await supabase
          .from('pendaftaran')
          .upsert({
            id: memberData.id,
            nama: memberData.nama,
            whatsapp: memberData.whatsapp,
            domisili: memberData.domisili,
            kategori: memberData.kategori,
            jenis_kelamin: memberData.jenis_kelamin,
            pengalaman: memberData.pengalaman,
            foto_url: memberData.foto_url
          });
      }

      // Update local session
      if (session) {
        const updatedSession = {
          ...session,
          user: {
            ...session.user,
            user_metadata: {
              ...session.user?.user_metadata,
              full_name: memberData.nama,
              kategori: memberData.kategori,
              whatsapp: memberData.whatsapp,
              avatar_url: memberData.foto_url
            }
          }
        };
        localStorage.setItem('local_admin_session', JSON.stringify(updatedSession));
        window.dispatchEvent(new Event('local-session-changed'));
      }

      setIsEditing(false);
      Swal.fire({
        icon: 'success',
        title: 'Profil Diperbarui!',
        text: 'Data profil Anda telah berhasil disimpan.',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#2563EB'
      });
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan profil.',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin.length !== 6 || !/^\d+$/.test(pinForm.newPin)) {
      Swal.fire({
        icon: 'warning',
        title: 'PIN Tidak Valid',
        text: 'PIN harus terdiri dari tepat 6 angka.',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    if (pinForm.newPin !== pinForm.confirmPin) {
      Swal.fire({
        icon: 'warning',
        title: 'Konfirmasi Salah',
        text: 'Konfirmasi PIN baru tidak sesuai.',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    try {
      const userKey = memberData.nama.toLowerCase().trim();
      const raw = localStorage.getItem('pb162_user_pins');
      const dict = raw ? JSON.parse(raw) : {};
      dict[userKey] = {
        pin: pinForm.newPin,
        hasChosenPin: true,
        method: 'pin'
      };
      localStorage.setItem('pb162_user_pins', JSON.stringify(dict));

      setShowPinModal(false);
      setPinForm({ oldPin: '', newPin: '', confirmPin: '' });

      Swal.fire({
        icon: 'success',
        title: 'PIN Berhasil Diperbarui!',
        text: 'Gunakan 6-digit PIN baru ini untuk login berikutnya.',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#2563EB'
      });
    } catch (e) {
      console.error(e);
    }
  };

  const copyMemberId = () => {
    const id = `PB162-${memberData.id?.slice(0, 8).toUpperCase() || 'MEMBER'}`;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-400">
        <Loader2 className="animate-spin text-blue-500 mb-3" size={36} />
        <p className="text-xs font-bold uppercase tracking-widest">Memuat Profil Anggota...</p>
      </div>
    );
  }

  const memberIdCode = `PB162-${(memberData.id || '000000').slice(0, 8).toUpperCase()}`;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 font-sans text-white">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-1">
            <UserCheck size={16} />
            <span>Sistem Informasi Anggota PB Bilibili 162</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight italic uppercase text-white">
            Profil Anggota
          </h1>
          <p className="text-slate-400 text-xs font-medium mt-1">
            Kelola informasi pribadi, statistik atlet, dan keamanan akses akun Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowKtaModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <QrCode size={16} />
            <span>Kartu Anggota (KTA)</span>
          </button>

          <button
            onClick={() => setShowPinModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
          >
            <KeyRound size={16} className="text-blue-400" />
            <span>Atur PIN Akses</span>
          </button>
        </div>
      </div>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Card & Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Profile Card */}
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-2xl rounded-full pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4 group">
                <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-blue-500/40 p-1 bg-slate-900 shadow-[0_0_25px_rgba(59,130,246,0.25)] flex items-center justify-center">
                  {memberData.foto_url ? (
                    <img 
                      src={memberData.foto_url} 
                      alt={memberData.nama} 
                      className="w-full h-full object-cover rounded-2xl"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 font-black text-3xl">
                      {memberData.nama.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-2 rounded-full border-2 border-[#0b1224] shadow-md" title="Akun Terverifikasi">
                  <ShieldCheck size={14} />
                </div>
              </div>

              <h2 className="text-xl font-black text-white tracking-wide uppercase italic">
                {memberData.nama}
              </h2>

              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  memberData.role === 'admin' 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}>
                  {memberData.role === 'admin' ? 'Master Admin' : 'Anggota Resmi PB Bilibili 162'}
                </span>

                <span className="px-3 py-1 rounded-full text-[10px] font-bold text-slate-300 bg-slate-800 border border-white/5 uppercase">
                  {memberData.kategori}
                </span>
              </div>

              {/* ID Badge */}
              <div className="mt-5 w-full bg-[#070d1a] border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-[10px] uppercase font-sans font-bold text-slate-500">ID Anggota:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{memberIdCode}</span>
                  <button onClick={copyMemberId} className="text-slate-500 hover:text-blue-400 transition-colors p-1" title="Salin ID">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Performance Stats */}
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Activity size={15} className="text-blue-400" />
              <span>Statistik Atlet PB Bilibili 162</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#070d1a] border border-white/5 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Peringkat Klub</p>
                <p className="text-xl font-black italic text-amber-400 mt-1">{stats.rank}</p>
              </div>

              <div className="bg-[#070d1a] border border-white/5 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Poin</p>
                <p className="text-xl font-black italic text-blue-400 mt-1">{stats.totalPoints} PTS</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Info Form & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-wider italic">
                <Star size={18} className="text-blue-400" />
                <span>Detail Data Pribadi Anggota</span>
              </div>

              <button
                onClick={() => setIsEditing(!isEditing)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 font-bold text-xs transition-all cursor-pointer"
              >
                <Edit3 size={14} />
                <span>{isEditing ? 'Batal Edit' : 'Edit Data'}</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Nama Lengkap */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={memberData.nama}
                    onChange={(e) => setMemberData({ ...memberData, nama: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Email Terdaftar
                  </label>
                  <input
                    type="email"
                    disabled
                    value={memberData.email}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/5 text-slate-400 font-semibold text-sm outline-none cursor-not-allowed"
                  />
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Phone size={12} className="text-emerald-400" />
                    <span>No. WhatsApp / HP</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={memberData.whatsapp}
                    onChange={(e) => setMemberData({ ...memberData, whatsapp: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="0812xxxxxxxx"
                  />
                </div>

                {/* Domisili / Alamat */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin size={12} className="text-red-400" />
                    <span>Domisili / Kota</span>
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={memberData.domisili}
                    onChange={(e) => setMemberData({ ...memberData, domisili: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                    placeholder="Makassar"
                  />
                </div>

                {/* Kategori Umur / Kelompok */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Kategori Kelompok Usia
                  </label>
                  <select
                    disabled={!isEditing}
                    value={memberData.kategori}
                    onChange={(e) => setMemberData({ ...memberData, kategori: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Pra Dini (U-9)">Pra Dini (U-9)</option>
                    <option value="Dini (U-11)">Dini (U-11)</option>
                    <option value="Anak-Anak (U-13)">Anak-Anak (U-13)</option>
                    <option value="Pemula (U-15)">Pemula (U-15)</option>
                    <option value="Remaja (U-17)">Remaja (U-17)</option>
                    <option value="Taruna (U-19)">Taruna (U-19)</option>
                    <option value="Dewasa">Dewasa</option>
                    <option value="Senior">Senior</option>
                    <option value="Veteran">Veteran</option>
                  </select>
                </div>

                {/* Jenis Kelamin */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Jenis Kelamin
                  </label>
                  <select
                    disabled={!isEditing}
                    value={memberData.jenis_kelamin}
                    onChange={(e) => setMemberData({ ...memberData, jenis_kelamin: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    <option value="Putra">Putra</option>
                    <option value="Putri">Putri</option>
                  </select>
                </div>
              </div>

              {/* URL Foto Profil */}
              {isEditing && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Camera size={12} className="text-blue-400" />
                    <span>Link Foto Profil (URL Image)</span>
                  </label>
                  <input
                    type="url"
                    value={memberData.foto_url}
                    onChange={(e) => setMemberData({ ...memberData, foto_url: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-semibold text-sm outline-none focus:border-blue-500 placeholder:text-slate-600"
                    placeholder="https://example.com/foto.jpg"
                  />
                </div>
              )}

              {/* Submit Save Button */}
              {isEditing && (
                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    <span>Simpan Perubahan Profil</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* MODAL KTA (Kartu Tanda Anggota Digital) */}
      <AnimatePresence>
        {showKtaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-[#0b1224] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-wider italic">
                  <QrCode size={18} className="text-blue-400" />
                  <span>Kartu Tanda Anggota (KTA) PB Bilibili 162</span>
                </div>

                <button
                  onClick={() => setShowKtaModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Visual Card */}
              <div className="w-full aspect-[1.6/1] rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0284C7] p-6 text-white border-2 border-white/20 shadow-2xl relative overflow-hidden flex flex-col justify-between">
                {/* Card Background Pattern */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex items-center gap-3">
                    <img
                      src="/logo_pb_bilibili_162.svg"
                      alt="Logo PB Bilibili 162"
                      className="w-10 h-10 object-contain drop-shadow"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=100&auto=format&fit=crop&q=80";
                      }}
                    />
                    <div>
                      <p className="font-black italic text-sm tracking-tight leading-tight">PB BILIBILI 162</p>
                      <p className="text-[8px] font-bold text-blue-200 tracking-widest uppercase">Persatuan Bulutangkis</p>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-[8px] font-black uppercase tracking-widest">
                    MEMBER CARD
                  </span>
                </div>

                {/* Card Body */}
                <div className="flex items-center gap-4 relative z-10 my-2">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 bg-slate-900 shrink-0">
                    {memberData.foto_url ? (
                      <img src={memberData.foto_url} alt={memberData.nama} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-xl text-blue-300">
                        {memberData.nama.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <h3 className="font-black text-base uppercase tracking-tight italic truncate text-white">
                      {memberData.nama}
                    </h3>
                    <p className="text-[10px] font-mono text-blue-200 font-bold tracking-wider">
                      {memberIdCode}
                    </p>
                    <p className="text-[9px] font-semibold text-slate-300 uppercase mt-0.5">
                      Kategori: <span className="text-white font-bold">{memberData.kategori}</span>
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-end justify-between border-t border-white/10 pt-2 relative z-10">
                  <div>
                    <p className="text-[7px] font-bold uppercase tracking-widest text-slate-300">Status Keanggotaan</p>
                    <p className="text-[9px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={10} /> AKTIFF / VERIFIED
                    </p>
                  </div>

                  <div className="bg-white p-1.5 rounded-lg shadow-md">
                    <QrCode size={28} className="text-slate-900" />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30"
                >
                  <Printer size={16} />
                  <span>Cetak / Simpan KTA</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL GANTI PIN */}
      <AnimatePresence>
        {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0b1224] border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-wider italic">
                  <KeyRound size={18} className="text-blue-400" />
                  <span>Pengaturan PIN Access 6-Digit</span>
                </div>

                <button
                  onClick={() => setShowPinModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Buat atau ganti 6-digit PIN rahasia Anda untuk akses cepat tanpa perlu memasukkan kata sandi panjang.
              </p>

              <form onSubmit={handleSavePin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    PIN Baru (6 Angka)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinForm.newPin}
                    onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-mono text-center tracking-[0.4em] text-lg outline-none focus:border-blue-500"
                    placeholder="123456"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Konfirmasi PIN Baru
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    value={pinForm.confirmPin}
                    onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-[#070d1a] border border-white/10 text-white font-mono text-center tracking-[0.4em] text-lg outline-none focus:border-blue-500"
                    placeholder="123456"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer"
                  >
                    Simpan PIN Rahasia Baru
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
