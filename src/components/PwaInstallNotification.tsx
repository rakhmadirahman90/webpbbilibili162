import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PwaInstallNotification() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 3. Listen for beforeinstallprompt event (Android / Chrome / Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto show banner after 1.5s if not previously dismissed in this session
      const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
      if (!dismissed) {
        setTimeout(() => {
          setIsVisible(true);
        }, 1500);
      } else {
        setIsMinimized(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setIsMinimized(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fallback timer for iOS & browsers where beforeinstallprompt doesn't fire
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (!dismissed && !checkStandalone()) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (dismissed) {
      setIsMinimized(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsVisible(false);
        setIsMinimized(false);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      // Navigate to full APK & PWA Manager page
      navigate('/admin/pwa-apk');
      setIsVisible(false);
      setIsMinimized(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsMinimized(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <>
      {/* 1. FLOATING INSTALL BANNER / NOTIFICATION */}
      {isVisible && (
        <div className="fixed bottom-16 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-md z-[9999] bg-[#0c1427]/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-indigo-500/30 animate-in slide-in-from-bottom-6 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900/90 border border-blue-500/40 p-1 shadow-lg shadow-blue-500/20 shrink-0 relative overflow-hidden flex items-center justify-center">
                <img 
                  src="/logo_pb_bilibili_162.svg" 
                  alt="PB Bilibili 162 App" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = "/logo_pb_bilibili_162.png";
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-sm text-white tracking-tight">PB BILIBILI 162</h4>
                  <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded tracking-wider border border-emerald-500/30">
                    Aplikasi Resmi
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                  Pasang aplikasi di HP/Desktop Anda untuk akses lebih cepat &amp; fitur realtime offline.
                </p>
              </div>
            </div>

            <button 
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              aria-label="Tutup Notifikasi"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => {
                navigate('/admin/pwa-apk');
                setIsVisible(false);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Info &amp; APK</span>
              <ChevronRight size={13} />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Smartphone size={15} className="text-blue-200" />
                <span>{deferredPrompt ? 'Install Sekarang' : isIos ? 'Petunjuk iOS' : 'Install / File APK'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PERSISTENT FLOATING BADGE (When minimized or dismissed) */}
      {!isVisible && isMinimized && (
        <button
          onClick={() => setIsVisible(true)}
          className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[9998] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white w-10 h-10 sm:w-auto sm:px-4 sm:py-2.5 rounded-full shadow-[0_8px_25px_rgba(79,70,229,0.45)] border border-white/20 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 group cursor-pointer backdrop-blur-md relative"
          title="Install / Informasi Aplikasi PB Bilibili 162"
          aria-label="Install / Informasi Aplikasi PB Bilibili 162"
        >
          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone size={13} className="text-white group-hover:rotate-12 transition-transform" />
          </div>
          <span className="hidden sm:inline text-xs font-black tracking-wide uppercase">Install App</span>
          <span className="sm:hidden absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-400 rounded-full border-2 border-[#0c1427] animate-pulse" />
        </button>
      )}

      {/* 3. iOS INSTALLATION GUIDE MODAL */}
      {showIosGuide && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-[#0c1427] border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-0.5 shadow-md shrink-0">
                <img src="/pwa-192x192.png" alt="PB 162" className="w-full h-full object-cover rounded-[10px]" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Install di iPhone / iPad</h3>
                <p className="text-xs text-blue-400">Petunjuk PWA Safari Browser</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Perangkat iOS (Apple) memerlukan langkah manual berikut dari Safari:
            </p>

            <div className="space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Ketuk tombol Share <Share size={14} className="text-blue-400" /> di Safari
                  </p>
                  <p className="text-slate-400 text-[11px]">Terletak di bagian bawah layar iPhone Anda.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                <div>
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    Pilih &quot;Tambah ke Layar Utama&quot; <PlusSquare size={14} className="text-blue-400" />
                  </p>
                  <p className="text-slate-400 text-[11px]">Scroll ke bawah di menu opsi Safari.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 pt-2 border-t border-slate-800">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">3</div>
                <div>
                  <p className="font-semibold text-white">Ketuk &quot;Tambah&quot; di sudut kanan atas</p>
                  <p className="text-slate-400 text-[11px]">Aplikasi PB Bilibili 162 kini muncul di layar utama iPhone Anda.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
