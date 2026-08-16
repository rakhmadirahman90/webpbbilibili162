import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/Gallery.tsx');
let source = fs.readFileSync(file, 'utf8');

source = source
  .replace("import { getSiteSetting } from '../utils/siteSettingsHelper';\n", '')
  .replace("import { DEFAULT_GALLERY } from '../data/localDatabase';\n", '');

const start = source.indexOf('  // 1. Ambil data dari Supabase dengan Realtime Subscription');
const endMarker = '  // Tutup modal dengan tombol ESC';
const end = source.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('Gallery fetch block markers not found; refusing to patch blindly.');
}

const replacement = `  // Remote-authoritative gallery loader. Never wait for site_settings/API helpers.\n  // A bounded request guarantees the UI cannot remain on “Sinkronisasi Galeri…” forever.\n  useEffect(() => {\n    let disposed = false;\n    let requestSequence = 0;\n\n    const readCache = () => {\n      try {\n        const raw = localStorage.getItem('cached_gallery');\n        if (!raw) return [];\n        const parsed = JSON.parse(raw);\n        return Array.isArray(parsed) ? parsed : [];\n      } catch {\n        return [];\n      }\n    };\n\n    const loadGallery = async () => {\n      const sequence = ++requestSequence;\n      if (!disposed) setLoading(true);\n\n      try {\n        const query = supabase\n          .from('gallery')\n          .select('*')\n          .order('created_at', { ascending: false });\n\n        const result = await Promise.race([\n          query,\n          new Promise((_, reject) =>\n            setTimeout(() => reject(new Error('Gallery query timeout after 8000ms')), 8000)\n          ),\n        ]) as any;\n\n        if (disposed || sequence !== requestSequence) return;\n        if (result?.error) throw result.error;\n\n        const rows = Array.isArray(result?.data) ? result.data : [];\n        setGalleryItems(rows);\n\n        try {\n          localStorage.setItem('cached_gallery', JSON.stringify(rows));\n        } catch {}\n      } catch (error: any) {\n        console.error('[Gallery] Supabase read failed:', error?.message || error);\n\n        if (disposed || sequence !== requestSequence) return;\n        const cached = readCache();\n\n        // Cache is emergency-only. Do not inject DEFAULT_GALLERY/dummy media.\n        setGalleryItems(cached);\n      } finally {\n        if (!disposed && sequence === requestSequence) setLoading(false);\n      }\n    };\n\n    void loadGallery();\n\n    const handleUpdate = () => {\n      void loadGallery();\n    };\n\n    window.addEventListener('app_data_changed', handleUpdate);\n    window.addEventListener('table_updated_gallery', handleUpdate);\n    window.addEventListener('site_setting_updated', handleUpdate);\n\n    const channel = supabase\n      .channel('public_gallery_realtime')\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {\n        void loadGallery();\n      })\n      .subscribe((status) => {\n        console.info('[Gallery] realtime:', status);\n      });\n\n    return () => {\n      disposed = true;\n      requestSequence += 1;\n      window.removeEventListener('app_data_changed', handleUpdate);\n      window.removeEventListener('table_updated_gallery', handleUpdate);\n      window.removeEventListener('site_setting_updated', handleUpdate);\n      void supabase.removeChannel(channel);\n    };\n  }, []);\n\n`;

source = source.slice(0, start) + replacement + source.slice(end);

// Remove external/dummy gallery images from the album slider. An album only uses URLs stored in Supabase.
const imageHelperStart = source.indexOf('  const getGalleryImages = (item: any): string[] => {');
const imageHelperEnd = source.indexOf('  // Remote-authoritative gallery loader.', imageHelperStart);
if (imageHelperStart >= 0 && imageHelperEnd >= 0) {
  const imageHelper = `  const getGalleryImages = (item: any): string[] => {\n    if (!item || !item.url) return [];\n    if (item.type === 'video') return [item.url];\n    return String(item.url)\n      .split(/[\\s,]+/)\n      .map((u: string) => u.trim())\n      .filter(Boolean);\n  };\n\n`;
  source = source.slice(0, imageHelperStart) + imageHelper + source.slice(imageHelperEnd);
}

fs.writeFileSync(file, source);
console.log('[patch-gallery-remote-read] Gallery.tsx patched successfully');
