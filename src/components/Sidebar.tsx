import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { 
  Users, 
  Newspaper, 
  Trophy, 
  Image, 
  LogOut, 
  LayoutDashboard,
  Zap,
  ChevronRight,
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
  FileText // TAMBAHAN: Ikon untuk Kelola Dokumen
} from 'lucide-react';
import { supabase } from '../supabase';

// Prop untuk kontrol dari parent (AdminLayout)
interface SidebarProps {
  email: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ email, isOpen, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dbStatus, setDbStatus] = useState<'online' | 'offline'>('online');

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

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Keluar Sistem?',
      text: "Anda harus login kembali untuk mengelola dashboard admin.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Keluar!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      const { error } = await supabase.auth.signOut();
      if (!error) navigate('/login');
    }
  };

  const menuItems = [
    { 
      section: 'Main Dashboard', 
      items: [
        { name: 'Pendaftaran', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Manajemen Atlet', path: '/admin/atlet', icon: Users },
      ]
    },
    { 
      section: 'Live Updates', 
      items: [
        { name: 'Update Skor & Poin', path: '/admin/skor', icon: Zap }, 
        { name: 'Manajemen Poin', path: '/admin/poin', icon: Star },
        { name: 'Audit Log Poin', path: '/admin/audit-poin', icon: History },
        { name: 'Update Berita', path: '/admin/berita', icon: Newspaper },
        { name: 'Update Ranking', path: '/admin/ranking', icon: Trophy },
        { name: 'Galeri Media', path: '/admin/galeri', icon: Image },
      ]
    },
    {
      section: 'Data & Analytics',
      items: [
        { name: 'Laporan & Rekap', path: '/admin/laporan', icon: BarChart3 },
        { name: 'Kelola Kas', path: '/admin/kas', icon: Wallet }, 
        { name: 'Kelola Surat', path: '/admin/surat', icon: Mail },
        { name: 'Kelola Dokumen', path: '/admin/dokumen', icon: FileText }, // TAMBAHAN: Link Menu Dokumen Baru
        { name: 'Log Aktivitas', path: '/admin/logs', icon: FileSearch },
      ]
    },
    { 
      section: 'Site Settings', 
      items: [
        { name: 'Kelola Tampilan', path: '/admin/tampilan', icon: Layout }, 
        { name: 'Kelola Hero', path: '/admin/hero', icon: Images },
        { name: 'Kelola Pop-up', path: '/admin/popup', icon: Megaphone },
        { name: 'Kelola Tentang', path: '/admin/about', icon: Info }, 
        { name: 'Kelola Struktur', path: '/admin/struktur', icon: Network },
        { name: 'Kelola Navbar', path: '/admin/navbar', icon: Menu }, 
        { name: 'Kelola Footer', path: '/admin/footer', icon: LayoutGrid }, 
        { name: 'Kelola Kontak', path: '/admin/kontak', icon: Phone },
      ]
    }
  ];

  return (
    <>
      {/* OVERLAY: Hanya muncul di mobile saat sidebar terbuka */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />

      {/* SIDEBAR CONTAINER */}
      <div className={`
        fixed md:relative flex flex-col
        w-72 bg-[#0F172A] h-screen p-6 text-white shadow-2xl z-[101]
        border-r border-slate-800 transition-all duration-500 overflow-hidden
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Dynamic Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/10 to-transparent blur-3xl -z-10 opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-red-600/5 to-transparent blur-3xl -z-10 opacity-30" />

        {/* Brand Header & Close Button Mobile */}
        <div className="flex items-center justify-between mb-10 flex-shrink-0">
          <div className="px-2 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="w-1.5 h-8 bg-blue-600 rounded-full group-hover:h-9 transition-all duration-300" />
                <div className="absolute -right-0.5 top-0 w-0.5 h-4 bg-blue-400/50 rounded-full" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight leading-none group-hover:text-blue-400 transition-colors">
                  PB Bilibili 162
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-[0.15em]">Authority Panel</span>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="md:hidden p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Database Status Info */}
        <div className="px-3 py-1.5 bg-slate-900/50 border border-slate-800 rounded-full w-fit mb-6 flex-shrink-0">
            <div className="flex items-center gap-2">
             <Circle size={6} className={`${dbStatus === 'online' ? 'text-emerald-500 fill-emerald-500' : 'text-red-500 fill-red-500'} animate-pulse`} />
             <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">System {dbStatus}</span>
            </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-7 overflow-y-auto no-scrollbar pr-1">
          {menuItems.map((group) => (
            <div key={group.section} className="relative">
              <p className="px-3 text-[10.5px] font-semibold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-3 h-[1px] bg-slate-800" />
                {group.section}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-[13.5px] tracking-wide transition-all duration-200 border relative overflow-hidden ${
                        isActive 
                          ? 'bg-blue-600 border-blue-500 text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)] translate-x-1.5' 
                          : 'text-slate-400 border-transparent hover:bg-slate-800/40 hover:text-slate-200 hover:translate-x-0.5'
                      }`}
                    >
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none animate-pulse" />
                      )}
                      
                      <div className="flex items-center gap-3 relative z-10">
                        <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                          isActive 
                            ? 'bg-white text-blue-600 scale-105 shadow' 
                            : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-blue-400'
                        }`}>
                          <item.icon size={16} />
                        </div>
                        <span>{item.name}</span>
                      </div>

                      {isActive && (
                        <div className="bg-white/20 p-0.5 rounded-full animate-in zoom-in duration-300">
                          <ChevronRight size={12} className="text-white" />
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="pt-2 mb-6">
             <a 
               href="/" 
               target="_blank" 
               rel="noreferrer"
               className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-dashed border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-900/50 transition-all group"
             >
               <ExternalLink size={13} className="group-hover:rotate-6 transition-transform" />
               <span className="text-[11px] font-medium uppercase tracking-wider">Lihat Live Site</span>
             </a>
          </div>
        </nav>

        {/* Footer Account Section */}
        <div className="mt-auto pt-4 border-t border-slate-800/50 flex-shrink-0">
          <div className="bg-gradient-to-br from-slate-900 to-[#0F172A] p-4 rounded-2xl mb-4 border border-slate-800 group transition-all duration-300 hover:border-blue-900/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-900/40 group-hover:rotate-3 transition-transform">
                  {email ? email.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0F172A] rounded-full flex items-center justify-center">
                  <ShieldCheck size={7} className="text-white" />
                </div>
              </div>
              <div className="overflow-hidden">
                <p className="text-[11.5px] font-semibold text-blue-100 truncate">{email ? email.split('@')[0] : 'Admin'}</p>
                <p className="text-[8.5px] font-medium text-slate-500 uppercase tracking-wider">Master Admin</p>
              </div>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full group flex items-center justify-center gap-2 py-3 bg-red-950/10 text-red-500 border border-red-900/20 rounded-xl font-semibold text-[11.5px] uppercase tracking-wider hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-md hover:shadow-red-900/15"
          >
            <LogOut size={14} className="group-hover:-translate-x-0.5 transition-transform" /> 
            Keluar Sesi
          </button>
          
          <div className="flex justify-between items-center mt-6 px-1">
            <p className="text-[8px] text-slate-600 font-medium uppercase tracking-wider flex items-center gap-1">
              <Database size={8} /> CLOUD ENGINE v2.0.4
            </p>
            <Settings size={9} className="text-slate-700 animate-spin-slow" />
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