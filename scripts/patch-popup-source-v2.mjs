import fs from 'node:fs';
import path from 'node:path';

const imagePopupPath = path.resolve('src/components/ImagePopup.tsx');
const adminPopupPath = path.resolve('src/components/AdminPopup.tsx');

function replaceBlock(file, startRe, endRe, replacement, label) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.search(startRe);
  if (start < 0) throw new Error(`[popup-v2] ${label}: start block not found`);
  const tail = source.slice(start);
  const endMatch = tail.match(endRe);
  if (!endMatch || endMatch.index == null) throw new Error(`[popup-v2] ${label}: end block not found`);
  const end = start + endMatch.index + endMatch[0].length;
  fs.writeFileSync(file, source.slice(0, start) + replacement + source.slice(end), 'utf8');
  console.log(`[popup-v2] ${label}: patched`);
}

const imageReplacement = `  // POPUP_SOURCE_V2: konfigurasi_popup is the only popup source of truth.
  const fetchActivePopups = async (forceShow = false) => {
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

      const { data, error } = await supabase
        .from('konfigurasi_popup')
        .select('id,url_gambar,judul,deskripsi,is_active,urutan,file_url')
        .eq('is_active', true)
        .not('url_gambar', 'is', null)
        .order('urutan', { ascending: true });

      if (error) throw error;

      const activeItems = (Array.isArray(data) ? data : [])
        .filter((item) => item && item.id && item.url_gambar && item.is_active === true)
        .sort((a, b) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));

      setPromoImages((previous) => {
        const currentId = previous[currentIndex]?.id;
        const foundIndex = currentId ? activeItems.findIndex((item) => item.id === currentId) : -1;
        const nextIndex = foundIndex >= 0 ? foundIndex : Math.min(currentIndex, Math.max(activeItems.length - 1, 0));
        setCurrentIndex(activeItems.length ? nextIndex : 0);
        return activeItems;
      });

      setIsOpen(activeItems.length > 0 && (forceShow || !isDismissedRef.current));
    } catch (error) {
      console.error('[popup-v2] Gagal membaca konfigurasi_popup:', error);
      setPromoImages([]);
      setCurrentIndex(0);
      setIsOpen(false);
    }
  };

  const prevActiveViewRef`;

replaceBlock(
  imagePopupPath,
  /  const fetchActivePopups = async \(forceShow = false\) => \{/,
  /\n  const prevActiveViewRef/,
  imageReplacement,
  'ImagePopup Supabase source'
);

const adminReplacement = `  // POPUP_SOURCE_V2: AdminPopup reads only public.konfigurasi_popup.
  const fetchPopups = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('konfigurasi_popup')
        .select('id,url_gambar,judul,deskripsi,is_active,urutan,file_url')
        .order('urutan', { ascending: true });
      if (error) throw error;

      const rows = (Array.isArray(data) ? data : [])
        .filter((item) => item && item.id)
        .map((item) => ({
          id: String(item.id),
          url_gambar: item.url_gambar || '',
          judul: item.judul || '',
          deskripsi: item.deskripsi || '',
          is_active: item.is_active === true,
          urutan: Number.isFinite(Number(item.urutan)) ? Number(item.urutan) : 0,
          file_url: item.file_url || null
        }))
        .sort((a, b) => a.urutan - b.urutan);

      setPopups((previous) => JSON.stringify(previous) === JSON.stringify(rows) ? previous : rows);
    } catch (error) {
      console.error('[popup-v2] AdminPopup Supabase read failed:', error);
      setPopups([]);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {`;

replaceBlock(
  adminPopupPath,
  /  const fetchPopups = async \(isSilent = false\) => \{/,
  /\n  useEffect\(\(\) => \{/,
  adminReplacement,
  'AdminPopup Supabase source'
);

console.log('[popup-v2] Popup frontend is now hard-bound to public.konfigurasi_popup.');
