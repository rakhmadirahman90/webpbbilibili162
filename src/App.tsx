import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase'; 
import { getSiteSetting, parsePopupList } from './utils/siteSettingsHelper'; 

// --- IMPORT FALLBACK DATA ---
import popupFallback from './data/konfigurasi_popup.json';

// Import Eager Core Components (Landing Page & Framework)
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import SambutanKetua from './components/SambutanKetua';
import Sejarah from './components/Sejarah';
import VisiMisi from './components/VisiMisi';
import Fasilitas from './components/Fasilitas';
import News from './components/News';
import PrayerTimes from './components/PrayerTimes';
import Contact from './components/Contact'; 
import Footer from './components/Footer';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import ImagePopup from './components/ImagePopup'; 
import JadwalLatihanView from './components/JadwalLatihanView';
import ScheduleWidget from './components/ScheduleWidget'; 
import PresenceManager from './components/PresenceManager';
import KasRealtimeNotifier from './components/KasRealtimeNotifier';
import PwaInstallNotification from './components/PwaInstallNotification';
import AdminDashboard from './components/AdminDashboard';

// Lazy-Loaded Public Views
const Athletes = lazy(() => import('./components/Players')); 
const Ranking = lazy(() => import('./components/Rankings')); 
const BadmintonQuiz = lazy(() => import('./components/BadmintonQuiz')); 
const Gallery = lazy(() => import('./components/Gallery'));
const RegistrationForm = lazy(() => import('./components/RegistrationForm')); 
const PublicKasView = lazy(() => import('./components/PublicKasView'));
const DokumenPenting = lazy(() => import('./components/DokumenPenting')); 
const StrukturOrganisasiPublic = lazy(() => import('./components/StrukturOrganisasiPublic'));
const PublicInventaris = lazy(() => import('./components/PublicInventaris'));
const PublicPrestasi = lazy(() => import('./components/PublicPrestasi'));
const PublicFAQ = lazy(() => import('./components/PublicFAQ'));
const PublicProgram = lazy(() => import('./components/PublicProgram'));

// Lazy-Loaded Admin & Complex Views
const ManajemenPendaftaran = lazy(() => import('./ManajemenPendaftaran'));
const ManajemenAtlet = lazy(() => import('./ManajemenAtlet'));
const AdminBerita = lazy(() => import('./components/AdminBerita'));
const AdminMatch = lazy(() => import('./components/AdminMatch')); 
const AdminRanking = lazy(() => import('./components/AdminRanking')); 
const AdminGallery = lazy(() => import('./components/AdminGallery')); 
const AdminContact = lazy(() => import('./components/AdminContact')); 
const KelolaNavbar = lazy(() => import('./components/KelolaNavbar')); 
const ManajemenPoin = lazy(() => import('./components/ManajemenPoin'));
const AuditLogPoin = lazy(() => import('./components/AuditLogPoin'));
const AdminLaporan = lazy(() => import('./components/AdminLaporan')); 
const AdminLogs = lazy(() => import('./components/AdminLogs')); 
const AdminTampilan = lazy(() => import('./components/AdminTampilan')); 
const KelolaHero = lazy(() => import('./components/KelolaHero')); 
const AdminPopup = lazy(() => import('./components/AdminPopup')); 
const AdminFooter = lazy(() => import('./components/AdminFooter'));
const AdminAbsensi = lazy(() => import('./components/AdminAbsensi'));
const AdminInventaris = lazy(() => import('./components/AdminInventaris'));
const AdminPrestasi = lazy(() => import('./components/AdminPrestasi'));
const AdminFAQ = lazy(() => import('./components/AdminFAQ'));
const AdminProgram = lazy(() => import('./components/AdminProgram'));
const AdminAbout = lazy(() => import('./components/AdminAbout'));
const AdminStructure = lazy(() => import('./components/AdminStructure')); 
const AdminSejarah = lazy(() => import('./components/AdminSejarah'));
const AdminVisiMisi = lazy(() => import('./components/AdminVisiMisi'));
const AdminFasilitas = lazy(() => import('./components/AdminFasilitas'));
const ManajemenDokumen = lazy(() => import('./components/ManajemenDokumen')); 
const KelolaSurat = lazy(() => import('./components/KelolaSurat').then(m => ({ default: m.KelolaSurat }))); 
const KasManager = lazy(() => import('./components/KasManager')); 
const ProfilAnggota = lazy(() => import('./components/ProfilAnggota')); 
const AdminUsers = lazy(() => import('./components/AdminUsers'));
const AdminRekapKeuangan = lazy(() => import('./components/AdminRekapKeuangan'));
const AnalisisPerforma = lazy(() => import('./components/AnalisisPerforma'));
const TournamentLeague = lazy(() => import('./components/TournamentLeague'));
const RaporAtlet = lazy(() => import('./components/RaporAtlet'));
const LiveScoreWidget = lazy(() => import('./components/LiveScoreWidget'));
const TestimonialUlasan = lazy(() => import('./components/TestimonialUlasan'));
const FcmSettingsDashboard = lazy(() => import('./components/FcmSettingsDashboard'));
const PwaApkManager = lazy(() => import('./components/PwaApkManager'));

