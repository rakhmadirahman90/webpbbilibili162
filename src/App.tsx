import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import { getSiteSetting } from './utils/siteSettingsHelper';
import { preloadPublicExperience, preloadAdminExperience } from './utils/routePreload';
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
import ImagePopup from './components/ImagePopup';
import JadwalLatihanView from './components/JadwalLatihanView';
import AdminDashboard from './components/AdminDashboard';

const Athletes = lazy(() => import('./components/Players'));
const Ranking = lazy(() => import('./components/Rankings'));
const BadmintonQuiz = lazy(() => import('./components/BadmintonQuiz'));
const Gallery = lazy(() => import('./components/Gallery'));
const RegistrationForm = lazy(() => import('./components/RegistrationForm'));
const PendaftaranTurnamen = lazy(() => import('./components/PendaftaranTurnamen'));
const PublicKasView = lazy(() => import('./components/PublicKasView'));
const DokumenPenting = lazy(() => import('./components/DokumenPenting'));
const StrukturOrganisasiPublic = lazy(() => import('./components/StrukturOrganisasiPublic'));
const PublicInventaris = lazy(() => import('./components/PublicInventaris'));
const PublicPrestasi = lazy(() => import('./components/PublicPrestasi'));
const PublicSeededPeserta = lazy(() => import('./components/PublicSeededPeserta'));
const PublicFAQ = lazy(() => import('./components/PublicFAQ'));
const PublicProgram = lazy(() => import('./components/PublicProgram'));

