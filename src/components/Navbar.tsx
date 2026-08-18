import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  Globe, ChevronDown, Menu, X, MapPin, UserPlus, Wallet, FileText, 
  Trophy, BrainCircuit, ArrowLeft, Youtube, Instagram, Facebook, Twitter, 
  Radio, LogIn, LayoutDashboard, UserCheck, LogOut, Timer, HelpCircle, 
  RefreshCw, Info, Users, Award, Image as ImageIcon, Building2, 
  Target, Shield, Newspaper, Sparkles
} from 'lucide-react';
import { supabase } from '../supabase'; 
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { forceRefreshSiteSettings } from '../utils/siteSettingsHelper';

export const DEFAULT_NAV_ITEMS = [
  { id: '3a852d50-2fce-4050-a416-d6cbbb55ad96', label: 'Beranda', path: 'home', type: 'link', parent_id: null, order_index: 0 },
  { id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', label: 'Tentang Kami', path: 'about', type: 'dropdown', parent_id: null, order_index: 1 },
  { id: '6a483114-ecb8-4d87-88fd-9fdc71b40216', label: 'Sejarah', path: 'sejarah', type: 'link', parent_id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', order_index: 1 },
  { id: '42e2739d-9ce8-4506-96bf-5ac763c59e48', label: 'Visi & Misi', path: 'visi-misi', type: 'link', parent_id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', order_index: 2 },
  { id: 'a1856185-8d97-493c-b66d-acccc3643b23', label: 'Fasilitas', path: 'fasilitas', type: 'link', parent_id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', order_index: 3 },
  { id: 'c70d5e62-dece-4cb4-8358-fe77ac65dcce', label: 'Struktur Organisasi', path: 'struktur-organisasi', type: 'link', parent_id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', order_index: 4 },
  { id: 'e1856185-8d97-493c-b66d-acccc3643b24', label: 'Dokumen Penting', path: 'dokumen-penting', type: 'link', parent_id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', order_index: 5 },
  { id: 'f1856185-8d97-493c-b66d-acccc3643b25', label: 'Inventaris', path: 'inventaris', type: 'link', parent_id: 'cd3a94c1-a825-44b3-8766-78512eb727bb', order_index: 6 },
  { id: '7209cc42-be89-4086-9041-35f49acfd97f', label: 'Informasi', path: 'informasi', type: 'dropdown', parent_id: null, order_index: 2 },
  { id: '182ddd33-5836-4efb-b3b7-92717cb5506b', label: 'Berita', path: 'berita', type: 'link', parent_id: '7209cc42-be89-4086-9041-35f49acfd97f', order_index: 1 },
  { id: '282ddd33-5836-4efb-b3b7-92717cb5506c', label: 'Prestasi', path: 'prestasi', type: 'link', parent_id: '7209cc42-be89-4086-9041-35f49acfd97f', order_index: 2 },
  { id: '9209cc42-be89-4086-9041-35f49acfd96e', label: 'Atlet', path: 'atlet', type: 'dropdown', parent_id: null, order_index: 3 },
  { id: '2d4ab768-c22a-4b71-a76b-c7e30577e3de', label: 'Semua Atlet', path: 'Semua', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 1 },
  { id: 'a959b75b-5b70-4945-a653-a5f09b77d29b', label: 'Atlet Senior', path: 'Senior', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 2 },
  { id: 'eb6fd70a-733f-4ede-ae94-5fb2c5944957', label: 'Atlet Muda', path: 'Muda', type: 'link', parent_id: '9209cc42-be89-4086-9041-35f49acfd96e', order_index: 3 },
  { id: '4fb391bc-f8f8-48a6-9ea4-76dc0b173fb9', label: 'Peringkat', path: 'peringkat', type: 'dropdown', parent_id: null, order_index: 4 },
  { id: '5fb391bc-f8f8-48a6-9ea4-76dc0b173fc0', label: 'Ranking Atlet', path: 'peringkat', type: 'link', parent_id: '4fb391bc-f8f8-48a6-9ea4-76dc0b173fb9', order_index: 1 },
  { id: '6fb391bc-f8f8-48a6-9ea4-76dc0b173fc1', label: 'Quiz Badminton', path: 'quiz', type: 'link', parent_id: '4fb391bc-f8f8-48a6-9ea4-76dc0b173fb9', order_index: 2 },
  { id: '8f9e1002-a537-46af-a4b7-0d2142138279', label: 'Galeri', path: 'gallery', type: 'link', parent_id: null, order_index: 5 },
  { id: '9f9e1002-a537-46af-a4b7-0d2142138280', label: 'Jadwal Latihan', path: 'jadwal', type: 'link', parent_id: null, order_index: 6 },
  { id: 'af9e1002-a537-46af-a4b7-0d2142138281', label: 'Hubungi Kami', path: 'contact', type: 'link', parent_id: null, order_index: 7 },
  { id: 'bf9e1002-a537-46af-a4b7-0d2142138282', label: 'FAQ', path: 'faq', type: 'link', parent_id: null, order_index: 8 }
];

export const ATLET_DEFAULT_SUBMENUS = [
  { id: 'sub-atlet-semua', label: 'Semua Atlet', path: 'Semua', type: 'link', parent_id: 'atlet', order_index: 1 },
  { id: 'sub-atlet-senior', label: 'Atlet Senior', path: 'Senior', type: 'link', parent_id: 'atlet', order_index: 2 },
  { id: 'sub-atlet-muda', label: 'Atlet Muda / Taruna', path: 'Muda', type: 'link', parent_id: 'atlet', order_index: 3 },
  { id: 'sub-atlet-ranking', label: 'Ranking & Poin Atlet', path: 'peringkat', type: 'link', parent_id: 'atlet', order_index: 4 },
  { id: 'sub-atlet-register', label: 'Pendaftaran Atlet Baru', path: 'register', type: 'link', parent_id: 'atlet', order_index: 5 }
];

// Helper to check if an item is top-level (main menu)
export const isTopLevelMenuItem = (item: any) => {
  if (!item) return false;
  return !item.parent_id || item.parent_id === '' || item.parent_id === 'none' || item.parent_id === null;
};

// Memoized LiveClock to completely prevent whole Navbar re-renders every 1000ms
const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getIndonesianDateTime = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    
    const dayName = days[date.getDay()];
    const dateNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return {
      dayName,
      dateStr: `${dateNum} ${monthName} ${year}`,
      timeStr: `${hours}:${minutes}:${seconds}`,
      shortDate: `${dateNum} ${monthName}`,
    };
  };

  const dt = getIndonesianDateTime(time);

  return (
    <div className="flex xl:flex lg:hidden items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:py-1 bg-[#151d30]/70 border border-white/10 rounded-full backdrop-blur-md shadow-inner shrink-0 select-none">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      <div className="flex items-center gap-1 text-[7.5px] sm:text-[9px] lg:text-xs font-mono font-bold tracking-wider text-slate-300 leading-none">
        <span className="hidden sm:inline opacity-80">{dt.dayName}, {dt.dateStr}</span>
        <span className="sm:hidden opacity-80">{dt.shortDate}</span>
        <span className="opacity-40">•</span>
        <span className="text-blue-400 font-extrabold tracking-widest">{dt.timeStr}</span>
      </div>
    </div>
  );
});

interface NavbarProps {
  onNavigate: (sectionId: string, tabId?: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState('ID');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const syncSession = async () => {
    const { data: { session: supaSession } } = await supabase.auth.getSession();
    if (supaSession) {
      setSession(supaSession);
    } else {
      const local = localStorage.getItem('local_admin_session');
      setSession(local ? JSON.parse(local) : null);
    }
  };

  useEffect(() => {
    syncSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      if (supaSession) {
        setSession(supaSession);
      } else {
        const local = localStorage.getItem('local_admin_session');
        setSession(local ? JSON.parse(local) : null);
      }
    });

    const handleLocalAuth = () => syncSession();
    window.addEventListener('local-session-changed', handleLocalAuth);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('local-session-changed', handleLocalAuth);
    };
  }, []);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    try {
      const result = await Swal.fire({
        title: 'Keluar Sistem?',
        text: 'Anda yakin ingin keluar dari sesi akun Anda?',
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
      localStorage.removeItem('local_admin_session');
      window.dispatchEvent(new Event('local-session-changed'));
      setIsMobileMenuOpen(false);
      navigate('/login', { replace: true });
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    try {
      Swal.fire({
        title: 'Memuat Ulang Data...',
        text: 'Membersihkan cache lokal dan mengambil konfigurasi Hero, Pop-up & Database terbaru.',
        icon: 'info',
        showConfirmButton: false,
        timer: 1200,
        background: '#0F172A',
        color: '#fff',
        customClass: {
          container: 'z-[9999999]'
        }
      });
      await forceRefreshSiteSettings();
    } catch (err) {
      console.error('Refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const userRole = session?.user?.user_metadata?.role || (() => {
    try {
      const raw = localStorage.getItem('local_admin_session');
      if (raw) return JSON.parse(raw)?.user?.user_metadata?.role || 'admin';
    } catch (e) {}
    return 'admin';
  })();
  const isAdmin = userRole === 'admin';

  // Initialize navData immediately with DEFAULT_NAV_ITEMS or cached items to avoid empty flicker
  const [navData, setNavData] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('site_setting_navbar_items');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        if (parsed?.items && Array.isArray(parsed.items) && parsed.items.length > 0) return parsed.items;
      }
    } catch (e) {}
    return DEFAULT_NAV_ITEMS;
  });

  const [branding, setBranding] = useState({
    logo_url: '/logo_pb_bilibili_162.svg', 
    brand_name_main: 'PB Bilibili',
    brand_name_accent: '162',
    default_lang: 'ID'
  });

  // --- FETCH DATA NAVIGASI ---
  const fetchNavSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('navbar_settings')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (!error && data && Array.isArray(data) && data.length > 0) {
        setNavData(data);
        try {
          localStorage.setItem('site_setting_navbar_items', JSON.stringify(data));
        } catch (e) {}
        return;
      }

      // Check site_settings fallback
      const { data: siteData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'navbar_items')
        .maybeSingle();

      if (siteData && siteData.value) {
        const val = typeof siteData.value === 'string' ? JSON.parse(siteData.value) : siteData.value;
        const list = Array.isArray(val) ? val : val?.items;
        if (Array.isArray(list) && list.length > 0) {
          setNavData(list);
          try {
            localStorage.setItem('site_setting_navbar_items', JSON.stringify(list));
          } catch (e) {}
          return;
        }
      }

      // Default core menu structure fallback
      setNavData(DEFAULT_NAV_ITEMS);
    } catch (err) {
      console.warn("Fetch Nav Error:", err);
      setNavData(DEFAULT_NAV_ITEMS);
    }
  }, []);

  const fetchBrandingSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'navbar_branding')
        .maybeSingle(); 
      if (!error && data && data.value) {
        const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setBranding({
          logo_url: val.logo_url || '/logo_pb_bilibili_162.svg',
          brand_name_main: val.brand_name_main || 'PB Bilibili',
          brand_name_accent: val.brand_name_accent || '162',
          default_lang: val.default_lang || 'ID'
        });
        if (val.default_lang) setCurrentLang(val.default_lang);
      }
    } catch (err) {
      console.warn("Error fetching branding:", err);
    }
  }, []);

  useEffect(() => {
    fetchNavSettings();
    fetchBrandingSettings();

    const channel = supabase
      .channel('navbar_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (payload.new && (payload.new.key === 'navbar_branding' || payload.new.key === 'navbar_items')) {
          if (payload.new.key === 'navbar_branding' && payload.new.value) {
            const val = typeof payload.new.value === 'string' ? JSON.parse(payload.new.value) : payload.new.value;
            setBranding({
              logo_url: val.logo_url || '/logo_pb_bilibili_162.svg',
              brand_name_main: val.brand_name_main || 'PB Bilibili',
              brand_name_accent: val.brand_name_accent || '162',
              default_lang: val.default_lang || 'ID'
            });
            if (val.default_lang) setCurrentLang(val.default_lang);
          } else {
            fetchNavSettings();
          }
        } else {
          fetchNavSettings();
          fetchBrandingSettings();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navbar_settings' }, () => {
        fetchNavSettings();
      })
      .subscribe();

    const handleCustomEvent = (e: any) => {
      if (e.detail?.key === 'navbar_branding') {
        const val = e.detail.value;
        if (val) {
          setBranding({
            logo_url: val.logo_url || '/logo_pb_bilibili_162.svg',
            brand_name_main: val.brand_name_main || 'PB Bilibili',
            brand_name_accent: val.brand_name_accent || '162',
            default_lang: val.default_lang || 'ID'
          });
          if (val.default_lang) setCurrentLang(val.default_lang);
        }
      } else if (e.detail?.key === 'navbar_items') {
        fetchNavSettings();
      }
    };

    window.addEventListener('site_setting_updated', handleCustomEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('site_setting_updated', handleCustomEvent);
    };
  }, [fetchNavSettings, fetchBrandingSettings]);

  const getSubMenus = (parentId: string) => {
    const parentItem = navData.find(i => i.id === parentId || i.path === parentId || i.label?.toLowerCase() === parentId.toLowerCase());
    const list = navData.filter(item => {
      if (!item || !item.parent_id || item.parent_id === 'none' || item.parent_id === '') return false;
      if (item.parent_id === parentId) return true;
      if (parentItem) {
        if (item.parent_id === parentItem.id) return true;
        if (item.parent_id === parentItem.path) return true;
        if (item.parent_id.toLowerCase() === (parentItem.path || '').toLowerCase()) return true;
        if (item.parent_id.toLowerCase() === (parentItem.label || '').toLowerCase()) return true;
      }
      return false;
    }).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    // Special fallback: Ensure Atlet submenu is always populated
    if (list.length === 0 && parentItem && (parentItem.path === 'atlet' || parentItem.label?.toLowerCase() === 'atlet')) {
      return ATLET_DEFAULT_SUBMENUS;
    }

    return list;
  };

  // Helper function to get an appropriate icon for any menu item
  const getMenuIcon = (pathStr: string, labelStr: string) => {
    const p = (pathStr || '').toLowerCase();
    const l = (labelStr || '').toLowerCase();

    if (p === 'home' || l.includes('beranda')) return <Globe size={14} className="text-blue-400 shrink-0" />;
    if (p.includes('jadwal') || l.includes('jadwal')) return <Timer size={14} className="text-amber-400 shrink-0" />;
    if (p.includes('tentang') || p === 'about' || l.includes('tentang')) return <Shield size={14} className="text-indigo-400 shrink-0" />;
    if (p.includes('info') || l.includes('informasi')) return <Radio size={14} className="text-cyan-400 shrink-0" />;
    if (p.includes('atlet') || l.includes('atlet') || p === 'pemain') return <Users size={14} className="text-emerald-400 shrink-0" />;
    if (p === 'semua' || l.includes('semua')) return <Users size={13} className="text-blue-400 shrink-0" />;
    if (p === 'senior' || l.includes('senior')) return <Award size={13} className="text-amber-400 shrink-0" />;
    if (p === 'muda' || l.includes('muda') || l.includes('taruna')) return <Sparkles size={13} className="text-emerald-400 shrink-0" />;
    if (p === 'register' || l.includes('pendaftaran') || l.includes('daftar')) return <UserPlus size={13} className="text-cyan-400 shrink-0" />;
    if (p.includes('peringkat') || p.includes('rank') || l.includes('peringkat') || l.includes('ranking')) return <Trophy size={14} className="text-yellow-400 shrink-0" />;
    if (p.includes('galeri') || p.includes('gallery') || l.includes('galeri')) return <ImageIcon size={14} className="text-purple-400 shrink-0" />;
    if (p.includes('berita') || l.includes('berita')) return <Newspaper size={14} className="text-blue-400 shrink-0" />;
    if (p.includes('prestasi') || l.includes('prestasi')) return <Award size={14} className="text-amber-400 shrink-0" />;
    if (p.includes('sejarah') || l.includes('sejarah')) return <Info size={14} className="text-sky-400 shrink-0" />;
    if (p.includes('visi') || l.includes('visi')) return <Target size={14} className="text-rose-400 shrink-0" />;
    if (p.includes('fasilitas') || l.includes('fasilitas')) return <Building2 size={14} className="text-emerald-400 shrink-0" />;
    if (p.includes('struktur') || l.includes('struktur')) return <Users size={14} className="text-blue-400 shrink-0" />;
    if (p.includes('dokumen') || l.includes('dokumen')) return <FileText size={14} className="text-indigo-400 shrink-0" />;
    if (p.includes('quiz') || l.includes('quiz')) return <BrainCircuit size={14} className="text-pink-400 shrink-0" />;
    if (p.includes('contact') || p.includes('kontak') || l.includes('hubungi')) return <MapPin size={14} className="text-blue-500 shrink-0" />;
    if (p.includes('faq') || l.includes('faq')) return <HelpCircle size={14} className="text-cyan-400 shrink-0" />;

    return <Sparkles size={14} className="text-blue-400 shrink-0" />;
  };

  // --- PERBAIKAN LOGIKA NAVIGASI ---
  const handleNavClick = (path: string, subPath?: string) => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);

    const mainTarget = (path || '').toLowerCase().trim();
    const subTarget = (subPath || '').toLowerCase().trim();

    // 1. Home
    if (mainTarget === 'home' || mainTarget === '/' || mainTarget === 'beranda' || (!mainTarget && !subTarget)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onNavigate('home');
      return;
    }

    // 2. Jadwal Latihan
    if (mainTarget === 'jadwal' || mainTarget === 'jadwal-latihan' || mainTarget === 'schedule' || mainTarget.includes('jadwal')) {
      onNavigate('jadwal');
      window.dispatchEvent(new Event('pb-open-schedule'));
      return;
    }

    // 3. FAQ
    if (mainTarget === 'faq') {
      onNavigate('faq');
      return;
    }

    // 4. Hubungi Kami / Contact
    if (mainTarget === 'contact' || mainTarget === 'kontak' || mainTarget === 'hubungi-kami') {
      onNavigate('contact');
      scrollToSection('contact-section');
      return;
    }

    // 5. Berita
    if (mainTarget === 'berita' || mainTarget === 'news' || mainTarget.includes('berita')) {
      onNavigate('berita');
      return;
    }

    // 6. Prestasi
    if (mainTarget === 'prestasi') {
      onNavigate('prestasi');
      return;
    }

    // 7. Peringkat / Ranking
    if (mainTarget === 'peringkat' || mainTarget === 'rankings' || mainTarget === 'ranking') {
      onNavigate('peringkat');
      scrollToSection('peringkat-section');
      return;
    }

    // 8. Quiz
    if (mainTarget === 'quiz') {
      onNavigate('quiz');
      scrollToSection('quiz-section');
      return;
    }

    // 9. Galeri / Gallery
    if (mainTarget === 'gallery' || mainTarget === 'galeri') {
      onNavigate('galeri');
      return;
    }

    // 10. Atlet & Atlet Submenus
    if (mainTarget === 'atlet' || mainTarget === 'players' || mainTarget === 'pemain' || subTarget === 'semua' || subTarget === 'senior' || subTarget === 'muda') {
      if (subTarget === 'register' || subTarget === 'pendaftaran') {
        onNavigate('register');
        return;
      }
      if (subTarget === 'peringkat' || subTarget === 'rankings') {
        onNavigate('peringkat');
        return;
      }
      onNavigate('atlet', subPath || (['semua', 'senior', 'muda'].includes(mainTarget) ? mainTarget : 'Semua'));
      scrollToSection('atlet-section');
      return;
    }

    // 11. Register / Pendaftaran
    if (mainTarget === 'register' || mainTarget === 'pendaftaran') {
      onNavigate('register');
      return;
    }

    // 12. Sejarah
    if (mainTarget === 'sejarah') {
      onNavigate('sejarah');
      return;
    }

    // 13. Visi Misi
    if (mainTarget === 'visi-misi' || mainTarget === 'visi' || mainTarget === 'misi') {
      onNavigate('visi-misi');
      return;
    }

    // 14. Fasilitas
    if (mainTarget === 'fasilitas') {
      onNavigate('fasilitas');
      return;
    }

    // 15. Struktur Organisasi
    if (mainTarget === 'struktur-organisasi' || mainTarget === 'struktur') {
      onNavigate('struktur-organisasi');
      return;
    }

    // 16. Dokumen Penting
    if (mainTarget === 'dokumen-penting' || mainTarget === 'dokumen' || mainTarget === 'documents') {
      onNavigate('dokumen-penting');
      scrollToSection('dokumen-section');
      return;
    }

    // 17. Inventaris
    if (mainTarget === 'inventaris') {
      onNavigate('inventaris');
      return;
    }

    // 18. Tentang Kami / About
    if (mainTarget === 'tentang-kami' || mainTarget === 'about' || mainTarget === 'tentang') {
      if (subTarget) {
        onNavigate(subTarget);
      } else {
        onNavigate('tentang-kami');
      }
      return;
    }

    onNavigate(subTarget || mainTarget);
  };

  const scrollToSection = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        const offset = 100;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
      }
    }, 150);
  };

  return (
    <>
      <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-md text-white border-b border-white/10 shadow-2xl transition-all duration-300 overflow-visible h-14 lg:h-16 z-[10000]">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-4 md:px-8 h-14 lg:h-16 flex justify-between items-center overflow-visible">
          
          {/* LEFT WING: LOGO, BRAND, & REAL-TIME CLOCK */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-visible shrink-0 min-w-0">
            {/* LOGO */}
            <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group shrink-0" onClick={() => handleNavClick('home')}>
              <div className="relative w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11 flex items-center justify-center shrink-0">
                <img 
                  src={branding.logo_url || "/logo_pb_bilibili_162.svg"} 
                  alt="Logo PB Bilibili 162" 
                  className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300" 
                  loading="lazy" 
                  decoding="async" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "/logo_pb_bilibili_162.svg";
                  }}
                />
              </div>
              <div className="flex flex-col justify-center shrink-0 min-w-0">
                <div className="flex items-center gap-1 leading-none mb-0.5 whitespace-nowrap">
                  <span className="font-black text-[11px] sm:text-sm lg:text-[15px] xl:text-lg tracking-tighter uppercase italic text-white leading-none whitespace-nowrap">{branding.brand_name_main}</span>
                  <span className="font-black text-[11px] sm:text-sm lg:text-[15px] xl:text-lg tracking-tighter uppercase italic text-blue-500 leading-none whitespace-nowrap">{branding.brand_name_accent}</span>
                </div>
                <span className="text-[5px] sm:text-[6.5px] lg:text-[7.5px] text-slate-400 font-bold tracking-[0.12em] sm:tracking-[0.2em] uppercase leading-none whitespace-nowrap">Professional Club</span>
              </div>
            </div>

            {/* REAL-TIME DIGITAL CLOCK (ISOLATED TO PREVENT NAVBAR RE-RENDERS) */}
            <LiveClock />
          </div>

          {/* DESKTOP NAV (Optimized gaps for different screen sizes) */}
          <div className="hidden lg:flex items-center lg:gap-2.5 xl:gap-6.5 overflow-visible">
            {navData.filter(isTopLevelMenuItem).sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).map((menu, index, arr) => {
              const subMenus = getSubMenus(menu.id);
              const isDropdown = menu.type === 'dropdown' || subMenus.length > 0;
              const isLastFew = index >= Math.floor(arr.length / 2);
              return (
                <div 
                  key={menu.id} 
                  className="relative h-14 lg:h-16 flex items-center overflow-visible"
                  onMouseEnter={() => isDropdown && setActiveDropdown(menu.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button 
                    onClick={() => !isDropdown && handleNavClick(menu.path)}
                    className={`nav-link flex items-center gap-1 ${activeDropdown === menu.id ? 'text-blue-400' : ''} ${(menu.path === 'jadwal' || menu.path === 'jadwal-latihan') ? 'text-amber-400 hover:text-amber-300 font-semibold' : ''}`}
                  >
                    {(menu.path === 'jadwal' || menu.path === 'jadwal-latihan') && <Timer size={11} className="mr-0.5 text-amber-400" />}
                    {menu.label} 
                    {isDropdown && <ChevronDown size={10} className={`transition-transform duration-300 ${activeDropdown === menu.id ? 'rotate-180' : ''}`} />}
                  </button>

                  {isDropdown && activeDropdown === menu.id && (
                    <div className={`dropdown-container animate-in fade-in slide-in-from-top-2 duration-200 ${isLastFew ? 'right-0' : 'left-0'}`}>
                      <div className="dropdown-content">
                        {subMenus.map((sub) => (
                           <button 
                            key={sub.id} 
                            onClick={() => handleNavClick(menu.path, sub.path)} 
                            className="dropdown-item flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              {getMenuIcon(sub.path, sub.label)}
                              {sub.label}
                            </span>
                            {sub.path === 'dokumen-penting' && <FileText size={13} className="text-blue-500 opacity-80" />}
                            {sub.path === 'peringkat' && <Trophy size={13} className="text-yellow-500 opacity-80" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* KONTAK */}
            <div className="relative h-14 lg:h-16 flex items-center overflow-visible" onMouseEnter={() => setActiveDropdown('contact-action')} onMouseLeave={() => setActiveDropdown(null)}>
              <button className="px-2.5 py-1.5 lg:px-3 lg:py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-[9.5px] lg:text-[10px] xl:text-[11.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:scale-95 cursor-pointer">
                <MapPin size={11} /> <span className="whitespace-nowrap">Kontak</span> <ChevronDown size={10} className={activeDropdown === 'contact-action' ? 'rotate-180' : ''} />
              </button>
              {activeDropdown === 'contact-action' && (
                <div className="dropdown-container right-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="dropdown-content">
                    <button onClick={() => handleNavClick('contact')} className="dropdown-item flex items-center gap-3">
                      <MapPin size={14} className="text-blue-400" /> Hubungi Kami
                    </button>
                    <button onClick={() => handleNavClick('faq')} className="dropdown-item flex items-center gap-3">
                      <HelpCircle size={14} className="text-blue-400" /> FAQ
                    </button>
                    <button onClick={() => handleNavClick('register')} className="dropdown-item flex items-center gap-3 bg-blue-600/5 group">
                      <UserPlus size={14} className="text-blue-600 group-hover:text-white" /> 
                      <span className="text-blue-500 group-hover:text-white">Pendaftaran</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* LOGIN / DASHBOARD & LOGOUT DEDICATED BUTTONS */}
            {session ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button 
                  type="button"
                  onClick={() => navigate('/admin/dashboard')}
                  className="px-3 py-1.5 lg:px-3.5 lg:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-[9.5px] lg:text-[10px] xl:text-[11.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-white shrink-0"
                  title="Masuk ke Panel Dashboard"
                >
                  <LayoutDashboard size={13} />
                  <span className="whitespace-nowrap">{isAdmin ? 'Dashboard Admin' : 'Dashboard Anggota'}</span>
                </button>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="px-2.5 py-1.5 lg:px-3 lg:py-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 hover:border-red-600 rounded-full text-[9.5px] lg:text-[10px] xl:text-[11.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer shrink-0"
                  title="Keluar Sesi"
                >
                  <LogOut size={13} />
                  <span className="whitespace-nowrap hidden xl:inline">Keluar</span>
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => navigate('/login')}
                className="px-3 py-1.5 lg:px-3.5 lg:py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-blue-500/50 rounded-full text-[9.5px] lg:text-[10px] xl:text-[11.5px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-black/40 hover:-translate-y-0.5 active:scale-95 cursor-pointer text-slate-200 hover:text-white shrink-0"
                title="Login Anggota & Admin"
              >
                <LogIn size={13} className="text-blue-400" />
                <span className="whitespace-nowrap">Login</span>
              </button>
            )}
          </div>

          {/* MODERN, SLEEK, AND HIGH-PERFORMANCE MOBILE MENU TRIGGER BUTTON */}
          <button 
            type="button"
            id="mobile-sidebar-toggle-btn"
            onClick={() => setIsMobileMenuOpen(prev => !prev)}
            aria-label={isMobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={isMobileMenuOpen}
            className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-slate-800/90 to-slate-900/95 hover:from-slate-700 hover:to-slate-800 active:scale-95 border border-white/15 text-slate-200 hover:text-white shadow-lg shadow-black/50 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 shrink-0"
          >
            <div className="w-5 h-4 flex flex-col justify-between items-center relative pointer-events-none">
              <span className={`h-0.5 w-5 bg-gradient-to-r from-blue-400 to-blue-200 rounded-full transition-all duration-300 transform origin-center ${isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`h-0.5 w-3.5 bg-slate-300 rounded-full transition-all duration-200 self-end ${isMobileMenuOpen ? 'opacity-0 scale-x-0' : 'opacity-100'}`} />
              <span className={`h-0.5 w-5 bg-gradient-to-r from-blue-400 to-blue-200 rounded-full transition-all duration-300 transform origin-center ${isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </div>
          </button>
        </div>

        <style>{`
          .nav-link { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; cursor: pointer; position: relative; transition: all 0.25s ease; white-space: nowrap; }
          @media (min-width: 1024px) {
            .nav-link { font-size: 10px; letter-spacing: 0.04em; color: #94a3b8; }
          }
          @media (min-width: 1280px) {
            .nav-link { font-size: 12.5px; letter-spacing: 0.06em; color: #94a3b8; }
          }
          .nav-link:hover { color: #ffffff; }
          .nav-link::after { content: ''; position: absolute; bottom: -6px; left: 50%; width: 0; height: 2px; background: #3b82f6; transition: all 0.25s ease; transform: translateX(-50%); }
          .nav-link:hover::after { width: 100%; }
          .dropdown-container { position: absolute; top: 100%; width: 16rem; padding-top: 0.5rem; z-index: 50000; }
          .dropdown-content { background: rgba(15, 23, 42, 0.98); border: 1px solid rgba(255,255,255,0.08); border-radius: 0.75rem; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(12px); }
          .dropdown-item { width: 100%; text-align: left; padding: 0.85rem 1.25rem; font-size: 13.5px; font-weight: 500; text-transform: none; color: #cbd5e1; background: none; border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s ease-in-out; }
          .dropdown-item:last-child { border-bottom: none; }
          .dropdown-item:hover { background: rgba(59, 130, 246, 0.1); color: #60a5fa; padding-left: 1.5rem; }
          .mobile-nav-link { font-size: 14px; font-weight: 600; text-transform: uppercase; color: #f8fafc; }
          .mobile-sub-link { text-align: left; font-size: 13.5px; font-weight: 500; color: #94a3b8; text-transform: none; padding: 6px 0; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideInFromTop { from { transform: translateY(-10px); } to { transform: translateY(0); } }
          .animate-in { animation: fadeIn 0.2s ease-out, slideInFromTop 0.2s ease-out; }
        `}</style>
      </nav>

      {/* MOBILE MENU BACKDROP (GPU PRE-RENDERED FOR ZERO-LATENCY 0ms APPEARANCE) */}
      <div 
        className={`lg:hidden fixed inset-0 z-[999998] bg-black/70 backdrop-blur-xs transition-opacity duration-200 ease-out cursor-pointer ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden={!isMobileMenuOpen}
      />
      
      {/* MOBILE DRAWER PANEL (HARDWARE ACCELERATED 60FPS TRANSLATE) */}
      <div 
        className={`lg:hidden fixed inset-y-0 left-0 w-[285px] sm:w-[310px] max-w-[85vw] h-[100dvh] z-[999999] bg-[#0b1224] border-r border-white/10 flex flex-col justify-between overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-transform duration-250 cubic-bezier(0.16, 1, 0.3, 1) will-change-transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu Navigasi Mobile"
      >
        {/* LOGO & BRANDING HEADER SECTION */}
        <div className="flex items-center justify-between py-3 px-3.5 border-b border-white/10 shrink-0 bg-[#070d1a]/90 relative">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Logo Container */}
            <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
              <img 
                src={branding.logo_url || "/logo_pb_bilibili_162.svg"} 
                alt="Logo PB Bilibili 162" 
                className="w-full h-full object-contain filter drop-shadow-md" 
                loading="lazy" 
                decoding="async" 
                onError={(e) => {
                  e.currentTarget.src = "/logo_pb_bilibili_162.svg";
                }}
              />
            </div>
            <div className="min-w-0 flex flex-col">
              <h3 className="font-black text-xs tracking-tighter uppercase italic text-white leading-tight truncate">
                {branding.brand_name_main} <span className="text-blue-500">{branding.brand_name_accent}</span>
              </h3>
              <span className="text-[6.5px] text-slate-400 font-bold tracking-[0.15em] uppercase leading-none mt-0.5 block truncate">
                Professional Club
              </span>
            </div>
          </div>

          {/* Close Arrow Button */}
          <button 
            type="button"
            onClick={() => setIsMobileMenuOpen(false)} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center shrink-0 ml-1 cursor-pointer border border-white/10"
            title="Tutup Menu"
            aria-label="Tutup Menu"
          >
            <X size={17} />
          </button>
        </div>

        {/* SCROLLABLE MENU ITEMS LIST */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-2.5 space-y-1 flex flex-col justify-start">
          {navData
            .filter(isTopLevelMenuItem)
            .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
            .map((menu) => {
              const subMenus = getSubMenus(menu.id);
              const isDropdown = menu.type === 'dropdown' || subMenus.length > 0 || menu.path === 'atlet' || menu.label?.toLowerCase() === 'atlet';
              const isExpanded = activeDropdown === menu.id || (activeDropdown === 'atlet' && (menu.path === 'atlet' || menu.label?.toLowerCase() === 'atlet'));
              return (
                <div key={menu.id} className="rounded-xl overflow-hidden transition-colors">
                  <button 
                    type="button"
                    onClick={() => {
                      if (isDropdown) {
                        const targetId = menu.id || menu.path;
                        setActiveDropdown(activeDropdown === targetId ? null : targetId);
                      } else {
                        handleNavClick(menu.path);
                      }
                    }}
                    className={`flex justify-between items-center w-full px-3 py-2.5 text-[11.5px] font-bold tracking-wider uppercase rounded-xl text-slate-200 hover:bg-blue-600/15 hover:text-blue-400 transition-all duration-150 text-left cursor-pointer ${
                      isExpanded ? 'bg-blue-600/15 text-blue-400' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {getMenuIcon(menu.path, menu.label)}
                      <span>{menu.label}</span>
                    </span>
                    {isDropdown && (
                      <ChevronDown 
                        size={14} 
                        className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} 
                      />
                    )}
                  </button>
                  
                  {isDropdown && isExpanded && (
                    <div className="bg-[#070c18]/90 border-l-2 border-blue-500 my-1 ml-2.5 pl-2.5 pr-1 flex flex-col py-1.5 gap-1 rounded-r-xl">
                      {subMenus.map((sub) => (
                        <button 
                          key={sub.id} 
                          type="button"
                          onClick={() => {
                            handleNavClick(menu.path, sub.path);
                          }} 
                          className="text-left py-2 px-2.5 text-[11px] font-semibold tracking-wider uppercase text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center justify-between cursor-pointer group"
                        >
                          <span className="flex items-center gap-2">
                            {getMenuIcon(sub.path, sub.label)}
                            <span className="group-hover:text-blue-300 transition-colors">{sub.label}</span>
                          </span>
                          {sub.path === 'peringkat' && <Trophy size={11} className="text-yellow-500 shrink-0" />}
                          {sub.path === 'dokumen-penting' && <FileText size={11} className="text-blue-500 shrink-0" />}
                          {(sub.path === 'Senior' || sub.path === 'Muda') && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
                              Kategori
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

          {/* Hubungi Kami Item (if not present in navData) */}
          {!navData.some(item => isTopLevelMenuItem(item) && (item.path === 'contact' || item.label?.toLowerCase().includes('hubungi'))) && (
            <div>
              <button 
                type="button"
                onClick={() => handleNavClick('contact')}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11.5px] font-bold tracking-wider uppercase text-slate-200 hover:bg-blue-600/15 hover:text-blue-400 rounded-xl transition-all duration-150 text-left cursor-pointer"
              >
                <MapPin size={14} className="text-blue-500 shrink-0" />
                <span>Hubungi Kami</span>
              </button>
            </div>
          )}

          {/* FAQ Item (if not present in navData) */}
          {!navData.some(item => isTopLevelMenuItem(item) && (item.path === 'faq' || item.label?.toLowerCase() === 'faq')) && (
            <div>
              <button 
                type="button"
                onClick={() => handleNavClick('faq')}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11.5px] font-bold tracking-wider uppercase text-slate-200 hover:bg-blue-600/15 hover:text-blue-400 rounded-xl transition-all duration-150 text-left cursor-pointer"
              >
                <HelpCircle size={14} className="text-cyan-400 shrink-0" />
                <span>FAQ</span>
              </button>
            </div>
          )}

          {/* Portal Login / Dashboard Item for Mobile */}
          <div className="pt-2.5 border-t border-slate-800/80 mt-1">
            {session ? (
              <div className="space-y-1.5">
                <button 
                  type="button"
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/admin/dashboard'); }}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-xl transition-all duration-150 text-left border border-emerald-500/20 cursor-pointer"
                >
                  <LayoutDashboard size={14} className="text-emerald-400 shrink-0" />
                  <span>{isAdmin ? 'Dashboard Admin' : 'Dashboard Anggota'}</span>
                </button>
                <button 
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-all duration-150 text-left border border-red-500/20 cursor-pointer"
                >
                  <LogOut size={14} className="text-red-400 shrink-0" />
                  <span>Keluar Sesi</span>
                </button>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11px] font-bold tracking-wider uppercase text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all duration-150 text-left border border-blue-500/20 cursor-pointer"
              >
                <LogIn size={14} className="text-blue-400 shrink-0" />
                <span>Portal Login</span>
              </button>
            )}
          </div>
        </div>

        {/* DRAWER FOOTER SECTION: HIGHLIGHT BLOCK & SOCIAL MEDIA */}
        <div className="p-3 border-t border-white/10 bg-[#070d1a] shrink-0 flex flex-col gap-2.5">
          {/* LIVESIGNAL/REGISTRATION HIGHLIGHT BLOCK */}
          <button 
            type="button"
            onClick={() => handleNavClick('register')}
            className="flex items-center gap-3 bg-[#151d30]/80 border border-white/10 hover:border-blue-500/50 p-2.5 rounded-xl text-left transition-all hover:bg-blue-600/15 group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
              <Radio size={15} className="animate-pulse" />
            </div>
            <div className="flex flex-col justify-center leading-tight min-w-0">
              <span className="text-[8px] font-black tracking-widest text-blue-400 group-hover:text-blue-300 uppercase">Pendaftaran</span>
              <span className="text-[10.5px] font-bold text-white uppercase mt-0.5 tracking-wider truncate">Gabung Atlet Baru</span>
            </div>
          </button>

          {/* SOCIAL MEDIA ICONS */}
          <div className="flex items-center justify-center gap-5 pt-1">
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="YouTube">
              <Youtube size={16} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Instagram">
              <Instagram size={16} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Facebook">
              <Facebook size={16} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Twitter">
              <Twitter size={16} />
            </a>
          </div>
        </div>

      </div>
    </>
  );
}
