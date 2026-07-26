import React, { useState, useEffect } from 'react';
import { 
  Bell, BellOff, ShieldAlert, Key, Clipboard, Check, RefreshCw, Send,
  HelpCircle, Settings, Smartphone, FileText, Calendar, Wallet, CheckCircle, AlertTriangle
} from 'lucide-react';
import Swal from 'sweetalert2';
import { 
  requestNotificationPermission, 
  getFCMToken, 
  getFirebaseConfig, 
  saveFirebaseConfig, 
  getVapidKey, 
  saveVapidKey, 
  getNotificationSettings, 
  saveNotificationSettings,
  triggerPushNotification
} from '../utils/firebaseMessaging';

export default function FcmSettingsDashboard() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Topic Toggles
  const [topics, setTopics] = useState({
    kas: true,
    berita: true,
    jadwal: true
  });

  // Check if admin
  const userRole = (() => {
    const raw = localStorage.getItem('local_admin_session');
    if (raw) {
      try { return JSON.parse(raw)?.user?.user_metadata?.role || 'anggota'; } catch (e) {}
    }
    return 'anggota';
  })();
  const isAdmin = userRole === 'admin';

  // Admin config edit states
  const [vapidKeyInput, setVapidKeyInput] = useState('');
  const [serverKeyInput, setServerKeyInput] = useState('');
  const [firebaseConfigInput, setFirebaseConfigInput] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  // Admin Test Broadcast states
  const [testTitle, setTestTitle] = useState('PB Bilibili 162: Latihan Bersama!');
  const [testBody, setTestBody] = useState('Jadwal latihan baru telah diterbitkan untuk sesi pekan ini. Silakan cek detailnya!');
  const [testTopic, setTestTopic] = useState<'kas' | 'berita' | 'jadwal'>('jadwal');
  const [testSending, setTestSending] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    
    // Load subscription settings
    setTopics(getNotificationSettings());

    // Load saved client token if any
    const savedToken = localStorage.getItem('pb_fcm_token');
    if (savedToken) {
      setFcmToken(savedToken);
    }

    // Load Admin settings
    setVapidKeyInput(getVapidKey());
    setFirebaseConfigInput(getFirebaseConfig());
    setServerKeyInput(localStorage.getItem('pb_fcm_server_key_local') || '');
  }, []);

  const handleRequestPermission = async () => {
    setLoading(true);
    try {
      const resPermission = await requestNotificationPermission();
      setPermission(resPermission);
      
      if (resPermission === 'granted') {
        Swal.fire({
          icon: 'success',
          title: 'Izin Diberikan!',
          text: 'Perangkat Anda kini siap menerima notifikasi real-time dari PB Bilibili 162.',
          confirmButtonColor: '#3B82F6',
          background: '#0F172A',
          color: '#fff'
        });
        
        // Fetch Token
        const token = await getFCMToken();
        if (token) {
          setFcmToken(token);
        }
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Izin Ditolak',
          text: 'Anda menolak izin notifikasi. Aktifkan kembali secara manual melalui pengaturan browser Anda untuk info terkini.',
          confirmButtonColor: '#F59E0B',
          background: '#0F172A',
          color: '#fff'
        });
      }
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan',
        text: e.message || 'Gagal mendaftarkan notifikasi.',
        confirmButtonColor: '#EF4444',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchTokenManual = async () => {
    setLoading(true);
    const token = await getFCMToken();
    setFcmToken(token);
    setLoading(false);
    if (token) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Token FCM Berhasil Diperbarui',
        showConfirmButton: false,
        timer: 2000
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Memperoleh Token',
        text: 'Harap pastikan Firebase Config dan VAPID Key Anda telah diisi secara valid di bawah.',
        confirmButtonColor: '#EF4444',
        background: '#0F172A',
        color: '#fff'
      });
    }
  };

  const copyToClipboard = () => {
    if (!fcmToken) return;
    navigator.clipboard.writeText(fcmToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleTopic = (topicKey: 'kas' | 'berita' | 'jadwal') => {
    const updated = { ...topics, [topicKey]: !topics[topicKey] };
    setTopics(updated);
    saveNotificationSettings(updated);
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: `Preferensi ${topicKey.toUpperCase()} berhasil disimpan`,
      showConfirmButton: false,
      timer: 1500
    });
  };

  const handleSaveAdminConfig = () => {
    saveFirebaseConfig(firebaseConfigInput);
    saveVapidKey(vapidKeyInput);
    if (serverKeyInput) {
      localStorage.setItem('pb_fcm_server_key_local', serverKeyInput);
    }
    
    Swal.fire({
      icon: 'success',
      title: 'Konfigurasi Tersimpan!',
      text: 'Konfigurasi kunci Firebase & VAPID berhasil diperbarui secara lokal.',
      confirmButtonColor: '#3B82F6',
      background: '#0F172A',
      color: '#fff'
    });
  };

  const handleSendTestPush = async () => {
    if (!testTitle.trim() || !testBody.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Field Kosong',
        text: 'Judul dan isi notifikasi wajib diisi!',
        confirmButtonColor: '#EF4444',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    setTestSending(true);
    try {
      await triggerPushNotification(testTitle, testBody, testTopic);
      Swal.fire({
        icon: 'success',
        title: 'Notifikasi Terkirim!',
        text: `Notifikasi bertopik "${testTopic.toUpperCase()}" berhasil dipancarkan secara real-time ke browser Anda.`,
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } catch (e: any) {
      Swal.fire({
        icon: 'error',
        title: 'Kesalahan Pengiriman',
        text: e.message || 'Gagal mengirimkan notifikasi.',
        confirmButtonColor: '#EF4444',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 sm:space-y-8 text-white animate-in fade-in duration-500">
      
      {/* HEADER HERO */}
      <div className="bg-gradient-to-br from-slate-900 to-black border border-white/10 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
              <Bell size={12} className="animate-bounce" /> Real-time Notification System
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase italic leading-none">
              Notifikasi <span className="text-amber-500">Push (FCM)</span>
            </h1>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-xl">
              Hubungkan perangkat mobile atau browser Anda ke layanan Firebase Cloud Messaging klub untuk mendapatkan info kas terbaru, pengumuman berita klub, dan perubahan jadwal latihan seketika.
            </p>
          </div>
          
          <div className="bg-[#0b1224] p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Izin</span>
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-black uppercase">
                <CheckCircle size={14} /> AKTIF & REKTIF
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-black uppercase">
                <BellOff size={14} /> DIBLOKIR BROWSER
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-black uppercase animate-pulse">
                <AlertTriangle size={14} /> BELUM DIATUR
              </span>
            )}
          </div>
        </div>
      </div>

      {/* DUAL COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* LEFT COLUMN: CORE SUBSCRIPTIONS (8 COLS ON LARGE) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* PERMISSION CARD */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-black uppercase italic tracking-wider text-white border-b border-white/5 pb-2">
              Langkah 1: Aktivasi Perangkat
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              Agar browser/perangkat Anda dapat mengenali pesan siaran (FCM broadcast), browser Anda wajib memberikan otorisasi push notifications. Tekan tombol aktivasi di bawah:
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleRequestPermission}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Bell size={16} />
                )}
                {permission === 'granted' ? 'Minta Izin Ulang' : 'Aktifkan Notifikasi'}
              </button>

              <button
                onClick={handleFetchTokenManual}
                disabled={loading || permission !== 'granted'}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-30"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh Token
              </button>
            </div>

            {/* FCM Token Display */}
            {fcmToken && (
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black uppercase text-amber-500 tracking-widest flex items-center gap-1.5">
                  <Smartphone size={12} /> Registration Token Perangkat Anda
                </label>
                <div className="flex gap-2 bg-[#070d1a] border border-white/5 rounded-xl p-2.5 relative items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400 truncate pr-12 select-all leading-tight max-w-[85%]">
                    {fcmToken}
                  </span>
                  <button
                    onClick={copyToClipboard}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                    title="Salin Token"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Clipboard size={14} className="text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-slate-500">
                  Gunakan Token unik di atas untuk mengirimkan pesan testing khusus ke perangkat ini via Firebase Console atau Server API.
                </p>
              </div>
            )}
          </div>

          {/* TOPIC CHANNELS */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-black uppercase italic tracking-wider text-white border-b border-white/5 pb-2">
              Langkah 2: Saluran Berita Diikuti
            </h3>
            <p className="text-xs text-slate-400">
              Sesuaikan kategori pemberitahuan apa saja yang ingin Anda terima secara real-time:
            </p>

            <div className="space-y-3 pt-1">
              
              {/* KAS TOPIC */}
              <div className="flex items-center justify-between p-3.5 bg-black/30 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Wallet size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none mb-1">Transaksi & Keuangan Kas</h4>
                    <p className="text-[10px] text-slate-400">Notifikasi saat kas masuk, pengeluaran, atau rekap saldo baru.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleTopic('kas')}
                  className={`w-12 h-6.5 rounded-full p-1 transition-all ${topics.kas ? 'bg-emerald-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full transition-all ${topics.kas ? 'translate-x-5.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* BERITA TOPIC */}
              <div className="flex items-center justify-between p-3.5 bg-black/30 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none mb-1">Pengumuman & Berita Klub</h4>
                    <p className="text-[10px] text-slate-400">Warta penting dari pengurus, prestasi baru, maupun rapat klub.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleTopic('berita')}
                  className={`w-12 h-6.5 rounded-full p-1 transition-all ${topics.berita ? 'bg-blue-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full transition-all ${topics.berita ? 'translate-x-5.5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* JADWAL TOPIC */}
              <div className="flex items-center justify-between p-3.5 bg-black/30 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-none mb-1">Sesi & Jadwal Latihan</h4>
                    <p className="text-[10px] text-slate-400">Pemberitahuan perubahan tempat, jam mabar, atau jadwal sparring.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleTopic('jadwal')}
                  className={`w-12 h-6.5 rounded-full p-1 transition-all ${topics.jadwal ? 'bg-amber-500' : 'bg-slate-800'}`}
                >
                  <div className={`w-4.5 h-4.5 bg-white rounded-full transition-all ${topics.jadwal ? 'translate-x-5.5' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: ADMINISTRATIVE & FAQ (5 COLS ON LARGE) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* ADMIN DISPATCH TEST PANEL */}
          {isAdmin && (
            <div className="bg-slate-900/60 border border-amber-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
              <h3 className="text-lg font-black uppercase italic tracking-wider text-amber-500 border-b border-white/5 pb-2 flex items-center gap-2">
                <Send size={18} /> Kirim Tes Notifikasi
              </h3>
              
              <div className="space-y-3 text-xs">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Judul Pesan</label>
                  <input
                    type="text"
                    value={testTitle}
                    onChange={(e) => setTestTitle(e.target.value)}
                    className="w-full bg-[#070d1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                    placeholder="Judul notifikasi..."
                  />
                </div>

                {/* Body */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Konten / Isi Pesan</label>
                  <textarea
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    rows={3}
                    className="w-full bg-[#070d1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors resize-none"
                    placeholder="Tulis pesan..."
                  />
                </div>

                {/* Topic selector */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">Target Kategori (Topic)</label>
                  <select
                    value={testTopic}
                    onChange={(e) => setTestTopic(e.target.value as any)}
                    className="w-full bg-[#070d1a] border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                  >
                    <option value="kas">Kas & Keuangan (kas)</option>
                    <option value="berita">Berita & Rapat Klub (berita)</option>
                    <option value="jadwal">Jadwal & Latihan (jadwal)</option>
                  </select>
                </div>

                <button
                  onClick={handleSendTestPush}
                  disabled={testSending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50 mt-1"
                >
                  {testSending ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  Pancarkan Notifikasi
                </button>
              </div>
            </div>
          )}

          {/* PRIVATE LOCAL KEY SETTINGS FOR DEVELOPER PROTOTYPES */}
          {isAdmin && (
            <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('dev-fcm-keys');
                  if (el) el.classList.toggle('hidden');
                }}
                className="w-full flex items-center justify-between text-left border-b border-white/5 pb-2"
              >
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Key size={14} /> Kredensial Firebase FCM
                </h3>
                <Settings size={14} className="text-slate-400 hover:text-white" />
              </button>

              <div id="dev-fcm-keys" className="hidden space-y-3 text-[11px]">
                <p className="text-slate-400 leading-normal text-[10px]">
                  Konfigurasikan kunci VAPID dan SDK Firebase Anda di bawah untuk mengaktifkan push secara penuh di browser lokal Anda tanpa merusak setelan sistem global:
                </p>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold">FCM VAPID Public Key</label>
                  <input
                    type="text"
                    value={vapidKeyInput}
                    onChange={(e) => setVapidKeyInput(e.target.value)}
                    className="w-full bg-[#070d1a] border border-white/5 rounded-lg p-2 font-mono text-[9px]"
                    placeholder="BGM7xR-..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-bold">FCM Server Secret Key (Legacy/V1)</label>
                  <input
                    type="password"
                    value={serverKeyInput}
                    onChange={(e) => setServerKeyInput(e.target.value)}
                    className="w-full bg-[#070d1a] border border-white/5 rounded-lg p-2 font-mono text-[9px]"
                    placeholder="AAAA..."
                  />
                </div>

                <div className="space-y-1 pt-1.5">
                  <span className="text-slate-300 font-extrabold uppercase text-[9px] tracking-wider block">Firebase App SDK Config</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-500 font-medium">API Key</label>
                      <input
                        type="text"
                        value={firebaseConfigInput.apiKey}
                        onChange={(e) => setFirebaseConfigInput({...firebaseConfigInput, apiKey: e.target.value})}
                        className="w-full bg-[#070d1a] border border-white/5 rounded-lg p-1.5 font-mono text-[9px]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium">Project ID</label>
                      <input
                        type="text"
                        value={firebaseConfigInput.projectId}
                        onChange={(e) => setFirebaseConfigInput({...firebaseConfigInput, projectId: e.target.value})}
                        className="w-full bg-[#070d1a] border border-white/5 rounded-lg p-1.5 font-mono text-[9px]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium">Messaging Sender ID</label>
                      <input
                        type="text"
                        value={firebaseConfigInput.messagingSenderId}
                        onChange={(e) => setFirebaseConfigInput({...firebaseConfigInput, messagingSenderId: e.target.value})}
                        className="w-full bg-[#070d1a] border border-white/5 rounded-lg p-1.5 font-mono text-[9px]"
                      />
                    </div>
                    <div>
                      <label className="text-slate-500 font-medium">App ID</label>
                      <input
                        type="text"
                        value={firebaseConfigInput.appId}
                        onChange={(e) => setFirebaseConfigInput({...firebaseConfigInput, appId: e.target.value})}
                        className="w-full bg-[#070d1a] border border-white/5 rounded-lg p-1.5 font-mono text-[9px]"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveAdminConfig}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold border border-white/10 rounded-lg text-[10px] uppercase tracking-wider"
                >
                  Simpan Konfigurasi
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM FAQ & GUIDES */}
          <div className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-black uppercase italic tracking-wider text-white border-b border-white/5 pb-2 flex items-center gap-2">
              <HelpCircle size={18} /> Panduan FCM
            </h3>

            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-200">Bagaimana push notification bekerja?</h4>
                <p className="text-[11px] leading-relaxed">
                  Layanan Firebase Cloud Messaging mengirimkan paket data aman ke peramban (browser) Anda melalui Service Worker latar belakang. Notifikasi akan berbunyi di komputer atau HP Anda meskipun Anda tidak sedang membuka web PB Bilibili 162.
                </p>
              </div>

              <div className="space-y-1 border-t border-white/5 pt-2">
                <h4 className="font-bold text-slate-200">Bagaimana mengaktifkan di HP Android / iOS?</h4>
                <p className="text-[11px] leading-relaxed">
                  Buka website ini dari browser Google Chrome atau Safari di HP Anda, masuk ke halaman Notifikasi Push ini, dan klik tombol "Aktifkan Notifikasi". Browser iOS 16.4+ memerlukan website ditambahkan ke Home Screen terlebih dahulu (Add to Home Screen) untuk mengaktifkan notifikasi push.
                </p>
              </div>

              <div className="space-y-1 border-t border-white/5 pt-2">
                <h4 className="font-bold text-slate-200">Saya tidak menerima notifikasi push?</h4>
                <p className="text-[11px] leading-relaxed">
                  Pastikan izin Notifikasi browser Anda dalam posisi "Allow" (Diizinkan) dan sistem operasi perangkat Anda tidak sedang mengaktifkan mode Focus / Do Not Disturb (Jangan Ganggu).
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
      
    </div>
  );
}
