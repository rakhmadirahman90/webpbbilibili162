import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';
import { useRealtimeSync } from '../utils/realtimeSync';

const OFFICIAL_LATEST_POPUP = {
  id: 'popup-1786211047963',
  judul: 'INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE',
  deskripsi: '📢 INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE 📢\n\nBersama, Kita Kuat!\n\nPendaftaran anggota baru PB Bilibili 162 Parepare telah dibuka. Bergabunglah untuk berlatih, bertanding, berkembang, dan membangun komunitas badminton yang positif dan sportif.\n\n✨ PENDAFTARAN GRATIS! ✨\n📱 Informasi Admin: 0896-1674-6342',
  url_gambar: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/promosi/popup-1786212468282.png',
  is_active: true,
  active: true,
  urutan: 21
};

interface ImagePopupProps { activeView?: string | null; }

type PopupItem = Record<string, any>;

function ImagePopup({ activeView = null }: ImagePopupProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promoImages, setPromoImages] = useState<PopupItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDismissedRef = useRef(false);

  const fetchActivePopups = useCallback(async (forceShow = false) => {
    try {
      if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/login'))) {
        setPromoImages([]);
        setIsOpen(false);
        return;
      }
      if (activeView !== null) {
        setIsOpen(false);
        return;
      }
      if (!forceShow && isDismissedRef.current) {
        setIsOpen(false);
        return;
      }

      let siteConfigRaw: any = null;
      let siteLoaded = false;
      try {
        siteConfigRaw = await getSiteSetting('popup_config');
        siteLoaded = siteConfigRaw !== null && siteConfigRaw !== undefined;
      } catch {}

      let apiItems: PopupItem[] = [];
      try {
        const res = await fetch('/api/konfigurasi-popup');
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json)) apiItems = json;
        }
      } catch {}

      let dbItems: PopupItem[] = [];
      try {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('*')
          .order('urutan', { ascending: true });
        if (!error && data?.length) {
          dbItems = data;
        } else {
          const { data: fallback } = await supabase
            .from('popups')
            .select('*')
            .order('urutan', { ascending: true });
          if (fallback) dbItems = fallback;
        }
      } catch {}

      const sitePopups = parsePopupList(siteConfigRaw);
      let canonicalList: PopupItem[] = siteLoaded
        ? sitePopups
        : apiItems.length > 0
          ? apiItems
          : dbItems.length > 0
            ? dbItems
            : [OFFICIAL_LATEST_POPUP];

      const dbMap = new Map(dbItems.map(item => [item.id, item]));
      let merged = canonicalList.map(item => {
        if (!item) return null;
        const dbItem = item.id ? dbMap.get(item.id) : undefined;
        if (!dbItem) return item;
        return {
          ...dbItem,
          ...item,
          judul: item.judul || dbItem.judul || '',
          deskripsi: item.deskripsi || dbItem.deskripsi || '',
          url_gambar: item.url_gambar || dbItem.url_gambar || '',
          file_url: item.file_url ?? dbItem.file_url ?? null,
          is_active: item.is_active ?? dbItem.is_active ?? true,
          active: item.active ?? dbItem.active,
          urutan: item.urutan ?? dbItem.urutan ?? 0
        };
      }).filter(Boolean) as PopupItem[];

      merged = merged.map(item => {
        if (
          item.id === 'df3aa22e-5f97-4c05-9f04-700ccba35d08' ||
          (item.judul && String(item.judul).toUpperCase().includes('AQIQAH')) ||
          (item.url_gambar && String(item.url_gambar).includes('1784303693873'))
        ) return { ...item, is_active: false, active: false };
        return item;
      });

      const unique = new Map<string, PopupItem>();
      merged.forEach(item => {
        if (item?.id) unique.set(String(item.id), item);
      });
      const activeItems = Array.from(unique.values())
        .filter(item => item.is_active === true || item.active === true)
        .sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));

      setPromoImages(activeItems);
      setCurrentIndex(prev => activeItems.length ? Math.min(prev, activeItems.length - 1) : 0);
      setIsExpanded(false);
      setIsOpen(activeItems.length > 0 && (forceShow || !isDismissedRef.current));
    } catch (err) {
      console.error('Gagal memuat pop-up:', err);
    }
  }, [activeView]);

  useEffect(() => {
    isDismissedRef.current = false;
    if (activeView === null) fetchActivePopups(true);
    else setIsOpen(false);
  }, [activeView, fetchActivePopups]);

  useEffect(() => {
    const channel = supabase
      .channel('popups-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'popups' }, () => fetchActivePopups(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => fetchActivePopups(false))
      .subscribe();

    const handleTriggerHome = () => {
      isDismissedRef.current = false;
      fetchActivePopups(true);
    };
    const handleUpdate = () => fetchActivePopups(false);

    window.addEventListener('trigger-home-popup', handleTriggerHome);
    window.addEventListener('site_setting_updated', handleUpdate);
    window.addEventListener('table_updated_popup_config', handleUpdate);
    window.addEventListener('table_updated_konfigurasi_popup', handleUpdate);
    window.addEventListener('app_data_changed', handleUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('trigger-home-popup', handleTriggerHome);
      window.removeEventListener('site_setting_updated', handleUpdate);
      window.removeEventListener('table_updated_popup_config', handleUpdate);
      window.removeEventListener('table_updated_konfigurasi_popup', handleUpdate);
      window.removeEventListener('app_data_changed', handleUpdate);
    };
  }, [fetchActivePopups]);

  useRealtimeSync({
    tables: ['konfigurasi_popup', 'site_settings'],
    settingKeys: ['popup_config'],
    onUpdate: () => fetchActivePopups(false)
  });

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (isOpen && scrollRef.current) {
      timeout = setTimeout(() => {
        interval = setInterval(() => {
          const el = scrollRef.current;
          if (!el || el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
            if (interval) clearInterval(interval);
          } else {
            el.scrollBy({ top: 0.5, behavior: 'auto' });
          }
        }, 30);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
      if (timeout) clearTimeout(timeout);
    };
  }, [isOpen, currentIndex]);

  const goNext = () => {
    if (promoImages.length < 2) return;
    setIsExpanded(false);
    setCurrentIndex(prev => (prev + 1) % promoImages.length);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }));
  };

  const goPrev = () => {
    if (promoImages.length < 2) return;
    setIsExpanded(false);
    setCurrentIndex(prev => (prev - 1 + promoImages.length) % promoImages.length);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }));
  };

  const closePopup = () => {
    isDismissedRef.current = true;
    setIsOpen(false);
  };

  const handleDragEnd = (_event: any, info: any) => {
    if (promoImages.length < 2) return;
    const distance = Math.abs(info.offset?.x ?? 0);
    const velocity = Math.abs(info.velocity?.x ?? 0);
    if (distance > 45 || velocity > 350) {
      if ((info.offset?.x ?? 0) < 0) goNext();
      else goPrev();
    }
  };

  const renderCleanDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-3" />;
      return (
        <p key={i} className="mb-5 last:mb-0 !leading-7 text-slate-800 !text-justify text-[15px]" style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}>
          {line.split(urlRegex).map((part, index) => {
            if (part.match(urlRegex)) {
              const href = part.startsWith('www.') ? `https://${part}` : part;
              return <a key={index} href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-2 font-medium break-all">{part}</a>;
            }
            return <span key={index}>{part}</span>;
          })}
        </p>
      );
    });
  };

  if (promoImages.length === 0 || !isOpen) return null;
  const current = promoImages[currentIndex] || promoImages[0];
  const total = promoImages.length;
  const hasNavigation = total > 1;

  return (
    <AnimatePresence mode="wait">
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closePopup} />

        <motion.div
          key={current.id || `popup-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
          className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[420px] max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <button onClick={closePopup} aria-label="Tutup pop-up" className="absolute top-3 right-3 z-[80] p-2 bg-white/95 hover:bg-slate-100 text-slate-800 rounded-full shadow-xl border border-slate-200 transition-all active:scale-90">
            <X size={18} />
          </button>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain hide-scrollbar scroll-smooth">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={current.id || currentIndex} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <motion.div
                  drag={hasNavigation ? 'x' : false}
                  dragDirectionLock
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={handleDragEnd}
                  style={{ touchAction: hasNavigation ? 'pan-y' : 'auto' }}
                  className="relative w-full bg-slate-950 shrink-0 cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center select-none"
                >
                  <img src={current.url_gambar} className="w-full h-auto block z-10 select-none pointer-events-none" alt={current.judul || 'Banner pengumuman'} draggable={false} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-black/10 z-20 pointer-events-none" />

                  {hasNavigation && (
                    <>
                      <button type="button" onClick={goPrev} aria-label="Pop-up sebelumnya" className="absolute left-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <ChevronLeft size={20} />
                      </button>
                      <button type="button" onClick={goNext} aria-label="Pop-up berikutnya" className="absolute right-2 top-1/2 -translate-y-1/2 z-40 w-9 h-9 rounded-full bg-black/55 hover:bg-black/75 text-white backdrop-blur-sm flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </motion.div>

                <div className="flex items-center justify-center gap-2 py-2.5 bg-white border-b border-slate-100">
                  {hasNavigation ? promoImages.map((item, index) => (
                    <button key={item.id || index} type="button" onClick={() => { setIsExpanded(false); setCurrentIndex(index); scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label={`Buka pop-up ${index + 1} dari ${total}`} className={`rounded-full transition-all ${index === currentIndex ? 'w-6 h-2 bg-blue-600' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'}`} />
                  )) : <span className="text-[10px] font-bold text-slate-400">1 / 1</span>}
                  {hasNavigation && <span className="ml-1 text-[10px] font-bold text-slate-500">{currentIndex + 1} / {total}</span>}
                </div>

                <div className="px-5 sm:px-6 pt-3 pb-7 bg-white">
                  <div className="flex justify-center mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">Pengumuman</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-blue-700 leading-tight text-center mb-5 px-2 uppercase tracking-tighter">{current.judul}</h3>

                  <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 sm:p-6 mb-7 shadow-inner">
                    <div className={`transition-all duration-300 ${isExpanded ? '' : 'line-clamp-3'}`}>
                      {renderCleanDescription(current.deskripsi || '')}
                    </div>
                    {!!current.deskripsi && (
                      <button type="button" onClick={() => setIsExpanded(v => !v)} className="text-blue-600 text-xs font-bold mt-2 hover:underline">
                        {isExpanded ? 'Read Less' : 'Read More'}
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 px-1">
                    {current.file_url && String(current.file_url).length > 5 && (
                      <motion.a whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} href={current.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[12px] tracking-wider shadow-lg">
                        <Download size={14} /> LIHAT LAMPIRAN
                      </motion.a>
                    )}
                    <button type="button" onClick={closePopup} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[12px] tracking-wider transition-all shadow-md">MENGERTI</button>
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
