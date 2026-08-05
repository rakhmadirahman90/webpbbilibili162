import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 
import { getSiteSetting } from './utils/siteSettingsHelper'; 

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
import JadwalLatihanView from './components/JadwalLatihanView';

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
import AdminAbsensi from './components/AdminAbsensi';
import PublicInventaris from './components/PublicInventaris';
import AdminInventaris from './components/AdminInventaris';
import AdminPrestasi from './components/AdminPrestasi';
import AdminFAQ from './components/AdminFAQ';
import AdminProgram from './components/AdminProgram';
import PublicPrestasi from './components/PublicPrestasi';
import PublicFAQ from './components/PublicFAQ';
import PublicProgram from './components/PublicProgram';
 
import AdminAbout from './components/AdminAbout';
import AdminStructure from './components/AdminStructure'; 
import AdminSejarah from './components/AdminSejarah';
import AdminVisiMisi from './components/AdminVisiMisi';
import AdminFasilitas from './components/AdminFasilitas';
import ManajemenDokumen from './components/ManajemenDokumen'; 
import { KelolaSurat } from './components/KelolaSurat'; 
import KasManager from './components/KasManager'; 
import ProfilAnggota from './components/ProfilAnggota'; 
import AdminUsers from './components/AdminUsers';
import ScheduleWidget from './components/ScheduleWidget'; 
import PresenceManager from './components/PresenceManager';
import KasRealtimeNotifier from './components/KasRealtimeNotifier';
import AdminRekapKeuangan from './components/AdminRekapKeuangan';
import BookingLatihan from './components/BookingLatihan';
import AnalisisPerforma from './components/AnalisisPerforma';
import TournamentLeague from './components/TournamentLeague';
import RaporAtlet from './components/RaporAtlet';
import LiveScoreWidget from './components/LiveScoreWidget';
import TestimonialUlasan from './components/TestimonialUlasan';
import FcmSettingsDashboard from './components/FcmSettingsDashboard';
import PwaApkManager from './components/PwaApkManager';
import PwaInstallNotification from './components/PwaInstallNotification';

import { X, ChevronLeft, ChevronRight, Menu, Zap, Download, ExternalLink, Volume2, Volume1, VolumeX, ArrowLeft, Plus, Minus, SlidersHorizontal } from 'lucide-react';
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

// HELPER: Reactively synchronize URL path/query params with App activeView
function UrlSynchronizer({ 
  activeView, 
  setActiveView 
}: { 
  activeView: string | null;
  setActiveView: (view: string | null) => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  
  // Sync from URL to state on mount and location changes
  useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) {
      return;
    }
    const path = location.pathname.substring(1).toLowerCase();
    const params = new URLSearchParams(location.search);
    
    const fullPageMenus = [
      'jadwal', 'jadwal-latihan', 'schedule', 
      'kas', 'quiz', 
      'contact', 'kontak', 
      'struktur', 'struktur-organisasi', 
      'dokumen-penting', 'dokumen', 'documents',
      'register', 'pendaftaran', 
      'peringkat', 'rankings', 'ranking',
      'atlet', 'players', 'player',
      'tentang-kami', 'about', 'tentang', 'sejarah',
      'galeri', 'gallery', 
      'visi-misi', 'visi', 'misi', 'fasilitas', 'inventaris', 'public-inventaris',
      'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'
    ];
    
    if (path) {
      if (path === 'home' || path === 'beranda') {
        if (activeView !== null) setActiveView(null);
      } else if (fullPageMenus.includes(path)) {
        if (activeView !== path) {
          setActiveView(path);
        }
      } else {
        if (activeView !== null) {
          setActiveView(null);
        }
      }
    } else {
      if (params.has('newsId')) {
        if (activeView !== 'berita') setActiveView('berita');
      } else if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) {
        if (activeView !== 'galeri') setActiveView('galeri');
      } else {
        if (activeView !== null) {
          setActiveView(null);
        }
      }
    }
  }, [location.pathname, location.search]); // Don't put activeView/setActiveView in dependencies to avoid cycle on initial load
  
  // Sync from state to URL when activeView changes
  useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) {
      return;
    }
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    const currentPath = location.pathname.substring(1).toLowerCase();
    if (activeView) {
      if (currentPath !== activeView) {
        navigate(`/${activeView}${location.search}`, { replace: false });
      }
    } else {
      if (currentPath) {
        navigate(`/${location.search}`, { replace: false });
      }
    }
  }, [activeView, navigate]);

  return null;
}


const renderDescriptionWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  return text.split('\n').map((line, i) => (
    <p key={i} className="mb-4 last:mb-0 leading-relaxed text-slate-700 text-justify whitespace-normal">
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
        let activeItems: any[] = [];
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        
        if (!error && data && data.length > 0) {
          activeItems = data;
        }

        const siteConfig = await getSiteSetting('popup_config');
        if (siteConfig) {
          const parsed = typeof siteConfig === 'string' ? JSON.parse(siteConfig) : siteConfig;
          if (Array.isArray(parsed)) {
            const activeSite = parsed.filter((p: any) => p.is_active !== false);
            if (activeSite.length > 0) activeItems = activeSite;
          }
        }

        if (activeItems.length > 0) {
          setPromoImages(activeItems);
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

    const handleUpdate = (e: any) => {
      if (e.detail?.key === 'popup_config') {
        fetchActivePopups();
      }
    };
    window.addEventListener('site_setting_updated', handleUpdate);
    return () => window.removeEventListener('site_setting_updated', handleUpdate);
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
          <button onClick={closePopup} className="absolute top-4 right-4 z-[60] p-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full shadow-xl border border-slate-200 transition-all active:scale-90"><X size={18} /></button>
          <div ref={scrollRef} className="overflow-y-auto hide-scrollbar">
             {/* Image container that fits perfectly with full width and proportional height, leaving no empty space on left/right and no cropping */}
             <div className="relative w-full bg-slate-950 overflow-hidden flex items-center justify-center">
               {/* Main Banner Image - Fully spans the width proportionally without cropping */}
               <img 
                 src={current.url_gambar} 
                 loading="lazy"
                 decoding="async"
                 className="w-full h-auto block z-10 select-none pointer-events-none" 
                 alt={current.judul} 
                 onError={(e) => {
                   (e.target as HTMLImageElement).style.display = 'none';
                 }}
               />
               
               {/* Subtle lighting gradient overlay */}
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-black/15 z-20 pointer-events-none" />
               
               {/* Dots Indicator */}
               {promoImages.length > 1 && (
                 <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 z-30">
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
                <div className="text-slate-700 text-[15px] mb-6">{renderDescriptionWithLinks(current.deskripsi)}</div>
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
    const path = window.location.pathname.substring(1).toLowerCase();
    const fullPageMenus = ['jadwal', 'jadwal-latihan', 'schedule', 'kas', 'quiz', 'contact', 'kontak', 'struktur', 'struktur-organisasi', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery', 'sejarah', 'visi-misi', 'fasilitas', 'inventaris', 'berita', 'news', 'faq'];
    
    if (path && fullPageMenus.includes(path)) {
      return path;
    }
    
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
  const wasAutoPausedRef = useRef<boolean>(false);
  const [isMarsPlaying, setIsMarsPlaying] = useState(false);
  const [marsProgress, setMarsProgress] = useState(0);
  const [marsDuration, setMarsDuration] = useState(0);
  const [marsCurrentTime, setMarsCurrentTime] = useState(0);

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const [marsVolume, setMarsVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('mars_audio_volume');
      return saved ? parseFloat(saved) : 0.8;
    } catch {
      return 0.8;
    }
  });
  const [isVolumeExpanded, setIsVolumeExpanded] = useState<boolean>(false);
  const [audioToast, setAudioToast] = useState<{ show: boolean; message: string; type: 'play' | 'mute' }>({
    show: false,
    message: '',
    type: 'mute'
  });

  // Sync volume to audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = marsVolume;
    }
  }, [marsVolume]);

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, parseFloat(newVol.toFixed(2))));
    setMarsVolume(clamped);
    try {
      localStorage.setItem('mars_audio_volume', clamped.toString());
    } catch {
      // ignore
    }
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    const pct = Math.round(clamped * 100);
    setAudioToast({
      show: true,
      message: `Volume: ${pct}%`,
      type: clamped > 0 ? 'play' : 'mute'
    });
  };

  const increaseVolume = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleVolumeChange(marsVolume + 0.1);
  };

  const decreaseVolume = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    handleVolumeChange(marsVolume - 0.1);
  };

  useEffect(() => {
    if (audioToast.show) {
      const timer = setTimeout(() => {
        setAudioToast(prev => ({ ...prev, show: false }));
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [audioToast.show, audioToast.message]);

  // Auto-pause background Mars audio when user plays a video or other media
  useEffect(() => {
    const handleMediaPlay = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target !== audioRef.current && (target.tagName === 'VIDEO' || target.tagName === 'AUDIO')) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
          setIsMarsPlaying(false);
          wasAutoPausedRef.current = true;
          setAudioToast({ show: true, message: 'Mars Di-pause (Media Diputar)', type: 'mute' });
        }
      }
    };

    const handleMediaPauseOrEnd = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target !== audioRef.current && (target.tagName === 'VIDEO' || target.tagName === 'AUDIO')) {
        if (wasAutoPausedRef.current && audioRef.current) {
          audioRef.current.play().then(() => {
            setIsMarsPlaying(true);
            setAudioToast({ show: true, message: 'Mars Lanjut Diputar', type: 'play' });
          }).catch(() => {});
          wasAutoPausedRef.current = false;
        }
      }
    };

    document.addEventListener('play', handleMediaPlay, true);
    document.addEventListener('pause', handleMediaPauseOrEnd, true);
    document.addEventListener('ended', handleMediaPauseOrEnd, true);

    return () => {
      document.removeEventListener('play', handleMediaPlay, true);
      document.removeEventListener('pause', handleMediaPauseOrEnd, true);
      document.removeEventListener('ended', handleMediaPauseOrEnd, true);
    };
  }, []);

  const toggleAudio = () => {
    wasAutoPausedRef.current = false;
    if (audioRef.current) {
      if (isMarsPlaying) {
        audioRef.current.pause();
        setIsMarsPlaying(false);
        setAudioToast({ show: true, message: 'Musik Dimatikan', type: 'mute' });
      } else {
        audioRef.current.play().catch(() => {});
        setIsMarsPlaying(true);
        setAudioToast({ show: true, message: 'Memutar Mars PB 162', type: 'play' });
      }
    }
  };

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

  // Listen to Custom Notifications triggered from within the app
  useEffect(() => {
    const handleCustomNotification = (event: any) => {
      const { title, message, type } = event.detail;
      const notifType = type || 'now';
      const newNotif = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title || 'Pemberitahuan PB Bilibili',
        message: message || '',
        type: notifType,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        prayerName: ''
      };
      setNotifications(prev => [newNotif, ...prev]);

      // Play chime
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch (e) {}
    };

    window.addEventListener('app-notification-trigger', handleCustomNotification);
    return () => {
      window.removeEventListener('app-notification-trigger', handleCustomNotification);
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
    const syncSession = async () => {
      const { data: { session: supaSession } } = await supabase.auth.getSession();
      if (supaSession) {
        setSession(supaSession);
      } else {
        const local = localStorage.getItem('local_admin_session');
        setSession(local ? JSON.parse(local) : null);
      }
      setLoading(false);
    };

    syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supaSession) => {
      if (supaSession) {
        setSession(supaSession);
      } else {
        const local = localStorage.getItem('local_admin_session');
        setSession(local ? JSON.parse(local) : null);
      }
    });

    const handleCustomAuth = () => syncSession();
    window.addEventListener('local-session-changed', handleCustomAuth);

    const handleNavigateHome = () => {
      setActiveView(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('pb-navigate-home', handleNavigateHome);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('local-session-changed', handleCustomAuth);
      window.removeEventListener('pb-navigate-home', handleNavigateHome);
    };
  }, []);

  const handleNavigate = (sectionId: string, subPath?: string) => {
    const rawTarget = (subPath || sectionId || '').toLowerCase().trim();
    
    if (!rawTarget || rawTarget === 'home' || rawTarget === 'beranda') {
      setActiveView(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (rawTarget === 'atlet' || rawTarget === 'players' || rawTarget === 'player') {
      setActiveView('atlet');
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

    const fullPageMenus = [
      'jadwal', 'jadwal-latihan', 'schedule', 
      'kas', 'quiz', 
      'contact', 'kontak', 
      'struktur', 'struktur-organisasi', 
      'dokumen-penting', 'dokumen', 'documents',
      'register', 'pendaftaran', 
      'peringkat', 'rankings', 'ranking',
      'atlet', 'players', 'player',
      'tentang-kami', 'about', 'tentang', 'sejarah',
      'galeri', 'gallery', 
      'visi-misi', 'visi', 'misi', 'fasilitas', 'inventaris', 'public-inventaris',
      'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'
    ];

    if (fullPageMenus.includes(rawTarget)) {
        setActiveView(rawTarget);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        setActiveView(null);
        setTimeout(() => {
            const element = document.getElementById(rawTarget);
            if (element) {
                const offset = 100;
                window.scrollTo({ top: element.getBoundingClientRect().top + window.pageYOffset - offset, behavior: 'smooth' });
            }
        }, 100);
    }
  };

  const renderPublicHome = () => (
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
      
      {/* BACK TO HOME BUTTON (Centered bottom, compact & perfectly responsive) */}
      <AnimatePresence>
        {activeView && !isOverlayActive && (
          <motion.div
            initial={{ opacity: 0, y: 30, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 30, x: "-50%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            style={{ x: "-50%" }}
            className="fixed bottom-3 sm:bottom-6 left-1/2 z-[99999] max-w-[calc(100vw-6rem)]"
          >
            <button 
              onClick={() => { setActiveView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="flex items-center gap-1.5 sm:gap-2 px-3.5 py-2 sm:px-5 sm:py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-black text-[10px] sm:text-[11px] uppercase tracking-wider sm:tracking-[0.15em] transition-all duration-200 active:scale-95 cursor-pointer border border-white/20 shadow-[0_10px_25px_rgba(37,99,235,0.45)] hover:shadow-blue-600/50 backdrop-blur-xl shrink-0"
            >
              <ArrowLeft size={13} className="shrink-0" />
              <span className="truncate">
                <span className="hidden xs:inline">Kembali ke </span>Beranda
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AUDIO CONTROLLER MARS PB 162 (Floating bottom-left, compact & non-colliding) */}
      <AnimatePresence>
        {!isOverlayActive && (
          <motion.div 
            drag
            dragMomentum={false}
            dragElastic={0.1}
            whileDrag={{ scale: 1.08 }}
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            className="fixed bottom-3 left-3 sm:bottom-6 sm:left-6 z-[9999] flex items-center gap-2 pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
          >
            {/* Audio Action Toast Notification */}
            <AnimatePresence>
              {audioToast.show && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -8, scale: 0.9 }} 
                  transition={{ duration: 0.2 }}
                  className={`absolute -top-12 left-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-2xl border backdrop-blur-xl flex items-center gap-1.5 pointer-events-none z-[10000] ${
                    audioToast.type === 'play' 
                      ? 'bg-blue-950/95 text-blue-200 border-blue-400/50 shadow-blue-900/60' 
                      : 'bg-slate-900/95 text-amber-300 border-amber-500/40 shadow-black/80'
                  }`}
                >
                  {audioToast.type === 'play' ? (
                    <Volume2 size={13} className="text-blue-400 animate-pulse shrink-0" />
                  ) : (
                    <VolumeX size={13} className="text-amber-400 shrink-0" />
                  )}
                  <span>{audioToast.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Play / Mute Circle Icon with Circular Progress Ring & Integrated Volume Badge */}
            <div className="relative flex items-center justify-center p-0.5 pointer-events-auto group">
              {/* Circular SVG Progress Ring surrounding button */}
              <svg 
                className="absolute -inset-1.5 w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] -rotate-90 pointer-events-none z-20 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                viewBox="0 0 56 56"
              >
                {/* Background Track Circle */}
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="text-slate-700/60"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                />
                {/* Progress Circle */}
                <circle
                  cx="28"
                  cy="28"
                  r="23"
                  className="text-blue-400 transition-[stroke-dashoffset] duration-300 ease-linear"
                  strokeWidth="3.5"
                  strokeDasharray={144.5}
                  strokeDashoffset={144.5 - (144.5 * (marsProgress / 100))}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                />
              </svg>

              <button 
                type="button"
                onClick={toggleAudio}
                onPointerDown={(e) => e.stopPropagation()}
                className={`relative z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border shadow-[0_8px_25px_rgba(0,0,0,0.5)] ${
                  isMarsPlaying 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-400/50 shadow-blue-600/40 hover:scale-105 active:scale-95 ring-2 ring-blue-500/30' 
                    : 'bg-slate-900/90 text-slate-300 border-white/15 hover:bg-slate-800 hover:text-white hover:scale-105 active:scale-95 backdrop-blur-xl'
                }`}
                title={
                  isMarsPlaying && marsDuration > 0
                    ? `Matikan Musik Mars (${formatAudioTime(marsCurrentTime)} / ${formatAudioTime(marsDuration)})` 
                    : "Putar Musik Mars PB Bilibili 162"
                }
                aria-label={isMarsPlaying ? "Matikan Musik Mars PB Bilibili 162" : "Putar Musik Mars PB Bilibili 162"}
              >
                {isMarsPlaying ? <Volume2 size={18} className="animate-pulse text-white" /> : <VolumeX size={18} />}
              </button>

              {/* Integrated Volume Badge trigger on the top-right corner of the audio icon */}
              {!isVolumeExpanded && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsVolumeExpanded(true);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute -top-1 -right-1 z-30 w-5 h-5 rounded-full bg-slate-900 border border-blue-400/60 text-blue-300 hover:text-white hover:bg-blue-600 flex items-center justify-center shadow-md transition-all active:scale-90 cursor-pointer hover:scale-110"
                  title={`Pengaturan Volume (${Math.round(marsVolume * 100)}%)`}
                  aria-label="Pengaturan Volume"
                >
                  <SlidersHorizontal size={10} />
                </button>
              )}
            </div>

            {/* Expanded Volume Control Pod (- / + & Slider) */}
            <AnimatePresence>
              {isVolumeExpanded && (
                <motion.div
                  key="volume-expanded"
                  initial={{ opacity: 0, scale: 0.85, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.85, x: -10 }}
                  transition={{ duration: 0.18 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 bg-slate-900/95 backdrop-blur-xl border border-white/15 px-2.5 py-1.5 rounded-full shadow-2xl pointer-events-auto"
                >
                  <button
                    type="button"
                    onClick={decreaseVolume}
                    disabled={marsVolume <= 0}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 cursor-pointer"
                    title="Kurangi Volume (-10%)"
                    aria-label="Kurangi Volume"
                  >
                    <Minus size={12} />
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={marsVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-12 sm:w-16 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    title={`Volume: ${Math.round(marsVolume * 100)}%`}
                    aria-label="Slider Volume Audio"
                  />

                  <button
                    type="button"
                    onClick={increaseVolume}
                    disabled={marsVolume >= 1}
                    className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 cursor-pointer"
                    title="Tambah Volume (+10%)"
                    aria-label="Tambah Volume"
                  >
                    <Plus size={12} />
                  </button>

                  <span className="text-[10px] font-bold text-blue-300 min-w-[28px] text-right font-mono">
                    {Math.round(marsVolume * 100)}%
                  </span>

                  {/* Close / Minimize button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsVolumeExpanded(false);
                    }}
                    className="w-5 h-5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all ml-0.5 cursor-pointer"
                    title="Minimize Kontrol Volume"
                    aria-label="Minimize Kontrol Volume"
                  >
                    <X size={11} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Subtle playing text / visualizer - visible on md+ screens */}
            <AnimatePresence>
              {isMarsPlaying && (
                <motion.div 
                  initial={{ opacity: 0, x: -10, filter: "blur(4px)" }} 
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} 
                  exit={{ opacity: 0, x: -10, filter: "blur(4px)" }} 
                  className="hidden md:flex bg-slate-900/95 backdrop-blur-xl border border-blue-500/30 px-3 py-1.5 rounded-2xl shadow-xl items-center gap-2 pointer-events-auto"
                >
                  <div className="flex gap-0.5 items-end h-3">
                     {[1,2,3,4].map(i => (
                       <motion.div 
                         key={i} 
                         animate={{ height: [3, 11, 3] }} 
                         transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.12 }} 
                         className="w-0.5 bg-blue-400 rounded-full" 
                       />
                     ))}
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-200 italic whitespace-nowrap">Mars PB 162</span>
                </motion.div>
              )}
            </AnimatePresence>
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
          /* DEDICATED FULL-PAGE VIEW DENGAN DARK MODE KONSISTEN & BOTTOM SPACING UNTUK FLOATING DOCK */
          <div className={`flex flex-col min-h-screen w-full bg-[#070d1a] ${
            ['contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris', 'faq'].includes(activeView)
              ? 'pt-12 sm:pt-14 pb-14 sm:pb-16 h-screen h-dvh overflow-hidden' 
              : 'pt-14 lg:pt-16 pb-28 sm:pb-36'
          }`}>
            <AnimatePresence mode="wait">
              <motion.div 
                key={`dedicated-view-${activeView}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex-grow w-full flex flex-col min-h-0"
              >
                <div className="w-full flex flex-col flex-grow max-w-7xl px-2.5 sm:px-4 md:px-8 mx-auto min-h-0">
                  {/* Render Komponen dengan Props masing-masing */}
                  {(activeView === 'jadwal' || activeView === 'jadwal-latihan' || activeView === 'schedule') && <JadwalLatihanView />}
                  {(activeView === 'kas') && <PublicKasView />}
                  {(activeView === 'quiz') && <BadmintonQuiz />}
                  {(activeView === 'contact' || activeView === 'kontak') && <Contact />}
                  {(activeView === 'struktur' || activeView === 'struktur-organisasi') && <StrukturOrganisasiPublic />}
                  {(activeView === 'dokumen-penting' || activeView === 'dokumen' || activeView === 'documents') && <DokumenPenting />}
                  {(activeView === 'register' || activeView === 'pendaftaran') && <RegistrationForm />}
                  {(activeView === 'peringkat' || activeView === 'rankings' || activeView === 'ranking') && <Ranking />}
                  {(activeView === 'atlet' || activeView === 'players' || activeView === 'player') && <Athletes initialFilter={activeAthleteFilter} />}
                  {(activeView === 'sejarah' || activeView === 'tentang-kami' || activeView === 'about' || activeView === 'tentang') && <Sejarah />}
                  {(activeView === 'visi-misi' || activeView === 'visi' || activeView === 'misi') && <VisiMisi />}
                  {(activeView === 'fasilitas') && <Fasilitas />}
                  {(activeView === 'inventaris' || activeView === 'public-inventaris') && <PublicInventaris />}
                  {(activeView === 'berita' || activeView === 'news') && <News />}
                  {(activeView === 'galeri' || activeView === 'gallery') && <Gallery />}
                  {(activeView === 'faq') && <PublicFAQ />}
                  {(activeView === 'sambutan' || activeView === 'sambutan-ketua') && <SambutanKetua />}
                </div>
              </motion.div>
            </AnimatePresence>
            
            {!['register', 'pendaftaran', 'contact', 'kontak', 'sejarah', 'visi-misi', 'dokumen-penting', 'fasilitas', 'inventaris'].includes(activeView) && <Footer onNavigate={handleNavigate} />}
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
      <UrlSynchronizer activeView={activeView} setActiveView={setActiveView} />
      <audio 
        ref={audioRef} 
        src={MARS_URL} 
        loop 
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration && !isNaN(el.duration)) {
            setMarsProgress((el.currentTime / el.duration) * 100);
            setMarsCurrentTime(el.currentTime);
            setMarsDuration(el.duration);
          }
        }}
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          if (el.duration && !isNaN(el.duration)) {
            setMarsDuration(el.duration);
          }
        }}
      />
      <KasRealtimeNotifier />
      <PwaInstallNotification />
      
      <Routes>
        <Route path="/" element={renderPublicHome()} />
        <Route path="/:viewParam" element={renderPublicHome()} />

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
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const userRole = session?.user?.user_metadata?.role || 'admin';
  const isAdmin = userRole === 'admin';
  const [userFotoUrl, setUserFotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (session?.user) {
        const userMeta = session.user.user_metadata || {};
        const userEmail = session.user.email || '';
        const fullName = userMeta.nama || userMeta.full_name || userEmail.split('@')[0] || '';
        
        if (userMeta.foto_url) {
          setUserFotoUrl(userMeta.foto_url);
          return;
        }
        if (userMeta.avatar_url) {
          setUserFotoUrl(userMeta.avatar_url);
          return;
        }

        try {
          const { data: pendaftaranList } = await supabase
            .from('pendaftaran')
            .select('id, nama, email, whatsapp, foto_url');
          
          if (pendaftaranList && pendaftaranList.length > 0) {
            const metaId = userMeta.id || session.user.id;
            const userLower = fullName.trim().toLowerCase();
            const emailLower = userEmail.trim().toLowerCase();
            const metaWa = (userMeta.whatsapp || '').replace(/[^0-9]/g, '');

            let dbMember = pendaftaranList.find((m: any) => 
              m.id && metaId && (m.id === metaId || `member-${m.id}` === metaId || metaId === `member-${m.id}`)
            );

            if (!dbMember && userLower) {
              dbMember = pendaftaranList.find((m: any) => 
                (m.nama || '').trim().toLowerCase() === userLower
              );
            }

            if (!dbMember && emailLower && !emailLower.endsWith('@pbbilibili162.com')) {
              dbMember = pendaftaranList.find((m: any) => 
                m.email && m.email.toLowerCase() === emailLower
              );
            }

            if (!dbMember && metaWa && metaWa.length >= 6) {
              dbMember = pendaftaranList.find((m: any) => {
                const cleanWa = (m.whatsapp || '').replace(/[^0-9]/g, '');
                return cleanWa && cleanWa.length >= 6 && cleanWa === metaWa;
              });
            }

            if (!dbMember && userLower && userLower.length >= 3) {
              dbMember = pendaftaranList.find((m: any) => {
                const mNama = (m.nama || '').trim().toLowerCase();
                return mNama && (mNama.includes(userLower) || userLower.includes(mNama));
              });
            }

            if (dbMember?.foto_url) {
              setUserFotoUrl(dbMember.foto_url);
            }
          }
        } catch (err) {
          console.error('Error fetching profile photo in AdminLayout:', err);
        }
      }
    };

    fetchProfilePhoto();

    const handleProfileUpdate = () => {
      fetchProfilePhoto();
    };
    window.addEventListener('local-session-changed', handleProfileUpdate);
    return () => {
      window.removeEventListener('local-session-changed', handleProfileUpdate);
    };
  }, [session]);

  return (
    <div className="flex h-screen w-full bg-[#070d1a] overflow-hidden relative">
      <PresenceManager session={session} />
      <Sidebar email={session?.user?.email || ''} role={userRole} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <ScheduleWidget />
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-[#0F172A] px-4 py-2.5 border-b border-slate-800/80 sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="text-slate-300 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition-colors active:scale-95"
              aria-label="Buka Menu"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <img 
                src="/logo_pb_bilibili_162.svg" 
                alt="Logo" 
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  e.currentTarget.src = "/logo_pb_bilibili_162.svg";
                }}
              />
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-tight text-white leading-none">PB BILIBILI 162</span>
                <span className="text-[7.5px] font-bold text-blue-400 uppercase tracking-widest mt-0.5 leading-none">
                  {isAdmin ? 'Admin Console' : 'Portal Anggota'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <a 
              href="/" 
              className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition-all active:scale-95 flex items-center justify-center"
              title="Ke Website Utama"
            >
              <ExternalLink size={16} />
            </a>
            <button 
              onClick={() => navigate('/admin/profil')}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-black border border-blue-400/30 shadow-md shadow-blue-900/30 active:scale-95 transition-transform overflow-hidden"
              title="Profil Saya"
            >
              {userFotoUrl ? (
                <img 
                  src={userFotoUrl} 
                  alt="Profil" 
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setUserFotoUrl(null)}
                />
              ) : (
                session?.user?.email?.charAt(0).toUpperCase() || (isAdmin ? 'A' : 'M')
              )}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#070d1a] custom-scrollbar">
          <Routes>
            {/* Accessible to both Anggota & Admin */}
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="profil" element={<ProfilAnggota session={session} />} />
            <Route path="notifications" element={<FcmSettingsDashboard />} />
            <Route path="pwa-apk" element={<PwaApkManager userRole={userRole} />} />
            <Route path="analisis-performa" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><AnalisisPerforma /></div>} />
            <Route path="rapor-atlet" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><RaporAtlet isAdmin={isAdmin} /></div>} />
            <Route path="live-score" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><LiveScoreWidget isAdmin={isAdmin} /></div>} />
            <Route path="testimoni" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><TestimonialUlasan isAdmin={isAdmin} /></div>} />
            <Route path="turnamen-liga" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><TournamentLeague isAdmin={isAdmin} /></div>} />
            <Route path="jadwal" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><JadwalLatihanView /></div>} />
            <Route path="jadwal-latihan" element={<div className="p-4 md:p-8 max-w-7xl mx-auto"><JadwalLatihanView /></div>} />
            <Route path="kas" element={isAdmin ? <KasManager /> : <div className="p-1 xs:p-2 sm:p-4 md:p-8 max-w-7xl mx-auto"><PublicKasView /></div>} />
            <Route path="rekap-keuangan" element={<AdminRekapKeuangan isAdmin={isAdmin} session={session} />} />
            <Route path="ranking" element={isAdmin ? <AdminRanking session={session} /> : <div className="p-4 md:p-8 max-w-7xl mx-auto"><Ranking /></div>} />
            <Route path="skor" element={<AdminMatch session={session} />} />
            <Route path="berita" element={isAdmin ? <AdminBerita session={session} /> : <div className="p-4 md:p-8 max-w-7xl mx-auto"><News /></div>} />
            <Route path="galeri" element={isAdmin ? <AdminGallery session={session} /> : <div className="p-4 md:p-8 max-w-7xl mx-auto"><Gallery /></div>} />
            <Route path="dokumen" element={isAdmin ? <ManajemenDokumen session={session} /> : <div className="p-4 md:p-8 max-w-7xl mx-auto"><DokumenPenting /></div>} /> 

            {/* Admin Only Routes - Redirect Anggota to Dashboard */}
            <Route path="users" element={isAdmin ? <AdminUsers session={session} /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="pendaftaran" element={isAdmin ? <ManajemenPendaftaran /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="atlet" element={isAdmin ? <ManajemenAtlet /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="surat" element={isAdmin ? <KelolaSurat /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="poin" element={isAdmin ? <ManajemenPoin /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="audit-poin" element={isAdmin ? <AuditLogPoin /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="kontak" element={isAdmin ? <AdminContact /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="navbar" element={isAdmin ? <KelolaNavbar /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="laporan" element={isAdmin ? <AdminLaporan /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="logs" element={isAdmin ? <AdminLogs /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="tampilan" element={isAdmin ? <AdminTampilan /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="hero" element={isAdmin ? <KelolaHero /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="popup" element={isAdmin ? <AdminPopup /> : <Navigate to="/admin/dashboard" replace />} /> 
            <Route path="footer" element={isAdmin ? <AdminFooter /> : <Navigate to="/admin/dashboard" replace />} />
            
            <Route path="sejarah" element={isAdmin ? <AdminSejarah /> : <div className="p-4 sm:p-6"><Sejarah /></div>} />
            <Route path="absensi" element={isAdmin ? <AdminAbsensi session={session} /> : <Navigate to="/admin/dashboard" replace />} />
            <Route path="inventaris" element={isAdmin ? <AdminInventaris /> : <PublicInventaris />} />
            <Route path="prestasi" element={isAdmin ? <AdminPrestasi /> : <div className="p-4 sm:p-6"><PublicPrestasi /></div>} />
            <Route path="faq" element={isAdmin ? <AdminFAQ /> : <div className="p-4 sm:p-6"><PublicFAQ /></div>} />
            <Route path="program" element={isAdmin ? <AdminProgram /> : <div className="p-4 sm:p-6"><PublicProgram onNavigate={()=>{}} /></div>} />

            <Route path="visi-misi" element={isAdmin ? <AdminVisiMisi /> : <div className="p-4 sm:p-6"><VisiMisi /></div>} />
            <Route path="fasilitas" element={isAdmin ? <AdminFasilitas /> : <div className="p-4 sm:p-6"><Fasilitas /></div>} />
            <Route path="struktur" element={isAdmin ? <AdminStructure /> : <div className="p-4 sm:p-6"><StrukturOrganisasiPublic /></div>} /> 
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}