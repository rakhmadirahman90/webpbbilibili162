import fs from 'node:fs';
import path from 'node:path';

const imagePopupPath = path.resolve('src/components/ImagePopup.tsx');
const adminPopupPath = path.resolve('src/components/AdminPopup.tsx');

// This is a legacy source transformer. It must be idempotent and must never
// fail production builds when an individual component has already been
// refactored. Patch each file independently instead of requiring old
// boundaries in both files at once.
function replaceOrSkip(file, regex, replacement, label) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('POPUP_FINAL_SOURCE_V1')) {
    console.log(`[popup-final] ${label}: already patched`);
    return;
  }
  if (!regex.test(source)) {
    console.log(`[popup-final] ${label}: source pattern not found; skipping safely`);
    return;
  }
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
      setPromoImages(activeItems);
      setCurrentIndex(prev => activeItems.length ? Math.min(prev, activeItems.length - 1) : 0);
      setIsOpen(activeItems.length > 0 && (forceShow || !isDismissedRef.current));
    } catch (err) {
      console.error('[popup-final] Gagal memuat popup Supabase:', err);
      setPromoImages([]);
      setCurrentIndex(0);
      setIsOpen(false);
    }
  };

  const prevActiveViewRef`;
replaceOrSkip(imagePopupPath, imageFetch, imageReplacement, 'ImagePopup direct Supabase read');

const adminFetch = /  const fetchPopups = async \(isSilent = false\) => \{[\s\S]*?\n  \};\n\n  useEffect\(\(\) => \{/;
const adminReplacement = `  // POPUP_FINAL_SOURCE_V1: Admin popup list is read directly from Supabase only.
  const fetchPopups = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase.from('konfigurasi_popup').select('*').order('urutan', { ascending: true });
      if (error) throw error;
      setPopups((Array.isArray(data) ? data : []) as PopupConfig[]);
    } catch (err) {
      console.warn('[popup-final] AdminPopup Supabase read failed:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {`;
replaceOrSkip(adminPopupPath, adminFetch, adminReplacement, 'AdminPopup direct Supabase read');

console.log('[popup-final] completed safely');
