import { useEffect, useRef, useState, type TouchEvent } from 'react';
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getSiteSetting, parsePopupList } from '../utils/siteSettingsHelper';
import { useRealtimeSync } from '../utils/realtimeSync';

const FALLBACK_POPUP = { id: 'popup-fallback', judul: 'PENGUMUMAN', deskripsi: '', url_gambar: '', is_active: true, active: true, urutan: 999999 };

interface ImagePopupProps { activeView?: string | null; }

function normalizePopups(items: any[]): any[] {
  const map = new Map<string, any>();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || !item.id) continue;
    const active = item.is_active ?? item.active ?? false;
    if (!active) continue;
    map.set(String(item.id), { ...item, is_active: true, active: true });
  }
  return Array.from(map.values()).sort((a, b) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));
}

function readLocalPopupCache(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('site_setting_popup_config');
    return raw ? normalizePopups(parsePopupList(raw)) : [];
  } catch { return []; }
}

function preloadImages(items: any[]) {
  if (typeof window === 'undefined') return;
  items.slice(0, 8).forEach(item => {
    if (!item?.url_gambar) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = item.url_gambar;
  });
}

function ImagePopup({ activeView = null }: ImagePopupProps = {}) {
  const cached = readLocalPopupCache();
  const [promoImages, setPromoImages] = useState<any[]>(cached);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(activeView === null && cached.length > 0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(cached.length === 0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const dismissedRef = useRef(false);

  const applyItems = (items: any[], forceShow = false) => {
    const active = normalizePopups(items);
    if (!active.length) return;
    setPromoImages(prev => {
      const currentId = prev[currentIndex]?.id;
      const sameIndex = currentId ? active.findIndex(p => p.id === currentId) : -1;
      setCurrentIndex(sameIndex >= 0 ? sameIndex : 0);
      return active;
    });
    preloadImages(active);
    if (activeView === null && (forceShow || !dismissedRef.current)) setIsOpen(true);
    setIsLoading(false);
  };

  const loadPopups = async (forceShow = false) => {
    if (typeof window !== 'undefined' && (/^\/admin/.test(window.location.pathname) || /^\/login/.test(window.location.pathname))) return;
    if (activeView !== null) { setIsOpen(false); return; }
    if (!forceShow && dismissedRef.current) return;

    const local = readLocalPopupCache();
    if (local.length) applyItems(local, forceShow);

    const dbPromise = supabase.from('konfigurasi_popup').select('*').order('urutan', { ascending: true });
    const settingsPromise = getSiteSetting('popup_config').catch(() => null);
    const apiPromise = fetch('/api/konfigurasi-popup').then(r => r.ok ? r.json() : []).catch(() => []);
    const [dbResult, settingsRaw, apiItems] = await Promise.all([dbPromise, settingsPromise, apiPromise]);

    let dbItems: any[] = [];
    if (!dbResult.error && Array.isArray(dbResult.data) && dbResult.data.length) {
      dbItems = dbResult.data;
    } else {
      const fallback = await supabase.from('popups').select('*').order('urutan', { ascending: true });
      if (!fallback.error && Array.isArray(fallback.data)) dbItems = fallback.data;
    }

    const authoritative = normalizePopups(dbItems);
    const settingsItems = normalizePopups(parsePopupList(settingsRaw));
    const apiNormalized = normalizePopups(Array.isArray(apiItems) ? apiItems : []);
    const finalItems = authoritative.length ? authoritative : (settingsItems.length ? settingsItems : apiNormalized);

    if (finalItems.length) applyItems(finalItems, forceShow);
    else setIsLoading(false);
  };

  useEffect(() => {
    if (activeView !== null) { setIsOpen(false); return; }
    dismissedRef.current = false;
    loadPopups(true);
  }, [activeView]);

  useEffect(() => {
    const channel = supabase
      .channel('popup-fast-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => loadPopups(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'popups' }, () => loadPopups(false))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeView]);

  useRealtimeSync({ tables: ['konfigurasi_popup', 'site_settings'], settingKeys: ['popup_config'], onUpdate: () => loadPopups(false) });

  useEffect(() => {
    const events = ['trigger-home-popup', 'site_setting_updated', 'table_updated_popup_config', 'table_updated_konfigurasi_popup', 'app_data_changed'];
    const handler = () => { dismissedRef.current = false; loadPopups(true); };
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [activeView]);

  const goTo = (index: number) => {
    if (!promoImages.length) return;
    const next = (index + promoImages.length) % promoImages.length;
    setCurrentIndex(next);
    setIsExpanded(false);
    const url = promoImages[next]?.url_gambar;
    if (url) { const img = new Image(); img.decoding = 'async'; img.src = url; }
  };

  const nextPopup = () => goTo(currentIndex + 1);
  const previousPopup = () => goTo(currentIndex - 1);

  const handleTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) nextPopup(); else previousPopup();
  };

  const closePopup = () => { dismissedRef.current = true; setIsOpen(false); };

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

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={closePopup} />
      <div className="relative w-full max-w-[420px] max-h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <button onClick={closePopup} aria-label="Tutup" className="absolute top-3 right-3 z-30 p-2.5 bg-white/95 text-slate-800 rounded-full shadow-lg border border-slate-200 active:scale-90"><X size={20} /></button>
        <div ref={scrollRef} className="overflow-y-auto hide-scrollbar">
          <div className="relative bg-slate-950 min-h-[120px] flex items-center justify-center">
            <img key={current.id} src={current.url_gambar || FALLBACK_POPUP.url_gambar} alt={current.judul || 'Popup'} loading={currentIndex === 0 ? 'eager' : 'lazy'} decoding="async" fetchPriority={currentIndex === 0 ? 'high' : 'auto'} className="block w-full h-auto max-h-[70vh] object-contain select-none" draggable={false} />
            {isLoading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30"><div className="w-7 h-7 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
          </div>
          {promoImages.length > 1 && <div className="absolute left-2 right-2 top-[45%] z-20 flex items-center justify-between pointer-events-none"><button onClick={previousPopup} aria-label="Popup sebelumnya" className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/70 text-white flex items-center justify-center shadow-lg active:scale-90"><ChevronLeft size={25} /></button><button onClick={nextPopup} aria-label="Popup berikutnya" className="pointer-events-auto w-11 h-11 rounded-full bg-slate-900/70 text-white flex items-center justify-center shadow-lg active:scale-90"><ChevronRight size={25} /></button></div>}
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
