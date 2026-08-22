import fs from 'node:fs';
import path from 'node:path';

const galleryPath = path.join(process.cwd(), 'src/components/Gallery.tsx');

if (!fs.existsSync(galleryPath)) {
  console.log('[gallery-source] Gallery.tsx not found; skipping optional patch');
  process.exit(0);
}

let source = fs.readFileSync(galleryPath, 'utf8');

// Gallery.tsx may be formatted on one line or across many lines. Do not depend
// on exact whitespace/line breaks when locating the fetchGallery callback.
const blockPattern = /const fetchGallery = useCallback\([\s\S]*?\},\s*\[applyGallery\]\);/;
const match = source.match(blockPattern);

if (!match) {
  // This patch is an optional compatibility step. The current Gallery.tsx may
  // already contain the correct Supabase-first implementation, so a missing
  // pattern must never make the production build fail.
  console.log('[gallery-source] fetchGallery block not found; no patch needed');
  process.exit(0);
}

const replacement = `const fetchGallery = useCallback(async (initial = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      // Supabase gallery table is the single source of truth.
      const { data: sbData, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(sbData) && sbData.length > 0) {
        applyGallery(sbData as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(sbData)); } catch {}
        return;
      }

      // Legacy site setting is fallback only.
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
        applyGallery(DEFAULT_GALLERY as GalleryItem[]);
      }
    } finally {
      fetchInFlight.current = false;
      if (initial) setLoading(false);
    }
  }, [applyGallery]);`;

source = source.replace(blockPattern, replacement);
fs.writeFileSync(galleryPath, source, 'utf8');
console.log('[gallery-source] Gallery source patch completed safely');
