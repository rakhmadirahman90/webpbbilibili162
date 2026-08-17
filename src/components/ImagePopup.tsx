import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';
import { useRealtimeSync } from '../utils/realtimeSync';

const FALLBACK_POPUP = { id: 'popup-fallback', judul: 'PENGUMUMAN', deskripsi: '', url_gambar: '', is_active: true, active: true, urutan: 999999 };
const POPUP_CACHE_KEY = 'site_setting_popup_config';
const POPUP_DISMISSED_KEY = 'site_popup_dismissed_v2';

interface ImagePopupProps { activeView?: string | null; }

function normalizePopups(items: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.id) continue;
    const active = item.is_active ?? item.active ?? false;
    if (!active) continue;
    map.set(String(item.id), { ...item, is_active: true, active: true });
  }
  return Array.from(map.values()).sort((a, b) => {
    const order = Number(a.urutan ?? 0) - Number(b.urutan ?? 0);
    return order || String(a.id).localeCompare(String(b.id));
  });
}

function readLocalPopupCache(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(POPUP_CACHE_KEY);
    return raw ? normalizePopups(parsePopupList(raw)) : [];
  } catch { return []; }
}

function writeLocalPopupCache(items: any[]) {
  if (typeof window === 'undefined' || !items.length) return;
  try { localStorage.setItem(POPUP_CACHE_KEY, JSON.stringify(items)); } catch { /* optional cache */ }
}

function isPopupDismissed() {
  if (typeof window === 'undefined') return false;
  try { return sessionStorage.getItem(POPUP_DISMISSED_KEY) === '1'; } catch { return false; }
}

function setPopupDismissed(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (value) sessionStorage.setItem(POPUP_DISMISSED_KEY, '1');
    else sessionStorage.removeItem(POPUP_DISMISSED_KEY);
  } catch { /* optional */ }
}

function preloadImage(url?: string): Promise<void> {
  if (!url || typeof window === 'undefined') return Promise.resolve();
  return new Promise(resolve => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
    if (img.complete) resolve();
  });
}

function preloadImages(items: any[]) {
  if (typeof window === 'undefined') return;
  items.slice(0, 6).forEach(item => { void preloadImage(item?.url_gambar); });
}

