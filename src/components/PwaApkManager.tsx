import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { saveSiteSetting } from '../utils/siteSettingsHelper';
import { 
  Smartphone, 
  Download, 
  Share2, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Copy, 
  Check, 
  HelpCircle,
  Apple,
  Chrome,
  Globe,
  Upload,
  Link as LinkIcon,
  Save,
  MessageCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface PwaApkManagerProps {
  userRole?: string;
}

export default function PwaApkManager({ userRole = 'member' }: PwaApkManagerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apkUrl, setApkUrl] = useState<string>('');
  const [savingUrl, setSavingUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'apk' | 'guide'>('install');

  const isAdmin = userRole === 'admin';
  const OFFICIAL_APP_URL = 'https://pbilibili162.99apps.id';
  const [targetUrl, setTargetUrl] = useState<string>(OFFICIAL_APP_URL);

  const currentAppUrl = targetUrl;

  // Detect PWA install prompt & standalone mode
  useEffect(() => {
    // Check if running as PWA / Standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      Swal.fire({
        title: 'Berhasil Diinstall!',
        text: 'Aplikasi PB Bilibili 162 telah ditambahkan ke layar utama HP Anda.',
        icon: 'success',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#10B981'
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Fetch custom APK link set by Admin if any
    fetchApkUrl();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const fetchApkUrl = async () => {
    try {
      const { data } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'custom_apk_url')
        .maybeSingle();

      if (data && data.value) {
        const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        setApkUrl(val.url || '');
      }
    } catch (e) {
      console.error('Failed to load custom APK URL:', e);
    }
  };

  const handleSaveApkUrl = async () => {
    setSavingUrl(true);
    try {
      const { error } = await saveSiteSetting('custom_apk_url', JSON.stringify({ url: apkUrl, updated_at: new Date().toISOString() }));

      if (error) throw error;

      Swal.fire({
        title: 'Tersimpan!',
        text: 'Link unduhan langsung APK berhasil diperbarui.',
        icon: 'success',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#10B981'
      });
    } catch (err: any) {
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.message || 'Terjadi kesalahan saat menyimpan link APK.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setSavingUrl(false);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      Swal.fire({
        title: 'Petunjuk Install Manual',
        html: `
          <div class="text-left space-y-3 text-sm text-slate-300">
            <p><strong>Di Android (Google Chrome):</strong><br/>1. Ketuk titik tiga <strong>(⋮)</strong> di sudut kanan atas.<br/>2. Pilih <strong>"Install Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</p>
            <hr class="border-slate-800"/>
            <p><strong>Di iPhone / iPad (Safari):</strong><br/>1. Ketuk tombol Bagikan <strong>(Share/Atas-Bawah)</strong>.<br/>2. Gulir ke bawah lalu pilih <strong>"Add to Home Screen" (Tambahkan ke Layar Utama)</strong>.</p>
          </div>
        `,
        icon: 'info',
        background: '#0F172A',
        color: '#fff',
        confirmButtonColor: '#3B82F6'
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToWhatsApp = () => {
    const text = `🏸 *APLIKASI RESMI PB BILIBILI 162*\n\nHalo Rekan-rekan PB Bilibili 162! Mari install Aplikasi Web Resmi kami langsung ke layar utama HP Anda (Android/iOS) tanpa perlu download file besar:\n\n🌐 *Buka URL:* ${currentAppUrl}\n\n✨ *Fitur Aplikasi:*\n• Klasemen & Poin Peringkat Realtime\n• Catatan Kas Club & Rekap Iuran\n• Live Score & Rapor Atlet\n• Jadwal Sholat & Pengumuman\n\n📌 *Cara Install:* Buka link di atas melalui Google Chrome/Safari, pilih menu (⋮) -> *Install Aplikasi / Tambahkan ke Layar Utama*!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const pwabuilderUrl = `https://www.pwabuilder.com/build?url=${encodeURIComponent(currentAppUrl)}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Progressive Web App (PWA) & APK Mobile
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Aplikasi Mobile PB Bilibili 162
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Gunakan sistem PWA untuk menginstall aplikasi langsung di HP Android/iOS seperti aplikasi Play Store, atau generate file <span className="text-indigo-400 font-semibold">.APK</span> via Web Wrapper untuk dibagikan ke grup WhatsApp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleShareToWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-950/50"
            >
              <MessageCircle className="w-4 h-4" /> Bagikan ke WA
            </button>
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-950/50"
            >
              <Smartphone className="w-4 h-4" /> {isInstalled ? 'Aplikasi Terinstall' : 'Install PWA Sekarang'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('install')}
          className={`pb-3 px-4 font-bold text-xs transition border-b-2 flex items-center gap-2 ${
            activeTab === 'install'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" /> Install PWA (Rekomendasi)
        </button>
        <button
          onClick={() => setActiveTab('apk')}
          className={`pb-3 px-4 font-bold text-xs transition border-b-2 flex items-center gap-2 ${
            activeTab === 'apk'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Download className="w-4 h-4" /> File .APK & Web Wrapper
        </button>
        <button
          onClick={() => setActiveTab('guide')}
          className={`pb-3 px-4 font-bold text-xs transition border-b-2 flex items-center gap-2 ${
            activeTab === 'guide'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Panduan & Cara Penggunaan
        </button>
      </div>

      {/* TAB 1: INSTALL PWA */}
      {activeTab === 'install' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Direct PWA */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalasi PWA 1-Click</h3>
                <p className="text-xs text-slate-400">Aplikasi tanpa perlu download dari Play Store</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Teknologi Progressive Web App (PWA) membuat website PB Bilibili 162 dapat diinstall langsung di layar utama smartphone Android maupun iOS. Aplikasi akan tampil <span className="text-indigo-400 font-semibold">layaknya aplikasi native</span> tanpa address bar browser.
            </p>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Status PWA di HP Anda:</span>
                {isInstalled ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Terinstall (Standalone)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px]">
                    Siap Diinstall
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50"
            >
              <Smartphone className="w-4 h-4" />
              {deferredPrompt ? 'Install Aplikasi Sekarang (Otomatis)' : 'Buka Petunjuk Install PWA'}
            </button>
          </div>

          {/* Card Keunggulan PWA */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Keunggulan Aplikasi PWA:
            </h3>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Ringan & Hemat Penyimpanan:</strong> Ukuran di bawah 2MB (tidak membebani memori HP).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Selalu Terupdate Realtime:</strong> Tidak perlu repot update manual via Play Store.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Akses Cepat dari Icon Layar Utama:</strong> Membuka aplikasi secara full screen layaknya APK native.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Kompatibel Semua HP:</strong> Mendukung Android, iPhone/iPad, Tablet, hingga Laptop/PC.</span>
              </li>
            </ul>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">Bagikan URL Aplikasi:</span>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Tersalin!' : 'Salin URL'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FILE APK & WEB WRAPPER */}
      {activeTab === 'apk' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* PWABuilder Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Buat APK via PWABuilder (Rekomendasi Resmi)</h3>
                  <p className="text-xs text-slate-400">Generator Web Wrapper resmi dari Microsoft</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Anda dapat mengubah Web App PB Bilibili 162 menjadi file <span className="font-semibold text-purple-400">.APK (Android Package)</span> atau <span className="font-semibold text-purple-400">.AAB (Google Play Bundle)</span> secara gratis dalam 1 menit menggunakan layanan PWABuilder (Trusted Web Activity wrapper).
              </p>

              <ol className="list-decimal list-inside space-y-1 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <li>Klik tombol di bawah untuk membuka PWABuilder.</li>
                <li>Sistem PWABuilder akan memverifikasi manifest PWA situs ini.</li>
                <li>Klik tombol <strong>"Package for Android"</strong>.</li>
                <li>Unduh file <strong>.apk</strong> untuk dikirim ke WhatsApp / di-upload ke Play Store!</li>
              </ol>

              <a
                href={pwabuilderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-purple-950/50"
              >
                <ExternalLink className="w-4 h-4" /> Buka PWABuilder & Generate APK
              </a>
            </div>

            {/* Direct APK Link Config (Admin or Display) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                    <Download className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Unduh File .APK Langsung</h3>
                    <p className="text-xs text-slate-400">Link unduhan file APK yang dikelola oleh Pengurus</p>
                  </div>
                </div>

                {apkUrl ? (
                  <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" /> File APK Tersedia untuk Anggota
                    </div>
                    <p className="text-xs text-slate-300">
                      Pengurus telah mengunggah / menyediakan file APK resmi. Anda dapat mengunduh dan menginstalnya langsung di HP Android.
                    </p>
                    <a
                      href={apkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-950/50"
                    >
                      <Download className="w-4 h-4" /> Unduh File .APK Sekarang
                    </a>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-400">
                      Pengurus belum menyetel link file APK langsung. Anggota disarankan menggunakan metode <strong className="text-indigo-400">Install PWA</strong> di tab sebelumnya.
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Input Form to Set Custom APK Link */}
              {isAdmin && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Setel Link File APK Langsung (Khusus Admin):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/.../view atau Supabase URL"
                      value={apkUrl}
                      onChange={(e) => setApkUrl(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none"
                    />
                    <button
                      onClick={handleSaveApkUrl}
                      disabled={savingUrl}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <Save className="w-3.5 h-3.5" /> {savingUrl ? '...' : 'Simpan'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    *Masukkan link Google Drive, Supabase Storage, atau Cloud Storage tempat Anda menyimpan file .apk.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GUIDES */}
      {activeTab === 'guide' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Panduan Lengkap PWA & Bagikan ke Grup WA
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Android Guide */}
            <div className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <Chrome className="w-5 h-5" /> Panduan Android (Google Chrome)
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>Buka browser <strong>Google Chrome</strong> di smartphone Android Anda.</li>
                <li>Kunjungi alamat website: <code className="text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded">{currentAppUrl}</code></li>
                <li>Ketuk ikon titik tiga <strong>(⋮)</strong> di pojok kanan atas browser.</li>
                <li>Pilih menu <strong>"Install Aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama"</strong>.</li>
                <li>Konfirmasi dengan menekan tombol <strong>Install</strong>. Icon aplikasi PB Bilibili 162 akan muncul di menu HP Anda!</li>
              </ol>
            </div>

            {/* iOS Guide */}
            <div className="p-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                <Apple className="w-5 h-5" /> Panduan iPhone / iPad (Safari)
              </div>
              <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
                <li>Buka browser <strong>Safari</strong> di iPhone atau iPad Anda.</li>
                <li>Kunjungi alamat website: <code className="text-indigo-400 bg-slate-900 px-1.5 py-0.5 rounded">{currentAppUrl}</code></li>
                <li>Ketuk tombol <strong>Bagikan (Share)</strong> di bagian bawah layar (ikon persegi dengan panah ke atas).</li>
                <li>Gulir opsi ke bawah dan pilih <strong>"Add to Home Screen" (Tambahkan ke Layar Utama)</strong>.</li>
                <li>Ketuk <strong>Add (Tambah)</strong> di pojok kanan atas. Icon aplikasi akan langsung muncul di Home Screen iPhone!</li>
              </ol>
            </div>
          </div>

          {/* WhatsApp sharing guide */}
          <div className="p-5 bg-gradient-to-r from-emerald-950/40 to-slate-950/60 border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 justify-center md:justify-start">
                <Share2 className="w-4 h-4" /> Membagikan Aplikasi ke Grup WhatsApp
              </h4>
              <p className="text-xs text-slate-300">
                Ajak seluruh anggota & atlet PB Bilibili 162 untuk mengunduh/menginstall aplikasi ini. Pesan sudah diformat rapi dengan petunjuk install.
              </p>
            </div>

            <button
              onClick={handleShareToWhatsApp}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-2 shrink-0 shadow-lg shadow-emerald-950/50"
            >
              <MessageCircle className="w-4 h-4" /> Kirim Ke WA Sekarang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
