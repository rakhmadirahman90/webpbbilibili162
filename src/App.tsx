import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './supabase'; 

// --- IMPORT FALLBACK DATA ---
import popupFallback from './data/konfigurasi_popup.json';

// Import Komponen Landing Page
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import About from './components/About';
import News from './components/News';
import PrayerTimes from './components/PrayerTimes';
import Athletes from './components/Players'; 
import Ranking from './components/Rankings'; 
import BadmintonQuiz from './components/BadmintonQuiz'; 
import Gallery from './components/Gallery';
import RegistrationForm from './components/RegistrationForm'; 
import Contact from './components/Contact'; 
// import Footer from './components/Footer'; // Footer lama dinonaktifkan
import PublicKasView from './components/PublicKasView';
import DokumenPenting from './components/DokumenPenting'; 
import StrukturOrganisasi from './components/StrukturOrganisasi'; 

// Import Komponen Admin
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ManajemenPendaftaran from './ManajemenPendaftaran';
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

/**
 * FIXED POPUP COMPONENT WITH FALLBACK
 */
function ImagePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promoImages, setPromoImages] = useState<any[]>([]);
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
          setTimeout(() => setIsOpen(true), 1000);
        } else {
          const activeFallbacks = (popupFallback as any[]).filter(p => p.is_active);
          if (activeFallbacks.length > 0) {
            setPromoImages(activeFallbacks);
            setTimeout(() => setIsOpen(true), 1000);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat pop-up:", err);
      }
    };
    fetchActivePopups();
  }, []);

  const closePopup = () => setIsOpen(false);
  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
        <div className="absolute inset-0" onClick={closePopup} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-[420px] max-h-[85vh] bg-white rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20" onClick={(e) => e.stopPropagation()}>
          <button onClick={closePopup} className="absolute top-4 right-4 z-50 p-2 bg-white/90 hover:bg-rose-500 hover:text-white text-slate-900 rounded-full shadow-lg transition-all"><X size={18} /></button>
          <div ref={scrollRef} className="flex-1 overflow-y-auto hide-scrollbar">
             <img src={current.url_gambar} className="w-full h-auto object-cover" alt={current.judul} />
             <div className="p-8">
                <h3 className="text-xl font-black uppercase mb-4">{current.judul}</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">{current.deskripsi}</p>
                <button onClick={closePopup} className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold uppercase tracking-widest text-[10px]">Tutup</button>
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
  const [activeView, setActiveView] = useState<string | null>(null);

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
    const fullPageMenus = ['kas', 'quiz', 'contact', 'kontak', 'struktur', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery'];

    if (fullPageMenus.includes(sectionId)) {
        if (sectionId === 'tentang-kami' || sectionId === 'about') {
            if (subPath) setActiveAboutTab(subPath);
        }
        if (sectionId === 'atlet' || sectionId === 'players') {
            if (subPath) setActiveAthleteFilter(subPath.toLowerCase());
        }
        
        setActiveView(sectionId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        setActiveView(null);
        setTimeout(() => {
            const element = document.getElementById(sectionId);
            if (element) {
                const offset = 100;
                window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
            }
        }, 100);
    }
  };

  const BackToHomeButton = () => (
    <motion.button 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03, backgroundColor: '#2563eb' }}
      whileTap={{ scale: 0.97 }}
      onClick={() => { setActiveView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      className="fixed bottom-10 left-1/2 -translate-x-1/2 px-7 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-semibold text-xs tracking-wider shadow-[0_12px_30px_rgba(37,99,235,0.3)] z-[9999] uppercase flex items-center gap-2.5 border border-white/10 backdrop-blur-md transition-all duration-200"
    >
      <ArrowLeft size={15} /> Kembali ke Beranda
    </motion.button>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
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
            
            {/* MUSIC CONTROLLER */}
            <div className="fixed bottom-6 right-6 z-[99999] flex flex-col items-end gap-3 pointer-events-none">
                <AnimatePresence>
                  {isMarsPlaying && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-slate-900/95 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-3">
                        <div className="flex gap-0.5">
                           {[1,2,3,4].map(i => <motion.div key={i} animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} className="w-1 bg-blue-500 rounded-full" />)}
                        </div>
                        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-white italic">Mars PB 162</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <motion.button 
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (audioRef.current) {
                      isMarsPlaying ? audioRef.current.pause() : audioRef.current.play();
                      setIsMarsPlaying(!isMarsPlaying);
                    }
                  }}
                  className="pointer-events-auto w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border border-white/20 group overflow-hidden"
                >
                  {isMarsPlaying ? <Volume2 size={20} /> : <VolumeX size={20} className="text-white/60" />}
                </motion.button>
            </div>

            <AnimatePresence mode="wait">
              {!activeView ? (
                <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                  <Hero />
                  {/* Jadwal Sholat Khusus Seluler - Tampil Tepat di Bawah Slider Hero */}
                  <div className="block lg:hidden max-w-xl mx-auto px-4 sm:px-6 md:px-8 mt-6 mb-2">
                    <PrayerTimes />
                  </div>
                  <section id="berita-section"><News /></section>
                </motion.div>
              ) : (
                /* DEDICATED FULL-PAGE VIEW DENGAN DARK MODE KONSISTEN */
                <motion.div 
                  key="dedicated-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="min-h-screen w-full flex flex-col items-center bg-[#0b0e14] pt-20 pb-14"
                >
                  <div className="w-full h-full max-w-7xl px-4 md:px-8 mx-auto">
                    {/* Render Komponen dengan Props masing-masing */}
                    {activeView === 'kas' && <PublicKasView />}
                    {(activeView === 'quiz') && <BadmintonQuiz />}
                    {(activeView === 'contact' || activeView === 'kontak') && <Contact />}
                    {activeView === 'struktur' && <StrukturOrganisasi />}
                    {activeView === 'dokumen-penting' && <DokumenPenting />}
                    {(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}
                    {(activeView === 'peringkat' || activeView === 'rankings') && <Ranking />}
                    {(activeView === 'atlet' || activeView === 'players') && <Athletes initialFilter={activeAthleteFilter} />}
                    {(activeView === 'tentang-kami' || activeView === 'about') && <About activeTab={activeAboutTab} onTabChange={setActiveAboutTab} />}
                    {(activeView === 'galeri' || activeView === 'gallery') && <Gallery />}
                  </div>
                  
                  <BackToHomeButton />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Footer Custom */}
            <footer className="w-full py-3 text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.25em] border-t border-white/5 bg-[#0b0e14]">
              <p>© 2026 PB BILIBILI 162</p>
            </footer>
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
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        
        /* Global Background Smoothness */
        body { background-color: #0b0e14; }
      `}</style>
    </Router>
  );
}

function AdminLayout({ session }: { session: any }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen w-full bg-[#050505] overflow-hidden">
      <Sidebar email={session.user.email} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-[#0F172A] px-4 py-3.5 border-b border-white/5">
          <button onClick={() => setIsSidebarOpen(true)} className="text-white p-2 hover:bg-white/10 rounded-xl transition-colors"><Menu size={20} /></button>
          <div className="text-white font-bold tracking-tight text-[13.5px] uppercase">Admin Console</div>
          <div className="w-9"></div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#050505] custom-scrollbar">
          <Routes>
            <Route path="dashboard" element={<ManajemenPendaftaran />} />
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
            <Route path="about" element={<AdminAbout />} />
            <Route path="struktur" element={<AdminStructure />} /> 
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}