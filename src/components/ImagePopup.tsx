import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Download, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';

interface ImagePopupProps { activeView?: string | null; }
type PopupItem = Record<string, any>;

const SLIDE_DURATION = 5500;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 450;

function preloadImage(url: string): Promise<boolean> {
  return new Promise(resolve => {
    if (!url) return resolve(false);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
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
    // Jangan tampilkan popup promosi ketika pengguna kembali dari
    // detail Foto/Video Terbaru ke Landing Page.
    const returningToLandingGallery = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('galleryTab');
    const returningFromLandingAthlete = typeof window !== 'undefined' &&
      sessionStorage.getItem('pb_suppress_landing_popup') === '1';
    if (activeView !== null || returningToLandingGallery || returningFromLandingAthlete) {
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

      // IMPORTANT: AdminPopup uses `site_settings.popup_config` as the canonical
      // cross-device source of truth. The old landing code only read the
      // `konfigurasi_popup` table, which could leave the landing carousel one
      // or more positions behind the Admin Console. Read the same canonical
      // setting first, then fall back to Supabase if it is unavailable.
      let canonicalItems: PopupItem[] = [];
      try {
        const rawSetting = await getSiteSetting('popup_config');
        canonicalItems = parsePopupList(rawSetting)
          .filter((item: PopupItem) => item && item.is_active !== false)
          .map((item: PopupItem) => ({
            ...item,
            url_gambar: item.url_gambar || item.image_url || ''
          }))
          .filter((item: PopupItem) => item && item.url_gambar)
          .sort((a: PopupItem, b: PopupItem) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));
      } catch (settingError) {
        console.warn('[ImagePopup] Canonical popup setting fetch failed:', settingError);
      }

      let activeItems = canonicalItems;

      // Fallback for older data/installations where popup_config has not yet
      // been written to site_settings.
      if (!activeItems.length) {
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .select('id, judul, deskripsi, url_gambar, image_url, file_url, is_active, urutan')
          .eq('is_active', true)
          .order('urutan', { ascending: true });

        if (error) throw error;

        activeItems = (data || [])
          .map((item: PopupItem) => ({ ...item, url_gambar: item.url_gambar || item.image_url || '' }))
          .filter((item: PopupItem) => item && item.url_gambar)
          .sort((a: PopupItem, b: PopupItem) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));
      }

      if (requestId !== requestIdRef.current || activeView !== null) return;

      if (!activeItems.length) {
        setPromoImages([]);
        setPopupOpen(false);
        return;
      }

      // Validate every configured image before mounting the carousel.
      // Broken/legacy storage URLs are skipped so the popup never opens on a blank slide.
      const checkedItems: PopupItem[] = [];
      for (const item of activeItems) {
        if (requestId !== requestIdRef.current || activeView !== null) return;
        if (await preloadImage(String(item.url_gambar))) checkedItems.push(item);
      }

      if (requestId !== requestIdRef.current || activeView !== null) return;
      if (!checkedItems.length) {
        setPromoImages([]);
        setPopupOpen(false);
        return;
      }

      setPromoImages(checkedItems);
      setCurrentIndex(prev => Math.min(prev, checkedItems.length - 1));
      setIsExpanded(false);
      setIsAutoPlay(true);
      setPopupOpen(true);
    } catch (err) {
      console.warn('[ImagePopup] Popup fetch failed:', err);
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

    const returningToLandingGallery = typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('galleryTab');

    const returningFromLandingAthlete = typeof window !== 'undefined' &&
      sessionStorage.getItem('pb_suppress_landing_popup') === '1';

    if (activeView === null && !returningToLandingGallery && !returningFromLandingAthlete) {
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
        const returningToLandingGallery = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('galleryTab');
      if (activeView === null && !returningToLandingGallery && !isOpenRef.current) void fetchActivePopups(false);
      })
      .subscribe();

    const handleTriggerHome = () => {
      if (activeView !== null) return;
      isDismissedRef.current = false;
      if (!isOpenRef.current) void fetchActivePopups(true);
    };

    const handleUpdate = () => {
      const returningToLandingGallery = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('galleryTab');
      if (activeView === null && !returningToLandingGallery && !isOpenRef.current) void fetchActivePopups(false);
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
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pengumuman PB Bilibili 162"
    >
      <button
        type="button"
        aria-label="Tutup pop-up"
        onClick={closePopup}
        className="absolute inset-0 cursor-default"
      />

      <div
        className="relative z-10 flex items-center justify-center w-full h-full max-w-[760px] max-h-[860px] sm:max-h-[90vh]"
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="relative flex items-center justify-center w-full h-full overflow-visible">
          <div className="relative w-auto max-w-full h-auto max-h-[78vh] sm:max-h-[84vh] rounded-[18px] sm:rounded-[24px] overflow-hidden bg-slate-950 shadow-[0_25px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/15">
            <img
              src={current.url_gambar}
              className="block w-auto max-w-[94vw] sm:max-w-[720px] h-auto max-h-[78vh] sm:max-h-[84vh] object-contain object-center select-none"
              alt={current.judul || 'Banner pengumuman'}
              draggable={false}
              fetchPriority="high"
              decoding="async"
            />

            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/10 via-transparent to-black/25" />

            <button
              type="button"
              onClick={closePopup}
              aria-label="Tutup pop-up"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition active:scale-90"
            >
              <X size={19} />
            </button>

            {hasNavigation && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Pengumuman sebelumnya"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition active:scale-90"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="Pengumuman berikutnya"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/45 hover:bg-black/65 text-white backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg transition active:scale-90"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}

            <div className="absolute left-1/2 bottom-3 sm:bottom-5 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/15">
              {hasNavigation ? promoImages.map((item, index) => (
                <button
                  key={item.id || index}
                  type="button"
                  onClick={() => { setIsAutoPlay(true); goTo(index); }}
                  aria-label={`Buka pengumuman ${index + 1} dari ${total}`}
                  className={`rounded-full transition-all duration-200 ${index === currentIndex ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/55 hover:bg-white/80'}`}
                />
              )) : <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              {hasNavigation && (
                <span className="ml-1 text-[10px] font-bold text-white whitespace-nowrap">
                  {currentIndex + 1}/{total}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={closePopup}
            className="absolute left-1/2 bottom-[3vh] sm:bottom-[2vh] -translate-x-1/2 z-[60] min-w-[190px] sm:min-w-[220px] h-14 sm:h-16 px-8 rounded-full bg-white hover:bg-slate-50 text-[#d99b20] font-black text-[15px] sm:text-base tracking-wide shadow-[0_12px_35px_rgba(0,0,0,0.28)] border border-white transition-all active:scale-95"
          >
            LIHAT NANTI
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImagePopup;