const ViewFallback = () => (
  <div className="w-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
    <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Memuat Tampilan...</span>
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function UrlSynchronizer({ activeView, setActiveView }: { activeView: string | null; setActiveView: (view: string | null) => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isInitialMount = useRef(true);
  const fullPageMenus = useRef(new Set([
    'jadwal','jadwal-latihan','schedule','kas','quiz','contact','kontak',
    'struktur','struktur-organisasi','dokumen-penting','dokumen','documents',
    'register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta',
    'peringkat','rankings','ranking','atlet','players','player',
    'tentang-kami','about','tentang','sejarah','galeri','gallery',
    'visi-misi','visi','misi','fasilitas','inventaris','public-inventaris',
    'berita','news','faq','sambutan','sambutan-ketua','prestasi','program'
  ])).current;

  useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;
    const path = location.pathname.substring(1).toLowerCase().replace(/\/$/, '');
    const params = new URLSearchParams(location.search);
    if (!path) {
      if (params.has('newsId')) setActiveView('berita');
      else if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) setActiveView('galeri');
      else setActiveView(null);
      return;
    }
    if (path === 'home' || path === 'beranda') setActiveView(null);
    else if (fullPageMenus.has(path)) setActiveView(path);
    else setActiveView(null);
  }, [location.pathname, location.search, setActiveView, fullPageMenus]);

  useEffect(() => {
    if (location.pathname.startsWith('/login') || location.pathname.startsWith('/admin')) return;
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const currentPath = location.pathname.substring(1).toLowerCase().replace(/\/$/, '');
    const desired = activeView || '';
    if (desired === 'pendaftaran-turnamen') {
      if (currentPath !== desired) navigate('/pendaftaran-turnamen', { replace: false });
      return;
    }
    if (desired && currentPath !== desired) navigate(`/${desired}${location.search}`, { replace: false });
    else if (!desired && currentPath) navigate(`/${location.search}`, { replace: false });
  }, [activeView, navigate, location.pathname, location.search]);

  return null;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeAboutTab, setActiveAboutTab] = useState('sejarah');
  const [activeAthleteFilter, setActiveAthleteFilter] = useState('all');
  const [activeView, setActiveView] = useState<string | null>(() => {
    const path = window.location.pathname.substring(1).toLowerCase().replace(/\/$/, '');
    const supported = new Set(['jadwal','jadwal-latihan','schedule','kas','quiz','contact','kontak','struktur','struktur-organisasi','dokumen-penting','dokumen','documents','register','pendaftaran','pendaftaran-turnamen','pendaftaran/seeded-peserta','peringkat','rankings','ranking','atlet','players','player','tentang-kami','about','tentang','sejarah','galeri','gallery','visi-misi','visi','misi','fasilitas','inventaris','public-inventaris','berita','news','faq','sambutan','sambutan-ketua','prestasi','program']);
    if (supported.has(path)) return path;
    const params = new URLSearchParams(window.location.search);
    if (params.has('newsId')) return 'berita';
    if (params.has('gallery') || params.has('galleryId') || params.has('photoId') || params.has('videoId')) return 'galeri';
    return null;
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOverlayActive, setIsOverlayActive] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMarsPlaying, setIsMarsPlaying] = useState(false);
  const [marsVolume, setMarsVolume] = useState<number>(() => {
    try { const saved = localStorage.getItem('mars_audio_volume'); return saved ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.8; } catch { return 0.8; }
  });

  useEffect(() => {
    preloadPublicExperience(getSiteSetting);
  }, []);

  useEffect(() => {
    if (session) preloadAdminExperience(getSiteSetting);
  }, [session]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session || null); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    const { data: auth } = supabase.auth.onAuthStateChange((_event, s) => setSession(s || null));
    return () => { active = false; auth.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOverlayActive(true);
    const handleClose = () => setIsOverlayActive(false);
    window.addEventListener('pb-overlay-open', handleOpen);
    window.addEventListener('pb-overlay-close', handleClose);
    return () => { window.removeEventListener('pb-overlay-open', handleOpen); window.removeEventListener('pb-overlay-close', handleClose); };
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = marsVolume; }, [marsVolume]);

  const handleNavigate = (sectionId: string, subPath?: string) => {
    const main = String(sectionId || '').toLowerCase().trim();
    const sub = String(subPath || '').toLowerCase().trim();
    const aliases: Record<string, string> = {
      beranda: 'home', home: 'home', gallery: 'galeri', galeri: 'galeri',
      rankings: 'peringkat', ranking: 'peringkat', 'ranking-atlet': 'peringkat',
      players: 'atlet', player: 'atlet', register: 'register', pendaftaran: 'register',
      'pendaftaran turnamen': 'pendaftaran-turnamen', 'pendaftaran-turnamen': 'pendaftaran-turnamen',
      seeded: 'pendaftaran/seeded-peserta', 'seeded-peserta': 'pendaftaran/seeded-peserta',
      about: 'sejarah', 'tentang-kami': 'sejarah', sejarah: 'sejarah',
      visi: 'visi-misi', misi: 'visi-misi', 'visi-misi': 'visi-misi',
      struktur: 'struktur-organisasi', 'struktur-organisasi': 'struktur-organisasi',
      dokumen: 'dokumen-penting', 'dokumen-penting': 'dokumen-penting',
      berita: 'berita', news: 'berita', prestasi: 'prestasi', program: 'program',
      fasilitas: 'fasilitas', inventaris: 'inventaris', faq: 'faq', quiz: 'quiz',
      jadwal: 'jadwal', 'jadwal-latihan': 'jadwal', schedule: 'jadwal',
      contact: 'contact', kontak: 'contact', kas: 'kas', sambutan: 'sambutan', 'sambutan-ketua': 'sambutan'
    };
    const targetRaw = sub || main || 'home';
    const target = aliases[targetRaw] || targetRaw;
    if (!target || target === 'home') { setActiveView(null); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setActiveView(target);
  };

  const renderPublicView = () => {
    switch (activeView) {
      case 'atlet': case 'players': case 'player': return <Athletes />;
      case 'peringkat': case 'rankings': case 'ranking': return <Ranking />;
      case 'quiz': return <BadmintonQuiz />;
      case 'galeri': case 'gallery': return <Gallery />;
      case 'register': case 'pendaftaran': return <RegistrationForm />;
      case 'kas': return <PublicKasView />;
      case 'dokumen-penting': case 'dokumen': case 'documents': return <DokumenPenting />;
      case 'struktur': case 'struktur-organisasi': return <StrukturOrganisasiPublic />;
      case 'inventaris': case 'public-inventaris': return <PublicInventaris />;
      case 'prestasi': return <PublicPrestasi />;
      case 'faq': return <PublicFAQ />;
      case 'program': return <PublicProgram />;
      case 'jadwal': case 'jadwal-latihan': case 'schedule': return <JadwalLatihanView />;
      case 'contact': case 'kontak': return <Contact />;
      case 'sejarah': case 'about': case 'tentang': case 'tentang-kami': return <Sejarah />;
      case 'visi-misi': case 'visi': case 'misi': return <VisiMisi />;
      case 'fasilitas': return <Fasilitas />;
      case 'berita': case 'news': return <News />;
      case 'sambutan': case 'sambutan-ketua': return <SambutanKetua />;
      default:
        return <><Hero /><SambutanKetua /><Sejarah /><VisiMisi /><Fasilitas /><News /><PrayerTimes /><Contact /></>;
    }
  };

  const renderPublicShell = () => (
    <div className="min-h-screen bg-[#0b0e14] w-full overflow-x-hidden">
      <ImagePopup activeView={activeView} />
      <Navbar onNavigate={handleNavigate} />
      <main className={activeView ? 'min-h-screen pt-16 pb-24' : ''}>
        <Suspense fallback={<ViewFallback />}>{renderPublicView()}</Suspense>
      </main>
      {!['register','pendaftaran','pendaftaran-turnamen'].includes(activeView || '') && <Footer onNavigate={handleNavigate} />}
      <audio ref={audioRef} preload="metadata" aria-hidden="true" />
    </div>
  );

  if (loading) return <div className="min-h-screen bg-[#070d1a] flex items-center justify-center text-slate-300">Memuat aplikasi...</div>;

  return (
    <Router>
      <ScrollToTop />
      <UrlSynchronizer activeView={activeView} setActiveView={setActiveView} />
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pendaftaran-turnamen" element={<PendaftaranTurnamen />} />
        <Route path="/pendaftaran/seeded-peserta" element={<PublicSeededPeserta />} />
        <Route path="*" element={renderPublicShell()} />
      </Routes>
    </Router>
  );
}
