import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { supabase } from '../supabase';

interface ImagePopupProps { activeView?: string | null; }
type PopupItem = Record<string, any>;

const SLIDE_DURATION = 5500;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 450;

function preloadImage(url: string): Promise<void> {
  return new Promise(resolve => {
    if (!url) return resolve();
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

function ImagePopup({ activeView = null }: ImagePopupProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [promoImages, setPromoImages] = useState<PopupItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDismissedRef = useRef(false);
  const isOpenRef = useRef(false);
  const requestIdRef = useRef(0);
  const fetchingRef = useRef(false);

  const setPopupOpen = useCallback((open: boolean) => {
    isOpenRef.current = open;
    setIsOpen(open);
  }, []);

  const fetchActivePopups = useCallback(async (forceShow = false) => {
    // Never fetch/display the landing popup on non-home routes.
    if (activeView !== null) {
      setPopupOpen(false);
      return;
    }

    if (!forceShow && isDismissedRef.current) return;
    if (fetchingRef.current) return;

    // A realtime/event callback must not restart an already visible popup.
    if (!forceShow && isOpenRef.current) return;

    const requestId = ++requestIdRef.current;
    fetchingRef.current = true;

    try {
      if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/login'))) {
        setPopupOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from('konfigurasi_popup')
        .select('id, judul, deskripsi, url_gambar, image_url, file_url, is_active, urutan')
        .eq('is_active', true)
        .order('urutan', { ascending: true });

      if (requestId !== requestIdRef.current || activeView !== null) return;
      if (error) throw error;

      const activeItems = (data || [])
        .map((item: PopupItem) => ({ ...item, url_gambar: item.url_gambar || item.image_url || '' }))
        .filter((item: PopupItem) => item && item.url_gambar)
        .sort((a: PopupItem, b: PopupItem) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));

      if (!activeItems.length) {
        setPromoImages([]);
        setPopupOpen(false);
        return;
      }

      // Decode the first slide before mounting the modal so there is no blank-frame flash.
      await preloadImage(String(activeItems[0].url_gambar));
      if (requestId !== requestIdRef.current || activeView !== null) return;

      setPromoImages(activeItems);
      setCurrentIndex(prev => Math.min(prev, activeItems.length - 1));
      setIsExpanded(false);
      setIsAutoPlay(true);
      setPopupOpen(true);

      activeItems.slice(1).forEach(item => {
        if (item.url_gambar) void preloadImage(String(item.url_gambar));
      });
    } catch (err) {
      console.warn('[ImagePopup] Supabase popup fetch failed:', err);
      if (requestId === requestIdRef.current) setPopupOpen(false);
    } finally {
      fetchingRef.current = false;
    }
  }, [activeView, setPopupOpen]);

  // Route changes are the single source for opening/closing the landing popup.
  // This avoids the old double-trigger: state effect + custom event both fetching at once.
  useEffect(() => {
    requestIdRef.current += 1;
    isDismissedRef.current = false;

    if (activeView === null) {
      void fetchActivePopups(true);
    } else {
      setPopupOpen(false);
    }
  }, [activeView, fetchActivePopups, setPopupOpen]);

  // Keep one realtime channel only. Multiple realtime subscriptions previously caused
  // duplicate refreshes and visible popup blinking when returning to Beranda.
  useEffect(() => {
    const channel = supabase
      .channel('landing-popup-carousel-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => {
        if (activeView === null && !isOpenRef.current) void fetchActivePopups(false);
      })
      .subscribe();

    const handleTriggerHome = () => {
      if (activeView !== null) return;
      isDismissedRef.current = false;
      if (!isOpenRef.current) void fetchActivePopups(true);
    };

    const handleUpdate = () => {
      if (activeView === null && !isOpenRef.current) void fetchActivePopups(false);
    };

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
  }, [activeView, fetchActivePopups]);

  const goTo = useCallback((nextIndex: number) => {
    if (promoImages.length < 2) return;
    setCurrentIndex(nextIndex);
    setIsExpanded(false);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' }));
  }, [promoImages.length]);

  const goNext = useCallback(() => {
    if (promoImages.length < 2) return;
    goTo((currentIndex + 1) % promoImages.length);
  }, [currentIndex, goTo, promoImages.length]);

  const goPrev = useCallback(() => {
    if (promoImages.length < 2) return;
    goTo((currentIndex - 1 + promoImages.length) % promoImages.length);
  }, [currentIndex, goTo, promoImages.length]);

  useEffect(() => {
    if (!isOpen || !isAutoPlay || isHovering || promoImages.length < 2) return;
    const timer = window.setTimeout(goNext, SLIDE_DURATION);
    return () => window.clearTimeout(timer);
  }, [isOpen, isAutoPlay, isHovering, promoImages.length, currentIndex, goNext]);

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
    return () => { if (interval) clearInterval(interval); if (timeout) clearTimeout(timeout); };
  }, [isOpen, currentIndex]);

  const closePopup = () => {
    isDismissedRef.current = true;
    setPopupOpen(false);
  };

  const handleDragEnd = (_event: any, info: any) => {
    if (promoImages.length < 2) return;
    const offsetX = info.offset?.x ?? 0;
    const velocityX = info.velocity?.x ?? 0;
    if (Math.abs(offsetX) > SWIPE_THRESHOLD || Math.abs(velocityX) > SWIPE_VELOCITY) {
      if (offsetX < 0 || velocityX < 0) goNext(); else goPrev();
    }
  };

  const renderCleanDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    return text.split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} className="h-3" />;
      return (
        <p key={i} className="mb-5 last:mb-0 !leading-7 text-slate-800 !text-justify text-[15px]" style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}>
          {line.split(urlRegex).map((part, index) => part.match(urlRegex)
            ? <a key={index} href={part.startsWith('www.') ? `https://${part}` : part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 underline-offset-2 font-medium break-all">{part}</a>
            : <span key={index}>{part}</span>)}
        </p>
      );
    });
  };

  if (promoImages.length === 0 || !isOpen) return null;

  const current = promoImages[currentIndex] || promoImages[0];
  const total = promoImages.length;
  const hasNavigation = total > 1;

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Pengumuman PB Bilibili 162">
      <div className="absolute inset-0" onClick={closePopup} />
      <div className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[420px] max-h-[90vh] bg-white rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.38)] flex flex-col overflow-hidden ring-1 ring-white/20" onClick={e => e.stopPropagation()} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
        <button onClick={closePopup} aria-label="Tutup pop-up" className="absolute top-3 right-3 z-[80] p-2.5 bg-white/95 hover:bg-slate-100 text-slate-800 rounded-full shadow-xl border border-slate-200 transition-colors active:scale-90"><X size={18} /></button>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain hide-scrollbar">
          <div className="relative overflow-hidden bg-slate-950">
            <div className="relative w-full bg-slate-950 flex items-center justify-center select-none">
              <img src={current.url_gambar} className="w-full h-auto block z-10 select-none pointer-events-none" alt={current.judul || 'Banner pengumuman'} draggable={false} fetchPriority="high" decoding="async" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-black/10 z-20 pointer-events-none" />
              {hasNavigation && <>
                <button type="button" onClick={goPrev} aria-label="Pop-up sebelumnya" className="absolute left-2.5 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg active:scale-90 transition-colors"><ChevronLeft size={21} /></button>
                <button type="button" onClick={goNext} aria-label="Pop-up berikutnya" className="absolute right-2.5 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/15 flex items-center justify-center shadow-lg active:scale-90 transition-colors"><ChevronRight size={21} /></button>
              </>}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-2.5 bg-white border-b border-slate-100">
            {hasNavigation ? promoImages.map((item, index) => (
              <button key={item.id || index} type="button" onClick={() => { setIsAutoPlay(true); goTo(index); }} aria-label={`Buka pop-up ${index + 1} dari ${total}`} className={`rounded-full transition-all duration-200 ${index === currentIndex ? 'w-7 h-2 bg-blue-600' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'}`} />
            )) : <span className="text-[10px] font-bold text-slate-400">1 / 1</span>}
            {hasNavigation && <span className="ml-1 text-[10px] font-bold text-slate-500">{currentIndex + 1} / {total}</span>}
            {hasNavigation && <button type="button" onClick={() => setIsAutoPlay(v => !v)} aria-label={isAutoPlay ? 'Jeda slider otomatis' : 'Putar slider otomatis'} className="ml-1 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">{isAutoPlay ? <Pause size={11} /> : <Play size={11} />}</button>}
          </div>

          <div className="px-5 sm:px-6 pt-3 pb-7 bg-white">
            <div className="flex justify-center mb-4"><span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100">Pengumuman</span></div>
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-blue-700 leading-tight text-center mb-5 px-2 uppercase tracking-tighter">{current.judul}</h3>
              <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 sm:p-6 mb-7 shadow-inner">
                <div className={isExpanded ? '' : 'line-clamp-3'}>{renderCleanDescription(current.deskripsi || '')}</div>
                {!!current.deskripsi && <button type="button" onClick={() => setIsExpanded(v => !v)} className="text-blue-600 text-xs font-bold mt-2 hover:underline">{isExpanded ? 'Read Less' : 'Read More'}</button>}
              </div>
              <div className="space-y-3 px-1">
                {current.file_url && String(current.file_url).length > 5 && <a href={current.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold text-[12px] tracking-wider shadow-lg"><Download size={14} /> LIHAT LAMPIRAN</a>}
                <button type="button" onClick={closePopup} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[12px] tracking-wider transition-colors shadow-md">MENGERTI</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImagePopup;
