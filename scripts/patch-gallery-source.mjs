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

if (match) {
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
  console.log('[gallery-source] fetchGallery patch completed');
} else {
  console.log('[gallery-source] fetchGallery block not found; leaving current implementation unchanged');
}

// WhatsApp's web share URL can carry a link preview, but it cannot attach a
// local image file. On supported Android browsers, use the native Web Share API
// so the first photo in the gallery is actually attached to the WhatsApp message.
const shareBlockPattern = /const handleShare = async \(item: GalleryItem, platform: 'wa' \| 'fb' \| 'copy'\) => \{[\s\S]*?\n  \};/;
const shareMatch = source.match(shareBlockPattern);

if (shareMatch) {
  const shareReplacement = `const handleShare = async (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const shareUrl = getShareUrl(item);
    const title = String(item.title || 'Dokumentasi PB Bilibili 162').trim();
    const text = \`*\${title}*\\n\\n📸 \${item.type === 'video' ? 'Video' : 'Foto'} Dokumentasi PB Bilibili 162\\n\\n\${shareUrl}\`;

    if (platform === 'wa') {
      // Prefer native file sharing so WhatsApp receives the actual primary photo,
      // not only a URL preview. This is supported by modern Android browsers.
      if (item.type === 'image' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const primaryImage = splitUrls(item.url)[0] || '';
        if (primaryImage) {
          try {
            const response = await fetch(primaryImage, { cache: 'no-store', mode: 'cors' });
            if (!response.ok) throw new Error(\`Image download failed: \${response.status}\`);
            const blob = await response.blob();
            const mime = blob.type || 'image/webp';
            const extension = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'webp';
            const safeName = title.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'PB-Bilibili-162';
            const file = new File([blob], \`\${safeName}.\${extension}\`, { type: mime });
            const shareData = { files: [file], text };
            const canShareFiles = typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] });
            if (canShareFiles) {
              await navigator.share(shareData);
              return;
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.warn('[gallery-share] Native image share unavailable; falling back to WhatsApp link', error);
          }
        }
      }

      // Fallback: preserve the working WhatsApp link preview when native file
      // sharing is unavailable or the image server blocks browser fetches.
      window.open(\`https://api.whatsapp.com/send?text=\${encodeURIComponent(text)}\`, '_blank');
      return;
    }

    if (platform === 'fb') window.open(\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(shareUrl)}\`, '_blank');
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(item.id);
        window.setTimeout(() => setCopySuccess(null), 2000);
      } catch (error) {
        console.error('Gagal menyalin tautan galeri:', error);
      }
    }
  };`;

  source = source.replace(shareBlockPattern, shareReplacement);
  console.log('[gallery-source] WhatsApp native image-share patch completed');
} else {
  console.log('[gallery-source] handleShare block not found; no WhatsApp share patch applied');
}

fs.writeFileSync(galleryPath, source, 'utf8');
console.log('[gallery-source] Gallery source patches completed safely');
