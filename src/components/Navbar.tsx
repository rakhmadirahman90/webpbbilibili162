import React, { useState, useEffect, useCallback } from 'react';
import { Globe, ChevronDown, Menu, X, MapPin, UserPlus, Wallet, FileText, Trophy, BrainCircuit } from 'lucide-react';
import { supabase } from '../supabase'; 

interface NavbarProps {
  onNavigate: (sectionId: string, tabId?: string) => void;
}

export default function Navbar({ onNavigate }: NavbarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState('ID');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [navData, setNavData] = useState<any[]>([]);
  const [branding, setBranding] = useState({
    logo_url: '/photo_2026-02-03_00-32-07.jpg', 
    brand_name_main: 'US 162',
    brand_name_accent: 'BILIBILI',
    default_lang: 'ID'
  });

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

  // --- FETCH DATA NAVIGASI ---
  const fetchNavSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('navbar_settings')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;

      let finalNav = data || [];

      if (finalNav.length === 0) {
        finalNav = [
          { id: '1', label: 'Home', path: 'home', type: 'link', order_index: 0 },
          { id: '2', label: 'Tentang Kami', path: 'tentang-kami', type: 'dropdown', order_index: 1 },
          { id: '3', label: 'Berita', path: 'berita', type: 'link', order_index: 2 },
          { id: '4', label: 'Peringkat', path: 'peringkat', type: 'dropdown', order_index: 3 },
          { id: '5', label: 'Kas', path: 'kas', type: 'link', order_index: 4 },
          { id: '2-1', parent_id: '2', label: 'Sejarah', path: 'sejarah' },
          { id: '2-2', parent_id: '2', label: 'Visi Misi', path: 'visi-misi' },
          { id: '2-3', parent_id: '2', label: 'Fasilitas', path: 'fasilitas' },
          { id: '2-4', parent_id: '2', label: 'Dokumen Penting', path: 'dokumen-penting' },
          { id: '4-1', parent_id: '4', label: 'Ranking Atlet', path: 'peringkat' },
          { id: '4-2', parent_id: '4', label: 'Quiz Badminton', path: 'quiz' }
        ];
      } else {
        // Logika penyisipan menu dinamis agar tetap muncul meski di DB belum ada
        const hasKas = finalNav.some((item: any) => item.path === 'kas');
        if (!hasKas) {
          finalNav.push({ id: 'kas-dynamic', label: 'Kas', path: 'kas', type: 'link', order_index: 98 });
        }
        
        const parentTentang = finalNav.find((item: any) => 
          item.path === 'tentang-kami' || item.label.toLowerCase().includes('tentang')
        );
        const hasDocs = finalNav.some((item: any) => item.path === 'dokumen-penting');
        if (!hasDocs && parentTentang) {
          finalNav.push({ id: 'docs-dynamic', parent_id: parentTentang.id, label: 'Dokumen Penting', path: 'dokumen-penting' });
        }

        let parentRanking = finalNav.find((item: any) => 
          item.path === 'peringkat' || item.path === 'ranking' || item.label.toLowerCase().includes('peringkat')
        );

        if (parentRanking) {
          parentRanking.type = 'dropdown';
          const hasQuiz = finalNav.some((item: any) => item.path === 'quiz');
          if (!hasQuiz) {
            finalNav.push({ id: 'quiz-dynamic', parent_id: parentRanking.id, label: 'Quiz Badminton', path: 'quiz', order_index: 99 });
          }
          const hasRankingSub = finalNav.some((item: any) => item.parent_id === parentRanking?.id && item.path === 'peringkat');
          if (!hasRankingSub) {
            finalNav.push({ id: 'ranking-sub-dynamic', parent_id: parentRanking.id, label: 'Ranking Atlet', path: 'peringkat', order_index: 1 });
          }
        }
      }
      setNavData(finalNav);
    } catch (err) {
      console.warn("Fetch Nav Error:", err);
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
          logo_url: val.logo_url || '/photo_2026-02-03_00-32-07.jpg',
          brand_name_main: val.brand_name_main || 'US 162',
          brand_name_accent: val.brand_name_accent || 'BILIBILI',
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
  }, [fetchNavSettings, fetchBrandingSettings]);

  const getSubMenus = (parentId: string) => {
    return navData.filter(item => item.parent_id === parentId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  };

  // --- PERBAIKAN LOGIKA NAVIGASI ---
  const handleNavClick = (path: string, subPath?: string) => {
    setActiveDropdown(null);
    setIsMobileMenuOpen(false);

    // 1. Home
    if (path === 'home' || path === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      onNavigate('home');
      return;
    }

    // 2. Kas
    if (path === 'kas') {
      onNavigate('kas');
      scrollToSection('kas-section');
      return;
    }

    // 3. Quiz Badminton
    if (subPath === 'quiz' || path === 'quiz') {
      onNavigate('quiz');
      scrollToSection('quiz-section'); // Mengarah ke id="quiz-section"
      return;
    }

    // 4. Ranking Atlet (Peringkat)
    if (subPath === 'peringkat' || path === 'peringkat') {
      onNavigate('peringkat');
      scrollToSection('peringkat-section'); // Mengarah ke id="peringkat-section"
      return;
    }

    // 5. Dokumen Penting
    if (subPath === 'dokumen-penting' || path === 'dokumen-penting') {
      onNavigate('dokumen-penting');
      scrollToSection('dokumen-section');
      return;
    }

    // 6. Tentang Kami
    if (path === 'tentang-kami' || path === 'about') {
      onNavigate('tentang-kami', subPath);
      scrollToSection('tentang-kami');
      return;
    }

    onNavigate(path, subPath);
    scrollToSection(subPath || path);
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
      <nav className="fixed top-0 w-full bg-slate-900/95 backdrop-blur-md text-white border-b border-white/10 shadow-2xl transition-all duration-300 overflow-visible h-14 md:h-16 z-[10000]">
        <div className="max-w-7xl mx-auto px-6 h-14 md:h-16 flex justify-between items-center overflow-visible">
          
          {/* LEFT WING: LOGO, BRAND, & REAL-TIME CLOCK */}
          <div className="flex items-center gap-2 sm:gap-4 overflow-visible">
            {/* LOGO */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group" onClick={() => handleNavClick('home')}>
              <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 border border-white/30 rounded-full group-hover:border-blue-500/50 transition-colors duration-300"></div>
                <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-white flex items-center justify-center transition-transform duration-500 group-hover:scale-105 shadow-inner">
                  <img src={branding.logo_url} alt="Logo" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1 sm:gap-1.5 leading-none mb-0.5 sm:mb-1">
                  <span className="font-black text-sm sm:text-lg md:text-xl tracking-tighter uppercase italic text-white leading-none">{branding.brand_name_main}</span>
                  <span className="font-black text-sm sm:text-lg md:text-xl tracking-tighter uppercase italic text-blue-500 leading-none">{branding.brand_name_accent}</span>
                </div>
                <span className="text-[5.5px] sm:text-[7.5px] md:text-[8px] text-slate-400 font-bold tracking-[0.15em] sm:tracking-[0.25em] uppercase leading-none">Professional Club</span>
              </div>
            </div>

            {/* REAL-TIME DIGITAL CLOCK WITH NEON STATUS DOT */}
            <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 bg-[#151d30]/60 border border-white/10 rounded-full backdrop-blur-md shadow-inner shrink-0 select-none">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[10px] md:text-xs font-mono font-bold tracking-wider text-slate-300 leading-none">
                <span className="hidden sm:inline opacity-80">{dt.dayName}, {dt.dateStr}</span>
                <span className="sm:hidden opacity-80">{dt.shortDate}</span>
                <span className="opacity-40">•</span>
                <span className="text-blue-400 font-extrabold tracking-widest">{dt.timeStr}</span>
              </div>
            </div>
          </div>

          {/* DESKTOP NAV */}
          <div className="hidden md:flex items-center gap-8 overflow-visible">
            {navData.filter(item => !item.parent_id).sort((a, b) => a.order_index - b.order_index).map((menu, index, arr) => {
              const subMenus = getSubMenus(menu.id);
              const isDropdown = menu.type === 'dropdown' || subMenus.length > 0;
              const isLastFew = index >= Math.floor(arr.length / 2);
              return (
                <div 
                  key={menu.id} 
                  className="relative h-14 md:h-16 flex items-center overflow-visible"
                  onMouseEnter={() => isDropdown && setActiveDropdown(menu.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button 
                    onClick={() => !isDropdown && handleNavClick(menu.path)}
                    className={`nav-link flex items-center gap-1.5 ${activeDropdown === menu.id ? 'text-blue-400' : ''} ${menu.path === 'kas' ? 'text-blue-400 font-semibold' : ''}`}
                  >
                    {menu.path === 'kas' && <Wallet size={13} className="mr-1" />}
                    {menu.label} 
                    {isDropdown && <ChevronDown size={11} className={`transition-transform duration-300 ${activeDropdown === menu.id ? 'rotate-180' : ''}`} />}
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
                              {sub.path === 'quiz' && <BrainCircuit size={13} className="text-blue-400" />}
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
            <div className="relative h-14 md:h-16 flex items-center overflow-visible" onMouseEnter={() => setActiveDropdown('contact-action')} onMouseLeave={() => setActiveDropdown(null)}>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-[12px] font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/20 hover:-translate-y-0.5 active:scale-95">
                <MapPin size={13} /> Kontak <ChevronDown size={11} className={activeDropdown === 'contact-action' ? 'rotate-180' : ''} />
              </button>
              {activeDropdown === 'contact-action' && (
                <div className="dropdown-container right-0 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="dropdown-content">
                    <button onClick={() => handleNavClick('contact')} className="dropdown-item flex items-center gap-3">
                      <MapPin size={14} className="text-blue-400" /> Hubungi Kami
                    </button>
                    <button onClick={() => handleNavClick('register')} className="dropdown-item flex items-center gap-3 bg-blue-600/5 group">
                      <UserPlus size={14} className="text-blue-600 group-hover:text-white" /> 
                      <span className="text-blue-500 group-hover:text-white">Pendaftaran</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MOBILE MENU TRIGGER */}
          <button className="md:hidden p-2 text-slate-300 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu size={28} />
          </button>
        </div>

        <style>{`
          .nav-link { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #cbd5e1; cursor: pointer; position: relative; transition: all 0.25s ease; }
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
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .animate-in { animation: fadeIn 0.2s ease-out, slideInFromTop 0.2s ease-out; }
          .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
          .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}</style>
      </nav>

      {/* MOBILE MENU BACKDROP AND DRAWER (Siblings to avoid backdrop-filter constraint) */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="md:hidden fixed inset-0 z-[999998] bg-slate-950/65 backdrop-blur-xs animate-fade-in cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="md:hidden fixed top-[62px] right-4 w-[230px] max-h-[calc(100vh-76px)] z-[999999] bg-[#0b1224]/98 border border-white/10 rounded-2xl flex flex-col p-3.5 overflow-y-auto shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* HEADER SECTION INSIDE OVERLAY */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
              <span className="text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase">Menu Utama</span>
              
              {/* CLOSE BUTTON */}
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="text-white hover:text-slate-300 p-1 hover:bg-white/5 rounded-full transition-all active:scale-95"
              >
                <X size={16} />
              </button>
            </div>

            {/* MENU ITEMS */}
            <div className="flex flex-col gap-2.5 mt-1">
              {navData.filter(item => !item.parent_id).sort((a, b) => a.order_index - b.order_index).map((menu) => {
                const subMenus = getSubMenus(menu.id);
                const isDropdown = menu.type === 'dropdown' || subMenus.length > 0;
                return (
                  <React.Fragment key={menu.id}>
                    <button 
                      onClick={() => !isDropdown ? handleNavClick(menu.path) : (activeDropdown === menu.id ? setActiveDropdown(null) : setActiveDropdown(menu.id))}
                      className="flex justify-between items-center w-full py-0.5 text-[12.5px] font-black italic tracking-widest uppercase text-slate-100 hover:text-blue-400 transition-colors duration-200 text-left"
                    >
                      <span>{menu.label}</span>
                      {isDropdown && <ChevronDown size={12} className={`text-slate-400 transition-transform duration-300 ${activeDropdown === menu.id ? 'rotate-180 text-blue-400' : ''}`} />}
                    </button>
                    {isDropdown && activeDropdown === menu.id && (
                      <div className="flex flex-col gap-1.5 pl-3 pr-1.5 ml-1 py-1 border-l-2 border-blue-600/20 animate-in fade-in duration-200">
                        {subMenus.map((sub) => (
                          <button 
                            key={sub.id} 
                            onClick={() => handleNavClick(menu.path, sub.path)} 
                            className="text-left py-0.5 text-[11px] font-bold italic uppercase tracking-wider text-slate-400 hover:text-white transition-colors flex items-center justify-between"
                          >
                            <span className="flex items-center gap-2">
                              {sub.path === 'quiz' && <BrainCircuit size={10} className="text-blue-400" />}
                              {sub.label}
                            </span>
                            {sub.path === 'peringkat' && <Trophy size={10} className="text-yellow-500" />}
                            {sub.path === 'dokumen-penting' && <FileText size={10} className="text-blue-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            
            {/* DIVIDER */}
            <div className="h-[1px] bg-white/10 my-2"></div>
            
            {/* CONTACT & REGISTRATION LINKS */}
            <button 
              onClick={() => handleNavClick('contact')}
              className="flex items-center gap-2 text-left py-0.5 text-slate-100 font-black italic uppercase tracking-widest text-[12px] hover:text-blue-400 transition-colors mb-1.5"
            >
              <MapPin size={12} className="text-blue-500" />
              <span>Hubungi Kami</span>
            </button>
            
            <button 
              onClick={() => handleNavClick('register')}
              className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-black uppercase italic text-[10px] tracking-[0.08em] flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-blue-600/10"
            >
              <UserPlus size={11} />
              <span>Pendaftaran Atlet</span>
            </button>
          </div>
        </>
      )}
    </>
  );
}