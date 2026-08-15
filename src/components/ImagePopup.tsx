import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { supabase } from '../supabase';

const POPUP_TABLE = 'konfigurasi_popup';
const POPUP_TIMEOUT_MS = 12000;

const FALLBACK_POPUP = {
  id: 'popup-fallback-official',
  judul: 'INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE',
  deskripsi: '📢 INFO RESMI! PENDAFTARAN ANGGOTA BARU PB BILIBILI 162 PAREPARE 📢\nBersama, Kita Kuat!',
  url_gambar: 'https://missjyvqfehamtpyodjr.supabase.co/storage/v1/object/public/identitas-atlet/promosi/popup-1786212468282.png',
  file_url: null,
  is_active: true,
  urutan: 0,
};

function withTimeout<T>(promise: Promise<T>, ms = POPUP_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Popup database timeout')), ms)),
  ]);
}

function normalizePopup(row: any, index: number) {
  const image = String(row?.url_gambar || row?.image_url || row?.image || '');
  const title = String(row?.judul || row?.title || '');
  const description = String(row?.deskripsi || row?.description || '');
  const active = row?.is_active === undefined || row?.is_active === null
    ? row?.active === undefined || row?.active === null ? true : Boolean(row.active)
    : Boolean(row.is_active);
  return {
    id: String(row?.id || `popup-${index}`),
    judul: title,
    deskripsi: description,
    url_gambar: image,
    file_url: row?.file_url || row?.link_url || null,
    is_active: active,
    urutan: Number.isFinite(Number(row?.urutan)) ? Number(row.urutan) : index,
  };
}

async function loadPopups() {
  const result: any = await withTimeout(
    supabase.from(POPUP_TABLE).select('*').order('urutan', { ascending: true })
  );
  if (result.error) throw result.error;
  return (result.data || [])
    .map(normalizePopup)
    .filter((item: any) => item.is_active && (item.url_gambar || item.judul || item.deskripsi))
    .sort((a: any, b: any) => a.urutan - b.urutan);
}

function ImagePopup({ activeView = null }: { activeView?: string | null } = {}) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const dismissedRef = useRef(false);
  const requestRef = useRef(0);

  const refresh = useCallback(async (show = true) => {
    if (activeView !== null || typeof window === 'undefined' && false) return;
    const requestId = ++requestRef.current;
    try {
      const rows = await loadPopups();
      if (requestId !== requestRef.current) return;
      const next = rows.length ? rows : [FALLBACK_POPUP];
      setItems(next);
      setIndex(0);
      if (show && !dismissedRef.current) setOpen(true);
    } catch (error) {
      console.warn('[ImagePopup] Supabase load failed:', error);
      if (requestId !== requestRef.current) return;
      setItems([FALLBACK_POPUP]);
      setIndex(0);
      if (show && !dismissedRef.current) setOpen(true);
    }
  }, [activeView]);

  useEffect(() => {
    dismissedRef.current = false;
    if (activeView !== null) {
      setOpen(false);
      return;
    }
    const timer = window.setTimeout(() => refresh(true), 250);
    return () => window.clearTimeout(timer);
  }, [activeView, refresh]);

  useEffect(() => {
    if (activeView !== null) return;
    const channel = supabase
      .channel('pb162-konfigurasi-popup-public')
      .on('postgres_changes', { event: '*', schema: 'public', table: POPUP_TABLE }, () => {
        dismissedRef.current = false;
        refresh(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeView, refresh]);

  useEffect(() => {
    const handleUpdate = () => {
      dismissedRef.current = false;
      if (activeView === null) refresh(true);
    };
    window.addEventListener('table_updated_konfigurasi_popup', handleUpdate);
    window.addEventListener('table_updated_popup_config', handleUpdate);
    window.addEventListener('trigger-home-popup', handleUpdate);
    window.addEventListener('app_data_changed', handleUpdate);
    return () => {
      window.removeEventListener('table_updated_konfigurasi_popup', handleUpdate);
      window.removeEventListener('table_updated_popup_config', handleUpdate);
      window.removeEventListener('trigger-home-popup', handleUpdate);
      window.removeEventListener('app_data_changed', handleUpdate);
    };
  }, [activeView, refresh]);

  const close = () => {
    dismissedRef.current = true;
    setOpen(false);
  };
  const previous = () => setIndex((value) => (value - 1 + items.length) % items.length);
  const next = () => setIndex((value) => (value + 1) % items.length);

  if (!open || !items.length || activeView !== null) return null;
  const current = items[index] || items[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm" role="dialog" aria-modal="true">
        <button aria-label="Tutup pop-up" className="absolute inset-0 cursor-default" onClick={close} />
        <motion.div
          key={current.id || index}
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -18 }}
          transition={{ duration: 0.22 }}
          className="relative z-10 w-full max-w-[430px] max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-white/20"
        >
          <button onClick={close} aria-label="Tutup" className="absolute right-3 top-3 z-20 rounded-full bg-white/95 p-2 text-slate-800 shadow-lg border border-slate-200">
            <X size={19} />
          </button>
          <div className="max-h-[90vh] overflow-y-auto">
            {current.url_gambar ? (
              <img src={current.url_gambar} alt={current.judul || 'Pop-up PB Bilibili 162'} className="block w-full max-h-[58vh] object-contain bg-slate-100" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            ) : null}
            <div className="p-5 sm:p-6">
              {current.judul && <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight mb-3">{current.judul}</h2>}
              {current.deskripsi && <div className="whitespace-pre-line text-sm leading-6 text-slate-700 break-words">{current.deskripsi}</div>}
              {current.file_url && (
                <a href={current.file_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white">
                  <ExternalLink size={15} /> Buka Lampiran
                </a>
              )}
            </div>
          </div>
          {items.length > 1 && (
            <div className="absolute left-0 right-0 top-1/2 z-20 flex -translate-y-1/2 justify-between px-2 pointer-events-none">
              <button onClick={previous} aria-label="Popup sebelumnya" className="pointer-events-auto rounded-full bg-white/95 p-2 text-slate-800 shadow-lg"><ChevronLeft size={20} /></button>
              <button onClick={next} aria-label="Popup berikutnya" className="pointer-events-auto rounded-full bg-white/95 p-2 text-slate-800 shadow-lg"><ChevronRight size={20} /></button>
            </div>
          )}
          {items.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {items.map((item, dot) => <button key={item.id || dot} aria-label={`Popup ${dot + 1}`} onClick={() => setIndex(dot)} className={`h-2 rounded-full transition-all ${dot === index ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300'}`} />)}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default ImagePopup;
