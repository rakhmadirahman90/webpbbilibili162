import React, { useState, useEffect } from 'react';
import { 
  Users, UserCheck, ShieldCheck, Shield, KeyRound, Search, Filter, Plus, 
  Trash2, Edit3, CheckCircle, XCircle, AlertTriangle, Sparkles, Lock, Mail, Phone, Calendar, Image as ImageIcon,
  Activity, UserPlus, Eye, MoreVertical, SlidersHorizontal, Download, Upload, BookOpen, Lightbulb
} from 'lucide-react';
import { supabase } from '../supabase';
import { deleteAthleteCompletely } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';

interface UserRecord {
  id: string;
  nama: string;
  email: string;
  whatsapp: string;
  role: 'admin' | 'anggota';
  kategori: string;
  foto_url?: string;
  hasPassword?: boolean;
  mustChangePassword?: boolean;
  status?: string;
  created_at?: string;
}

export default function AdminUsers({ session }: { session: any }) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'anggota'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'SENIOR' | 'MUDA' | 'VETERAN'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'aktif' | 'tidak aktif'>('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    whatsapp: '',
    role: 'anggota' as 'admin' | 'anggota',
    kategori: 'SENIOR',
    password: ''
  });


  const hashPassword = async (password: string) => {
    const normalized = password.trim();
    if (normalized.length < 8) throw new Error('Password minimal 8 karakter.');
    if (normalized.length > 128) throw new Error('Password maksimal 128 karakter.');
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 600000;
    const key = await crypto.subtle.importKey('raw', encoder.encode(normalized), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      key,
      256
    );
    const toBase64Url = (bytes: Uint8Array) => {
      let binary = '';
      bytes.forEach((b) => { binary += String.fromCharCode(b); });
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };
    const hash = `pbkdf2$sha256${iterations}${toBase64Url(salt)}${toBase64Url(new Uint8Array(bits))}`;
    return { hash, salt: toBase64Url(salt) };
  };

  const [saving, setSaving] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showOnlineModal, setShowOnlineModal] = useState(false);

  useEffect(() => {
    fetchUsers();

    const channel = supabase
      .channel('admin_users_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, () => fetchUsers())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_duplicate' }, () => fetchUsers())
      .subscribe();
    
    // Subscribe to presence
    const handlePresenceSync = (e: any) => {
      const state = e.detail;
      const onlineArray: any[] = [];
      Object.values(state).forEach((presences: any) => {
        presences.forEach((presence: any) => {
          if (presence.user_id && !onlineArray.find(u => u.user_id === presence.user_id)) {
            onlineArray.push(presence);
          } else if (presence.email && !onlineArray.find(u => u.email === presence.email)) {
            onlineArray.push(presence);
          }
        });
      });
      setOnlineUsers(onlineArray);
    };

    window.addEventListener('presence-sync', handlePresenceSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('presence-sync', handlePresenceSync);
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch from pendaftaran table (primary source for club members)
      const { data: pendaftaranData, error } = await supabase
        .from('pendaftaran')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Password selalu berasal dari hash server/database; tidak disimpan di localStorage.
      const mapped: UserRecord[] = (pendaftaranData || []).map((item: any) => {
        return {
          id: item.id,
          nama: item.nama || 'Tanpa Nama',
          email: item.email || `${(item.nama || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')}@pbbilibili162.com`,
          whatsapp: item.whatsapp || '-',
          role: item.role || (item.nama?.toLowerCase().includes('admin') ? 'admin' : 'anggota'),
          kategori: item.kategori || item.kategori_atlet || 'SENIOR',
          foto_url: item.foto_url || '',
          hasPassword: !!item.password_hash,
          mustChangePassword: !!item.must_change_password,
          status: item.status || 'aktif',
          created_at: item.created_at || new Date().toISOString()
        };
      });

      // Ensure Master Admin exists
      const masterExists = mapped.some(u => u.role === 'admin');
      if (!masterExists) {
        mapped.unshift({
          id: 'admin-master',
          nama: 'Master Admin PB 162',
          email: 'admin@pbbilibili162.com',
          whatsapp: '081234567890',
          role: 'admin',
          kategori: 'SENIOR',
          hasPassword: true,
          created_at: new Date().toISOString()
        });
      }

      setUsers(mapped);
    } catch (err) {
      console.error('Error fetching users:', err);
      Swal.fire({
        title: 'Gagal Memuat User',
        text: 'Terjadi kesalahan saat mengambil data pengguna dari database.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormData({
      nama: '',
      email: '',
      whatsapp: '',
      role: 'anggota',
      kategori: 'SENIOR',
      password: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditingUser(user);
    setFormData({
      nama: user.nama,
      email: user.email,
      whatsapp: user.whatsapp,
      role: user.role,
      kategori: user.kategori,
      password: ''
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      Swal.fire({ title: 'Validasi', text: 'Nama user wajib diisi!', icon: 'warning', background: '#0F172A', color: '#fff' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nama: formData.nama.trim(),
        email: formData.email.trim() || `${formData.nama.toLowerCase().replace(/[^a-z0-9]/g, '')}@pbbilibili162.com`,
        whatsapp: formData.whatsapp.trim() || '-',
        role: formData.role,
        kategori: formData.kategori,
        kategori_atlet: formData.kategori
      };

      if (editingUser && editingUser.id !== 'admin-master') {
        const { error } = await supabase
          .from('pendaftaran')
          .update(payload)
          .eq('id', editingUser.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pendaftaran')
          .insert([payload]);
        if (error) throw error;
      }

      // Password anggota selalu dimulai dari mode default + wajib ganti pada login pertama.
      if (formData.password.trim()) {
        if (editingUser?.id === 'admin-master') {
          // Master Admin menggunakan password admin di Edge Function.
        } else {
          const passwordData = await hashPassword(formData.password);
          const { error: passwordError } = await supabase
            .from('pendaftaran')
            .update({ password_hash: passwordData.hash, password_salt: passwordData.salt, must_change_password: formData.role === 'anggota' })
            .eq('id', editingUser?.id || '')
          if (passwordError) throw passwordError;
        }
      } else if (editingUser?.id && editingUser.id !== 'admin-master' && formData.role === 'anggota') {
        const { error: defaultError } = await supabase
          .from('pendaftaran')
          .update({ password_hash: null, password_salt: null, must_change_password: true })
          .eq('id', editingUser.id);
        if (defaultError) throw defaultError;
      }

      Swal.fire({
        title: 'Berhasil!',
        text: editingUser ? 'Data user berhasil diperbarui.' : 'User baru berhasil ditambahkan.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
        background: '#0F172A',
        color: '#fff'
      });

      setShowModal(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan sistem.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserRecord) => {
    if (user.id === 'admin-master') {
      Swal.fire({ title: 'Aksi Ditolak', text: 'Master Admin tidak dapat dihapus!', icon: 'warning', background: '#0F172A', color: '#fff' });
      return;
    }

    const res = await Swal.fire({
      title: 'Hapus User Ini?',
      text: `User "${user.nama}" akan dihapus permanen dari sistem klub.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (res.isConfirmed) {
      try {
        await deleteAthleteCompletely(user.id, user.nama);

        Swal.fire({ title: 'Terhapus!', text: 'User berhasil dihapus.', icon: 'success', timer: 1200, showConfirmButton: false, background: '#0F172A', color: '#fff' });
        fetchUsers();
      } catch (err: any) {
        Swal.fire({ title: 'Gagal Menghapus', text: err.message, icon: 'error', background: '#0F172A', color: '#fff' });
      }
    }
  };

  const handleResetPassword = async (user: UserRecord) => {
    if (user.id === 'admin-master') {
      await Swal.fire({
        title: 'Password Master Admin',
        text: 'Master Admin menggunakan password admin pada layanan login.',
        icon: 'info',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    const { value: newPassword } = await Swal.fire({
      title: `Reset Password untuk ${user.nama}`,
      input: 'password',
      inputLabel: 'Masukkan password baru (minimal 8 karakter)',
      inputPlaceholder: 'Password baru',
      inputAttributes: { minlength: '8', autocomplete: 'new-password' },
      showCancelButton: true,
      confirmButtonText: 'Simpan Password',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff',
      confirmButtonColor: '#3B82F6'
    });

    if (!newPassword) return;
    if (String(newPassword).trim().length < 8) {
      await Swal.fire({ title: 'Password Tidak Valid', text: 'Password minimal 8 karakter.', icon: 'error', background: '#0F172A', color: '#fff' });
      return;
    }

    try {
      const passwordData = await hashPassword(String(newPassword));
      const { error } = await supabase.from('pendaftaran').update({ password_hash: passwordData.hash, password_salt: passwordData.salt, must_change_password: false, password_changed_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      await Swal.fire({ title: 'Password Diperbarui!', text: `Password untuk ${user.nama} telah disimpan sebagai hash.`, icon: 'success', timer: 1500, showConfirmButton: false, background: '#0F172A', color: '#fff' });
      fetchUsers();
    } catch (e: any) {
      await Swal.fire({ title: 'Gagal', text: e?.message || 'Gagal menyimpan password baru.', icon: 'error', background: '#0F172A', color: '#fff' });
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const memberCount = users.filter(u => u.role === 'anggota').length;
  const defaultPasswordCount = users.filter(u => u.role === 'anggota' && u.mustChangePassword).length;
  const customPasswordCount = users.filter(u => u.role === 'anggota' && u.hasPassword && !u.mustChangePassword).length;

  const filteredUsers = users.filter(u => {
    const matchSearch = u.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.whatsapp.includes(searchTerm);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const normalizedCategory = String(u.kategori || 'SENIOR').toUpperCase();
    const matchCategory = categoryFilter === 'all' || normalizedCategory === categoryFilter;
    const normalizedStatus = String(u.status || 'aktif').toLowerCase().includes('tidak') ? 'tidak aktif' : 'aktif';
    const matchStatus = statusFilter === 'all' || normalizedStatus === statusFilter;
    return matchSearch && matchRole && matchCategory && matchStatus;
  });

  return (
    <div className="mx-auto w-full max-w-[1680px] min-h-full flex flex-col p-3 sm:p-5 lg:p-7 space-y-4 md:space-y-6 overflow-y-auto overflow-x-hidden overscroll-contain pb-28 md:pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-br from-[#0b1c38] via-[#07152a] to-[#050d1c] p-4 sm:p-6 rounded-[24px] md:rounded-[30px] border border-blue-300/10 shadow-[0_24px_90px_rgba(0,0,0,.35)] relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">
              <ShieldCheck size={12} />
              <span>Admin Security & Access Management</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white italic uppercase tracking-[-.04em]">
              Kelola <span className="text-blue-500">User & Hak Akses</span>
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm font-medium mt-0.5">
              Manajemen akun anggota, hak akses admin, pengaturan password login, dan verifikasi profil sistem klub.
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-between sm:justify-end">
            <button 
              onClick={() => setShowOnlineModal(true)}
              className="flex flex-col items-start sm:items-end justify-center bg-black/30 hover:bg-black/50 transition-colors border border-white/5 hover:border-emerald-500/30 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl cursor-pointer"
            >
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-0.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Realtime Online
              </div>
              <div className="text-base sm:text-lg font-black text-white">
                {onlineUsers.length} <span className="text-[10px] sm:text-xs text-slate-500 font-medium">/ {users.length} User</span>
              </div>
            </button>

            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-black uppercase tracking-wider px-4 py-3 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-600/30 active:scale-95 transition-all cursor-pointer border border-blue-400/30 shrink-0"
            >
              <Plus size={16} />
              <UserPlus size={16} />
              <span>Tambah User</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard summary cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
        <div className="group w-full rounded-2xl border border-blue-400/15 bg-gradient-to-br from-[#102a61] via-[#0b1835] to-[#081326] p-3.5 sm:p-4 shadow-xl shadow-blue-950/20 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20"><Users size={20}/></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-300/50">Total</span>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{users.length}</div>
          <div className="text-[10px] font-semibold text-slate-400">Total User</div>
        </div>
        <div className="group w-full rounded-2xl border border-emerald-400/15 bg-gradient-to-br from-[#092d28] via-[#071c1d] to-[#061318] p-3.5 sm:p-4 shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"><ShieldCheck size={20}/></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300/50">Admin</span>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{adminCount}</div>
          <div className="text-[10px] font-semibold text-slate-400">Admin Klub</div>
        </div>
        <div className="group w-full rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-[#092b4b] via-[#081b30] to-[#061321] p-3.5 sm:p-4 shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20"><UserCheck size={20}/></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-300/50">Member</span>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{memberCount}</div>
          <div className="text-[10px] font-semibold text-slate-400">Anggota</div>
        </div>
        <button type="button" onClick={() => setShowOnlineModal(true)} className="text-left group w-full rounded-2xl border border-teal-400/15 bg-gradient-to-br from-[#082b2a] via-[#071b21] to-[#061318] p-3.5 sm:p-4 shadow-xl transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/20"><Activity size={20}/></div>
            <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/> Online</span>
          </div>
          <div className="mt-3 text-2xl font-black text-white">{onlineUsers.length}</div>
          <div className="text-[10px] font-semibold text-slate-400">Sedang Online</div>
        </button>
      </section>

      {/* Password policy banner */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-gradient-to-r from-amber-500/[.10] via-[#171b2c] to-[#0c1428] p-4 shadow-xl shrink-0">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20"><Lock size={19}/></div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-amber-200">Password Default & Keamanan Anggota</h3>
            <p className="mt-0.5 text-[10px] sm:text-xs leading-5 text-slate-400">Semua anggota baru/default login memakai password awal dan wajib membuat password pribadi pada login pertama. Password pribadi disimpan sebagai hash.</p>
            <div className="mt-1 flex flex-wrap gap-2 text-[9px] font-bold">
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-300">● {defaultPasswordCount} wajib ganti password</span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-300">● {customPasswordCount} password pribadi</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={() => setRoleFilter('anggota')} className="inline-flex w-full lg:w-auto items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-white/[.04] px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-200 hover:bg-white/[.08] transition">
          <KeyRound size={14}/> Kelola Password
        </button>
      </section>

      {/* Search, filter & quick actions */}
      <section className="rounded-[24px] border border-blue-300/10 bg-[#07152a]/90 p-3 sm:p-4 shadow-[0_18px_60px_rgba(0,0,0,.24)] sticky top-2 z-20 shadow-[0_18px_60px_rgba(0,0,0,.24)]">
        <div className="flex flex-col xl:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, email, atau nomor WhatsApp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 w-full rounded-2xl border border-blue-200/10 bg-[#061327] pl-11 pr-4 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400/60 focus:ring-4 focus:ring-blue-500/10"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex gap-2">
            <select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value as any)} className="h-12 rounded-2xl border border-blue-200/10 bg-[#061327] px-3 text-xs font-bold text-slate-200 outline-none focus:border-blue-400/60">
              <option value="all">Semua Role</option>
              <option value="admin">Admin</option>
              <option value="anggota">Anggota</option>
            </select>
            <select value={categoryFilter} onChange={(e)=>setCategoryFilter(e.target.value as any)} className="h-12 rounded-2xl border border-blue-200/10 bg-[#061327] px-3 text-xs font-bold text-slate-200 outline-none focus:border-blue-400/60">
              <option value="all">Semua Kategori</option>
              <option value="SENIOR">Senior / Umum</option>
              <option value="MUDA">Muda / Junior</option>
              <option value="VETERAN">Veteran</option>
            </select>
            <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value as any)} className="h-12 rounded-2xl border border-blue-200/10 bg-[#061327] px-3 text-xs font-bold text-slate-200 outline-none focus:border-blue-400/60">
              <option value="all">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="tidak aktif">Tidak Aktif</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: 'Semua User', count: users.length },
            { id: 'admin', label: 'Admin', count: users.filter(u => u.role === 'admin').length },
            { id: 'anggota', label: 'Anggota', count: users.filter(u => u.role === 'anggota').length }
          ].map(tab => (
            <button key={tab.id} type="button" onClick={() => setRoleFilter(tab.id as any)}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition ${roleFilter === tab.id ? 'border-blue-400/40 bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'border-white/5 bg-white/[.03] text-slate-400 hover:bg-white/[.06] hover:text-white'}`}>
              {tab.label}<span className={`rounded-full px-1.5 py-0.5 ${roleFilter === tab.id ? 'bg-white/15 text-white' : 'bg-slate-800 text-slate-400'}`}>{tab.count}</span>
            </button>
          ))}
          <span className="ml-auto hidden sm:inline-flex items-center gap-2 text-[10px] font-bold text-slate-500"><SlidersHorizontal size={13}/> Filter aktif: {filteredUsers.length}</span>
        </div>
      </section>

      {/* Users Table / List / Mobile Cards */}
      <div className="bg-gradient-to-b from-[#0b172d] to-[#07101f] border border-white/10 rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,.28)] shrink-0 flex flex-col">
        <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/10"><Users size={17}/></div>
            <div className="min-w-0"><h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Daftar Akun Terdaftar</h3><p className="mt-0.5 text-[9px] text-slate-500">{filteredUsers.length} user ditampilkan</p></div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/> Realtime</div>
        </div>

        <div className="overflow-visible p-2 sm:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest">Memuat Data User...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-2">
              <Users size={36} className="text-slate-600" />
              <p className="text-sm font-bold">Tidak ada user yang ditemukan.</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards Grid (< md) */}
              <div className="!grid grid-cols-1 gap-3 md:hidden">
                {filteredUsers.map((user) => {
                  const isOnline = onlineUsers.some(u => (u.user_id && u.user_id === user.id) || (u.email && u.email === user.email));
                  return (
                  <div key={user.id} className="group bg-gradient-to-br from-[#0c1a30] to-[#081224] border border-blue-200/10 rounded-2xl p-4 flex flex-col space-y-3 shadow-lg shadow-black/10 relative overflow-hidden transition-all hover:border-blue-400/20">
                    {/* Status Online Indicator (Top Edge) */}
                    <div className={`absolute top-0 left-0 w-full h-1 ${isOnline ? 'bg-emerald-500' : 'bg-transparent'}`} />

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {user.foto_url ? (
                            <img src={user.foto_url} alt={user.nama} className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0 shadow" />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 text-blue-300 ring-1 ring-blue-400/20 flex items-center justify-center shadow shrink-0">
                              <ImageIcon size={19} strokeWidth={1.8} />
                            </div>
                          )}
                          {/* Online Dot */}
                          <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-transparent'}`} />
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm flex items-center gap-2">
                            {user.nama}
                          </p>
                          <p className="text-[10px] text-slate-500">ID: {user.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => handleResetPassword(user)} title="Password" className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/15 hover:bg-blue-500/20 transition"><KeyRound size={14}/></button>
                        <button type="button" onClick={() => handleOpenEdit(user)} title="Edit" className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-white/[.04] text-slate-300 ring-1 ring-white/10 hover:bg-white/[.08] transition"><Edit3 size={14}/></button>
                        <button type="button" onClick={() => handleDelete(user)} title="Hapus" className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-red-500/10 text-red-300 ring-1 ring-red-400/10 hover:bg-red-500/20 transition"><Trash2 size={14}/></button>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        user.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' 
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                      }`}>
                        {user.role === 'admin' ? <Shield size={10} /> : <UserCheck size={10} />}
                        {user.role.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-black/20 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">WhatsApp</p>
                        <div className="flex items-center gap-1 text-slate-300 font-medium mt-0.5">
                          <Phone size={11} className="text-emerald-400 shrink-0" />
                          <span className="truncate">{user.whatsapp}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Kategori</p>
                        <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-bold uppercase">
                          {user.kategori}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        user.hasPassword ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {user.mustChangePassword ? <AlertTriangle size={12} /> : (user.hasPassword ? <CheckCircle size={12} /> : <Lock size={12} />)}
                        {user.mustChangePassword ? 'Wajib Ganti Password' : (user.hasPassword ? 'Password Pribadi' : 'Default Login')}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleResetPassword(user)}
                          title="Reset Password"
                          className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1"
                        >
                          <KeyRound size={12} /> PIN
                        </button>
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Edit"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-bold uppercase flex items-center gap-1"
                        >
                          <Edit3 size={12} /> Edit
                        </button>
                        {user.id !== 'admin-master' && (
                          <button
                            onClick={() => handleDelete(user)}
                            title="Hapus"
                            className="p-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Desktop Table view (>= md) */}
              <div className="hidden md:block overflow-x-auto overscroll-x-contain scrollbar-thin">
                <table className="w-full min-w-[980px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-black/30 text-slate-400 uppercase text-[9px] tracking-wider border-b border-white/5">
                      <th className="p-4"># / Pengguna</th>
                      <th className="p-4">Kontak (WhatsApp / Email)</th>
                      <th className="p-4">Hak Akses (Role)</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Status Password</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {filteredUsers.map((user) => {
                      const isOnline = onlineUsers.some(u => (u.user_id && u.user_id === user.id) || (u.email && u.email === user.email));
                      return (
                      <tr key={user.id} className={`hover:bg-white/[0.02] transition-colors group relative ${isOnline ? 'bg-emerald-500/5' : ''}`}>
                        <td className="p-4 relative">
                          <div className={`absolute top-0 left-0 w-1 h-full ${isOnline ? 'bg-emerald-500' : 'bg-transparent'}`} />
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {user.foto_url ? (
                                <img src={user.foto_url} alt={user.nama} className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 shadow" />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-indigo-600/20 text-blue-300 ring-1 ring-blue-400/20 flex items-center justify-center shadow shrink-0">
                                  <ImageIcon size={17} strokeWidth={1.8} />
                                </div>
                              )}
                              <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${isOnline ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                <div className={`w-1 h-1 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-transparent'}`} />
                              </div>
                            </div>
                            <div>
                              <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors flex items-center gap-2">
                                {user.nama}
                              </p>
                              <p className="text-[10px] text-slate-500">ID: {user.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Phone size={12} className="text-emerald-400" />
                              <span>{user.whatsapp}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                              <Mail size={12} className="text-blue-400" />
                              <span className="truncate max-w-[200px]">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            user.role === 'admin' 
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            {user.role === 'admin' ? <Shield size={10} /> : <UserCheck size={10} />}
                            {user.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                            {user.kategori}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            user.hasPassword ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'
                          }`}>
                            {user.hasPassword ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                            {user.hasPassword ? 'Password Aktif' : 'Belum Set Password'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleResetPassword(user)}
                              title="Reset Password"
                              className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl transition-all cursor-pointer"
                            >
                              <KeyRound size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(user)}
                              title="Edit User"
                              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                            >
                              <Edit3 size={14} />
                            </button>
                            {user.id !== 'admin-master' && (
                              <button
                                onClick={() => handleDelete(user)}
                                title="Hapus User"
                                className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-xl transition-all cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick security tips */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-3 shrink-0">
        <div className="rounded-[22px] border border-cyan-400/10 bg-gradient-to-br from-[#081c32] to-[#071122] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/15"><Lightbulb size={18}/></div>
            <div><h3 className="text-sm font-black text-white">Tips Pengelolaan User</h3><p className="text-[10px] text-slate-500">Praktik aman untuk akun PB BILIBILI 162</p></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-[10px] text-slate-400">
            <div className="rounded-xl bg-white/[.025] border border-white/5 p-3">• Anggota menggunakan password default saat pertama kali login.</div>
            <div className="rounded-xl bg-white/[.025] border border-white/5 p-3">• Login pertama wajib diarahkan untuk mengganti password.</div>
            <div className="rounded-xl bg-white/[.025] border border-white/5 p-3">• Password pribadi disimpan dalam bentuk hash, bukan plaintext.</div>
            <div className="rounded-xl bg-white/[.025] border border-white/5 p-3">• Gunakan nomor WhatsApp yang aktif dan terdaftar.</div>
          </div>
        </div>
        <div className="rounded-[22px] border border-blue-400/10 bg-gradient-to-br from-[#0a1930] to-[#071122] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 ring-1 ring-blue-400/15"><ShieldCheck size={18}/></div><div><h3 className="text-sm font-black text-white">Status Keamanan</h3><p className="text-[10px] text-slate-500">Ringkasan akses saat ini</p></div></div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/15 px-2.5 py-1 text-[9px] font-black text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/> Aktif</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/5 bg-black/15 p-3"><p className="text-lg font-black text-white">{defaultPasswordCount}</p><p className="text-[9px] text-slate-500">Wajib ganti</p></div>
            <div className="rounded-xl border border-white/5 bg-black/15 p-3"><p className="text-lg font-black text-white">{customPasswordCount}</p><p className="text-[9px] text-slate-500">Password pribadi</p></div>
            <div className="rounded-xl border border-white/5 bg-black/15 p-3"><p className="text-lg font-black text-white">{onlineUsers.length}</p><p className="text-[9px] text-slate-500">Online</p></div>
          </div>
        </div>
      </section>

      {/* Online Users Modal */}
      {showOnlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1224] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden max-h-[85vh] flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between shrink-0">
              <h3 className="text-base font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>User Sedang Online ({onlineUsers.length})</span>
              </h3>
              <button 
                onClick={() => setShowOnlineModal(false)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 min-h-0 space-y-3 custom-scrollbar">
              {onlineUsers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 font-medium">
                  Tidak ada user yang sedang aktif.
                </div>
              ) : (
                onlineUsers.map((u: any, idx: number) => {
                  const userDetail = users.find(x => (u.user_id && x.id === u.user_id) || (u.email && x.email === u.email));
                  return (
                    <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="relative shrink-0">
                        {userDetail?.foto_url ? (
                          <img src={userDetail.foto_url} alt={u.nama} className="w-12 h-12 rounded-xl object-cover border border-emerald-500/30" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/20 to-teal-600/20 text-emerald-300 ring-1 ring-emerald-400/20 flex items-center justify-center text-lg shadow shrink-0">
                            <ImageIcon size={19} strokeWidth={1.8} />
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0b1224] bg-emerald-500 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-bold text-white truncate">{u.nama || u.email}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            u.role === 'admin' 
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' 
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            {u.role}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex flex-col sm:flex-row gap-1 sm:gap-3">
                          <span>{u.email}</span>
                          {userDetail?.whatsapp && (
                            <span className="hidden sm:inline text-slate-600">•</span>
                          )}
                          {userDetail?.whatsapp && (
                            <span className="flex items-center gap-1 text-emerald-400/80"><Phone size={10} /> {userDetail.whatsapp}</span>
                          )}
                        </div>
                      </div>

                      <div className="w-full sm:w-auto bg-black/40 px-3 py-2 rounded-xl border border-white/5 shrink-0 flex flex-col items-start sm:items-end">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Sedang Mengakses</span>
                        <div className="flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-lg">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                          <span className="text-xs font-bold text-blue-300">
                            {(() => {
                              const p = u.pathname || '/';
                              if (p === '/') return 'Halaman Utama / Beranda';
                              if (p === '/login') return 'Halaman Login';
                              if (p.includes('/admin/dashboard')) return 'Dashboard';
                              if (p.includes('/admin/users')) return 'Manajemen User';
                              if (p.includes('/admin/profil')) return 'Profil Saya';
                              if (p.includes('/admin/jadwal')) return 'Jadwal Latihan';
                              if (p.includes('/admin/kas')) return 'Keuangan / Kas';
                              if (p.includes('/admin/ranking')) return 'Ranking';
                              if (p.includes('/admin/skor')) return 'Live Score';
                              if (p.includes('/admin/berita')) return 'Berita / Informasi';
                              if (p.includes('/admin/galeri')) return 'Galeri';
                              if (p.includes('/admin/dokumen')) return 'Dokumen Penting';
                              if (p.includes('/admin/pendaftaran')) return 'Pendaftaran Anggota';
                              if (p.includes('/admin/atlet')) return 'Database Atlet';
                              if (p.includes('/admin/surat')) return 'Persuratan';
                              if (p.includes('/admin/poin')) return 'Manajemen Poin';
                              if (p.includes('/admin/audit-poin')) return 'Log Sistem Poin';
                              if (p.includes('/admin/logs')) return 'Sistem Logs';
                              
                              const pathParts = p.split('/');
                              const lastPart = pathParts[pathParts.length - 1];
                              return lastPart ? lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ') : p;
                            })()}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-500 mt-1.5">Sejak: {new Date(u.online_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-b from-[#0a1930] to-[#071122] border border-blue-300/15 rounded-[26px] p-5 sm:p-6 w-full max-w-lg shadow-2xl shadow-black/50 relative overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-white uppercase italic tracking-wider flex items-center gap-2">
                <Users size={18} className="text-blue-500" />
                <span>{editingUser ? 'Edit Data User' : 'Tambah User Baru'}</span>
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xs bg-slate-800 px-2.5 py-1 rounded-xl cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={formData.nama}
                  onChange={(e) => setFormData({...formData, nama: e.target.value})}
                  placeholder="Contoh: Andi Pratama"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                    placeholder="Contoh: 08123456789"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Email Akun</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="email@domain.com"
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Hak Akses (Role)</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="anggota">Anggota</option>
                    <option value="admin">Admin Klub</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Kategori Atlet</label>
                  <select
                    value={formData.kategori}
                    onChange={(e) => setFormData({...formData, kategori: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="SENIOR">Senior / Umum</option>
                    <option value="MUDA">Muda / Junior</option>
                    <option value="VETERAN">Veteran</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">Password Login (Terenkripsi & Aman)</label>
                <input
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Minimal 8 karakter"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-semibold"
                />
                <p className="text-[10px] text-slate-500 mt-1">Untuk anggota, kosongkan bila ingin kembali ke password default. Password default akan berlaku pada login pertama dan anggota wajib menggantinya. Password tidak disimpan sebagai plaintext.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : (editingUser ? 'Perbarui User' : 'Simpan User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
