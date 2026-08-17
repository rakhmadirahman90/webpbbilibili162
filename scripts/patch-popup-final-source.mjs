import fs from 'node:fs';
import path from 'node:path';

const imagePopupPath = path.resolve('src/components/ImagePopup.tsx');
const adminPopupPath = path.resolve('src/components/AdminPopup.tsx');

// The current popup components already use direct Supabase persistence/read.
// This legacy transform must never fail the production build when its old
// source boundaries no longer exist.
const adminSource = fs.readFileSync(adminPopupPath, 'utf8');
const imageSource = fs.readFileSync(imagePopupPath, 'utf8');

if (
  adminSource.includes(".from('konfigurasi_popup')") &&
  adminSource.includes('crypto.randomUUID()') &&
  imageSource.includes(".from('konfigurasi_popup')")
) {
  console.log('[popup-final] current Supabase-authoritative popup source detected; legacy transform skipped');
  process.exit(0);
}

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
      const { data, error } = await supabase.from('konfigurasi_popup').select('*').eq('is_active', true).order('urutan', { ascending: true });
      if (error) throw error;
      const activeItems = (Array.isArray(data) ? data : []).filter((item) => item?.id && item?.url_gambar && item.is_active === true);
      setPromoImages(activeItems);
      setIsOpen(activeItems.length > 0 && (forceShow || !isDismissedRef.current));
    } catch (err) {
      console.error('[popup-final] Gagal memuat popup Supabase:', err);
      setPromoImages([]);
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
