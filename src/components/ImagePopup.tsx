import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';
import { useRealtimeSync } from '../utils/realtimeSync';

const OFFICIAL_LATEST_POPUP = {
  id: 'popup-1786211047963',
  judul: 'INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE',
  deskripsi: `📢 INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE 📢\nBersama, Kita Kuat!\n\nAssalamu'alaikum warahmatullahi wabarakatuh.\nHalo seluruh pecinta bulutangkis yang baru bergabung! 👋\n\nBergabunglah bersama PB Bilibili 162 dan rasakan pengalaman berlatih, bertanding, dan berkembang bersama komunitas badminton terbaik di Parepare. Disiplin dalam latihan, kunci menjadi juara!\n\n🏆 KEUNTUNGAN MENJADI ANGGOTA:\n• Kesempatan Berlatih Rutin (Program latihan terstruktur)\n• Menjadi Bagian dari Tim Solid (Komunitas positif & sportivitas tinggi)\n• Kesempatan Ikut Turnamen (Mewakili PB Bilibili 162 di berbagai event)\n• Meningkatkan Silaturahmi (Mempererat hubungan antar anggota)\n• Menambah Pertemuan & Relasi (Memperluas jaringan positif)\n\n📝 PERSYARATAN PENDAFTARAN:\n• Warga Negara Indonesia\n• Sehat jasmani & rohani\n• Memiliki semangat sportivitas tinggi\n• Bersedia mematuhi aturan PB Bilibili 162\n(Pastikan data yang Anda masukkan sesuai & valid saat pendaftaran).\n\n📋 CARA PENDAFTARAN:\n1. Buka website pendaftaran: https://pbilibili162.99apps.id/register\n2. Klik tombol "Daftar Sekarang"\n3. Isi formulir data diri dengan lengkap\n4. Unggah dokumen yang diperlukan\n5. Baca & setujui syarat dan ketentuan\n6. Kirim pendaftaran\n✅ Setelah pendaftaran berhasil, Anda akan mendapat konfirmasi melalui WhatsApp/Email.\n\n✨ PENDAFTARAN GRATIS! ✨\n📱 Informasi & Konfirmasi Admin: 0896-1674-6342 (Admin PB Bilibili 162)\n🌐 Kunjungi Website Resmi: https://pbilibili162.99apps.id\n\n"Disiplin • Kerja Keras • Juara!" 🏆\n\nHormat kami,\nH. Wawan\nKetua PB Bilibili 162 Parepare 💙🏸`,
  url_gambar: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/promosi/popup-1786212468282.png',
  is_active: true,
  active: true,
  urutan: 21
};

function ImagePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promoImages, setPromoImages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchActivePopups = async (forceShow = false) => {
    try {
      let siteConfigRaw: any = null;
      let siteLoaded = false;
      try {
        siteConfigRaw = await getSiteSetting('popup_config');
        if (siteConfigRaw !== null && siteConfigRaw !== undefined) {
          siteLoaded = true;
        }
      } catch (e) {}

      let apiItems: any[] = [];
      try {
        const res = await fetch('/api/konfigurasi-popup');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) apiItems = json;
        }
      } catch (e) {}

      let dbItems: any[] = [];
      try {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('*')
          .order('urutan', { ascending: true });
        
        if (!error && data) dbItems = data;
      } catch (e) {}

      let sitePopups = parsePopupList(siteConfigRaw);

      let canonicalList: any[] = [];
      if (siteLoaded) {
        canonicalList = sitePopups;
      } else if (apiItems.length > 0) {
        canonicalList = apiItems;
      } else if (dbItems.length > 0) {
        canonicalList = dbItems;
      } else {
        canonicalList = [OFFICIAL_LATEST_POPUP];
      }

      const dbMap = new Map(dbItems.map((p: any) => [p.id, p]));
      let merged: any[] = canonicalList.map(item => {
        if (!item || !item.id) return item;
        const dbItem = dbMap.get(item.id);
        if (dbItem) {
          return {
            ...dbItem,
            ...item,
            judul: item.judul !== undefined && item.judul !== '' ? item.judul : (dbItem.judul || ''),
            deskripsi: item.deskripsi !== undefined && item.deskripsi !== '' ? item.deskripsi : (dbItem.deskripsi || ''),
            url_gambar: item.url_gambar || dbItem.url_gambar || '',
            file_url: item.file_url !== undefined && item.file_url !== null ? item.file_url : (dbItem.file_url || null),
            is_active: item.is_active ?? dbItem.is_active ?? true,
            urutan: item.urutan ?? dbItem.urutan ?? 0
          };
        }
        return item;
      }).filter(Boolean);

      merged = merged.map(item => {
        if (!item) return item;
        if (item.id === 'df3aa22e-5f97-4c05-9f04-700ccba35d08' || (item.judul && item.judul.toUpperCase().includes('AQIQAH')) || (item.url_gambar && item.url_gambar.includes('1784303693873'))) {
          return { ...item, is_active: false, active: false };
        }
        return item;
      });

      // Deduplicate merged by id to prevent duplicate keys
      const mergedMap = new Map();
      for (const item of merged) {
        if (item && item.id) {
          mergedMap.set(item.id, item);
        }
      }
      merged = Array.from(mergedMap.values());

      merged.sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));

      const activeItems = merged.filter((p: any) => p && (p.is_active === true || p.active === true));
      
      // Check if dismissed in session or localStorage (bypass if forceShow === true)
      const dismissed = !forceShow && activeItems.length > 0 && (
        sessionStorage.getItem(`popup_dismissed_${activeItems[0].id}`) === 'true' ||
        localStorage.getItem(`popup_dismissed_${activeItems[0].id}`) === 'true'
      );

      if (activeItems.length > 0 && (!dismissed || forceShow)) {
        setPromoImages(activeItems);
        setCurrentIndex(0);
        setIsOpen(true);
      } else {
        setPromoImages([]);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Gagal memuat pop-up:", err);
    }
  };

  useEffect(() => {
    fetchActivePopups();

    const handleUpdate = () => {
      fetchActivePopups(true);
    };

    window.addEventListener('trigger-home-popup', handleUpdate);
    window.addEventListener('site_setting_updated', handleUpdate);
    window.addEventListener('table_updated_popup_config', handleUpdate);
    window.addEventListener('table_updated_konfigurasi_popup', handleUpdate);
    window.addEventListener('app_data_changed', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('trigger-home-popup', handleUpdate);
      window.removeEventListener('site_setting_updated', handleUpdate);
      window.removeEventListener('table_updated_popup_config', handleUpdate);
      window.removeEventListener('table_updated_konfigurasi_popup', handleUpdate);
      window.removeEventListener('app_data_changed', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  useRealtimeSync({
    tables: ['konfigurasi_popup', 'site_settings'],
    settingKeys: ['popup_config'],
    onUpdate: () => {
      fetchActivePopups();
    }
  });

  useEffect(() => {
    let scrollInterval: any;
    if (isOpen && scrollRef.current) {
      const startTimeout = setTimeout(() => {
        scrollInterval = setInterval(() => {
          if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 1) {
              clearInterval(scrollInterval);
            } else {
              scrollRef.current.scrollBy({ top: 0.5, behavior: 'auto' });
            }
          }
        }, 30);
      }, 4000);

      return () => {
        clearInterval(scrollInterval);
        clearTimeout(startTimeout);
      };
    }
  }, [isOpen, currentIndex]);

  // --- PERBAIKAN LOGIKA TEXT RENDER ---
  const renderCleanDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

    return text.split('\n').map((line, i) => {
      if (line.trim() === "") return <div key={i} className="h-3" />;

      return (
        <p 
          key={i} 
          className="mb-5 last:mb-0 !leading-7 text-slate-800 !text-justify text-[15px]"
          style={{ 
            overflowWrap: 'break-word', 
            wordWrap: 'break-word'
          }}
        >
          {line.split(urlRegex).map((part, index) => {
            if (part.match(urlRegex)) {
              const cleanUrl = part.startsWith('www.') ? `https://${part}` : part;
              return (
                <a
                  key={index}
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-2 font-medium break-all"
                >
                  {part} 
                </a>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </p>
      );
    });
  };
  // ------------------------------------

  const [isExpanded, setIsExpanded] = useState(false);
  const closePopup = () => {
    if (promoImages[currentIndex]?.id) {
      sessionStorage.setItem(`popup_dismissed_${promoImages[currentIndex].id}`, 'true');
      localStorage.setItem(`popup_dismissed_${promoImages[currentIndex].id}`, 'true');
    }
    setIsOpen(false);
  };

  const handleDragEnd = (e: any, { offset, velocity }: any) => {
    const swipe = Math.abs(offset.x) > 50; 
    if (swipe) {
      if (offset.x < 0) {
        setCurrentIndex((prev) => (prev + 1) % promoImages.length);
      } else {
        setCurrentIndex((prev) => (prev - 1 + promoImages.length) % promoImages.length);
      }
    }
  };

  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex];

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closePopup} />
        
        <motion.div 
          key={current.id || `popup-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          transition={{ 
            type: "spring",
            stiffness: 400,
            damping: 30,
            mass: 0.8
          }}
          className="relative w-full max-w-[calc(100vw-2rem)] sm:max-w-[420px] max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={closePopup} 
            className="absolute top-4 right-4 z-[60] p-2 bg-white hover:bg-slate-100 text-slate-800 rounded-full shadow-xl border border-slate-200 transition-all active:scale-90"
          >
            <X size={18} />
          </button>

          <div ref={scrollRef} className="overflow-y-auto hide-scrollbar scroll-smooth">
            <AnimatePresence>
              <motion.div 
                key={currentIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                 <motion.div 
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  onDragEnd={handleDragEnd}
                  className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center"
                >
                  {/* Main Banner Image - Fully spans the width proportionally without cropping */}
                  <img 
                    src={current.url_gambar} 
                    className="w-full h-auto block z-10 select-none pointer-events-none" 
                    alt="Banner" 
                  />
                  
                  {/* Subtle lighting gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-black/10 z-20 pointer-events-none" />
                </motion.div>

                <div className="px-6 pt-2 pb-8 bg-white">
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">
                      Pengumuman
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-blue-700 leading-tight text-center mb-6 px-4 uppercase tracking-tighter">
                    {current.judul}
                  </h3>

                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 mb-8 shadow-inner">
                    <div className={`transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {renderCleanDescription(current.deskripsi)}
                    </div>
                    <button 
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-blue-600 text-xs font-bold mt-2 hover:underline"
                    >
                      {isExpanded ? 'Read Less' : 'Read More'}
                    </button>
                  </div>
                  
                  <div className="space-y-3 px-1">
                    {current.file_url && current.file_url.length > 5 && (
                      <motion.a 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        href={current.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[12px] tracking-wider shadow-lg"
                      >
                        <Download size={14} /> LIHAT LAMPIRAN
                      </motion.a>
                    )}

                    <button 
                      onClick={closePopup} 
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[12px] tracking-wider transition-all shadow-md"
                    >
                      MENGERTI
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ImagePopup;