function ImagePopup({ activeView = null }: ImagePopupProps = {}) {
  const cached = readLocalPopupCache();
  const [promoImages, setPromoImages] = useState<any[]>(cached);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(activeView === null && cached.length > 0 && !isPopupDismissed());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(cached.length === 0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [settleOffset, setSettleOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const horizontalSwipeRef = useRef(false);
  const dismissedRef = useRef(isPopupDismissed());
  const loadingRequestRef = useRef<Promise<void> | null>(null);

  const applyItems = (items: any[], forceShow = false) => {
    const active = normalizePopups(items);
    if (!active.length) return;
    writeLocalPopupCache(active);
    setPromoImages(prev => {
      const currentId = prev[currentIndex]?.id;
      const sameIndex = currentId ? active.findIndex(p => p.id === currentId) : -1;
      setCurrentIndex(sameIndex >= 0 ? sameIndex : 0);
      return active;
    });
    preloadImages(active);
    if (activeView === null && (forceShow || !dismissedRef.current) && !isPopupDismissed()) setIsOpen(true);
    setIsLoading(false);
  };

  const loadPopups = async (forceShow = false) => {
    if (typeof window !== 'undefined' && (/^\/admin/.test(window.location.pathname) || /^\/login/.test(window.location.pathname))) return;
    if (activeView !== null) { setIsOpen(false); return; }
    if (!forceShow && dismissedRef.current) return;

    const local = readLocalPopupCache();
    if (local.length) applyItems(local, forceShow);

    if (loadingRequestRef.current) return loadingRequestRef.current;
    const request = (async () => {
      try {
        let dbItems: any[] = [];
        const dbResult = await supabase.from('konfigurasi_popup').select('*').order('urutan', { ascending: true });
        if (!dbResult.error && Array.isArray(dbResult.data)) dbItems = dbResult.data;

        if (!dbItems.length) {
          const fallback = await supabase.from('popups').select('*').order('urutan', { ascending: true });
          if (!fallback.error && Array.isArray(fallback.data)) dbItems = fallback.data;
        }

        if (dbItems.length) {
          const authoritative = normalizePopups(dbItems);
          if (authoritative.length) { applyItems(authoritative, forceShow); return; }
        }

        const settingsRaw = await getSiteSetting('popup_config').catch(() => null);
        const settingsItems = normalizePopups(parsePopupList(settingsRaw));
        if (settingsItems.length) { applyItems(settingsItems, forceShow); return; }

        const response = await fetch('/api/konfigurasi-popup');
        if (response.ok) {
          const apiItems = await response.json();
          const apiNormalized = normalizePopups(Array.isArray(apiItems) ? apiItems : []);
          if (apiNormalized.length) applyItems(apiNormalized, forceShow);
        }
      } catch (error) {
        console.warn('Popup refresh failed; keeping cached popup data.', error);
      } finally { setIsLoading(false); }
    })();

    loadingRequestRef.current = request;
    try { await request; } finally { loadingRequestRef.current = null; }
  };

  useEffect(() => {
    if (activeView !== null) { setIsOpen(false); return; }
    // Closing the popup is sticky for the browser session. It is only cleared by
    // an explicit application trigger, never by a normal realtime refresh.
    dismissedRef.current = isPopupDismissed();
    if (!dismissedRef.current) void loadPopups(true);
    else setIsOpen(false);
  }, [activeView]);

  useEffect(() => {
    const channel = supabase
      .channel('popup-fast-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => { void loadPopups(false); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'popups' }, () => { void loadPopups(false); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeView]);

  useRealtimeSync({ tables: ['konfigurasi_popup', 'site_settings'], settingKeys: ['popup_config'], onUpdate: () => { void loadPopups(false); } });

  useEffect(() => {
    const events = ['trigger-home-popup', 'site_setting_updated', 'table_updated_popup_config', 'table_updated_konfigurasi_popup', 'app_data_changed'];
    const handler = (event: Event) => {
      // Only the explicit home-popup trigger is allowed to reopen a dismissed popup.
      const explicitTrigger = event.type === 'trigger-home-popup';
      if (explicitTrigger) {
        setPopupDismissed(false);
        dismissedRef.current = false;
        void loadPopups(true);
      } else {
        void loadPopups(false);
      }
    };
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [activeView]);

  const goTo = (index: number) => {
    if (!promoImages.length) return;
    const next = (index + promoImages.length) % promoImages.length;
    setCurrentIndex(next);
    setIsExpanded(false);
    const url = promoImages[next]?.url_gambar;
    if (url) void preloadImage(url);
  };

  const nextPopup = () => goTo(currentIndex + 1);
  const previousPopup = () => goTo(currentIndex - 1);

  const handleTouchStart = (e: TouchEvent) => {
    if (promoImages.length <= 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    horizontalSwipeRef.current = false;
    setIsDragging(true);
    setDragX(0);
    setSettleOffset(0);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStartRef.current || promoImages.length <= 1) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (!horizontalSwipeRef.current) {
      if (Math.hypot(dx, dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) {
        touchStartRef.current = null;
        setIsDragging(false);
        return;
      }
      horizontalSwipeRef.current = true;
    }
    if (e.cancelable) e.preventDefault();
    // Slight resistance at the ends while keeping the slider feeling physical.
    const atFirst = currentIndex === 0 && dx > 0;
    const atLast = currentIndex === promoImages.length - 1 && dx < 0;
    setDragX((atFirst || atLast) ? dx * 0.35 : dx);
  };

  const handleTouchEnd = (_e: TouchEvent) => {
    const start = touchStartRef.current;
    const wasHorizontal = horizontalSwipeRef.current;
    const dx = dragX;
    touchStartRef.current = null;
    horizontalSwipeRef.current = false;
    if (!start || !wasHorizontal || promoImages.length <= 1) {
      setIsDragging(false);
      setDragX(0);
      return;
    }

    const threshold = Math.max(55, Math.min(110, window.innerWidth * 0.18));
    const direction = Math.abs(dx) >= threshold ? (dx < 0 ? 1 : -1) : 0;
    if (!direction) {
      setIsDragging(false);
      setDragX(0);
      return;
    }

    // Animate the hero fully off-screen first, then commit the logical index.
    const width = Math.max(280, scrollRef.current?.clientWidth || window.innerWidth);
    setIsDragging(false);
    setSettleOffset(direction > 0 ? -width : width);
    window.setTimeout(() => {
      setCurrentIndex(prev => (prev + direction + promoImages.length) % promoImages.length);
      setSettleOffset(0);
      setDragX(0);
    }, 280);
  };

  const closePopup = () => {
    dismissedRef.current = true;
    setPopupDismissed(true);
    setIsOpen(false);
  };

  if (activeView !== null || !isOpen || !promoImages.length) return null;
  const current = promoImages[Math.min(currentIndex, promoImages.length - 1)];
  if (!current) return null;

  const renderDescription = (text: string) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/;
    return text.split('\n').map((line, i) => line.trim() ? (
      <p key={i} className="mb-3 last:mb-0 leading-6 text-slate-800 text-[14px] break-words">
        {line.split(urlRegex).map((part, j) => urlRegex.test(part) ? <a key={j} href={part.startsWith('www.') ? `https://${part}` : part} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{part}</a> : <span key={j}>{part}</span>)}
      </p>
    ) : <div key={i} className="h-2" />);
  };

  const previousIndex = (currentIndex - 1 + promoImages.length) % promoImages.length;
  const nextIndex = (currentIndex + 1) % promoImages.length;
  const sliderTransform = `translate3d(calc(-100% + ${dragX + settleOffset}px), 0, 0)`;
  const sliderTransition = isDragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)';

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={closePopup} />
      <div
        ref={scrollRef}
        className="relative w-full max-w-[420px] max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <button onClick={closePopup} aria-label="Tutup" className="absolute top-3 right-3 z-30 p-2.5 bg-white/95 text-slate-800 rounded-full shadow-lg border border-slate-200 active:scale-90"><X size={20} /></button>

        <div className="overflow-y-auto hide-scrollbar">
          <div className="relative bg-slate-950 overflow-hidden min-h-[120px] flex items-center justify-center">
            <div className="flex w-full will-change-transform" style={{ transform: sliderTransform, transition: sliderTransition }}>
              {[previousIndex, currentIndex, nextIndex].map((index, position) => {
                const item = promoImages[index];
                return (
                  <div key={`${item?.id || index}-${position}`} className="relative shrink-0 w-full flex items-center justify-center">
                    <img src={item?.url_gambar || FALLBACK_POPUP.url_gambar} alt={item?.judul || 'Popup'} loading={position === 1 ? 'eager' : 'lazy'} decoding="async" fetchPriority={position === 1 ? 'high' : 'low'} className="block w-full h-auto max-h-[70vh] object-contain select-none" draggable={false} />
                  </div>
                );
              })}
            </div>
            {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30"><div className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
            {promoImages.length > 1 && <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 z-20 flex items-center justify-between pointer-events-none"><button onClick={previousPopup} aria-label="Popup sebelumnya" className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/70 text-white flex items-center justify-center shadow-lg active:scale-90"><ChevronLeft size={25} /></button><button onClick={nextPopup} aria-label="Popup berikutnya" className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/70 text-white flex items-center justify-center shadow-lg active:scale-90"><ChevronRight size={25} /></button></div>}
          </div>

          <div className="p-4">
            {current.judul && <h3 className="text-lg font-black text-blue-700 text-center uppercase leading-tight mb-3">{current.judul}</h3>}
            {current.deskripsi && <div className={isExpanded ? '' : 'line-clamp-4'}>{renderDescription(current.deskripsi)}</div>}
            {current.deskripsi && current.deskripsi.length > 300 && <button onClick={() => setIsExpanded(v => !v)} className="mt-2 text-blue-600 font-bold text-xs">{isExpanded ? 'TUTUP DESKRIPSI' : 'BACA SELENGKAPNYA'}</button>}
            {current.file_url && <a href={current.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs"><Download size={14} /> LIHAT LAMPIRAN</a>}
            {promoImages.length > 1 && <div className="flex items-center justify-center gap-1.5 mt-3">{promoImages.map((_, i) => <button key={i} onClick={() => goTo(i)} aria-label={`Popup ${i + 1}`} className={`h-2 rounded-full transition-all ${i === currentIndex ? 'w-6 bg-slate-800' : 'w-2 bg-slate-300'}`} />)}</div>}
            <div className="flex items-center justify-between gap-2 mt-3">{promoImages.length > 1 ? <span className="text-[11px] font-bold text-slate-500">{currentIndex + 1}/{promoImages.length}</span> : <span /> }<button onClick={closePopup} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md">MENGERTI</button></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImagePopup;
