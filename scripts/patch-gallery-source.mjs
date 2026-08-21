import fs from 'node:fs';
import path from 'node:path';

const galleryPath = path.join(process.cwd(), 'src/components/Gallery.tsx');
let source = fs.readFileSync(galleryPath, 'utf8');

const start = source.indexOf('  const fetchGallery = useCallback(async (initial = false) => {');
const endMarker = '  }, [applyGallery]);';
const end = start >= 0 ? source.indexOf(endMarker, start) + endMarker.length : -1;

if (start < 0 || end <= start) {
  throw new Error('[gallery-source] fetchGallery block not found');
}

const replacement = `  const fetchGallery = useCallback(async (initial = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      // Supabase gallery table is the single source of truth. This prevents a
      // stale gallery_list site setting from hiding albums/photos already saved
      // in Supabase, including multi-photo documentation albums.
      const { data: sbData, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(sbData) && sbData.length > 0) {
        applyGallery(sbData as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(sbData)); } catch {}
        return;
      }

      // Only use the legacy/site-setting gallery as a fallback when the
      // authoritative Supabase gallery table cannot provide data.
      const data = await getSiteSetting('gallery_list');
      if (Array.isArray(data) && data.length > 0) {
        applyGallery(data as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        return;
      }

      if (initial) {
        try {
          const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              applyGallery(parsed as GalleryItem[]);
              return;
            }
          }
        } catch {}
        applyGallery(DEFAULT_GALLERY as GalleryItem[]);
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
      if (initial) {
        try {
          const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              applyGallery(parsed as GalleryItem[]);
              return;
            }
          }
        } catch {}
        try {
          const data = await getSiteSetting('gallery_list');
          if (Array.isArray(data) && data.length > 0) applyGallery(data as GalleryItem[]);
          else if (lastGallerySignature.current === '') applyGallery(DEFAULT_GALLERY as GalleryItem[]);
        } catch {
          if (lastGallerySignature.current === '') applyGallery(DEFAULT_GALLERY as GalleryItem[]);
        }
      }
    } finally {
      fetchInFlight.current = false;
      if (initial) setLoading(false);
    }
  }, [applyGallery]);`;

source = source.slice(0, start) + replacement + source.slice(end);
fs.writeFileSync(galleryPath, source, 'utf8');
console.log('[gallery-source] Supabase gallery table is now the source of truth; site_settings is fallback only');
