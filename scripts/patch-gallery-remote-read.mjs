import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('src/components/Gallery.tsx');
let source = fs.readFileSync(file, 'utf8');

// Remove legacy read sources. Gallery is read directly from public.gallery.
source = source
  .replace("import { getSiteSetting } from '../utils/siteSettingsHelper';\n", '')
  .replace("import { DEFAULT_GALLERY } from '../data/localDatabase';\n", '');

const alreadyPatched = source.includes('// Remote-authoritative gallery loader.');
const start = source.indexOf('  // 1. Ambil data dari Supabase dengan Realtime Subscription');
const endMarker = '  // Tutup modal dengan tombol ESC';
const end = source.indexOf(endMarker, start);

if (!alreadyPatched && (start < 0 || end < 0)) {
  throw new Error('Gallery fetch block markers not found; refusing to patch blindly.');
}

if (!alreadyPatched) {
  const replacement = `  // Remote-authoritative gallery loader. public.gallery is the only read source.\n  // The loader is bounded so the UI can never remain on “Sinkronisasi Galeri…” forever.\n  useEffect(() => {\n    let disposed = false;\n    let requestSequence = 0;\n\n    const readCache = () => {\n      try {\n        const raw = localStorage.getItem('cached_gallery');\n        const parsed = raw ? JSON.parse(raw) : [];\n        return Array.isArray(parsed) ? parsed : [];\n      } catch {\n        return [];\n      }\n    };\n\n    const normalizeRows = (rows: any[]) => rows\n      .filter((row: any) => row && row.id && row.url)\n      .map((row: any) => ({\n        ...row,\n        id: String(row.id),\n        title: String(row.title ?? 'Dokumentasi PB Bilibili 162'),\n        type: String(row.type ?? 'image').toLowerCase() === 'video' ? 'video' : 'image',\n        url: String(row.url).trim(),\n        category: String(row.category ?? ''),\n        description: String(row.description ?? ''),\n        created_at: row.created_at ?? new Date(0).toISOString(),\n      }));\n\n    const loadGallery = async () => {\n      const sequence = ++requestSequence;\n      if (!disposed) setLoading(true);\n      try {\n        const query = supabase\n          .from('gallery')\n          .select('id,title,type,url,created_at,description,category,is_local')\n          .order('created_at', { ascending: false });\n\n        const result = await Promise.race([\n          query,\n          new Promise((_, reject) => setTimeout(() => reject(new Error('Gallery query timeout after 8000ms')), 8000)),\n        ]) as any;\n\n        if (disposed || sequence !== requestSequence) return;\n        if (result?.error) throw result.error;\n\n        const rows = normalizeRows(Array.isArray(result?.data) ? result.data : []);\n        setGalleryItems(rows);\n        try { localStorage.setItem('cached_gallery', JSON.stringify(rows)); } catch {}\n        console.info('[Gallery] Supabase rows loaded:', rows.length);\n      } catch (error: any) {\n        console.error('[Gallery] Supabase read failed:', error?.message || error);\n        if (disposed || sequence !== requestSequence) return;\n        setGalleryItems(readCache());\n      } finally {\n        if (!disposed && sequence === requestSequence) setLoading(false);\n      }\n    };\n\n    void loadGallery();\n\n    const handleUpdate = () => { void loadGallery(); };\n    window.addEventListener('app_data_changed', handleUpdate);\n    window.addEventListener('table_updated_gallery', handleUpdate);\n    window.addEventListener('site_setting_updated', handleUpdate);\n\n    const channel = supabase\n      .channel('public_gallery_realtime')\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => void loadGallery())\n      .subscribe((status) => console.info('[Gallery] realtime:', status));\n\n    return () => {\n      disposed = true;\n      requestSequence += 1;\n      window.removeEventListener('app_data_changed', handleUpdate);\n      window.removeEventListener('table_updated_gallery', handleUpdate);\n      window.removeEventListener('site_setting_updated', handleUpdate);\n      void supabase.removeChannel(channel);\n    };\n  }, []);\n\n`;
  source = source.slice(0, start) + replacement + source.slice(end);
}

// Gallery albums use only URLs stored in Supabase; never append stock/dummy images.
const imageHelperStart = source.indexOf('  const getGalleryImages = (item: any): string[] => {');
const imageHelperEnd = source.indexOf('  // Remote-authoritative gallery loader.', imageHelperStart);
if (imageHelperStart >= 0 && imageHelperEnd > imageHelperStart) {
  const imageHelper = `  const getGalleryImages = (item: any): string[] => {\n    if (!item || !item.url) return [];\n    if (String(item.type).toLowerCase() === 'video') return [String(item.url).trim()];\n    return String(item.url).split(/[\\s,]+/).map((u: string) => u.trim()).filter(Boolean);\n  };\n\n`;
  source = source.slice(0, imageHelperStart) + imageHelper + source.slice(imageHelperEnd);
}

fs.writeFileSync(file, source, 'utf8');
console.log(`[patch-gallery-remote-read] ${alreadyPatched ? 'already patched; normalized gallery helper' : 'Gallery.tsx patched successfully'}`);
