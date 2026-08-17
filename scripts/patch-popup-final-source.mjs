import fs from 'node:fs';
import path from 'node:path';

const imagePopupPath = path.resolve('src/components/ImagePopup.tsx');
const adminPopupPath = path.resolve('src/components/AdminPopup.tsx');

function replaceOrThrow(file, regex, replacement, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('POPUP_FINAL_SOURCE_V1')) {
    console.log(`[popup-final] ${label}: already patched`);
    return;
  }
  if (!regex.test(source)) throw new Error(`[popup-final] ${label}: source pattern not found`);
  fs.writeFileSync(file, source.replace(regex, replacement), 'utf8');
  console.log(`[popup-final] ${label}: patched`);
}

const imageFetch = /  const fetchActivePopups = async \(forceShow = false\) => \{[\s\S]*?\n  \};\n\n  const prevActiveViewRef/;
const imageReplacement = `  // POPUP_FINAL_SOURCE_V1: Supabase konfigurasi_popup is the only public popup source.
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
        .filter((item: any) => item && item.id && item.url_gambar && item.is_active === true)
        .sort((a: any, b: any) => Number(a.urutan ?? 0) - Number(b.urutan ?? 0));

      setPromoImages(prev => {
        const currentId = prev[currentIndex]?.id;
        const nextIndex = currentId
          ? Math.max(0, activeItems.findIndex((item: any) => item.id === currentId))
          : 0;
        setCurrentIndex(activeItems.length ? (nextIndex >= 0 ? nextIndex : Math.min(currentIndex, activeItems.length - 1)) : 0);
        return activeItems;
      });

      if (activeItems.length > 0 && (forceShow || !isDismissedRef.current)) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } catch (err) {
      console.error('[popup-final] Gagal memuat popup Supabase:', err);
      setPromoImages([]);
      setIsOpen(false);
    }
  };

  const prevActiveViewRef`;
replaceOrThrow(imagePopupPath, imageFetch, imageReplacement, 'ImagePopup direct Supabase read');

const adminFetch = /  const fetchPopups = async \(isSilent = false\) => \{[\s\S]*?\n  \};\n\n  useEffect\(\(\) => \{/;
const adminReplacement = `  // POPUP_FINAL_SOURCE_V1: Admin popup list is read directly from Supabase only.
  const fetchPopups = async (isSilent = false) => {
    if (!isSilent && popups.length === 0) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('konfigurasi_popup')
        .select('id,url_gambar,judul,deskripsi,is_active,urutan,file_url')
        .order('urutan', { ascending: true });

      if (error) throw error;

      const rows: PopupConfig[] = (Array.isArray(data) ? data : [])
        .map((item: any) => ({
          id: String(item.id),
          url_gambar: item.url_gambar || '',
          judul: item.judul || '',
          deskripsi: item.deskripsi || '',
          is_active: item.is_active === true,
          urutan: Number(item.urutan ?? 0),
          file_url: item.file_url || undefined,
        }))
        .filter(item => Boolean(item.id))
        .sort((a, b) => {
          if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
          return a.urutan - b.urutan;
        });

      setPopups(prev => JSON.stringify(prev) === JSON.stringify(rows) ? prev : rows);
    } catch (err) {
      console.warn('[popup-final] AdminPopup Supabase read failed:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {`;
replaceOrThrow(adminPopupPath, adminFetch, adminReplacement, 'AdminPopup direct Supabase read');

console.log('[popup-final] Supabase popup source-of-truth patch applied');
