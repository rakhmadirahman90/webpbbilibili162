import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';

const OFFICIAL_LATEST_POPUP = {
  id: 'popup-1786211047963',
  judul: 'JADWAL LATIHAN RESMI PB BILIBILI 162 PAREPARE',
  deskripsi: `🏸📢 JADWAL LATIHAN RESMI PB BILIBILI 162 PAREPARE 📢🏸\n\nAssalamu'alaikum warahmatullahi wabarakatuh.\n\nHalo seluruh keluarga besar PB Bilibili 162 Parepare 👋\n\nBerikut Jadwal Latihan Terbaru yang berlaku saat ini:\n\n🗓️ Rabu\n🕗 08.00 – 12.00 WITA\n📍 GOR SMAN 4 Parepare\n\n🗓️ Jumat\n🕗 08.00 – 12.00 WITA\n📍 GOR SMAN 4 Parepare\n\n🗓️ Ahad\n🕗 08.00 – 12.00 WITA\n📍 GOR A4 Soreang\n\n🎯 Fokus Latihan: 🏸 Teknik Dasar & Lanjutan\n🏸 Pola Permainan & Strategi\n🏸 Fisik, Sparring, Game, dan Evaluasi\n\n💪 Mari hadir tepat waktu, jaga kekompakan, disiplin, dan semangat berlatih demi meraih prestasi bersama.\n\n🌐 Informasi Lengkap & Aplikasi Resmi PB Bilibili 162: https://pbilibili162.99apps.id/\n\n📲 Melalui aplikasi resmi Anda dapat: ✅ Melihat Jadwal Latihan ✅ Pendaftaran Atlet ✅ Informasi Turnamen ✅ Pengumuman Resmi ✅ Informasi Kegiatan PB Bilibili 162\n\n"Disiplin • Kerja Keras • Juara!" 🏆\n\nHormat kami,\n\nH. Wawan\nKetua PB Bilibili 162 Parepare 💙🏸`,
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

  useEffect(() => {
    let lastHash = '';

    const fetchActivePopups = async () => {
      try {
        let dbItems: any[] = [];
        try {
          const { data, error } = await supabase
            .from('konfigurasi_popup')
            .select('*')
            .order('urutan', { ascending: true });
          
          if (!error && data) dbItems = data;
        } catch (e) {}

        let sitePopups: any[] = [];
        try {
          const siteConfig = await getSiteSetting('popup_config');
          if (siteConfig !== null && siteConfig !== undefined) {
            sitePopups = parsePopupList(siteConfig);
          }
        } catch (e) {}

        let merged: any[] = [];
        if (dbItems.length > 0) {
          const siteMap = new Map(sitePopups.map((p: any) => [p.id, p]));
          merged = dbItems.map(dbItem => {
            if (siteMap.has(dbItem.id)) {
              return { ...dbItem, ...siteMap.get(dbItem.id) };
            }
            return dbItem;
          });
          for (const siteItem of sitePopups) {
            if (!merged.some(m => m.id === siteItem.id)) {
              merged.push(siteItem);
            }
          }
        } else {
          merged = sitePopups;
        }

        // Deactivate old Aqiqah popups from legacy database entries
        merged = merged.map(item => {
          if (!item) return item;
          if (item.id === 'df3aa22e-5f97-4c05-9f04-700ccba35d08' || (item.judul && item.judul.toUpperCase().includes('AQIQAH')) || (item.url_gambar && item.url_gambar.includes('1784303693873'))) {
            return { ...item, is_active: false, active: false };
          }
          return item;
        });

        // Ensure official latest Jadwal Latihan popup is active
        if (!merged.some(m => m && (m.id === OFFICIAL_LATEST_POPUP.id || (m.url_gambar && m.url_gambar.includes('1786212468282'))))) {
          merged.unshift(OFFICIAL_LATEST_POPUP);
        } else {
          merged = merged.map(item => {
            if (item && (item.id === OFFICIAL_LATEST_POPUP.id || (item.url_gambar && item.url_gambar.includes('1786212468282')))) {
              return { ...item, ...OFFICIAL_LATEST_POPUP, is_active: true, active: true };
            }
            return item;
          });
        }

        const activeItems = merged.filter((p: any) => p && (p.is_active === true || p.active === true));

        const currentHash = JSON.stringify(activeItems.map(item => ({ id: item.id, active: item.is_active, title: item.judul, img: item.url_gambar })));
        if (currentHash !== lastHash) {
          lastHash = currentHash;
          if (activeItems.length > 0) {
            setPromoImages(activeItems);
            setIsOpen(true);
          } else {
            setPromoImages([]);
            setIsOpen(false);
          }
        }
      } catch (err) {
        console.error("Gagal memuat pop-up:", err);
      }
    };

    fetchActivePopups();

    // Fast 3-second live polling interval for instant cross-device realtime updates
    const syncInterval = setInterval(fetchActivePopups, 3000);

    const handleUpdate = (e: any) => {
      if (!e.detail?.key || e.detail.key === 'popup_config') {
        if (e.detail?.value) {
          try {
            const parsed = parsePopupList(e.detail.value).filter((p: any) => p && (p.is_active === true || p.active === true));
            const currentHash = JSON.stringify(parsed.map(item => ({ id: item.id, active: item.is_active, title: item.judul, img: item.url_gambar })));
            if (currentHash !== lastHash) {
              lastHash = currentHash;
              if (parsed.length > 0) {
                setPromoImages(parsed);
                setIsOpen(true);
              } else {
                setPromoImages([]);
                setIsOpen(false);
              }
            }
          } catch (err) {}
        }
        fetchActivePopups();
      }
    };
    const handleFocus = () => fetchActivePopups();

    window.addEventListener('site_setting_updated', handleUpdate);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const channel = supabase
      .channel('image_popup_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload: any) => {
        if (!payload.new || payload.new.key === 'popup_config' || payload.old?.key === 'popup_config') {
          fetchActivePopups();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => {
        fetchActivePopups();
      })
      .subscribe();

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('site_setting_updated', handleUpdate);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      supabase.removeChannel(channel);
    };
  }, []);

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
  const closePopup = () => setIsOpen(false);

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
