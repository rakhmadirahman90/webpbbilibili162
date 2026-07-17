import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; 

// --- IMPORT FALLBACK DATA ---
import popupFallback from './data/konfigurasi_popup.json';

// Import Komponen Landing Page
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SambutanKetua from './components/SambutanKetua';
import Sejarah from './components/Sejarah';
import VisiMisi from './components/VisiMisi';
import Fasilitas from './components/Fasilitas';
import News from './components/News';
import PrayerTimes from './components/PrayerTimes';
import Athletes from './components/Players'; 
import Ranking from './components/Rankings'; 
import BadmintonQuiz from './components/BadmintonQuiz'; 
import Gallery from './components/Gallery';
import RegistrationForm from './components/RegistrationForm'; 
import Contact from './components/Contact'; 
import Footer from './components/Footer';
import PublicKasView from './components/PublicKasView';
import DokumenPenting from './components/DokumenPenting'; 
import StrukturOrganisasiPublic from './components/StrukturOrganisasiPublic';

// Import Komponen Admin
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ManajemenPendaftaran from './ManajemenPendaftaran';
import AdminDashboard from './components/AdminDashboard';
import ManajemenAtlet from './ManajemenAtlet';
import AdminBerita from './components/AdminBerita';
import AdminMatch from './components/AdminMatch'; 
import AdminRanking from './components/AdminRanking'; 
import AdminGallery from './components/AdminGallery'; 
import AdminContact from './components/AdminContact'; 
import KelolaNavbar from './components/KelolaNavbar'; 
import ManajemenPoin from './components/ManajemenPoin';
import AuditLogPoin from './components/AuditLogPoin';
import AdminLaporan from './components/AdminLaporan'; 
import AdminLogs from './components/AdminLogs'; 
import AdminTampilan from './components/AdminTampilan'; 
import KelolaHero from './components/KelolaHero'; 
import AdminPopup from './components/AdminPopup'; 
import AdminFooter from './components/AdminFooter'; 
import AdminAbout from './components/AdminAbout';
import AdminStructure from './components/AdminStructure'; 
import AdminSejarah from './components/AdminSejarah';
import AdminVisiMisi from './components/AdminVisiMisi';
import AdminFasilitas from './components/AdminFasilitas';
import ManajemenDokumen from './components/ManajemenDokumen'; 
import { KelolaSurat } from './components/KelolaSurat'; 
import KasManager from './components/KasManager'; 

import { X, ChevronLeft, ChevronRight, Menu, Zap, Download, ExternalLink, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- KONSTANTA AUDIO ---
const MARS_URL = "https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/assets/Mars%20US162.mp3";

// HELPER: Auto Scroll ke atas setiap pindah route
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// HELPER: Reactively synchronize URL query params with App activeView
function UrlSynchronizer({ setActiveView }: { setActiveView: (view: string | null) => void }) {
  const location = useLocation();
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('newsId')) {
      setActiveView('berita');
    } else if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) {
      setActiveView('galeri');
    }
  }, [location.search, setActiveView]);

  return null;
}


const renderDescriptionWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  return text.split('\n').map((line, i) => (
    <p key={i} className="mb-4 last:mb-0 leading-relaxed text-zinc-700 text-justify whitespace-normal">
      {line.split(urlRegex).map((part, index) => {
        if (part.match(urlRegex)) {
          const cleanUrl = part.startsWith('www.') ? `https://${part}` : part;
          return (
            <a 
              key={index} 
              href={cleanUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-400 underline hover:text-blue-300 inline break-all whitespace-normal"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </p>
  ));
};

/**
 * FIXED POPUP COMPONENT WITH FALLBACK
 */
function ImagePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promoImages, setPromoImages] = useState<any[]>([]);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchActivePopups = async () => {
      try {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          setPromoImages(data);
          setTimeout(() => { setIsImageLoading(true); setIsOpen(true); }, 1000);
        } else {
          const activeFallbacks = (popupFallback as any[]).filter(p => p.is_active);
          if (activeFallbacks.length > 0) {
            setPromoImages(activeFallbacks);
            setTimeout(() => { setIsImageLoading(true); setIsOpen(true); }, 1000);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat pop-up:", err);
      }
    };
    fetchActivePopups();
  }, []);

  useEffect(() => {
    if (promoImages.length <= 1 || !isOpen) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promoImages.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [promoImages.length, isOpen]);

  const closePopup = () => {
      setIsOpen(false);
      setIsImageLoading(true);
      setCurrentIndex(0);
  };
  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div className="absolute inset-0" onClick={closePopup} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-[420px] max-h-[85vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
          <button onClick={closePopup} className="absolute top-4 right-4 z-50 p-2 bg-white/90 hover:bg-rose-500 hover:text-white text-slate-900 rounded-full shadow-lg transition-all"><X size={18} /></button>
          <div ref={scrollRef} className="overflow-y-auto hide-scrollbar">
             {/* Image container with fixed height and object-cover for consistent, polished look */}
             <div className="relative w-full h-72 bg-slate-100 overflow-hidden">
               <img 
                 src={current.url_gambar} 
                 className="w-full h-full object-cover object-center" 
                 alt={current.judul} 
                 onError={(e) => {
                   (e.target as HTMLImageElement).style.display = 'none';
                 }}
               />
               
               {/* Dots Indicator */}
               {promoImages.length > 1 && (
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                   {promoImages.map((_, index) => (
                     <div 
                       key={index}
                       className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`}
                     />
                   ))}
                 </div>
               )}
             </div>
             <div className="p-8">
                <h3 className="text-xl font-black uppercase mb-4 text-blue-700">{current.judul}</h3>
                <div className="text-zinc-700 text-[15px] mb-6">{renderDescriptionWithLinks(current.deskripsi)}</div>
                <button onClick={closePopup} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] mb-2">Tutup</button>
                {navigator.share && (
                  <button
                    onClick={() => {
                      navigator.share({
                        title: current.judul,
                        text: current.deskripsi,
                        url: window.location.href,
                      }).catch((err) => console.error("Error sharing:", err));
                    }}
                    className="w-full py-4 bg-green-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    Share
                  </button>
                )}
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAboutTab, setActiveAboutTab] = useState('sejarah');
  const [activeAthleteFilter, setActiveAthleteFilter] = useState('all');

  // STATE UNTUK DEDICATED FULL-PAGE VIEWS
  const [activeView, setActiveView] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) {
      return 'galeri';
    }
    return null;
  });

  // STATE UNTUK MEDETEKSI OVERLAY AKTIF (Agar control dock tersembunyi dengan elegan)
  const [isOverlayActive, setIsOverlayActive] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOverlayActive(true);
    const handleClose = () => setIsOverlayActive(false);

    window.addEventListener('pb-overlay-open', handleOpen);
    window.addEventListener('pb-overlay-close', handleClose);

    return () => {
      window.removeEventListener('pb-overlay-open', handleOpen);
      window.removeEventListener('pb-overlay-close', handleClose);
    };
  }, []);

  // AUDIO LOGIC
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMarsPlaying, setIsMarsPlaying] = useState(false);

  // --- REAL-TIME PRAYER NOTIFICATION SYSTEM ---
  const [prayerTimings, setPrayerTimings] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_prayer_timings');
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  });

  const [prayerCity, setPrayerCity] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('cached_prayer_city');
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.name || 'Parepare';
      }
    } catch (e) {}
    return 'Parepare';
  });

  const [notifications, setNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'warning' | 'now';
    time: string;
    prayerName: string;
  }>>([]);

  const [triggeredKeys, setTriggeredKeys] = useState<string[]>(() => {
    try {
      const cached = sessionStorage.getItem('triggered_prayer_notifications');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Keep triggeredKeys in sessionStorage to prevent duplicate triggers in the same tab session
  useEffect(() => {
    sessionStorage.setItem('triggered_prayer_notifications', JSON.stringify(triggeredKeys));
  }, [triggeredKeys]);

  // Listen to Custom Events from PrayerTimes
  useEffect(() => {
    const handlePrayerTimesLoaded = (event: any) => {
      const { timings, cityName } = event.detail;
      if (timings) setPrayerTimings(timings);
      if (cityName) setPrayerCity(cityName);
    };

    window.addEventListener('prayer-times-loaded', handlePrayerTimesLoaded);
    return () => {
      window.removeEventListener('prayer-times-loaded', handlePrayerTimesLoaded);
    };
  }, []);

  // Interval checker for prayer times
  useEffect(() => {
    if (!prayerTimings) return;

    const playNotificationChime = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // G5 tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, ctx.currentTime);
        gain1.gain.setValueAtTime(0.12, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start();
        osc1.stop(ctx.currentTime + 0.6);
        
        // E5 tone after 150ms
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
          gain2.gain.setValueAtTime(0.12, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 1.0);
        }, 180);
      } catch (err) {
        console.error("Chime failed", err);
      }
    };

    const triggerVibrate = (type: 'warning' | 'now') => {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          if (type === 'warning') {
            // Pattern for 10-minute warning: 2 distinct pulses (150ms vibration, 100ms gap, 150ms vibration)
            navigator.vibrate([150, 100, 150]);
          } else {
            // Pattern for exact time: 3 powerful pulsed vibrations (300ms vibration, 150ms gap, etc.)
            navigator.vibrate([300, 150, 300, 150, 300]);
          }
        } catch (e) {
          console.warn('Vibration failed', e);
        }
      }
    };

    const checkPrayerTimes = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      // Date string for unique notification ID
      const todayString = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();

      const activePrayers = [
        { key: 'Imsak', time: prayerTimings.Imsak, label: 'Imsak' },
        { key: 'Fajr', time: prayerTimings.Fajr, label: 'Subuh' },
        { key: 'Dhuhr', time: prayerTimings.Dhuhr, label: 'Dzuhur' },
        { key: 'Asr', time: prayerTimings.Asr, label: 'Ashar' },
        { key: 'Maghrib', time: prayerTimings.Maghrib, label: 'Maghrib' },
        { key: 'Isha', time: prayerTimings.Isha, label: 'Isya' },
      ];

      activePrayers.forEach((prayer) => {
        if (!prayer.time) return;

        const [pStrHours, pStrMinutes] = prayer.time.split(':');
        const pHours = parseInt(pStrHours, 10);
        const pMinutes = parseInt(pStrMinutes, 10);
        const prayerTotalMinutes = pHours * 60 + pMinutes;

        const diffMinutes = prayerTotalMinutes - currentTotalMinutes;
        const cleanCityName = prayerCity.replace(/^📍\s*/, '');

        // 1. Check 10-minutes-before warning
        if (diffMinutes === 10) {
          const warnKey = `${prayer.key}-warning-${todayString}`;
          if (!triggeredKeys.includes(warnKey)) {
            setTriggeredKeys(prev => [...prev, warnKey]);
            
            const newNotif = {
              id: warnKey,
              title: `🕌 Pengingat Sholat ${prayer.label}`,
              message: `10 menit lagi memasuki waktu sholat ${prayer.label} (${prayer.time}) untuk wilayah ${cleanCityName}. Bersiaplah.`,
              type: 'warning' as const,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              prayerName: prayer.label
            };
            
            setNotifications(prev => {
              if (prev.some(n => n.id === warnKey)) return prev;
              return [newNotif, ...prev];
            });

            playNotificationChime();
            triggerVibrate('warning');
          }
        }

        // 2. Check exact-time alert
        if (diffMinutes === 0) {
          const nowKey = `${prayer.key}-now-${todayString}`;
          if (!triggeredKeys.includes(nowKey)) {
            setTriggeredKeys(prev => [...prev, nowKey]);

            const newNotif = {
              id: nowKey,
              title: `📢 Waktu Sholat ${prayer.label} Tiba`,
              message: `Waktu sholat ${prayer.label} telah masuk (${prayer.time}) untuk wilayah ${cleanCityName}. Mari menunaikan sholat fardhu berjamaah.`,
              type: 'now' as const,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
              prayerName: prayer.label
            };

            setNotifications(prev => {
              if (prev.some(n => n.id === nowKey)) return prev;
              return [newNotif, ...prev];
            });

            playNotificationChime();
            triggerVibrate('now');
          }
        }
      });
    };

    checkPrayerTimes();

    const interval = setInterval(checkPrayerTimes, 10000);
    return () => clearInterval(interval);
  }, [prayerTimings, prayerCity, triggeredKeys]);

  // Auto-dismiss handler for notifications
  useEffect(() => {
    if (notifications.length === 0) return;
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(0, prev.length - 1));
    }, 45000);
    return () => clearTimeout(timer);
  }, [notifications]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (sectionId: string, subPath?: string) => {
    console.log("DEBUG: handleNavigate called with sectionId:", sectionId, "subPath:", subPath);
    
    if (sectionId === 'atlet' || sectionId === 'players') {
      setActiveView('atlet'); // Pastikan view tetap 'atlet'
      if (subPath) {
        const path = subPath.toLowerCase();
        if (path.includes('senior')) setActiveAthleteFilter('Senior');
        else if (path.includes('muda')) setActiveAthleteFilter('Muda');
        else setActiveAthleteFilter('Semua');
      } else {
         setActiveAthleteFilter('Semua');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const fullPageMenus = ['kas', 'quiz', 'contact', 'kontak', 'struktur', 'struktur-organisasi', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery', 'sejarah', 'visi-misi', 'fasilitas', 'berita'];

    // Prioritaskan subPath jika ada, karena itu adalah target navigasi sebenarnya
    const target = (subPath || sectionId).toLowerCase();
    console.log("DEBUG: handleNavigate target:", target);
    
    if (fullPageMenus.includes(target)) {
        console.log("DEBUG: Setting activeView to", target);
        setActiveView(target);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        console.log("DEBUG: Setting activeView to null, scrolling to", target);
        setActiveView(null);
        setTimeout(() => {
            const element = document.getElementById(target);
            if (element) {
                const offset = 100;
                window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
            }
        }, 100);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
      <UrlSynchronizer setActiveView={setActiveView} />
      <audio ref={audioRef} src={MARS_URL} loop />
      
      <Routes>
        <Route path="/" element={
          <div className="min-h-screen bg-[#0b0e14] w-full overflow-x-hidden">
            <ImagePopup />
            <Navbar onNavigate={handleNavigate} />
            
            {/* REAL-TIME PRAYER NOTIFICATION PANEL */}
            <div className="fixed top-16 md:top-20 right-4 z-[9999999] flex flex-col gap-3 w-full max-w-[360px] p-4 pointer-events-none">
              <AnimatePresence>
                {notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    className={`pointer-events-auto w-full p-4 rounded-xl shadow-2xl border flex flex-col gap-2 relative overflow-hidden backdrop-blur-md ${
                      notif.type === 'warning' 
                        ? 'bg-amber-950/90 border-amber-500/30 text-amber-100' 
                        : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100'
                    }`}
                  >
                    {/* Glow effect */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      notif.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    
                    <div className="flex items-start justify-between pl-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">
                          {notif.type === 'warning' ? '🔔' : '🕌'}
                        </span>
                        <span className="font-black tracking-wide text-xs uppercase">
                          {notif.title}
                        </span>
                      </div>
                      <button 
                        onClick={() => dismissNotification(notif.id)}
                        className="text-slate-400 hover:text-white transition-colors p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    <p className="text-xs font-medium pl-2 leading-relaxed opacity-90">
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center justify-between pl-2 pt-1">
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                        {notif.time} • Realtime Alert
                      </span>
                      <button 
                        onClick={() => dismissNotification(notif.id)}
                        className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border transition-all ${
                          notif.type === 'warning'
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-400'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        Mengerti
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* BACK TO HOME BUTTON (Centered bottom) */}
            <AnimatePresence>
              {activeView && !isOverlayActive && (
                <motion.div
                  initial={{ opacity: 0, y: 30, x: "-50%" }}
                  animate={{ opacity: 1, y: 0, x: "-50%" }}
                  exit={{ opacity: 0, y: 30, x: "-50%" }}
                  transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                  style={{ x: "-50%" }}
                  className="fixed bottom-6 left-1/2 z-[99999]"
                >
                  <button 
                    onClick={() => { setActiveView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-[10px] uppercase tracking-[0.15em] transition-all duration-200 active:scale-95 cursor-pointer border border-white/10 shadow-[0_12px_30px_rgba(37,99,235,0.35)] hover:shadow-blue-600/40"
                  >
                    <ArrowLeft size={13} />
                    <span>Kembali ke Beranda</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* AUDIO CONTROLLER (Floating bottom right, smaller size, neat & professional) */}
            <AnimatePresence>
              {!isOverlayActive && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2 pointer-events-none"
                >
                  {/* Subtle playing text / visualizer, elegant & professional */}
                  <AnimatePresence>
                    {isMarsPlaying && (
                      <motion.div 
                        initial={{ opacity: 0, x: 10, filter: "blur(4px)" }} 
                        animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} 
                        exit={{ opacity: 0, x: 10, filter: "blur(4px)" }} 
                        className="bg-slate-900/95 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 pointer-events-auto"
                      >
                        <div className="flex gap-0.5 items-end h-2.5">
                           {[1,2,3].map(i => (
                             <motion.div 
                               key={i} 
                               animate={{ height: [2, 7, 2] }} 
                               transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} 
                               className="w-0.5 bg-blue-400 rounded-full" 
                             />
                           ))}
                        </div>
                        <span className="text-[8px] font-extrabold uppercase tracking-widest text-slate-300 italic whitespace-nowrap">Mars PB 162</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Play / Mute Circle Icon - smaller & neat */}
                  <button 
                    onClick={() => {
                      if (audioRef.current) {
                        isMarsPlaying ? audioRef.current.pause() : audioRef.current.play();
                        setIsMarsPlaying(!isMarsPlaying);
                      }
                    }}
                    className={`pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-[0_4px_12px_rgba(0,0,0,0.3)] ${
                      isMarsPlaying 
                        ? 'bg-blue-600 text-white border-blue-500/50 hover:bg-blue-500' 
                        : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                    title={isMarsPlaying ? "Pause Mars PB 162" : "Play Mars PB 162"}
                  >
                    {isMarsPlaying ? <Volume2 size={13} className="animate-pulse" /> : <VolumeX size={13} />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {!activeView ? (
                <motion.div key="landing" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }} className="w-full flex flex-col min-h-screen">
                  <div className="flex-grow">
                    <Hero />
                    <SambutanKetua />
                    {/* Jadwal Sholat Khusus Seluler - Tampil Tepat di Bawah Slider Hero */}
                    <div className="block lg:hidden max-w-xl mx-auto px-4 sm:px-6 md:px-8 mt-6 mb-2">
                      <PrayerTimes />
                    </div>
                  </div>
                  {/* Section berita dikembalikan ke halaman utama */}
                  <Footer onNavigate={handleNavigate} />
                </motion.div>
              ) : (
                /* DEDICATED FULL-PAGE VIEW DENGAN DARK MODE KONSISTEN */
                <div className="flex flex-col min-h-screen w-full bg-[#070d1a] pt-14 lg:pt-16">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={`dedicated-view-${activeView}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="flex-grow w-full flex flex-col"
                    >
                      <div className="w-full flex flex-col flex-grow max-w-7xl px-4 md:px-8 mx-auto">
                        {/* Render Komponen dengan Props masing-masing */}
                        {activeView === 'kas' && <PublicKasView />}
                        {(activeView === 'quiz') && <BadmintonQuiz />}
                        {(activeView === 'contact' || activeView === 'kontak') && <Contact />}
                        {(activeView === 'struktur' || activeView === 'struktur-organisasi') && <StrukturOrganisasiPublic />}
                        {activeView === 'dokumen-penting' && <DokumenPenting />}
                        {(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}
                        {(activeView === 'peringkat' || activeView === 'rankings') && <Ranking />}
                        {(activeView === 'atlet' || activeView === 'players') && <Athletes initialFilter={activeAthleteFilter} />}
                        {(activeView === 'sejarah') && <Sejarah />}
                        {(activeView === 'visi-misi') && <VisiMisi />}
                        {(activeView === 'fasilitas') && <Fasilitas />}
                        {(activeView === 'berita') && <News />}
                        {(activeView === 'galeri' || activeView === 'gallery') && <Gallery />}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  
                  <Footer onNavigate={handleNavigate} />
                </div>
              )}
            </AnimatePresence>
          </div>
        } />

        <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/*" element={session ? <AdminLayout session={session} /> : <Navigate to="/login" replace />} />
      </Routes>
      <style>{`
        /* Menghilangkan scrollbar tapi fungsi scroll tetap ada */
        .hide-scrollbar::-webkit-scrollbar { display: none !important; }
        .hide-scrollbar { -ms-overflow-style: none !important; scrollbar-width: none !important; }
        
        /* Custom scrollbar untuk panel admin */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #070d1a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        
        /* Global Background Smoothness */
        body { background-color: #070d1a; }
      `}</style>
    </Router>
  );
}

function AdminLayout({ session }: { session: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen w-full bg-[#070d1a] overflow-hidden">
      <Sidebar email={session.user.email} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-[#0F172A] px-4 py-3.5 border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 hover:bg-white/10 rounded-xl transition-colors"><Menu size={20} /></button>
          <div className="text-white font-bold tracking-tight text-[13.5px] uppercase">Admin Console</div>
          <div className="w-9"></div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#070d1a] custom-scrollbar">
          <Routes>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="pendaftaran" element={<ManajemenPendaftaran />} />
            <Route path="atlet" element={<ManajemenAtlet />} />
            <Route path="surat" element={<KelolaSurat />} />
            <Route path="kas" element={<KasManager />} />
            <Route path="dokumen" element={<ManajemenDokumen />} /> 
            <Route path="poin" element={<ManajemenPoin />} />
            <Route path="audit-poin" element={<AuditLogPoin />} />
            <Route path="skor" element={<AdminMatch />} />
            <Route path="berita" element={<AdminBerita />} />
            <Route path="ranking" element={<AdminRanking />} />
            <Route path="galeri" element={<AdminGallery />} />
            <Route path="kontak" element={<AdminContact />} />
            <Route path="navbar" element={<KelolaNavbar />} />
            <Route path="laporan" element={<AdminLaporan />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="tampilan" element={<AdminTampilan />} />
            <Route path="hero" element={<KelolaHero />} />
            <Route path="popup" element={<AdminPopup />} /> 
            <Route path="footer" element={<AdminFooter />} />
            <Route path="sejarah" element={<AdminSejarah />} />
            <Route path="visi-misi" element={<AdminVisiMisi />} />
            <Route path="fasilitas" element={<AdminFasilitas />} />
            <Route path="struktur" element={<AdminStructure />} /> 
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}