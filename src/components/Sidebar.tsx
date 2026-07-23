import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  PackageOpen,
  MessageCircleQuestion,
  Target,
  Users, 
  UserCheck,
  Newspaper, 
  Trophy, 
  Image, 
  LogOut, 
  LayoutDashboard,
  Zap,
  ChevronRight,
  ChevronDown,
  Circle,
  ShieldCheck,
  Settings,
  Database,
  ExternalLink,
  Phone,
  Menu,
  Star,
  History,
  X,
  BarChart3,
  FileSearch,
  Layout,
  Images, 
  Megaphone, 
  LayoutGrid, 
  Info,
  Network,
  Mail,
  Wallet,
  FileText,
  FileSpreadsheet,
  BookOpen,
  Calendar
} from 'lucide-react';
import { supabase } from '../supabase';

// Prop untuk kontrol dari parent (AdminLayout)
interface SidebarProps {
  email: string;
  role?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ email, role = 'admin', isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [userProfile, setUserProfile] = useState<{ nama: string; foto_url: string }>({
    nama: '',
    foto_url: ''
  });
  const [imgError, setImgError] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string>('/logo_pb_bilibili_162.svg');

  useEffect(() => {
    const fetchLogo = async () => {
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
        console.error('Failed to load branding logo in Sidebar:', e);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('pendaftaran').select('id', { count: 'exact', head: true }).limit(1);
        setDbStatus(error ? 'offline' : 'online');
      } catch {
        setDbStatus('offline');
      }
    };
    
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadProfile = async () => {
      let foundFoto = '';
      let foundNama = '';

      // 1. Try local session
      try {
        const raw = localStorage.getItem('local_admin_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          const meta = parsed?.user?.user_metadata || {};
          if (meta.foto_url || meta.avatar_url) foundFoto = meta.foto_url || meta.avatar_url;
          if (meta.full_name || meta.nama) foundNama = meta.full_name || meta.nama;
        }
      } catch (e) {
        console.error(e);
      }

      // 2. Try Supabase Auth user
      if (!foundFoto || !foundNama) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata) {
            const meta = user.user_metadata;
            if (!foundFoto) foundFoto = meta.foto_url || meta.avatar_url || '';
            if (!foundNama) foundNama = meta.full_name || meta.nama || '';
          }
        } catch (e) {
          console.error(e);
        }
      }

      // 3. Try DB lookup in pendaftaran / rankings / atlet_stats if email or nama present
      const activeEmail = email || (() => {
        try {
          const raw = localStorage.getItem('local_admin_session');
          return raw ? JSON.parse(raw)?.user?.email : '';
        } catch { return ''; }
      })();

      if ((activeEmail || foundNama) && !foundFoto) {
        try {
          if (activeEmail) {
            const { data } = await supabase
              .from('pendaftaran')
              .select('nama, foto_url')
              .or(`whatsapp.eq.${activeEmail},email.eq.${activeEmail}`)
              .limit(1)
              .maybeSingle();

            if (data?.foto_url) foundFoto = data.foto_url;
            if (data?.nama && !foundNama) foundNama = data.nama;
          }

          if (!foundFoto && foundNama) {
            const { data: rData } = await supabase
              .from('rankings')
              .select('nama, foto_url')
              .ilike('nama', `%${foundNama.trim()}%`)
              .limit(1)
              .maybeSingle();
            if (rData?.foto_url) foundFoto = rData.foto_url;
          }
        } catch (err) {
          console.error("Error fetching profile photo for sidebar:", err);
        }
      }

      setUserProfile({
        nama: foundNama || (role === 'admin' ? 'Master Admin' : 'Anggota'),
        foto_url: foundFoto
      });
      setImgError(false);
    };

    loadProfile();

    const handleSessionChange = () => {
      loadProfile();
    };

    window.addEventListener('local-session-changed', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);
    return () => {
      window.removeEventListener('local-session-changed', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, [email, role]);

  const handleLogout = async () => {
    if (onClose) onClose();
    try {
      const result = await Swal.fire({
        title: 'Keluar Sistem?',
        text: "Anda yakin ingin keluar dari sesi akun Anda?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#374151',
        confirmButtonText: 'Ya, Keluar!',
        cancelButtonText: 'Batal',
        background: '#0F172A',
        color: '#fff',
        customClass: {
          container: 'z-[9999999]'
        }
      });

      if (result.isConfirmed) {
        localStorage.removeItem('local_admin_session');
        window.dispatchEvent(new Event('local-session-changed'));
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error('SignOut error:', e);
        }
        navigate('/login', { replace: true });
      }
    } catch (err) {
      console.error('Logout error:', err);
      // Fallback direct cleanup if Swal fails
      localStorage.removeItem('local_admin_session');
      window.dispatchEvent(new Event('local-session-changed'));
      if (onClose) onClose();
      navigate('/login', { replace: true });
    }
  };

    const allMenuItems = [
    { 
      section: 'Portal Utama', 
      items: [
        { name: role === 'admin' ? 'Dashboard Admin' : 'Dashboard Anggota', path: 'dashboard', icon: LayoutDashboard, adminOnly: false },
        { name: 'Profil Saya', path: 'profil', icon: UserCheck, adminOnly: false },
      ]
    },
    { 
      section: 'Informasi & Kegiatan', 
      items: [
        { name: 'Jadwal Latihan', path: 'jadwal', icon: Calendar, adminOnly: false },
        { name: 'Peringkat & Poin', path: 'ranking', icon: Trophy, adminOnly: false },
        { name: 'Hasil Skor', path: 'skor', icon: Zap, adminOnly: false }, 
        { name: 'Kas Club', path: 'kas', icon: Wallet, adminOnly: false },
        { name: 'Rekap Kas Anggota', path: 'rekap-keuangan', icon: FileSpreadsheet, adminOnly: false },
        { name: 'Berita & Pengumuman', path: 'berita', icon: Newspaper, adminOnly: false },
        { name: 'Galeri Media', path: 'galeri', icon: Image, adminOnly: false },
        { name: 'Dokumen Club', path: 'dokumen', icon: BookOpen, adminOnly: false },
        ...(role !== 'admin' ? [
          { name: 'Program Klub', path: 'program', icon: Target, adminOnly: false },
          { name: 'Prestasi', path: 'prestasi', icon: Trophy, adminOnly: false },
          { name: 'FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: false }
        ] : [])
      ]
    },
    ...(role !== 'admin' ? [{
      section: 'Profil Klub & Fasilitas',
      items: [
        { name: 'Sejarah Klub', path: 'sejarah', icon: Info, adminOnly: false },
        { name: 'Visi & Misi', path: 'visi-misi', icon: Info, adminOnly: false },
        { name: 'Fasilitas', path: 'fasilitas', icon: Info, adminOnly: false },
        { name: 'Struktur Organisasi', path: 'struktur', icon: Network, adminOnly: false },
        { name: 'Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: false }
      ]
    }] : []),
    { 
      section: 'Kelola Data & Atlet', 
      adminOnly: true,
      items: [
        { name: 'Kelola User', path: 'users', icon: ShieldCheck, adminOnly: true },
        { name: 'Pendaftaran Anggota', path: 'pendaftaran', icon: FileSpreadsheet, adminOnly: true },
        { name: 'Manajemen Atlet', path: 'atlet', icon: Users, adminOnly: true },
        { name: 'Absensi Latihan', path: 'absensi', icon: UserCheck, adminOnly: true },
        { name: 'Manajemen Poin', path: 'poin', icon: Star, adminOnly: true },
        { name: 'Audit Log Poin', path: 'audit-poin', icon: History, adminOnly: true },
      ]
    },
    {
      section: 'Administrasi & Keuangan',
      adminOnly: true,
      items: [
        { name: 'Laporan & Rekap', path: 'laporan', icon: BarChart3, adminOnly: true },
        { name: 'Kelola Kas', path: 'kas', icon: Wallet, adminOnly: true }, 
        { name: 'Kelola Surat', path: 'surat', icon: Mail, adminOnly: true },
        { name: 'Kelola Inventaris', path: 'inventaris', icon: PackageOpen, adminOnly: true },
        { name: 'Log Aktivitas', path: 'logs', icon: FileSearch, adminOnly: true },
      ]
    },
    { 
      section: 'Pengaturan Website',
      adminOnly: true, 
      items: [
        { name: 'Kelola Sejarah', path: 'sejarah', icon: Info, adminOnly: true },
        { name: 'Kelola Program', path: 'program', icon: Target, adminOnly: true },
        { name: 'Kelola Prestasi', path: 'prestasi', icon: Trophy, adminOnly: true },
        { name: 'Kelola FAQ', path: 'faq', icon: MessageCircleQuestion, adminOnly: true }, 
        { name: 'Kelola Visi Misi', path: 'visi-misi', icon: Info, adminOnly: true }, 
        { name: 'Kelola Fasilitas', path: 'fasilitas', icon: Info, adminOnly: true }, 
        { name: 'Kelola Struktur', path: 'struktur', icon: Network, adminOnly: true },
        { name: 'Kelola Tampilan', path: 'tampilan', icon: Layout, adminOnly: true }, 
        { name: 'Kelola Navbar', path: 'navbar', icon: Menu, adminOnly: true }, 
        { name: 'Kelola Hero', path: 'hero', icon: Images, adminOnly: true },
        { name: 'Kelola Pop-up', path: 'popup', icon: Megaphone, adminOnly: true },
        { name: 'Kelola Footer', path: 'footer', icon: LayoutGrid, adminOnly: true }, 
        { name: 'Kelola Kontak', path: 'kontak', icon: Phone, adminOnly: true },
      ]
    }
  ];

  const menuItems = allMenuItems
    .map(section => {
      if (section.adminOnly && role !== 'admin') {
        return null;
      }
      const filteredItems = section.items.filter(item => {
        if (role === 'admin') return true;
        return !item.adminOnly;
      });
      if (filteredItems.length === 0) return null;
      return {
        ...section,
        items: filteredItems
      };
    })
    .filter((section): section is typeof allMenuItems[0] => section !== null);

  // Auto expand section that contains current active route or default expand
  useEffect(() => {
    const currentPath = location.pathname.replace('/admin/', '');
    const initialSections: Record<string, boolean> = {};

    menuItems.forEach((group, index) => {
      const hasActive = group.items.some(item => item.path === currentPath);
      // For non-admin (anggota), both sections fit naturally so keep open
      // For admin, open section containing active route, or first section
      if (role !== 'admin' || hasActive || (index === 0 && Object.keys(openSections).length === 0)) {
        initialSections[group.section] = true;
      }
    });

    setOpenSections(prev => {
      if (Object.keys(prev).length === 0) {
        return initialSections;
      }
      // Make sure the group containing currentPath is opened
      const activeGroup = menuItems.find(g => g.items.some(i => i.path === currentPath));
      if (activeGroup) {
        return { ...prev, [activeGroup.section]: true };
      }
      return prev;
    });
  }, [location.pathname, role]);

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  return (
    <>
      {/* OVERLAY: Hanya muncul di mobile saat sidebar terbuka */}
      <div 
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />

      {/* SIDEBAR CONTAINER */}
      <div className={`
        fixed top-0 left-0 md:relative flex flex-col justify-between
        w-[280px] sm:w-72 md:w-60 bg-[#0F172A] h-[100dvh] p-2.5 sm:p-3 text-white shadow-2xl z-[101]
        border-r border-slate-800 transition-all duration-300 overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Dynamic Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/10 to-transparent blur-3xl -z-10 opacity-50 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-red-600/5 to-transparent blur-3xl -z-10 opacity-30 pointer-events-none" />

        {/* TOP SECTION: Brand Header & System Status */}
        <div className="flex-shrink-0 space-y-2 mb-2">
          <div className="flex items-center justify-between">
            <div className="px-1 group cursor-pointer" onClick={() => navigate('/')}>
              <div className="flex items-center gap-2.5">
                <img 
                  src={logoUrl || "/logo_pb_bilibili_162.svg"} 
                  alt="Logo PB Bilibili 162" 
                  className="w-8 h-8 object-contain drop-shadow group-hover:scale-105 transition-transform shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = "/logo_pb_bilibili_162.svg";
                  }}
                />
                <div>
                  <h1 className="text-base sm:text-lg font-bold tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                    PB Bilibili 162
                  </h1>
                  <span className="text-[7px] sm:text-[8px] font-bold text-slate-400 uppercase tracking-[0.15em] block mt-0.5">
                    Professional Club
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[8px] sm:text-[9px] font-semibold text-blue-400 uppercase tracking-[0.15em]">
                      {role === 'admin' ? 'Dashboard Admin' : 'Dashboard Anggota'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose}
              className="md:hidden p-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Tutup Menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between px-2 py-1 bg-slate-900/60 border border-slate-800/80 rounded-lg">
            <div className="flex items-center gap-1.5">
              <Circle size={5} className={`${dbStatus === 'online' ? 'text-emerald-500 fill-emerald-500' : 'text-red-500 fill-red-500'} animate-pulse`} />
              <span className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">System {dbStatus}</span>
            </div>
            <a 
              href="/" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1 text-[8px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider"
            >
              <span>Live Site</span>
              <ExternalLink size={8} />
            </a>
          </div>
        </div>

        {/* MIDDLE SECTION: Navigation Groups (Accordion & Scrollable if needed) */}
        <nav className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-0.5 my-1">
          {menuItems.map((group) => {
            const isOpenSection = openSections[group.section] ?? true;
            const isGroupActive = group.items.some(item => location.pathname === `/admin/${item.path}`);

            return (
              <div key={group.section} className="rounded-xl border border-slate-800/60 bg-slate-900/30 overflow-hidden transition-all">
                {/* Accordion Group Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(group.section)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                    isGroupActive 
                      ? 'bg-blue-600/10 text-blue-400 font-bold' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isGroupActive ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="text-[9px] uppercase font-bold tracking-wider truncate">{group.section}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[8px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {group.items.length}
                    </span>
                    {isOpenSection ? (
                      <ChevronDown size={12} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={12} className="text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Collapsible Menu Items */}
                {isOpenSection && (
                  <div className="p-1 pt-0.5 space-y-0.5 bg-slate-950/40 border-t border-slate-800/40 animate-in fade-in duration-200">
                    {group.items.map((item) => {
                      const isActive = location.pathname === `/admin/${item.path}`;
                      return (
                        <NavLink
                          key={item.path}
                          to={`/admin/${item.path}`}
                          onClick={onClose}
                          className={`group flex items-center justify-between px-2 py-1 rounded-lg font-medium text-[10px] tracking-wide transition-all duration-200 border relative overflow-hidden pointer-events-auto ${
                            isActive 
                              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20 font-semibold' 
                              : 'text-slate-300 border-transparent hover:bg-slate-800/60 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 relative z-10 min-w-0">
                            <div className={`p-1 rounded-md transition-all duration-200 shrink-0 ${
                              isActive 
                                ? 'bg-white text-blue-600 scale-105 shadow-sm' 
                                : 'bg-slate-800/80 text-slate-400 group-hover:bg-slate-700 group-hover:text-blue-400'
                            }`}>
                              <item.icon size={11} />
                            </div>
                            <span className="truncate">{item.name}</span>
                          </div>

                          {isActive && (
                            <ChevronRight size={10} className="text-white shrink-0 ml-1" />
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* BOTTOM SECTION: User Info & Logout Button */}
        <div className="flex-shrink-0 pt-2 border-t border-slate-800/60 space-y-1.5">
          <div 
            onClick={() => { if (onClose) onClose(); navigate('/admin/profil'); }}
            className="bg-gradient-to-br from-slate-900 to-[#0F172A] p-2 rounded-xl border border-slate-800 hover:border-blue-500/40 group transition-all duration-300 cursor-pointer relative"
            title="Klik untuk membuka Profil Saya"
          >
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                {userProfile.foto_url && !imgError ? (
                  <img 
                    src={userProfile.foto_url} 
                    alt={userProfile.nama || email} 
                    onError={() => setImgError(true)}
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover object-top border border-blue-500/40 shadow-lg shadow-blue-900/30 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-900/40 group-hover:rotate-3 transition-transform border border-blue-400/30">
                    {(userProfile.nama || email) ? (userProfile.nama || email).charAt(0).toUpperCase() : (role === 'admin' ? 'A' : 'M')}
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0F172A] rounded-full flex items-center justify-center">
                  <ShieldCheck size={7} className="text-white" />
                </div>
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="text-[10px] sm:text-[11px] font-bold text-blue-100 truncate flex items-center gap-1">
                  <span className="truncate">{userProfile.nama || (email ? email.split('@')[0] : (role === 'admin' ? 'Master Admin' : 'Anggota'))}</span>
                </p>
                <p className="text-[7.5px] font-semibold text-slate-400 uppercase tracking-wider truncate">
                  {role === 'admin' ? 'Administrator Admin' : 'Dashboard Anggota'}
                </p>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={handleLogout}
            className="w-full group flex items-center justify-center gap-2 py-1.5 bg-red-950/20 text-red-400 border border-red-900/30 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm hover:shadow-red-900/20 cursor-pointer"
          >
            <LogOut size={11} className="group-hover:-translate-x-0.5 transition-transform" /> 
            Keluar Sesi
          </button>
          
          <div className="flex justify-between items-center px-1 pt-0.5">
            <p className="text-[7px] text-slate-500 font-medium uppercase tracking-wider flex items-center gap-1">
              <Database size={7} /> ENGINE v2.0.4
            </p>
            <Settings size={8} className="text-slate-600 animate-spin-slow" />
          </div>
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </>
  );
}