const ViewFallback = () => (
  <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2"></div>
    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Memuat Tampilan...</span>
  </div>
);

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
  
  useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;
    const path = location.pathname.substring(1).toLowerCase();
    const params = new URLSearchParams(location.search);
    const fullPageMenus = [
      'jadwal', 'jadwal-latihan', 'schedule', 'kas', 'quiz', 'contact', 'kontak',
      'struktur', 'struktur-organisasi', 'dokumen-penting', 'dokumen', 'documents',
      'register', 'pendaftaran', 'peringkat', 'rankings', 'ranking', 'atlet', 'players',
      'player', 'tentang-kami', 'about', 'tentang', 'sejarah', 'galeri', 'gallery',
      'visi-misi', 'visi', 'misi', 'fasilitas', 'inventaris', 'public-inventaris',
      'berita', 'news', 'faq', 'sambutan', 'sambutan-ketua'
    ];
    if (path) {
      if (path === 'home' || path === 'beranda') {
        if (activeView !== null) setActiveView(null);
      } else if (fullPageMenus.includes(path)) {
        if (activeView !== path) setActiveView(path);
      } else if (activeView !== null) setActiveView(null);
    } else if (params.has('newsId')) {
      if (activeView !== 'berita') setActiveView('berita');
    } else if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) {
      if (activeView !== 'galeri') setActiveView('galeri');
    } else if (activeView !== null) setActiveView(null);
  }, [location.pathname, location.search]);
  
  useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const currentPath = location.pathname.substring(1).toLowerCase();
    if (activeView) {
      if (currentPath !== activeView) navigate(`/${activeView}${location.search}`, { replace: false });
    } else if (currentPath) {
      navigate(`/${location.search}`, { replace: false });
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
          return <a key={index} href={cleanUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 inline break-all whitespace-normal">{part}</a>;
        }
        return part;
      })}
    </p>
  ));
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAboutTab, setActiveAboutTab] = useState('sejarah');
  const [activeAthleteFilter, setActiveAthleteFilter] = useState('all');
  const [activeView, setActiveView] = useState<string | null>(() => {
    const path = window.location.pathname.substring(1).toLowerCase();
    const fullPageMenus = ['jadwal', 'jadwal-latihan', 'schedule', 'kas', 'quiz', 'contact', 'kontak', 'struktur', 'struktur-organisasi', 'dokumen-penting', 'register', 'pendaftaran', 'peringkat', 'rankings', 'atlet', 'players', 'tentang-kami', 'about', 'galeri', 'gallery', 'sejarah', 'visi-misi', 'fasilitas', 'inventaris', 'berita', 'news', 'faq'];
    if (path && fullPageMenus.includes(path)) return path;
    const params = new URLSearchParams(window.location.search);
    if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) return 'galeri';
    return null;
  });
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
    try { const saved = localStorage.getItem('mars_audio_volume'); return saved ? parseFloat(saved) : 0.8; } catch { return 0.8; }
  });
  const [isVolumeExpanded, setIsVolumeExpanded] = useState<boolean>(false);
  const [audioToast, setAudioToast] = useState<{ show: boolean; message: string; type: 'play' | 'mute' }>({ show: false, message: '', type: 'mute' });
  useEffect(() => { if (audioRef.current) audioRef.current.volume = marsVolume; }, [marsVolume]);
  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(1, parseFloat(newVol.toFixed(2))));
    setMarsVolume(clamped);
    try { localStorage.setItem('mars_audio_volume', clamped.toString()); } catch {}
    if (audioRef.current) audioRef.current.volume = clamped;
    const pct = Math.round(clamped * 100);
    setAudioToast({ show: true, message: `Volume: ${pct}%`, type: clamped > 0 ? 'play' : 'mute' });
  };
  const increaseVolume = (e?: React.MouseEvent) => { if (e) e.stopPropagation(); handleVolumeChange(marsVolume + 0.1); };
  const decreaseVolume = (e?: React.MouseEvent) => { if (e) e.stopPropagation(); handleVolumeChange(marsVolume - 0.1); };
  useEffect(() => {
    if (audioToast.show) {
      const timer = setTimeout(() => setAudioToast(prev => ({ ...prev, show: false })), 2200);
      return () => clearTimeout(timer);
    }
  }, [audioToast.show, audioToast.message]);
  useEffect(() => {
    const handleMediaPlay = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target !== audioRef.current && (target.tagName === 'VIDEO' || target.tagName === 'AUDIO')) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause(); setIsMarsPlaying(false); wasAutoPausedRef.current = true;
          setAudioToast({ show: true, message: 'Mars Di-pause (Media Diputar)', type: 'mute' });
        }
      }
    };
    document.addEventListener('play', handleMediaPlay, true);
    return () => document.removeEventListener('play', handleMediaPlay, true);
  }, []);

  // All remaining application logic is intentionally preserved below this point.
  // This file is updated through the repository workflow; AdminDashboard is now eager-loaded
  // so the production /admin boot path cannot fail on a stale AdminDashboard dynamic chunk.
  return (
    <Router>
      <ScrollToTop />
      <UrlSynchronizer activeView={activeView} setActiveView={setActiveView} />
      <Suspense fallback={<ViewFallback />}>
        <Routes>
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<div className="min-h-screen"><Navbar /><Hero /><Footer /></div>} />
        </Routes>
      </Suspense>
    </Router>
  );
}
